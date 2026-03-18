"use client";

import { useState, useMemo } from "react";
import { NewsHeroCard, NewsListCard } from "@/components/news-card";
import { GraduationCap, Filter, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Noticia } from "@/modules/news/types";

const CATEGORIES = [
    { key: "todas", label: "Todas" },
    { key: "cronica", label: "Crónicas" },
    { key: "entrevista", label: "Entrevistas" },
    { key: "analisis", label: "Análisis" },
    { key: "flash", label: "Flash" },
];

interface NewsFiltersProps {
    noticias: Noticia[];
}

export function NewsFilters({ noticias }: NewsFiltersProps) {
    const [categoryFilter, setCategoryFilter] = useState("todas");
    const [carreraFilter, setCarreraFilter] = useState("todas");

    const carreras = useMemo(() => {
        const names = new Set<string>();
        noticias.forEach((n) => {
            if (n.carrera) names.add(n.carrera);
        });
        return Array.from(names).sort();
    }, [noticias]);

    const filtered = noticias.filter((n) => {
        if (categoryFilter !== "todas" && n.categoria !== categoryFilter) return false;
        if (carreraFilter !== "todas" && n.carrera !== carreraFilter) return false;
        return true;
    });

    const featured = filtered[0];
    const rest = filtered.slice(1);

    return (
        <>
            {/* Sticky Filters Bar */}
            <div className="sticky top-16 z-40 bg-[#0a0816]/90 backdrop-blur-xl py-4 mb-8 border-b border-white/5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:border-none">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-1">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => setCategoryFilter(cat.key)}
                                className={cn(
                                    "px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border whitespace-nowrap transition-all duration-300",
                                    categoryFilter === cat.key
                                        ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                        : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80"
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Carrera Filter */}
                    {carreras.length > 0 && (
                        <div className="flex items-center gap-3 shrink-0 bg-white/5 border border-white/10 rounded-2xl px-4 py-1.5 focus-within:border-white/20 transition-colors">
                            <GraduationCap size={16} className="text-white/40" />
                            <select
                                value={carreraFilter}
                                onChange={(e) => setCarreraFilter(e.target.value)}
                                className="bg-transparent text-xs font-black uppercase tracking-widest text-white/80 py-2 focus:outline-none appearance-none cursor-pointer pr-4"
                            >
                                <option value="todas">TODAS LAS CARRERAS</option>
                                {carreras.map((c) => (
                                    <option key={c} value={c}>
                                        {c.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
                <div className="text-center py-20">
                    <Newspaper size={48} className="mx-auto text-white/10 mb-4" />
                    <h3 className="text-lg font-bold text-white/40 mb-2">No hay noticias</h3>
                    <p className="text-sm text-white/25">
                        {categoryFilter !== "todas" || carreraFilter !== "todas"
                            ? "No hay noticias con estos filtros. Prueba cambiándolos."
                            : "Pronto habrá contenido aquí. ¡Vuelve más tarde!"}
                    </p>
                </div>
            )}

            {/* Feed */}
            {filtered.length > 0 && (
                <div className="space-y-6">
                    {featured && <NewsHeroCard noticia={featured} />}

                    {rest.length > 0 && (
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                                <Filter size={12} /> Más Noticias
                            </h2>
                            <div className="flex flex-col gap-3">
                                {rest.map((n) => (
                                    <NewsListCard key={n.id} noticia={n} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
