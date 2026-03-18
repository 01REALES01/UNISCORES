"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type PushState = 'unsupported' | 'prompt' | 'granted' | 'denied' | 'loading';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushSubscription() {
    const { user } = useAuth();
    const [pushState, setPushState] = useState<PushState>('loading');
    const [subscribing, setSubscribing] = useState(false);

    // Check current permission state on mount
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPushState('unsupported');
            return;
        }

        const permission = Notification.permission;
        if (permission === 'denied') {
            setPushState('denied');
        } else if (permission === 'granted') {
            // Check if we actually have an active subscription
            navigator.serviceWorker.ready.then(reg => {
                reg.pushManager.getSubscription().then(sub => {
                    setPushState(sub ? 'granted' : 'prompt');
                });
            });
        } else {
            setPushState('prompt');
        }
    }, []);

    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!user?.id) return false;
        if (pushState === 'unsupported' || pushState === 'denied') return false;

        setSubscribing(true);
        try {
            // 1. Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            // 2. Request permission & subscribe
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                console.error('[PushSubscription] VAPID public key not configured');
                return false;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
            });

            // 3. Extract keys
            const subJson = subscription.toJSON();
            const endpoint = subJson.endpoint;
            const p256dh = subJson.keys?.p256dh;
            const auth = subJson.keys?.auth;

            if (!endpoint || !p256dh || !auth) {
                console.error('[PushSubscription] Missing subscription keys');
                return false;
            }

            // 4. Save to Supabase
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user.id,
                    endpoint,
                    p256dh,
                    auth,
                }, { onConflict: 'user_id,endpoint' });

            if (error) {
                console.error('[PushSubscription] Error saving subscription:', error.message);
                return false;
            }

            setPushState('granted');
            return true;
        } catch (err: any) {
            console.error('[PushSubscription] Error:', err);
            if (Notification.permission === 'denied') {
                setPushState('denied');
            }
            return false;
        } finally {
            setSubscribing(false);
        }
    }, [user?.id, pushState]);

    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!user?.id) return false;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Remove from Supabase
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('endpoint', subscription.endpoint);

                // Unsubscribe from browser
                await subscription.unsubscribe();
            }

            setPushState('prompt');
            return true;
        } catch (err) {
            console.error('[PushSubscription] Error unsubscribing:', err);
            return false;
        }
    }, [user?.id]);

    return {
        pushState,
        subscribing,
        subscribe,
        unsubscribe,
        isSupported: pushState !== 'unsupported',
    };
}
