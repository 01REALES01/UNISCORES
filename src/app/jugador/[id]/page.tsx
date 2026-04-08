"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MainNavbar } from "@/components/main-navbar";
import { Avatar } from "@/components/ui-primitives";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { SafeBackButton } from "@/shared/components/safe-back-button";
import { ChevronLeft, Lock, Trophy, Calendar, ArrowUpRight, Users, Target, Activity, Share2 } from "lucide-react";
import { SPORT_ACCENT, SPORT_COLORS, SPORT_GRADIENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { motion } from "framer-motion";
export default function JugadorPublicPage() {
    const params = useParams();
    const router = useRouter();
    const jugadorId = params.id as string;

    const [jugador, setJugador] = useState<any>(null);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
    const [delegacion, setDelegacion] = useState<any>(null);
    const [partidos, setPartidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch current jugador
            const { data: j } = await supabase
                .from('jugadores')
                .select('id, nombre, numero, email, profile_id, sexo, genero, carrera:carrera_id(id, nombre, escudo_url), disciplina:disciplina_id(id, name)')
                .eq('id', jugadorId)
                .single();

            if (!j) { setLoading(false); return; }

            // If profile exists, redirect to full profile page
            if (j.profile_id) {
                router.replace(`/perfil/${j.profile_id}`);
                return;
            }

            // Find all sports for this person (by name + email)
            let detectedDisciplinas: any[] = [];
            const { data: others } = await supabase
                .from('jugadores')
                .select('id, disciplina:disciplina_id(id, name)')
                .eq('nombre', j.nombre)
                .eq('email', j.email)
                .is('profile_id', null);
            
            if (others) {
                detectedDisciplinas = others.map(o => ({
                    jugador_id: o.id,
                    ...(Array.isArray(o.disciplina) ? o.disciplina[0] : o.disciplina)
                })).filter(d => d.id);
                setDisciplinas(detectedDisciplinas);
            }

            const currentSportId = (Array.isArray(j.disciplina) ? j.disciplina[0] : j.disciplina)?.id;
            setSelectedSportId(currentSportId);
            setJugador(j);

            // Fetch delegacion and matches for selected sport
            await fetchSportContext(j, currentSportId, detectedDisciplinas);

            setLoading(false);
        };

        const fetchSportContext = async (j: any, discId: string, currentDisciplinas: any[]) => {
            // Find delegacion (implicit: carrera + disciplina + genero)
            const carreraData = Array.isArray(j.carrera) ? j.carrera[0] : j.carrera;

            if (carreraData?.id && discId && j.genero) {
                const { data: del } = await supabase
                    .from('delegaciones')
                    .select('id, nombre, genero')
                    .eq('disciplina_id', discId)
                    .eq('genero', j.genero)
                    .contains('carrera_ids', [carreraData.id])
                    .maybeSingle();
                setDelegacion(del);
            }

            // Match history via all registered jugador_ids for this person
            const allIds = currentDisciplinas.map(d => d.jugador_id);
            const { data: rp } = await supabase
                .from('roster_partido')
                .select('partido_id, equipo_a_or_b, partido:partidos(id, equipo_a, equipo_b, fecha, estado, disciplinas(name))')
                .in('jugador_id', allIds.length > 0 ? allIds : [jugadorId])
                .order('partido_id', { ascending: false })
                .limit(10);
            
            if (rp) {
                // Filter matches by current sport if needed, or show all
                const filtered = discId 
                    ? rp.filter((row: any) => (row.partido as any)?.disciplinas?.name === currentDisciplinas.find((d: any) => d.id === discId)?.name)
                    : rp;
                setPartidos(filtered);
            }
        };

        fetchData();
    }, [jugadorId]);

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <UniqueLoading size="lg" />
        </div>
    );

    if (!jugador) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white gap-4 p-8 text-center">
            <Trophy size={48} className="text-slate-700" />
            <h1 className="text-xl font-bold">Jugador no encontrado</h1>
            <SafeBackButton fallback="/" label="Volver al inicio" />
        </div>
    );

    const currentSport = disciplinas.find(d => d.id === selectedSportId) || (Array.isArray(jugador.disciplina) ? jugador.disciplina[0] : jugador.disciplina);
    const sportName = currentSport?.name || '';
    const sportColor = SPORT_COLORS[sportName] || '#6366f1';
    const initials = jugador.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
    const generoLabel = jugador.genero === 'femenino' ? 'Femenino' : jugador.genero === 'masculino' ? 'Masculino' : 'Mixto';

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 overflow-x-hidden relative font-sans">
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 flex justify-between items-center pointer-events-none">
                <div className="pointer-events-auto">
                    <SafeBackButton fallback="/medallero" />
                </div>
            </div>
            {/* ━━━ AMBIENT HYBRID BACKGROUND ━━━ */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.07]">
                <img 
                    src="/elementos/07.png" 
                    alt="" 
                    className="w-[800px] md:w-[1200px] h-auto grayscale contrast-150 brightness-200" 
                    aria-hidden="true"
                />
            </div>

            <MainNavbar user={null} profile={null} isStaff={false} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-32 relative z-10 space-y-16">
                
                {/* Top Nav Actions */}
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.2em] font-sans">
                        <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:bg-white group-hover:text-black transition-all flex items-center justify-center">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>

                    <div className="flex items-center gap-2">
                         {/* Compartir */}
                         <button className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white">
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>

                {/* ━━━ PREMIUM IDENTITY BLOCK ━━━ */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-violet-600/5 via-emerald-600/5 to-transparent blur-[120px] pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 lg:gap-12 relative z-10">
                        <div className="relative group shrink-0">
                            <div className="relative w-44 h-44 lg:w-64 lg:h-64 rounded-[3rem] border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl flex items-center justify-center text-5xl lg:text-7xl font-sans ring-1 ring-white/5 overflow-hidden">
                                {initials}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
                            </div>
                            
                            {/* "No activado" floating badge */}
                            <div className="absolute -bottom-2 -right-2 p-3 bg-slate-800 rounded-2xl shadow-xl z-20 border-2 border-white/10 flex items-center gap-2">
                                <Lock size={16} className="text-amber-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/80">Pendiente de Activar</span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/40">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Deportista Amateur</span>
                                    </div>
                                    {jugador.genero && (
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5",
                                            jugador.genero === 'femenino' ? 'text-pink-400' : jugador.genero === 'masculino' ? 'text-blue-400' : 'text-purple-400'
                                        )}>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{generoLabel}</span>
                                        </div>
                                    )}
                                </div>
                                <h1 className="text-5xl lg:text-8xl font-black font-sans tracking-tight leading-none text-white drop-shadow-2xl">
                                    {jugador.nombre}
                                    {jugador.numero && <span className="ml-4 text-white/20 font-mono text-3xl lg:text-5xl">#{jugador.numero}</span>}
                                </h1>
                            </div>

                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1 p-1.5 bg-black/40 border border-white/10 rounded-[2rem] backdrop-blur-xl shadow-2xl">
                                <div className="flex items-center gap-3 px-6 py-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 group/stat hover:bg-white/5 transition-colors">
                                    <div className="p-2 bg-violet-500/15 rounded-xl text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover/stat:scale-110 transition-transform">
                                        <Target size={18} />
                                    </div>
                                    <div className="leading-tight">
                                        <p className="text-[18px] font-black font-mono tabular-nums text-white drop-shadow-md">--</p>
                                        <p className="text-[9px] font-display font-black text-white/30 uppercase tracking-[0.2em]">Puntos Globales</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ━━━ CONTENT GRID ━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: CTA / Stats Preview */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                        {/* Important CTA Box */}
                        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-violet-600/20 to-indigo-900/40 backdrop-blur-3xl border border-violet-500/30 p-8 shadow-2xl group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-120 transition-transform duration-700">
                                <Lock size={120} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase font-display">Activa tu perfil</h3>
                                <p className="text-sm text-white/60 mb-8 leading-relaxed">
                                    Si eres <strong className="text-white">{jugador.nombre.split(' ')[0]}</strong>, vincula tu cuenta para desbloquear estadísticas avanzadas, historial completo y ranking oficial.
                                </p>
                                <Link href="/login"
                                    className="w-full bg-white text-black py-4 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-violet-400 hover:text-white transition-all shadow-xl active:scale-95">
                                    Comenzar ahora <ArrowUpRight size={16} />
                                </Link>
                            </div>
                        </div>

                        {/* Analytic Placeholders */}
                        <div className="rounded-[3rem] bg-black/40 border border-white/5 p-8 backdrop-blur-xl">
                             <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col gap-1">
                                    <p className="font-display text-[10px] font-bold tracking-[0.3em] text-white/20">
                                        Performance Hub
                                    </p>
                                    <h3 className="text-2xl font-black text-white/40 font-display tracking-tighter">Estadísticas</h3>
                                </div>
                                <Activity size={24} className="text-white/10" />
                            </div>
                            <div className="space-y-4">
                                <div className="h-12 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-white/10 tracking-widest uppercase italic">Esperando activación</span>
                                </div>
                                <div className="h-12 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
                                    <span className="text-[10px] font-black text-white/10 tracking-widest uppercase italic">Esperando activación</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Careers + Matches */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Career / Represented */}
                        {jugador.carrera && (
                            <Link href={`/carrera/${(Array.isArray(jugador.carrera) ? jugador.carrera[0] : jugador.carrera).id}`}
                                className="group relative rounded-[3rem] bg-black/40 border border-white/10 p-8 lg:p-10 overflow-hidden hover:border-violet-500/30 transition-all duration-500 shadow-2xl flex flex-col sm:flex-row items-center sm:items-stretch gap-10 backdrop-blur-xl">
                                <div className="absolute -right-20 -top-20 w-96 h-96 opacity-[0.05] blur-[100px] rounded-full bg-violet-600 pointer-events-none" />
                                <div className="w-28 h-28 lg:w-40 lg:h-40 rounded-[2.5rem] bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] p-6 relative z-10 group-hover:scale-105 transition-transform duration-700">
                                    {(Array.isArray(jugador.carrera) ? jugador.carrera[0] : jugador.carrera).escudo_url ? (
                                        <img src={(Array.isArray(jugador.carrera) ? jugador.carrera[0] : jugador.carrera).escudo_url} alt="" className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                                    ) : (
                                        <span className="text-5xl font-black font-display text-white/10 uppercase tracking-tighter">{(Array.isArray(jugador.carrera) ? jugador.carrera[0] : jugador.carrera).nombre.substring(0, 2)}</span>
                                    )}
                                </div>
                                <div className="flex flex-col relative z-10 flex-1 justify-center text-center sm:text-left">
                                    <span className="text-[12px] font-display font-bold tracking-[0.3em] text-white/30 mb-4 block uppercase leading-none">
                                        Representando a
                                    </span>
                                    <h3 className="text-4xl lg:text-5xl font-black text-white group-hover:text-violet-400 transition-colors font-sans tracking-tight leading-none mb-6">{(Array.isArray(jugador.carrera) ? jugador.carrera[0] : jugador.carrera).nombre}</h3>
                                    <div className="flex items-center justify-center sm:justify-start gap-3 text-[10px] font-display font-black tracking-[0.2em] text-white/20 group-hover:text-white transition-all">
                                        <span className="border-b border-white/10 pb-1">Sección de equipos de facultad</span>
                                        <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Match History */}
                        <div className="rounded-[3rem] bg-black/40 border border-white/10 p-8 lg:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-[10px] font-display font-black text-white/40 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                                    <div className="w-8 h-[1px] bg-white/10" /> Historial de Participación
                                </h3>

                                {partidos.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {partidos.map((rp: any) => {
                                            const p = rp.partido;
                                            if (!p) return null;
                                            const sName = (p as any).disciplinas?.name;
                                            const sColor = SPORT_COLORS[sName] || '#fff';
                                            return (
                                                <Link key={rp.partido_id} href={`/partido/${rp.partido_id}`}
                                                    className="group flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300">
                                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-black/40 border border-white/5 group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                                                        <SportIcon sport={sName} size={24} className="opacity-80" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-center sm:text-left">
                                                        <p className="text-lg font-black text-white/90 group-hover:text-white transition-colors truncate">
                                                            {p.equipo_a} <span className="text-white/20 px-2 font-mono">VS</span> {p.equipo_b}
                                                        </p>
                                                        <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: sColor }}>{sName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className={cn(
                                                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-colors",
                                                            p.estado === 'finalizado' ? 'bg-white/5 border-white/10 text-white/40 font-mono' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        )}>
                                                            {p.estado === 'finalizado' ? 'FINAL' : 'EN CURSO'}
                                                        </div>
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-white group-hover:text-black transition-all">
                                                            <ArrowUpRight size={18} />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center opacity-20">
                                        <Trophy size={48} className="mb-4" />
                                        <p className="text-xs font-black uppercase tracking-[0.2em]">Sin partidos registrados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
