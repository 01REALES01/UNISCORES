"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainNavbar } from "@/components/main-navbar";
import { supabase } from "@/lib/supabase";
import { Avatar, Badge, Button } from "@/components/ui-primitives";
import {
    Star,
    Target,
    LogOut,
    ChevronLeft,
    Loader2,
    Calendar,
    ArrowUpRight,
    Crown,
    Swords,
    Settings,
    Users,
    Mail
} from "lucide-react";
import { FriendsList } from "@/modules/users/components/friends-list";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { isCreator, SPORT_EMOJI, SPORT_ACCENT } from "@/lib/constants";
import { useRouter } from "next/navigation";

type ProfileTab = 'general' | 'amigos';

export default function PerfilPage() {
    const router = useRouter();
    const { user, profile, isDeportista, isStaff, loading: authLoading, signOut } = useAuth();
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [carreras, setCarreras] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<ProfileTab>('general');

    useEffect(() => {
        if (profile) {
            if (profile.carreras_ids && profile.carreras_ids.length > 0) fetchCarreras();
            if (isDeportista) fetchHistory();
        }
    }, [profile, isDeportista]);

    const fetchCarreras = async () => {
        if (!profile?.carreras_ids?.length) return;
        const { data } = await supabase
            .from('carreras')
            .select('*')
            .in('id', profile.carreras_ids);
        if (data) setCarreras(data);
    };

    const fetchHistory = async () => {
        if (!profile?.id) return;
        setLoadingHistory(true);
        try {
            // First, try to get team matches via normalized roster_partido
            const { data: teamMatches } = await supabase
                .from('roster_partido')
                .select(`
                    equipo:equipo_a_or_b,
                    partidos!inner(
                        id, fecha, equipo_a, equipo_b, estado, marcador_detalle,
                        disciplinas(name)
                    ),
                    jugadores!inner(profile_id)
                `)
                .eq('jugadores.profile_id', profile.id)
                .order('partido_id', { ascending: false })
                .limit(5);

            // Second, get individual matches directly from partidos
            const { data: indMatches } = await supabase
                .from('partidos')
                .select(`
                    id, fecha, equipo_a, equipo_b, estado, marcador_detalle,
                    disciplinas(name)
                `)
                .or(`athlete_a_id.eq.${profile.id},athlete_b_id.eq.${profile.id}`)
                .order('fecha', { ascending: false })
                .limit(5);

            let allMatches: any[] = [];

            if (teamMatches && teamMatches.length > 0) {
                const mappedTeam = teamMatches
                    .filter((d: any) => d.partidos?.estado === 'finalizado' || d.partidos?.estado === 'en_curso')
                    .map((d: any) => ({
                        match_id: d.partidos.id,
                        fecha: d.partidos.fecha,
                        disciplina: d.partidos.disciplinas?.name,
                        equipo_a: d.partidos.equipo_a,
                        equipo_b: d.partidos.equipo_b,
                        estado: d.partidos.estado,
                        marcador_final: d.partidos.marcador_detalle
                    }));
                allMatches = [...allMatches, ...mappedTeam];
            }

            if (indMatches && indMatches.length > 0) {
                const mappedInd = indMatches
                    .filter((d: any) => d.estado === 'finalizado' || d.estado === 'en_curso')
                    .map((d: any) => ({
                        match_id: d.id,
                        fecha: d.fecha,
                        disciplina: d.disciplinas?.name,
                        equipo_a: d.equipo_a,
                        equipo_b: d.equipo_b,
                        estado: d.estado,
                        marcador_final: d.marcador_detalle
                    }));
                allMatches = [...allMatches, ...mappedInd];
            }

            // Sort descending locally to ensure correct inter-leaving of team & individual
            allMatches.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            // Deduplicate across the two calls just in case
            const uniqueMatches: any[] = [];
            const seenIds = new Set();
            for (const m of allMatches) {
                if (!seenIds.has(m.match_id)) {
                    seenIds.add(m.match_id);
                    uniqueMatches.push(m);
                }
            }

            // If we still found strictly 0 matches, fallback to the RPC just in case
            if (uniqueMatches.length === 0) {
                const { data } = await supabase.rpc('get_athlete_event_history', {
                    athlete_profile_id: profile.id
                });
                if (data) {
                    uniqueMatches.push(...data);
                }
            }
            
            setHistory(uniqueMatches.slice(0, 5));
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0816]"><UniqueLoading size="lg" /></div>;
    if (!user) return null;

    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric' })
        : null;

    const isProjectCreator = user ? isCreator(user.email) : false;
    const sportName = profile?.disciplina?.name;
    const sportEmoji = sportName ? SPORT_EMOJI[sportName] : null;

    const wins = profile?.wins || 0;
    const losses = profile?.losses || 0;
    const totalScore = profile?.total_score_all_time || 0;
    const points = profile?.points || 0;

    const firstName = profile?.full_name?.split(' ')[0] || "Usuario";

    return (
        <div className="min-h-screen bg-[#0a0816] text-white selection:bg-amber-500/30 overflow-x-hidden">
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-24 relative z-10">
                
                {/* Top Nav Actions */}
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.2em] font-outfit">
                        <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:bg-white group-hover:text-black transition-all flex items-center justify-center">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/perfil/editar"
                            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <Settings size={14} /> Editar
                        </Link>
                        <button
                            onClick={() => signOut()}
                            className="bg-white/5 border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 text-white/40 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <LogOut size={14} /> Cerrar Sesión
                        </button>
                    </div>
                </div>

                {/* ━━━ HERO SECTION ━━━ */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col lg:flex-row gap-8 lg:gap-14 mb-14"
                >
                    {/* Avatar */}
                    <div className="relative self-center lg:self-start flex-shrink-0 group">
                        {isProjectCreator && (
                            <div className="absolute -inset-5 rounded-[3.5rem] bg-gradient-to-tr from-amber-600/40 via-yellow-500/20 to-orange-500/10 blur-2xl z-0 pointer-events-none" />
                        )}
                        <Avatar
                            name={profile?.full_name || user.email}
                            src={null}
                            className={cn(
                                "relative w-48 h-48 md:w-60 md:h-60 rounded-[3rem] shadow-2xl z-10 bg-[#0a0816] text-5xl md:text-6xl border border-white/10",
                            )}
                        />
                        {isProjectCreator && (
                            <div className="absolute -bottom-3 -right-3 p-3 bg-black rounded-xl border border-white/10 shadow-2xl z-20">
                                <Crown size={24} className="text-white outline-white drop-shadow-md" />
                            </div>
                        )}
                    </div>

                    {/* Identity Content */}
                    <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
                        
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 mb-5">
                            <h1 className="text-5xl md:text-7xl font-black font-outfit leading-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFEAA7] via-[#FFD369] to-[#D4AF37] drop-shadow-md">
                                {profile?.full_name?.split(' ').slice(0, 2).join('\n') || "Tu Perfil"}
                            </h1>
                            {isProjectCreator && (
                                <div className="hidden lg:flex items-center self-start mt-3">
                                    <Badge className="bg-gradient-to-r from-amber-600 to-amber-900 border border-amber-500/50 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                        <Crown size={12} className="mr-2" /> CREADOR DEL PROYECTO
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Status Row */}
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-8">
                            {/* Puntos Pill */}
                            <div className="flex items-center gap-4 px-6 py-4 rounded-[1.5rem] bg-[#0A0705] border border-white/5 shadow-2xl">
                                <div className="p-2.5 bg-red-600/10 rounded-xl text-red-500">
                                    <Target size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Puntos Globales</span>
                                    <span className="text-3xl font-black text-white leading-none mt-1">{points}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Toggle AMIGOS tab */}
                <div className="flex justify-center lg:justify-start mb-8 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-full", activeTab === 'general' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('amigos')}
                        className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-full flex items-center gap-2", activeTab === 'amigos' ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
                    >
                        <Users size={14} /> Amigos
                    </button>
                </div>

                {activeTab === 'general' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                    {/* LEFT COLUMN: Athlete Stats or Quiniela Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        {isDeportista ? (
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0705] border border-amber-500/10 p-8 shadow-[0_0_30px_rgba(245,158,11,0.02)] min-h-[360px] flex flex-col justify-between group">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
                                    <Star size={200} />
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-amber-500 font-black uppercase text-sm tracking-[0.3em] font-outfit mb-8 max-w-[140px] leading-relaxed">
                                        ESTADÍSTICAS DE ATLETA
                                    </h3>
                                    
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Disciplina</span>
                                        <div className="px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-[0.1em]">
                                            {sportName?.toUpperCase() || "MULTIDISCIPLINA"}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="rounded-[1.5rem] bg-[#050403] p-5 text-center border border-white/5">
                                            <span className="text-[9px] font-black uppercase text-white/30 tracking-[0.2em] block mb-2">Wins</span>
                                            <span className="text-3xl font-black text-white">{wins}</span>
                                        </div>
                                        <div className="rounded-[1.5rem] bg-[#050403] p-5 text-center border border-white/5">
                                            <span className="text-[9px] font-black uppercase text-white/30 tracking-[0.2em] block mb-2">Loss</span>
                                            <span className="text-3xl font-black text-white/50">{losses}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.5rem] bg-[#3B220B] border border-amber-900/50 p-6 text-center shadow-inner">
                                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] block mb-2">Total Score</span>
                                        <span className="text-4xl font-black text-white">{totalScore}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0705] border border-indigo-500/10 p-8 shadow-[0_0_30px_rgba(99,102,241,0.02)] min-h-[360px] flex flex-col justify-between group">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
                                    <Target size={200} />
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-indigo-400 font-black uppercase text-sm tracking-[0.3em] font-outfit mb-8 max-w-[140px] leading-relaxed">
                                        ESTADÍSTICAS QUINIELA
                                    </h3>
                                    
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Puntos Totales</span>
                                        <div className="px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-[0.1em]">
                                            RANKED
                                        </div>
                                    </div>

                                    <div className="rounded-[1.5rem] bg-[#0F0D16] border border-indigo-900/50 p-6 text-center shadow-inner mt-10">
                                        <span className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] block mb-2">Quiniela Score</span>
                                        <span className="text-4xl font-black text-white">{points}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Acerca De + Historial */}
                    <div className="lg:col-span-8 space-y-6 flex flex-col">
                        
                        {/* THE NEW CAREER CARD PROTAGONIST */}
                        {carreras.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4">
                                {carreras.map((c) => (
                                    <Link key={c.id} href={`/carrera/${c.id}`} className="group relative rounded-[2.5rem] bg-gradient-to-br from-[#0A0705] to-[#040302] border border-white/5 p-8 overflow-hidden hover:border-red-500/20 transition-all shadow-2xl flex flex-col sm:flex-row items-center sm:items-stretch gap-6 min-h-[160px] text-center sm:text-left">
                                        <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/5 transition-colors duration-700" />
                                        
                                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-2 relative z-10 mx-auto sm:mx-0">
                                            {c.escudo_url ? (
                                                <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                                            ) : (
                                                <span className="text-2xl font-black text-white/20 uppercase">
                                                    {c.nombre.substring(0, 2)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col relative z-10 flex-1 justify-center">
                                            <span className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.3em] text-red-500 mb-2">
                                                {isDeportista ? "Representando a" : "Estudiante de"}
                                            </span>
                                            <h3 className="text-2xl sm:text-4xl font-black text-white group-hover:text-red-400 transition-colors leading-none tracking-tight">
                                                {c.nombre}
                                            </h3>
                                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/80 transition-colors">
                                                Ir al medallero de facultad <ArrowUpRight size={14} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[2.5rem] bg-[#0A0705] border border-white/5 p-8 flex items-center justify-center min-h-[160px]">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">CARRERA NO ASIGNADA</span>
                            </div>
                        )}

                        {/* ENCUENTROS RECIENTES */}
                        <div className="rounded-[2.5rem] bg-[#0A0807] border border-white/5 p-8 flex-1">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90 font-outfit">
                                    ENCUENTROS RECIENTES
                                </h3>
                                <Link href="/quiniela" className="text-[10px] font-black uppercase tracking-[0.1em] text-red-600 hover:text-red-500 transition-colors flex items-center gap-1">
                                    VER TODOS <ArrowUpRight size={14} />
                                </Link>
                            </div>

                            <div className="flex flex-col gap-3 min-h-[120px] justify-center">
                                {loadingHistory ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="animate-spin text-white/20" />
                                    </div>
                                ) : history.length > 0 ? (
                                    history.slice(0, 3).map((h, i) => {
                                        const scoreA = h.marcador_final?.goles_a ?? h.marcador_final?.sets_a ?? h.marcador_final?.total_a ?? 0;
                                        const scoreB = h.marcador_final?.goles_b ?? h.marcador_final?.sets_b ?? h.marcador_final?.total_b ?? 0;
                                        const emoji = h.disciplina ? SPORT_EMOJI[h.disciplina] : null;

                                        return (
                                            <div key={i} className="flex items-center justify-between border-t border-white/5 py-3 first:border-0 group cursor-pointer hover:bg-white/[0.02] -mx-4 px-4 transition-colors rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px]">
                                                        {emoji || h.disciplina?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em]">{h.disciplina}</p>
                                                        <p className="text-[11px] font-bold text-white group-hover:text-amber-500 transition-colors">{h.equipo_a} vs {h.equipo_b}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[11px] font-black tabular-nums">{scoreA} - {scoreB}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                                            SIN PARTICIPACIONES REGISTRADAS
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </motion.div>
                )}

                {activeTab === 'amigos' && (
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-6"
                    >
                        <FriendsList userId={user.id} />
                    </motion.div>
                )}

            </main>
        </div>
    );
}
