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
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 px-6 py-3 rounded-[1.5rem] bg-background border border-white/5 shadow-2xl">
                <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                    <Heart size={20} className={cn(isFollowing ? "fill-current" : "")} />
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
                    "flex flex-col items-center justify-center p-4 rounded-[1.5rem] border shadow-2xl transition-all h-[68px] min-w-[90px]",
                    isFollowing 
                        ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20" 
                        : "bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                )}
            >
                {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-white/40" />
                ) : isFollowing ? (
                    <>
                        <Heart size={18} className="mb-1 fill-current" />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">Apoyando</span>
                    </>
                ) : (
                    <>
                        <Heart size={18} className="mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">Apoyar</span>
                    </>
                )}
            </button>
        </div>
    );
}
