"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Prediction, QuinielaLeaderboardEntry } from "@/modules/quiniela/types";
import type { PartidoWithRelations } from "@/modules/matches/types";

// ─── Column selection ─────────────────────────────────────────────────────────
const MATCH_COLUMNS = '*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)';
const LEADERBOARD_COLUMNS = '*, display_name, avatar_url, points, current_streak, max_streak, total_predictions, correct_predictions';

// ─── Realtime (singleton) ─────────────────────────────────────────────────────
let isQuinielaSubscribed = false;

function subscribeToQuiniela(userId: string) {
    if (typeof window === 'undefined') return;
    if (isQuinielaSubscribed) return;
    isQuinielaSubscribed = true;

    supabase
        .channel('quiniela:realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pronosticos' }, () => {
            globalMutate(`quiniela:allPredictions`);
            globalMutate(`quiniela:userPredictions:${userId}`);
            globalMutate('quiniela:leaderboard');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
            globalMutate('quiniela:matches');
        })
        .subscribe();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useQuiniela(userId: string | null | undefined) {
    // All matches (for quiniela — scheduled/live/finished)
    const { data: matches, isLoading: matchesLoading } = useSWR<PartidoWithRelations[]>(
        'quiniela:matches',
        async () => {
            const { data, error } = await safeQuery(
                supabase.from('partidos').select(MATCH_COLUMNS).order('fecha', { ascending: true }),
                'quiniela-matches'
            );
            if (error) throw error;
            return (data || []) as unknown as PartidoWithRelations[];
        },
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );

    // User's own predictions
    const { data: predictions, mutate: mutatePredictions, isLoading: predsLoading } = useSWR<Prediction[]>(
        userId ? `quiniela:userPredictions:${userId}` : null,
        async () => {
            if (!userId) return [];
            const { data, error } = await supabase.from('pronosticos').select('*').eq('user_id', userId);
            if (error) throw error;
            return (data || []) as unknown as Prediction[];
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 }
    );

    // All predictions (for vote %)
    const { data: allPredictions, isLoading: allPredsLoading } = useSWR(
        'quiniela:allPredictions',
        async () => {
            const { data, error } = await supabase
                .from('pronosticos')
                .select('match_id, winner_pick, prediction_type');
            if (error) throw error;
            return data || [];
        },
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );

    // Leaderboard
    const { data: leaderboard, isLoading: leaderboardLoading } = useSWR<QuinielaLeaderboardEntry[]>(
        'quiniela:leaderboard',
        async () => {
            const { data, error } = await safeQuery(
                supabase.from('public_profiles').select(LEADERBOARD_COLUMNS).order('points', { ascending: false }).limit(50),
                'quiniela-ranking'
            );
            if (error) throw error;
            return (data || []) as unknown as QuinielaLeaderboardEntry[];
        },
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    );

    // User public profile (points, streak, etc.)
    const { data: userPublicProfile } = useSWR(
        userId ? `quiniela:publicProfile:${userId}` : null,
        async () => {
            if (!userId) return null;
            const { data } = await supabase.from('public_profiles').select('*').eq('id', userId).single();
            return data;
        },
        { revalidateOnFocus: false, dedupingInterval: 30000 }
    );

    // ─── Realtime ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (userId) subscribeToQuiniela(userId);
    }, [userId]);

    // ─── Actions ─────────────────────────────────────────────────────────────
    const submitPrediction = async (matchId: number, data: Partial<Prediction>): Promise<void> => {
        if (!userId) return;

        toast.promise(
            async () => {
                // Ensure public profile exists
                await supabase
                    .from('public_profiles')
                    .upsert({ id: userId, email: '' }, { onConflict: 'id' });

                const existing = (predictions || []).find(p => p.match_id === matchId);
                const payload = { user_id: userId, match_id: matchId, ...data };

                if (existing) {
                    const { error } = await supabase.from('pronosticos').update(payload).eq('id', existing.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('pronosticos').insert(payload);
                    if (error) throw error;
                }

                await Promise.all([
                    globalMutate(`quiniela:userPredictions:${userId}`),
                    globalMutate('quiniela:allPredictions'),
                ]);
            },
            {
                loading: 'Guardando acierto...',
                success: '¡Acierto guardado! 🔥',
                error: (e: Error) => `Error: ${e.message}`,
            }
        );
    };

    return {
        matches: matches || [],
        predictions: predictions || [],
        allPredictions: allPredictions || [],
        leaderboard: leaderboard || [],
        userPublicProfile,
        userPoints: userPublicProfile?.points || 0,
        loading: matchesLoading || predsLoading || allPredsLoading || leaderboardLoading,
        mutatePredictions,
        submitPrediction,
    };
}
