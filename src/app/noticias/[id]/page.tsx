"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Noticia, NewsListCard } from "@/components/news-card";
import { Button } from "@/components/ui-primitives";
import { ArrowLeft, Clock, GraduationCap, Trophy, Share2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    cronica: { label: 'Crónica', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/20' },
    entrevista: { label: 'Entrevista', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/20' },
    analisis: { label: 'Análisis', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/20' },
    flash: { label: 'Flash', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/20' },
};

export default function NoticiaDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [noticia, setNoticia] = useState<Noticia | null>(null);
    const [related, setRelated] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNoticia = async () => {
            setLoading(true);

            const { data } = await safeQuery<any>(
                supabase.from('noticias')
                    .select('*, partidos(id, equipo_a, equipo_b, disciplinas(name))')
                    .eq('id', id)
                    .single(),
                'noticia-detail'
            );

            if (data) {
                setNoticia(data as Noticia);

                // Fetch related news (same carrera or same partido)
                const { data: relatedData } = await safeQuery(
                    supabase.from('noticias')
                        .select('*, partidos(equipo_a, equipo_b, disciplinas(name))')
                        .eq('published', true)
                        .neq('id', id)
                        .order('created_at', { ascending: false })
                        .limit(4),
                    'noticia-related'
                );
                if (relatedData) setRelated(relatedData as Noticia[]);
            }

            setLoading(false);
        };

        fetchNoticia();
    }, [id]);

    const handleShare = async () => {
        if (navigator.share && noticia) {
            await navigator.share({
                title: noticia.titulo,
                text: noticia.contenido.substring(0, 100),
                url: window.location.href,
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0805] text-white">
                <div className="w-16 h-16 rounded-full border-4 border-[#FFC000]/30 border-t-[#FFC000] animate-spin mb-4" />
                <p className="text-sm font-medium text-[#FFC000]/60 animate-pulse">Cargando artículo...</p>
            </div>
        );
    }

    if (!noticia) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0805] text-white">
                <h1 className="text-2xl font-black mb-2">Artículo no encontrado</h1>
                <Link href="/noticias"><Button variant="ghost">← Volver a Noticias</Button></Link>
            </div>
        );
    }

    const cat = CATEGORY_CONFIG[noticia.categoria] || CATEGORY_CONFIG.cronica;
    const date = new Date(noticia.created_at);
    const formattedDate = date.toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const words = noticia.contenido.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    // Simple markdown-like rendering: split by double newlines for paragraphs
    const paragraphs = noticia.contenido.split(/\n\n+/).filter(Boolean);

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0805]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/noticias">
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <button onClick={handleShare} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <Share2 size={18} className="text-white/50" />
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 pt-20 pb-16">
                {/* Hero Image */}
                {noticia.imagen_url && (
                    <div className="relative h-[300px] sm:h-[450px] rounded-3xl overflow-hidden mb-8 border border-white/5">
                        <img
                            src={noticia.imagen_url}
                            alt={noticia.titulo}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0805] via-transparent to-transparent" />
                    </div>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border", cat.bg, cat.color)}>
                        {cat.label}
                    </span>
                    {noticia.carrera && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40 bg-white/5 rounded-full px-3 py-1.5 border border-white/5">
                            <GraduationCap size={13} /> {noticia.carrera}
                        </span>
                    )}
                    {noticia.partidos && (
                        <Link
                            href={`/partido/${noticia.partido_id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400/70 bg-amber-500/10 rounded-full px-3 py-1.5 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                            <Trophy size={13} /> {noticia.partidos.equipo_a} vs {noticia.partidos.equipo_b}
                            <ChevronRight size={12} />
                        </Link>
                    )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight mb-6">
                    {noticia.titulo}
                </h1>

                {/* Author & Date */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/40 font-bold mb-10 pb-8 border-b border-white/5">
                    <span className="text-white/60">{noticia.autor_nombre}</span>
                    <span>·</span>
                    <span className="capitalize">{formattedDate}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> {readTime} min lectura</span>
                </div>

                {/* Content */}
                <article className="prose prose-invert max-w-none">
                    {paragraphs.map((p, i) => {
                        // Check for bold markers **text**
                        const formatted = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        // Check for headers (lines starting with ## or ###)
                        if (p.startsWith('### ')) {
                            return <h3 key={i} className="text-lg font-black text-white/90 mt-8 mb-3">{p.replace('### ', '')}</h3>;
                        }
                        if (p.startsWith('## ')) {
                            return <h2 key={i} className="text-xl font-black text-white/90 mt-10 mb-4">{p.replace('## ', '')}</h2>;
                        }
                        return (
                            <p
                                key={i}
                                className="text-base sm:text-lg leading-relaxed text-white/70 mb-5"
                                dangerouslySetInnerHTML={{ __html: formatted }}
                            />
                        );
                    })}
                </article>

                {/* Related News */}
                {related.length > 0 && (
                    <div className="mt-16 pt-10 border-t border-white/5">
                        <h2 className="text-sm font-black uppercase tracking-widest text-white/30 mb-6">
                            Más Noticias
                        </h2>
                        <div className="flex flex-col gap-3">
                            {related.map(n => <NewsListCard key={n.id} noticia={n} />)}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
