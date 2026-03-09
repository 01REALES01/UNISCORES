"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

// ─── Column Selection (only what we need) ────────────────────────────────────
const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order,
  disciplinas(name, icon),
  carrera_a:carreras!carrera_a_id(nombre),
  carrera_b:carreras!carrera_b_id(nombre)
`.replace(/\s+/g, ' ').trim();

// ─── SWR Fetcher ─────────────────────────────────────────────────────────────
const fetchMatches = async (): Promise<any[]> => {
    console.log('[DEBUG] 🔵 fetchMatches: Iniciando solicitud a Supabase');
    const start = performance.now();

    // 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const { data, error } = await supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .order('fecha', { ascending: true })
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);
        console.log(`[DEBUG] 🟢 fetchMatches: Respuesta recibida en ${Math.round(performance.now() - start)}ms`);

        if (error) {
            console.error('[DEBUG] 🔴 fetchMatches: Error en consulta principal:', error);
            // Fallback for missing columns (e.g. before SQL migration is run)
            if (error.code === 'PGRST204' || error.message?.includes('column')) {
                const FALLBACK_COLUMNS = MATCH_COLUMNS.replace('fase, grupo, bracket_order,', '');
                const fallback = await supabase
                    .from('partidos')
                    .select(FALLBACK_COLUMNS)
                    .order('fecha', { ascending: true })
                    .abortSignal(controller.signal);

                if (fallback.error) throw fallback.error;
                return fallback.data || [];
            }
            throw error;
        }
        return data || [];
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.error('[DEBUG] 🔴 fetchMatches: La solicitud excedió el tiempo límite de 10s');
            throw new Error('TIMEOUT');
        }
        console.error('[DEBUG] 🔴 fetchMatches: Catch de error inesperado:', err);
        throw err;
    }
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMatches() {
    const { data, error, isLoading, mutate } = useSWR(
        'global:partidos',
        fetchMatches,
        {
            revalidateOnFocus: true,      // Ensures fetching when returning to app
            revalidateOnReconnect: true,  // Refetch when network comes back
            revalidateOnMount: true,      // Force fetch on initial mount to fix empty cache
            dedupingInterval: 2000,       // Dedup requests within 2s
            keepPreviousData: true,       // Show stale data while revalidating
        }
    );

    // ─── Realtime subscription ───────────────────────────────────────────────
    useEffect(() => {
        const debounceRef = { timer: null as ReturnType<typeof setTimeout> | null };

        const debouncedMutate = () => {
            if (debounceRef.timer) clearTimeout(debounceRef.timer);
            debounceRef.timer = setTimeout(() => {
                mutate(); // Revalidate from Supabase
            }, 800);
        };

        const channel = supabase
            .channel('swr:partidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, debouncedMutate)
            .subscribe();

        return () => {
            if (debounceRef.timer) clearTimeout(debounceRef.timer);
            supabase.removeChannel(channel);
        };
    }, [mutate]);

    return {
        matches: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
