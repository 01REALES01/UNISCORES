"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { PartidoWithRelations } from "@/modules/matches/types";
import { enrichPartidosCarreraShieldsFromDb } from "@/lib/match-carrera-shields";

/** `mvp_jugador_id` en JSON no tiene FK: cargamos el jugador para la ficha pública (MVP en vóley, etc.). */
async function fetchMvpJugadorRow(
    marcadorDetalle: unknown,
    signal: AbortSignal
): Promise<{ id: number; nombre: string; profile_id?: string | null } | null> {
    const md = (marcadorDetalle || {}) as Record<string, unknown>;
    const raw = md.mvp_jugador_id;
    if (raw === null || raw === undefined || raw === '') return null;
    const idNum = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (Number.isNaN(idNum)) return null;
    const { data, error } = await supabase
        .from('jugadores')
        .select('id, nombre, profile_id')
        .eq('id', idNum)
        .abortSignal(signal)
        .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, nombre: data.nombre, profile_id: data.profile_id };
}

// Columnas con FK explícita según el schema confirmado:
// partidos.disciplina_id → disciplinas
// partidos.carrera_a_id / carrera_b_id → carreras
// partidos.athlete_a_id / athlete_b_id → profiles
// Nota: jugador_a_id / jugador_b_id NO existen en partidos.
//       Los jugadores nominales se obtienen vía roster_partido.
const MATCH_COLUMNS = [
    'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria, fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, carrera_a_ids, carrera_b_ids, athlete_a_id, athlete_b_id',
    'disciplinas:disciplina_id(id, name)',
    'carrera_a:carreras!carrera_a_id(id, nombre, escudo_url)',
    'carrera_b:carreras!carrera_b_id(id, nombre, escudo_url)',
    'atleta_a:profiles!athlete_a_id(id, full_name, avatar_url, carrera:carrera_id(id, nombre, escudo_url))',
    'atleta_b:profiles!athlete_b_id(id, full_name, avatar_url, carrera:carrera_id(id, nombre, escudo_url))',
    'delegacion_a_info:delegaciones!delegacion_a_id(id, escudo_url)',
    'delegacion_b_info:delegaciones!delegacion_b_id(id, escudo_url)',
    'roster:roster_partido(id, equipo_a_or_b, jugador:jugadores(id, nombre, profile_id))'
].join(', ');

/** Por `id`: evita que un fetch lento del detalle pise uno más reciente (mismo síntoma que lista global). */
const matchSingleFetchGen = new Map<string, number>();

export function useMatch(id: number | string | null | undefined) {
    // sessionStorage fallback: survive mobile JS context discards
    let fallbackData: PartidoWithRelations | undefined;
    if (id && typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(`swr-match-${id}`);
            if (raw) fallbackData = JSON.parse(raw);
        } catch {}
    }

    const { data, error, isLoading, isValidating, mutate } = useSWR(
        id ? `match:${id}` : null,
        async () => {
            if (!id) return null;
            const idKey = String(id);
            const myGen = (matchSingleFetchGen.get(idKey) ?? 0) + 1;
            matchSingleFetchGen.set(idKey, myGen);
            const assertStillCurrent = () => {
                if (matchSingleFetchGen.get(idKey) !== myGen) {
                    throw new DOMException('Stale match fetch superseded', 'AbortError');
                }
            };
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30_000);
            try {
                const { data, error } = await supabase
                    .from('partidos')
                    .select(MATCH_COLUMNS)
                    .eq('id', id)
                    .abortSignal(controller.signal)
                    .single();
                if (error) throw error;
                const raw = data as unknown as PartidoWithRelations;
                const enriched = await enrichPartidosCarreraShieldsFromDb(supabase, [raw]);
                const result = enriched[0];
                const mvpRow = await fetchMvpJugadorRow(raw.marcador_detalle, controller.signal);
                const withMvp = mvpRow ? { ...result, mvp_jugador: mvpRow } : result;
                assertStillCurrent();
                try { sessionStorage.setItem(`swr-match-${id}`, JSON.stringify(withMvp)); } catch {}
                return withMvp;
            } finally {
                clearTimeout(timeout);
            }
        },
        {
            fallbackData,
            revalidateOnFocus: false, // visibility-revalidate handles this
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        if (!id || typeof window === 'undefined') return;

        let activeChannel: any = null;

        const setupSubscription = () => {
            if (activeChannel?.state === 'joined') return;
            if (activeChannel) supabase.removeChannel(activeChannel);

            activeChannel = supabase
                .channel(`match:${id}:changes`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${id}` },
                    () => {
                        console.log(`[useMatch:${id}] Postgres change detected, mutating...`);
                        mutate();
                    }
                )
                .subscribe();
        };

        setupSubscription();

        const handleRevalidate = () => {
            mutate();
            // Forzar recreación — en móvil el canal puede estar muerto aunque reporte 'joined'
            if (activeChannel) {
                supabase.removeChannel(activeChannel);
                activeChannel = null;
            }
            setupSubscription();
        };

        window.addEventListener('app:revalidate', handleRevalidate);

        return () => {
            window.removeEventListener('app:revalidate', handleRevalidate);
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, [id, mutate]);

    return {
        match: data ?? null,
        loading: isLoading,
        refreshing: isValidating && !!data,
        error,
        mutate,
    };
}
