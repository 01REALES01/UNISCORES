"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { Plus, Calendar, Clock, Loader2, Zap, Filter, ArrowUpRight, Trash2, MoreVertical, Search } from "lucide-react";
import { Card, Badge, Avatar, LiveIndicator } from "@/components/ui-primitives";
import { CreateMatchModal } from "@/components/create-match-modal";
import { useRouter } from "next/navigation";

const SPORT_EMOJI: Record<string, string> = {
    'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
    'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
};

const SPORT_GRADIENT: Record<string, string> = {
    'Fútbol': 'from-emerald-500/20 to-green-600/5',
    'Baloncesto': 'from-orange-500/20 to-amber-600/5',
    'Voleibol': 'from-blue-500/20 to-cyan-600/5',
    'Tenis': 'from-lime-500/20 to-green-500/5',
    'Tenis de Mesa': 'from-red-500/20 to-pink-600/5',
    'Ajedrez': 'from-slate-500/20 to-zinc-700/5',
    'Natación': 'from-cyan-500/20 to-blue-600/5',
};

const SPORT_ACCENT: Record<string, string> = {
    'Fútbol': 'border-emerald-500/30',
    'Baloncesto': 'border-orange-500/30',
    'Voleibol': 'border-blue-500/30',
    'Tenis': 'border-lime-500/30',
    'Tenis de Mesa': 'border-red-500/30',
    'Ajedrez': 'border-slate-500/30',
    'Natación': 'border-cyan-500/30',
};

