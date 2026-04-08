"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight, Trophy, GraduationCap } from "lucide-react";

import type { Noticia } from '@/modules/news/types';
export type { Noticia };

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    cronica: { label: 'Crónica', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/20' },
    entrevista: { label: 'Entrevista', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20' },
    analisis: { label: 'Análisis', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/20' },
    flash: { label: 'Flash', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/20' },
};

function getReadTime(content: string): string {
    const safeContent = content || '';
    const words = safeContent.split(/\s+/).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min`;
}

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
    reactions.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topEmojis = sorted.slice(0, 3).map(s => s[0]);
    const total = reactions.length;

    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group/sum hover:scale-105 transition-all duration-300",
            className
        )}>
            <div className="flex items-center -space-x-2">
                {topEmojis.map((emoji, i) => (
                    <div 
                        key={i} 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] sm:text-[12px] shadow-sm ring-1 ring-white/10"
                        style={{ zIndex: 10 - i }}
                    >
                        {emoji}
                    </div>
                ))}
            </div>
            <span className="text-[11px] sm:text-[12px] font-black text-emerald-400 tracking-tight tabular-nums drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                {total}
            </span>
        </div>
    );
}

// ─── Hero Card (Featured) ───
export function NewsHeroCard({ noticia }: { noticia: Noticia }) {
    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block">
            <div className="relative h-[450px] sm:h-[520px] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl bg-background">
                {noticia.imagen_url ? (
                    <Image
                        src={noticia.imagen_url}
                        alt={noticia.titulo}
                        fill
                        className="absolute inset-0 object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 to-[#0a0805]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0816] via-[#0a0816]/60 to-transparent opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0816] via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 transform transition-transform duration-500 group-hover:-translate-y-2">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border", cat.bg, cat.color)}>
                            {cat.label}
                        </span>
                        {noticia.carrera && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/50 bg-white/5 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                                <GraduationCap size={12} /> {noticia.carrera}
                            </span>
                        )}
                        <NewsReactionSummary reactions={noticia.news_reactions} className="ml-auto" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4 line-clamp-3 group-hover:text-emerald-400 transition-colors duration-300 drop-shadow-lg">
                        {noticia.titulo}
                    </h2>
                    <p className="text-sm sm:text-base text-white/60 line-clamp-2 mb-6 max-w-3xl font-medium leading-relaxed">
                        {(noticia.contenido || '').substring(0, 200).replace(/\*\*/g, '')}...
                    </p>
                    <div className="flex items-center gap-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock size={12} /> {getRelativeTime(noticia.created_at)}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── List Card (Compact) ───
export function NewsListCard({ noticia }: { noticia: Noticia }) {
    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block">
            <div className="flex gap-4 sm:gap-6 bg-transparent rounded-2xl p-2 sm:p-3 hover:bg-white/[0.04] transition-all duration-300 border border-transparent hover:border-white/5">
                <div className="w-[110px] h-[90px] sm:w-[160px] sm:h-[120px] rounded-2xl overflow-hidden shrink-0 relative bg-white/8 border border-white/5 shadow-lg">
                    {noticia.imagen_url ? (
                        <Image
                            src={noticia.imagen_url}
                            alt={noticia.titulo}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900/30 to-[#17130D] flex items-center justify-center">
                            <Trophy size={24} className="text-white/20" />
                        </div>
                    )}
                    <NewsReactionSummary reactions={noticia.news_reactions} className="absolute top-2 right-2 scale-75 origin-top-right sm:scale-90" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center sm:py-1">
                    <div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                            <span className={cn("text-[9px] sm:text-[10px] font-black tracking-wide", cat.color)}>
                                {cat.label}
                            </span>
                            {noticia.carrera && (
                                <>
                                    <span className="text-white/20 text-[10px]">•</span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-wider truncate max-w-[120px] sm:max-w-[200px]">
                                        {noticia.carrera}
                                    </span>
                                </>
                            )}
                        </div>
                        <h3 className="text-base sm:text-xl font-black text-white/90 leading-tight tracking-tight line-clamp-2 sm:line-clamp-3 group-hover:text-emerald-400 transition-colors">
                            {noticia.titulo}
                        </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-bold text-white/30 mt-3 sm:mt-4 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock size={11} /> {getRelativeTime(noticia.created_at)}</span>
                    </div>
                </div>
                <div className="hidden sm:flex items-center pr-2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                        <ChevronRight size={18} className="text-white/60" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Home Page Layouts ───

/**
 * NewsCompactHero: For when there is only ONE news item.
 * Takes full width, has a large image and a beautiful overlay.
 */
export function NewsCompactHero({ noticia }: { noticia: Noticia }) {
    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block w-full">
            <div className="relative h-[300px] sm:h-[350px] lg:h-[400px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl">
                {noticia.imagen_url ? (
                    <Image
                        src={noticia.imagen_url}
                        alt={noticia.titulo}
                        fill
                        className="absolute inset-0 object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-black/60" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0816] via-[#0a0816]/40 to-transparent opacity-90" />
                <NewsReactionSummary reactions={noticia.news_reactions} className="absolute top-6 right-6 sm:top-10 sm:right-10 scale-125" />
                
                {/* Emerald/Violet Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

                <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg backdrop-blur-md", cat.bg, cat.color)}>
                            {cat.label}
                        </span>
                        {noticia.carrera && (
                            <span className="inline-flex items-center gap-2 text-[10px] font-black text-white/50 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 uppercase tracking-widest backdrop-blur-md">
                                <GraduationCap size={14} className="text-violet-400" /> {noticia.carrera}
                            </span>
                        )}
                    </div>

                    <div className="max-w-4xl">
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tighter mb-4 line-clamp-2 group-hover:text-emerald-400 transition-colors drop-shadow-2xl">
                            {noticia.titulo}
                        </h2>
                        
                        <div className="flex items-center gap-6 text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.2em] transform translate-y-0 opacity-100 transition-all group-hover:text-white/60">
                            <span className="flex items-center gap-2">
                                <Clock size={14} className="text-emerald-400" /> 
                                {getRelativeTime(noticia.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Detail Link Overlay */}
                <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                        <ChevronRight size={24} className="text-white" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

/**
 * NewsGridCard: For when there are TWO news items.
 * Vertical layout, image on top, fits perfectly in a 2-col grid.
 */
export function NewsGridCard({ noticia }: { noticia: Noticia }) {
    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block h-full">
            <div className="flex flex-col h-full bg-black/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-4 lg:p-6 transition-all duration-500 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 shadow-2xl relative overflow-hidden">
                
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden mb-5 sm:mb-6 shrink-0 bg-white/5 border border-white/5">
                    {noticia.imagen_url ? (
                        <Image
                            src={noticia.imagen_url}
                            alt={noticia.titulo}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-black/60 flex items-center justify-center">
                            <Trophy size={40} className="text-white/10" />
                        </div>
                    )}
                    <div className="absolute top-4 left-4">
                        <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md shadow-lg", cat.bg, cat.color)}>
                            {cat.label}
                        </span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                    {noticia.carrera && (
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap size={12} className="text-white/30" />
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/30 truncate">
                                {noticia.carrera}
                            </span>
                        </div>
                    )}
                    
                    <h3 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight mb-4 line-clamp-3 group-hover:text-emerald-400 transition-colors">
                        {noticia.titulo}
                    </h3>

                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3 text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                        <span className="flex items-center gap-1.5 shrink-0"><Clock size={12} className="text-emerald-400/60" /> {getRelativeTime(noticia.created_at)}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Related Match Card (for Partido Detail) ───
export function NewsRelatedCard({ noticia }: { noticia: Noticia }) {
    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block">
            <div className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10">
                <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", cat.color)}>{cat.label}</span>
                    <span className="text-[9px] text-white/30">{getRelativeTime(noticia.created_at)}</span>
                </div>
                <h4 className="text-sm font-bold text-white/80 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {noticia.titulo}
                </h4>
            </div>
        </Link>
    );
}
