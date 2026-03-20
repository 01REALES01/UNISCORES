"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainNavbar } from "@/components/main-navbar";
import { supabase } from "@/lib/supabase";
import { Avatar, Button } from "@/components/ui-primitives";
import {
    Trophy,
    Star,
    LogOut,
    Mail,
    Shield,
    Medal,
    Target,
    ChevronRight,
    Loader2,
    GraduationCap,
    Users,
    Calendar,
    ArrowUpRight,
    Zap,
    Flame,
    Crown,
    BadgeCheck
} from "lucide-react";
import { FriendsList } from "@/modules/users/components/friends-list";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { isCreator } from "@/lib/constants";

type ProfileTab = 'general' | 'stats' | 'quiniela' | 'amigos';

export default function PerfilPage() {
    const { user, profile, isDeportista, isStaff, loading: authLoading, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<ProfileTab>('general');
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [carreras, setCarreras] = useState<any[]>([]);

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
            const { data } = await supabase.rpc('get_athlete_event_history', {
                athlete_profile_id: profile.id
            });
            if (data) setHistory(data);
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0805]"><UniqueLoading size="lg" /></div>;
    if (!user) return null;

    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
        : null;

    const isProjectCreator = user ? isCreator(user.email) : false;

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30 texture-grain overflow-x-hidden">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {isProjectCreator ? (
                    <>
                        <div className="absolute -top-40 right-0 w-[800px] h-[800px] bg-amber-600/10 rounded-full blur-[180px] animate-pulse duration-[10s]" />
                        <div className="absolute bottom-0 -left-40 w-[600px] h-[600px] bg-yellow-600/5 rounded-full blur-[150px]" />
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
                    </>
                ) : (
                    <>
                        <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-red-600/4 rounded-full blur-[150px]" />
                        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-orange-600/4 rounded-full blur-[120px]" />
                    </>
                )}
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-5xl mx-auto px-4 pt-8 pb-24 relative z-10">
                {/* ━━━ HERO HEADER ━━━ */}
                <motion.header
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative mb-12"
                >
                    {/* Gradient accent line */}
                    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

                    <div className="flex flex-col sm:flex-row gap-8 pt-8 pb-10 px-2 relative z-10">
                        {/* Avatar — large, read-only */}
                        <div className="relative self-center sm:self-start flex-shrink-0 group">
                            <div className={cn(
                                "absolute -inset-3 rounded-[2.5rem] blur-2xl transition-opacity",
                                isProjectCreator ? "bg-gradient-to-br from-amber-400 to-yellow-600 opacity-30 group-hover:opacity-50" : "bg-gradient-to-br from-red-600 to-orange-500 opacity-15"
                            )} />
                            
                            {isProjectCreator && (
                                <div className="absolute -inset-1 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-700 rounded-[2.8rem] opacity-50 blur-sm animate-pulse" />
                            )}

                            <Avatar
                                name={profile?.full_name || user.email}
                                src={profile?.avatar_url}
                                className={cn(
                                    "relative w-32 h-32 md:w-44 md:h-44 rounded-[2rem] shadow-2xl z-10 bg-[#0a0805]",
                                    isProjectCreator ? "border-[3px] border-amber-500/80" : "border-2 border-white/8"
                                )}
                            />
                            {isProjectCreator && (
                                <div className="absolute -bottom-4 -right-4 p-3.5 bg-gradient-to-br from-amber-300 to-yellow-600 text-[#050505] rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] border-[3px] border-[#0a0805] animate-bounce-slow z-20">
                                    <Crown size={22} className="drop-shadow-sm" />
                                </div>
                            )}
                            {isDeportista && !isProjectCreator && (
                                <div className="absolute -bottom-3 -right-3 p-3 bg-amber-500 text-black rounded-2xl shadow-xl border-4 border-[#0a0805] z-20">
                                    <Flame size={18} />
                                </div>
                            )}
                        </div>

                        {/* Identity */}
                        <div className="flex-1 flex flex-col justify-center text-center sm:text-left min-w-0">
                            {/* Role pills */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                                {isDeportista && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
                                        <Star size={9} className="fill-current" />Deportista
                                    </span>
                                )}
                                {isStaff && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest">
                                        <Shield size={9} />Staff
                                    </span>
                                )}
                            </div>

                            {/* Name */}
                            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter font-outfit leading-[0.88] mb-2 truncate">
                                {profile?.full_name || "Usuario"}
                            </h1>

                            {/* Tagline */}
                            {profile?.tagline && (
                                <p className="text-white/30 text-sm md:text-base italic font-bold mb-5 max-w-lg leading-relaxed">
                                    &ldquo;{profile.tagline}&rdquo;
                                </p>
                            )}

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
                                <span className="flex items-center gap-1.5 text-white/25 text-[11px] font-bold">
                                    <Mail size={11} />{user.email}
                                </span>
                                <div className="w-px h-3 bg-white/10 hidden sm:block" />
                                <span className="flex items-center gap-1.5 text-amber-400 font-black text-lg tabular-nums">
                                    <Trophy size={14} />{profile?.points || 0}
                                    <span className="text-white/20 font-bold text-[10px] uppercase tracking-widest ml-0.5">pts</span>
                                </span>
                                {memberSince && (
                                    <>
                                        <div className="w-px h-3 bg-white/10 hidden sm:block" />
                                        <span className="flex items-center gap-1.5 text-white/20 text-[11px] font-bold capitalize">
                                            <Calendar size={11} />{memberSince}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Sign out — subtle, top-right on desktop */}
                        <div className="hidden sm:flex items-start pt-2">
                            <button
                                onClick={() => signOut()}
                                className="p-3 rounded-2xl text-white/20 hover:text-red-500 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-all duration-300"
                                title="Cerrar sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="h-px mx-4 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                </motion.header>

                {/* ━━━ TABS ━━━ */}
                <nav className="flex gap-0 mb-10 border-b border-white/8 overflow-x-auto no-scrollbar" role="tablist">
                    <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Zap size={15} />} label="General" />
                    {isDeportista && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Medal size={15} />} label="Mi Deporte" />}
                    <TabButton active={activeTab === 'quiniela'} onClick={() => setActiveTab('quiniela')} icon={<Target size={15} />} label="Quiniela" />
                    <TabButton active={activeTab === 'amigos'} onClick={() => setActiveTab('amigos')} icon={<Users size={15} />} label="Amigos" />
                </nav>

                {/* ━━━ TAB CONTENT ━━━ */}
                <div className="min-h-[400px]">

                    {/* ── GENERAL TAB ── */}
                    {activeTab === 'general' && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left — About + Quick Stats */}
                                <div className="lg:col-span-7 space-y-8">
                                    {/* About Section */}
                                    <section className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/10 p-10 group/about">
                                        <div className="absolute top-0 right-0 p-6 opacity-[0.015] -rotate-12 group-hover/about:scale-110 transition-transform duration-1000">
                                            <GraduationCap size={200} />
                                        </div>
                                        <div className="relative z-10 space-y-5">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 font-outfit">
                                                Sobre {profile?.full_name?.split(' ')[0] || 'mí'}
                                            </h3>
                                            <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed font-outfit">
                                                {profile?.about_me || profile?.bio || "Este perfil aún no tiene una descripción. Las estadísticas y participaciones se actualizan automáticamente."}
                                            </p>
                                        </div>
                                    </section>

                                    {/* Quick Stats Grid */}
                                    {isDeportista && (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/8 text-center hover:border-green-500/20 transition-all group/stat">
                                                <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Victorias</p>
                                                <p className="text-3xl font-black font-outfit tabular-nums group-hover/stat:text-green-400 transition-colors">{profile?.wins || 0}</p>
                                            </div>
                                            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/8 text-center hover:border-white/15 transition-all">
                                                <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Derrotas</p>
                                                <p className="text-3xl font-black font-outfit tabular-nums text-white/40">{profile?.losses || 0}</p>
                                            </div>
                                            <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/8 text-center hover:border-amber-500/20 transition-all group/stat">
                                                <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Total</p>
                                                <p className="text-3xl font-black font-outfit tabular-nums group-hover/stat:text-amber-400 transition-colors">{profile?.total_score_all_time || 0}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right — Academic + Info */}
                                <div className="lg:col-span-5 space-y-6">
                                    {/* Academic Card */}
                                    <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-white/10 p-10 group/pride">
                                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/15 via-transparent to-orange-500/8 opacity-50 group-hover/pride:opacity-80 transition-opacity duration-1000" />

                                        <div className="relative z-10 space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-inner group-hover/pride:scale-105 transition-transform duration-500">
                                                    <GraduationCap className="text-red-500" size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Institución</h3>
                                                    <p className="text-sm font-black text-white font-outfit">Universidad del Norte</p>
                                                </div>
                                            </div>

                                            {isDeportista && profile?.disciplina && (
                                                <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/15">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-1.5">Disciplina</p>
                                                    <p className="text-base font-black text-amber-400 font-outfit">{profile.disciplina.name}</p>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/50 px-1">Programa Académico</h4>
                                                {carreras.length > 0 ? (
                                                    carreras.map(c => (
                                                        <Link key={c.id} href={`/carrera/${c.id}`}>
                                                            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 hover:border-red-500/30 transition-all duration-500 group/career hover:shadow-lg hover:shadow-red-500/5">
                                                                <div className="flex items-center gap-3">
                                                                    {c.escudo_url && (
                                                                        <img src={c.escudo_url} alt="" className="w-8 h-8 rounded-xl object-cover" />
                                                                    )}
                                                                    <p className="text-xs font-black text-white leading-tight uppercase tracking-tight group-hover/career:text-red-400 transition-colors">
                                                                        {c.nombre}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="p-6 rounded-3xl border-2 border-dashed border-white/5 text-center bg-black/20">
                                                        <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">Sin carrera asignada</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[11px] font-black italic text-white/20 leading-relaxed text-center">
                                                    &quot;En el campo y en el aula, la excelencia es nuestro camino.&quot;
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Sign out — mobile only */}
                                    <div className="sm:hidden">
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full p-4 rounded-2xl text-red-500/60 hover:text-red-500 bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <LogOut size={14} /> Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STATS TAB (deportistas) ── */}
                    {activeTab === 'stats' && isDeportista && (
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8"
                        >
                            {/* Performance Header */}
                            <div className="bg-gradient-to-br from-red-600/10 to-orange-600/10 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-10 opacity-10 blur-sm">
                                    <Trophy size={120} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{profile?.disciplina?.name || "Multideporte"}</p>
                                    <h3 className="text-4xl font-black tracking-tighter mb-6 font-outfit">Mi Rendimiento</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center hover:border-green-500/20 transition-all">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Victorias</span>
                                            <span className="text-4xl font-black tabular-nums font-outfit">{profile?.wins || 0}</span>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center hover:border-white/15 transition-all">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Derrotas</span>
                                            <span className="text-4xl font-black text-white/60 tabular-nums font-outfit">{profile?.losses || 0}</span>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center hover:border-orange-500/20 transition-all">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Puntos Totales</span>
                                            <span className="text-4xl font-black text-orange-500 tabular-nums font-outfit">{profile?.total_score_all_time || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Match History */}
                            <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 font-outfit">
                                        <Target size={16} className="text-red-500" /> Historial Reciente
                                    </h4>
                                    <Link href="/partidos" className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1">
                                        Ver todos <ArrowUpRight size={12} />
                                    </Link>
                                </div>

                                <div className="space-y-3">
                                    {loadingHistory ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 size={24} className="text-white/20 animate-spin" />
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.map((h, i) => (
                                            <Link key={i} href={`/partido/${h.match_id}`} className="block group/item">
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group-hover/item:border-white/15 group-hover/item:bg-white/[0.04] transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-black text-[10px]">
                                                            {h.disciplina?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-0.5">{h.disciplina}</p>
                                                            <p className="text-xs font-bold group-hover/item:text-red-400 transition-colors">
                                                                {h.equipo_a} vs {h.equipo_b}
                                                            </p>
                                                            {h.puntos_personales > 0 && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Star size={10} className="text-amber-500 fill-amber-500" />
                                                                    <span className="text-[10px] font-black text-amber-500/80">
                                                                        {h.puntos_personales} aportados
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black tabular-nums">
                                                            {h.marcador_final?.goles_a ?? h.marcador_final?.sets_a ?? h.marcador_final?.total_a ?? 0} - {h.marcador_final?.goles_b ?? h.marcador_final?.sets_b ?? h.marcador_final?.total_b ?? 0}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-white/20">{new Date(h.fecha).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center py-14 text-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                                <Trophy size={24} className="text-white/10" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest text-white/20">Sin encuentros registrados</p>
                                            <p className="text-[10px] text-white/10 mt-2 max-w-[220px]">Tus participaciones aparecerán aquí automáticamente.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Athlete Badge */}
                            <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 flex-shrink-0">
                                    <Star size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-amber-500 uppercase tracking-widest font-outfit">Atleta Verificado</p>
                                    <p className="text-xs text-white/40 font-bold leading-relaxed mt-1">
                                        Tus estadísticas se actualizan en tiempo real cuando un administrador finaliza un partido donde participas.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── QUINIELA TAB ── */}
                    {activeTab === 'quiniela' && (
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="text-center md:text-left">
                                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Ranking de Predicciones</p>
                                        <h3 className="text-4xl font-black tracking-tighter mb-2 font-outfit">{profile?.points || 0} <span className="text-xl text-white/30">puntos</span></h3>
                                        <p className="text-white/40 text-sm font-bold">Predice resultados y sube en el ranking global.</p>
                                    </div>
                                    <Link href="/quiniela">
                                        <Button className="rounded-2xl bg-white text-black font-black uppercase tracking-widest px-10 h-14 hover:bg-indigo-50 transition-all text-sm">
                                            Ir a la Quiniela <ChevronRight size={18} className="ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── AMIGOS TAB ── */}
                    {activeTab === 'amigos' && user && (
                        <motion.div
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <FriendsList userId={user.id} />
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            role="tab"
            aria-selected={active}
            className={cn(
                "flex items-center justify-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all outline-none relative border-b-2 -mb-px whitespace-nowrap focus-visible:ring-2 focus-visible:ring-red-500",
                active
                    ? "text-white border-red-500"
                    : "text-white/30 border-transparent hover:text-white/60 hover:border-white/20"
            )}
        >
            {icon}
            <span className="hidden sm:inline font-outfit">{label}</span>
        </button>
    );
}
