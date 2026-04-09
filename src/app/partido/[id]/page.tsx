"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { Badge, Avatar, Button } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Calendar, Share2, AlignLeft, Users, BarChart3, Flame, Lock, HandMetal, CheckCircle, Handshake, Crown, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCurrentScore } from "@/lib/sport-scoring";
import { useMatch } from "@/modules/matches/hooks/use-match";
import { useMatchEvents } from "@/modules/matches/hooks/use-match-events";
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

    // ─── SWR Data Fetching ──────────────────────────────────────────────────────
    const { match, loading: matchLoading, error: matchError, mutate: mutateMatch } = useMatch(matchId);
    const { events: eventos, loading: eventsLoading, mutate: mutateEvents } = useMatchEvents(matchId);

    // Predictions (pronosticos) - SWR implementation matching previous manual fetch
    const { data: matchPredictions = [], mutate: mutatePredictions } = useSWR(
        matchId ? `match:${matchId}:predictions` : null,
        async () => {
            const { data, error } = await supabase.from('pronosticos').select('winner_pick, prediction_type').eq('match_id', matchId);
            if (error) throw error;
            return data;
        }
    );

    const { data: userPrediction = null, mutate: mutateUserPrediction } = useSWR(
        (matchId && user) ? `match:${matchId}:userPrediction:${user.id}` : null,
        async () => {
            const { data, error } = await supabase.from('pronosticos').select('*').eq('match_id', matchId).eq('user_id', user!.id).single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
            return data;
        }
    );

    const [votingPick, setVotingPick] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Sync votingPick with userPrediction
    useEffect(() => {
        if (userPrediction) setVotingPick(userPrediction.winner_pick);
    }, [userPrediction]);

    // Handle voting
    const handleVote = async (pick: string) => {
        if (!user || !match) return;
        if (match.estado !== 'programado') return;

        setVotingPick(pick);
        setSaving(true);

        try {
            // Optimistic Update can be added here if needed, but for now we re-mutate after
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

            // Refresh SWR data
            mutatePredictions();
            mutateUserPrediction();

            toast.success('¡Acierto guardado!');
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getSportEmoji = (name: string) => {
        const map: Record<string, string> = {
            'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
            'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
        };
        return map[name] || '🏅';
    };

    const fetchError = matchError?.message;

    if (matchLoading && !match) return (
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
                    onClick={() => mutateMatch()}
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

    // From here onwards, match is guaranteed to be non-null. 
    // We use a local constant with an explicit type assertion to satisfy the compiler in all environments.
    const m = match as PartidoWithRelations;

    const isLive = m.estado === 'en_curso';
    const isFinished = m.estado === 'finalizado';
    const sportName = m.disciplinas?.name || 'Deporte';
    const sportEmoji = getSportEmoji(sportName);
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(sportName, m.marcador_detalle || {});
    const generoMatch = m.genero || 'masculino';
    const hasTimer = ['Fútbol', 'Baloncesto', 'Futsal', 'Fútbol Sala'].includes(sportName);
    const sportColor = SPORT_COLORS[sportName] || '#10b981';

    const tenisDetalle = m.marcador_detalle || {};
    const tenisSet = tenisDetalle.set_actual || 1;
    const tenisSetData = tenisDetalle.sets?.[tenisSet] || {};
    const { labelA: tenisPuntoA, labelB: tenisPuntoB } = formatTenisPunto(tenisSetData.puntos_a || 0, tenisSetData.puntos_b || 0);

    return (
        <div className="min-h-screen text-slate-200 font-sans selection:bg-white/10 transition-colors duration-1000" style={{ background: `linear-gradient(to bottom, ${sportColor}25, #000 90%)`, backgroundColor: '#000' }}>
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute inset-0 opacity-100" 
                     style={{ background: `radial-gradient(circle at 50% 0%, ${sportColor}50 0%, transparent 70%)` }} />
                <div className="absolute inset-x-0 -top-1/2 h-[150%] opacity-60 blur-[150px]"
                    style={{ background: `conic-gradient(from 180deg at 50% 0%, transparent 40%, ${sportColor}80 50%, transparent 60%)` }} />
                <div className="absolute -right-20 top-1/4 md:w-[1000px] md:h-[1000px] w-[600px] h-[600px] opacity-[0.2] mix-blend-screen scale-125 overflow-hidden">
                    <img src="/elementos/08.png" alt="" className="w-full h-full object-contain filter contrast-125 saturate-150 rotate-12" />
                </div>
                <div className="absolute inset-0 opacity-[0.14] mix-blend-screen" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
                <div className="absolute -left-1/4 -bottom-1/4 w-full h-full opacity-30 blur-[120px]"
                    style={{ background: `radial-gradient(circle at 0% 100%, ${sportColor}40, transparent 70%)` }} />
            </div>

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

            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 pb-20 pt-24 sm:pt-32">
                <div className={cn(
                    "relative overflow-hidden rounded-[2.5rem] backdrop-blur-3xl border shadow-[0_30px_70px_rgba(0,0,0,0.6)] mb-8 transition-all duration-700"
                )} style={{ 
                    background: `linear-gradient(135deg, ${sportColor}20 0%, rgba(255,255,255,0.01) 100%)`,
                    borderColor: `${sportColor}30`
                }}>
                    <div className="absolute inset-0 rounded-[2.5rem] p-[1px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className={cn(
                        "absolute top-0 left-0 right-0 h-1 mt-[-1px]", 
                        `bg-gradient-to-r from-transparent via-${sportName.toLowerCase()}-500/40 to-transparent`
                    )} style={{ background: `linear-gradient(to right, transparent, ${sportColor}60, transparent)` }} />

                    <div className="relative px-6 py-8 sm:px-10 sm:py-10 text-center">
                        <div className="flex flex-col justify-center items-center mb-8 relative z-20 px-4 w-full">
                            {isLive && hasTimer && (
                                <div className="z-30 flex items-center justify-center scale-90 sm:scale-100 transition-all mb-4 drop-shadow-md">
                                    <PublicLiveTimer detalle={m.marcador_detalle || {}} deporte={m.disciplinas?.name} />
                                </div>
                            )}

                            <div className="flex justify-center items-center">
                                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-500 hover:border-white/20 group/header">
                                    {!isFinished && !isLive && (
                                        <>
                                            <div className="flex items-center gap-2 text-white/90">
                                                <Calendar size={14} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.15em]">
                                                    {new Date(m.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <div className="w-px h-3 bg-white/20 mx-1" />
                                        </>
                                    )}

                                    {isFinished && (
                                        <>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Trophy size={14} className="text-amber-500" />
                                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Finalizado</span>
                                            </div>
                                            <div className="w-px h-3 bg-white/20 mx-1" />
                                        </>
                                    )}

                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-white/5 p-1 rounded-lg">
                                            <SportIcon sport={sportName} size={14} className="text-white" />
                                        </div>
                                        <div className="flex items-center gap-1.5 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em]">
                                            <span className="text-white">{sportName}</span>
                                            <span className="text-white/20 font-light mx-0.5">•</span>
                                            <span className={cn(
                                                "drop-shadow-[0_0_8px_currentColor]",
                                                generoMatch === 'femenino' ? 'text-pink-400' :
                                                generoMatch === 'mixto' ? 'text-purple-400' : 'text-cyan-400'
                                            )}>{generoMatch}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {m.marcador_detalle?.tipo === 'carrera' ? (
                            <div className="w-full max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500 my-4">
                                <div className="text-center mb-8 mt-4 sm:mt-0">
                                    <h1 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 uppercase tracking-tighter drop-shadow-sm leading-tight mb-2">
                                        {m.carrera_a?.nombre || m.equipo_a}
                                    </h1>
                                </div>

                                <div className="flex flex-col gap-2 relative">
                                    {(m.marcador_detalle?.participantes || [])
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
                                                    hasProfile ? "cursor-pointer bg-white/[0.03] border-white/10 hover:border-emerald-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-500/10" : "cursor-default bg-white/5 border-white/10 text-white/60",
                                                    p.posicion === 1 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-900/5 border-[#FFC000]/40 text-yellow-100 shadow-[0_0_30px_rgba(234,179,8,0.15)] scale-[1.02] z-10" :
                                                        p.posicion === 2 ? "bg-gradient-to-r from-slate-400/20 to-slate-800/10 border-slate-400/40 text-slate-100" :
                                                            p.posicion === 3 ? "bg-gradient-to-r from-orange-700/20 to-orange-900/10 border-orange-600/40 text-orange-100" :
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

                                    {(m.marcador_detalle?.participantes || []).length === 0 && (
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
                                                const profile = (m as any).atleta_a;
                                                const profileId = profile?.id || m.athlete_a_id;
                                                
                                                const Content = (
                                                    <div className="relative group/btn cursor-pointer block">
                                                        <div className="relative">
                                                            <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500", SPORT_GLOW[sportName])} />
                                                            <Avatar 
                                                                src={
                                                                    profile?.avatar_url || 
                                                                    profile?.carrera?.escudo_url ||
                                                                    (m as any).carrera_a?.escudo_url || 
                                                                    (m as any).delegacion_a_info?.escudo_url ||
                                                                    '/logo_olimpiadas.png'
                                                                }
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
                                                    </div>
                                                );

                                                return profileId ? (
                                                    <Link href={`/perfil/${profileId}`}>
                                                        {Content}
                                                    </Link>
                                                ) : Content;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 w-full relative z-10 sm:mt-1">
                                        <h2 className={cn(
                                            "font-black text-[12px] sm:text-xl leading-[1.1] uppercase tracking-tight text-center w-full px-1 transition-all duration-300 drop-shadow-sm",
                                            (m.athlete_a_id || (m as any).delegacion_a_id || m.carrera_a_id) ? "group-hover/btn:text-emerald-400 group-hover/btn:scale-105" : "text-white"
                                        )}>
                                            {getDisplayName(m, 'a')}
                                        </h2>
                                        
                                        {isIndividualSport(sportName) && getDisplayName(m, 'a') !== 'TBD' && getDisplayName(m, 'a') !== 'BYE' && (
                                            <div className="mt-2 group/carrera flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                <img
                                                    src={
                                                        (m as any).atleta_a?.carrera?.escudo_url ||
                                                        (m as any).carrera_a?.escudo_url || 
                                                        (m as any).delegacion_a_info?.escudo_url ||
                                                        '/logo_olimpiadas.png'
                                                    }
                                                    alt=""
                                                    className="w-3 h-3 sm:w-4 sm:h-4 object-contain opacity-70 group-hover/carrera:opacity-100 transition-opacity"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo_olimpiadas.png' }}
                                                />
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest group-hover/carrera:text-white transition-colors">
                                                    {(m as any).atleta_a?.carrera?.nombre || (m as any).carrera_a?.nombre || (m as any).delegacion_a || getCarreraSubtitle(m, 'a') || ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center relative z-20 min-w-[120px] sm:min-w-[180px] shrink-0">
                                    {sportName === 'Ajedrez' ? (
                                        <div className="flex flex-col items-center justify-center w-full min-h-[100px] sm:min-h-[140px]">
                                            {isFinished && m.marcador_detalle?.resultado_final === 'empate' ? (
                                                <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex flex-col items-center shadow-lg">
                                                    <span className="text-sm sm:text-base uppercase font-black text-slate-300 tracking-[0.2em]">Empate</span>
                                                </div>
                                            ) : isLive ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="relative flex h-4 w-4">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                                    </span>
                                                    <span className="text-xl sm:text-3xl font-black text-emerald-500 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                                                        EN CURSO
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="bg-white/5 backdrop-blur-sm px-6 py-4 rounded-3xl border border-white/5 shadow-inner">
                                                    <span className="text-3xl sm:text-5xl font-black text-white/20 tracking-widest">VS</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={cn(
                                                "flex items-center justify-center gap-2 sm:gap-6 font-black text-5xl sm:text-7xl tabular-nums tracking-tighter transition-all duration-300",
                                                isLive ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-white/80"
                                            )}>
                                                <span className="w-12 sm:w-20 text-right flex-1">{scoreA}</span>
                                                <div className="w-3 sm:w-6 h-1 sm:h-2 bg-white/20 rounded-full shrink-0 mx-2" />
                                                <span className="w-12 sm:w-20 text-left flex-1">{scoreB}</span>
                                            </div>
                                            {sportName === 'Tenis' && (isLive || isFinished) && (tenisPuntoA || tenisPuntoB) && (
                                                <div className="flex items-center justify-center gap-3 mt-1 text-xs sm:text-sm font-black tabular-nums text-white/40">
                                                    <span>{tenisPuntoA}</span>
                                                    <span className="text-white/20">·</span>
                                                    <span>{tenisPuntoB}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex flex-col items-center mt-3 sm:mt-4 w-full">
                                        <div className={cn(
                                            "flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3",
                                            isLive ? (SPORT_LIVE_TEXT[m.disciplinas?.name ?? ''] || SPORT_LIVE_TEXT.default) : "text-white/40"
                                        )}>
                                            {extra ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "brightness-125 drop-shadow-[0_0_8px_currentColor]",
                                                        isLive ? (SPORT_ACCENT[m.disciplinas?.name ?? ''] || 'text-white') : 'text-white/40'
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
                                        </div>

                                        <div className={cn(
                                            "w-full h-1 sm:h-[6px] rounded-full overflow-hidden relative",
                                            isLive ? (SPORT_LIVE_BG_WRAPPER[m.disciplinas?.name ?? ''] || SPORT_LIVE_BG_WRAPPER.default) : "bg-white/10"
                                        )}>
                                            {isLive ? (
                                                <div className={cn("h-full rounded-full w-[100%] absolute top-0 left-0 animate-pulse", SPORT_LIVE_BAR[m.disciplinas?.name ?? ''] || SPORT_LIVE_BAR.default)} />
                                            ) : isFinished ? (
                                                <div className="h-full bg-white/40 rounded-full w-[100%] absolute top-0 left-0" />
                                            ) : null}
                                        </div>
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
                                                const profile = (m as any).atleta_b;
                                                const profileId = profile?.id || m.athlete_b_id;
                                                
                                                const Content = (
                                                    <div className="relative group/btn cursor-pointer block">
                                                        <div className="relative">
                                                            <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500", SPORT_GLOW[sportName])} />
                                                            <Avatar 
                                                                src={
                                                                    profile?.avatar_url || 
                                                                    profile?.carrera?.escudo_url ||
                                                                    (m as any).carrera_b?.escudo_url || 
                                                                    (m as any).delegacion_b_info?.escudo_url ||
                                                                    '/logo_olimpiadas.png'
                                                                }
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
                                                    </div>
                                                );

                                                return profileId ? (
                                                    <Link href={`/perfil/${profileId}`}>
                                                        {Content}
                                                    </Link>
                                                ) : Content;
                                            })()}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1 w-full relative z-10 sm:mt-1">
                                        <h2 className={cn(
                                            "font-black text-[12px] sm:text-xl leading-[1.1] uppercase tracking-tight text-center w-full px-1 transition-all duration-300 drop-shadow-sm",
                                            (m.athlete_b_id || (m as any).delegacion_b_id || m.carrera_b_id) ? "group-hover/btn:text-emerald-400 group-hover/btn:scale-105" : "text-white"
                                        )}>
                                            {getDisplayName(m, 'b')}
                                        </h2>
                                        
                                        {isIndividualSport(sportName) && getDisplayName(m, 'b') !== 'TBD' && getDisplayName(m, 'b') !== 'BYE' && (
                                            <div className="mt-2 group/carrera flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                                <img
                                                    src={
                                                        (m as any).atleta_b?.carrera?.escudo_url ||
                                                        (m as any).carrera_b?.escudo_url || 
                                                        (m as any).delegacion_b_info?.escudo_url ||
                                                        '/logo_olimpiadas.png'
                                                    }
                                                    alt=""
                                                    className="w-3 h-3 sm:w-4 sm:h-4 object-contain opacity-70 group-hover/carrera:opacity-100 transition-opacity"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo_olimpiadas.png' }}
                                                />
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest group-hover/carrera:text-white transition-colors">
                                                    {(m as any).atleta_b?.carrera?.nombre || (m as any).carrera_b?.nombre || (m as any).delegacion_b || getCarreraSubtitle(m, 'b') || ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 sm:mt-8 flex justify-center px-4">
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 shadow-inner backdrop-blur-md group hover:bg-white/10 transition-all">
                                <div className={cn("p-1.5 rounded-lg bg-black/20", SPORT_ACCENT[sportName])}>
                                    <MapPin size={16} className="drop-shadow-[0_0_5px_currentColor]" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-white/80 tracking-wide">{m.lugar || 'Coliseo Central'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-8 mb-8 shadow-2xl shadow-black/60 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10 shadow-xl", SPORT_ACCENT[sportName] || 'text-white')}>
                                <BarChart3 size={24} className="drop-shadow-[0_0_8px_currentColor]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-widest uppercase">Acierta y Gana</h3>
                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] flex items-center gap-1.5 mt-1">
                                    <Users size={12} className="text-white/40" /> {matchPredictions.length} personas han votado
                                </p>
                            </div>
                        </div>
                        {userPrediction && (
                            <div 
                                className={cn("px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2", SPORT_SOFT_BG[sportName] || 'bg-white/5', SPORT_ACCENT[sportName] || 'text-white')}
                                style={{ borderColor: `${sportColor}30` }}
                            >
                                <CheckCircle size={12} /> VOTASTE
                            </div>
                        )}
                    </div>

                    {(() => {
                        const winnerPreds = matchPredictions.filter(p => p.winner_pick);
                        const total = winnerPreds.length;
                        const countA = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'A').length : 0;
                        const countDraw = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'DRAW').length : 0;
                        const countB = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'B').length : 0;
                        const pctA = total > 0 ? Math.round((countA / total) * 100) : 0;
                        const pctDraw = total > 0 ? Math.round((countDraw / total) * 100) : 0;
                        const pctB = total > 0 ? 100 - pctA - pctDraw : 0;

                        return (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/80 uppercase tracking-widest truncate">{getDisplayName(m, 'a')}</p>
                                        <p className={cn("text-2xl font-black transition-colors duration-500", SPORT_ACCENT[sportName] || 'text-white')} style={{ filter: `drop-shadow(0 0 10px ${sportColor}50)` }}>
                                            {pctA}% <span className="text-[10px] font-medium opacity-40 ml-0.5">votos</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Empate</p>
                                        <p className="text-2xl font-black text-white transition-opacity duration-500 opacity-90">{pctDraw}%</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-white/80 uppercase tracking-widest truncate">{getDisplayName(m, 'b')}</p>
                                        <p className={cn("text-2xl font-black transition-colors duration-500", SPORT_ACCENT[sportName] || 'text-white')} style={{ filter: `drop-shadow(0 0 10px ${sportColor}50)` }}>
                                            {pctB}% <span className="text-[10px] font-medium opacity-40 ml-0.5">votos</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                                    <div 
                                        className="absolute inset-y-0 left-0 transition-all duration-1000 rounded-full"
                                        style={{ 
                                            width: `${pctA}%`, 
                                            backgroundColor: sportColor,
                                            boxShadow: `0 0 15px ${sportColor}60`
                                        }}
                                    />
                                    <div 
                                        className="absolute inset-y-0 bg-white/20 transition-all duration-1000"
                                        style={{ left: `${pctA}%`, width: `${pctDraw}%` }}
                                    />
                                    <div 
                                        className="absolute inset-y-0 right-0 transition-all duration-1000 rounded-full"
                                        style={{ 
                                            width: `${pctB}%`, 
                                            backgroundColor: sportColor,
                                            opacity: 0.5,
                                            boxShadow: `0 0 15px ${sportColor}40`
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    {m?.estado === 'programado' && user ? (
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex justify-center mb-6">
                                <div className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-[0.3em] shadow-xl backdrop-blur-md">
                                    {userPrediction ? 'Cambiar predicción' : 'Haz tu predicción'}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => handleVote('A')}
                                    disabled={saving}
                                    className={cn(
                                        "group relative py-4 px-2 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 overflow-hidden",
                                        votingPick === 'A'
                                            ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.05]"
                                            : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5"
                                    )}
                                >
                                    <span className="relative z-10">{getDisplayName(m, 'a')?.substring(0, 10)}</span>
                                </button>
                                <button
                                    onClick={() => handleVote('DRAW')}
                                    disabled={saving}
                                    className={cn(
                                        "group relative py-4 px-2 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 overflow-hidden",
                                        votingPick === 'DRAW'
                                            ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.05]"
                                            : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5"
                                    )}
                                >
                                    <span className="relative z-10">Empate</span>
                                </button>
                                <button
                                    onClick={() => handleVote('B')}
                                    disabled={saving}
                                    className={cn(
                                        "group relative py-4 px-2 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 overflow-hidden",
                                        votingPick === 'B'
                                            ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.05]"
                                            : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-white/5"
                                    )}
                                >
                                    <span className="relative z-10">{getDisplayName(m, 'b')?.substring(0, 10)}</span>
                                </button>
                            </div>
                        </div>
                    ) : m?.estado === 'programado' && !user ? (
                        <div className="mt-5 pt-4 border-t border-white/5 text-center">
                            <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: sportColor }}>
                                Inicia sesión para predecir →
                            </Link>
                        </div>
                    ) : m?.estado !== 'programado' && userPrediction ? (
                        <div className={cn(
                            "mt-5 pt-4 border-t border-white/5 text-center p-3 rounded-xl",
                            m?.estado === 'finalizado'
                                ? ((() => {
                                    const md = m?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result;
                                })() ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-white/5 border border-white/10")
                                : "bg-white/5"
                        )}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tu acierto</p>
                            <p className={cn("text-sm font-black",
                                m?.estado === 'finalizado' ? (() => {
                                    const md = m?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result ? "text-emerald-400" : "text-white/60";
                                })() : "text-white"
                            )}>
                                {userPrediction.winner_pick === 'A' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(m, 'a')}</> :
                                    userPrediction.winner_pick === 'B' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(m, 'b')}</> : <><Handshake size={12} className="inline mr-1" />Empate</>}
                            </p>
                        </div>
                    ) : null}
                </div>

                {sportName !== 'Voleibol' && (
                    <MatchTimeline
                        match={m}
                        eventos={eventos}
                        sportName={sportName}
                    />
                )}

                <div className="mt-8">
                    <MatchStats
                        match={m}
                        eventos={eventos}
                        sportName={sportName}
                    />
                </div>

                <div className="mt-20 text-center">
                    <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">
                        Olimpiadas UNINORTE 2026
                    </p>
                </div>
            </div>
        </div>
    );
}
