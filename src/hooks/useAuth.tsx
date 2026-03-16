"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type UserRole = 'admin' | 'data_entry' | 'periodista' | 'deportista' | 'public';

export type Profile = {
    id: string;
    email: string;
    roles: UserRole[];
    full_name: string;
    avatar_url?: string;
    tagline?: string;
    about_me?: string;
    bio?: string;
    points: number;
    wins?: number;
    losses?: number;
    total_score_all_time?: number;
    carrera_id?: number;
    carreras_ids?: number[];
    athlete_disciplina_id?: number;
    athlete_stats?: any;
    disciplina?: {
        id: number;
        name: string;
        icon?: string;
    };
    is_public: boolean;
    created_at: string;
};

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

// ── Constants ────────────────────────────────────────────────────────────────
const PROFILE_RETRY_ATTEMPTS = 3;
const PROFILE_RETRY_DELAY_MS = 800;
const SAFETY_TIMEOUT_MS = 10_000; // 10s — generous for slow networks / cold starts

/**
 * Fetch profile with retry logic.
 * On OAuth first-login, the callback creates the profile row server-side,
 * but there can be a brief replication delay. Retrying handles this gracefully.
 */
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

            if (data && !error) {
                return data as Profile;
            }

            // If profile not found (PGRST116 = single row not found), retry after delay
            if (error?.code === 'PGRST116' && i < attempts - 1) {
                console.log(`[useAuth] Profile not found yet (attempt ${i + 1}/${attempts}), retrying in ${PROFILE_RETRY_DELAY_MS}ms...`);
                await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY_MS));
                continue;
            }

            if (error) {
                console.warn(`[useAuth] Profile fetch error (attempt ${i + 1}):`, error.message);
            }
        } catch (err: any) {
            // Ignore AbortError — happens during navigation
            if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                console.log('[useAuth] Profile fetch aborted (navigation in progress)');
                return null;
            }
            console.error(`[useAuth] Profile fetch crash (attempt ${i + 1}):`, err?.message);

            if (i < attempts - 1) {
                await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY_MS));
            }
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

    /**
     * Fetch and set profile, with retry and deduplication.
     * Returns the profile if found, null otherwise.
     */
    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        // Deduplicate concurrent profile fetches
        if (profileFetchInFlightRef.current) {
            return null;
        }

        profileFetchInFlightRef.current = true;
        if (mountedRef.current) setProfileLoading(true);

        try {
            const result = await fetchProfileWithRetry(userId);

            if (!mountedRef.current) return null;

            if (result) {
                setProfile(result);
                return result;
            } else {
                console.warn('[useAuth] Profile not found after all retries for user:', userId);
                setProfile(null);
                return null;
            }
        } finally {
            profileFetchInFlightRef.current = false;
            if (mountedRef.current) setProfileLoading(false);
        }
    }, []); // No dependencies — stable identity, no re-render loops

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        mountedRef.current = true;

        // Safety timeout — never stay on loading screen forever
        // Generous to accommodate slow networks and Supabase cold starts
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

                if (currentUser) {
                    console.log('[useAuth] User session identified:', currentUser.id);
                    // CRITICAL: Wait for profile before setting loading=false
                    // This prevents the brief "no profile" flash that causes
                    // "Acceso Restringido" on admin pages
                    const p = await fetchProfile(currentUser.id);
                    console.log('[useAuth] Profile post-fetch status:', p ? 'FOUND' : 'MISSING');
                } else {
                    console.log('[useAuth] No active session found');
                }
            } catch (err: any) {
                if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                    return;
                }
                console.error('[useAuth] Error getting session:', err);
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mountedRef.current) return;

                console.log('[useAuth] Auth state change:', event);

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                    console.log(`[useAuth] Auth Event: ${event} for user: ${currentUser.id}`);
                    // Fetch profile WITH retry — covers the OAuth callback race
                    // where profile was just created server-side
                    const p = await fetchProfile(currentUser.id);
                    console.log('[useAuth] Profile refresh status:', p ? 'SUCCESS' : 'FAILED');
                } else if (!currentUser) {
                    console.log('[useAuth] user signed out / no user');
                    setProfile(null);
                }

                // For auth state changes AFTER initial load, ensure loading is false
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        );

        return () => {
            mountedRef.current = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                console.error('[useAuth] Sign out error:', err);
            }
        }
        setUser(null);
        setProfile(null);
    };

    const roles = profile?.roles || ['public'];
    const isAdmin = roles.includes('admin');
    const isDataEntry = roles.includes('data_entry');
    const isPeriodista = roles.includes('periodista');
    const isDeportista = roles.includes('deportista');
    const isStaff = isAdmin || isDataEntry || isPeriodista;

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            profileLoading,
            isAdmin,
            isDataEntry,
            isPeriodista,
            isDeportista,
            isStaff,
            signOut,
            refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
