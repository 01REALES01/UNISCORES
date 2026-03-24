"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { Evento } from "@/modules/matches/types";

const EVENT_COLUMNS = `
  id, partido_id, tipo_evento, minuto, equipo, descripcion, created_at, periodo,
  jugadores:jugadores!jugador_id_normalized(id, nombre, numero, profile_id)
`.replace(/\s+/g, ' ').trim();

const activeEventChannels = new Set<number>();

function subscribeToEvents(partidoId: number) {
    if (typeof window === 'undefined') return;
    if (activeEventChannels.has(partidoId)) return;
    activeEventChannels.add(partidoId);

    supabase
        .channel(`match:${partidoId}:eventos`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'olympics_eventos', filter: `partido_id=eq.${partidoId}` },
            () => {
                globalMutate(`match:${partidoId}:events`);
            }
        )
        .subscribe();
}

export function useMatchEvents(partidoId: number | null | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        partidoId ? `match:${partidoId}:events` : null,
        async () => {
            if (!partidoId) return [];
            const { data, error } = await supabase
                .from('olympics_eventos')
                .select(EVENT_COLUMNS)
                .eq('partido_id', partidoId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return (data || []) as unknown as Evento[];
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 3000,
        }
    );

    useEffect(() => {
        if (partidoId) subscribeToEvents(partidoId);
    }, [partidoId]);

    return {
        events: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
