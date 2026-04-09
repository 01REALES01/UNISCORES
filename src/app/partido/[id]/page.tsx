"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { Badge, Avatar, Button } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Calendar, Share2, AlignLeft, Users, BarChart3, Flame, Lock, HandMetal, CheckCircle, Handshake, Crown, ExternalLink, Target, ChevronDown, Minus, Plus } from "lucide-react";
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

type ExtendedPartido = Partido & {
    atleta_a?: any;
    atleta_b?: any;
    atleta_a_info?: any;
    atleta_b_info?: any;
}
import { MatchTimeline } from '@/modules/matches/components/match-timeline';
import { MatchStats } from '@/modules/matches/components/match-stats';
import { SafeBackButton } from "@/shared/components/safe-back-button";

import UniqueLoading from "@/components/ui/morph-loading";

export default function PublicMatchDetail() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.id as string;

    const { user } = useAuth();

    const [match, setMatch] = useState<ExtendedPartido | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
    const [userPrediction, setUserPrediction] = useState<any>(null);
    const [votingPick, setVotingPick] = useState<string | null>(null);
    const [showBonus, setShowBonus] = useState(false);
    const [bonusGolesA, setBonusGolesA] = useState<number | null>(null);
    const [bonusGolesB, setBonusGolesB] = useState<number | null>(null);
    const [marginPick, setMarginPick] = useState<'CLOSE' | 'WIDE' | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [carrerasMap, setCarrerasMap] = useState<Record<number, { nombre: string; escudo_url?: string | null }>>({});
    const [atletaACarrera, setAtletaACarrera] = useState<{ id: number; nombre: string; escudo_url?: string | null } | null>(null);
    const [atletaBCarrera, setAtletaBCarrera] = useState<{ id: number; nombre: string; escudo_url?: string | null } | null>(null);
    const [atletaAIds, setAtletaAIds] = useState<{ profile_id: string | null; jugador_id: number | null }>({ profile_id: null, jugador_id: null });
    const [atletaBIds, setAtletaBIds] = useState<{ profile_id: string | null; jugador_id: number | null }>({ profile_id: null, jugador_id: null });

    // Cargar datos
    const fetchData = async (signal?: AbortSignal) => {
        setLoading(true);
        setFetchError(null);
        try {
            const PARTIDO_SELECT = [
                'id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria',
                'fase, grupo, bracket_order, delegacion_a, delegacion_b',
                'delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id, jugador_a_id, jugador_b_id',
                'disciplinas:disciplina_id(name)',
                'carrera_a:carreras!carrera_a_id(nombre, escudo_url)',
                'carrera_b:carreras!carrera_b_id(nombre, escudo_url)',
                'delegacion_a_info:delegaciones!delegacion_a_id(escudo_url)',
                'delegacion_b_info:delegaciones!delegacion_b_id(escudo_url)',
                'atleta_a:profiles!athlete_a_id(id, full_name, avatar_url, carrera_id, carrera:carreras!carrera_id(id, nombre, escudo_url))',
                'atleta_b:profiles!athlete_b_id(id, full_name, avatar_url, carrera_id, carrera:carreras!carrera_id(id, nombre, escudo_url))',
                'atleta_a_info:jugadores!jugador_a_id(id, nombre, carrera:carreras!carrera_id(id, nombre, escudo_url), profile:profiles!profile_id(id, full_name, avatar_url))',
                'atleta_b_info:jugadores!jugador_b_id(id, nombre, carrera:carreras!carrera_id(id, nombre, escudo_url), profile:profiles!profile_id(id, full_name, avatar_url))',
            ].join(', ');

            const matchRes = await safeQuery(
                supabase
                    .from('partidos')
                    .select(PARTIDO_SELECT)
                    .eq('id', matchId)
                    .single(),
                'partido-detail'
            );

            let finalMatch = matchRes.data;

            if (matchRes.error && !matchRes.data) {
                console.warn('[fetchData] Full query failed, trying fallback:', matchRes.error.message);
                const fallbackRes = await safeQuery(
                    supabase
                        .from('partidos')
                        .select('id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle, categoria, fase, grupo, bracket_order, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id, disciplinas:disciplina_id(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url), delegacion_a_info:delegaciones!delegacion_a_id(escudo_url), delegacion_b_info:delegaciones!delegacion_b_id(escudo_url), atleta_a:profiles!athlete_a_id(id, full_name, avatar_url, carrera_id, carrera:carreras!carrera_id(id, nombre, escudo_url)), atleta_b:profiles!athlete_b_id(id, full_name, avatar_url, carrera_id, carrera:carreras!carrera_id(id, nombre, escudo_url))')
                        .eq('id', matchId)
                        .single(),
                    'partido-detail-fallback'
                );

                if (fallbackRes.error && !fallbackRes.data) {
                    setFetchError(fallbackRes.error.message || matchRes.error.message || 'Error al cargar el partido');
                    return;
                }
                if (fallbackRes.data) {
                    finalMatch = fallbackRes.data as any;
                    setMatch(finalMatch);
                }
            } else if (matchRes.data) {
                setMatch(matchRes.data as ExtendedPartido);
            }

            const finalMatchAny = finalMatch as any;

            // Para deportes individuales: lookup secundario de carrera por nombre del atleta
            const INDIVIDUAL_SPORTS = ['Tenis', 'Tenis de Mesa', 'Ajedrez'];
            const sportNameForLookup = finalMatchAny?.disciplinas?.name || '';
            if (INDIVIDUAL_SPORTS.includes(sportNameForLookup)) {
                const lookups: Promise<void>[] = [];
                if (finalMatchAny?.equipo_a) {
                    lookups.push(
                        (async () => {
                            const { data } = await supabase.from('jugadores')
                                .select('id, profile_id, carrera:carreras!carrera_id(id, nombre, escudo_url)')
                                .ilike('nombre', finalMatchAny.equipo_a)
                                .limit(1).maybeSingle();
                            if (!data) return;
                            const c = Array.isArray(data.carrera) ? data.carrera[0] : data.carrera;
                            if (c) setAtletaACarrera(c as any);
                            setAtletaAIds({ profile_id: data.profile_id ?? null, jugador_id: data.id ?? null });
                        })()
                    );
                }
                if (finalMatchAny?.equipo_b) {
                    lookups.push(
                        (async () => {
                            const { data } = await supabase.from('jugadores')
                                .select('id, profile_id, carrera:carreras!carrera_id(id, nombre, escudo_url)')
                                .ilike('nombre', finalMatchAny.equipo_b)
                                .limit(1).maybeSingle();
                            if (!data) return;
                            const c = Array.isArray(data.carrera) ? data.carrera[0] : data.carrera;
                            if (c) setAtletaBCarrera(c as any);
                            setAtletaBIds({ profile_id: data.profile_id ?? null, jugador_id: data.id ?? null });
                        })()
                    );
                }
                if (lookups.length) await Promise.all(lookups);
            }

            if (finalMatchAny?.marcador_detalle?.tipo === 'carrera') {
                const ids: number[] = (finalMatchAny.marcador_detalle.participantes || [])
                    .map((p: any) => p.carrera_id)
                    .filter((id: any): id is number => typeof id === 'number');
                const uniqueIds = [...new Set(ids)];
                if (uniqueIds.length > 0) {
                    const { data: carrerasData } = await supabase
                        .from('carreras')
                        .select('id, nombre, escudo_url')
                        .in('id', uniqueIds);
                    if (carrerasData) {
                        const map: Record<number, { nombre: string; escudo_url?: string | null }> = {};
                        carrerasData.forEach((c: any) => { map[c.id] = c; });
                        setCarrerasMap(map);
                    }
                }
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
                    if (userPred.prediction_type === 'score') {
                        setShowBonus(true);
                        const sport = (matchRes?.data as any)?.disciplinas?.name;
                        if (sport === 'Baloncesto') {
                            setMarginPick(userPred.goles_a === 0 ? 'CLOSE' : 'WIDE');
                        } else {
                            setBonusGolesA(userPred.goles_a);
                            setBonusGolesB(userPred.goles_b);
                        }
                    }
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

        const sportN = (match as any).disciplinas?.name;
        const BONUS_SPORTS = ['Fútbol', 'Voleibol', 'Baloncesto'];
        const hasBonusBet = showBonus && BONUS_SPORTS.includes(sportN) && (
            (sportN === 'Fútbol' && bonusGolesA !== null && bonusGolesB !== null) ||
            (sportN === 'Voleibol' && bonusGolesA !== null && bonusGolesB !== null) ||
            (sportN === 'Baloncesto' && marginPick !== null)
        );

        try {
            // Ensure profile exists
            await supabase.from('profiles').upsert(
                { id: user.id, email: user.email },
                { onConflict: 'id' }
            );

            const payload = {
                user_id: user.id,
                match_id: parseInt(matchId),
                prediction_type: hasBonusBet ? 'score' : 'winner',
                winner_pick: pick,
                goles_a: hasBonusBet
                    ? (sportN === 'Baloncesto' ? (marginPick === 'CLOSE' ? 0 : 1) : bonusGolesA)
                    : null,
                goles_b: hasBonusBet
                    ? (sportN === 'Baloncesto' ? null : bonusGolesB)
                    : null,
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

    // Handle winner change (auto-open bonus, reset volley)
    const handleWinnerChange = (pick: string) => {
        setVotingPick(pick);
        const sportN = (match as any)?.disciplinas?.name;
        const BONUS_SPORTS = ['Fútbol', 'Voleibol', 'Baloncesto'];
        if (BONUS_SPORTS.includes(sportN) && (pick !== 'DRAW' || sportN === 'Fútbol')) {
            setShowBonus(true);
        }
        if (sportN === 'Voleibol') {
            setBonusGolesA(null);
            setBonusGolesB(null);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);

        // Global revalidate listener (triggered by VisibilityRevalidate)
        const handleRevalidate = () => {
            fetchData(controller.signal);
        };
        window.addEventListener('app:revalidate', handleRevalidate);

        // Polling cada 20s en lugar de Realtime para no saturar conexiones WebSocket
        // (Supabase Free = 200 conexiones simultáneas máximo)
        const pollInterval = setInterval(() => {
            if (!document.hidden) fetchData(controller.signal);
        }, 20_000);

        return () => {
            controller.abort();
            clearInterval(pollInterval);
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
    
    // Robust sport name extraction (handles object or array)
    const rawDisc: any = match.disciplinas;
    const sportName = (Array.isArray(rawDisc) ? rawDisc[0]?.name : rawDisc?.name) || 'Deporte';
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
                <div className="pointer-events-auto">
                    <SafeBackButton fallback="/partidos" />
                </div>

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
                        {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
                        <div className="absolute -right-[10%] -bottom-[15%] flex items-center justify-center pointer-events-none select-none opacity-[0.05] rotate-[-12deg] z-0">
                            <SportIcon sport={sportName} size={380} className="text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.05)]" />
                        </div>

                        {/* Status Badges & Integrated Timer */}
                        <div className="flex flex-col justify-center items-center mb-8 relative z-20 px-4 w-full">
                            {/* Live Timer directly integrated above the badge */}
                            {isLive && hasTimer && (
                                <div className="z-30 flex items-center justify-center scale-90 sm:scale-100 transition-all mb-3 drop-shadow-md">
                                    <PublicLiveTimer detalle={match.marcador_detalle || {}} deporte={match.disciplinas?.name} />
                                </div>
                            )}
                            <div className="flex flex-wrap justify-center items-center">
                                <div className="inline-flex items-center gap-4 px-4 py-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl bg-black/60 transition-all duration-500">
                                    {!isFinished && !isLive && (
                                        <div className="flex items-center gap-2 text-white/90 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase">
                                            <Calendar size={14} style={{ color: sportColor }} />
                                            <span>{new Date(match.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    )}

                                    {!isFinished && !isLive && (
                                        <div className="w-[1px] h-3 bg-white/10 self-center" />
                                    )}

                                    <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest whitespace-nowrap" style={{ color: sportColor }}>
                                        <div className="p-1 rounded-lg bg-black/40 flex items-center justify-center">
                                            <SportIcon sport={sportName} size={13} />
                                        </div>
                                        <span>{sportName}</span>
                                        <span className="opacity-30 mx-0.5">•</span>
                                        <span className={cn(
                                            "font-black",
                                            generoMatch === 'femenino' ? 'text-pink-400' :
                                                generoMatch === 'mixto' ? 'text-purple-400' : 'text-blue-400'
                                        )}>{generoMatch}</span>
                                    </div>

                                    {(sportName === 'Tenis' || sportName === 'Tenis de Mesa') && (match as any).categoria && (
                                        <>
                                            <div className="w-[1px] h-3 bg-white/10 self-center" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-lime-400">
                                                {(match as any).categoria === 'intermedio' ? 'Intermedio' : 'Avanzado'}
                                            </span>
                                        </>
                                    )}
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
                                        .map((p: any, idx: number) => {
                                            const hasProfile = !!p.profile_id;
                                            const carreraInfo = p.carrera_id ? carrerasMap[p.carrera_id] : null;
                                            const carreraName = carreraInfo?.nombre || p.carrera || p.equipo;
                                            const carreraEscudo = carreraInfo?.escudo_url;

                                            return (
                                                <div key={idx} className={cn(
                                                    "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300 relative group/participant",
                                                    "bg-white/5 border-white/5",
                                                    p.posicion === 1 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-900/5 border-[#FFC000]/30 text-yellow-100 shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-[1.02] z-10" :
                                                        p.posicion === 2 ? "bg-gradient-to-r from-slate-400/20 to-slate-800/5 border-slate-400/30 text-slate-200" :
                                                            p.posicion === 3 ? "bg-gradient-to-r from-orange-700/20 to-orange-900/5 border-orange-600/30 text-orange-200" :
                                                                ""
                                                )}>
                                                    {/* Position */}
                                                    <div className="text-2xl sm:text-3xl font-black italic w-8 sm:w-10 text-center opacity-80 flex-shrink-0">
                                                        {p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : p.posicion === 3 ? '🥉' : (p.posicion || idx + 1)}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                        {/* Athlete name */}
                                                        {hasProfile || p.jugador_id ? (
                                                            <Link 
                                                                href={hasProfile ? `/perfil/${p.profile_id}` : `/jugador/${p.jugador_id}`}
                                                                className="font-bold text-sm sm:text-lg truncate leading-tight transition-colors flex items-center gap-1.5 text-white underline decoration-white/0 hover:decoration-cyan-500/50 hover:text-cyan-400 group/name"
                                                            >
                                                                {p.nombre}
                                                                <ExternalLink size={12} className="opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                                                            </Link>
                                                        ) : (
                                                            <div className="font-bold text-sm sm:text-lg truncate leading-tight text-white/90">
                                                                {p.nombre}
                                                            </div>
                                                        )}

                                                        {/* Carrera badge */}
                                                        {carreraName && (
                                                            p.carrera_id ? (
                                                                <Link
                                                                    href={`/carrera/${p.carrera_id}`}
                                                                    className="inline-flex items-center gap-1.5 w-fit max-w-full group/carrera hover:brightness-125 transition-all"
                                                                >
                                                                    {carreraEscudo ? (
                                                                        <img src={carreraEscudo} alt="" className="w-4 h-4 rounded-sm object-contain shrink-0 opacity-80 group-hover/carrera:opacity-100" />
                                                                    ) : (
                                                                        <div className="w-4 h-4 rounded-sm bg-white/10 shrink-0" />
                                                                    )}
                                                                    <span className="text-[11px] font-medium text-white/50 uppercase tracking-wide truncate group-hover/carrera:text-cyan-400 transition-colors">
                                                                        {carreraName}
                                                                    </span>
                                                                </Link>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-4 h-4 rounded-sm bg-white/10 shrink-0" />
                                                                    <span className="text-[11px] font-medium text-white/40 uppercase tracking-wide truncate">{carreraName}</span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>

                                                    {/* Carril + Tiempo */}
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <div className="font-mono font-bold text-lg sm:text-2xl tabular-nums tracking-tight text-white drop-shadow-md">
                                                            {p.tiempo || '--:--'}
                                                        </div>
                                                        {p.carril && (
                                                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                                                                C{p.carril}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
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
                                    <div className="w-full flex flex-col items-center">
                                        {getDisplayName(match, 'a') !== 'TBD' && getDisplayName(match, 'a') !== 'BYE' && (
                                            <Link
                                                href={
                                                    match.atleta_a ? `/perfil/${match.atleta_a.id}` :
                                                    match.atleta_a_info?.profile ? `/perfil/${match.atleta_a_info.profile.id}` :
                                                    match.athlete_a_id ? `/perfil/${match.athlete_a_id}` :
                                                    atletaAIds.profile_id ? `/perfil/${atletaAIds.profile_id}` :
                                                    match.atleta_a_info?.id ? `/jugador/${match.atleta_a_info.id}` :
                                                    atletaAIds.jugador_id ? `/jugador/${atletaAIds.jugador_id}` :
                                                    (match as any).delegacion_a_id ? `/equipo/${(match as any).delegacion_a_id}` :
                                                    '/perfil/no-encontrado'
                                                }
                                                className={cn(
                                                    "relative w-full flex flex-col items-center gap-2.5 transition-all duration-300 active:scale-95 group/btn cursor-pointer"
                                                )}
                                            >
                                                <div className="relative shrink-0 p-1">
                                                    <div className={cn(
                                                        "absolute inset-0 rounded-full blur-xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500",
                                                        `bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/20'}`
                                                    )} />
                                                    
                                                    <div className="relative group/avatar">
                                                        <div className="absolute inset-0 rounded-full blur-md opacity-0 group-hover/btn:opacity-40 transition-opacity duration-500" style={{ backgroundColor: sportColor }} />
                                                        <Avatar
                                                            name={getDisplayName(match, 'a')}
                                                            src={
                                                                match.atleta_a?.avatar_url ||
                                                                match.atleta_a_info?.profile?.avatar_url ||
                                                                match.atleta_a?.carrera?.escudo_url ||
                                                                match.atleta_a_info?.carrera?.escudo_url ||
                                                                atletaACarrera?.escudo_url ||
                                                                match.carrera_a?.escudo_url ||
                                                                match.delegacion_a_info?.escudo_url
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

                                                <div className="flex flex-col items-center gap-0.5 w-full relative z-10">
                                                    <h2 className={cn(
                                                        "font-black text-[11px] sm:text-[15px] leading-[1.1] uppercase tracking-tight text-center w-full px-2 transition-all duration-300 drop-shadow-sm text-white group-hover/btn:text-white/100 line-clamp-2"
                                                    )}>
                                                        {getDisplayName(match, 'a')}
                                                    </h2>
                                                </div>
                                            </Link>
                                        )}

                                        {/* Career Link (Bottom Part) - With Fallback if Null */}
                                        {isIndividualSport(sportName) && getDisplayName(match, 'a') !== 'TBD' && getDisplayName(match, 'a') !== 'BYE' && !!(match.atleta_a_info?.carrera?.nombre || match.atleta_a?.carrera?.nombre || atletaACarrera?.nombre || match.carrera_a?.nombre || getCarreraSubtitle(match, 'a')) && (
                                            <Link 
                                                href={
                                                    match.atleta_a_info?.carrera?.id ? `/carrera/${match.atleta_a_info.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    match.atleta_a?.carrera?.id ? `/carrera/${match.atleta_a.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    atletaACarrera?.id ? `/carrera/${atletaACarrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    match.carrera_a_id ? `/carrera/${match.carrera_a_id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).delegacion_a_id ? `/equipo/${(match as any).delegacion_a_id}` : '#'
                                                }
                                                onClick={(e) => {
                                                    const targetId = match.atleta_a_info?.carrera?.id || match.atleta_a?.carrera?.id || atletaACarrera?.id || match.carrera_a_id || (match as any).delegacion_a_id;
                                                    if (!targetId) e.preventDefault();
                                                }}
                                                className="mt-2 group/carrera flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95"
                                            >
                                                <img
                                                    src={match.atleta_a_info?.carrera?.escudo_url || match.atleta_a?.carrera?.escudo_url || atletaACarrera?.escudo_url || match.carrera_a?.escudo_url || '/logo_olimpiadas.png'}
                                                    alt=""
                                                    className="w-3 h-3 sm:w-4 sm:h-4 object-contain opacity-70 group-hover/carrera:opacity-100 transition-opacity"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo_olimpiadas.png' }}
                                                />
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest group-hover/carrera:text-white transition-colors">
                                                    {match.atleta_a_info?.carrera?.nombre || match.atleta_a?.carrera?.nombre || atletaACarrera?.nombre || match.carrera_a?.nombre || getCarreraSubtitle(match, 'a') || ''}
                                                </span>
                                            </Link>
                                        )}
                                    </div>
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
                                            <span className="w-12 sm:w-24 text-right flex-1">{scoreA}</span>
                                            <div className="w-3 sm:w-6 h-1 sm:h-2 bg-white/20 rounded-full shrink-0 mx-2" />
                                            <span className="w-12 sm:w-24 text-left flex-1">{scoreB}</span>
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

                                    {/* Info Row: Time, Quarter/Set, and Status Bar */}
                                    <div className="flex flex-col items-center mt-3 sm:mt-4 w-full px-2 sm:px-0">
                                        <div className={cn(
                                            "flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3",
                                            isLive ? (SPORT_LIVE_TEXT[match.disciplinas?.name ?? ''] || SPORT_LIVE_TEXT.default) : "text-white/40"
                                        )}>
                                            {extra ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "brightness-125 drop-shadow-[0_0_8px_currentColor]",
                                                        isLive ? (SPORT_ACCENT[match.disciplinas?.name ?? ''] || 'text-white') : 'text-white/40'
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

                                        {/* Glowing Progress Status Bar */}
                                        <div className={cn(
                                            "w-full h-1 sm:h-[6px] rounded-full overflow-hidden relative",
                                            isLive ? (SPORT_LIVE_BG_WRAPPER[match.disciplinas?.name ?? ''] || SPORT_LIVE_BG_WRAPPER.default) : "bg-white/10"
                                        )}>
                                            {isLive ? (
                                                <div className={cn("h-full rounded-full w-[100%] absolute top-0 left-0 animate-pulse", SPORT_LIVE_BAR[match.disciplinas?.name ?? ''] || SPORT_LIVE_BAR.default)} />
                                            ) : isFinished ? (
                                                <div className="h-full bg-white/40 rounded-full w-[100%] absolute top-0 left-0" />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                {/* Team B */}
                                <div className="flex flex-col items-center group w-full min-w-0">
                                    <div className="w-full flex flex-col items-center">
                                        {getDisplayName(match, 'b') !== 'TBD' && getDisplayName(match, 'b') !== 'BYE' && (
                                            <Link
                                                href={
                                                    match.atleta_b ? `/perfil/${match.atleta_b.id}` :
                                                    match.atleta_b_info?.profile ? `/perfil/${match.atleta_b_info.profile.id}` :
                                                    match.athlete_b_id ? `/perfil/${match.athlete_b_id}` :
                                                    atletaBIds.profile_id ? `/perfil/${atletaBIds.profile_id}` :
                                                    match.atleta_b_info?.id ? `/jugador/${match.atleta_b_info.id}` :
                                                    atletaBIds.jugador_id ? `/jugador/${atletaBIds.jugador_id}` :
                                                    (match as any).delegacion_b_id ? `/equipo/${(match as any).delegacion_b_id}` :
                                                    '/perfil/no-encontrado'
                                                }
                                                className={cn(
                                                    "relative w-full flex flex-col items-center gap-2.5 transition-all duration-300 active:scale-95 group/btn cursor-pointer"
                                                )}
                                            >
                                                <div className="relative shrink-0 p-1">
                                                    <div className={cn(
                                                        "absolute inset-0 rounded-full blur-xl opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500",
                                                        `bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/20'}`
                                                    )} />
                                                    
                                                    <div className="relative group/avatar">
                                                        <div className="absolute inset-0 rounded-full blur-md opacity-0 group-hover/btn:opacity-40 transition-opacity duration-500" style={{ backgroundColor: sportColor }} />
                                                        <Avatar
                                                            name={getDisplayName(match, 'b')}
                                                            src={
                                                                match.atleta_b?.avatar_url ||
                                                                match.atleta_b_info?.profile?.avatar_url ||
                                                                match.atleta_b?.carrera?.escudo_url ||
                                                                match.atleta_b_info?.carrera?.escudo_url ||
                                                                atletaBCarrera?.escudo_url ||
                                                                match.carrera_b?.escudo_url ||
                                                                match.delegacion_b_info?.escudo_url
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

                                                <div className="flex flex-col items-center gap-0.5 w-full relative z-10">
                                                    <h2 className={cn(
                                                        "font-black text-[11px] sm:text-[15px] leading-[1.1] uppercase tracking-tight text-center w-full px-2 transition-all duration-300 drop-shadow-sm text-white group-hover/btn:text-white/100 line-clamp-2"
                                                    )}>
                                                        {getDisplayName(match, 'b')}
                                                    </h2>
                                                </div>
                                            </Link>
                                        )}

                                        {/* Career Link (Bottom Part) - With Fallback if Null */}
                                        {isIndividualSport(sportName) && getDisplayName(match, 'b') !== 'TBD' && getDisplayName(match, 'b') !== 'BYE' && !!(match.atleta_b_info?.carrera?.nombre || match.atleta_b?.carrera?.nombre || atletaBCarrera?.nombre || match.carrera_b?.nombre || getCarreraSubtitle(match, 'b')) && (
                                            <Link
                                                href={
                                                    match.atleta_b_info?.carrera?.id ? `/carrera/${match.atleta_b_info.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    match.atleta_b?.carrera?.id ? `/carrera/${match.atleta_b.carrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    atletaBCarrera?.id ? `/carrera/${atletaBCarrera.id}?sport=${encodeURIComponent(sportName)}` :
                                                    match.carrera_b_id ? `/carrera/${match.carrera_b_id}?sport=${encodeURIComponent(sportName)}` :
                                                    (match as any).delegacion_b_id ? `/equipo/${(match as any).delegacion_b_id}` : '#'
                                                }
                                                onClick={(e) => {
                                                    const targetId = match.atleta_b_info?.carrera?.id || match.atleta_b?.carrera?.id || atletaBCarrera?.id || match.carrera_b_id || (match as any).delegacion_b_id;
                                                    if (!targetId) e.preventDefault();
                                                }}
                                                className="mt-2 group/carrera flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95"
                                            >
                                                <img
                                                    src={match.atleta_b_info?.carrera?.escudo_url || match.atleta_b?.carrera?.escudo_url || atletaBCarrera?.escudo_url || match.carrera_b?.escudo_url || '/logo_olimpiadas.png'}
                                                    alt=""
                                                    className="w-3 h-3 sm:w-4 sm:h-4 object-contain opacity-70 group-hover/carrera:opacity-100 transition-opacity"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/logo_olimpiadas.png' }}
                                                />
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest group-hover/carrera:text-white transition-colors">
                                                    {match.atleta_b_info?.carrera?.nombre || match.atleta_b?.carrera?.nombre || atletaBCarrera?.nombre || match.carrera_b?.nombre || getCarreraSubtitle(match, 'b') || ''}
                                                </span>
                                            </Link>
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
                                <span className="text-xs sm:text-sm font-bold text-white/80 tracking-wide">{match.lugar || 'Coliseo Central'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Community Predictions + Voting Section */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.04] backdrop-blur-3xl border border-white/10 p-7 mb-8 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {/* Inner Mesh for depth */}
                    <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg", SPORT_ACCENT[sportName])}>
                                <BarChart3 size={22} className="drop-shadow-[0_0_10px_currentColor]" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1 uppercase font-display">Acierta y Gana</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-[10px] text-white/40 font-black uppercase tracking-widest">
                                        <Users size={12} className="text-white/20" />
                                        <span className="text-white/60">{matchPredictions.length}</span> personas han votado
                                    </div>
                                </div>
                            </div>
                        </div>
                        {userPrediction && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xl">
                                <CheckCircle size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Votaste</span>
                            </div>
                        )}
                    </div>

                    {/* Predictions Visualization */}
                    {(() => {
                        const isCarrera = match.marcador_detalle?.tipo === 'carrera';
                        const winnerPreds = matchPredictions.filter(p => p.winner_pick);
                        const total = winnerPreds.length;

                        if (isCarrera) {
                            // Race visualization: List top favorites
                            const participants = match.marcador_detalle?.participantes || [];
                            const counts = winnerPreds.reduce((acc, p) => {
                                acc[p.winner_pick] = (acc[p.winner_pick] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            const sortedParticipants = [...participants]
                                .map(p => ({
                                    ...p,
                                    votes: counts[p.nombre] || 0,
                                    pct: total > 0 ? Math.round(((counts[p.nombre] || 0) / total) * 100) : 0
                                }))
                                .sort((a, b) => b.votes - a.votes)
                                .slice(0, 4);

                            return (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Favoritos de la comunidad</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {sortedParticipants.map((p, idx) => {
                                            const Inner = (
                                                <div className="flex flex-col min-w-0">
                                                    <span className={cn("text-xs font-black truncate transition-colors", p.profile_id ? "text-cyan-400 group-hover:text-cyan-300" : "text-white")}>
                                                        {p.nombre}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{p.votes} votos</span>
                                                </div>
                                            );

                                            return (
                                                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between group">
                                                    {p.profile_id ? (
                                                        <Link href={`/perfil/${p.profile_id}`} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
                                                            {Inner}
                                                        </Link>
                                                    ) : Inner}
                                                    <div className="flex items-center gap-3 shrink-0 ml-2">
                                                        <div className="text-xl font-black font-mono" style={{ color: sportColor }}>{p.pct}%</div>
                                                        <div className="w-1.5 h-8 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="w-full bg-current rounded-full transition-all duration-1000" style={{ height: `${p.pct}%`, color: sportColor }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {participants.length === 0 && (
                                            <div className="col-span-full py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                                <p className="text-white/20 text-xs italic">No hay votos aún</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        // Team visualization: Classic 3-way bar
                        const countA = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'A').length : 0;
                        const countDraw = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'DRAW').length : 0;
                        const countB = total > 0 ? winnerPreds.filter(p => p.winner_pick === 'B').length : 0;
                        const pctA = total > 0 ? Math.round((countA / total) * 100) : 33;
                        const pctDraw = total > 0 ? Math.round((countDraw / total) * 100) : 34;
                        const pctB = total > 0 ? 100 - pctA - pctDraw : 33;

                        return (
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-2">
                                    <div className="flex flex-col items-start">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{getDisplayName(match, 'a')?.split(' ')[0]}</span>
                                        <div className={cn("text-3xl font-black font-mono leading-none", (SPORT_ACCENT[sportName] || "text-emerald-400"))}>
                                            {total > 0 ? `${pctA}%` : '0%'}<span className="text-[10px] ml-1 opacity-40 italic">votos</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center pb-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">Empate</span>
                                        <div className="text-xl font-black text-white/40 font-mono leading-none">
                                            {total > 0 ? `${pctDraw}%` : '0%'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{getDisplayName(match, 'b')?.split(' ')[0]}</span>
                                        <div className={cn("text-3xl font-black font-mono leading-none", (SPORT_ACCENT[sportName] || "text-emerald-400"))}>
                                            {total > 0 ? `${pctB}%` : '0%'}<span className="text-[10px] ml-1 opacity-40 italic">votos</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative h-4 rounded-full overflow-hidden bg-black/40 border border-white/5 flex gap-[3px] p-[2px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(pctA, 1)}%` }}
                                        className={cn("h-full rounded-l-full relative overflow-hidden", (SPORT_ACCENT[sportName] || "bg-emerald-500/80"))}
                                        style={{ backgroundColor: 'currentColor' }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(pctDraw, 1)}%` }}
                                        className="h-full bg-white/10 relative"
                                    />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(pctB, 1)}%` }}
                                        className={cn("h-full rounded-r-full relative", (SPORT_ACCENT[sportName] || "bg-emerald-500/80"))}
                                        style={{ backgroundColor: 'currentColor', filter: 'brightness(1.5)' }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-l from-white/10 to-black/10" />
                                    </motion.div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Voting Zone */}
                    {match?.estado === 'programado' && user ? (
                        <div className="mt-8 pt-6 border-t border-white/10 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900 border border-white/10 shadow-xl">
                                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] whitespace-nowrap">
                                    {userPrediction ? (match.marcador_detalle?.tipo === 'carrera' ? 'Cambiar ganador' : 'Cambiar predicción') : (match.marcador_detalle?.tipo === 'carrera' ? '¿Quién ganará la prueba?' : '¿Quién ganará?')}
                                </p>
                            </div>

                            {(() => {
                                const isCarrera = match.marcador_detalle?.tipo === 'carrera';
                                const sName = (match as any).disciplinas?.name;

                                if (isCarrera) {
                                    const participants = match.marcador_detalle?.participantes || [];
                                    return (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {participants.map((p: any, idx: number) => {
                                                    const isSelected = votingPick === p.nombre;
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleWinnerChange(p.nombre)}
                                                            disabled={saving}
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left group",
                                                                isSelected 
                                                                    ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                                                    : "bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/20"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors",
                                                                isSelected ? "bg-black text-white" : "bg-white/10 text-white/40"
                                                            )}>
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-xs truncate uppercase tracking-tight">{p.nombre}</p>
                                                                <p className={cn("text-[9px] font-bold uppercase tracking-widest truncate", isSelected ? "text-black/40" : "text-white/20")}>
                                                                    {p.equipo || p.carrera || 'Competidor'}
                                                                </p>
                                                            </div>
                                                            {isSelected && <CheckCircle size={14} className="text-black shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {votingPick && (
                                                <button
                                                    onClick={() => handleVote(votingPick)}
                                                    disabled={saving}
                                                    className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white text-black shadow-2xl hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {saving ? 'Guardando...' : userPrediction ? 'Confirmar nuevo ganador' : 'Confirmar ganador'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                }

                                const supportsDraws = ['Fútbol', 'Ajedrez'].includes(sName);
                                const BONUS_SPORTS = ['Fútbol', 'Voleibol', 'Baloncesto'];
                                const hasBonus = BONUS_SPORTS.includes(sName);

                                const winnerOpts = supportsDraws
                                    ? [
                                        { key: 'A', name: getDisplayName(match, 'a')?.split(' ')[0] || 'A' },
                                        { key: 'DRAW', name: 'Empate' },
                                        { key: 'B', name: getDisplayName(match, 'b')?.split(' ')[0] || 'B' }
                                    ]
                                    : [
                                        { key: 'A', name: getDisplayName(match, 'a')?.split(' ')[0] || 'A' },
                                        { key: 'B', name: getDisplayName(match, 'b')?.split(' ')[0] || 'B' }
                                    ];

                                const volleyOpts = votingPick === 'A'
                                    ? [{ a: 2, b: 0 }, { a: 2, b: 1 }]
                                    : votingPick === 'B'
                                        ? [{ a: 0, b: 2 }, { a: 1, b: 2 }]
                                        : [];

                                return (
                                    <div className="space-y-4">
                                        <div className={cn("grid gap-3", supportsDraws ? "grid-cols-3" : "grid-cols-2")}>
                                            {winnerOpts.map(opt => (
                                                <button
                                                    key={opt.key}
                                                    onClick={() => handleWinnerChange(opt.key)}
                                                    disabled={saving}
                                                    className={cn(
                                                        "py-2.5 px-2 rounded-[1.25rem] text-[10px] font-black tracking-widest transition-all border-2 uppercase font-sans",
                                                        votingPick === opt.key
                                                            ? opt.key === 'DRAW'
                                                                ? "bg-slate-300 text-black border-slate-300 shadow-lg scale-105"
                                                                : "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105"
                                                            : "bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/20 active:scale-95"
                                                    )}
                                                >
                                                    {opt.name}
                                                </button>
                                            ))}
                                        </div>

                                        {hasBonus && votingPick && (votingPick !== 'DRAW' || sName === 'Fútbol') && showBonus && (
                                            <div className="bg-black/30 rounded-2xl border border-white/5 p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                                {/* (Omitted score bonus logic for brevity, matches user's original if they want it) */}
                                                {sName === 'Fútbol' && (
                                                    <div className="flex items-center justify-center gap-6">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{getDisplayName(match, 'a')?.split(' ')[0]}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setBonusGolesA(Math.max(0, (bonusGolesA ?? 0) - 1))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"><Minus size={12} /></button>
                                                                <span className="text-2xl font-black font-mono tabular-nums text-white w-8 text-center">{bonusGolesA ?? 0}</span>
                                                                <button onClick={() => setBonusGolesA((bonusGolesA ?? 0) + 1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"><Plus size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <span className="text-white/20 text-xl font-black">-</span>
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{getDisplayName(match, 'b')?.split(' ')[0]}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setBonusGolesB(Math.max(0, (bonusGolesB ?? 0) - 1))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"><Minus size={12} /></button>
                                                                <span className="text-2xl font-black font-mono tabular-nums text-white w-8 text-center">{bonusGolesB ?? 0}</span>
                                                                <button onClick={() => setBonusGolesB((bonusGolesB ?? 0) + 1)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"><Plus size={12} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {sName === 'Voleibol' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {volleyOpts.map((opt) => (
                                                            <button key={`${opt.a}-${opt.b}`} onClick={() => { setBonusGolesA(opt.a); setBonusGolesB(opt.b); }} className={cn("py-3 px-4 rounded-xl font-display font-black text-lg border-2 transition-all", bonusGolesA === opt.a && bonusGolesB === opt.b ? "bg-violet-500/15 border-violet-500 text-violet-300" : "bg-black/30 border-white/10 text-white/50")}>{opt.a} - {opt.b}</button>
                                                        ))}
                                                    </div>
                                                )}
                                                {sName === 'Baloncesto' && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={() => setMarginPick('CLOSE')} className={cn("py-4 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5", marginPick === 'CLOSE' ? "bg-violet-500/15 border-violet-500 text-violet-300" : "bg-black/30 border-white/10 text-white/50")}> <span className="text-xs font-display font-black uppercase tracking-wider">Cerrado</span> <span className="text-[9px] text-white/30 font-bold">{"≤"}10 pts</span> </button>
                                                        <button onClick={() => setMarginPick('WIDE')} className={cn("py-4 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5", marginPick === 'WIDE' ? "bg-violet-500/15 border-violet-500 text-violet-300" : "bg-black/30 border-white/10 text-white/50")}> <span className="text-xs font-display font-black uppercase tracking-wider">Amplio</span> <span className="text-[9px] text-white/30 font-bold">{">"}10 pts</span> </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {votingPick && (
                                            <button
                                                onClick={() => handleVote(votingPick)}
                                                disabled={saving}
                                                className={cn("w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2", userPrediction ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/10 text-white border-white/10 hover:bg-white hover:text-black")}
                                            >
                                                {saving ? 'Guardando...' : userPrediction ? 'Actualizar Acierto' : 'Confirmar Acierto'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : match?.estado === 'programado' && !user ? (
                        <div className="mt-5 pt-4 border-t border-white/5 text-center">
                            <Link href="/login" className="text-[10px] font-bold uppercase tracking-widest transition-colors" style={{ color: sportColor }}>
                                Inicia sesión para predecir →
                            </Link>
                        </div>
                    ) : match?.estado !== 'programado' && userPrediction ? (
                        <div className={cn(
                            "mt-5 pt-4 border-t border-white/5 text-center p-3 rounded-xl space-y-2",
                            match?.estado === 'finalizado'
                                ? ((() => {
                                    const isCarrera = match.marcador_detalle?.tipo === 'carrera';
                                    if (isCarrera) {
                                        const winner = (match.marcador_detalle?.participantes || []).find((p: any) => p.posicion === 1);
                                        return userPrediction.winner_pick === winner?.nombre;
                                    }
                                    const md = match?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result;
                                })() ? "bg-emerald-500/10 border border-emerald-500/15" : "bg-white/5 border border-white/10")
                                : "bg-white/5"
                        )}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tu acierto</p>
                            <div className={cn("text-sm font-black",
                                match?.estado === 'finalizado' ? (() => {
                                    const isCarrera = match.marcador_detalle?.tipo === 'carrera';
                                    if (isCarrera) {
                                        const winner = (match.marcador_detalle?.participantes || []).find((p: any) => p.posicion === 1);
                                        return userPrediction.winner_pick === winner?.nombre ? "text-emerald-400" : "text-white/60";
                                    }
                                    const md = match?.marcador_detalle || {};
                                    const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                    const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                    const result = sA > sB ? 'A' : sB > sA ? 'B' : 'DRAW';
                                    return userPrediction.winner_pick === result ? "text-emerald-400" : "text-white/60";
                                })() : "text-white"
                            )}>
                                {match.marcador_detalle?.tipo === 'carrera' ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Trophy size={14} style={{ color: sportColor }} />
                                        <span>Gana {userPrediction.winner_pick}</span>
                                    </div>
                                ) : (
                                    userPrediction.winner_pick === 'A' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(match, 'a')}</> :
                                    userPrediction.winner_pick === 'B' ? <><Trophy size={12} className="inline mr-1" />Gana {getDisplayName(match, 'b')}</> : <><Handshake size={12} className="inline mr-1" />Empate</>
                                )}
                            </div>
                            {/* Bonus Info (Fútbol/Volley/Basket) */}
                            {userPrediction.prediction_type === 'score' && (
                                <div className="flex items-center justify-center mt-1">
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-black uppercase tracking-wider">
                                        <Target size={12} />
                                        <span>
                                            {(match as any).disciplinas?.name === 'Baloncesto' 
                                                ? (userPrediction.goles_a === 0 ? 'Cerrado' : 'Amplio')
                                                : `Resultado: ${userPrediction.goles_a}-${userPrediction.goles_b}`}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {/* Points earned */}
                            {match?.estado === 'finalizado' && userPrediction.puntos_ganados !== null && userPrediction.puntos_ganados !== undefined && (
                                <div className="flex items-center justify-center mt-2">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black shadow-lg",
                                        userPrediction.puntos_ganados > 0 ? "bg-emerald-500 text-black shadow-emerald-500/20" : "bg-white/5 text-white/30"
                                    )}>
                                        {userPrediction.puntos_ganados > 0 ? <Crown size={12} /> : null}
                                        <span>+{userPrediction.puntos_ganados} pts</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {sportName !== 'Voleibol' && match.marcador_detalle?.tipo !== 'carrera' && (
                    <MatchTimeline
                        match={match}
                        eventos={eventos}
                        sportName={sportName}
                    />
                )}

                {match.marcador_detalle?.tipo !== 'carrera' && (
                    <div className="mt-8">
                        <MatchStats
                            match={match}
                            eventos={eventos}
                            sportName={sportName}
                        />
                    </div>
                )}

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
