"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type UserRole = 'admin' | 'data_entry' | 'public';

export type Profile = {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    avatar_url?: string;
    created_at: string;
};

type AuthContextType = {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    isDataEntry: boolean;
    isStaff: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isDataEntry: false,
    isStaff: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!mountedRef.current) return null;

            if (data && !error) {
                const profileData = data as Profile;
                setProfile(profileData);
                return profileData;
            } else {
                console.warn('Profile not found for user:', userId, error?.message);
                setProfile(null);
                return null;
            }
        } catch (err: any) {
            // Ignore AbortError — happens during navigation
            if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                console.log('Profile fetch aborted (navigation in progress)');
                return null;
            }
            console.error('Error fetching profile:', err);
            if (mountedRef.current) {
                setProfile(null);
            }
            return null;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        mountedRef.current = true;

        // Safety timeout — never stay on loading screen forever
        const safetyTimer = setTimeout(() => {
            if (mountedRef.current) {
                setLoading(false);
            }
        }, 2000);

        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!mountedRef.current) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // Set loading false IMMEDIATELY after getting session
                // Profile loads in background — pages don't need to wait for it
                if (mountedRef.current) setLoading(false);

                if (currentUser) {
                    // Fire and forget — profile arrives async
                    fetchProfile(currentUser.id);
                }
            } catch (err: any) {
                if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
                    return;
                }
                console.error('Error getting session:', err);
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

                console.log('Auth state change:', event);

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
                    await fetchProfile(currentUser.id);
                    if (mountedRef.current) {
                        setLoading(false);
                    }
                } else if (!currentUser) {
                    setProfile(null);
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
                console.error('Sign out error:', err);
            }
        }
        setUser(null);
        setProfile(null);
    };

    const isAdmin = profile?.role === 'admin';
    const isDataEntry = profile?.role === 'data_entry';
    const isStaff = isAdmin || isDataEntry;

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            isAdmin,
            isDataEntry,
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
