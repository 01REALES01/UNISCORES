"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Noticia, NewsListCard } from "@/components/news-card";
import { Avatar, Button } from "@/components/ui-primitives";
import { ArrowLeft, Clock, GraduationCap, MapPin, Share2, ChevronRight, Calendar, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/components/sport-icons";
import { NewsReactions } from "@/components/news-reactions";
import UniqueLoading from "@/components/ui/morph-loading";
import { SafeBackButton } from "@/shared/components/safe-back-button";

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
            if (!id) return;
            setLoading(true);

            console.log("Fetching noticia with ID:", id);

            const { data, error } = await safeQuery<any>(
                supabase.from('noticias')
                    .select('id, titulo, contenido, imagen_url, categoria, autor_nombre, partido_id, carrera, published, created_at, partidos(id, equipo_a, equipo_b, fecha, estado, lugar, marcador_detalle, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url))')
                    .eq('id', id)
                    .single(),
                'noticia-detail'
            );

            if (error) {
                console.error("Detail Error:", error);
            }

            if (data) {
                setNoticia(data as Noticia);

                // Fetch related news (same carrera or same partido)
                const { data: relatedData } = await safeQuery(
                    supabase.from('noticias')
                        .select('id, titulo, contenido, imagen_url, categoria, created_at, published, partidos(equipo_a, equipo_b, disciplinas(name))')
                        .eq('published', true)
                        .neq('id', id)
                        .order('created_at', { ascending: false })
                        .limit(4),
                    'noticia-related'
                );
                if (relatedData) setRelated(relatedData as unknown as Noticia[]);
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

    useEffect(() => {
        const handleScroll = () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            const el = document.getElementById('reading-progress');
            if (el) el.style.width = scrolled + '%';
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    if (!noticia) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white">
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
    const content = noticia.contenido || '';
    const words = content.split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    // Simple markdown-like rendering: split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/).filter(Boolean);

    return (
        <div className="min-h-screen bg-background text-white selection:bg-red-500/30 font-sans overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px] -z-10 animate-pulse" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[120px] -z-10" />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-white/5 transition-all duration-300">
                {/* Reading Progress Bar */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-violet-600 to-red-600 transition-all duration-150 ease-out z-50" id="reading-progress" style={{ width: '0%' }} />
                
                <div className="max-w-5xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <SafeBackButton fallback="/noticias" />
                        <div className="hidden sm:block h-6 w-[1px] bg-white/10" />
                        <div className="hidden sm:flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Lectura en curso</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleShare} 
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 group"
                    >
                        <Share2 size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold hidden sm:inline">Compartir</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-28 sm:pt-40 pb-24 relative">

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Meta & Category Info */}
                    <div className="flex flex-wrap items-center gap-3 mb-8">
                        <div className={cn(
                            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg", 
                            cat.bg, cat.color
                        )}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {cat.label}
                        </div>
                        {noticia.carrera && (
                            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 bg-white/5 rounded-xl px-4 py-2 border border-white/5 backdrop-blur-md">
                                <GraduationCap size={14} className="text-violet-400" /> 
                                {noticia.carrera}
                            </div>
                        )}
                        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-3">
                            <Clock size={14} /> {readTime} min
                        </div>
                    </div>

                    {/* Title Section */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tighter mb-10 text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 drop-shadow-2xl">
                        {noticia.titulo}
                    </h1>

                    {/* Author Footer */}
                    <div className="flex items-center gap-5 mb-12 sm:mb-20">
                        <div className="p-1 rounded-[1.8rem] bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl backdrop-blur-3xl group cursor-pointer hover:border-violet-500/50 transition-all duration-500 animate-in fade-in slide-in-from-left-4">
                            <div className="flex items-center gap-4 py-2 px-3 pr-6">
                                <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center overflow-hidden border border-white/5 shadow-inner transition-transform group-hover:scale-110">
                                    <Avatar name={noticia.autor_nombre} className="w-full h-full text-lg font-black bg-white/5 text-white/40" />
                                </div>
                                <div className="flex flex-col">
                                    {noticia.autor_nombre.toLowerCase() !== 'redacción' && noticia.autor_nombre.toLowerCase() !== 'redaccion' ? (
                                        <>
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Autor</span>
                                            <span className="text-xs sm:text-sm font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-widest">{noticia.autor_nombre}</span>
                                        </>
                                    ) : (
                                        <span className="text-xs sm:text-sm font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-[0.3em]">Redacción</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="h-10 w-[1px] bg-white/5 ml-auto" />
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Publicado</span>
                            <span className="text-[10px] sm:text-[11px] font-black text-white/60 uppercase tracking-widest">{formattedDate}</span>
                        </div>
                    </div>

                    {/* Hero Image - High Impact */}
                    {noticia.imagen_url && (
                        <div className="relative aspect-[16/10] sm:aspect-[21/9] rounded-[2.5rem] overflow-hidden mb-16 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5 group">
                            <img
                                src={noticia.imagen_url}
                                alt={noticia.titulo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
                            
                            {/* Decorative corner glow */}
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-600/20 blur-3xl rounded-full" />
                        </div>
                    )}

                    {/* Associated Match Card - Premium Redesign */}
                    {noticia.partidos && (
                        <Link href={`/partido/${noticia.partido_id}`}>
                            <div className="relative mb-16 group">
                                {/* Border glow on hover */}
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-600/0 via-violet-600/50 to-violet-600/0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-[2px]" />
                                
                                <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl overflow-hidden transition-all duration-500 hover:bg-white/[0.06] hover:translate-y-[-4px]">
                                    
                                    {/* Left Status Pillar */}
                                    <div className="flex flex-col items-center justify-center text-center px-4 md:border-r border-white/10 shrink-0 min-w-[100px]">
                                        {noticia.partidos.estado === 'programado' ? (
                                            <>
                                                <Calendar size={18} className="text-violet-400 mb-2" />
                                                <span className="text-lg font-black text-white">
                                                    {noticia.partidos.fecha ? new Date(noticia.partidos.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </span>
                                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">
                                                    {noticia.partidos.fecha ? new Date(noticia.partidos.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '--'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black tracking-[0.2em] mb-3",
                                                    noticia.partidos.estado === 'en_curso' ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/20' : 'bg-white/5 text-white/40 border border-white/10'
                                                )}>
                                                    {noticia.partidos.estado === 'en_curso' ? 'EN VIVO' : 'FINALIZADO'}
                                                </div>
                                                <Zap size={18} className={cn("mb-2", noticia.partidos.estado === 'en_curso' ? 'text-red-500' : 'text-white/20')} />
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">RESULTADO</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Scoreline Center */}
                                    <div className="flex-1 flex items-center justify-around w-full relative">
                                        {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
                                        <div className="absolute -right-[10%] -bottom-[15%] flex items-center justify-center pointer-events-none select-none opacity-[0.08] group-hover:opacity-[0.12] transition-all duration-1000 rotate-[-15deg] -z-0">
                                            <SportIcon sport={noticia.partidos.disciplinas?.name} size={240} className="transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]" />
                                        </div>

                                        {/* Team A */}
                                        <div className="flex flex-col items-center gap-4 flex-1 text-center group/team">
                                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-black/60 border border-white/10 flex items-center justify-center p-4 shadow-2xl group-hover/team:scale-110 group-hover/team:shadow-violet-500/20 transition-all duration-700 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/team:opacity-100 transition-opacity" />
                                                <img src={noticia.partidos.carrera_a?.escudo_url || '/placeholder-team.png'} alt="" className="w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] relative z-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Local</span>
                                                <span className="block text-xs sm:text-base font-black uppercase tracking-tight max-w-[140px] line-clamp-1 group-hover/team:text-violet-400 transition-colors">{noticia.partidos.carrera_a?.nombre || noticia.partidos.equipo_a}</span>
                                            </div>
                                        </div>

                                        {/* VS / SCORE */}
                                        <div className="flex flex-col items-center px-4">
                                            {noticia.partidos.estado === 'programado' ? (
                                                <div className="text-2xl italic font-black text-white/10">VS</div>
                                            ) : (
                                                <div className="flex items-center gap-2 sm:gap-4 font-mono text-34xl sm:text-5xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                                    <span>{(noticia.partidos.marcador_detalle?.goles_a ?? noticia.partidos.marcador_detalle?.sets_a ?? noticia.partidos.marcador_detalle?.total_a ?? 0)}</span>
                                                    <span className="text-white/10 font-sans text-xl sm:text-2xl">-</span>
                                                    <span>{(noticia.partidos.marcador_detalle?.goles_b ?? noticia.partidos.marcador_detalle?.sets_b ?? noticia.partidos.marcador_detalle?.total_b ?? 0)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Team B */}
                                        <div className="flex flex-col items-center gap-4 flex-1 text-center group/team">
                                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-black/60 border border-white/10 flex items-center justify-center p-4 shadow-2xl group-hover/team:scale-110 group-hover/team:shadow-violet-500/20 transition-all duration-700 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/team:opacity-100 transition-opacity" />
                                                <img src={noticia.partidos.carrera_b?.escudo_url || '/placeholder-team.png'} alt="" className="w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] relative z-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Visitante</span>
                                                <span className="block text-xs sm:text-base font-black uppercase tracking-tight max-w-[140px] line-clamp-1 group-hover/team:text-violet-400 transition-colors">{noticia.partidos.carrera_b?.nombre || noticia.partidos.equipo_b}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Action Pillar */}
                                    <div className="hidden lg:flex flex-col items-end gap-3 px-4 shrink-0">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-400">
                                            <SportIcon sport={noticia.partidos.disciplinas?.name} size={14} className="opacity-70" />
                                            {noticia.partidos.disciplinas?.name}
                                        </div>
                                        <Button variant="outline" className="rounded-xl h-9 px-6 text-[9px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-violet-600 hover:text-white hover:border-violet-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all">
                                            Ver Partido
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Main Content Article */}
                    <article className="relative">
                        {/* Decorative Vertical Line */}
                        <div className="absolute left-[-30px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-violet-500/20 via-white/5 to-transparent hidden md:block" />

                        <div className="prose prose-invert prose-p:text-white/70 prose-p:leading-relaxed prose-p:text-lg sm:prose-p:text-xl prose-p:font-medium prose-p:mb-8 sm:prose-p:mb-10 prose-headings:font-black prose-headings:tracking-tighter prose-strong:text-white prose-strong:font-black max-w-none">
                            {paragraphs.map((p, i) => {
                                // Formatting helpers
                                const formatted = p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                
                                // Editorial Headers
                                if (p.startsWith('### ')) {
                                    return <h3 key={i} className="text-2xl sm:text-3xl font-black text-white mt-12 mb-6 group flex items-center gap-4">
                                        <div className="w-8 h-1 bg-violet-600 rounded-full group-hover:w-12 transition-all" />
                                        {p.replace('### ', '')}
                                    </h3>;
                                }
                                if (p.startsWith('## ')) {
                                    return <h2 key={i} className="text-3xl sm:text-4xl font-black text-white mt-16 mb-8 border-l-4 border-red-500 pl-6 drop-shadow-lg">
                                        {p.replace('## ', '')}
                                    </h2>;
                                }

                                // Special Blockquote styling if a paragraph is short and starts with "
                                if (p.length < 200 && p.startsWith('"')) {
                                   return (
                                        <div key={i} className="my-12 sm:my-16 px-8 sm:px-12 py-10 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent border-l-8 border-violet-600 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 text-8xl font-black font-serif text-white/5 select-none transition-transform group-hover:scale-110">”</div>
                                            <p className="text-2xl sm:text-3xl italic font-black text-white/90 leading-tight relative z-10">
                                                {p.replace(/^"|"$/g, '')}
                                            </p>
                                        </div>
                                   );
                                }

                                // Drop Cap for the first paragraph
                                if (i === 0) {
                                    return (
                                        <p
                                            key={i}
                                            className="first-letter:text-7xl first-letter:font-black first-letter:mr-4 first-letter:float-left first-letter:text-violet-500 first-letter:font-sans first-line:uppercase first-line:tracking-widest first-line:text-sm first-line:font-black first-line:text-white/40"
                                            dangerouslySetInnerHTML={{ __html: formatted }}
                                        />
                                    );
                                }

                                return (
                                    <p
                                        key={i}
                                        dangerouslySetInnerHTML={{ __html: formatted }}
                                    />
                                );
                            })}
                        </div>
                    </article>

                    {/* Interaction Area */}
                    <div className="mt-20 pt-16 border-t border-white/5">
                        <NewsReactions noticiaId={id} />
                    </div>

                    {/* Related Post Grids */}
                    {related.length > 0 && (
                        <div className="mt-24 pt-20 border-t border-white/5 space-y-12">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black uppercase tracking-tighter text-white">
                                    Historias Relacionadas
                                </h2>
                                <Link href="/noticias">
                                    <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/5 text-[10px] font-black uppercase tracking-widest">
                                        Ver Todo <ChevronRight size={14} className="ml-2" />
                                    </Button>
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {related.map(n => (
                                    <div key={n.id} className="hover:translate-x-2 transition-transform duration-500">
                                        <NewsListCard noticia={n} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
