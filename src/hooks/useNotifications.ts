"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
    getNotifications,
    getUnreadCount,
    markAsRead as markAsReadService,
    markAllAsRead as markAllAsReadService,
    deleteNotification as deleteNotificationService,
    getPendingFriendRequests,
    type Notification,
    type FriendRequest,
} from '@/services/notification-service';

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    // Initial fetch
    const fetchAll = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const [notifs, count, requests] = await Promise.all([
                getNotifications(user.id),
                getUnreadCount(user.id),
                getPendingFriendRequests(user.id),
            ]);
            if (!mountedRef.current) return;
            // Deduplicate: same type + title + body within 10 seconds = duplicate
            const deduped = notifs.filter((n, i, arr) => {
                const earlier = arr.findIndex(other =>
                    other.type === n.type &&
                    other.title === n.title &&
                    other.body === n.body &&
                    Math.abs(new Date(other.created_at).getTime() - new Date(n.created_at).getTime()) < 10000
                );
                return earlier === i;
            });
            setNotifications(deduped);
            setUnreadCount(count);
            setFriendRequests(requests);
        } catch (err) {
            console.error('[useNotifications] Error fetching:', err);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user?.id]);

    // Mark single as read
    const markAsRead = useCallback(async (notificationId: string) => {
        const success = await markAsReadService(notificationId);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return success;
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!user?.id) return false;
        const success = await markAllAsReadService(user.id);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
        return success;
    }, [user?.id]);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        const notif = notifications.find(n => n.id === notificationId);
        const success = await deleteNotificationService(notificationId);
        if (success) {
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (notif && !notif.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }
        return success;
    }, [notifications]);

    // Refresh friend requests
    const refreshFriendRequests = useCallback(async () => {
        if (!user?.id) return;
        const requests = await getPendingFriendRequests(user.id);
        if (mountedRef.current) setFriendRequests(requests);
    }, [user?.id]);

    // Realtime subscription
    useEffect(() => {
        mountedRef.current = true;
        if (!user?.id) {
            setNotifications([]);
            setUnreadCount(0);
            setFriendRequests([]);
            setLoading(false);
            return;
        }

        fetchAll();

        // Subscribe to new notifications
        const notifChannel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    if (!mountedRef.current) return;
                    const newNotif = payload.new as Notification;

                    setNotifications(prev => {
                        if (prev.some(n => n.id === newNotif.id)) return prev;
                        return [newNotif, ...prev];
                    });
                    setUnreadCount(prev => prev + 1);

                    // Show toast for new notification
                    const toastIcon = getNotifIcon(newNotif.type);
                    toast(newNotif.title, {
                        description: newNotif.body || undefined,
                        icon: toastIcon,
                        duration: 5000,
                    });
                }
            )
            .subscribe();

        // Subscribe to friend request changes
        const friendChannel = supabase
            .channel(`friend_requests:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friend_requests',
                    filter: `receiver_id=eq.${user.id}`,
                },
                () => {
                    if (mountedRef.current) refreshFriendRequests();
                }
            )
            .subscribe();

        return () => {
            mountedRef.current = false;
            supabase.removeChannel(notifChannel);
            supabase.removeChannel(friendChannel);
        };
    }, [user?.id, fetchAll, refreshFriendRequests]);

    return {
        notifications,
        unreadCount,
        friendRequests,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshFriendRequests,
        refetch: fetchAll,
    };
}

// Helper: Get emoji icon for notification type
function getNotifIcon(type: string): string {
    switch (type) {
        case 'match_start': return '🔴';
        case 'match_end': return '🏁';
        case 'score_update': return '📊';
        case 'friend_request': return '👥';
        case 'friend_accepted': return '🤝';
        default: return '🔔';
    }
}
