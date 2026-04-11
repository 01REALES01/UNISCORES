"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { PartidoWithRelations } from "@/modules/matches/types";

// Columnas con FK explícita según el schema confirmado:
// partidos.disciplina_id → disciplinas
// partidos.carrera_a_id / carrera_b_id → carreras
// partidos.athlete_a_id / athlete_b_id → profiles
const MATCH_COLUMNS = [
    'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria, fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
    'disciplinas:disciplina_id(id, name)',
    'carrera_a:carreras!carrera_a_id(id, nombre, escudo_url)',
    'carrera_b:carreras!carrera_b_id(id, nombre, escudo_url)',
    'atleta_a:profiles!athlete_a_id(id, full_name, avatar_url, carrera:carrera_id(id, nombre, escudo_url))',
    'atleta_b:profiles!athlete_b_id(id, full_name, avatar_url, carrera:carrera_id(id, nombre, escudo_url))',
    'delegacion_a_info:delegaciones!delegacion_a_id(id, escudo_url)',
    'delegacion_b_info:delegaciones!delegacion_b_id(id, escudo_url)'
].join(', ');

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
                const result = data as unknown as PartidoWithRelations;
                try { sessionStorage.setItem(`swr-match-${id}`, JSON.stringify(result)); } catch {}
                return result;
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
