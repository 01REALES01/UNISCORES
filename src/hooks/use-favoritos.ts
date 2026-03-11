"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

type UserCarreraFavorita = {
    id: string;
    user_id: string;
    carrera_id: number;
    created_at: string;
};

const activeUserChannels = new Set<string>();

function subscribeToFavoritos(userId: string) {
    if (typeof window === 'undefined' || !userId) return;
    if (activeUserChannels.has(userId)) return;

    activeUserChannels.add(userId);
    console.log(`[DEBUG] 🔵 global: Iniciando suscripción Realtime SINGLETON para favoritos de ${userId}`);

    supabase
        .channel(`global:favoritos:${userId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'user_carreras_favoritas', filter: `user_id=eq.${userId}` },
            () => {
                console.log(`[DEBUG] 🟢 global: Cambio en favoritos detectado para ${userId}`);
                globalMutate(`favoritos-${userId}`);
            }
        )
        .subscribe();
}

export function useFavoritos(userId: string | undefined | null) {
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
            revalidateOnFocus: false, // Prevent DB spam on tab switch
            dedupingInterval: 60000,  // Cache for 60s
        }
    );

    useEffect(() => {
        if (userId) subscribeToFavoritos(userId);
    }, [userId]);

    return {
        favoritos: data || [],
        favoriteIds: (data || []).map(f => f.carrera_id),
        loading: isLoading,
        error,
        mutate
    };
}
