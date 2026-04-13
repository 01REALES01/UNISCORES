"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { computeCareerStats, CareerStats } from "@/lib/sport-helpers";
import { EQUIPO_NOMBRE_TO_CARRERAS } from "@/lib/constants";

// ─── Column Selections ──────────────────────────────────────────────────────

const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order, delegacion_a_id, delegacion_b_id,
  carrera_a_ids, carrera_b_ids,
  disciplinas(name, icon),
  carrera_a:carreras!carrera_a_id(nombre, escudo_url),
  carrera_b:carreras!carrera_b_id(nombre, escudo_url),
  atleta_a:profiles!athlete_a_id(full_name, avatar_url),
  atleta_b:profiles!athlete_b_id(full_name, avatar_url)
`.replace(/\s+/g, ' ').trim();

// ─── Types ──────────────────────────────────────────────────────────────────

export type TeamProfile = {
    delegacion: any;
    carreras: any[];
    matches: any[];
    athletes: any[];
    stats: CareerStats;
    loading: boolean;
    error: any;
    mutate: () => void;
};

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchTeamProfile(delegacionId: number, signal?: AbortSignal) {
    const sig = signal ?? new AbortController().signal;

    // 1. Fetch the delegacion itself
    const { data: delegacion, error: delegacionErr } = await supabase
        .from('delegaciones')
        .select('id, nombre, genero, slot_label, carrera_ids, disciplina_id, disciplinas(name)')
        .eq('id', delegacionId)
        .abortSignal(sig)
        .single();

    if (delegacionErr || !delegacion) {
        throw new Error('Equipo no encontrado');
    }

    // 2. Fetch the allied careers for their badges and names
    const { data: allCarreras } = await supabase.from('carreras').select('id, nombre, escudo_url').abortSignal(sig);
    const dbCareerIds = delegacion.carrera_ids || [];
    
    const normalizedNombre = (delegacion.nombre || '').trim().toUpperCase();
    const configNames = EQUIPO_NOMBRE_TO_CARRERAS[normalizedNombre] || EQUIPO_NOMBRE_TO_CARRERAS[delegacion.nombre];
    const targetNames = (configNames && configNames.length > 0) 
        ? configNames.map((n: string) => n.toLowerCase()) 
        : [(delegacion.nombre || '').toLowerCase()];

    const carreras = (allCarreras || []).filter((c: any) => 
        dbCareerIds.includes(c.id) || targetNames.includes(c.nombre.toLowerCase())
    );

    const finalCareerIds = carreras.map((c: any) => c.id);
    delegacion.carrera_ids = Array.from(new Set([...dbCareerIds, ...finalCareerIds]));

    // 3. Fetch all matches where this delegacion participates
    const [matchesA, matchesB] = await Promise.all([
        supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .eq('delegacion_a_id', delegacionId)
            .order('fecha', { ascending: false })
            .abortSignal(sig),
        supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .eq('delegacion_b_id', delegacionId)
            .order('fecha', { ascending: false })
            .abortSignal(sig),
    ]);

    const allMatchesRaw = [...((matchesA.data || []) as any[]), ...((matchesB.data || []) as any[])];
    const seen = new Set<number>();
    const matches = allMatchesRaw.filter((m: any) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    }).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // 4. Fetch athletes (Plantilla)
    let athletesData: any[] = [];
    if (delegacion.carrera_ids && delegacion.carrera_ids.length > 0) {
        let query = supabase
            .from('jugadores')
            .select('id, nombre, genero, sexo, disciplina_id, profile:profiles(id, full_name, avatar_url, roles, points, disciplina:disciplinas(name))')
            .in('carrera_id', delegacion.carrera_ids);

        if (delegacion.disciplina_id) {
            query = query.or(`disciplina_id.eq.${delegacion.disciplina_id},disciplina_id.is.null`);
        }

        const { data: jugadores, error: errorJugadores } = await query.abortSignal(sig);
        
        if (jugadores) {
            const targetGender = (delegacion.genero || '').toLowerCase().trim();
            athletesData = (jugadores as any[])
                .filter(j => {
                    const profileObj = Array.isArray(j.profile) ? j.profile[0] : j.profile;
                    const jGender = (j.sexo || j.genero || profileObj?.sexo || profileObj?.genero || '').toLowerCase().trim();
                    if (!targetGender || targetGender === 'mixto') return true;
                    if (!jGender) return true;
                    if (targetGender.startsWith('masc') && (jGender.startsWith('masc') || jGender === 'm')) return true;
                    if (targetGender.startsWith('feme') && (jGender.startsWith('feme') || jGender === 'f')) return true;
                    return jGender === targetGender;
                })
                .map(j => {
                    const profileObj = Array.isArray(j.profile) ? j.profile[0] : j.profile;
                    const discObj = Array.isArray(profileObj?.disciplina) ? profileObj.disciplina[0] : profileObj?.disciplina;
                    return {
                        id: profileObj?.id || `jugador-${j.id}`,
                        full_name: profileObj?.full_name || j.nombre,
                        avatar_url: profileObj?.avatar_url || null,
                        roles: profileObj?.roles || ['deportista'], 
                        points: profileObj?.points || 0,
                        sexo: profileObj?.sexo || j.sexo || null,
                        genero: profileObj?.genero || j.genero || null,
                        isProfile: !!profileObj?.id,
                        disciplina: discObj || { name: (Array.isArray(delegacion.disciplinas) ? delegacion.disciplinas[0] : delegacion.disciplinas)?.name }
                    };
                });
            
            const uniqueAthletes = new Map();
            athletesData.forEach(a => { if (!uniqueAthletes.has(a.id)) uniqueAthletes.set(a.id, a); });
            athletesData = Array.from(uniqueAthletes.values());
            athletesData.sort((a, b) => b.points - a.points || a.full_name.localeCompare(b.full_name));
        }
    }

    // 5. Compute stats
    const computeTeamStats = (matches: any[], delegacionId: number): CareerStats => {
        let oro = 0, plata = 0, bronce = 0, puntos = 0;
        let won = 0, lost = 0, draw = 0, played = 0;
        const byDiscipline: Record<string, any> = {};
        matches.forEach(m => {
            const disciplineName = (Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas)?.name || 'Desconocido';
            if (!byDiscipline[disciplineName]) {
                byDiscipline[disciplineName] = { name: disciplineName, oro: 0, plata: 0, bronce: 0, puntos: 0, won: 0, lost: 0, draw: 0, played: 0 };
            }
            const dt = byDiscipline[disciplineName];
            if (m.estado === 'finalizado') {
                played++; dt.played++;
                const md = m.marcador_detalle || {};
                const isGameA = m.delegacion_a_id === delegacionId;
                const scoreA = md.goles_a ?? md.sets_a ?? md.total_a ?? 0;
                const scoreB = md.goles_b ?? md.sets_b ?? md.total_b ?? 0;
                let gameWon = false, gameLost = false, gameDraw = false;
                if (m.disciplinas?.name === 'Ajedrez') {
                    if (md.resultado_final === 'victoria_a' && isGameA) gameWon = true;
                    else if (md.resultado_final === 'victoria_b' && !isGameA) gameWon = true;
                    else if (md.resultado_final === 'empate') gameDraw = true;
                    else gameLost = true;
                } else {
                    if (scoreA === scoreB) gameDraw = true;
                    else if ((scoreA > scoreB && isGameA) || (scoreB > scoreA && !isGameA)) gameWon = true;
                    else gameLost = true;
                }
                if (gameWon) { won++; dt.won++; }
                else if (gameLost) { lost++; dt.lost++; }
                else if (gameDraw) { draw++; dt.draw++; }
            }
        });
        return { oro, plata, bronce, puntos, won, lost, draw, played, byDiscipline };
    };

    const stats = computeTeamStats(matches, delegacionId);
    const result = { delegacion, carreras: carreras || [], matches, athletes: athletesData, stats };
    
    // Save to sessionStorage for persistence
    if (typeof window !== 'undefined') {
        try { sessionStorage.setItem(`swr-team-profile-${delegacionId}`, JSON.stringify(result)); } catch {}
    }

    return result;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTeamProfile(delegacionId: number | null): TeamProfile {
    // sessionStorage fallback
    let fallbackData: any = undefined;
    if (delegacionId && typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(`swr-team-profile-${delegacionId}`);
            if (raw) fallbackData = JSON.parse(raw);
        } catch {}
    }

    const { data, error, isLoading, isValidating, mutate } = useSWR(
        delegacionId ? `team-profile:${delegacionId}` : null,
        async () => {
            if (!delegacionId) return null;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30_000);
            try {
                return await fetchTeamProfile(delegacionId, controller.signal);
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
        if (!delegacionId || typeof window === 'undefined') return;

        let activeChannel: any = null;
        let debounce: ReturnType<typeof setTimeout> | null = null;

        const setupSubscription = () => {
            if (activeChannel?.state === 'joined') return;
            if (activeChannel) supabase.removeChannel(activeChannel);

            // Using a unique channel name per mount ensures we don't collide with dead listeners
            activeChannel = supabase
                .channel(`team-profile:${delegacionId}:${Date.now()}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                    if (debounce) clearTimeout(debounce);
                    debounce = setTimeout(() => mutate(), 1000);
                })
                .subscribe();
        };

        setupSubscription();

        const handleRevalidate = () => {
            mutate();
            if (activeChannel) {
                supabase.removeChannel(activeChannel);
                activeChannel = null;
            }
            setupSubscription();
        };

        window.addEventListener('app:revalidate', handleRevalidate);

        return () => {
            window.removeEventListener('app:revalidate', handleRevalidate);
            if (debounce) clearTimeout(debounce);
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, [delegacionId, mutate]);

    return {
        delegacion: data?.delegacion || null,
        carreras: data?.carreras || [],
        matches: data?.matches || [],
        athletes: data?.athletes || [],
        stats: data?.stats || {
            oro: 0, plata: 0, bronce: 0, puntos: 0,
            won: 0, lost: 0, draw: 0, played: 0,
            byDiscipline: {},
        },
        loading: isLoading && !data, // Only true if no data AND loading
        error,
        mutate,
    };
}

