"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Avatar, Button } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Calendar, Share2, AlignLeft, Users, BarChart3, Flame, Lock, HandMetal, CheckCircle, Handshake } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCurrentScore } from "@/lib/sport-scoring";
import { SPORT_LIVE_TEXT, SPORT_LIVE_BG_WRAPPER, SPORT_LIVE_BAR } from "@/lib/constants";

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
    carrera_a?: { nombre: string } | null;
    carrera_b?: { nombre: string } | null;
};

type Evento = {
    id: number;
    tipo_evento: string;
    minuto: number;
    equipo: string;
    descripcion: string;
    jugadores: { nombre: string; numero: number } | null;
};

import { OrbitalLoader } from "@/components/ui/orbital-loader";

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
        const [matchRes, eventosRes, predsRes] = await Promise.all([
            safeQuery(supabase.from('partidos').select(`*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)`).eq('id', matchId).single(), 'partido-detail'),
            safeQuery(supabase.from('olympics_eventos').select('*, jugadores:olympics_jugadores(nombre, numero)').eq('partido_id', matchId).order('minuto', { ascending: false }), 'partido-eventos'),
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

        setLoading(false);
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

            toast.success('¡Predicción guardada!');
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
            <OrbitalLoader message="Cargando estadio..." messagePlacement="bottom" className="text-red-500 scale-150 mb-6" />
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

    return (
        <div className="min-h-screen bg-[#0a0805] text-slate-200 font-sans selection:bg-red-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px] mix-blend-screen" />
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
                <div className="relative overflow-hidden rounded-[2.5rem] bg-[#17130D]/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 mb-8">
                    {/* Header Strip */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none" />

                    <div className="relative px-6 py-8 sm:px-10 sm:py-10 text-center">
                        {/* Status Badges */}
                        <div className="flex flex-wrap justify-center items-center gap-3 mb-6 sm:mb-8 relative z-20">
                            {isLive ? (
                                <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-rose-500 text-white text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                    </span>
                                    LIVE
                                </div>
                            ) : isFinished ? (
                                <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                                    Finalizado
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-slate-800 border border-slate-700 text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                                    <Calendar size={12} className="text-red-400" />
                                    {new Date(match.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </div>
                            )}

                            <div className="inline-flex px-3 py-1.5 rounded-full bg-black/40 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/70">
                                {sportName} • {generoMatch}
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
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
                                {/* Team A */}
                                <div className="flex flex-col items-center gap-4 group">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <Avatar name={match.carrera_a?.nombre || match.equipo_a} size="lg" className="w-16 h-16 sm:w-28 sm:h-28 text-2xl sm:text-4xl border-4 sm:border-[6px] border-white/5 shadow-2xl bg-[#17130D]" />
                                    </div>
                                    <h2 className="text-white font-bold text-[11px] sm:text-lg leading-tight uppercase tracking-wide line-clamp-3 text-center w-full px-1">
                                        {match.carrera_a?.nombre || match.equipo_a}
                                    </h2>
                                </div>

                                <div className="flex flex-col items-center relative z-20 min-w-[120px] sm:min-w-[220px]">
                                    <div className={cn(
                                        "flex items-center justify-center gap-2 sm:gap-6 font-black text-5xl sm:text-7xl tabular-nums tracking-tighter transition-all duration-300",
                                        isLive ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-white/80"
                                    )}>
                                        <span className="w-12 sm:w-24 text-right">{scoreA}</span>
                                        <div className="w-3 sm:w-6 h-1 sm:h-2 bg-white/20 rounded-full" />
                                        <span className="w-12 sm:w-24 text-left">{scoreB}</span>
                                    </div>

                                    {/* Info Row: Time, Quarter/Set, and Status Bar */}
                                    <div className="flex flex-col items-center mt-3 sm:mt-4 w-full px-2 sm:px-0">
                                        <div className={cn(
                                            "flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3",
                                            isLive ? (SPORT_LIVE_TEXT[match.disciplinas?.name] || SPORT_LIVE_TEXT.default) : "text-white/40"
                                        )}>
                                            {/* Quarter or 'Finalizado' */}
                                            {extra ? <span>{extra}</span> : <span>{isLive ? 'EN CURSO' : 'FINAL'}</span>}

                                            {/* Timer or Subscores */}
                                            {isLive && hasTimer && (
                                                <>
                                                    <span className="opacity-50">•</span>
                                                    <div className="scale-90 origin-left">
                                                        <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                                                    </div>
                                                </>
                                            )}

                                            {/* Subscores for Tennis / Volleyball */}
                                            {subScoreA !== undefined && subScoreB !== undefined && (
                                                <>
                                                    <span className="opacity-50">•</span>
                                                    <span>{subLabel || 'PTS'}: {subScoreA} - {subScoreB}</span>
                                                </>
                                            )}
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
                                <div className="flex flex-col items-center gap-4 group">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <Avatar name={match.carrera_b?.nombre || match.equipo_b} size="lg" className="w-16 h-16 sm:w-28 sm:h-28 text-2xl sm:text-4xl border-4 sm:border-[6px] border-white/5 shadow-2xl bg-[#17130D]" />
                                    </div>
                                    <h2 className="text-white font-bold text-[11px] sm:text-lg leading-tight uppercase tracking-wide line-clamp-3 text-center w-full px-1">
                                        {match.carrera_b?.nombre || match.equipo_b}
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
                                generoMatch === 'mixto' ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' :
                                    'bg-red-500/10 border-red-500/20 text-red-300'
                                }`}>
                                <span>{generoMatch === 'femenino' ? '♀' : generoMatch === 'mixto' ? '⚤' : '♂'}</span>
                                <span className="uppercase tracking-wide">{generoMatch === 'femenino' ? 'Femenino' : generoMatch === 'mixto' ? 'Mixto' : 'Masculino'}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <MapPin size={14} className="text-red-400" />
                                <span>{match.lugar || 'Coliseo Central'}</span>
                            </div>
                            {isLive && hasTimer && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                                    <Clock size={14} />
                                    <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Community Predictions + Voting Section */}
                <div className="rounded-3xl bg-[#17130D]/60 backdrop-blur-xl border border-white/10 p-6 mb-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                            <BarChart3 size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white tracking-tight">Predicciones</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Users size={10} /> {matchPredictions.length} votos
                            </p>
                        </div>
                        {userPrediction && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
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
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wide">
                                    <span className="text-red-400">{(match?.carrera_a?.nombre || match?.equipo_a)?.substring(0, 10)} {total > 0 ? `${pctA}%` : ''}</span>
                                    <span className="text-slate-500">Empate {total > 0 ? `${pctDraw}%` : ''}</span>
                                    <span className="text-cyan-400">{(match?.carrera_b?.nombre || match?.equipo_b)?.substring(0, 10)} {total > 0 ? `${pctB}%` : ''}</span>
                                </div>

                                {/* The single bar */}
                                <div className="flex h-3 rounded-full overflow-hidden bg-white/5 gap-[2px]">
                                    <div
                                        className="bg-gradient-to-r from-red-500 to-red-600 rounded-l-full transition-all duration-1000"
                                        style={{ width: `${Math.max(pctA, 1)}%` }}
                                    />
                                    <div
                                        className="bg-gradient-to-r from-slate-500 to-slate-600 transition-all duration-1000"
                                        style={{ width: `${Math.max(pctDraw, 1)}%` }}
                                    />
                                    <div
                                        className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-r-full transition-all duration-1000"
                                        style={{ width: `${Math.max(pctB, 1)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Voting Buttons */}
                    {match?.estado === 'programado' && user ? (
                        <div className="mt-5 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">
                                {userPrediction ? 'Cambiar tu predicción' : '¿Quién ganará?'}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => handleVote('A')}
                                    disabled={saving}
                                    className={cn(
                                        "py-3 px-2 rounded-xl text-[10px] font-black tracking-wide transition-all border-2 uppercase",
                                        votingPick === 'A'
                                            ? "bg-gradient-to-b from-red-500 to-red-700 border-red-400 text-white shadow-lg shadow-red-500/25 scale-[1.03]"
                                            : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {(match?.carrera_a?.nombre || match?.equipo_a)?.substring(0, 8)}
                                </button>
                                <button
                                    onClick={() => handleVote('DRAW')}
                                    disabled={saving}
                                    className={cn(
                                        "py-3 px-2 rounded-xl text-[10px] font-black tracking-wide transition-all border-2 uppercase",
                                        votingPick === 'DRAW'
                                            ? "bg-gradient-to-b from-slate-500 to-slate-700 border-slate-400 text-white shadow-lg scale-[1.03]"
                                            : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
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
                                            ? "bg-gradient-to-b from-cyan-500 to-cyan-700 border-cyan-400 text-white shadow-lg shadow-cyan-500/25 scale-[1.03]"
                                            : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {(match?.carrera_b?.nombre || match?.equipo_b)?.substring(0, 8)}
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
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tu predicción</p>
                            <p className={cn("text-sm font-black",
                                match?.estado === 'finalizado' ? (() => {
                                    const md = match?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result ? "text-emerald-400" : "text-rose-400";
                                })() : "text-white"
                            )}>
                                {userPrediction.winner_pick === 'A' ? <><Trophy size={12} className="inline mr-1" />Gana {match?.carrera_a?.nombre || match?.equipo_a}</> :
                                    userPrediction.winner_pick === 'B' ? <><Trophy size={12} className="inline mr-1" />Gana {match?.carrera_b?.nombre || match?.equipo_b}</> : <><Handshake size={12} className="inline mr-1" />Empate</>}
                            </p>
                        </div>
                    ) : null}
                </div>

                {/* Timeline Section */}
                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-200">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                            <AlignLeft size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Minuto a Minuto</h3>
                    </div>

                    <div className="relative space-y-0 pl-8 sm:pl-10 before:absolute before:top-4 before:bottom-4 before:left-[19px] sm:before:left-[23px] before:w-[2px] before:bg-gradient-to-b before:from-red-500/50 before:to-transparent before:z-0">
                        {eventos.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                <p>El partido está por comenzar...</p>
                            </div>
                        ) : (
                            eventos.map((e, idx) => (
                                <div key={e.id} className="relative pb-8 group last:pb-0">
                                    {/* Timeline Dot */}
                                    <div className={cn(
                                        "absolute top-0 -left-[27px] sm:-left-[31px] z-10 flex items-center justify-center w-8 h-8 rounded-full border-4 border-[#0a0805] transition-transform duration-300 group-hover:scale-110",
                                        e.tipo_evento === 'gol' ? "bg-amber-400 text-amber-900" :
                                            e.tipo_evento.includes('tarjeta') ? "bg-rose-500 text-white" :
                                                "bg-red-500 text-white"
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
                                                {e.equipo === 'sistema' ? 'Juez' : e.equipo === 'equipo_a' ? (match.carrera_a?.nombre || match.equipo_a) : (match.carrera_b?.nombre || match.equipo_b)}
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
