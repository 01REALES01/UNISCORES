"use client";

import { useEffect, useRef } from "react";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase";

const MIN_HIDDEN_MS = 3_000; // only revalidate if hidden for 3+ seconds

/**
 * Listens for the page becoming visible after being hidden (mobile app switching).
 * When the user comes back after being away for 3+ seconds:
 *  1. Refreshes the Supabase auth session (token refresh if expired)
 *  2. Revalidates the SWR key for the current page only (not all keys at once)
 */
export function VisibilityRevalidate() {
    const hiddenAtRef = useRef<number>(0);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                hiddenAtRef.current = Date.now();
                return;
            }

            // Only act if we were actually hidden for a meaningful period
            if (!hiddenAtRef.current) return;
            const elapsed = Date.now() - hiddenAtRef.current;
            hiddenAtRef.current = 0;
            if (elapsed < MIN_HIDDEN_MS) return;

            // 1. Refresh auth session — fire-and-forget, don't block the UI
            supabase.auth.getSession().catch(() => {});

            // 2. Revalidate current page's SWR data after a short delay
            //    so the auth refresh can land first
            setTimeout(() => {
                mutate(() => true, undefined, { revalidate: true });
            }, 500);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    return null;
}
