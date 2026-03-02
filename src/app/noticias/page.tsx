"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { NewsHeroCard, NewsListCard, Noticia } from "@/components/news-card";
import { NewsHeroSkeleton, NewsListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui-primitives";
import { ArrowLeft, Newspaper, GraduationCap, Filter } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { key: 'todas', label: 'Todas' },
    { key: 'cronica', label: 'Crónicas' },
    { key: 'entrevista', label: 'Entrevistas' },
    { key: 'analisis', label: 'Análisis' },
    { key: 'flash', label: 'Flash' },
];

export default function NoticiasPage() {
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [carreras, setCarreras] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('todas');
    const [carreraFilter, setCarreraFilter] = useState('todas');

    useEffect(() => {
        const fetchNoticias = async () => {
            setLoading(true);

            const [newsRes, carrerasRes] = await Promise.all([
                safeQuery(
                    supabase.from('noticias')
                        .select('*, partidos(equipo_a, equipo_b, disciplinas(name))')
                        .eq('published', true)
                        .order('created_at', { ascending: false }),
                    'noticias-feed'
                ),
                safeQuery(
                    supabase.from('medallero').select('equipo_nombre').order('equipo_nombre'),
                    'noticias-carreras'
                ),
            ]);

            if (newsRes.data) setNoticias(newsRes.data as Noticia[]);
            if (carrerasRes.data) {
                const names = carrerasRes.data.map((c: any) => c.equipo_nombre).filter(Boolean);
                setCarreras(names);
            }

            setLoading(false);
        };

        fetchNoticias();

        const channel = supabase
            .channel('noticias-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, async () => {
                const { data } = await safeQuery(
                    supabase.from('noticias')
                        .select('*, partidos(equipo_a, equipo_b, disciplinas(name))')
                        .eq('published', true)
                        .order('created_at', { ascending: false }),
                    'rt-noticias'
                );
                if (data) setNoticias(data as Noticia[]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const filtered = noticias.filter(n => {
        if (categoryFilter !== 'todas' && n.categoria !== categoryFilter) return false;
        if (carreraFilter !== 'todas' && n.carrera !== carreraFilter) return false;
        return true;
    });

    const featured = filtered[0];
    const rest = filtered.slice(1);

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-red-600/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0805]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Newspaper size={20} className="text-[#FFC000]" />
                            <h1 className="text-xl font-black tracking-tight">Noticias</h1>
                        </div>
                    </div>
                    <div className="text-xs font-mono font-black tracking-widest text-white/40 hidden sm:block">
                        MEDIO DEPORTIVO
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 pt-24 pb-12 relative z-10">
                {/* Filters */}
                <div className="mb-8 space-y-4">
                    {/* Category Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setCategoryFilter(cat.key)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border whitespace-nowrap transition-all",
                                    categoryFilter === cat.key
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Carrera Filter */}
                    {carreras.length > 0 && (
                        <div className="flex items-center gap-3">
                            <GraduationCap size={14} className="text-white/30 shrink-0" />
                            <select
                                value={carreraFilter}
                                onChange={(e) => setCarreraFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/70 px-3 py-2 focus:outline-none focus:border-[#FFC000]/30 appearance-none cursor-pointer"
                            >
                                <option value="todas">Todas las carreras</option>
                                {carreras.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="space-y-6">
                        <NewsHeroSkeleton />
                        {[...Array(3)].map((_, i) => <NewsListSkeleton key={i} />)}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filtered.length === 0 && (
                    <div className="text-center py-20">
                        <Newspaper size={48} className="mx-auto text-white/10 mb-4" />
                        <h3 className="text-lg font-bold text-white/40 mb-2">No hay noticias</h3>
                        <p className="text-sm text-white/25">
                            {categoryFilter !== 'todas' || carreraFilter !== 'todas'
                                ? 'No hay noticias con estos filtros. Prueba cambiándolos.'
                                : 'Pronto habrá contenido aquí. ¡Vuelve más tarde!'
                            }
                        </p>
                    </div>
                )}

                {/* Feed */}
                {!loading && filtered.length > 0 && (
                    <div className="space-y-6">
                        {/* Hero (Featured) */}
                        {featured && <NewsHeroCard noticia={featured} />}

                        {/* Rest */}
                        {rest.length > 0 && (
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                                    <Filter size={12} /> Más Noticias
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {rest.map(n => <NewsListCard key={n.id} noticia={n} />)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
