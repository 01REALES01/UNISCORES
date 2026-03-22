"use client";

import { useEffect } from "react";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase";

/**
 * Listens for the page becoming visible after being hidden (mobile app switching).
 * When the user comes back to the app:
 *  1. Refreshes the Supabase auth session (triggers TOKEN_REFRESHED if expired)
 *  2. Revalidates all SWR cached data so pages don't show stale content
 */
export function VisibilityRevalidate() {
    useEffect(() => {
        let wasHidden = false;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                wasHidden = true;
                return;
            }

            if (!wasHidden) return;
            wasHidden = false;

            // 1. Refresh auth session — if token expired, Supabase fires TOKEN_REFRESHED
            //    which useAuth already handles to re-load the profile
            await supabase.auth.getSession();

            // 2. Revalidate all SWR keys so pages re-fetch their data
            mutate(() => true);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    return null;
}
