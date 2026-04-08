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
    // To handle case-insensitivity and partial names safely without tricky PostgREST syntax,
    // we fetch all careers (there are very few) and filter in JS.
    const { data: allCarreras } = await supabase.from('carreras').select('id, nombre, escudo_url');
    const dbCareerIds = delegacion.carrera_ids || [];
    
    // Determine the expected career names based on the config map or the direct team name
    const normalizedNombre = (delegacion.nombre || '').trim().toUpperCase();
    const configNames = EQUIPO_NOMBRE_TO_CARRERAS[normalizedNombre] || EQUIPO_NOMBRE_TO_CARRERAS[delegacion.nombre];
    const targetNames = (configNames && configNames.length > 0) 
        ? configNames.map((n: string) => n.toLowerCase()) 
        : [(delegacion.nombre || '').toLowerCase()];

    // Filter to find the matched careers
    const carreras = (allCarreras || []).filter((c: any) => 
        dbCareerIds.includes(c.id) || targetNames.includes(c.nombre.toLowerCase())
    );

    // Update careers in memory to ensure they reflect the full set
    const finalCareerIds = carreras.map((c: any) => c.id);
    delegacion.carrera_ids = Array.from(new Set([...dbCareerIds, ...finalCareerIds]));

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
    if (delegacion.carrera_ids && delegacion.carrera_ids.length > 0) {
        
        let query = supabase
            .from('jugadores')
            .select('id, nombre, genero, sexo, disciplina_id, profile:profiles(id, full_name, avatar_url, roles, points, disciplina:disciplinas(name))')
            .in('carrera_id', delegacion.carrera_ids);

        if (delegacion.disciplina_id) {
            query = query.or(`disciplina_id.eq.${delegacion.disciplina_id},disciplina_id.is.null`);
        }

        const { data: jugadores, error: errorJugadores } = await query;
        
        if (errorJugadores) {
            console.error("Error fetching roster: ", errorJugadores);
        }

        if (jugadores) {
            // Filter in JS to be more flexible with 'm', 'f', 'masculino', 'femenino'
            const targetGender = (delegacion.genero || '').toLowerCase().trim();
            
            athletesData = (jugadores as any[])
                .filter(j => {
                    const profileObj = Array.isArray(j.profile) ? j.profile[0] : j.profile;
                    const jGender = (j.sexo || j.genero || profileObj?.sexo || profileObj?.genero || '').toLowerCase().trim();
                    
                    // Gender rule: If mixed or no target gender, everyone is welcome.
                    if (!targetGender || targetGender === 'mixto') return true;
                    // If player has no assigned gender data, we include them so they aren't invisible
                    if (!jGender) return true;
                    // Check specific matches
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
            
            // Deduplica por si el administrador incribió dos veces en jugadores a un perfil validado único.
            const uniqueAthletes = new Map();
            athletesData.forEach(a => {
                if (!uniqueAthletes.has(a.id)) {
                    uniqueAthletes.set(a.id, a);
                }
            });
            athletesData = Array.from(uniqueAthletes.values());
            
            // Los jugadores estarán temporalmente ordenados por puntuación, y sino por orden de nombre descendente.
            athletesData.sort((a, b) => b.points - a.points || a.full_name.localeCompare(b.full_name));
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
        athletes: athletesData, // Se quita el filtro para que todos los inscritos (incluyendo admins) en jugadores aparezcan.
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
