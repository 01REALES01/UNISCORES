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
    // sessionStorage fallback: survive mobile JS context discards
    let fallbackData: Evento[] | undefined;
    if (partidoId && typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(`swr-match-events-${partidoId}`);
            if (raw) fallbackData = JSON.parse(raw);
        } catch {}
    }

    const { data, error, isLoading, mutate } = useSWR(
        partidoId ? `match:${partidoId}:events` : null,
        async () => {
            if (!partidoId) return [];
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30_000);
            try {
                const { data, error } = await supabase
                    .from('olympics_eventos')
                    .select(EVENT_COLUMNS)
                    .eq('partido_id', partidoId)
                    .abortSignal(controller.signal)
                    .order('minuto', { ascending: false });
                if (error) throw error;
                const result = (data || []) as unknown as Evento[];
                try { sessionStorage.setItem(`swr-match-events-${partidoId}`, JSON.stringify(result)); } catch {}
                return result;
            } finally {
                clearTimeout(timeout);
            }
        },
        {
            fallbackData,
            revalidateOnFocus: false, // visibility-revalidate handles this
            revalidateOnReconnect: true,
            dedupingInterval: 3000,
            keepPreviousData: true,
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
    }, [partidoId, mutate]);

    return {
        events: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
