"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Plus, Calendar, Clock, Zap, ArrowUpRight, Trash2, Search, MapPin, TrendingUp, Trophy, Activity, Loader2, Crown, Handshake, AlertTriangle, X, Users } from "lucide-react";
import { toast } from "sonner";
import UniqueLoading from "@/components/ui/morph-loading";
import { Card, Badge, Avatar, LiveIndicator } from "@/components/ui-primitives";
import { CreateMatchModal } from "@/components/create-match-modal";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { SPORT_EMOJI } from "@/lib/constants";
import { getDisplayName, getCarreraName, getCarreraSubtitle } from "@/lib/sport-helpers";

const SPORT_GRADIENT: Record<string, string> = {
    'Fútbol': 'from-emerald-500/20 to-emerald-900/5',
    'Baloncesto': 'from-orange-500/20 to-orange-900/5',
    'Voleibol': 'from-red-500/20 to-red-900/5',
    'Tenis': 'from-lime-500/20 to-lime-900/5',
    'Tenis de Mesa': 'from-rose-500/20 to-rose-900/5',
    'Ajedrez': 'from-slate-500/20 to-slate-900/5',
    'Natación': 'from-cyan-500/20 to-cyan-900/5',
};

const SPORT_ACCENT: Record<string, string> = {
    'Fútbol': 'border-emerald-500/30',
    'Baloncesto': 'border-orange-500/30',
    'Voleibol': 'border-red-500/30',
    'Tenis': 'border-lime-500/30',
    'Tenis de Mesa': 'border-rose-500/30',
    'Ajedrez': 'border-slate-500/30',
    'Natación': 'border-cyan-500/30',
};

