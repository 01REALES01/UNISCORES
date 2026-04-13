"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { PartidoWithRelations } from "@/modules/matches/types";

// ─── Column Selection — FK explícita según schema confirmado ─────────────────
// partidos.disciplina_id → disciplinas
// partidos.carrera_a_id / carrera_b_id → carreras
// partidos.athlete_a_id / athlete_b_id → profiles
const MATCH_COLUMNS = [
    'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria',
    'fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id',
    'carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
    'disciplinas:disciplina_id(name)',
    'carrera_a:carreras!carrera_a_id(nombre, escudo_url)',
    'carrera_b:carreras!carrera_b_id(nombre, escudo_url)',
    'delegacion_a_info:delegaciones!delegacion_a_id(escudo_url)',
    'delegacion_b_info:delegaciones!delegacion_b_id(escudo_url)',
    'atleta_a:profiles!athlete_a_id(full_name, avatar_url)',
    'atleta_b:profiles!athlete_b_id(full_name, avatar_url)',
].join(', ');

// ─── SWR Fetcher ─────────────────────────────────────────────────────────────
const fetchMatches = async (): Promise<PartidoWithRelations[]> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const { data, error } = await supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .order('fecha', { ascending: true })
            .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
            const isSchemaMiss =
                error.code === 'PGRST204' ||
                error.code === 'PGRST200' ||
                error.message?.includes('column') ||
                error.message?.includes('relationship');

            if (isSchemaMiss) {
                const FALLBACK_COLUMNS = [
                    'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria',
                    'delegacion_a, delegacion_b',
                    'carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
                    'disciplinas:disciplina_id(name)',
                    'carrera_a:carreras!carrera_a_id(nombre, escudo_url)',
                    'carrera_b:carreras!carrera_b_id(nombre, escudo_url)',
                    'atleta_a:profiles!athlete_a_id(full_name, avatar_url)',
                    'atleta_b:profiles!athlete_b_id(full_name, avatar_url)',
                ].join(', ');

                const fallback = await supabase
                    .from('partidos')
                    .select(FALLBACK_COLUMNS)
                    .order('fecha', { ascending: true })
                    .abortSignal(controller.signal);

                if (fallback.error) throw fallback.error;
                const finalData = (fallback.data || []) as unknown as PartidoWithRelations[];
                if (typeof window !== 'undefined' && finalData.length > 0) {
                    try { sessionStorage.setItem('swr-global-matches', JSON.stringify(finalData)); } catch {}
                }
                return finalData;
            }
            throw error;
        }
        
        const finalData = (data || []) as unknown as PartidoWithRelations[];
        if (typeof window !== 'undefined' && finalData.length > 0) {
            try { sessionStorage.setItem('swr-global-matches', JSON.stringify(finalData)); } catch {}
        }
        return finalData;
    } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('TIMEOUT');
        }
        throw err;
    }
};

// ─── Managed Realtime Hook ───────────────────────────────────────────────────
let globalChannel: any = null;

export function useMatches() {
    // sessionStorage fallback: provide data immediately even if app context was cleared
    let fallbackData: PartidoWithRelations[] | undefined = undefined;
    if (typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem('swr-global-matches');
            if (raw) fallbackData = JSON.parse(raw);
        } catch {}
    }

    const { data, error, isLoading, mutate } = useSWR(
        'global:partidos',
        fetchMatches,
        {
            fallbackData,
            revalidateOnReconnect: true,
            revalidateOnMount: true,
            revalidateOnFocus: false, // Managed by VisibilityRevalidate
            dedupingInterval: 5000,
            keepPreviousData: true,
        }
    );


    useEffect(() => {
        if (typeof window === 'undefined') return;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const debounced = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('[useMatches] Realtime change detected, mutating...');
                mutate();
            }, 500);
        };

        const setupSubscription = () => {
            // If already subscribed and healthy, skip
            if (globalChannel?.state === 'joined') return;
            
            // Clean up old channel if present
            if (globalChannel) {
                supabase.removeChannel(globalChannel);
            }

            console.log('[useMatches] Initializing realtime subscription...');
            globalChannel = supabase
                .channel('global:matches:sync:' + Date.now())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                    console.log('[useMatches] Match change detected');
                    debounced();
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'carreras' }, () => {
                    console.log('[useMatches] Career update detected (logo/name sync)');
                    debounced();
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delegaciones' }, () => {
                    console.log('[useMatches] Delegation update detected (logo sync)');
                    debounced();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') console.log('[useMatches] Realtime connected');
                    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        console.warn('[useMatches] Realtime disconnected, state:', status);
                    }
                });
        };

        setupSubscription();

        const handleRevalidate = () => {
            console.log('[useMatches] Global revalidate: refreshing data & verifying realtime');
            mutate();
            setupSubscription(); // Re-verify/re-connect if channel died
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[useMatches] App foregrounded — reconnecting realtime & refreshing data');
                setupSubscription();
                mutate();
            }
        };

        window.addEventListener('app:revalidate', handleRevalidate);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('app:revalidate', handleRevalidate);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [mutate]);

    return {
        matches: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
