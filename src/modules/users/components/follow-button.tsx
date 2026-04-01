"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Star, UserPlus, UserMinus, Loader2, Users } from "lucide-react";
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
            setFollowersCount(followersCount);
        } finally {
            setIsLoading(false);
        }
    };

    // If it's my own profile
    if (user?.id === targetId) {
        return (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400 shadow-inner">
                    <Users size={16} />
                </div>
                <div className="leading-tight">
                    <p className="text-[16px] font-black font-mono tabular-nums text-white">{followersCount}</p>
                    <p className="text-[8px] font-display font-black text-white/30 uppercase tracking-[0.15em]">Seguidores</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group/follow">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl group-hover/follow:border-violet-500/30 transition-all duration-500">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400 shadow-inner group-hover/follow:scale-110 transition-transform">
                    <Users size={16} />
                </div>
                <div className="leading-tight min-w-[50px]">
                    <p className="text-[16px] font-black font-mono tabular-nums text-white group-hover/follow:text-violet-400 transition-colors">{followersCount}</p>
                    <p className="text-[8px] font-display font-black text-white/30 uppercase tracking-[0.15em]">Fans</p>
                </div>
            </div>

            <button
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={cn(
                    "flex flex-col items-center justify-center px-6 rounded-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all h-[60px] min-w-[100px] font-display font-black uppercase tracking-[0.1em]",
                    isFollowing 
                        ? "bg-black/60 border-white/10 hover:bg-black/80 hover:border-violet-500/40 text-white/40 hover:text-violet-400" 
                        : "bg-violet-600 hover:bg-violet-500 border-violet-500 text-white shadow-[0_4px_25px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95"
                )}
            >
                {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-white/20" />
                ) : isFollowing ? (
                    <>
                        <UserMinus size={16} className="mb-0.5" />
                        <span className="text-[9px]">SIGUIENDO</span>
                    </>
                ) : (
                    <>
                        <UserPlus size={16} className="mb-0.5" />
                        <span className="text-[9px]">SEGUIR</span>
                    </>
                )}
            </button>
        </div>
    );
}
