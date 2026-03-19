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

    supabase
        .channel(`global:favoritos:${userId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'user_carreras_favoritas', filter: `user_id=eq.${userId}` },
            () => { globalMutate(`favoritos-${userId}`); }
        )
        .subscribe();
}

export function useFavoritos(userId: string | undefined | null) {
    const { data, error, isLoading, mutate } = useSWR(
        userId ? `favoritos-${userId}` : null,
        async () => {
            if (!userId) return [];
            const { data, error } = await supabase
                .from('user_carreras_favoritas')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            return (data || []) as UserCarreraFavorita[];
        },
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    useEffect(() => {
        if (userId) subscribeToFavoritos(userId);
    }, [userId]);

    return {
        favoritos: data || [],
        // Explicitly cast to number to avoid bigint-as-string mismatch from Supabase
        favoriteIds: (data || []).map(f => Number(f.carrera_id)),
        loading: isLoading,
        error,
        mutate,
    };
}
