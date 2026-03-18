"use client";

import useSWR from 'swr';
import { useCallback } from 'react';
import {
    getFriends,
    getPendingFriendRequests,
    getFriendshipStatus,
    sendFriendRequest as sendRequestApi,
    respondFriendRequest as respondRequestApi,
    cancelFriendRequest as cancelRequestApi,
    removeFriend as removeFriendApi,
    type FriendRequest
} from '@/services/notification-service';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: User's friend list and pending requests
// ─────────────────────────────────────────────────────────────────────────────

export function useFriends(userId: string | null | undefined) {
    const {
        data: friendRequests = [],
        isLoading,
        error,
        mutate,
    } = useSWR(
        userId ? ['friends', userId] : null,
        ([, uid]) => getFriends(uid),
        { revalidateOnFocus: false }
    );

    const {
        data: pendingRequests = [],
        mutate: mutatePending,
    } = useSWR(
        userId ? ['friends-pending', userId] : null,
        ([, uid]) => getPendingFriendRequests(uid),
        { revalidateOnFocus: false }
    );

    // Transform FriendRequest[] into a simpler profile list for the UI
    const friends = friendRequests.map(fr => {
        const isReceiver = fr.receiver_id === userId;
        const profile = isReceiver ? fr.sender : fr.receiver;
        if (!profile) return null;
        
        return {
            ...profile,
            friend_id: profile.id,
            friendship_id: fr.id,
            since: fr.updated_at
        };
    }).filter(Boolean);

    const sendRequest = useCallback(async (targetId: string) => {
        if (!userId) return;
        const result = await sendRequestApi(userId, targetId);
        if (!result.success) throw new Error(result.error);
        await Promise.all([mutate(), mutatePending()]);
    }, [userId, mutate, mutatePending]);

    const acceptRequest = useCallback(async (requestId: string) => {
        const success = await respondRequestApi(requestId, true);
        if (!success) throw new Error('Failed to accept');
        await Promise.all([mutate(), mutatePending()]);
    }, [mutate, mutatePending]);

    const rejectRequest = useCallback(async (requestId: string) => {
        const success = await respondRequestApi(requestId, false);
        if (!success) throw new Error('Failed to reject');
        await mutatePending();
    }, [mutatePending]);

    const removeFriend = useCallback(async (requestId: string) => {
        const success = await removeFriendApi(requestId);
        if (!success) throw new Error('Failed to remove');
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
// Hook: Relationship between the current user and a specific profile
// ─────────────────────────────────────────────────────────────────────────────

export function useFriendRelation(
    currentUserId: string | null | undefined,
    targetId: string | null | undefined
) {
    const {
        data: relation = { status: 'none' },
        isLoading,
        mutate,
    } = useSWR(
        currentUserId && targetId && currentUserId !== targetId
            ? ['friend-relation', currentUserId, targetId]
            : null,
        ([, uid, tid]) => getFriendshipStatus(uid, tid),
        { revalidateOnFocus: false }
    );

    const sendRequest = useCallback(async () => {
        if (!currentUserId || !targetId) return;
        const result = await sendRequestApi(currentUserId, targetId);
        if (!result.success) throw new Error(result.error);
        await mutate();
    }, [currentUserId, targetId, mutate]);

    const cancelOrRemove = useCallback(async () => {
        if (relation.status === 'none' || !relation.requestId) return;
        const success = await cancelRequestApi(relation.requestId);
        if (!success) throw new Error('Failed to cancel');
        await mutate();
    }, [relation, mutate]);

    const acceptRequest = useCallback(async () => {
        if (relation.status !== 'pending' || !relation.requestId || relation.isSender) return;
        const success = await respondRequestApi(relation.requestId, true);
        if (!success) throw new Error('Failed to accept');
        await mutate();
    }, [relation, mutate]);

    // Map status to match the old 'pending_sent' and 'pending_received' for compatibility
    const compatibleRelation = {
        ...relation,
        status: relation.status === 'pending'
            ? (relation.isSender ? 'pending_sent' : 'pending_received')
            : (relation.status === 'accepted' ? 'accepted' : 'none')
    };

    return { relation: compatibleRelation, isLoading, sendRequest, cancelOrRemove, acceptRequest };
}
