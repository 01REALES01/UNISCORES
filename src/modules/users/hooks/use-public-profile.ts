"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentScore } from "@/lib/sport-scoring";
import {
    normalizeGenderLoose,
    resolveAthleteGenderFromContext,
    shouldIncludePartidoInProfileHistory,
} from "@/lib/profile-match-filters";

export interface PublicProfileData {
    profile: any;
    carreras: any[];
    history: any[];
    followedProfiles: any[];
    followedCareers: any[];
    friendsCount: number;
    athleteDisciplinas: any[];
    athleteTeams: any[];
    sportStatsMap: Record<string, any>;
}

const INDIVIDUAL_SPORTS_NAMES = ['Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];

async function fetchPublicProfile(profileId: string, signal?: AbortSignal, currentUserId?: string) {
    const sig = signal ?? new AbortController().signal;

    // 1. Core Profile
    const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('*, disciplina:disciplinas(id, name, icon)')
        .eq('id', profileId)
        .abortSignal(sig)
        .single();

    if (pErr || !profile) throw new Error('Perfil no encontrado');

    // Parallel Sub-fetches
    const [carrerasRes, friendsRes, pdRes, jugRowsRes, followerRes, followingRes] = await Promise.all([
        // Careers
        profile.carreras_ids?.length 
            ? supabase.from('carreras').select('*').in('id', profile.carreras_ids).abortSignal(sig)
            : Promise.resolve({ data: [] }),
        // Friends
        supabase.from('friend_requests').select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
            .abortSignal(sig),
        // Disciplines (for multi-sport)
        supabase.from('profile_disciplinas').select('disciplina_id, disciplinas(id, name)')
            .eq('profile_id', profileId)
            .abortSignal(sig),
        // Jugadores (Base for stats/history)
        supabase.from('jugadores').select('id, carrera_id, disciplina_id, disciplinas(name), genero')
            .eq('profile_id', profileId)
            .abortSignal(sig),
        // Following (Only if it's the current user's profile view, or always for count?)
        currentUserId === profileId 
            ? supabase.from('user_followers').select('following_profile:profiles!following_profile_id(id, full_name, avatar_url, points)').eq('follower_id', profileId).abortSignal(sig)
            : Promise.resolve({ data: [] }),
        currentUserId === profileId
            ? supabase.from('career_followers').select('career:carreras(id, nombre, escudo_url)').eq('follower_id', profileId).abortSignal(sig)
            : Promise.resolve({ data: [] })
    ]);

    const carreras = carrerasRes.data || [];
    const friendsCount = friendsRes.count || 0;
    const pdData = pdRes.data || [];
    const jugRows = jugRowsRes.data || [];
    const followedProfiles = (followerRes.data || []).map((f: any) => f.following_profile);
    const followedCareers = (followingRes.data || []).map((f: any) => f.career);

    const athleteDisciplinas = pdData.map((r: any) => (Array.isArray(r.disciplinas) ? r.disciplinas[0] : r.disciplinas)).filter(Boolean);
    const discIds = pdData.map((r: any) => r.disciplina_id);
    if (discIds.length === 0 && profile.athlete_disciplina_id) discIds.push(profile.athlete_disciplina_id);

    const athleteGenderResolved = resolveAthleteGenderFromContext(jugRows, profile);
    const athleteGenderNorm = normalizeGenderLoose(athleteGenderResolved);

    // Fetch Teams
    let athleteTeams: any[] = [];
    if (profile.carreras_ids?.length && discIds.length > 0) {
        let delegQuery = supabase
            .from('delegaciones')
            .select('id, nombre, genero, carrera_ids, disciplina_id, disciplinas(name)')
            .in('disciplina_id', discIds)
            .overlaps('carrera_ids', profile.carreras_ids);

        if (athleteGenderNorm === 'masculino' || athleteGenderNorm === 'femenino') {
            delegQuery = delegQuery.in('genero', [athleteGenderNorm, 'mixto']);
        }
        const { data: delegs } = await delegQuery.abortSignal(sig);
        athleteTeams = delegs || [];
    }

    // History & Stats
    const jugIds = jugRows.map(j => j.id);
    const sportStatsMap: Record<string, any> = {};
    let finalHistory: any[] = [];
    const matchSideMap = new Map<string, 'a' | 'b'>();
    const matchIdSet = new Set<string>();
    const matchIdsFromAthleteEvents = new Set<number | string>();
    const matchIdsTrustedParticipation = new Set<number | string>();

    const { data: rosterRows } = await supabase
        .from('roster_partido')
        .select(`
            partido_id,
            equipo:equipo_a_or_b,
            jugadores!inner(profile_id)
        `)
        .eq('jugadores.profile_id', profileId)
        .abortSignal(sig);

    rosterRows?.forEach((r: any) => {
        if (!r.partido_id) return;
        matchIdSet.add(String(r.partido_id));
        matchIdsTrustedParticipation.add(r.partido_id);
        const side = r.equipo === 'equipo_a' ? 'a' : 'b';
        matchSideMap.set(String(r.partido_id), side);
    });

    if (jugIds.length > 0) {
        // Events
        const { data: evs } = await supabase.from('olympics_eventos').select('tipo_evento, jugador_id_normalized, partido_id, equipo')
            .in('jugador_id_normalized', jugIds)
            .abortSignal(sig);

        const jugDisc: Record<number, string> = {};
        jugRows.forEach((j: any) => { jugDisc[j.id] = j.disciplina_id; });


        evs?.forEach((ev: any) => {
            const discId = jugDisc[ev.jugador_id_normalized];
            if (!discId) return;
            if (!sportStatsMap[discId]) {
                sportStatsMap[discId] = { goals: 0, pts3: 0, pts2: 0, pts1: 0, yellowCards: 0, redCards: 0, fouls: 0, totalEvents: 0, puntos: 0, sets: 0, victorias: 0, empates: 0, gold: 0, silver: 0, bronze: 0, wins: 0, losses: 0 };
            }
            const s = sportStatsMap[discId];
            const type = ev.tipo_evento.toLowerCase();
            s.totalEvents++;
            if (type === 'gol' || type === 'anotacion') s.goals++;
            if (type === 'punto_3' || type.includes('triple')) s.pts3++;
            if (type === 'punto_2' || type.includes('doble')) s.pts2++;
            if (type === 'punto_1' || type.includes('libre')) s.pts1++;
            if (type.includes('amarilla') || type === 'tarjeta_amarilla') s.yellowCards++;
            if (type.includes('roja') || type === 'tarjeta_roja') s.redCards++;
            if (type === 'falta') s.fouls++;
            if (type === 'punto') s.puntos++;
            if (type === 'set') s.sets++;
            if (type === 'victoria') s.victorias++;
            if (type === 'segundo') s.silver++;
            if (type === 'tercero') s.bronze++;
            if (type === 'empate') s.empates++;

            if (ev.partido_id) {
                matchIdSet.add(String(ev.partido_id));
                matchIdsFromAthleteEvents.add(ev.partido_id);
                const pid = String(ev.partido_id);
                if (ev.equipo === 'equipo_a') matchSideMap.set(pid, 'a');
                else if (ev.equipo === 'equipo_b') matchSideMap.set(pid, 'b');
            }
        });
    }

    // Individual Matches
    const { data: indMatches } = await supabase.from('partidos').select('id').or(`athlete_a_id.eq.${profileId},athlete_b_id.eq.${profileId}`).abortSignal(sig);
    indMatches?.forEach(m => matchIdSet.add(String(m.id)));

    // Team Matches (via Delegaciones)
    const dIds = athleteTeams.map(d => d.id);
    if (dIds.length > 0) {
        const { data: teamMatches } = await supabase
            .from('partidos')
            .select('id')
            .or(`delegacion_a.in.(${dIds.join(',')}),delegacion_b.in.(${dIds.join(',')})`)
            .abortSignal(sig);
        teamMatches?.forEach(m => matchIdSet.add(String(m.id)));
    }

    // Fallback name-based individual
    const isIndiv = profile.athlete_disciplina_id && INDIVIDUAL_SPORTS_NAMES.includes(profile.disciplina?.name || '');
    if (isIndiv && profile.full_name) {
        let nameQ = supabase
            .from('partidos')
            .select('id')
            .eq('disciplina_id', profile.athlete_disciplina_id)
            .or(`equipo_a.ilike.${profile.full_name},equipo_b.ilike.${profile.full_name}`);
        if (athleteGenderNorm === 'masculino' || athleteGenderNorm === 'femenino') {
            nameQ = nameQ.in('genero', [athleteGenderNorm, 'mixto']);
        }
        const { data: nameMatches } = await nameQ.abortSignal(sig);
        nameMatches?.forEach(m => matchIdSet.add(String(m.id)));
    }
    // 4. Team Matches by Career IDs & Disciplines (Upcoming/Recent without events)
    const careerIdsMatch = profile.carreras_ids || [];
    const discIdsMatch = pdData.map((r: any) => r.disciplina_id);
    if (discIdsMatch.length === 0 && profile.athlete_disciplina_id) {
        discIdsMatch.push(profile.athlete_disciplina_id);
    }
    if (careerIdsMatch.length > 0 && discIdsMatch.length > 0) {
        let broadQ = supabase
            .from('partidos')
            .select('id')
            .in('disciplina_id', discIdsMatch)
            .or(`carrera_a_id.in.(${careerIdsMatch.join(',')}),carrera_b_id.in.(${careerIdsMatch.join(',')}),carrera_a_ids.ov.{${careerIdsMatch.join(',')}},carrera_b_ids.ov.{${careerIdsMatch.join(',')}}`);
        if (athleteGenderNorm === 'masculino' || athleteGenderNorm === 'femenino') {
            broadQ = broadQ.in('genero', [athleteGenderNorm, 'mixto']);
        }
        const { data: qryRes } = await broadQ.abortSignal(sig);
        qryRes?.forEach(m => matchIdSet.add(String(m.id)));
    }

        // Full Match Details
        if (matchIdSet.size > 0) {
            const { data: matches } = await supabase
                .from('partidos')
                .select('id, fecha, equipo_a, equipo_b, estado, marcador_detalle, disciplina_id, disciplinas(name), athlete_a_id, athlete_b_id, carrera_a_id, carrera_b_id, carrera_a_ids, carrera_b_ids, genero')
                .in('id', Array.from(matchIdSet))
                .order('fecha', { ascending: false })
                .abortSignal(sig);

            if (matches) {
                const careerIds = profile.carreras_ids || [];
                const matchesFiltered = matches.filter((p: any) =>
                    shouldIncludePartidoInProfileHistory({
                        partido: p,
                        profileId,
                        athleteGenderResolved,
                        matchIdsFromAthleteEvents,
                        matchIdsTrustedParticipation,
                    })
                );

                finalHistory = matchesFiltered.map((p: any) => {
                    const discId = p.disciplina_id;
                    if (!sportStatsMap[discId]) sportStatsMap[discId] = { goals: 0, pts3: 0, pts2: 0, pts1: 0, yellowCards: 0, redCards: 0, fouls: 0, totalEvents: 0, puntos: 0, sets: 0, victorias: 0, empates: 0, gold: 0, silver: 0, bronze: 0, wins: 0, losses: 0 };
                    const s = sportStatsMap[discId];
                    const normalizedEstado = (p.estado || '').toLowerCase().trim();

                    if (normalizedEstado === 'finalizado') {
                        const sportName = (Array.isArray(p.disciplinas) ? p.disciplinas[0]?.name : p.disciplinas?.name) || '';
                        const { scoreA, scoreB } = getCurrentScore(sportName, p.marcador_detalle || {});

                        let side: 'a' | 'b' | null = matchSideMap.get(String(p.id)) || null;
                        if (!side) {
                            if (p.athlete_a_id === profileId) side = 'a';
                            else if (p.athlete_b_id === profileId) side = 'b';
                            else if (p.carrera_a_ids?.some((cid: number) => careerIds.includes(cid))) side = 'a';
                            else if (p.carrera_b_ids?.some((cid: number) => careerIds.includes(cid))) side = 'b';
                            else if (careerIds.includes(p.carrera_a_id)) side = 'a';
                            else if (careerIds.includes(p.carrera_b_id)) side = 'b';
                        }
                        if (side === 'a' && scoreA > scoreB) s.wins++;
                        else if (side === 'b' && scoreB > scoreA) s.wins++;
                        else if (side && scoreA !== scoreB) s.losses++;
                    }

                    return {
                        id: p.id,
                        fecha: p.fecha,
                        disciplina: (Array.isArray(p.disciplinas) ? p.disciplinas[0]?.name : p.disciplinas?.name),
                        equipo_a: p.equipo_a,
                        equipo_b: p.equipo_b,
                        marcador_final: p.marcador_detalle,
                        estado: (p.estado || '').toLowerCase().trim()
                    };
                });
            }
        }

    const result = {
        profile,
        carreras,
        history: finalHistory,
        followedProfiles,
        followedCareers,
        friendsCount,
        athleteDisciplinas,
        athleteTeams,
        sportStatsMap
    };

    if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(`swr-public-profile-${profileId}`, JSON.stringify(result)); } catch {}
    }

    return result;
}

