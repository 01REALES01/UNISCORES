"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight, Trophy, GraduationCap } from "lucide-react";

// Tipo centralizado en modules/news/types.ts — re-exportado para compatibilidad
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

// ─── Hero Card (Featured) ───
export function NewsHeroCard({ noticia }: { noticia: Noticia }) {
    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;

    return (
        <Link href={`/noticias/${noticia.id}`} className="group block">
            <div className="relative h-[450px] sm:h-[520px] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl bg-[#0a0816]">
                {/* Background Image */}
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

                {/* Gradient Overlays for perfect contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0816] via-[#0a0816]/60 to-transparent opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0816] via-transparent to-transparent opacity-60" />

                {/* Content */}
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
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4 line-clamp-3 group-hover:text-[#FFC000] transition-colors duration-300 drop-shadow-lg">
                        {noticia.titulo}
                    </h2>

                    <p className="text-sm sm:text-base text-white/60 line-clamp-2 mb-6 max-w-3xl font-medium leading-relaxed">
                        {(noticia.contenido || '').substring(0, 200).replace(/\*\*/g, '')}...
                    </p>

                    <div className="flex items-center gap-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                        <span>{noticia.autor_nombre}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
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
                {/* Thumbnail */}
                <div className="w-[110px] h-[90px] sm:w-[160px] sm:h-[120px] rounded-2xl overflow-hidden shrink-0 relative bg-[#1a1625] border border-white/5 shadow-lg">
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
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center sm:py-1">
                    <div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                            <span className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-widest", cat.color)}>
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
                        <h3 className="text-base sm:text-xl font-black text-white/90 leading-tight tracking-tight line-clamp-2 sm:line-clamp-3 group-hover:text-white transition-colors">
                            {noticia.titulo}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-bold text-white/30 mt-3 sm:mt-4 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock size={11} /> {getRelativeTime(noticia.created_at)}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{getReadTime(noticia.contenido)} lec</span>
                    </div>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex items-center pr-2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                        <ChevronRight size={18} className="text-white/60" />
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
                <h4 className="text-sm font-bold text-white/80 line-clamp-2 group-hover:text-[#FFC000] transition-colors">
                    {noticia.titulo}
                </h4>
            </div>
        </Link>
    );
}
