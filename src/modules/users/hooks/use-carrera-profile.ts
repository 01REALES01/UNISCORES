"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef, useCallback } from "react";
import { computeCareerStats, CareerStats } from "@/lib/sport-helpers";
import { EQUIPO_NOMBRE_TO_CARRERAS } from "@/lib/constants";
import { enrichPartidosCarreraShieldsFromDb } from "@/lib/match-carrera-shields";
import { overlayCarreraEscudoFromDelegationAlias } from "@/lib/carrera-delegacion-escudo-alias";

// ─── Column Selections ──────────────────────────────────────────────────────

const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id,
  carrera_a_id, carrera_b_id, carrera_a_ids, carrera_b_ids,
  disciplinas(name, icon),
  carrera_a:carreras!carrera_a_id(nombre, escudo_url),
  carrera_b:carreras!carrera_b_id(nombre, escudo_url),
  atleta_a:profiles!athlete_a_id(full_name, avatar_url),
  atleta_b:profiles!athlete_b_id(full_name, avatar_url)
`.replace(/\s+/g, ' ').trim();

const NEWS_COLUMNS = `
  id, titulo, contenido, imagen_url, categoria, created_at, published, autor_nombre, carrera,
  partidos(equipo_a, equipo_b, disciplinas(name),
    carrera_a:carreras!carrera_a_id(nombre, escudo_url),
    carrera_b:carreras!carrera_b_id(nombre, escudo_url))