export function usePublicProfile(profileId: string | null, currentUserId?: string) {
    let fallbackData: PublicProfileData | undefined = undefined;
    if (profileId && typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(`swr-public-profile-${profileId}`);
            if (raw) fallbackData = JSON.parse(raw);
        } catch {}
    }

    const { data, error, isLoading, mutate } = useSWR(
        profileId ? `public-profile:${profileId}` : null,
        async () => {
            if (!profileId) return null;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 45_000); // Higher limit for profile
            try {
                return await fetchPublicProfile(profileId, controller.signal, currentUserId);
            } finally {
                clearTimeout(timeout);
            }
        },
        {
            fallbackData,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000,
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        if (!profileId || typeof window === 'undefined') return;

        const handleRevalidate = () => mutate();
        window.addEventListener('app:revalidate', handleRevalidate);
        return () => window.removeEventListener('app:revalidate', handleRevalidate);
    }, [profileId, mutate]);

    return {
        profile: data?.profile || null,
        carreras: data?.carreras || [],
        history: data?.history || [],
        followedProfiles: data?.followedProfiles || [],
        followedCareers: data?.followedCareers || [],
        friendsCount: data?.friendsCount || 0,
        athleteDisciplinas: data?.athleteDisciplinas || [],
        athleteTeams: data?.athleteTeams || [],
        sportStatsMap: data?.sportStatsMap || {},
        loading: isLoading && !data,
        error,
        mutate
    };
}
