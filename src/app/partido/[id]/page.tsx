"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Calendar, Share2, AlignLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCurrentScore } from "@/lib/sport-scoring";

type Partido = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    fecha: string;
    estado: string;
    marcador_detalle: any;
    lugar?: string;
    genero?: string;
    disciplinas: { name: string };
};

type Evento = {
    id: number;
    tipo_evento: string;
    minuto: number;
    equipo: string;
    descripcion: string;
    jugadores: { nombre: string; numero: number } | null;
};

export default function PublicMatchDetail() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.id as string;

    const [match, setMatch] = useState<Partido | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar datos
    const fetchData = async () => {
        // 1. Partido
        const { data: matchData } = await supabase
            .from('partidos')
            .select(`*, disciplinas(name)`)
            .eq('id', matchId)
            .single();

        if (matchData) setMatch(matchData);

        // 2. Eventos
        const { data: eventosData } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:olympics_jugadores(nombre, numero)')
            .eq('partido_id', matchId)
            .order('minuto', { ascending: false });

        if (eventosData) setEventos(eventosData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Suscripción Realtime
        const channel = supabase
            .channel(`match:${matchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${matchId}` }, (payload) => {
                // Merge para preservar datos del join (disciplinas) que realtime no envía
                setMatch(prev => prev ? { ...prev, ...payload.new, disciplinas: prev.disciplinas } as Partido : prev);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'olympics_eventos', filter: `partido_id=eq.${matchId}` }, () => {
                fetchData(); // Recargar eventos si hay nuevos
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [matchId]);

    const getSportEmoji = (name: string) => {
        const map: Record<string, string> = {
            'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
            'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
        };
        return map[name] || '🏅';
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#030711] text-white">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-indigo-300 animate-pulse">Cargando estadio...</p>
        </div>
    );

    if (!match) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#030711] text-white p-8 text-center">
            <Trophy size={48} className="text-slate-700 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Partido no encontrado</h1>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">Volver al inicio</Link>
        </div>
    );

    const isLive = match.estado === 'en_vivo';
    const isFinished = match.estado === 'finalizado';
    const sportName = match.disciplinas?.name || 'Deporte';
    const sportEmoji = getSportEmoji(sportName);
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(sportName, match.marcador_detalle || {});
    const generoMatch = match.genero || 'masculino';

    return (
        <div className="min-h-screen bg-[#030711] text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            {/* Navigation Header */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 flex justify-between items-center pointer-events-none">
                <Link
                    href="/"
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all text-sm font-medium text-white group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span className="hidden sm:inline">Volver</span>
                </Link>

                <div className="pointer-events-auto flex gap-2">
                    <button className="p-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all text-white">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pb-20 pt-24 sm:pt-32">

                {/* Match Card */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 mb-8">
                    {/* Header Strip */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

                    <div className="relative px-6 py-8 sm:px-10 sm:py-10 text-center">
                        {/* Status Badge */}
                        <div className="flex justify-center mb-8">
                            {isLive ? (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                    </span>
                                    En Vivo
                                </div>
                            ) : isFinished ? (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-bold tracking-widest uppercase">
                                    Finalizado
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase">
                                    <Calendar size={12} />
                                    {new Date(match.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                            )}
                        </div>

                        {/* Scoreboard Layout */}
                        {/* Scoreboard Layout */}
                        {match.marcador_detalle?.tipo === 'carrera' ? (
                            <div className="w-full max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500 my-4">
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 uppercase tracking-tighter drop-shadow-sm leading-tight mb-2">
                                        {match.equipo_a}
                                    </h1>
                                    <Badge variant="outline" className="border-white/10 text-slate-400 uppercase tracking-widest text-[10px]">
                                        {sportName} • {generoMatch}
                                    </Badge>
                                </div>

                                <div className="flex flex-col gap-2 relative">
                                    {(match.marcador_detalle?.participantes || [])
                                        .sort((a: any, b: any) => {
                                            if (a.posicion && b.posicion) return a.posicion - b.posicion;
                                            if (a.posicion) return -1;
                                            if (b.posicion) return 1;
                                            return (a.tiempo || "").localeCompare(b.tiempo || "");
                                        })
                                        .map((p: any, idx: number) => (
                                            <div key={idx} className={cn(
                                                "flex items-center gap-4 p-3 sm:p-4 rounded-xl border backdrop-blur-md transition-all",
                                                p.posicion === 1 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-900/5 border-yellow-500/30 text-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-[1.02] z-10" :
                                                    p.posicion === 2 ? "bg-gradient-to-r from-slate-400/20 to-slate-800/5 border-slate-400/30 text-slate-200" :
                                                        p.posicion === 3 ? "bg-gradient-to-r from-orange-700/20 to-orange-900/5 border-orange-600/30 text-orange-200" :
                                                            "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                                            )}>
                                                <div className="text-2xl sm:text-3xl font-black italic w-8 sm:w-12 text-center opacity-80 flex-shrink-0">
                                                    {p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : p.posicion === 3 ? '🥉' : (p.posicion || idx + 1)}
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="font-bold text-base sm:text-xl truncate leading-tight text-white/90">
                                                        {p.nombre}
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-medium opacity-60 uppercase tracking-wide truncate mt-0.5 text-white/70">
                                                        {p.equipo}
                                                        {p.carril && <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px]">CARRIL {p.carril}</span>}
                                                    </div>
                                                </div>

                                                <div className="text-right font-mono font-bold text-lg sm:text-2xl tabular-nums tracking-tight text-indigo-300 drop-shadow-md">
                                                    {p.tiempo || '--:--'}
                                                </div>
                                            </div>
                                        ))}

                                    {(match.marcador_detalle?.participantes || []).length === 0 && (
                                        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-white/10 bg-white/5">
                                            <p className="text-slate-500 italic text-sm">Esperando lista de participantes...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
                                {/* Team A */}
                                <div className="flex flex-col items-center gap-4 group">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <Avatar name={match.equipo_a} size="lg" className="w-20 h-20 sm:w-28 sm:h-28 text-3xl sm:text-4xl border-[6px] border-white/5 shadow-2xl bg-[#0a0f1c]" />
                                    </div>
                                    <h2 className="text-white font-bold text-sm sm:text-lg leading-tight uppercase tracking-wide truncate max-w-[120px] sm:max-w-[160px]">
                                        {match.equipo_a}
                                    </h2>
                                </div>

                                <div className="flex flex-col items-center relative z-20 min-w-[140px]">
                                    <div className={cn(
                                        "flex items-center justify-center gap-2 sm:gap-4 font-black text-6xl sm:text-8xl tabular-nums tracking-tighter transition-all duration-300",
                                        isLive ? "text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]" : "text-white/50"
                                    )}>
                                        <span>{scoreA}</span>
                                        <span className="text-white/20 text-4xl sm:text-6xl -mt-2 sm:-mt-4">:</span>
                                        <span>{scoreB}</span>
                                    </div>

                                    {/* Sub-score del período/set actual */}
                                    {subScoreA !== undefined && subScoreB !== undefined && (
                                        <div className="flex items-center gap-3 mt-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                                            <span className="text-sm sm:text-base font-bold tabular-nums text-white">{subScoreA}</span>
                                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{subLabel || 'Pts'}</span>
                                            <span className="text-sm sm:text-base font-bold tabular-nums text-white">{subScoreB}</span>
                                        </div>
                                    )}

                                    {/* Period indicator */}
                                    {extra && (
                                        <span className="mt-2 text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-0.5 rounded-full uppercase tracking-wider">
                                            {extra}
                                        </span>
                                    )}
                                </div>

                                {/* Team B */}
                                <div className="flex flex-col items-center gap-4 group">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <Avatar name={match.equipo_b} size="lg" className="w-20 h-20 sm:w-28 sm:h-28 text-3xl sm:text-4xl border-[6px] border-white/5 shadow-2xl bg-[#0a0f1c]" />
                                    </div>
                                    <h2 className="text-white font-bold text-sm sm:text-lg leading-tight uppercase tracking-wide truncate max-w-[120px] sm:max-w-[160px]">
                                        {match.equipo_b}
                                    </h2>
                                </div>
                            </div>
                        )}

                        {/* Metadata Footer */}
                        <div className="mt-8 sm:mt-10 flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-slate-400">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-lg">{sportEmoji}</span>
                                <span className="uppercase tracking-wide">{sportName}</span>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${generoMatch === 'femenino' ? 'bg-pink-500/10 border-pink-500/20 text-pink-300' :
                                generoMatch === 'mixto' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' :
                                    'bg-blue-500/10 border-blue-500/20 text-blue-300'
                                }`}>
                                <span>{generoMatch === 'femenino' ? '♀' : generoMatch === 'mixto' ? '⚤' : '♂'}</span>
                                <span className="uppercase tracking-wide">{generoMatch === 'femenino' ? 'Femenino' : generoMatch === 'mixto' ? 'Mixto' : 'Masculino'}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <MapPin size={14} className="text-indigo-400" />
                                <span>{match.lugar || 'Coliseo Central'}</span>
                            </div>
                            {isLive && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                                    <Clock size={14} />
                                    <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-200">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <AlignLeft size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Minuto a Minuto</h3>
                    </div>

                    <div className="relative space-y-0 pl-8 sm:pl-10 before:absolute before:top-4 before:bottom-4 before:left-[19px] sm:before:left-[23px] before:w-[2px] before:bg-gradient-to-b before:from-indigo-500/50 before:to-transparent before:z-0">
                        {eventos.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                <p>El partido está por comenzar...</p>
                            </div>
                        ) : (
                            eventos.map((e, idx) => (
                                <div key={e.id} className="relative pb-8 group last:pb-0">
                                    {/* Timeline Dot */}
                                    <div className={cn(
                                        "absolute top-0 -left-[27px] sm:-left-[31px] z-10 flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#030711] transition-transform duration-300 group-hover:scale-110",
                                        e.tipo_evento === 'gol' ? "bg-amber-400 text-amber-900" :
                                            e.tipo_evento.includes('tarjeta') ? "bg-rose-500 text-white" :
                                                "bg-indigo-500 text-white"
                                    )}>
                                        <span className="text-[10px] font-black">{e.minuto}'</span>
                                    </div>

                                    {/* Event Card */}
                                    <div className="relative p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 hover:translate-x-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">
                                                    {e.tipo_evento === 'gol' && '⚽ GOL'}
                                                    {e.tipo_evento === 'tarjeta_amarilla' && '🟨 Tarjeta Amarilla'}
                                                    {e.tipo_evento === 'tarjeta_roja' && '🟥 Tarjeta Roja'}
                                                    {e.tipo_evento === 'inicio' && '🚀 Inicio del Partido'}
                                                    {e.tipo_evento === 'fin' && '🏁 Final del Partido'}
                                                    {e.tipo_evento === 'cambio' && '🔄 Cambio'}
                                                    {!['gol', 'tarjeta_amarilla', 'tarjeta_roja', 'inicio', 'fin', 'cambio'].includes(e.tipo_evento) && '📌 Evento'}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="w-fit text-[10px] bg-white/5 border-white/10 text-slate-400">
                                                {e.equipo === 'sistema' ? 'Juez' : e.equipo === 'equipo_a' ? match.equipo_a : match.equipo_b}
                                            </Badge>
                                        </div>

                                        {e.jugadores && (
                                            <div className="flex items-center gap-3 mt-1 pl-1">
                                                <div className="w-1 h-8 bg-white/10 rounded-full" />
                                                <div>
                                                    <p className="font-bold text-white text-sm">{e.jugadores.nombre}</p>
                                                    <p className="text-xs text-slate-500 font-mono">#{e.jugadores.numero}</p>
                                                </div>
                                            </div>
                                        )}
                                        {e.descripcion && (
                                            <p className="text-sm text-slate-400 mt-2 italic border-t border-white/5 pt-2">
                                                "{e.descripcion}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-20 text-center">
                    <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">
                        Olimpiadas UNINORTE 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