`.replace(/\s+/g, ' ').trim();

// ─── Types ──────────────────────────────────────────────────────────────────

export type DeporteInscrito = {
    disciplina_id: number;
    delegacion_id: number;
    genero: string;
    equipo_nombre: string;
    disciplina_name: string;
    /** true when 2+ carreras share this delegación (combined team) */
    isCombined: boolean;
};

export type CarreraProfile = {
    carrera: { id: number; nombre: string; escudo_url?: string | null; followers_count?: number } | null;
    matches: any[];
    news: any[];
    athletes: any[];
    stats: CareerStats;
    deportesInscritos: DeporteInscrito[];
    loading: boolean;
    error: any;
    mutate: () => void;
};

// ─── Fetcher (with AbortController timeout) ─────────────────────────────────

async function fetchCarreraProfile(carreraId: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        // 1. Fetch the career itself
        const { data: carrera, error: carreraErr } = await supabase
            .from('carreras')
            .select('id, nombre, escudo_url, followers_count')
            .eq('id', carreraId)
            .abortSignal(controller.signal)
            .single();

        if (carreraErr || !carrera) {
            throw new Error('Carrera not found');
        }

        const carreraWithEscudo = await overlayCarreraEscudoFromDelegationAlias(supabase, carrera);

        // Delegaciones que incluyen esta carrera (equipos combinados: varias carreras → un equipo).
        const { data: delegLinks } = await supabase
            .from('delegaciones')
            .select('id')
            .or(`carrera_ids.cs.{${carreraId}}`)
            .abortSignal(controller.signal);
        const delegIdsForMatches = [
            ...new Set((delegLinks || []).map((d: { id: number }) => d.id).filter(Boolean)),
        ];

        // Dos consultas y merge. Con ORDER BY fecha DESC, un límite bajo corta los partidos **más viejos**
        // (los primeros que se jugaron en la temporada) si hay muchos encuentros recientes/futuros.
        // PostgREST suele permitir hasta ~1000 filas por request; subir en el servidor si hace falta más.
        const MATCH_FETCH_LIMIT = 1000;

        const { data: byCarreraArrays, error: errArrays } = await supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .or(`carrera_a_ids.cs.{${carreraId}},carrera_b_ids.cs.{${carreraId}}`)
            .abortSignal(controller.signal)
            .order('fecha', { ascending: false })
            .limit(MATCH_FETCH_LIMIT);

        if (errArrays) console.error('[useCarreraProfile] Matches (arrays):', errArrays);

        let byDelegacion: any[] = [];
        if (delegIdsForMatches.length > 0) {
            const list = delegIdsForMatches.join(',');
            const { data: dDeleg, error: errDeleg } = await supabase
                .from('partidos')
                .select(MATCH_COLUMNS)
                .or(`delegacion_a_id.in.(${list}),delegacion_b_id.in.(${list})`)
                .abortSignal(controller.signal)
                .order('fecha', { ascending: false })
                .limit(MATCH_FETCH_LIMIT);

            if (errDeleg) console.error('[useCarreraProfile] Matches (delegación):', errDeleg);
            else byDelegacion = dDeleg || [];
        }

        const seenId = new Set<number>();
        const mergedRaw = [...(byCarreraArrays || []), ...byDelegacion];
        const matchesDeduped = mergedRaw.filter((m: any) => {
            if (!m?.id || seenId.has(m.id)) return false;
            seenId.add(m.id);
            return true;
        });
        const matchesSorted = matchesDeduped.sort(
            (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        /** Tras merge, mostramos bastante historial (fútbol/basket tempranos en la jornada). */
        const matchesTrimmed = matchesSorted.slice(0, 600);
        const matches = await enrichPartidosCarreraShieldsFromDb(supabase, matchesTrimmed as any);

        // 3. Fetch news for this carrera
        const { data: newsData } = await supabase
            .from('noticias')
            .select(NEWS_COLUMNS)
            .eq('published', true)
            .eq('carrera', carrera.nombre)
            .abortSignal(controller.signal)
            .order('created_at', { ascending: false })
            .limit(10);

        // 4. Fetch athletes that belong to this career
        const { data: athletesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, roles, athlete_disciplina_id, points, sexo, genero, disciplina:disciplinas(name)')
            .or(`carreras_ids.cs.{${carreraId}}`)
            .abortSignal(controller.signal)
            .limit(200);

        // 5. Compute stats by ID
        const stats = computeCareerStats(matches, carreraId);

        // 6. Fetch enrolled sports from delegaciones
        const businessNames = ['ESCUELA DE NEGOCIOS', 'NEGOCIOS INT. / ADMÓN.'];
        const businessCareerIds = [1, 6, 20];
        const isBusiness = businessCareerIds.includes(carreraId);

        const { data: delegData } = await supabase
            .from('delegaciones')
            .select('id, disciplina_id, genero, nombre, carrera_ids, disciplinas(name)')
            .or(`carrera_ids.cs.{${carreraId}}` + (isBusiness ? `,nombre.in.("${businessNames.join('","')}")` : ''))
            .not('disciplina_id', 'is', null)
            .not('genero', 'is', null)
            .abortSignal(controller.signal);

        const deduped = new Map<string, DeporteInscrito>();
        for (const d of (delegData || []) as any[]) {
            const dname = Array.isArray(d.disciplinas) ? d.disciplinas[0]?.name : d.disciplinas?.name ?? '';
            const key = `${d.disciplina_id}_${d.genero}`;
            const memberCarreras = EQUIPO_NOMBRE_TO_CARRERAS[d.nombre] || [];
            const isCombinedByConfig = memberCarreras.length > 1;

            const entry: DeporteInscrito = {
                delegacion_id: d.id,
                disciplina_id: d.disciplina_id,
                genero: d.genero,
                equipo_nombre: d.nombre,
                disciplina_name: dname,
                isCombined: (d.carrera_ids?.length ?? 0) > 1 || isCombinedByConfig,
            };
            if (!deduped.has(key) || d.nombre !== carrera.nombre) {
                deduped.set(key, entry);
            }
        }
        const deportesInscritos: DeporteInscrito[] = Array.from(deduped.values());

        const result = {
            carrera: carreraWithEscudo,
            matches,
            news: newsData || [],
            athletes: (athletesData || []).filter((a: any) => 
                (a.roles || []).includes('deportista') || a.athlete_disciplina_id
            ),
            stats,
            deportesInscritos,
        };

        if (typeof window !== 'undefined') {
            try {
                sessionStorage.setItem(`swr-carrera-${carreraId}`, JSON.stringify(result));
            } catch (e) {
                console.warn('[useCarreraProfile] SessionStorage error:', e);
            }
        }

        return result;
    } catch (err) {
        console.error('[useCarreraProfile] Critical fetch error:', err);
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCarreraProfile(carreraId: number | null): CarreraProfile {
    let fallbackData: any = undefined;
    if (carreraId && typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(`swr-carrera-${carreraId}`);
            if (raw) fallbackData = JSON.parse(raw);
        } catch {}
    }

    const { data, error, isLoading, mutate } = useSWR(
        carreraId ? `carrera-profile-v7:${carreraId}` : null,
        () => fetchCarreraProfile(carreraId!),
        {
            fallbackData,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 15000,
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        if (!carreraId || typeof window === 'undefined') return;

        let activeChannel: any = null;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const debounced = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => mutate(), 1000);
        };

        const setup = () => {
            if (activeChannel) {
                supabase.removeChannel(activeChannel);
                activeChannel = null;
            }
            activeChannel = supabase
                .channel(`carrera-profile:${carreraId}:${Date.now()}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, debounced)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, debounced)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'carreras', filter: `id=eq.${carreraId}` }, () => {
                    console.log(`[useCarreraProfile] Career ${carreraId} updated, re-fetching...`);
                    debounced();
                })
                .subscribe();
        };

        setup();

        const handleRevalidate = () => {
            mutate();
            setup(); // Re-establish channel to be safe
        };
        window.addEventListener('app:revalidate', handleRevalidate);

        return () => {
            window.removeEventListener('app:revalidate', handleRevalidate);
            if (debounceTimer) clearTimeout(debounceTimer);
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, [carreraId, mutate]);

    return {
        carrera: data?.carrera || null,
        matches: data?.matches || [],
        news: data?.news || [],
        athletes: data?.athletes || [],
        stats: data?.stats || {
            oro: 0, plata: 0, bronce: 0, puntos: 0,
            won: 0, lost: 0, draw: 0, played: 0,
            byDiscipline: {},
        },
        deportesInscritos: data?.deportesInscritos || [],
        loading: isLoading && !data,
        error,
        mutate,
    };
}

