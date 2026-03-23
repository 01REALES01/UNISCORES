"use client";

import { useEffect, useRef } from "react";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase";

const MIN_HIDDEN_MS = 1_000; // revalidate if hidden for 1+ seconds

/**
 * Listens for the page becoming visible after being hidden (tab switch / mobile app switching).
 * Ensures the Supabase auth session is fresh BEFORE SWR fetchers run.
 * SWRConfig handles the actual data revalidation via revalidateOnFocus.
 */
export function VisibilityRevalidate() {
    const hiddenAtRef = useRef<number>(0);

    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.hidden) {
                hiddenAtRef.current = Date.now();
                return;
            }

            if (!hiddenAtRef.current) return;
            const elapsed = Date.now() - hiddenAtRef.current;
            hiddenAtRef.current = 0;
            if (elapsed < MIN_HIDDEN_MS) return;

            // Await auth session refresh first — prevents fetchers from running
            // with an expired token after long backgrounds (mobile).
            await supabase.auth.getSession().catch(() => {});

            // Trigger a full revalidation as a safety net (SWRConfig's revalidateOnFocus
            // may have already fired before auth completed).
            mutate(() => true, undefined, { revalidate: true });
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    return null;
}
