"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Avatar, Button } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Calendar, Share2, AlignLeft, Users, BarChart3, Flame, Lock, HandMetal, CheckCircle, Handshake, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCurrentScore } from "@/lib/sport-scoring";
import { getDisplayName, getCarreraName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { SPORT_LIVE_TEXT, SPORT_LIVE_BG_WRAPPER, SPORT_LIVE_BAR, SPORT_ACCENT, SPORT_COLORS, SPORT_BORDER, SPORT_GLOW, SPORT_GRADIENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";

type Partido = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    fecha: string;
    estado: string;
    marcador_detalle: any;
    lugar?: string;
    genero?: string;
    delegacion_a?: string;
    delegacion_b?: string;
    disciplinas: { name: string };
    carrera_a?: { nombre: string } | null;
    carrera_b?: { nombre: string } | null;
};

type Evento = {
    id: number;
    tipo_evento: string;
    minuto: number;
    equipo: string;
    descripcion: string;
    periodo: number | null;
    jugadores: { nombre: string; numero: number } | null;
};

import UniqueLoading from "@/components/ui/morph-loading";

export default function PublicMatchDetail() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.id as string;

    const { user } = useAuth();

    const [match, setMatch] = useState<Partido | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
    const [userPrediction, setUserPrediction] = useState<any>(null);
    const [votingPick, setVotingPick] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Cargar datos
    const fetchData = async () => {
        try {
            const [matchRes, eventosRes, predsRes] = await Promise.all([
                safeQuery(supabase.from('partidos').select(`*, disciplinas(name), delegacion_a, delegacion_b, carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)`).eq('id', matchId).single(), 'partido-detail'),
                safeQuery(supabase.from('olympics_eventos').select('*, jugadores:olympics_jugadores(nombre, numero)').eq('partido_id', matchId).order('id', { ascending: false }), 'partido-eventos'),
                safeQuery(supabase.from('pronosticos').select('winner_pick, prediction_type').eq('match_id', matchId), 'partido-preds'),
            ]);

            if (matchRes.data) setMatch(matchRes.data);
            if (eventosRes.data) setEventos(eventosRes.data);
            if (predsRes.data) setMatchPredictions(predsRes.data);

            if (user) {
                const { data: userPred } = await safeQuery<any>(
                    supabase.from('pronosticos').select('*').eq('match_id', matchId).eq('user_id', user.id).single(),
                    'partido-userPred'
                );
                if (userPred) {
                    setUserPrediction(userPred);
                    setVotingPick(userPred.winner_pick);
                }
            }
        } catch (err) {
            console.error('[fetchData] error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle voting
    const handleVote = async (pick: string) => {
        if (!user || !match) return;
        if (match.estado !== 'programado') return;

        setVotingPick(pick);
        setSaving(true);

        try {
            // Ensure profile exists
            await supabase.from('public_profiles').upsert(
                { id: user.id, email: user.email },
                { onConflict: 'id' }
            );

            const payload = {
                user_id: user.id,
                match_id: parseInt(matchId),
                prediction_type: 'winner',
                goles_a: null,
                goles_b: null,
                winner_pick: pick
            };

            if (userPrediction) {
                await supabase.from('pronosticos').update(payload).eq('id', userPrediction.id);
            } else {
                await supabase.from('pronosticos').insert(payload);
            }

            // Refresh predictions
            const { data: predsData } = await supabase
                .from('pronosticos')
                .select('winner_pick, prediction_type')
                .eq('match_id', matchId);
            if (predsData) setMatchPredictions(predsData);

            const { data: userPred } = await supabase
                .from('pronosticos')
                .select('*')
                .eq('match_id', matchId)
                .eq('user_id', user.id)
                .single();
            if (userPred) setUserPrediction(userPred);

            toast.success('¡Acierto guardado!');
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0805] text-white">
            <UniqueLoading size="lg" />
        </div>
    );

    if (!match) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0805] text-white p-8 text-center">
            <Trophy size={48} className="text-slate-700 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Partido no encontrado</h1>
            <Link href="/" className="text-red-400 hover:text-red-300 transition-colors">Volver al inicio</Link>
        </div>
    );

    const isLive = match.estado === 'en_vivo';
    const isFinished = match.estado === 'finalizado';
    const sportName = match.disciplinas?.name || 'Deporte';
    const sportEmoji = getSportEmoji(sportName);
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(sportName, match.marcador_detalle || {});
    const generoMatch = match.genero || 'masculino';
    const hasTimer = ['Fútbol', 'Baloncesto', 'Futsal'].includes(sportName);
    const sportColor = SPORT_COLORS[sportName] || '#10b981';

    return (
        <div className="min-h-screen text-slate-200 font-sans selection:bg-white/10 transition-colors duration-1000" style={{ backgroundColor: `${sportColor}08` }}>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full blur-[150px] mix-blend-screen animate-pulse duration-[10s] transition-all"
                    style={{ backgroundColor: `${sportColor}15` }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[130px] mix-blend-screen animate-pulse duration-[8s] transition-all"
                    style={{ backgroundColor: `${sportColor}10` }} />
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
                <div className={cn(
                    "relative overflow-hidden rounded-[2.5rem] bg-[#17130D]/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 mb-8 transition-all duration-700",
                    SPORT_BORDER[sportName] || 'border-white/10',
                    SPORT_GLOW[sportName] || ''
                )}>
                    {/* Header Strip */}
                    <div className={cn(
                        "absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none",
                        `bg-gradient-to-b ${SPORT_GRADIENT[sportName] || 'from-white/10'} to-transparent`
                    )} />

                    <div className="relative px-6 py-8 sm:px-10 sm:py-10 text-center">
                        {/* Status Badges & Integrated Timer */}
                        <div className="flex flex-col justify-center items-center mb-8 relative z-20 px-4 w-full">
                            {/* Live Timer directly integrated above the badge */}
                            {isLive && hasTimer && (
                                <div className="z-30 flex items-center justify-center scale-90 sm:scale-100 transition-all mb-3 drop-shadow-md">
                                    <PublicLiveTimer detalle={match.marcador_detalle || {}} deporte={match.disciplinas?.name} />
                                </div>
                            )}

                            <div className="flex flex-wrap justify-center items-center gap-2">
                                {!isFinished && !isLive && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#17130D]/80 border border-white/10 text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-lg">
                                        <Calendar size={14} className={cn(SPORT_ACCENT[sportName] || 'text-amber-400')} />
                                        {new Date(match.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </div>
                                )}

                                {isFinished && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 text-[10px] sm:text-xs font-black tracking-widest uppercase">
                                        <Trophy size={14} /> Finalizado
                                    </div>
                                )}

                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#17130D]/80 border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg transition-all",
                                    SPORT_ACCENT[sportName] || 'text-white/70'
                                )}>
                                    <SportIcon sport={sportName} size={14} />
                                    <span>{sportName}</span>
                                    <span className="opacity-30 mx-1">•</span>
                                    <span className={cn(
                                        generoMatch === 'femenino' ? 'text-pink-400' :
                                            generoMatch === 'mixto' ? 'text-purple-400' : 'text-blue-400'
                                    )}>{generoMatch}</span>
                                </div>
                            </div>
                        </div>

                        {/* Scoreboard Layout */}
                        {/* Scoreboard Layout */}
                        {match.marcador_detalle?.tipo === 'carrera' ? (
                            <div className="w-full max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500 my-4">
                                <div className="text-center mb-8 mt-4 sm:mt-0">
                                    <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 uppercase tracking-tighter drop-shadow-sm leading-tight mb-2">
                                        {match.carrera_a?.nombre || match.equipo_a}
                                    </h1>
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
                                                p.posicion === 1 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-900/5 border-[#FFC000]/30 text-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-[1.02] z-10" :
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

                                                <div className="text-right font-mono font-bold text-lg sm:text-2xl tabular-nums tracking-tight text-red-300 drop-shadow-md">
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
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 w-full relative">
                                {/* Team A */}
                                <div className="flex flex-col items-center gap-4 group min-w-0 w-full">
                                    {sportName === 'Ajedrez' && isFinished && match.marcador_detalle?.resultado_final === 'victoria_a' && (
                                        <div className="mb-[-0.5rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm z-30">
                                            Ganador
                                        </div>
                                    )}
                                    <div className="relative shrink-0">
                                        <div className={cn(
                                            "absolute inset-0 blur-2xl rounded-full scale-125 opacity-20 group-hover:opacity-40 transition-opacity duration-500",
                                            `bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/20'}`
                                        )} />
                                        <Avatar name={getDisplayName(match, 'a')} size="lg" className="w-16 h-16 sm:w-28 sm:h-28 text-2xl sm:text-4xl border-4 sm:border-[6px] border-white/5 shadow-2xl bg-[#0a0805]" />
                                    </div>
                                    <h2 className="text-white font-bold text-[11px] sm:text-lg leading-tight uppercase tracking-wide line-clamp-3 text-center w-full px-1">
                                        {getDisplayName(match, 'a')}
                                    </h2>
                                    {getCarreraSubtitle(match, 'a') && (
                                        <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate w-full text-center">{getCarreraSubtitle(match, 'a')}</span>
                                    )}
                                </div>

                                <div className="flex flex-col items-center relative z-20 min-w-[120px] sm:min-w-[220px] shrink-0">

                                    {sportName === 'Ajedrez' ? (
                                        <div className="flex flex-col items-center justify-center w-full min-h-[100px] sm:min-h-[140px]">
                                            {isFinished && match.marcador_detalle?.resultado_final === 'empate' ? (
                                                <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-lg">
                                                    <span className="text-sm sm:text-base uppercase font-black text-slate-300 tracking-[0.2em]">Empate</span>
                                                </div>
                                            ) : isLive ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="relative flex h-4 w-4">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                                                    </span>
                                                    <span className="text-xl sm:text-3xl font-black text-rose-500 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                                                        EN VIVO
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="bg-white/5 backdrop-blur-sm px-6 py-4 rounded-3xl border border-white/5 shadow-inner">
                                                    <span className="text-3xl sm:text-5xl font-black text-white/20 tracking-widest">VS</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            "flex items-center justify-center gap-2 sm:gap-6 font-black text-5xl sm:text-7xl tabular-nums tracking-tighter transition-all duration-300",
                                            isLive ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-white/80"
                                        )}>
                                            <span className="w-12 sm:w-24 text-right flex-1">{scoreA}</span>
                                            <div className="w-3 sm:w-6 h-1 sm:h-2 bg-white/20 rounded-full shrink-0 mx-2" />
                                            <span className="w-12 sm:w-24 text-left flex-1">{scoreB}</span>
                                        </div>
                                    )}

                                    {/* Info Row: Time, Quarter/Set, and Status Bar */}
                                    <div className="flex flex-col items-center mt-3 sm:mt-4 w-full px-2 sm:px-0">
                                        <div className={cn(
                                            "flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3",
                                            isLive ? (SPORT_LIVE_TEXT[match.disciplinas?.name] || SPORT_LIVE_TEXT.default) : "text-white/40"
                                        )}>
                                            {/* Quarter or 'Finalizado' / 'Programado' */}
                                            {extra ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "brightness-125 drop-shadow-[0_0_8px_currentColor]",
                                                        isLive ? (SPORT_ACCENT[match.disciplinas?.name] || 'text-white') : 'text-white/40'
                                                    )}>
                                                        {extra}
                                                    </span>
                                                    {subScoreA !== undefined && (
                                                        <span className="text-white/30 font-mono text-[9px] tracking-normal brightness-75">
                                                            ({subScoreA} - {subScoreB})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span>{isLive ? 'EN CURSO' : isFinished ? 'FINAL' : 'PROGRAMADO'}</span>
                                            )}
                                            {/* Timer moved to top-left area */}
                                        </div>

                                        {/* Glowing Progress Status Bar */}
                                        <div className={cn(
                                            "w-full h-1 sm:h-[6px] rounded-full overflow-hidden relative",
                                            isLive ? (SPORT_LIVE_BG_WRAPPER[match.disciplinas?.name] || SPORT_LIVE_BG_WRAPPER.default) : "bg-white/10"
                                        )}>
                                            {isLive ? (
                                                <div className={cn("h-full rounded-full w-[100%] absolute top-0 left-0 animate-pulse", SPORT_LIVE_BAR[match.disciplinas?.name] || SPORT_LIVE_BAR.default)} />
                                            ) : isFinished ? (
                                                <div className="h-full bg-white/40 rounded-full w-[100%] absolute top-0 left-0" />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Team B */}
                                <div className="flex flex-col items-center gap-4 group min-w-0 w-full">
                                    {sportName === 'Ajedrez' && isFinished && match.marcador_detalle?.resultado_final === 'victoria_b' && (
                                        <div className="mb-[-0.5rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm z-30">
                                            Ganador
                                        </div>
                                    )}
                                    <div className="relative shrink-0">
                                        <div className={cn(
                                            "absolute inset-0 blur-2xl rounded-full scale-125 opacity-20 group-hover:opacity-40 transition-opacity duration-500",
                                            `bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/20'}`
                                        )} />
                                        <Avatar name={getDisplayName(match, 'b')} size="lg" className="w-16 h-16 sm:w-28 sm:h-28 text-2xl sm:text-4xl border-4 sm:border-[6px] border-white/5 shadow-2xl bg-[#0a0805]" />
                                    </div>
                                    <h2 className="text-white font-bold text-[11px] sm:text-lg leading-tight uppercase tracking-wide line-clamp-3 text-center w-full px-1">
                                        {getDisplayName(match, 'b')}
                                    </h2>
                                    {getCarreraSubtitle(match, 'b') && (
                                        <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate w-full text-center">{getCarreraSubtitle(match, 'b')}</span>
                                    )}
                                </div>
                            </div>
                        )}                      {/* Metadata Footer: Clean Location Label */}
                        <div className="mt-6 sm:mt-8 flex justify-center px-4">
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 shadow-inner backdrop-blur-md group hover:bg-white/10 transition-all">
                                <div className={cn("p-1.5 rounded-lg bg-black/20", SPORT_ACCENT[sportName])}>
                                    <MapPin size={16} className="drop-shadow-[0_0_5px_currentColor]" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-white/80 tracking-wide">{match.lugar || 'Coliseo Central'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Community Predictions + Voting Section */}
                <div className="rounded-3xl bg-[#17130D]/60 backdrop-blur-xl border border-white/10 p-6 mb-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="flex items-center gap-3 mb-5">
                        <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10", SPORT_ACCENT[sportName])}>
                            <BarChart3 size={20} className="drop-shadow-[0_0_8px_currentColor]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white tracking-tight">Acierta y Gana</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Users size={10} /> {matchPredictions.length} votos
                            </p>
                        </div>
                        {userPrediction && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest shadow-lg">
                                <CheckCircle size={10} className="mr-1" /> Votaste
                            </Badge>
                        )}
                    </div>

                    {/* Single Horizontal Percentage Bar */}
                    {(() => {
                        const winnerPreds = matchPredictions.filter(p => p.winner_pick);
                        const total = winnerPreds.length;
                        const countA = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'A').length : 0;
                        const countDraw = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'DRAW').length : 0;
                        const countB = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'B').length : 0;
                        const pctA = total > 0 ? Math.round((countA / total) * 100) : 33;
                        const pctDraw = total > 0 ? Math.round((countDraw / total) * 100) : 34;
                        const pctB = total > 0 ? 100 - pctA - pctDraw : 33;

                        return (
                            <div className="space-y-3">
                                {/* Labels */}
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                    <div className="flex flex-col items-start gap-1">
                                        <span className="text-white/40">{getDisplayName(match, 'a')?.substring(0, 12)}</span>
                                        <span className={cn("text-sm", SPORT_ACCENT[sportName] || "text-white")}>{total > 0 ? `${pctA}%` : '0%'}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-white/40">Empate</span>
                                        <span className="text-sm text-slate-400">{total > 0 ? `${pctDraw}%` : '0%'}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-white/40">{getDisplayName(match, 'b')?.substring(0, 12)}</span>
                                        <span className={cn("text-sm", SPORT_ACCENT[sportName] || "text-white")}>{total > 0 ? `${pctB}%` : '0%'}</span>
                                    </div>
                                </div>
                                {/* The single bar */}
                                <div className="flex h-3 rounded-full overflow-hidden bg-white/5 gap-[2px] shadow-inner">
                                    <div
                                        className={cn("transition-all duration-1000 rounded-l-full", SPORT_ACCENT[sportName] || "bg-emerald-500")}
                                        style={{
                                            width: `${Math.max(pctA, 1)}%`,
                                            backgroundColor: 'currentColor',
                                            filter: 'brightness(0.3)'
                                        }}
                                    />
                                    <div
                                        className="bg-slate-700/50 transition-all duration-1000"
                                        style={{ width: `${Math.max(pctDraw, 1)}%` }}
                                    />
                                    <div
                                        className={cn("transition-all duration-1000 rounded-r-full", SPORT_ACCENT[sportName] || "bg-emerald-500")}
                                        style={{
                                            width: `${Math.max(pctB, 1)}%`,
                                            backgroundColor: 'currentColor',
                                            filter: 'brightness(1.7)'
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Voting Buttons */}
                    {match?.estado === 'programado' && user ? (
                        <div className="mt-5 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">
                                {userPrediction ? 'Cambiar tu acierto' : '¿Quién ganará?'}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleVote('A')}
                                    disabled={saving}
                                    className={cn(
                                        "py-3 px-2 rounded-xl text-[10px] font-black tracking-wide transition-all border-2 uppercase",
                                        votingPick === 'A'
                                            ? [SPORT_ACCENT[sportName] || "bg-white/10 text-white", "border-current shadow-lg scale-[1.03] bg-white/5"]
                                            : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {getDisplayName(match, 'a')?.substring(0, 8)}
                                </button>
                                <button
                                    onClick={() => handleVote('DRAW')}
                                    disabled={saving}
                                    className={cn(
                                        "py-3 px-2 rounded-xl text-[10px] font-black tracking-wide transition-all border-2 uppercase",
                                        votingPick === 'DRAW'
                                            ? "bg-white/10 border-slate-400 text-white shadow-lg scale-[1.03]"
                                            : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    Empate
                                </button>
                                <button
                                    onClick={() => handleVote('B')}
                                    disabled={saving}
                                    className={cn(
                                        "py-3 px-2 rounded-xl text-[10px] font-black tracking-wide transition-all border-2 uppercase",
                                        votingPick === 'B'
                                            ? [SPORT_ACCENT[sportName] || "bg-white/10 text-white", "border-current shadow-lg scale-[1.03] bg-white/5"]
                                            : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {getDisplayName(match, 'b')?.substring(0, 8)}
                                </button>
                            </div>
                        </div>
                    ) : match?.estado === 'programado' && !user ? (
                        <div className="mt-5 pt-4 border-t border-white/5 text-center">
                            <Link href="/login" className="text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors">
                                Inicia sesión para predecir →
                            </Link>
                        </div>
                    ) : match?.estado !== 'programado' && userPrediction ? (
                        <div className={cn(
                            "mt-5 pt-4 border-t border-white/5 text-center p-3 rounded-xl",
                            match?.estado === 'finalizado'
                                ? ((() => {
                                    const md = match?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result;
                                })() ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-rose-500/10 border border-rose-500/15")
                                : "bg-white/5"
                        )}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tu acierto</p>
                            <p className={cn("text-sm font-black",
                                match?.estado === 'finalizado' ? (() => {
                                    const md = match?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result ? "text-emerald-400" : "text-rose-400";
                                })() : "text-white"
                            )}>
                                {userPrediction.winner_pick === 'A' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(match, 'a')}</> :
                                    userPrediction.winner_pick === 'B' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(match, 'b')}</> : <><Handshake size={12} className="inline mr-1" />Empate</>}
                            </p>
                        </div>
                    ) : null}
                </div>

                {/* Timeline Section */}
                <div className="rounded-[2.5rem] bg-[#0a0805]/80 backdrop-blur-2xl border border-white/5 p-6 sm:p-10 animate-in fade-in duration-700 delay-200 shadow-2xl shadow-black/40">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10", SPORT_ACCENT[sportName])}>
                            <AlignLeft size={22} className="drop-shadow-[0_0_8px_currentColor]" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase px-1">Minuto a Minuto</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5 px-1">Registro oficial del evento</p>
                        </div>
                    </div>

                    <div className="relative max-w-2xl mx-auto py-4 overflow-hidden">
                        {/* Vertical Line - Centered */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent -translate-x-1/2" />

                        {eventos.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 bg-white/[0.02] rounded-[2rem] border border-white/5 border-dashed relative z-10">
                                <p className="text-sm font-medium italic opacity-60">El partido está por comenzar...</p>
                            </div>
                        ) : (
                            <div className="space-y-6 relative z-10">
                                {eventos.map((e, idx) => {
                                    const isTeamA = e.equipo === 'equipo_a';
                                    const isTeamB = e.equipo === 'equipo_b';
                                    const isSystem = e.equipo === 'sistema';

                                    let eventIcon = <div className="w-2.5 h-2.5 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)]" />;
                                    let eventLabel = 'Evento';
                                    if (e.tipo_evento === 'gol') { eventIcon = <span className="text-base">⚽</span>; eventLabel = 'Gol'; }
                                    else if (e.tipo_evento === 'tarjeta_amarilla') { eventIcon = <div className="w-3.5 h-4.5 bg-yellow-400 rounded-[3px] shadow-[0_0_10px_rgba(250,204,21,0.3)]" />; eventLabel = 'Tarjeta Amarilla'; }
                                    else if (e.tipo_evento === 'tarjeta_roja') { eventIcon = <div className="w-3.5 h-4.5 bg-red-500 rounded-[3px] shadow-[0_0_10px_rgba(239,68,68,0.3)]" />; eventLabel = 'Tarjeta Roja'; }
                                    else if (e.tipo_evento === 'cambio') { eventIcon = <span className="text-xl text-emerald-400">⇄</span>; eventLabel = 'Cambio'; }
                                    else if (e.tipo_evento === 'falta') { eventIcon = <span className="text-sm">⛔</span>; eventLabel = 'Falta'; }
                                    else if (e.tipo_evento === 'punto_1') { eventIcon = <span className="text-[11px] font-black text-white">+1</span>; eventLabel = 'Tiro Libre'; }
                                    else if (e.tipo_evento === 'punto_2') { eventIcon = <span className="text-[11px] font-black text-white">+2</span>; eventLabel = 'Anotación'; }
                                    else if (e.tipo_evento === 'punto_3') { eventIcon = <span className="text-[11px] font-black text-white">+3</span>; eventLabel = 'Triple'; }
                                    else if (e.tipo_evento === 'punto') { eventIcon = <span className="text-base">🏐</span>; eventLabel = 'Punto'; }
                                    else if (e.tipo_evento === 'set') { eventIcon = <span className="text-sm">🏆</span>; eventLabel = 'Set'; }

                                    if (isSystem) {
                                        return (
                                            <div key={e.id || idx} className="relative flex justify-center py-6 w-full">
                                                <div className="bg-[#0a0805]/80 backdrop-blur-md px-6 font-black text-[11px] text-white/30 uppercase tracking-[0.3em] text-center border border-white/5 rounded-full py-1.5 shadow-xl">
                                                    {e.descripcion || 'Evento de Sistema'}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={e.id || idx} className="relative flex items-center min-h-[90px] group/item">
                                            {/* Minute indicator - Centered */}
                                            <div className="absolute left-1/2 -translate-x-1/2 z-20">
                                                <div className="w-9 h-9 rounded-full bg-[#111] border border-white/10 flex items-center justify-center shadow-2xl ring-[6px] ring-[#0a0805] group-hover/item:scale-110 transition-transform duration-300">
                                                    <span className="text-[11px] font-black tabular-nums text-white/80">{e.minuto}&apos;</span>
                                                </div>
                                            </div>

                                            {/* LEFT SIDE (Team A) */}
                                            <div className={cn(
                                                "w-1/2 pr-8 sm:pr-12 flex items-center justify-end gap-4 transition-all duration-300",
                                                !isTeamA ? "opacity-0 pointer-events-none translate-x-4" : "opacity-100 translate-x-0"
                                            )}>
                                                <div className="text-right py-1">
                                                    <p className="text-[13px] sm:text-[15px] font-black leading-tight text-white/95 truncate max-w-[90px] sm:max-w-none">
                                                        {e.jugadores?.nombre || getDisplayName(match, 'a')}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-[0.15em]">{eventLabel}</p>
                                                </div>
                                                <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 shadow-lg relative group-hover/item:scale-110 transition-transform">
                                                    <div className="absolute inset-0 bg-red-500/10 blur-md rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                    <span className="relative z-10">{eventIcon}</span>
                                                </div>
                                            </div>

                                            {/* RIGHT SIDE (Team B) */}
                                            <div className={cn(
                                                "w-1/2 pl-8 sm:pl-12 flex items-center justify-start gap-4 transition-all duration-300",
                                                !isTeamB ? "opacity-0 pointer-events-none -translate-x-4" : "opacity-100 translate-x-0"
                                            )}>
                                                <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-xl border bg-cyan-500/10 border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 shadow-lg relative group-hover/item:scale-110 transition-transform">
                                                    <div className="absolute inset-0 bg-cyan-500/10 blur-md rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                    <span className="relative z-10">{eventIcon}</span>
                                                </div>
                                                <div className="text-left py-1">
                                                    <p className="text-[13px] sm:text-[15px] font-black leading-tight text-white/95 truncate max-w-[90px] sm:max-w-none">
                                                        {e.jugadores?.nombre || getDisplayName(match, 'b')}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-[0.15em]">{eventLabel}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
