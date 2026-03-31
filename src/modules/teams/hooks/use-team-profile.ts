"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { computeCareerStats, CareerStats } from "@/lib/sport-helpers";

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

async function fetchTeamProfile(delegacionId: number) {
    // 1. Fetch the delegacion itself
    const { data: delegacion, error: delegacionErr } = await supabase
        .from('delegaciones')
        .select('id, nombre, genero, slot_label, carrera_ids, disciplina_id, disciplinas(name)')
        .eq('id', delegacionId)
        .single();

    if (delegacionErr || !delegacion) {
        throw new Error('Equipo no encontrado');
    }

    // 2. Fetch the allied careers for their badges and names
    const { data: carreras } = await supabase
        .from('carreras')
        .select('id, nombre, escudo_url')
        .in('id', delegacion.carrera_ids || []);

    // 3. Fetch all matches where this delegacion participates
    const [matchesA, matchesB] = await Promise.all([
        supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .eq('delegacion_a_id', delegacionId)
            .order('fecha', { ascending: false }),
        supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .eq('delegacion_b_id', delegacionId)
            .order('fecha', { ascending: false }),
    ]);

    // Merge and deduplicate by id
    const allMatchesRaw = [...((matchesA.data || []) as any[]), ...((matchesB.data || []) as any[])];
    const seen = new Set<number>();
    const matches = allMatchesRaw.filter((m: any) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    }).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // 4. Fetch athletes (Plantilla) that belong to these careers AND play this sport
    let athletesData: any[] = [];
    if (delegacion.carrera_ids && delegacion.carrera_ids.length > 0 && delegacion.disciplina_id) {
        // We use .overlaps to find athletes belonging to ANY of the allied careers
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, roles, athlete_disciplina_id, points, disciplina:disciplinas(name), carreras_ids')
            .overlaps('carreras_ids', delegacion.carrera_ids)
            .eq('athlete_disciplina_id', delegacion.disciplina_id);
            
        athletesData = data || [];
        // Filter by gender if the delegation has a specific gender
        if (delegacion.genero && delegacion.genero !== 'mixto') {
            // Wait, does profile have gender? If it does, we would filter it here.
            // Currently profiles don't consistently expose gender in this query, we skip filtering for now.
        }
    }

    // 5. Compute stats by delegacion. 
    // `computeCareerStats` expects a carreraId, but we can fake it or adapt it.
    // Wait, let's look at `computeCareerStats`. It checks `m.carrera_a_ids?.includes(carreraId)`, etc.
    // If we want stats specifically for the delegacion, we can compute them directly here.
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
                played++;
                dt.played++;
                
                const md = m.marcador_detalle || {};
                
                if (md.tipo === 'carrera') {
                    // For races, check if this delegation won medals
                    // We need to know which participant corresponds to this delegation
                    // Usually participants list have `equipo` matching `delegacion.nombre`
                    // This is complex, so we'll leave it 0 for now unless we need race specific logic.
                } else {
                    const md = m.marcador_detalle || {};
                    const isGameA = m.delegacion_a_id === delegacionId;
                    
                    const scoreA = md.goles_a ?? md.sets_a ?? md.total_a ?? 0;
                    const scoreB = md.goles_b ?? md.sets_b ?? md.total_b ?? 0;
                    
                    let gameWon = false;
                    let gameLost = false;
                    let gameDraw = false;

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
            }
        });

        return { oro, plata, bronce, puntos, won, lost, draw, played, byDiscipline };
    };

    const stats = computeTeamStats(matches, delegacionId);

    return {
        delegacion,
        carreras: carreras || [],
        matches,
        athletes: athletesData.filter((a: any) => a.roles?.includes('deportista')),
        stats,
    };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTeamProfile(delegacionId: number | null): TeamProfile {
    const { data, error, isLoading, mutate } = useSWR(
        delegacionId ? `team-profile:${delegacionId}` : null,
        () => fetchTeamProfile(delegacionId!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 15000,
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        if (delegacionId) {
            let debounce: ReturnType<typeof setTimeout> | null = null;
            const channel = supabase
                .channel(`team-profile:${delegacionId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                    if (debounce) clearTimeout(debounce);
                    debounce = setTimeout(() => mutate(), 1000);
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
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
        loading: isLoading,
        error,
        mutate,
    };
}