export default function PartidosPage() {
    const [partidos, setPartidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todos');
    const [sportFilter, setSportFilter] = useState('todos');
    const [genderFilter, setGenderFilter] = useState('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [matchToDelete, setMatchToDelete] = useState<any>(null);
    const router = useRouter();
    const { isPeriodista } = useAuth();
    const { logAction } = useAuditLogger();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isPeriodista) {
            router.push('/admin/noticias');
        }
    }, [isPeriodista, router]);

    const fetchPartidos = useCallback(async () => {
        const { data } = await safeQuery(
            supabase.from('partidos').select(`*, disciplinas(name), delegacion_a, delegacion_b, carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)`).order('created_at', { ascending: false }),
            'admin-partidos'
        );
        if (data) setPartidos(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPartidos();

        const channel = supabase
            .channel('realtime-partidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => fetchPartidos(), 800);
            })
            .subscribe();

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            supabase.removeChannel(channel);
        };
    }, [fetchPartidos]);

    const confirmDelete = async () => {
        if (!matchToDelete) return;
        setDeletingId(matchToDelete.id);
        
        try {
            // 1. Clean related tables just in case DB cascade is missing
            await supabase.from('olympics_eventos').delete().eq('partido_id', matchToDelete.id);
            await supabase.from('olympics_jugadores').delete().eq('partido_id', matchToDelete.id);
            await supabase.from('pronosticos').delete().eq('match_id', matchToDelete.id);
            await supabase.from('noticias').update({ partido_id: null }).eq('partido_id', matchToDelete.id);
            
            // 2. Delete Match (using .select() to confirm row removal)
            const { data, error } = await supabase.from('partidos').delete().eq('id', matchToDelete.id).select();
            
            if (error) {
                toast.error("Error BD: " + error.message);
            } else if (!data || data.length === 0) {
                toast.error("Alerta BBDD: Permisos insuficientes (RLS) para borrar, contacta soporte.");
            } else {
                toast.success("Partido eliminado permanentemente.");
                
                // Log Action
                await logAction('DELETE_MATCH', 'partido', matchToDelete.id, {
                    equipoA: matchToDelete.equipo_a,
                    equipoB: matchToDelete.equipo_b,
                    disciplina: matchToDelete.disciplinas?.name
                });

                await fetchPartidos();
            }
        } catch (err: any) {
            toast.error("Error al procesar: " + err.message);
        } finally {
            setDeletingId(null);
            setMatchToDelete(null);
        }
    };

    const filteredPartidos = partidos.filter(p => {
        if (filter === 'en_curso' && p.estado !== 'en_curso') return false;
        if (filter === 'programados' && p.estado !== 'programado') return false;
        if (filter === 'finalizados' && p.estado !== 'finalizado') return false;
        if (sportFilter !== 'todos' && p.disciplinas?.name !== sportFilter) return false;
        if (genderFilter !== 'todos' && (p.genero || 'masculino') !== genderFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const dispA = getDisplayName(p, 'a');
            const dispB = getDisplayName(p, 'b');
            const carA = getCarreraName(p, 'a');
            const carB = getCarreraName(p, 'b');
            if (!dispA.toLowerCase().includes(q) && !dispB.toLowerCase().includes(q) && !carA.toLowerCase().includes(q) && !carB.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const liveCount = partidos.filter(p => p.estado === 'en_curso').length;
    const programadosCount = partidos.filter(p => p.estado === 'programado').length;
    const finalizadosCount = partidos.filter(p => p.estado === 'finalizado').length;
    const uniqueSports = Array.from(new Set(partidos.map(p => p.disciplinas?.name).filter(Boolean)));

    const getScore = (p: any) => {
        const md = p.marcador_detalle || {};
        return {
            a: md.goles_a ?? md.total_a ?? md.sets_a ?? 0,
            b: md.goles_b ?? md.total_b ?? md.sets_b ?? 0,
        };
    };

    const statsConfig = [
        {
            label: 'Total',
            value: partidos.length,
            icon: TrendingUp,
            gradient: 'from-red-500 to-orange-600',
            glowColor: 'red',
            filterKey: 'todos',
        },
        {
            label: 'En Curso',
            value: liveCount,
            icon: Zap,
            gradient: 'from-rose-500 to-orange-500',
            glowColor: 'rose',
            filterKey: 'en_curso',
            pulse: liveCount > 0,
        },
        {
            label: 'Programados',
            value: programadosCount,
            icon: Calendar,
            gradient: 'from-cyan-500 to-red-600',
            glowColor: 'cyan',
            filterKey: 'programados',
        },
        {
            label: 'Finalizados',
            value: finalizadosCount,
            icon: Trophy,
            gradient: 'from-emerald-500 to-teal-600',
            glowColor: 'emerald',
            filterKey: 'finalizados',
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ─── HERO HEADER "Cyber-Olympic Luxury" ─── */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-[#0c0a09]/60 backdrop-blur-2xl border border-white/5 p-10 group"
            >
                {/* Background Pattern - Moving Noise & Orbs */}
                <motion.div 
                    animate={{ 
                        backgroundPosition: ["0% 0%", "100% 100%"],
                        opacity: [0.3, 0.4, 0.3]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200%_200%] mix-blend-overlay pointer-events-none"
                />
                
                <div className="absolute top-[-30%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-20%] left-0 w-[400px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3"
                        >
                            <div className="px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                Admin Control Center
                            </div>
                            {liveCount > 0 && (
                                <motion.span 
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black tracking-widest uppercase"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                                    {liveCount} En Juego
                                </motion.span>
                            )}
                        </motion.div>
                        
                        <div className="space-y-1">
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white leading-[0.9] flex flex-col">
                                <span className="text-primary/80">Gestión de</span>
                                <span>Partidos</span>
                            </h1>
                            <p className="text-zinc-400 text-sm font-medium tracking-tight max-w-md">
                                Monitorea y controla eventos deportivos en tiempo real con precisión milimétrica.
                            </p>
                        </div>
                    </div>

                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-16 px-8 rounded-[1.5rem] bg-gradient-to-br from-primary via-primary to-orange-700 text-white text-sm font-black uppercase tracking-widest shadow-[0_20px_40px_-15px_rgba(239,68,68,0.4)] border-0 relative overflow-hidden group/btn"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                            <div className="relative flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/20">
                                    <Plus size={20} strokeWidth={3} />
                                </div>
                                Lanzar Nuevo Partido
                            </div>
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
             {/* ─── STATS CARDS "Tech Pods" ─── */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {statsConfig.map((stat, index) => {
                    const isActive = filter === stat.filterKey;
                    const Icon = stat.icon;
                    return (
                        <motion.button
                            key={stat.label}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 + 0.4 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFilter(filter === stat.filterKey ? 'todos' : stat.filterKey)}
                            className={cn(
                                "relative group p-6 rounded-[2rem] border text-left transition-all duration-500 overflow-hidden backdrop-blur-xl",
                                isActive
                                    ? "border-primary/20 bg-primary/5 shadow-2xl ring-1 ring-primary/20"
                                    : "border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-white/10"
                            )}
                        >
                            {/* Inner Shine Effect */}
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                        isActive
                                            ? `bg-gradient-to-br ${stat.gradient} shadow-lg shadow-primary/25`
                                            : "bg-white/5 group-hover:bg-white/10"
                                    )}>
                                        <Icon size={20} className={isActive ? "text-white" : "text-zinc-500"} />
                                    </div>
                                    {stat.pulse && (
                                        <div className="relative flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                                            <span className="flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-500 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                            </span>
                                            <span className="text-[8px] font-black text-rose-500 uppercase">Live</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase">{stat.label}</p>
                                    <p className={cn(
                                        "text-4xl font-black tabular-nums tracking-tighter transition-all duration-500",
                                        isActive ? "text-white drop-shadow-md lg:text-5xl" : "text-white/40 group-hover:text-white/60"
                                    )}>
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
             {/* ─── FILTERS BAR "Glass Bar" ─── */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="relative overflow-hidden rounded-[2rem] bg-zinc-950/40 backdrop-blur-xl border border-white/5 p-6 space-y-5"
            >
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    {/* Search Premium */}
                    <div className="relative w-full lg:flex-1">
                        <SuggestiveSearch
                            value={searchQuery}
                            onChange={setSearchQuery}
                            suggestions={["Buscar por equipo...", "Buscar por jugador...", "Filtra por universidad..."]}
                            className="h-14 rounded-2xl bg-black/40 border border-white/10 focus-within:border-primary/50 focus-within:bg-black/60 focus-within:ring-4 focus-within:ring-primary/10 transition-all w-full text-sm font-bold placeholder:text-zinc-600"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        {/* Sport Filter Scrollable */}
                        <div className="flex gap-2 p-1.5 rounded-[1.25rem] bg-black/40 border border-white/5 overflow-x-auto no-scrollbar max-w-full">
                            <button
                                onClick={() => setSportFilter('todos')}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                                    sportFilter === 'todos'
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                                )}
                            >
                                All
                            </button>
                            {uniqueSports.map(sport => (
                                <button
                                    key={sport}
                                    onClick={() => setSportFilter(sportFilter === sport ? 'todos' : sport)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap flex items-center gap-2",
                                        sportFilter === sport
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-zinc-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span>{SPORT_EMOJI[sport]}</span>
                                    <span>{sport}</span>
                                </button>
                            ))}
                        </div>

                        {/* Gender Filter Buttons */}
                        <div className="flex gap-1.5 p-1.5 rounded-[1.25rem] bg-black/40 border border-white/5 shrink-0">
                            {[
                                { value: 'masculino', label: '♂', color: 'bg-primary' },
                                { value: 'femenino', label: '♀', color: 'bg-pink-600' },
                                { value: 'mixto', label: '⚤', color: 'bg-purple-600' },
                            ].map(g => (
                                <button
                                    key={g.value}
                                    onClick={() => setGenderFilter(genderFilter === g.value ? 'todos' : g.value)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl text-lg font-black transition-all duration-500 flex items-center justify-center",
                                        genderFilter === g.value
                                            ? `${g.color} text-white shadow-lg scale-110`
                                            : "text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                                    )}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── MATCHES GRID ─── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <UniqueLoading size="lg" />
                </div>
            ) : filteredPartidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Calendar size={40} className="text-white/15" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-white">Sin partidos</p>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs">
                            {searchQuery ? 'No se encontraron resultados para tu búsqueda' : 'Crea tu primer partido para comenzar'}
                        </p>
                    </div>
                    {!searchQuery && (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white border-0 shadow-lg shadow-red-500/25"
                        >
                            <Plus size={16} className="mr-1" /> Crear Partido
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                    {filteredPartidos.map((partido, index) => {
                        const isLive = partido.estado === 'en_curso';
                        const isFinished = partido.estado === 'finalizado';
                        const score = getScore(partido);
                        const sportName = partido.disciplinas?.name || 'Deporte';
                        const emoji = SPORT_EMOJI[sportName] || '🏅';
                        const gradient = SPORT_GRADIENT[sportName] || 'from-slate-500/20 to-slate-600/5';
                        const accent = SPORT_ACCENT[sportName] || 'border-white/5';

                        return (
                            <motion.div
                                key={partido.id}
                                layout
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ delay: index * 0.05 + 1 }}
                                whileHover={{ y: -8 }}
                                onClick={() => router.push(`/admin/partidos/${partido.id}`)}
                                className={cn(
                                    "group relative rounded-[2.5rem] border overflow-hidden cursor-pointer transition-all duration-700 backdrop-blur-3xl",
                                    isLive
                                        ? "border-rose-500/40 bg-rose-500/[0.03] shadow-2xl shadow-rose-500/10"
                                        : "border-white/5 bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-white/20 hover:shadow-2xl"
                                )}
                            >
                                {/* Sport Backdrop Gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />
                                
                                {/* Top Content Container */}
                                <div className="relative p-6 space-y-6">
                                    {/* Header: Sport & Status Info */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                                                {emoji}
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-300 transition-colors">{sportName}</h4>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border w-fit mt-1",
                                                    (partido.genero || 'masculino') === 'femenino' ? 'border-pink-500/30 text-pink-400 bg-pink-500/5' :
                                                    (partido.genero || 'masculino') === 'mixto' ? 'border-purple-500/30 text-purple-400 bg-purple-500/5' :
                                                    'border-blue-500/30 text-blue-400 bg-blue-500/5'
                                                )}>
                                                    {partido.genero || 'masculino'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {isLive ? (
                                                <motion.div 
                                                    animate={{ opacity: [1, 0.5, 1] }} 
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                    className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> ON AIR
                                                </motion.div>
                                            ) : isFinished ? (
                                                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-widest border border-white/5">
                                                    Archive
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-widest border border-cyan-500/30 flex items-center gap-1.5">
                                                    <Calendar size={10} /> SCHED
                                                </span>
                                            )}
                                            {isLive && (
                                                <span className="text-[10px] font-mono font-black text-rose-400/80 tracking-tighter italic">
                                                    LIVE CONTROL
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Scoreboard Area */}
                                    {partido.marcador_detalle?.tipo === 'carrera' ? (
                                        <div className="py-2 flex flex-col items-center gap-4">
                                            <div className="text-center group-hover:scale-105 transition-transform">
                                                <h3 className="text-xl font-black text-white tracking-tighter">
                                                    {partido.marcador_detalle?.distancia && partido.marcador_detalle?.estilo
                                                        ? `${partido.marcador_detalle.distancia} ${partido.marcador_detalle.estilo}`
                                                        : partido.equipo_a}
                                                </h3>
                                                {partido.marcador_detalle?.serie && (
                                                    <span className="text-[10px] text-primary font-black uppercase tracking-[0.3em] opacity-80 mt-1 block">
                                                        Heat #{partido.marcador_detalle.serie}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                                <Users size={14} className="text-zinc-600" />
                                                <span className="text-[10px] font-black text-zinc-500 uppercase">{(partido.marcador_detalle?.participantes || []).length} Competidores</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4">
                                            {/* Local */}
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="relative group/avatar">
                                                    <Avatar name={getDisplayName(partido, 'a')} src={partido.carrera_a?.escudo_url} className="w-16 h-16 rounded-[1.25rem] border-2 border-white/5 ring-4 ring-black/20 group-hover/avatar:scale-105 transition-all duration-500" />
                                                    {score.a > score.b && isFinished && (
                                                        <div className="absolute -top-2 -right-2 bg-primary p-1.5 rounded-lg shadow-xl shadow-primary/40 rotate-12">
                                                            <Trophy size={14} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-white truncate max-w-[100px] leading-tight">{getDisplayName(partido, 'a')}</p>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase">{getCarreraSubtitle(partido, 'a')}</p>
                                                </div>
                                            </div>

                                            {/* CENTER SCORE */}
                                            <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-black/40 border border-white/5 shadow-inner">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn("text-4xl font-black font-mono tracking-tighter tabular-nums", score.a > score.b && isFinished ? "text-primary" : "text-white")}>{score.a}</span>
                                                    <span className="text-2xl font-black text-zinc-800">:</span>
                                                    <span className={cn("text-4xl font-black font-mono tracking-tighter tabular-nums", score.b > score.a && isFinished ? "text-primary" : "text-white")}>{score.b}</span>
                                                </div>
                                                {isLive && (
                                                    <div className="mt-2 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest whitespace-nowrap">Gaming</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Visitante */}
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="relative group/avatar">
                                                    <Avatar name={getDisplayName(partido, 'b')} src={partido.carrera_b?.escudo_url} className="w-16 h-16 rounded-[1.25rem] border-2 border-white/5 ring-4 ring-black/20 group-hover/avatar:scale-105 transition-all duration-500" />
                                                    {score.b > score.a && isFinished && (
                                                        <div className="absolute -top-2 -left-2 bg-primary p-1.5 rounded-lg shadow-xl shadow-primary/40 -rotate-12">
                                                            <Trophy size={14} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-white truncate max-w-[100px] leading-tight">{getDisplayName(partido, 'b')}</p>
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase">{getCarreraSubtitle(partido, 'b')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Footer */}
                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                                <Clock size={12} className="text-primary/60" />
                                                <span className="text-[11px] font-black tracking-tight italic">
                                                    {new Date(partido.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-600">
                                                <MapPin size={11} />
                                                <span className="text-[10px] font-bold uppercase tracking-tighter truncate max-w-[120px]">{partido.lugar || 'Arena'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.1, rotate: 10 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); setMatchToDelete(partido); }}
                                                className="p-3 rounded-2xl bg-zinc-950/60 border border-white/5 text-zinc-600 hover:text-rose-500 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                {deletingId === partido.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </motion.button>
                                            
                                            <motion.button
                                                whileHover={{ x: 3 }}
                                                className="px-5 py-3 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-[0.1em] shadow-lg shadow-primary/20 flex items-center gap-2 group/btn"
                                            >
                                                Control
                                                <ArrowUpRight size={14} className="group-hover/btn:rotate-45 transition-transform" />
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Shine Line */}
                                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                </div>
            )}

            {/* Results Count */}
            {!loading && filteredPartidos.length > 0 && (
                <p className="text-center text-xs text-slate-600 pt-2 font-medium">
                    Mostrando {filteredPartidos.length} de {partidos.length} partidos
                </p>
            )}

            {/* Modal */}
            <CreateMatchModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchPartidos();
                }}
            />
            
            {/* DELETE MODAL */}
            {matchToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deletingId && setMatchToDelete(null)} />
                    <div className="relative bg-[#17130D] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header bg */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-rose-500/20 to-transparent" />
                        
                        <button 
                            onClick={() => !deletingId && setMatchToDelete(null)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 z-20 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="p-8 pt-12 flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 relative">
                                <AlertTriangle size={32} />
                                <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full" />
                            </div>
                            
                            <h3 className="text-xl font-black text-white mb-2">¿Eliminar Partido?</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                Esta acción <strong className="text-rose-400">no se puede deshacer</strong>. Se perderán todos los eventos y estadísticas de este partido.
                            </p>

                            <div className="flex gap-3 w-full">
                                <Button 
                                    onClick={() => setMatchToDelete(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold tracking-widest uppercase text-xs border border-white/10"
                                    disabled={deletingId !== null}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={confirmDelete}
                                    className="flex-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold tracking-widest uppercase text-xs border-none"
                                    disabled={deletingId !== null}
                                >
                                    {deletingId === matchToDelete.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        "Eliminar"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
