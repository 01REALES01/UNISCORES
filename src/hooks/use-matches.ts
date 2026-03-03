"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

// ─── Column Selection (only what we need) ────────────────────────────────────
const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  disciplinas(name, icon),
  carrera_a:carreras!carrera_a_id(nombre),
  carrera_b:carreras!carrera_b_id(nombre)
`.replace(/\s+/g, ' ').trim();

// ─── SWR Fetcher ─────────────────────────────────────────────────────────────
const fetchMatches = async (): Promise<any[]> => {
    const { data, error } = await supabase
        .from('partidos')
        .select(MATCH_COLUMNS)
        .order('fecha', { ascending: true });

    if (error) throw error;
    return data || [];
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useMatches() {
    const { data, error, isLoading, mutate } = useSWR(
        'global:partidos',
        fetchMatches,
        {
            revalidateOnFocus: false,     // Don't refetch when tab regains focus
            revalidateOnReconnect: true,  // Refetch when network comes back
            dedupingInterval: 5000,       // Dedup requests within 5s
            keepPreviousData: true,       // Show stale data while revalidating
        }
    );

    // ─── Realtime subscription ───────────────────────────────────────────────
    const mutateRef = useRef(mutate);
    mutateRef.current = mutate;

    useEffect(() => {
        const debounceRef = { timer: null as ReturnType<typeof setTimeout> | null };

        const debouncedMutate = () => {
            if (debounceRef.timer) clearTimeout(debounceRef.timer);
            debounceRef.timer = setTimeout(() => {
                mutateRef.current(); // Revalidate from Supabase
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
    }, []);

    return {
        matches: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
