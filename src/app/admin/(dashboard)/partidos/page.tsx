"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Plus, Calendar, Clock, Zap, ArrowUpRight, Trash2, Search, MapPin, TrendingUp, Trophy, Activity, Loader2, Crown, Handshake } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import { Card, Badge, Avatar, LiveIndicator } from "@/components/ui-primitives";
import { CreateMatchModal } from "@/components/create-match-modal";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
    const router = useRouter();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchPartidos = useCallback(async () => {
        const { data } = await safeQuery(
            supabase.from('partidos').select(`*, disciplinas(name), delegacion_a, delegacion_b, carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)`).order('created_at', { ascending: false }),
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

    const deletePartido = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de eliminar este partido?')) return;
        setDeletingId(id);
        await supabase.from('partidos').delete().eq('id', id);
        await fetchPartidos();
        setDeletingId(null);
    };

    const filteredPartidos = partidos.filter(p => {
        if (filter === 'en_vivo' && p.estado !== 'en_vivo') return false;
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

    const liveCount = partidos.filter(p => p.estado === 'en_vivo').length;
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
            label: 'En Vivo',
            value: liveCount,
            icon: Zap,
            gradient: 'from-rose-500 to-orange-500',
            glowColor: 'rose',
            filterKey: 'en_vivo',
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
            {/* ─── HERO HEADER ─── */}
            <div className="relative overflow-hidden rounded-3xl bg-[#17130D]/60 backdrop-blur-xl border border-white/5 p-8 sm:p-10">
                {/* Ambient orbs */}
                <div className="absolute top-[-40%] right-[-10%] w-[400px] h-[400px] bg-red-600/15 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-30%] left-[-5%] w-[300px] h-[300px] bg-orange-600/10 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/25">
                                <Activity size={22} className="text-white" />
                            </div>
                            {liveCount > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] font-black tracking-widest uppercase animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    {liveCount} EN VIVO
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent leading-tight">
                            Gestión de Partidos
                        </h1>
                        <p className="text-slate-500 mt-1.5 text-sm font-medium">
                            Administra marcadores y eventos en tiempo real
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="shrink-0 h-12 px-6 rounded-2xl bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 text-white font-bold shadow-xl shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all border-0"
                    >
                        <Plus size={18} className="mr-2" />
                        Nuevo Partido
                    </Button>
                </div>
            </div>

            {/* ─── STATS CARDS ─── */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {statsConfig.map((stat) => {
                    const isActive = filter === stat.filterKey;
                    const Icon = stat.icon;
                    return (
                        <button
                            key={stat.label}
                            onClick={() => setFilter(filter === stat.filterKey ? 'todos' : stat.filterKey)}
                            className={cn(
                                "relative group p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden backdrop-blur-md",
                                isActive
                                    ? "border-white/15 bg-white/10 shadow-lg ring-1 ring-white/10"
                                    : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10"
                            )}
                        >
                            {/* Hover glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={cn(
                                        "p-2 rounded-xl transition-all duration-300",
                                        isActive
                                            ? `bg-gradient-to-br ${stat.gradient} shadow-md`
                                            : "bg-white/5 group-hover:bg-white/10"
                                    )}>
                                        <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                                    </div>
                                    {stat.pulse && (
                                        <span className="flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-500 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-lg shadow-rose-500/50" />
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">{stat.label}</p>
                                <p className={cn(
                                    "text-3xl font-black tabular-nums tracking-tight transition-colors",
                                    isActive ? "text-white" : "text-white/60"
                                )}>
                                    {stat.value}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ─── FILTERS BAR ─── */}
            <div className="relative overflow-hidden rounded-2xl bg-[#17130D]/40 backdrop-blur-md border border-white/5 p-4 space-y-3">
                {/* Search */}
                <SuggestiveSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    suggestions={["Buscar por equipo...", "Buscar por jugador...", "Filtra por universidad..."]}
                    className="h-11 rounded-xl bg-white/5 border border-white/10 focus-within:border-red-500/50 focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-red-500/10 transition-all w-full"
                />

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Sport Filter */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
                        <button
                            onClick={() => setSportFilter('todos')}
                            className={cn(
                                "px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200",
                                sportFilter === 'todos'
                                    ? "bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-md shadow-red-500/25"
                                    : "text-slate-500 hover:text-white hover:bg-white/10"
                            )}
                        >
                            Todos
                        </button>
                        {uniqueSports.map(sport => (
                            <button
                                key={sport}
                                onClick={() => setSportFilter(sportFilter === sport ? 'todos' : sport)}
                                className={cn(
                                    "px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5",
                                    sportFilter === sport
                                        ? "bg-gradient-to-r from-red-500 to-orange-600 text-white shadow-md shadow-red-500/25"
                                        : "text-slate-500 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <span className="text-sm leading-none">{SPORT_EMOJI[sport] || '🏅'}</span>
                                <span className="hidden sm:inline">{sport}</span>
                            </button>
                        ))}
                    </div>

                    {/* Gender Filter */}
                    <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 shrink-0">
                        {[
                            { value: 'todos', label: 'Todos', icon: '🏅', activeClass: 'from-red-500 to-orange-600' },
                            { value: 'masculino', label: 'M', icon: '♂', activeClass: 'from-red-500 to-red-600' },
                            { value: 'femenino', label: 'F', icon: '♀', activeClass: 'from-pink-500 to-pink-600' },
                            { value: 'mixto', label: 'Mix', icon: '⚤', activeClass: 'from-purple-500 to-purple-600' },
                        ].map(g => (
                            <button
                                key={g.value}
                                onClick={() => setGenderFilter(genderFilter === g.value ? 'todos' : g.value)}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5",
                                    genderFilter === g.value
                                        ? `bg-gradient-to-r ${g.activeClass} text-white shadow-md`
                                        : "text-slate-500 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <span>{g.icon}</span>
                                <span>{g.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPartidos.map((partido) => {
                        const isLive = partido.estado === 'en_vivo';
                        const isFinished = partido.estado === 'finalizado';
                        const score = getScore(partido);
                        const sportName = partido.disciplinas?.name || 'Deporte';
                        const emoji = SPORT_EMOJI[sportName] || '🏅';
                        const gradient = SPORT_GRADIENT[sportName] || 'from-slate-500/20 to-slate-600/5';
                        const accent = SPORT_ACCENT[sportName] || 'border-white/5';

                        return (
                            <div
                                key={partido.id}
                                onClick={() => router.push(`/admin/partidos/${partido.id}`)}
                                className={cn(
                                    "relative group rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 backdrop-blur-md",
                                    isLive
                                        ? "border-rose-500/30 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/10"
                                        : `${accent} bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15`
                                )}
                            >
                                {/* Sport gradient background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />

                                {/* Content */}
                                <div className="relative p-5">
                                    {/* Top row - sport + status */}
                                    <div className="flex justify-between items-center mb-5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center text-lg border border-white/10">
                                                {emoji}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{sportName}</span>
                                                <span className={cn(
                                                    "text-[9px] font-bold px-0 leading-tight",
                                                    (partido.genero || 'masculino') === 'femenino' ? 'text-pink-400' :
                                                        (partido.genero || 'masculino') === 'mixto' ? 'text-purple-400' :
                                                            'text-red-400'
                                                )}>
                                                    {(partido.genero || 'masculino') === 'femenino' ? '♀ Femenino' : (partido.genero || 'masculino') === 'mixto' ? '⚤ Mixto' : '♂ Masculino'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isLive && <LiveIndicator />}
                                            {isFinished && (
                                                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/5 text-slate-500 tracking-wider border border-white/10">
                                                    Final
                                                </span>
                                            )}
                                            {!isLive && !isFinished && (
                                                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 tracking-wider border border-cyan-500/20">
                                                    Programado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Teams & Score */}
                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-5">
                                        {/* Team A */}
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <Avatar name={getDisplayName(partido, 'a')} size="default" className="ring-2 ring-white/10 shadow-lg" />
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={cn("text-sm font-bold leading-tight truncate max-w-[90px]", score.a > score.b && isFinished ? "text-red-400" : "text-white")}>
                                                    {getDisplayName(partido, 'a')}
                                                </span>
                                                {getCarreraSubtitle(partido, 'a') && (
                                                    <span className="text-[9px] text-slate-500 font-medium truncate max-w-[90px]">{getCarreraSubtitle(partido, 'a')}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex flex-col items-center justify-center">
                                            {sportName === 'Ajedrez' ? (
                                                <div className="flex flex-col items-center gap-1.5">
                                                    {isFinished && partido.marcador_detalle?.resultado_final ? (
                                                        partido.marcador_detalle.resultado_final === 'empate' ? (
                                                            <div className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-white/20 flex flex-col items-center">
                                                                <Handshake size={20} />
                                                                <span className="text-[10px] uppercase font-bold text-white tracking-widest mt-0.5">Empate</span>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 backdrop-blur-sm px-4 py-1.5 rounded-xl border border-amber-500/30 flex flex-col items-center">
                                                                <Crown size={20} className="mb-0.5" />
                                                                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider text-center leading-tight">Ganador:<br/>{getDisplayName(partido, partido.marcador_detalle.resultado_final === 'victoria_a' ? 'a' : 'b')}</span>
                                                            </div>
                                                        )
                                                    ) : isLive ? (
                                                        <span className="text-sm font-black text-rose-400 bg-rose-500/10 px-4 py-1.5 rounded-xl border border-rose-500/30 animate-pulse uppercase tracking-wide">
                                                            EN VIVO
                                                        </span>
                                                    ) : (
                                                        <div className="bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                                                            <span className="text-xl font-black text-white/40 tracking-widest">VS</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                            <div className="bg-black/30 backdrop-blur-sm px-5 py-2 rounded-2xl border border-white/5 flex items-center">
                                                <span className={cn("text-3xl font-black font-mono tabular-nums", score.a > score.b && isFinished ? "text-red-400" : "text-white")}>
                                                    {score.a}
                                                </span>
                                                <span className="text-xl font-bold text-white/15 mx-1.5">:</span>
                                                <span className={cn("text-3xl font-black font-mono tabular-nums", score.b > score.a && isFinished ? "text-red-400" : "text-white")}>
                                                    {score.b}
                                                </span>
                                            </div>
                                            {isLive && (
                                                <span className="mt-2 text-[10px] font-black text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 animate-pulse uppercase tracking-wider">
                                                    En Juego
                                                </span>
                                            )}
                                                </>
                                            )}
                                        </div>

                                        {/* Team B */}
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <Avatar name={getDisplayName(partido, 'b')} size="default" className="ring-2 ring-white/10 shadow-lg" />
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={cn("text-sm font-bold leading-tight text-slate-400 truncate max-w-[90px]", score.b > score.a && isFinished ? "text-red-400" : "")}>
                                                    {getDisplayName(partido, 'b')}
                                                </span>
                                                {getCarreraSubtitle(partido, 'b') && (
                                                    <span className="text-[9px] text-slate-500 font-medium truncate max-w-[90px]">{getCarreraSubtitle(partido, 'b')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom bar */}
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={11} />
                                                <span className="text-[11px]">
                                                    {new Date(partido.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                                    {' · '}
                                                    {new Date(partido.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={11} />
                                                <span className="text-[10px] text-slate-600">{partido.lugar || 'Coliseo Central'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={(e) => deletePartido(partido.id, e)}
                                                className="p-2 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                                title="Eliminar partido"
                                            >
                                                {deletingId === partido.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/admin/partidos/${partido.id}`);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all"
                                            >
                                                Controlar
                                                <ArrowUpRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
        </div>
    );
}
