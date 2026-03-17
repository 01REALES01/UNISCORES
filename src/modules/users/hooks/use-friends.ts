"use client";

import useSWR from 'swr';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { FriendProfile, FriendRelation, Friendship } from '@/modules/users/types';

// ─────────────────────────────────────────────────────────────────────────────
// Fetchers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFriends(userId: string): Promise<FriendProfile[]> {
    const { data, error } = await supabase.rpc('get_friends_with_profiles', {
        p_user_id: userId,
    });
    if (error) throw error;
    return (data as FriendProfile[]) ?? [];
}

async function fetchPendingReceived(userId: string): Promise<Friendship[]> {
    const { data, error } = await supabase
        .from('user_friends')
        .select('*')
        .eq('addressee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Friendship[]) ?? [];
}

async function fetchRelation(userId: string, targetId: string): Promise<FriendRelation> {
    const { data, error } = await supabase
        .from('user_friends')
        .select('id, requester_id, addressee_id, status')
        .or(
            `and(requester_id.eq.${userId},addressee_id.eq.${targetId}),` +
            `and(requester_id.eq.${targetId},addressee_id.eq.${userId})`
        )
        .maybeSingle();

    if (error) throw error;
    if (!data) return { status: 'none' };

    const row = data as Friendship;
    if (row.status === 'accepted') return { status: 'accepted', friendship_id: row.id };
    if (row.status === 'blocked')  return { status: 'blocked',  friendship_id: row.id };
    if (row.status === 'pending') {
        return row.requester_id === userId
            ? { status: 'pending_sent',     friendship_id: row.id }
            : { status: 'pending_received', friendship_id: row.id };
    }
    return { status: 'none' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: lista de amigos del usuario actual
// ─────────────────────────────────────────────────────────────────────────────

export function useFriends(userId: string | null | undefined) {
    const {
        data: friends = [],
        isLoading,
        error,
        mutate,
    } = useSWR(
        userId ? ['friends', userId] : null,
        ([, uid]) => fetchFriends(uid),
        { revalidateOnFocus: false }
    );

    const {
        data: pendingRequests = [],
        mutate: mutatePending,
    } = useSWR(
        userId ? ['friends-pending', userId] : null,
        ([, uid]) => fetchPendingReceived(uid),
        { revalidateOnFocus: false }
    );

    const sendRequest = useCallback(async (targetId: string) => {
        if (!userId) return;
        const { error } = await supabase
            .from('user_friends')
            .insert({ requester_id: userId, addressee_id: targetId });
        if (error) throw error;
        await mutate();
    }, [userId, mutate]);

    const acceptRequest = useCallback(async (friendshipId: string) => {
        const { error } = await supabase
            .from('user_friends')
            .update({ status: 'accepted' })
            .eq('id', friendshipId);
        if (error) throw error;
        await Promise.all([mutate(), mutatePending()]);
    }, [mutate, mutatePending]);

    const rejectRequest = useCallback(async (friendshipId: string) => {
        const { error } = await supabase
            .from('user_friends')
            .delete()
            .eq('id', friendshipId);
        if (error) throw error;
        await mutatePending();
    }, [mutatePending]);

    const removeFriend = useCallback(async (friendshipId: string) => {
        const { error } = await supabase
            .from('user_friends')
            .delete()
            .eq('id', friendshipId);
        if (error) throw error;
        await mutate();
    }, [mutate]);

    return {
        friends,
        pendingRequests,
        isLoading,
        error,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        mutate,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: relación entre el usuario actual y un perfil específico
// Usado en la página pública de perfil para mostrar el botón correcto
// ─────────────────────────────────────────────────────────────────────────────

export function useFriendRelation(
    currentUserId: string | null | undefined,
    targetId: string | null | undefined
) {
    const {
        data: relation = { status: 'none' } as FriendRelation,
        isLoading,
        mutate,
    } = useSWR(
        currentUserId && targetId && currentUserId !== targetId
            ? ['friend-relation', currentUserId, targetId]
            : null,
        ([, uid, tid]) => fetchRelation(uid, tid),
        { revalidateOnFocus: false }
    );

    const sendRequest = useCallback(async () => {
        if (!currentUserId || !targetId) return;
        const { error } = await supabase
            .from('user_friends')
            .insert({ requester_id: currentUserId, addressee_id: targetId });
        if (error) throw error;
        await mutate();
    }, [currentUserId, targetId, mutate]);

    const cancelOrRemove = useCallback(async () => {
        if (relation.status === 'none') return;
        const { friendship_id } = relation as { friendship_id: string; status: string };
        const { error } = await supabase
            .from('user_friends')
            .delete()
            .eq('id', friendship_id);
        if (error) throw error;
        await mutate();
    }, [relation, mutate]);

    const acceptRequest = useCallback(async () => {
        if (relation.status !== 'pending_received') return;
        const { friendship_id } = relation as { friendship_id: string; status: string };
        const { error } = await supabase
            .from('user_friends')
            .update({ status: 'accepted' })
            .eq('id', friendship_id);
        if (error) throw error;
        await mutate();
    }, [relation, mutate]);

    return { relation, isLoading, sendRequest, cancelOrRemove, acceptRequest };
}
