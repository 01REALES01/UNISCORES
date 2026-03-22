"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
    targetId: string;
    initialFollowersCount: number;
}

export function FollowButton({ targetId, initialFollowersCount }: FollowButtonProps) {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(initialFollowersCount);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.id === targetId) {
            setIsLoading(false);
            return;
        }

        const checkFollowStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_followers')
                    .select('follower_id')
                    .eq('follower_id', user.id)
                    .eq('following_profile_id', targetId)
                    .single();
                
                if (data) setIsFollowing(true);
            } catch (err) {
                // Not following or error
            } finally {
                setIsLoading(false);
            }
        };

        checkFollowStatus();
    }, [targetId, user]);

    const handleFollowToggle = async () => {
        if (!user) {
            alert("Debes iniciar sesión para seguir a un usuario.");
            return;
        }

        setIsLoading(true);
        // Optimistic update
        const previouslyFollowing = isFollowing;
        setIsFollowing(!previouslyFollowing);
        setFollowersCount(c => previouslyFollowing ? c - 1 : c + 1);

        try {
            if (previouslyFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('user_followers')
                    .delete()
                    .match({ follower_id: user.id, following_profile_id: targetId });
                
                if (error) throw error;
            } else {
                // Follow
                const { error } = await supabase
                    .from('user_followers')
                    .insert({ follower_id: user.id, following_profile_id: targetId });
                
                if (error) throw error;
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
            // Revert optimistic update
            setIsFollowing(previouslyFollowing);
            setFollowersCount(initialFollowersCount);
        } finally {
            setIsLoading(false);
        }
    };

    // If it's my own profile
    if (user?.id === targetId) {
        return (
            <div className="flex items-center gap-3 px-6 py-3 rounded-[1.5rem] bg-[#0A0705] border border-white/5 shadow-2xl">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Users size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Seguidores</span>
                    <span className="text-xl font-black text-white leading-none">{followersCount}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 px-6 py-3 rounded-[1.5rem] bg-[#0A0705] border border-white/5 shadow-2xl">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Users size={20} />
                </div>
                <div className="flex flex-col min-w-[60px]">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Seguidores</span>
                    <span className="text-xl font-black text-white leading-none tabular-nums clamp">{followersCount}</span>
                </div>
            </div>

            <button
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-[1.5rem] border shadow-2xl transition-all h-[68px] min-w-[80px]",
                    isFollowing 
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/60 hover:text-white" 
                        : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                )}
            >
                {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-white/40" />
                ) : isFollowing ? (
                    <>
                        <UserMinus size={18} className="mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">Siguiendo</span>
                    </>
                ) : (
                    <>
                        <UserPlus size={18} className="mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">Seguir</span>
                    </>
                )}
            </button>
        </div>
    );
}
