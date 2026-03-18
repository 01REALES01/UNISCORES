"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";

// Carga emoji-mart SOLO cuando el picker se abre — evita 424KB en el bundle inicial
const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });
const getEmojiData = () => import("@emoji-mart/data").then((m) => m.default);

// ─── Default visible reactions ───────────────────────────────────────────────
const DEFAULT_EMOJIS = ["🔥", "👏", "💪", "😮", "❤️", "🏆"];

interface NewsReactionsProps {
    noticiaId: string;
}

export function NewsReactions({ noticiaId }: NewsReactionsProps) {
    const { user } = useAuth();
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [animating, setAnimating] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [emojiData, setEmojiData] = useState<unknown>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close picker on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const fetchReactions = useCallback(async () => {
        const { data: allReactions } = await supabase
            .from("news_reactions")
            .select("emoji, user_id")
            .eq("noticia_id", noticiaId);

        if (allReactions) {
            const newCounts: Record<string, number> = {};
            let myReaction: string | null = null;

            for (const r of allReactions) {
                newCounts[r.emoji] = (newCounts[r.emoji] || 0) + 1;
                if (user && r.user_id === user.id) {
                    myReaction = r.emoji;
                }
            }

            setCounts(newCounts);
            setUserReaction(myReaction);
        }
        setLoading(false);
    }, [noticiaId, user]);

    useEffect(() => {
        fetchReactions();
    }, [fetchReactions]);

    const toggleReaction = async (emoji: string) => {
        if (!user) {
            toast.error("Inicia sesión para reaccionar", {
                action: {
                    label: "Ir a Login",
                    onClick: () => (window.location.href = "/login"),
                },
            });
            return;
        }

        setPickerOpen(false);
        setAnimating(emoji);
        setTimeout(() => setAnimating(null), 400);

        const previousReaction = userReaction;

        if (previousReaction === emoji) {
            // Same → remove
            setUserReaction(null);
            setCounts((prev) => {
                const next = { ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) };
                if (next[emoji] === 0) delete next[emoji];
                return next;
            });

            const { error } = await supabase
                .from("news_reactions")
                .delete()
                .eq("noticia_id", noticiaId)
                .eq("user_id", user.id);

            if (error) {
                setUserReaction(previousReaction);
                setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
                toast.error("Error al quitar reacción");
            }
        } else if (previousReaction) {
            // Switch
            setUserReaction(emoji);
            setCounts((prev) => {
                const next = {
                    ...prev,
                    [previousReaction]: Math.max(0, (prev[previousReaction] || 0) - 1),
                    [emoji]: (prev[emoji] || 0) + 1,
                };
                if (next[previousReaction] === 0) delete next[previousReaction];
                return next;
            });

            const { error } = await supabase
                .from("news_reactions")
                .update({ emoji })
                .eq("noticia_id", noticiaId)
                .eq("user_id", user.id);

            if (error) {
                setUserReaction(previousReaction);
                setCounts((prev) => ({
                    ...prev,
                    [previousReaction]: (prev[previousReaction] || 0) + 1,
                    [emoji]: Math.max(0, (prev[emoji] || 0) - 1),
                }));
                toast.error("Error al cambiar reacción");
            }
        } else {
            // New
            setUserReaction(emoji);
            setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));

            const { error } = await supabase
                .from("news_reactions")
                .insert({ noticia_id: noticiaId, user_id: user.id, emoji });

            if (error) {
                setUserReaction(null);
                setCounts((prev) => {
                    const next = { ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) };
                    if (next[emoji] === 0) delete next[emoji];
                    return next;
                });
                toast.error("Error al reaccionar");
            }
        }
    };

    const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

    // Build visible pills: defaults + any extra emojis that have counts
    const extraWithCounts = Object.keys(counts).filter(
        (e) => !DEFAULT_EMOJIS.includes(e) && counts[e] > 0
    );
    const visibleEmojis = [...DEFAULT_EMOJIS, ...extraWithCounts];

    // Sort by count descending
    const sortedEmojis = [...visibleEmojis].sort(
        (a, b) => (counts[b] || 0) - (counts[a] || 0)
    );

    return (
        <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-4">
                ¿Qué te pareció?
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {sortedEmojis.map((emoji) => {
                    const isActive = userReaction === emoji;
                    const count = counts[emoji] || 0;
                    const isAnimating = animating === emoji;

                    return (
                        <button
                            key={emoji}
                            onClick={() => toggleReaction(emoji)}
                            disabled={loading}
                            className={cn(
                                "relative flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-bold transition-all duration-300 select-none",
                                "hover:scale-105 active:scale-95",
                                isActive
                                    ? "bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.08)] ring-1 ring-white/10"
                                    : "bg-white/[0.03] border-white/5 text-white/50 hover:bg-white/[0.07] hover:border-white/10",
                                loading && "opacity-50 pointer-events-none"
                            )}
                        >
                            <span
                                className={cn(
                                    "text-lg transition-transform duration-300",
                                    isAnimating && "animate-bounce"
                                )}
                            >
                                {emoji}
                            </span>
                            {count > 0 && (
                                <span
                                    className={cn(
                                        "tabular-nums text-xs font-black transition-colors",
                                        isActive ? "text-white" : "text-white/40"
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* "+" Picker Button */}
                <div className="relative" ref={pickerRef}>
                    <button
                        onClick={() => setPickerOpen(!pickerOpen)}
                        disabled={loading}
                        className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 select-none",
                            "hover:scale-105 active:scale-95",
                            pickerOpen
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/[0.07] hover:text-white/60",
                            loading && "opacity-50 pointer-events-none"
                        )}
                        title="Más emojis"
                    >
                        <Plus
                            size={16}
                            className={cn(
                                "transition-transform duration-300",
                                pickerOpen && "rotate-45"
                            )}
                        />
                    </button>

                    {/* emoji-mart Full Picker — carga lazy cuando se abre */}
                    {pickerOpen && (
                        <div className="absolute bottom-full mb-2 right-0 z-50">
                            <Picker
                                data={emojiData ?? getEmojiData}
                                onEmojiSelect={(emoji: any) => toggleReaction(emoji.native)}
                                theme="dark"
                                locale="es"
                                previewPosition="none"
                                skinTonePosition="none"
                                maxFrequentRows={1}
                                perLine={8}
                                emojiSize={28}
                                emojiButtonSize={36}
                                icons="outline"
                                set="native"
                            />
                        </div>
                    )}
                </div>
            </div>

            {totalReactions > 0 && (
                <p className="text-[11px] text-white/20 font-bold mt-3">
                    {totalReactions}{" "}
                    {totalReactions === 1 ? "reacción" : "reacciones"}
                </p>
            )}
        </div>
    );
}
