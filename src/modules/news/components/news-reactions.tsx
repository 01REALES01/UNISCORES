"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { m, AnimatePresence } from "framer-motion";

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
    const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string }[]>([]);
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

        const floatId = Date.now() + Math.random();
        setFloatingEmojis(prev => [...prev, { id: floatId, emoji }]);
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(f => f.id !== floatId));
        }, 1000);

        const previousReaction = userReaction;

        if (previousReaction === emoji) {
            // Remove
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
                console.error("Delete reaction error:", error);
                setUserReaction(previousReaction);
                setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
                toast.error(`Error al quitar reacción: ${error.message || 'Error desconocido'}`);
            }
        } else {
            // Upsert (New or Switch)
            setUserReaction(emoji);
            setCounts((prev) => {
                const next = { ...prev };
                if (previousReaction) {
                    next[previousReaction] = Math.max(0, (prev[previousReaction] || 0) - 1);
                    if (next[previousReaction] === 0) delete next[previousReaction];
                }
                next[emoji] = (prev[emoji] || 0) + 1;
                return next;
            });

            const { error } = await supabase
                .from("news_reactions")
                .upsert(
                    { noticia_id: noticiaId, user_id: user.id, emoji },
                    { onConflict: 'noticia_id,user_id' }
                );

            if (error) {
                console.error("Upsert reaction error:", error);
                setUserReaction(previousReaction);
                setCounts((prev) => {
                    const next = { ...prev };
                    if (previousReaction) {
                        next[previousReaction] = (prev[previousReaction] || 0) + 1;
                    }
                    next[emoji] = Math.max(0, (next[emoji] || 0) - 1);
                    if (next[emoji] === 0) delete next[emoji];
                    return next;
                });
                toast.error(`Error al reaccionar: ${error.message || 'Error desconocido'}`);
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
        <div className="mt-20 pt-12 border-t border-white/5">
            <div className="flex flex-col items-center gap-8">
                <div className="text-center space-y-2">
                    <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-white/30 drop-shadow-sm">
                        ¿Qué te pareció esta noticia?
                    </h4>
                    {totalReactions > 0 && (
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10 inline-block">
                            {totalReactions} {totalReactions === 1 ? "interacción" : "interacciones"}
                        </p>
                    )}
                </div>

                <div className="relative w-full max-w-full overflow-x-auto scrollbar-hide py-4 px-4 sm:px-6">
                    <div className="flex items-stretch justify-start sm:justify-center gap-2 sm:gap-4 min-w-max mx-auto p-2 sm:p-3 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:bg-white/[0.05] hover:border-white/20 relative">
                        {/* Inner Glow Overlay */}
                        <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

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
                                    "relative flex flex-col items-center gap-1 min-w-[50px] sm:min-w-[65px] py-4 rounded-2xl transition-all duration-500 group/reaction h-full",
                                    isActive 
                                        ? "bg-white shadow-[0_10px_40px_rgba(255,255,255,0.25)] scale-[1.05] z-10" 
                                        : "hover:bg-white/5 active:scale-95"
                                )}
                            >
                                <span className={cn(
                                    "text-2xl sm:text-3xl transition-all duration-500",
                                    isAnimating ? "scale-150 rotate-12" : "group-hover/reaction:scale-125 group-hover/reaction:-rotate-6",
                                    isActive ? "filter-none" : "grayscale opacity-60 group-hover/reaction:grayscale-0 group-hover/reaction:opacity-100"
                                )}>
                                    {emoji}
                                </span>
                                
                                {count > 0 && (
                                    <span className={cn(
                                        "text-[10px] sm:text-xs font-black tabular-nums transition-colors",
                                        isActive ? "text-violet-900" : "text-white/30 group-hover/reaction:text-white/60"
                                    )}>
                                        {count}
                                    </span>
                                )}

                                {/* Glow ring when active */}
                                {isActive && (
                                    <div className="absolute inset-0 border-2 border-white/20 rounded-2xl animate-pulse" />
                                )}

                                {/* Floating Facebook-style Animation */}
                                <AnimatePresence>
                                    {floatingEmojis.filter(f => f.emoji === emoji).map((f) => (
                                        <m.div
                                            key={f.id}
                                            initial={{ opacity: 1, y: 0, scale: 0.5 }}
                                            animate={{ 
                                                opacity: [1, 1, 0], 
                                                y: -80 - Math.random() * 40,
                                                x: (Math.random() - 0.5) * 40,
                                                scale: [0.5, 1.8, 1.2]
                                            }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="absolute top-2 pointer-events-none z-50 text-4xl drop-shadow-xl"
                                        >
                                            {f.emoji}
                                        </m.div>
                                    ))}
                                </AnimatePresence>
                            </button>
                        );
                    })}

                    <div className="w-[1px] h-10 bg-white/10 mx-1" />

                    {/* "+" Picker Button */}
                    <div className="relative" ref={pickerRef}>
                        <button
                            onClick={() => setPickerOpen(!pickerOpen)}
                            disabled={loading}
                            className={cn(
                                "flex flex-col items-center justify-center w-12 h-16 sm:w-16 rounded-2xl transition-all duration-500 group/plus",
                                pickerOpen 
                                    ? "bg-violet-600 text-white shadow-[0_10px_30px_rgba(124,58,237,0.4)]" 
                                    : "hover:bg-white/5 text-white/20 hover:text-white/60"
                            )}
                        >
                            <Plus 
                                size={22} 
                                className={cn(
                                    "transition-transform duration-500",
                                    pickerOpen ? "rotate-45" : "group-hover/plus:rotate-90"
                                )}
                            />
                        </button>

                        {pickerOpen && (
                            <div className="absolute bottom-full mb-6 right-1/2 translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
                                <div className="shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden border border-white/10 ring-1 ring-black backdrop-blur-2xl">
                                    <Picker
                                        data={emojiData ?? getEmojiData}
                                        onEmojiSelect={(emoji: any) => toggleReaction(emoji.native)}
                                        theme="dark"
                                        locale="es"
                                        previewPosition="none"
                                        skinTonePosition="none"
                                        maxFrequentRows={1}
                                        perLine={8}
                                        emojiSize={26}
                                        emojiButtonSize={34}
                                        icons="outline"
                                        set="native"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
