import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationType =
    | 'match_start'
    | 'match_end'
    | 'score_update'
    | 'friend_request'
    | 'friend_accepted'
    | 'system';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    metadata: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

export interface NotificationPreferences {
    id?: string;
    user_id: string;
    match_start: boolean;
    match_end: boolean;
    score_updates: boolean;
    friend_requests: boolean;
    followed_sports: string[];
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: FriendRequestStatus;
    created_at: string;
    updated_at: string;
    // Joined fields
    sender?: { id: string; full_name: string; avatar_url: string | null };
    receiver?: { id: string; full_name: string; avatar_url: string | null };
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[NotificationService] Error fetching notifications:', error.message);
        return [];
    }
    return (data || []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('[NotificationService] Error fetching unread count:', error.message);
        return 0;
    }
    return count || 0;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('[NotificationService] Error marking as read:', error.message);
        return false;
    }
    return true;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('[NotificationService] Error marking all as read:', error.message);
        return false;
    }
    return true;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

    if (error) {
        console.error('[NotificationService] Error deleting notification:', error.message);
        return false;
    }
    return true;
}

// ─── Notification Preferences ────────────────────────────────────────────────

export async function getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('[NotificationService] Error fetching preferences:', error.message);
    }

    // Return defaults if no row exists
    if (!data) {
        return {
            user_id: userId,
            match_start: true,
            match_end: true,
            score_updates: false,
            friend_requests: true,
            followed_sports: [],
        };
    }

    return data as NotificationPreferences;
}

export async function updatePreferences(
    userId: string,
    prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
): Promise<boolean> {
    // Upsert: create if not exists, update if exists
    const { error } = await supabase
        .from('notification_preferences')
        .upsert({
            user_id: userId,
            ...prefs,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('[NotificationService] Error updating preferences:', error.message);
        return false;
    }
    return true;
}

// ─── Friend Requests ─────────────────────────────────────────────────────────

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<{ success: boolean; error?: string }> {
    // Check if already friends or pending
    const { data: existing } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .limit(1)
        .single();

    if (existing) {
        if (existing.status === 'accepted') return { success: false, error: 'Ya son amigos' };
        if (existing.status === 'pending') return { success: false, error: 'Solicitud ya enviada' };
        // If rejected, allow re-sending by deleting old and creating new
        await supabase.from('friend_requests').delete().eq('id', existing.id);
    }

    const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: senderId, receiver_id: receiverId });

    if (error) {
        console.error('[NotificationService] Error sending friend request:', error.message);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function respondFriendRequest(requestId: string, accept: boolean): Promise<boolean> {
    const newStatus = accept ? 'accepted' : 'rejected';
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);

    if (error) {
        console.error('[NotificationService] Error responding to friend request:', error.message);
        return false;
    }
    return true;
}

export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
        .from('friend_requests')
        .select('*, sender:profiles!friend_requests_sender_id_fkey(id, full_name, avatar_url)')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[NotificationService] Error fetching friend requests:', error.message);
        return [];
    }
    return (data || []) as FriendRequest[];
}

export async function getFriends(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
        .from('friend_requests')
        .select(`
            *,
            sender:profiles!friend_requests_sender_id_fkey(id, full_name, avatar_url),
            receiver:profiles!friend_requests_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[NotificationService] Error fetching friends:', error.message);
        return [];
    }
    return (data || []) as FriendRequest[];
}

export async function getFriendshipStatus(
    userId: string,
    otherUserId: string
): Promise<{ status: FriendRequestStatus | 'none'; requestId?: string; isSender?: boolean }> {
    const { data } = await supabase
        .from('friend_requests')
        .select('id, status, sender_id')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .limit(1)
        .single();

    if (!data) return { status: 'none' };
    return {
        status: data.status as FriendRequestStatus,
        requestId: data.id,
        isSender: data.sender_id === userId,
    };
}

export async function cancelFriendRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
        console.error('[NotificationService] Error cancelling friend request:', error.message);
        return false;
    }
    return true;
}

export async function removeFriend(requestId: string): Promise<boolean> {
    const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
        console.error('[NotificationService] Error removing friend:', error.message);
        return false;
    }
    return true;
}
