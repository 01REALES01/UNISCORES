"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

type UserCarreraFavorita = {
    id: string;
    user_id: string;
    carrera_id: number;
    created_at: string;
};

export function useFavoritos(userId: string | undefined | null) {
    const channelRef = useRef<any>(null);

    const fetcher = async () => {
        if (!userId) return [];

        const { data, error } = await supabase
            .from('user_carreras_favoritas')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching favoritos:', error);
            throw error;
        }

        return (data || []) as UserCarreraFavorita[];
    };

    const { data, error, isLoading, mutate } = useSWR(
        userId ? `favoritos-${userId}` : null,
        fetcher,
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }
    );

    useEffect(() => {
        if (!userId) return;

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel(`favoritos-changes-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_carreras_favoritas',
                    filter: `user_id=eq.${userId}`
                },
                () => {
                    mutate();
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [userId, mutate]);

    return {
        favoritos: data || [],
        favoriteIds: (data || []).map(f => f.carrera_id),
        loading: isLoading,
        error,
        mutate
    };
}
