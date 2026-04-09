"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Avatar, Button } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Calendar, Share2, AlignLeft, Users, BarChart3, Flame, Lock, HandMetal, CheckCircle, Handshake, Crown, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCurrentScore } from "@/lib/sport-scoring";
import { formatTenisPunto } from "@/modules/sports/services/tenis.service";
import { getDisplayName, getCarreraName, getCarreraSubtitle, isIndividualSport } from "@/lib/sport-helpers";
import { SPORT_LIVE_TEXT, SPORT_LIVE_BG_WRAPPER, SPORT_LIVE_BAR, SPORT_ACCENT, SPORT_COLORS, SPORT_BORDER, SPORT_GLOW, SPORT_GRADIENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { parseEventAudit } from "@/lib/audit-helpers";

import type { PartidoWithRelations as Partido, Evento } from '@/modules/matches/types';
import { MatchTimeline } from '@/modules/matches/components/match-timeline';
import { MatchStats } from '@/modules/matches/components/match-stats';

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
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Cargar datos
    const fetchData = async (signal?: AbortSignal) => {
        setLoading(true);
        setFetchError(null);
        try {
            const PARTIDO_SELECT = [
                'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria',
                'fase, grupo, bracket_order, delegacion_a, delegacion_b',
                'delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id',
                'disciplinas:disciplina_id(name)',
                'carrera_a:carreras!carrera_a_id(nombre, escudo_url)',
                'carrera_b:carreras!carrera_b_id(nombre, escudo_url)',
                'atleta_a:profiles!athlete_a_id(full_name, avatar_url)',
                'atleta_b:profiles!athlete_b_id(full_name, avatar_url)',
            ].join(', ');

            const matchRes = await safeQuery(
                supabase
                    .from('partidos')
                    .select(PARTIDO_SELECT)
                    .eq('id', matchId)
                    .single(),
                'partido-detail'
            );

            if (matchRes.error && !matchRes.data) {
                console.warn('[fetchData] Full query failed, trying fallback:', matchRes.error.message);
                const fallbackRes = await safeQuery(
                    supabase
                        .from('partidos')
                        .select('id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria, fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id')
                        .eq('id', matchId)
                        .single(),
                    'partido-detail-fallback'
                );

                if (fallbackRes.error && !fallbackRes.data) {
                    setFetchError(fallbackRes.error.message || matchRes.error.message || 'Error al cargar el partido');
                    return;
                }
                if (fallbackRes.data) setMatch(fallbackRes.data as unknown as Partido);
            } else if (matchRes.data) {
                setMatch(matchRes.data);
            }

            const [eventosRes, predsRes] = await Promise.all([
                safeQuery(
                    supabase.from('olympics_eventos')
                        .select('*, jugadores:jugadores!jugador_id_normalized(*)')
                        .eq('partido_id', matchId)
                        .order('minuto', { ascending: false }),
                    'partido-eventos'
                ),
                safeQuery(
                    supabase.from('pronosticos').select('winner_pick, prediction_type').eq('match_id', matchId),
                    'partido-preds'
                ),
            ]);

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
        } catch (err: any) {
            console.error('[fetchData] error:', err);
            setFetchError(err?.message || 'Error de red');
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
            await supabase.from('profiles').upsert(
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
        const controller = new AbortController();
        fetchData(controller.signal);

        // Global revalidate listener (triggered by VisibilityRevalidate)
        const handleRevalidate = () => {
            console.log('[MatchPage] Global revalidate triggered');
            fetchData(controller.signal);
        };

        window.addEventListener('app:revalidate', handleRevalidate);

        // Suscripción Realtime
        const channel = supabase
            .channel(`match:${matchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${matchId}` }, (payload) => {
                setMatch(prev => prev ? { ...prev, ...payload.new, disciplinas: prev.disciplinas } as Partido : prev);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'olympics_eventos', filter: `partido_id=eq.${matchId}` }, () => {
                fetchData(controller.signal);
            })
            .subscribe();

        return () => {
            controller.abort();
            supabase.removeChannel(channel);
            window.removeEventListener('app:revalidate', handleRevalidate);
        };
    }, [matchId, user]);

    const getSportEmoji = (name: string) => {
        const map: Record<string, string> = {
            'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
            'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
        };
        return map[name] || '🏅';
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white">
            <UniqueLoading size="lg" />
        </div>
    );

    if (!match) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-8 text-center gap-4">
            <Trophy size={48} className="text-slate-700 mb-2" />
            <h1 className="text-2xl font-bold">Partido no encontrado</h1>
            {fetchError && (
                <div className="max-w-md bg-violet-500/10 border border-violet-500/30 rounded-2xl px-5 py-3 text-sm text-violet-300 font-mono text-left">
                    <p className="font-bold text-violet-400 mb-1 uppercase tracking-wider text-[10px]">Error de consulta</p>
                    <p className="break-words">{fetchError}</p>
                </div>
            )}
            <div className="flex gap-3 mt-2">
                <button
                    onClick={() => fetchData()}
                    className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all"
                >
                    🔄 Reintentar
                </button>
                <Link href="/" className="px-5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-sm font-bold transition-all">
                    ← Volver al inicio
                </Link>
            </div>
        </div>
    );

    const isLive = match.estado === 'en_curso';
    const isFinished = match.estado === 'finalizado';
    const sportName = match.disciplinas?.name || 'Deporte';
    const sportEmoji = getSportEmoji(sportName);
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(sportName, match.marcador_detalle || {});
    const generoMatch = match.genero || 'masculino';
    const hasTimer = ['Fútbol', 'Baloncesto', 'Futsal'].includes(sportName);
    const sportColor = SPORT_COLORS[sportName] || '#10b981';

    const tenisDetalle = match.marcador_detalle || {};
    const tenisSet = tenisDetalle.set_actual || 1;
    const tenisSetData = tenisDetalle.sets?.[tenisSet] || {};
    const { labelA: tenisPuntoA, labelB: tenisPuntoB } = formatTenisPunto(tenisSetData.puntos_a || 0, tenisSetData.puntos_b || 0);

    return (
        <div className="min-h-screen text-slate-200 font-sans selection:bg-white/10 transition-colors duration-1000" style={{ background: `linear-gradient(to bottom, ${sportColor}25, #000 90%)`, backgroundColor: '#000' }}>
            {/* Immersive Sport Atmosphere with Vibrant Lighting */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                {/* Main Dynamic Atmosphere */}
                <div className="absolute inset-0 opacity-100" 
                     style={{ background: `radial-gradient(circle at 50% 0%, ${sportColor}50 0%, transparent 70%)` }} />
                
                {/* Intense Emissive Light Rays */}
                <div className="absolute inset-x-0 -top-1/2 h-[150%] opacity-60 blur-[150px]"
                    style={{ background: `conic-gradient(from 180deg at 50% 0%, transparent 40%, ${sportColor}80 50%, transparent 60%)` }} />
                
                {/* Elemento 08 - Subliminal Presence */}
                <div className="absolute -right-20 top-1/4 md:w-[1000px] md:h-[1000px] w-[600px] h-[600px] opacity-[0.2] mix-blend-screen scale-125 overflow-hidden">
                    <img src="/elementos/08.png" alt="" className="w-full h-full object-contain filter contrast-125 saturate-150 rotate-12" />
                </div>

                {/* Stardust Texture - More visible for tactile feel */}
                <div className="absolute inset-0 opacity-[0.14] mix-blend-screen" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
                
                {/* Corner Mesh Accents */}
                <div className="absolute -left-1/4 -bottom-1/4 w-full h-full opacity-30 blur-[120px]"
                    style={{ background: `radial-gradient(circle at 0% 100%, ${sportColor}40, transparent 70%)` }} />
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

            {/* Main Content Container */}
            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pb-20 pt-24 sm:pt-32">
                {/* Match Card - Crystal Clean Style */}
                <div className={cn(
                    "relative overflow-hidden rounded-[2.5rem] backdrop-blur-3xl border shadow-[0_30px_70px_rgba(0,0,0,0.6)] mb-8 transition-all duration-700"
                )} style={{ 
                    background: `linear-gradient(135deg, ${sportColor}20 0%, rgba(255,255,255,0.01) 100%)`,
                    borderColor: `${sportColor}30`
                }}>
                    {/* Internal Inner Glow for Premium Depth */}
                    <div className="absolute inset-0 rounded-[2.5rem] p-[1px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    {/* Minimalist Sport Accent */}
                    <div className={cn(
                        "absolute top-0 left-0 right-0 h-1 mt-[-1px]", 
                        `bg-gradient-to-r from-transparent via-${sportName.toLowerCase()}-500/40 to-transparent`
                    )} style={{ background: `linear-gradient(to right, transparent, ${sportColor}60, transparent)` }} />

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
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase shadow-lg" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                        <Calendar size={14} style={{ color: sportColor }} />
                                        {new Date(match.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </div>
                                )}

                                {isFinished && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 text-[10px] sm:text-xs font-black tracking-widest uppercase" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                        <Trophy size={14} /> Finalizado
                                    </div>
                                )}

                                <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-lg transition-all"
                                )} style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: sportColor }}>
                                    <SportIcon sport={sportName} size={14} />
                                    <span>{sportName}</span>
                                    <span className="opacity-30 mx-1">•</span>
                                    <span className={cn(
                                        generoMatch === 'femenino' ? 'text-pink-400' :
                                            generoMatch === 'mixto' ? 'text-purple-400' : 'text-blue-400'
                                    )}>{generoMatch}</span>
                                </div>

                                {(sportName === 'Tenis' || sportName === 'Tenis de Mesa') && (match as any).categoria && (
                                    <span className="px-3 py-1.5 rounded-xl bg-background/80 border border-white/10 text-[10px] font-black uppercase tracking-widest text-lime-400 shadow-lg">
                                        {(match as any).categoria === 'intermedio' ? 'Intermedio' : 'Avanzado'}
                                    </span>
                                )}
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
                                        .map((p: any, idx: number) => {
                                            const hasProfile = !!p.profile_id;
                                            const Content = (
                                                <div className={cn(
                                                    "flex items-center gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300 relative group/participant active:scale-[0.98] active:brightness-110",
                                                    hasProfile ? "cursor-pointer bg-white/[0.03] border-white/10 hover:border-emerald-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-500/10" : "cursor-default bg-white/5 border-white/5 text-slate-400",
                                                    p.posicion === 1 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-900/5 border-[#FFC000]/30 text-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-[1.02] z-10" :
                                                        p.posicion === 2 ? "bg-gradient-to-r from-slate-400/20 to-slate-800/5 border-slate-400/30 text-slate-200" :
                                                            p.posicion === 3 ? "bg-gradient-to-r from-orange-700/20 to-orange-900/5 border-orange-600/30 text-orange-200" :
                                                                ""
                                                )}>
                                                    <div className="text-2xl sm:text-3xl font-black italic w-8 sm:w-12 text-center opacity-80 flex-shrink-0">
                                                        {p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : p.posicion === 3 ? '🥉' : (p.posicion || idx + 1)}
                                                    </div>

                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <div className={cn("font-bold text-base sm:text-xl truncate leading-tight transition-colors flex items-center gap-1.5", hasProfile ? "group-hover/participant:text-emerald-400" : "text-white/90")}>
                                                            {p.nombre}
                                                            {hasProfile && <ExternalLink size={14} className="opacity-30 group-hover/participant:opacity-100 transition-opacity" />}
                                                        </div>
                                                        <div className="text-xs sm:text-sm font-medium opacity-60 uppercase tracking-wide truncate mt-0.5 text-white/70">
                                                            {p.equipo}
                                                            {p.carril && <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px]">CARRIL {p.carril}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="text-right font-mono font-bold text-lg sm:text-2xl tabular-nums tracking-tight text-white drop-shadow-md">
                                                        {p.tiempo || '--:--'}
                                                    </div>

                                                    {hasProfile && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 group-hover/participant:opacity-100 transition-all translate-x-4 group-hover/participant:translate-x-0">
                                                            <div className="px-2 py-1 rounded-lg bg-emerald-500 text-black text-[8px] font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(16,185,129,0.3)]">PERFIL</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );

                                            return hasProfile ? (
                                                <Link key={idx} href={`/perfil/${p.profile_id}`}>
                                                    {Content}
                                                </Link>
                                            ) : (
                                                <div key={idx}>{Content}</div>
                                            );
                                        })}

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
                                <div className="flex flex-col items-center group w-full min-w-0">
                                    <div className="relative shrink-0 p-1">
                                        <div className={cn(
                                            "absolute inset-0 rounded-full blur-xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500",
                                            `bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/20'}`
                                        )} />
                                        
                                        <div className="relative group/avatar">
                                            {(() => {
                                                const atletaAIds = {
                                                    profile_id: (match as any).atleta_a_info?.profile?.id || (match as any).atleta_a?.profile_id || match.athlete_a_id || (match as any).atleta_a_info?.id_profile,
                                                    jugador_id: (match as any).atleta_a || (match as any).atleta_a_info?.id,
                                                };

                                                return (
                                                    <Link 
                                                        href={
                                                            atletaAIds.profile_id ? `/perfil/${atletaAIds.profile_id}` :
                                                            (match as any).atleta_a_info?.id ? `/jugador/${(match as any).atleta_a_info.id}` :
                                                            atletaAIds.jugador_id ? `/jugador/${atletaAIds.jugador_id}` :
                                                            (match as any).delegacion_a_id ? `/equipo/${(match as any).delegacion_a_id}` :
                                                            '/perfil/no-encontrado'
                                                        }
                                                        className="relative group/btn cursor-pointer block"
                                                    >
                                                        <div className="relative">
                                                            <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500", SPORT_GLOW[sportName])} />
                                                            <Avatar 
                                                                src={(match as any).atleta_a_info?.profile?.avatar_url || (match as any).atleta_a_info?.avatar_url || (match as any).delegacion_a_info?.escudo_url}
                                                                size="lg" 
                                                                className={cn("w-20 h-20 sm:w-28 sm:h-28 text-2xl sm:text-4xl border-2 border-white/10 shadow-2xl bg-black/40 relative z-10 transition-all group-hover/btn:scale-105")} 
                                                            />
                                                            <div className="absolute -bottom-2 z-30 flex justify-center w-full">
                                                                <div className={cn(
                                                                    "py-0.5 px-2 rounded-full backdrop-blur-2xl border border-white/20 transition-all duration-300",
                                                                    "font-black text-[6px] sm:text-[8px] uppercase tracking-widest shadow-xl",
                                                                    "group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110 active:scale-95"
                                                                )} style={{ 
                                                                    backgroundColor: sportColor,
                                                                    color: ['Ajedrez'].includes(sportName) ? '#000' : '#fff',
                                                                    boxShadow: `0 4px 12px ${sportColor}40`
                                                                }}>
                                                                    VER PERFIL
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 w-full relative z-10 sm:mt-1">
                                        <h2 className={cn(
                                            "font-black text-[12px] sm:text-xl leading-[1.1] uppercase tracking-tight text-center w-full px-1 transition-all duration-300 drop-shadow-sm",
                                            (match.athlete_a_id || (match as any).delegacion_a_id || match.carrera_a_id) ? "group-hover/btn:scale-105" : "text-white"
                                        )} style={{ color: (match.athlete_a_id || (match as any).delegacion_a_id || match.carrera_a_id) ? '' : 'white' }}>
                                            {getDisplayName(match, 'a')}
                                        </h2>
                                        {/* Career Link */}
                                        {isIndividualSport(sportName) && getDisplayName(match, 'a') !== 'TBD' && getDisplayName(match, 'a') !== 'BYE' && !!((match as any).atleta_a_info?.carrera?.nombre || (match as any).atleta_a?.carrera?.nombre || (match as any).carrera_a?.nombre || match.carrera_a?.nombre || getCarreraSubtitle(match, 'a')) && (
                                            <Link
                                                href={
                                                    (match as any).atleta_a_info?.carrera?.id ? `/carrera/${(match as any).atleta_a_info.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).atleta_a?.carrera?.id ? `/carrera/${(match as any).atleta_a.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).carrera_a?.id ? `/carrera/${(match as any).carrera_a.id}?sport=${encodeURIComponent(sportName)}` :
                                                    match.carrera_a_id ? `/carrera/${match.carrera_a_id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).delegacion_a_id ? `/equipo/${(match as any).delegacion_a_id}` : '#'
                                                }
                                                className="mt-2 group/carrera flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95"
                                            >
                                                <img
                                                    src={(match as any).atleta_a_info?.carrera?.escudo_url || (match as any).atleta_a?.carrera?.escudo_url || (match as any).carrera_a?.escudo_url || match.carrera_a?.escudo_url || '/logo_olimpiadas.png'}
                                                    alt=""
                                                    className="w-3 h-3 sm:w-4 sm:h-4 object-contain opacity-70 group-hover/carrera:opacity-100 transition-opacity"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo_olimpiadas.png' }}
                                                />
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest group-hover/carrera:text-white transition-colors">
                                                    {(match as any).atleta_a_info?.carrera?.nombre || (match as any).atleta_a?.carrera?.nombre || (match as any).carrera_a?.nombre || match.carrera_a?.nombre || getCarreraSubtitle(match, 'a') || ''}
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center relative z-20 min-w-[120px] sm:min-w-[220px] shrink-0">
                                    <div className={cn(
                                        "flex items-center justify-center gap-2 sm:gap-6 font-black text-5xl sm:text-7xl tabular-nums tracking-tighter transition-all duration-300",
                                        isLive ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-white/80"
                                    )}>
                                        <span className="w-12 sm:w-24 text-right flex-1">{scoreA}</span>
                                        <div className="w-3 sm:w-6 h-1 sm:h-2 bg-white/20 rounded-full shrink-0 mx-2" />
                                        <span className="w-12 sm:w-24 text-left flex-1">{scoreB}</span>
                                    </div>

                                    <div className="flex flex-col items-center mt-3 sm:mt-4 w-full px-2 sm:px-0">
                                        <div className={cn(
                                            "flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3",
                                            isLive ? (SPORT_LIVE_TEXT[match.disciplinas?.name ?? ''] || SPORT_LIVE_TEXT.default) : "text-white/40"
                                        )}>
                                            {extra ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("brightness-125 drop-shadow-[0_0_8px_currentColor]", isLive ? (SPORT_ACCENT[match.disciplinas?.name ?? ''] || 'text-white') : 'text-white/40')}>{extra}</span>
                                                    {isLive && (match.marcador_detalle as any)?.time && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                            <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span>{isLive ? 'EN CURSO' : isFinished ? 'FINAL' : 'PROGRAMADO'}</span>
                                            )}
                                        </div>
                                        {isLive && (
                                            <div className="w-24 sm:w-32 h-1 rounded-full bg-white/5 overflow-hidden">
                                                <div className={cn("h-full transition-all duration-1000", SPORT_LIVE_BAR[match.disciplinas?.name ?? ''] || SPORT_LIVE_BAR.default)} style={{ width: '60%', boxShadow: '0 0 10px currentColor' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Team B */}
                                <div className="flex flex-col items-center group w-full min-w-0">
                                    <div className="relative shrink-0 p-1">
                                        <div className={cn(
                                            "absolute inset-0 rounded-full blur-xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500",
                                            `bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/20'}`
                                        )} />
                                        
                                        <div className="relative group/avatar">
                                            {(() => {
                                                const atletaBIds = {
                                                    profile_id: (match as any).atleta_b_info?.profile?.id || (match as any).atleta_b?.profile_id || match.athlete_b_id || (match as any).atleta_b_info?.id_profile,
                                                    jugador_id: (match as any).atleta_b || (match as any).atleta_b_info?.id,
                                                };

                                                return (
                                                    <Link 
                                                        href={
                                                            atletaBIds.profile_id ? `/perfil/${atletaBIds.profile_id}` :
                                                            (match as any).atleta_b_info?.id ? `/jugador/${(match as any).atleta_b_info.id}` :
                                                            atletaBIds.jugador_id ? `/jugador/${atletaBIds.jugador_id}` :
                                                            (match as any).delegacion_b_id ? `/equipo/${(match as any).delegacion_b_id}` :
                                                            '/perfil/no-encontrado'
                                                        }
                                                        className="relative group/btn cursor-pointer block"
                                                    >
                                                        <div className="relative">
                                                            <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500", SPORT_GLOW[sportName])} />
                                                            <Avatar 
                                                                src={(match as any).atleta_b_info?.profile?.avatar_url || (match as any).atleta_b_info?.avatar_url || (match as any).delegacion_b_info?.escudo_url}
                                                                size="lg" 
                                                                className={cn("w-20 h-20 sm:w-28 sm:h-28 text-2xl sm:text-4xl border-2 border-white/10 shadow-2xl bg-black/40 relative z-10 transition-all group-hover/btn:scale-105")} 
                                                            />
                                                            <div className="absolute -bottom-2 z-30 flex justify-center w-full">
                                                                <div className={cn(
                                                                    "py-0.5 px-2 rounded-full backdrop-blur-2xl border border-white/20 transition-all duration-300",
                                                                    "font-black text-[6px] sm:text-[8px] uppercase tracking-widest shadow-xl",
                                                                    "group-hover/btn:-translate-y-0.5 group-hover/btn:scale-110 active:scale-95"
                                                                )} style={{ 
                                                                    backgroundColor: sportColor,
                                                                    color: ['Ajedrez'].includes(sportName) ? '#000' : '#fff',
                                                                    boxShadow: `0 4px 12px ${sportColor}40`
                                                                }}>
                                                                    VER PERFIL
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 w-full relative z-10 sm:mt-1">
                                        <h2 className={cn(
                                            "font-black text-[12px] sm:text-xl leading-[1.1] uppercase tracking-tight text-center w-full px-1 transition-all duration-300 drop-shadow-sm",
                                            (match.athlete_b_id || (match as any).delegacion_b_id || match.carrera_b_id) ? "group-hover/btn:scale-105" : "text-white"
                                        )}>{getDisplayName(match, 'b')}</h2>
                                        {/* Career Link */}
                                        {isIndividualSport(sportName) && getDisplayName(match, 'b') !== 'TBD' && getDisplayName(match, 'b') !== 'BYE' && !!((match as any).atleta_b_info?.carrera?.nombre || (match as any).atleta_b?.carrera?.nombre || (match as any).carrera_b?.nombre || match.carrera_b?.nombre || getCarreraSubtitle(match, 'b')) && (
                                            <Link
                                                href={
                                                    (match as any).atleta_b_info?.carrera?.id ? `/carrera/${(match as any).atleta_b_info.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).atleta_a?.carrera?.id ? `/carrera/${(match as any).atleta_a.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).carrera_b?.id ? `/carrera/${(match as any).carrera_b.id}?sport=${encodeURIComponent(sportName)}` :
                                                    match.carrera_b_id ? `/carrera/${match.carrera_b_id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).delegacion_b_id ? `/equipo/${(match as any).delegacion_b_id}` : '#'
                                                }
                                                className="mt-2 group/carrera flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95"
                                            >
                                                <img
                                                    src={(match as any).atleta_b_info?.carrera?.escudo_url || (match as any).atleta_b?.carrera?.escudo_url || (match as any).carrera_b?.escudo_url || match.carrera_b?.escudo_url || '/logo_olimpiadas.png'}
                                                    alt=""
                                                    className="w-3 h-3 sm:w-4 sm:h-4 object-contain opacity-70 group-hover/carrera:opacity-100 transition-opacity"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo_olimpiadas.png' }}
                                                />
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest group-hover/carrera:text-white transition-colors">
                                                    {(match as any).atleta_b_info?.carrera?.nombre || (match as any).atleta_b?.carrera?.nombre || (match as any).carrera_b?.nombre || match.carrera_b?.nombre || getCarreraSubtitle(match, 'b') || ''}
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Metadata Footer: Clean Location Label */}
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
                <div className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.04] backdrop-blur-3xl border border-white/10 p-7 mb-8 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {/* Inner Mesh for depth */}
                    <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center gap-4 mb-6">
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
                            <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: sportColor }}>
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
                                })() ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-white/5 border border-white/10")
                                : "bg-white/5"
                        )}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tu acierto</p>
                            <p className={cn("text-sm font-black",
                                match?.estado === 'finalizado' ? (() => {
                                    const md = match?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result ? "text-emerald-400" : "text-white/60";
                                })() : "text-white"
                            )}>
                                {userPrediction.winner_pick === 'A' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(match, 'a')}</> :
                                    userPrediction.winner_pick === 'B' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(match, 'b')}</> : <><Handshake size={12} className="inline mr-1" />Empate</>}
                            </p>
                        </div>
                    ) : null}
                </div>

                {sportName !== 'Voleibol' && (
                    <MatchTimeline
                        match={match}
                        eventos={eventos}
                        sportName={sportName}
                    />
                )}

                {/* Match Statistics */}
                <div className="mt-8">
                    <MatchStats
                        match={match}
                        eventos={eventos}
                        sportName={sportName}
                    />
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
