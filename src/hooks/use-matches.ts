"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

// ─── Column Selection (only what we need) ────────────────────────────────────
const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order, delegacion_a, delegacion_b,
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

// ─── Global Realtime Subscription ────────────────────────────────────────────
let isMatchesSubscribed = false;

function subscribeToMatches() {
    if (typeof window === 'undefined') return;
    if (isMatchesSubscribed) return;
    isMatchesSubscribed = true;

    console.log('[DEBUG] 🔵 global: Iniciando suscripción Realtime SINGLETON para partidos');

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    supabase
        .channel('global:partidos:changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('[DEBUG] 🟢 global: Cambio en partidos detectado (Realtime), invalidando caché...');
                globalMutate('global:partidos');
            }, 800);
        })
        .subscribe((status) => {
            console.log('[DEBUG] 📡 global: Estado Singleon Realtime (partidos):', status);
        });
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMatches() {
    const { data, error, isLoading, mutate } = useSWR(
        'global:partidos',
        fetchMatches,
        {
            revalidateOnFocus: false,     // PREVENT CONNECTION SPAM ON TAB SWITCH
            revalidateOnReconnect: true,  // Refetch when network comes back
            revalidateOnMount: true,      // Force fetch on initial mount to fix empty cache
            dedupingInterval: 10000,      // Dedup requests within 10s
            keepPreviousData: true,       // Show stale data while revalidating
        }
    );

    // ─── Realtime subscription ───────────────────────────────────────────────
    useEffect(() => {
        // Trigger singleton subscription inside useEffect to ensure it runs only on client
        subscribeToMatches();
    }, []);

    return {
        matches: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
