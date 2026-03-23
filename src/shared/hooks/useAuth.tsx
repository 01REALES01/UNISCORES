"use client";

// ─── Canonical location for useAuth ──────────────────────────────────────────
// Old path: src/hooks/useAuth.tsx  →  NOW: src/shared/hooks/useAuth.tsx
// The old file re-exports from here for backwards compatibility.

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

import type { UserRole, Profile } from '@/modules/users/types';
export type { UserRole, Profile };

type AuthContextType = {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    profileLoading: boolean;
    isAdmin: boolean;
    isDataEntry: boolean;
    isPeriodista: boolean;
    isDeportista: boolean;
    isStaff: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    profileLoading: false,
    isAdmin: false,
    isDataEntry: false,
    isPeriodista: false,
    isDeportista: false,
    isStaff: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

const PROFILE_RETRY_ATTEMPTS = 3;
const PROFILE_RETRY_DELAY_MS = 800;
const SAFETY_TIMEOUT_MS = 10_000;

async function fetchProfileWithRetry(
    userId: string,
    attempts: number = PROFILE_RETRY_ATTEMPTS
): Promise<Profile | null> {
    for (let i = 0; i < attempts; i++) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, disciplina:disciplinas(id, name, icon)')
                .eq('id', userId)
                .single();

            if (data && !error) return data as Profile;

            if (error?.code === 'PGRST116' && i < attempts - 1) {
                await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY_MS));
                continue;
            }
            if (error) console.warn(`[useAuth] Profile fetch error (attempt ${i + 1}):`, error.message);
        } catch (err: unknown) {
            const e = err as { name?: string; message?: string };
            if (e?.name === 'AbortError' || e?.message?.includes('abort')) return null;
            console.error(`[useAuth] Profile fetch crash (attempt ${i + 1}):`, e?.message);
            if (i < attempts - 1) await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY_MS));
        }
    }
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const mountedRef = useRef(true);
    const profileFetchInFlightRef = useRef(false);

    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        if (profileFetchInFlightRef.current) return null;
        profileFetchInFlightRef.current = true;
        if (mountedRef.current) setProfileLoading(true);

        try {
            const result = await fetchProfileWithRetry(userId);
            if (!mountedRef.current) return null;
            setProfile(result);
            if (!result) console.warn('[useAuth] Profile not found after all retries for user:', userId);
            return result;
        } finally {
            profileFetchInFlightRef.current = false;
            if (mountedRef.current) setProfileLoading(false);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) await fetchProfile(user.id);
    }, [user, fetchProfile]);

    useEffect(() => {
        mountedRef.current = true;

        const safetyTimer = setTimeout(() => {
            if (mountedRef.current && loading) {
                console.warn('[useAuth] Safety timeout reached — forcing loading=false');
                setLoading(false);
                setProfileLoading(false);
            }
        }, SAFETY_TIMEOUT_MS);

        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mountedRef.current) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) await fetchProfile(currentUser.id);
            } catch (err: unknown) {
                const e = err as { name?: string; message?: string };
                if (e?.name === 'AbortError' || e?.message?.includes('abort')) return;
                console.error('[useAuth] Error getting session:', err);
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mountedRef.current) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser && event === 'SIGNED_IN') {
                await fetchProfile(currentUser.id);
            } else if (!currentUser) {
                setProfile(null);
            }

            if (mountedRef.current) setLoading(false);
        });

        return () => {
            mountedRef.current = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err: unknown) {
            const e = err as { name?: string };
            if (e?.name !== 'AbortError') console.error('[useAuth] Sign out error:', err);
        }
        setUser(null);
        setProfile(null);
    };

    const roles = profile?.roles || ['public'];

    return (
        <AuthContext.Provider value={{
            user, profile, loading, profileLoading,
            isAdmin: roles.includes('admin'),
            isDataEntry: roles.includes('data_entry'),
            isPeriodista: roles.includes('periodista'),
            isDeportista: roles.includes('deportista'),
            isStaff: roles.includes('admin') || roles.includes('data_entry') || roles.includes('periodista'),
            signOut,
            refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
