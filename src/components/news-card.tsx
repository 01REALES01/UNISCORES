"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight, Trophy, GraduationCap } from "lucide-react";

export type Noticia = {
    id: string;
    titulo: string;
    contenido: string;
    imagen_url: string | null;
    categoria: 'cronica' | 'entrevista' | 'analisis' | 'flash';
    autor_nombre: string;
    partido_id: number | null;
    carrera: string | null;
    published: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    partidos?: { equipo_a: string; equipo_b: string; disciplinas: { name: string } } | null;
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    cronica: { label: 'Crónica', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/20' },
    entrevista: { label: 'Entrevista', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20' },
    analisis: { label: 'Análisis', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/20' },
    flash: { label: 'Flash', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/20' },
};

function getReadTime(content: string): string {
    const words = content.split(/\s+/).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min`;
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
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
            <div className="relative h-[400px] sm:h-[480px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                {/* Background Image */}
                {noticia.imagen_url ? (
                    <img
                        src={noticia.imagen_url}
                        alt={noticia.titulo}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 to-[#17130D]" />
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border", cat.bg, cat.color)}>
                            {cat.label}
                        </span>
                        {noticia.carrera && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/50">
                                <GraduationCap size={12} /> {noticia.carrera}
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3 line-clamp-3 group-hover:text-[#FFC000] transition-colors">
                        {noticia.titulo}
                    </h2>

                    <p className="text-sm text-white/60 line-clamp-2 mb-4 max-w-2xl">
                        {noticia.contenido.substring(0, 180)}...
                    </p>

                    <div className="flex items-center gap-4 text-xs font-bold text-white/40">
                        <span>{noticia.autor_nombre}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {getRelativeTime(noticia.created_at)}</span>
                        <span>{getReadTime(noticia.contenido)} lectura</span>
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
            <div className="flex gap-4 bg-[#17130D]/60 border border-white/5 rounded-2xl p-3 sm:p-4 hover:border-white/15 transition-all duration-300 hover:bg-[#1a1610]">
                {/* Thumbnail */}
                <div className="w-[100px] h-[80px] sm:w-[140px] sm:h-[100px] rounded-xl overflow-hidden shrink-0 relative">
                    {noticia.imagen_url ? (
                        <img
                            src={noticia.imagen_url}
                            alt={noticia.titulo}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900/30 to-[#17130D] flex items-center justify-center">
                            <Trophy size={24} className="text-white/20" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", cat.color)}>
                                {cat.label}
                            </span>
                            {noticia.carrera && (
                                <span className="text-[10px] font-bold text-white/30 truncate">
                                    · {noticia.carrera}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white/90 leading-snug line-clamp-2 group-hover:text-[#FFC000] transition-colors">
                            {noticia.titulo}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-bold text-white/30 mt-2">
                        <span>{getRelativeTime(noticia.created_at)}</span>
                        <span>·</span>
                        <span>{getReadTime(noticia.contenido)} lectura</span>
                    </div>
                </div>

                {/* Arrow */}
                <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-white/30" />
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
