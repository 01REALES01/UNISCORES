"use client";

import { useEffect, useRef } from "react";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase";

// Only revalidate if user was away for 2+ seconds — prevents reload on quick glitches
const MIN_HIDDEN_MS = 1_000;

/**
 * Revalidates all SWR data when the user returns after being away for 15+ seconds.
 * Awaits auth session refresh first so fetchers never run with an expired token.
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

            // Refresh auth session first — ensures fetchers run with a valid token
            await supabase.auth.getSession().catch(() => {});

            // Revalidate all SWR data — sin borrar caché (evita spinner infinito en móvil)
            mutate(() => true);

            // Notify non-SWR components (direct Supabase fetchers) to also refresh
            window.dispatchEvent(new CustomEvent('app:revalidate'));
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    return null;
}
