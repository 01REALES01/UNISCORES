"use client";

import { cn } from "@/lib/utils";
import { Instagram, GraduationCap, Clock, ExternalLink, ChevronRight } from "lucide-react";
import { InstagramEmbed } from "@/modules/news/components/instagram-embed";
import Link from "next/link";
import type { Noticia } from "@/modules/news/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function NewsReactionSummary({ reactions, className }: { reactions?: { emoji: string }[], className?: string }) {
    if (!reactions || reactions.length === 0) return null;
    const counts: Record<string, number> = {};
    reactions.forEach(r => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topEmojis = sorted.slice(0, 3).map(s => s[0]);
    const total = reactions.length;
    return (
        <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-lg", className)}>
            {topEmojis.map((emoji, i) => <span key={i} className="text-[14px] leading-none">{emoji}</span>)}
            {topEmojis.length > 0 && <div className="w-[1px] h-3 bg-white/15 mx-0.5" />}
            <span className="text-[11px] font-black text-emerald-400 tabular-nums leading-none tracking-tight">{total}</span>
        </div>
    );
}

// ─── Compact Card (for home page previews) ──────────────────────────────────

/**
 * A compact Instagram preview card for the home page.
 * Doesn't load the full embed — just a premium styled link card.
 */
export function InstagramCompactCard({ noticia }: { noticia: Noticia }) {
    if (!noticia.instagram_url) return null;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block">
            <div className="relative overflow-hidden rounded-[2rem] border border-pink-500/15 bg-gradient-to-br from-pink-500/5 via-purple-900/10 to-orange-500/5 hover:border-pink-500/30 transition-all duration-500 shadow-lg hover:shadow-pink-500/10">
                {/* Gradient top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400" />

                <div className="p-5 flex items-center gap-4">
                    {/* IG Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <Instagram size={22} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-pink-400 uppercase tracking-[0.15em]">Post de Instagram</span>
                            {noticia.carrera && (
                                <>
                                    <span className="text-white/15 text-[8px]">•</span>
                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider truncate">{noticia.carrera}</span>
                                </>
                            )}
                        </div>
                        <p className="text-sm font-bold text-white/60 group-hover:text-white/80 transition-colors truncate">
                            Ver publicación en el feed
                        </p>
                    </div>

                    {/* Arrow + time */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <ChevronRight size={16} className="text-pink-400/40 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                        <span className="text-[8px] font-bold text-white/20">{getRelativeTime(noticia.created_at)}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Full Feed Card (for /noticias and carrera pages) ───────────────────────

/**
 * Renders an Instagram post directly in the news feed.
 * Shows the full embed with a reactions link at the bottom.
 */
export function InstagramFeedCard({ noticia }: { noticia: Noticia }) {
    if (!noticia.instagram_url) return null;

    return (
        <div className="relative group">
            {/* Subtle ambient glow */}
            <div className="absolute -inset-2 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-orange-400/5 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative bg-black/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-white/10 transition-all duration-500">
                {/* Top bar: meta info */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/20">
                            <Instagram size={14} className="text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-pink-400 uppercase tracking-[0.15em]">Instagram</span>
                            {noticia.carrera && (
                                <>
                                    <span className="text-white/15 text-[10px]">•</span>
                                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-white/30 uppercase tracking-wider">
                                        <GraduationCap size={10} className="text-violet-400" /> {noticia.carrera}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <NewsReactionSummary reactions={noticia.news_reactions} />
                        <span className="text-[9px] font-bold text-white/20 flex items-center gap-1">
                            <Clock size={10} /> {getRelativeTime(noticia.created_at)}
                        </span>
                    </div>
                </div>

                {/* Embed */}
                <InstagramEmbed url={noticia.instagram_url} variant="inline" />

                {/* Bottom: reactions link */}
                <Link
                    href={`/noticias/${noticia.id}`}
                    className="flex items-center justify-between px-6 py-4 border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                    <span className="text-[10px] font-black text-white/25 uppercase tracking-widest">
                        Toca para reaccionar 💬
                    </span>
                    <span className="text-[10px] font-black text-pink-400/60 uppercase tracking-widest hover:text-pink-400 transition-colors">
                        Ver más →
                    </span>
                </Link>
            </div>
        </div>
    );
}
