"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowCareerButtonProps {
    careerId: number;
    initialFollowersCount: number;
}

export function FollowCareerButton({ careerId, initialFollowersCount }: FollowCareerButtonProps) {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(initialFollowersCount);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const checkFollowStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('career_followers')
                    .select('follower_id')
                    .eq('follower_id', user.id)
                    .eq('career_id', careerId)
                    .single();
                
                if (data) setIsFollowing(true);
            } catch (err) {
                // Not following or error
            } finally {
                setIsLoading(false);
            }
        };

        checkFollowStatus();
    }, [careerId, user]);

    const handleFollowToggle = async () => {
        if (!user) {
            alert("Debes iniciar sesión para apoyar una carrera.");
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
                    .from('career_followers')
                    .delete()
                    .match({ follower_id: user.id, career_id: careerId });
                
                if (error) throw error;
            } else {
                // Follow
                const { error } = await supabase
                    .from('career_followers')
                    .insert({ follower_id: user.id, career_id: careerId });
                
                if (error) throw error;
            }
        } catch (error) {
            console.error("Error toggling career follow:", error);
            // Revert optimistic update
            setIsFollowing(previouslyFollowing);
            setFollowersCount(initialFollowersCount);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 h-full">
            <div className="flex items-center gap-3 px-6 h-full rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400">
                    <Heart size={18} className={cn(isFollowing ? "fill-current" : "")} />
                </div>
                <div className="flex flex-col min-w-[60px] text-left">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Seguidores</span>
                    <span className="text-xl font-black text-white leading-none tabular-nums clamp">{followersCount}</span>
                </div>
            </div>

            <button
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={cn(
                    "relative flex flex-col items-center justify-center rounded-2xl border transition-all h-[56px] min-w-[90px] overflow-hidden group",
                    isFollowing 
                        ? "bg-white border-white text-violet-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-slate-100" 
                        : "bg-gradient-to-b from-violet-500 to-indigo-600 border-violet-400 text-white shadow-[0_10px_30px_-5px_rgba(124,58,237,0.6)] hover:shadow-[0_10px_40px_-5px_rgba(124,58,237,0.8)] hover:scale-[1.02]"
                )}
            >
                {/* Metallic shine effect for inactive state */}
                {!isFollowing && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}

                {isLoading ? (
                    <Loader2 size={18} className="animate-spin opacity-50 relative z-10" />
                ) : isFollowing ? (
                    <div className="flex items-center gap-2 px-4">
                        <Heart size={14} className="fill-current" />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Apoyando</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-4">
                        <Heart size={14} />
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">Apoyar</span>
                    </div>
                )}
            </button>
        </div>
    );
}
