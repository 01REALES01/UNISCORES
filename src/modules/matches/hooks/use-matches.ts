"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { PartidoWithRelations } from "@/modules/matches/types";

// ─── Column Selection (only what we need) ────────────────────────────────────
const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order, delegacion_a, delegacion_b,
  disciplinas(name, icon),
  carrera_a:carreras!carrera_a_id(nombre, escudo_url),
  carrera_b:carreras!carrera_b_id(nombre, escudo_url),
  atleta_a:profiles!athlete_a_id(full_name, avatar_url),
  atleta_b:profiles!athlete_b_id(full_name, avatar_url)
`.replace(/\s+/g, ' ').trim();

// ─── SWR Fetcher ─────────────────────────────────────────────────────────────
const fetchMatches = async (): Promise<PartidoWithRelations[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const { data, error } = await supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .order('fecha', { ascending: true })
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
            // Fallback for missing columns (e.g. before SQL migration is run)
            if (error.code === 'PGRST204' || error.message?.includes('column')) {
                const FALLBACK_COLUMNS = MATCH_COLUMNS.replace('fase, grupo, bracket_order,', '');
                const fallback = await supabase
                    .from('partidos')
                    .select(FALLBACK_COLUMNS)
                    .order('fecha', { ascending: true })
                    .abortSignal(controller.signal);

                if (fallback.error) throw fallback.error;
                return (fallback.data || []) as unknown as PartidoWithRelations[];
            }
            throw error;
        }
        return (data || []) as unknown as PartidoWithRelations[];
    } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('TIMEOUT');
        }
        throw err;
    }
};

// ─── Global Realtime Subscription (singleton) ─────────────────────────────────
let isMatchesSubscribed = false;

function subscribeToMatches() {
    if (typeof window === 'undefined') return;
    if (isMatchesSubscribed) return;
    isMatchesSubscribed = true;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    supabase
        .channel('global:partidos:changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                globalMutate('global:partidos');
            }, 800);
        })
        .subscribe();
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMatches() {
    const { data, error, isLoading, mutate } = useSWR(
        'global:partidos',
        fetchMatches,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            revalidateOnMount: true,
            dedupingInterval: 10000,
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        subscribeToMatches();
    }, []);

    return {
        matches: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
