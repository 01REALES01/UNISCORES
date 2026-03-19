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
    'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle',
    'fase, grupo, bracket_order, delegacion_a, delegacion_b',
    'carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
    'disciplinas:disciplina_id(name)',
    'carrera_a:carreras!carrera_a_id(nombre, escudo_url)',
    'carrera_b:carreras!carrera_b_id(nombre, escudo_url)',
    'atleta_a:profiles!athlete_a_id(full_name, avatar_url)',
    'atleta_b:profiles!athlete_b_id(full_name, avatar_url)',
].join(', ');

const activeMatchChannels = new Set<number>();

function subscribeToMatch(id: number) {
    if (typeof window === 'undefined') return;
    if (activeMatchChannels.has(id)) return;
    activeMatchChannels.add(id);

    let debounce: ReturnType<typeof setTimeout> | null = null;

    supabase
        .channel(`match:${id}:changes`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${id}` },
            () => {
                if (debounce) clearTimeout(debounce);
                debounce = setTimeout(() => {
                    globalMutate(`match:${id}`);
                }, 300);
            }
        )
        .subscribe();
}

export function useMatch(id: number | null | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? `match:${id}` : null,
        async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('partidos')
                .select(MATCH_COLUMNS)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as unknown as PartidoWithRelations;
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    useEffect(() => {
        if (id) subscribeToMatch(id);
    }, [id]);

    return {
        match: data ?? null,
        loading: isLoading,
        error,
        mutate,
    };
}