export default function PartidosPage() {
    const [partidos, setPartidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todos');
    const [sportFilter, setSportFilter] = useState('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchPartidos();

        const channel = supabase
            .channel('realtime-partidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                fetchPartidos();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchPartidos = async () => {
        const { data } = await supabase
            .from('partidos')
            .select(`*, disciplinas(name)`)
            .order('created_at', { ascending: false });

        if (data) setPartidos(data);
        setLoading(false);
    };

    const deletePartido = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Estás seguro de eliminar este partido?')) return;
        setDeletingId(id);
        await supabase.from('partidos').delete().eq('id', id);
        await fetchPartidos();
        setDeletingId(null);
    };

    const filteredPartidos = partidos.filter(p => {
        // State filter
        if (filter === 'en_vivo' && p.estado !== 'en_vivo') return false;
        if (filter === 'programados' && p.estado !== 'programado') return false;
        if (filter === 'finalizados' && p.estado !== 'finalizado') return false;
        // Sport filter
        if (sportFilter !== 'todos' && p.disciplinas?.name !== sportFilter) return false;
        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!p.equipo_a.toLowerCase().includes(q) && !p.equipo_b.toLowerCase().includes(q)) return false;
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Gestión de Partidos
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Administra marcadores y eventos en tiempo real
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    <Plus size={18} />
                    Nuevo Partido
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[
                    { label: 'Total', value: partidos.length, icon: '📊', color: 'text-white', active: filter === 'todos', onClick: () => setFilter('todos') },
                    { label: 'En Vivo', value: liveCount, icon: '🔴', color: 'text-red-400', active: filter === 'en_vivo', onClick: () => setFilter(filter === 'en_vivo' ? 'todos' : 'en_vivo'), pulse: liveCount > 0 },
                    { label: 'Programados', value: programadosCount, icon: '📅', color: 'text-blue-400', active: filter === 'programados', onClick: () => setFilter(filter === 'programados' ? 'todos' : 'programados') },
                    { label: 'Finalizados', value: finalizadosCount, icon: '✅', color: 'text-emerald-400', active: filter === 'finalizados', onClick: () => setFilter(filter === 'finalizados' ? 'todos' : 'finalizados') },
                ].map((stat) => (
                    <button
                        key={stat.label}
                        onClick={stat.onClick}
                        className={`relative p-4 rounded-2xl border text-left transition-all duration-300 group overflow-hidden ${stat.active
                                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-lg shadow-primary/10'
                                : 'border-border/20 bg-muted/10 hover:border-border/40 hover:bg-muted/20'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{stat.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                        </div>
                        <span className={`text-3xl font-black ${stat.active ? stat.color : ''}`}>{stat.value}</span>
                        {stat.pulse && (
                            <span className="absolute top-3 right-3 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search + Sport Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por equipo o jugador..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl border-2 border-border/30 bg-muted/10 text-sm font-medium placeholder:text-muted-foreground/40 focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Sport Filter */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar bg-muted/10 p-1.5 rounded-xl border border-border/20">
                    <button
                        onClick={() => setSportFilter('todos')}
                        className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${sportFilter === 'todos'
                                ? 'bg-primary text-white shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                            }`}
                    >
                        Todos
                    </button>
                    {uniqueSports.map(sport => (
                        <button
                            key={sport}
                            onClick={() => setSportFilter(sportFilter === sport ? 'todos' : sport)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${sportFilter === sport
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                }`}
                        >
                            <span>{SPORT_EMOJI[sport] || '🏅'}</span>
                            <span className="hidden sm:inline">{sport}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Matches Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-sm text-muted-foreground animate-pulse">Cargando partidos...</p>
                </div>
            ) : filteredPartidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="p-6 rounded-3xl bg-muted/10 border-2 border-dashed border-border/30">
                        <Calendar size={48} className="text-muted-foreground/20" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg">No hay partidos</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            {searchQuery ? 'No se encontraron resultados para tu búsqueda' : 'Crea tu primer partido para empezar'}
                        </p>
                    </div>
                    {!searchQuery && (
                        <Button onClick={() => setIsCreateModalOpen(true)} className="mt-2">
                            <Plus size={16} /> Crear Partido
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
                        const accent = SPORT_ACCENT[sportName] || 'border-border/30';

                        return (
                            <div
                                key={partido.id}
                                onClick={() => router.push(`/admin/partidos/${partido.id}`)}
                                className={`relative group rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${isLive
                                        ? 'border-red-500/30 shadow-lg shadow-red-500/10 ring-1 ring-red-500/10'
                                        : `${accent} hover:border-primary/40`
                                    }`}
                            >
                                {/* Sport gradient background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />

                                {/* Content */}
                                <div className="relative p-5">
                                    {/* Top row - sport + status */}
                                    <div className="flex justify-between items-center mb-5">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl drop-shadow-sm">{emoji}</span>
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{sportName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isLive && <LiveIndicator />}
                                            {isFinished && (
                                                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground tracking-wider">
                                                    Final
                                                </span>
                                            )}
                                            {!isLive && !isFinished && (
                                                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 tracking-wider">
                                                    Programado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Teams & Score - VS Layout */}
                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-5">
                                        {/* Team A */}
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <Avatar name={partido.equipo_a} size="default" className="ring-2 ring-white/10 shadow-lg" />
                                            <span className={`text-sm font-bold leading-tight ${score.a > score.b && isFinished ? 'text-primary' : ''}`}>
                                                {partido.equipo_a}
                                            </span>
                                        </div>

                                        {/* Score */}
                                        <div className="flex flex-col items-center">
                                            <div className="bg-black/20 backdrop-blur-sm px-5 py-2 rounded-2xl border border-white/5">
                                                <span className={`text-3xl font-black font-mono ${score.a > score.b && isFinished ? 'text-primary' : ''}`}>
                                                    {score.a}
                                                </span>
                                                <span className="text-xl font-bold text-muted-foreground/30 mx-1.5">:</span>
                                                <span className={`text-3xl font-black font-mono ${score.b > score.a && isFinished ? 'text-primary' : ''}`}>
                                                    {score.b}
                                                </span>
                                            </div>
                                            {isLive && (
                                                <span className="mt-2 text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full animate-pulse">
                                                    EN JUEGO
                                                </span>
                                            )}
                                        </div>

                                        {/* Team B */}
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <Avatar name={partido.equipo_b} size="default" className="ring-2 ring-white/10 shadow-lg" />
                                            <span className={`text-sm font-bold leading-tight text-muted-foreground ${score.b > score.a && isFinished ? 'text-primary' : ''}`}>
                                                {partido.equipo_b}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom bar */}
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock size={12} />
                                            <span>
                                                {new Date(partido.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                                {' · '}
                                                {new Date(partido.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => deletePartido(partido.id, e)}
                                                className="p-2 rounded-lg text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
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
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all"
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
                <p className="text-center text-xs text-muted-foreground/50 pt-4">
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
