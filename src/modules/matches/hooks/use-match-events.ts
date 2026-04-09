"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { Evento } from "@/modules/matches/types";

const EVENT_COLUMNS = `
  id, partido_id, tipo_evento, minuto, equipo, descripcion, created_at, periodo,
  jugadores:jugadores!jugador_id_normalized(id, nombre, numero, profile_id)
`.replace(/\s+/g, ' ').trim();

export function useMatchEvents(partidoId: number | string | null | undefined) {
    const { data, error, isLoading, mutate } = useSWR(
        partidoId ? `match:${partidoId}:events` : null,
        async () => {
            if (!partidoId) return [];
            const { data, error } = await supabase
                .from('olympics_eventos')
                .select(EVENT_COLUMNS)
                .eq('partido_id', partidoId)
                .order('minuto', { ascending: false }); // Detail page expects descending

            if (error) throw error;
            return (data || []) as unknown as Evento[];
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 3000,
        }
    );

    useEffect(() => {
        if (!partidoId || typeof window === 'undefined') return;

        let activeChannel: any = null;

        const setupSubscription = () => {
            if (activeChannel?.state === 'joined') return;
            if (activeChannel) supabase.removeChannel(activeChannel);

            activeChannel = supabase
                .channel(`match:${partidoId}:events`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'olympics_eventos', filter: `partido_id=eq.${partidoId}` },
                    () => {
                        console.log(`[useMatchEvents:${partidoId}] Events change detected, mutating...`);
                        mutate();
                    }
                )
                .subscribe();
        };

        setupSubscription();

        const handleRevalidate = () => {
            mutate();
            setupSubscription();
        };

        window.addEventListener('app:revalidate', handleRevalidate);

        return () => {
            window.removeEventListener('app:revalidate', handleRevalidate);
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, [partidoId, mutate]);

    return {
        events: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
