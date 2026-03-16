"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { toast } from "sonner";
import { Button, Badge, Avatar } from "@/components/ui-primitives";
import { Trophy, Clock, Lock, CheckCircle, AlertTriangle, ArrowLeft, TrendingUp, Gauge, HandMetal, Users, X, Flame, Target, Zap, ChevronDown, Filter, History, Handshake, Loader2, LayoutGrid, Info, Diamond, Star, Award, TrendingDown } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import Link from "next/link";
import { SPORT_EMOJI, SPORT_GRADIENT, SPORT_ACCENT, SPORT_BORDER } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getCurrentScore } from "@/lib/sport-scoring";
import { MainNavbar } from "@/components/main-navbar";

// ─── Helper: Determine actual match result ───
const getMatchResult = (match: any): 'A' | 'B' | 'DRAW' | null => {
    if (match.estado !== 'finalizado') return null;
    const md = match.marcador_detalle || {};
    const a = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
    const b = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
    if (a > b) return 'A';
    if (b > a) return 'B';
    return 'DRAW';
};

// ─── Vote Percentage Bar ───
const VotePercentageBar = ({ matchId, allPredictions, teamA, teamB, sportName }: { matchId: number, allPredictions: any[], teamA: string, teamB: string, sportName: string }) => {
    const matchPreds = allPredictions.filter(p => p.match_id === matchId && p.winner_pick);
    const total = matchPreds.length;
    if (total === 0) return (
        <div className="flex items-center gap-2 text-[10px] text-slate-600 justify-center py-1">
            <Users size={10} />
            <span>Sin aciertos aún</span>
        </div>
    );

    const countA = matchPreds.filter(p => p.winner_pick === 'A').length;
    const countDraw = matchPreds.filter(p => p.winner_pick === 'DRAW').length;
    const countB = matchPreds.filter(p => p.winner_pick === 'B').length;
    const pctA = Math.round((countA / total) * 100);
    const pctDraw = Math.round((countDraw / total) * 100);
    const pctB = 100 - pctA - pctDraw;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] px-0.5">
                <span className="flex items-center gap-1"><Users size={10} /> {total} aciertos</span>
            </div>
            <div className="flex gap-[2px] h-2.5 rounded-full overflow-hidden bg-white/5 shadow-inner">
                {pctA > 0 && (
                    <div
                        className={cn("transition-all duration-700 relative group", SPORT_ACCENT[sportName] || "bg-white/20")}
                        style={{ width: `${pctA}%`, backgroundColor: 'currentColor', filter: 'brightness(0.3)' }}
                    />
                )}
                {pctDraw > 0 && (
                    <div
                        className="bg-slate-700/50 transition-all duration-700"
                        style={{ width: `${pctDraw}%` }}
                    />
                )}
                {pctB > 0 && (
                    <div
                        className={cn("transition-all duration-700", SPORT_ACCENT[sportName] || "bg-white/20")}
                        style={{ width: `${pctB}%`, backgroundColor: 'currentColor', filter: 'brightness(1.7)' }}
                    />
                )}
            </div>
            <div className="flex justify-between text-[10px] font-black tabular-nums tracking-wide">
                <span className={cn(SPORT_ACCENT[sportName] || "text-white/60")}>{teamA.substring(0, 8).toUpperCase()} {pctA}%</span>
                <span className="text-slate-500">Empate {pctDraw}%</span>
                <span className={cn(SPORT_ACCENT[sportName] || "text-white/60")}>{teamB.substring(0, 8).toUpperCase()} {pctB}%</span>
            </div>
        </div>
    );
};

// ─── NEW: Quiniela Header Component ───
const QuinielaHeader = ({ user, profile, points }: { user: any, profile: any, points: number }) => {
    return (
        <div className="flex items-center justify-between py-8 px-2">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-indigo-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <Avatar name={profile?.full_name || user?.email} src={profile?.avatar_url} size="lg" className="relative border-2 border-zinc-950 ring-1 ring-white/10 shadow-2xl scale-110" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-zinc-950 flex items-center justify-center shadow-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5 font-outfit">HOLA,</p>
                    <p className="text-2xl font-black text-white tracking-tight leading-none font-outfit">
                        {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "Usuario"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-2 pr-5 rounded-[2rem] shadow-2xl group hover:bg-white/[0.08] transition-all cursor-default overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform relative z-10">
                    <Diamond size={18} className="text-black fill-current" />
                </div>
                <div className="relative z-10">
                    <span className="text-xl font-black text-white tabular-nums leading-none block font-outfit">{points}</span>
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none block mt-0.5">Puntos</span>
                </div>
            </div>
        </div>
    );
};

// ─── NEW: Quiniela Podium Component ───
const QuinielaPodium = ({ top3 }: { top3: any[] }) => {
    // Ensure we have 3 slots even if ranking is small
    const podiumSlots = [
        { pos: 2, profile: top3[1], color: 'text-slate-300', trophy: '🥈', accent: 'bg-slate-500', glow: 'shadow-slate-500/20' },
        { pos: 1, profile: top3[0], color: 'text-yellow-400', trophy: '🥇', accent: 'bg-amber-500', glow: 'shadow-amber-500/40' },
        { pos: 3, profile: top3[2], color: 'text-orange-600', trophy: '🥉', accent: 'bg-orange-600', glow: 'shadow-orange-600/20' }
    ];

    return (
        <div className="flex items-end justify-center gap-2 sm:gap-6 py-12 px-2 relative min-h-[280px]">
             {/* Background Effects */}
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
             <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-indigo-500/10 to-transparent blur-3xl -z-10" />

            {podiumSlots.map((slot, idx) => {
                if (!slot.profile) return <div key={idx} className="flex-1 opacity-0" />;
                
                const isWinner = slot.pos === 1;
                const points = slot.profile.points || 0;

                return (
                    <Link 
                        key={idx} 
                        href={`/perfil/${slot.profile.id}`}
                        className={cn(
                            "flex flex-col items-center flex-1 transition-all duration-1000 ease-out animate-in fade-in slide-in-from-bottom-12 group/p-item",
                            isWinner ? "pb-8 scale-125 z-20" : "opacity-90 scale-100 z-10"
                        )} 
                        style={{ animationDelay: `${idx * 200}ms` }}
                    >
                        
                        <div className="relative mb-5 group">
                            {/* Animated Rings for Winner */}
                            {isWinner && (
                                <>
                                    <div className="absolute -inset-4 border-2 border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                                    <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                        <Award className="text-amber-500 fill-amber-500/20 animate-bounce" size={24} />
                                    </div>
                                </>
                            )}
                            
                            <div className="relative">
                                <Avatar 
                                    name={slot.profile.display_name || slot.profile.email} 
                                    src={slot.profile.avatar_url}
                                    className={cn(
                                        "shadow-2xl transition-all duration-500 border-2",
                                        isWinner 
                                            ? "w-24 h-24 border-amber-400 group-hover:ring-4 ring-amber-400/20" 
                                            : "w-16 h-16 border-white/10 group-hover:border-white/30"
                                    )} 
                                />
                                
                                {/* Rank Badge */}
                                <div className={cn(
                                    "absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-2xl rotate-45 transform bg-zinc-950 border border-white/20",
                                    slot.color
                                )}>
                                    <span className="-rotate-45">{slot.pos}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center relative">
                            <p className={cn(
                                "text-[11px] font-black truncate max-w-[80px] uppercase tracking-wider mb-1 font-outfit group-hover/p-item:text-red-500 transition-colors",
                                isWinner ? "text-white" : "text-slate-400"
                            )}>
                                {slot.profile.display_name?.split(' ')[0] || "Invitado"}
                            </p>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-xs font-black font-outfit flex items-center gap-1 shadow-lg",
                                isWinner ? "bg-amber-500 text-black" : "bg-white/5 text-slate-300 border border-white/5"
                            )}>
                                {points} <span className="text-[8px] opacity-70">PTS</span>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};

// ─── NEW: Quiniela Ranking Item ───
const QuinielaRankingItem = ({ profile, rank, isMe }: { profile: any, rank: number, isMe: boolean }) => {
    return (
        <Link 
            href={`/perfil/${profile.id}`}
            className={cn(
                "group relative flex items-center justify-between p-4 mb-3 rounded-3xl transition-all duration-500 overflow-hidden",
                isMe 
                    ? "bg-amber-500/10 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/20" 
                    : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10"
            )}
        >
            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/[0.01] pointer-events-none" />
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="w-8 flex justify-center">
                    <span className={cn(
                        "text-lg font-black font-outfit italic",
                        rank <= 3 ? "text-amber-500/50" : "text-white/10"
                    )}>
                        #{rank}
                    </span>
                </div>
                
                <div className="relative">
                    <Avatar 
                        name={profile.display_name || profile.email} 
                        src={profile.avatar_url}
                        className="w-12 h-12 border border-white/10 group-hover:scale-110 transition-transform duration-500" 
                    />
                    {isMe && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-zinc-950 flex items-center justify-center">
                            <Star size={8} className="text-black fill-current" />
                        </div>
                    )}
                </div>
                
                <div className="space-y-0.5">
                    <p className="font-black text-sm text-white flex items-center gap-2 font-outfit group-hover:text-red-500 transition-colors">
                        {profile.display_name || "Usuario"}
                        {isMe && <Badge className="bg-amber-400 text-black border-0 text-[8px] font-black h-4 px-1.5 rounded-md">TÚ</Badge>}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] truncate max-w-[140px]">
                        {profile.email?.split('@')[0] || "Uninorte"}
                    </p>
                </div>
            </div>

            <div className="text-right pr-2 relative z-10">
                <div className="flex items-baseline justify-end gap-1">
                    <span className="text-2xl font-black text-white tabular-nums font-outfit">
                        {profile.points || 0}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pts</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                    <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500/50" style={{ width: `${Math.min(100, (profile.points || 0) / 5)}%` }} />
                    </div>
                </div>
            </div>
        </Link>
    );
};

// ─── Prediction Card ───
const PredictionCard = ({
    match, prediction, onPredict, locked, mode, allPredictions
}: {
    match: any,
    prediction: any,
    onPredict: (matchId: any, data: any) => void,
    locked: boolean,
    mode: 'score' | 'winner',
    allPredictions: any[]
}) => {
    const [scoreA, setScoreA] = useState(prediction?.goles_a ?? "");
    const [scoreB, setScoreB] = useState(prediction?.goles_b ?? "");
    const [winnerPick, setWinnerPick] = useState(prediction?.winner_pick ?? null);

    useEffect(() => {
        if (mode === 'score') {
            setScoreA(prediction?.goles_a ?? "");
            setScoreB(prediction?.goles_b ?? "");
        } else {
            setWinnerPick(prediction?.winner_pick ?? null);
        }
    }, [prediction, mode]);

    const handleSave = () => {
        if (mode === 'score') {
            if (scoreA === "" || scoreB === "") return;
            onPredict(match.id, {
                prediction_type: 'score',
                goles_a: parseInt(scoreA),
                goles_b: parseInt(scoreB),
                winner_pick: null
            });
        } else {
            if (!winnerPick) return;
            onPredict(match.id, {
                prediction_type: 'winner',
                goles_a: null,
                goles_b: null,
                winner_pick: winnerPick
            });
        }
    };

    const isPredicted = prediction !== undefined && prediction !== null;
    const isLocked = locked || match.estado !== 'programado';
    const isFinished = match.estado === 'finalizado';
    const isLive = match.estado === 'en_vivo';

    // Determine result for finished matches
    const matchResult = getMatchResult(match);
    let predictionCorrect: boolean | null = null;
    if (isFinished && isPredicted && matchResult) {
        if (prediction.prediction_type === 'winner' || prediction.winner_pick) {
            predictionCorrect = prediction.winner_pick === matchResult;
        } else if (prediction.prediction_type === 'score') {
            const md = match.marcador_detalle || {};
            const actualA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
            const actualB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
            predictionCorrect = prediction.goles_a === actualA && prediction.goles_b === actualB;
        }
    }

    // Get actual score for finished/live
    const scoreInfo = getCurrentScore(match.disciplinas?.name, match.marcador_detalle || {});

    // Card glow color based on result
    const getCardStyle = () => {
        if (isFinished && predictionCorrect === true) {
            return "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/10";
        }
        if (isFinished && predictionCorrect === false) {
            return "bg-rose-500/5 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.08)] ring-1 ring-rose-500/10";
        }
        if (isLive) {
            return "bg-rose-500/5 border-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.1)]";
        }
        if (isPredicted) {
            return "bg-red-900/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]";
        }
        return "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10";
    };

    return (
        <div className={cn(
            "relative p-6 rounded-[2.5rem] border transition-all duration-500 overflow-hidden group",
            getCardStyle()
        )}>
            {/* Visual Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Header: Sport & Status */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                        <SportIcon sport={match.disciplinas?.name} size={14} className="opacity-80" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">
                            {match.disciplinas?.name}
                        </p>
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-tight leading-none tabular-nums">
                            {new Date(match.fecha).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {new Date(match.fecha).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isLive ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">En Vivo</span>
                        </div>
                    ) : isFinished ? (
                        <Badge variant={predictionCorrect ? "success" : "destructive"} className="text-[9px] font-black shadow-lg">
                            {predictionCorrect ? "Acertado" : "Fallado"}
                        </Badge>
                    ) : (
                        <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Próximo</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Teams & Central Score */}
            <div className="relative flex items-center justify-between mb-8 px-2">
                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-xl font-black mb-3 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                        {(match.carrera_a?.nombre || match.equipo_a).substring(0, 2).toUpperCase()}
                    </div>
                    <p className="text-[11px] font-black text-white text-center leading-tight uppercase tracking-tight">
                        {match.carrera_a?.nombre || match.equipo_a}
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center min-w-[80px]">
                    {(isLive || isFinished) ? (
                        <div className="space-y-1">
                             <div className="text-3xl font-black tabular-nums font-mono tracking-tighter text-white flex items-center gap-2">
                                <span>{scoreInfo.scoreA}</span>
                                <span className="opacity-20">:</span>
                                <span>{scoreInfo.scoreB}</span>
                            </div>
                            <p className="text-[8px] font-black text-center text-slate-500 uppercase tracking-[0.2em]">Marcador</p>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shadow-inner mb-4">
                            <span className="text-xs font-black text-white/20 italic">VS</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center flex-1 max-w-[100px]">
                    <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-xl font-black mb-3 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                        {(match.carrera_b?.nombre || match.equipo_b).substring(0, 2).toUpperCase()}
                    </div>
                    <p className="text-[11px] font-black text-white text-center leading-tight uppercase tracking-tight">
                        {match.carrera_b?.nombre || match.equipo_b}
                    </p>
                </div>
            </div>

            {/* Prediction Input / Display Area */}
            <div className="bg-zinc-900/60 backdrop-blur-md rounded-[2rem] border border-white/5 p-4 shadow-inner relative overflow-hidden">
                {isFinished || isLive ? (
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Tu Predicción</p>
                        <div className="flex items-center justify-center gap-3">
                             {prediction?.prediction_type === 'score' ? (
                                <p className={cn(
                                    "text-2xl font-black tabular-nums font-mono tracking-tight",
                                    isFinished ? (predictionCorrect ? "text-emerald-400" : "text-rose-400") : "text-white"
                                )}>
                                    {prediction.goles_a} <span className="opacity-20">-</span> {prediction.goles_b}
                                </p>
                             ) : (
                                <div className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border",
                                    isFinished ? (predictionCorrect ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400") : "bg-white/5 border-white/10 text-white"
                                )}>
                                    <Trophy size={14} className="fill-current" />
                                    <span className="text-xs font-black uppercase tracking-widest">
                                        {prediction?.winner_pick === 'A' ? match.carrera_a?.nombre || match.equipo_a : 
                                         prediction?.winner_pick === 'B' ? match.carrera_b?.nombre || match.equipo_b : 'Empate'}
                                    </span>
                                </div>
                             )}
                        </div>
                    </div>
                ) : !isLocked ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-1">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">¿Cuál será el resultado?</p>
                             <div className="flex gap-1">
                                <button 
                                    onClick={() => onPredict(match.id, { ...prediction, mode: 'score' })} 
                                    className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-all", mode === 'score' ? "bg-red-500 text-white" : "bg-white/5 text-slate-500")}
                                >
                                    <Target size={12} />
                                </button>
                                <button 
                                    onClick={() => onPredict(match.id, { ...prediction, mode: 'winner' })}
                                    className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-all", mode === 'winner' ? "bg-red-500 text-white" : "bg-white/5 text-slate-500")}
                                >
                                    <Award size={12} />
                                </button>
                             </div>
                        </div>

                        {mode === 'score' ? (
                            <div className="flex items-center justify-center gap-4 py-2">
                                <input
                                    type="number"
                                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl text-center font-mono text-3xl font-black focus:border-red-500 focus:bg-red-500/5 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-white/5 shadow-inner"
                                    value={scoreA}
                                    onChange={(e) => setScoreA(e.target.value)}
                                    placeholder="0"
                                />
                                <div className="w-4 h-1 bg-white/10 rounded-full" />
                                <input
                                    type="number"
                                    className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl text-center font-mono text-3xl font-black focus:border-red-500 focus:bg-red-500/5 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-white/5 shadow-inner"
                                    value={scoreB}
                                    onChange={(e) => setScoreB(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'A', name: (match.carrera_a?.nombre || match.equipo_a) },
                                    { key: 'DRAW', name: 'Empate' },
                                    { key: 'B', name: (match.carrera_b?.nombre || match.equipo_b) }
                                ].map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setWinnerPick(opt.key)}
                                        className={cn(
                                            "relative group/btn py-4 px-2 rounded-2xl text-[9px] font-black tracking-widest transition-all border-2 uppercase",
                                            winnerPick === opt.key
                                                ? "bg-red-500/10 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                                : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        <div className="truncate">{opt.name.substring(0, 10)}</div>
                                        {winnerPick === opt.key && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900" />}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <Button
                            className={cn(
                                "w-full rounded-2xl h-12 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                                isPredicted 
                                    ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-xl shadow-red-600/20"
                                    : "bg-white text-black hover:bg-slate-200"
                            )}
                            onClick={handleSave}
                            disabled={mode === 'score' ? (scoreA === "" || scoreB === "") : (!winnerPick)}
                        >
                            {isPredicted ? <><History size={14} className="mr-2" /> Actualizar Predicción</> : <><Zap size={14} className="mr-2" /> Guardar Acierto</>}
                        </Button>
                    </div>
                ) : (
                    <div className="py-4 text-center opacity-40 grayscale flex flex-col items-center gap-2">
                        <Lock size={20} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Predicciones Cerradas</p>
                    </div>
                )}
            </div>
            
            {/* Percentage Bar simplified at bottom */}
            {!isFinished && (
                <div className="mt-4 px-1">
                    <VotePercentageBar
                        matchId={match.id}
                        allPredictions={allPredictions}
                        teamA={match.carrera_a?.nombre || match.equipo_a}
                        teamB={match.carrera_b?.nombre || match.equipo_b}
                        sportName={match.disciplinas?.name}
                    />
                </div>
            )}
        </div>
    );
};

// ─── Main Page ───
export default function QuinielaPage() {
    const { user, profile, isStaff, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'play' | 'history' | 'ranking'>('ranking');
    const [rankingSubTab, setRankingSubTab] = useState<'leaders' | 'streaks' | 'consistency'>('leaders');
    const [matches, setMatches] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [allPredictions, setAllPredictions] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bettingMode, setBettingMode] = useState<'score' | 'winner'>('winner');
    const [viewFilter, setViewFilter] = useState<'upcoming' | 'live' | 'finished' | 'all'>('upcoming');
    const [sportFilter, setSportFilter] = useState<string>('todos');
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [userPublicProfile, setUserPublicProfile] = useState<any>(null);
    const userPoints = userPublicProfile?.points || 0;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);

            const [matchesRes, predsRes, allPredsRes, rankingRes, userPubRes] = await Promise.all([
                safeQuery(supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)').order('fecha', { ascending: true }), 'quiniela-matches'),
                safeQuery(supabase.from('pronosticos').select('*').eq('user_id', user.id), 'quiniela-preds'),
                safeQuery(supabase.from('pronosticos').select('match_id, winner_pick, prediction_type'), 'quiniela-allPreds'),
                safeQuery(supabase.from('public_profiles').select('*, display_name, avatar_url, points, current_streak, max_streak, total_predictions, correct_predictions').order('points', { ascending: false }).limit(50), 'quiniela-ranking'),
                safeQuery(supabase.from('public_profiles').select('*').eq('id', user.id).single(), 'user-public-profile'),
            ]);

            if (matchesRes.data) setMatches(matchesRes.data);
            if (predsRes.data) setPredictions(predsRes.data);
            if (allPredsRes.data) setAllPredictions(allPredsRes.data);
            if (rankingRes.data) setRanking(rankingRes.data);
            if (userPubRes.data) setUserPublicProfile(userPubRes.data);

            setLoading(false);
        };

        fetchData();

        // Realtime for predictions updates
        const channel = supabase
            .channel('quiniela-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pronosticos' }, async () => {
                const { data } = await safeQuery(supabase.from('pronosticos').select('match_id, winner_pick, prediction_type'), 'rt-allPreds');
                if (data) setAllPredictions(data);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, async () => {
                const { data } = await safeQuery(supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)').order('fecha', { ascending: true }), 'rt-matches');
                if (data) setMatches(data);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // Disclaimer Modal Logic
    useEffect(() => {
        if (!authLoading && user) {
            const hasSeenDisclaimer = sessionStorage.getItem('quiniela_disclaimer_v2_shown');
            if (!hasSeenDisclaimer) {
                setShowDisclaimer(true);
            }
        }
    }, [authLoading, user]);

    const handleDismissDisclaimer = () => {
        sessionStorage.setItem('quiniela_disclaimer_v2_shown', 'true');
        setShowDisclaimer(false);
    };

    const handlePredict = async (matchId: any, data: any) => {
        if (!user) return;

        toast.promise(
            async () => {
                const { error: profileError } = await supabase.from('public_profiles').upsert(
                    { id: user.id, email: user.email },
                    { onConflict: 'id' }
                );

                if (profileError) {
                    console.error("Profile auto-creation failed:", profileError);
                }

                const existing = predictions.find(p => p.match_id === matchId);
                const payload = { user_id: user.id, match_id: matchId, ...data };

                let error;
                if (existing) {
                    const { error: e } = await supabase.from('pronosticos').update(payload).eq('id', existing.id);
                    error = e;
                } else {
                    const { error: e } = await supabase.from('pronosticos').insert(payload);
                    error = e;
                }

                if (error) {
                    console.error("Betting error:", error);
                    throw error;
                }

                // Refresh both user predictions AND all predictions (for percentage bar)
                const [userPreds, allPreds] = await Promise.all([
                    supabase.from('pronosticos').select('*').eq('user_id', user.id),
                    supabase.from('pronosticos').select('match_id, winner_pick, prediction_type'),
                ]);
                if (userPreds.data) setPredictions(userPreds.data);
                if (allPreds.data) setAllPredictions(allPreds.data);
            },
            {
                loading: 'Guardando acierto...',
                success: '¡Acierto guardado! 🔥',
                error: (e) => `Error: ${e.message}`
            }
        );
    };

    // Filtered matches
    const filteredMatches = matches.filter(m => {
        // Step 1: Status Filter
        if (viewFilter === 'upcoming' && m.estado !== 'programado') return false;
        if (viewFilter === 'live' && m.estado !== 'en_vivo') return false;
        if (viewFilter === 'finished' && m.estado !== 'finalizado') return false;

        // Step 2: Sport Filter
        if (sportFilter !== 'todos' && m.disciplinas?.name !== sportFilter) return false;

        return true;
    });

    // Stats
    const totalPredictions = predictions.length;
    const correctPredictions = predictions.filter(p => {
        const m = matches.find(match => match.id === p.match_id);
        if (!m || m.estado !== 'finalizado') return false;
        const result = getMatchResult(m);
        if (!result) return false;
        if (p.winner_pick) return p.winner_pick === result;
        return false;
    }).length;
    const finishedWithPrediction = predictions.filter(p => {
        const m = matches.find(match => match.id === p.match_id);
        return m && m.estado === 'finalizado';
    }).length;
    const accuracy = finishedWithPrediction > 0 ? Math.round((correctPredictions / finishedWithPrediction) * 100) : 0;

    if (authLoading || !user) return (
        <div className="min-h-screen bg-[#0a0805] flex flex-col items-center justify-center">
            <UniqueLoading size="lg" className="scale-125" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0816] text-white font-sans pb-20 selection:bg-indigo-500/30">
            {/* Ambient Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
            {/* Modal Disclaimer */}
            {showDisclaimer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0a0805] border border-blue-500/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl shadow-blue-500/10 relative overflow-hidden zoom-in duration-300">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400" />
                        <div className="flex flex-col items-center text-center gap-4 pt-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-2 border border-blue-500/20 shadow-inner">
                                <Info size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Aviso Institucional</h3>
                            <p className="text-sm text-slate-300 leading-relaxed max-w-[260px]">
                                Este espacio es <strong className="text-white">100% recreativo</strong>. Aquí no se realizan apuestas económicas ni se involucra dinero real. ¡Diviértete prediciendo! 🏅
                            </p>
                            <Button 
                                onClick={handleDismissDisclaimer} 
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl mt-4 font-bold h-12 shadow-lg shadow-blue-600/20 text-md"
                            >
                                Entendido, ¡A jugar!
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <div className="max-w-xl mx-auto p-4 space-y-6 relative z-10">

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-2xl font-black tabular-nums text-white">{totalPredictions}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Aciertos</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                        <p className="text-2xl font-black tabular-nums text-emerald-400">{correctPredictions}</p>
                        <p className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider">Acertadas</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-center">
                        <p className="text-2xl font-black tabular-nums text-red-400">{accuracy}%</p>
                        <p className="text-[9px] font-bold text-red-500/70 uppercase tracking-wider">Precisión</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-white/[0.03] rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('play')}
                        className={cn(
                            "py-3 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5",
                            activeTab === 'play'
                                ? 'bg-white text-black shadow-xl'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Flame size={14} /> Jugar
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "py-3 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5",
                            activeTab === 'history'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-600/20'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <History size={14} /> Historial
                    </button>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        className={cn(
                            "py-3 rounded-xl text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5",
                            activeTab === 'ranking'
                                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl shadow-red-600/20'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Trophy size={14} /> Ranking
                    </button>
                </div>

                {/* ─── PLAY TAB ─── */}
                {activeTab === 'play' ? (
                    <div className="space-y-5">
                        {/* Sport Filters - ICON ONLY - 7 Sports */}
                        <div className="flex gap-3 overflow-x-auto py-4 -mx-1 px-1 custom-scrollbar no-scrollbar items-center justify-center min-h-[80px]">
                            <button
                                onClick={() => setSportFilter('todos')}
                                title="Todos los deportes"
                                className={cn(
                                    "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center",
                                    sportFilter === 'todos'
                                        ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110"
                                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={22} />
                            </button>
                            {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => (
                                <button
                                    key={sport}
                                    onClick={() => setSportFilter(sport)}
                                    title={sport}
                                    className={cn(
                                        "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center text-xl",
                                        sportFilter === sport
                                            ? [SPORT_ACCENT[sport] || "text-white", "bg-white/10 border-current shadow-lg scale-110"]
                                            : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <SportIcon sport={sport} size={22} className="text-current" />
                                </button>
                            ))}
                        </div>

                        {/* Mode + Filter Row */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Betting Mode */}
                            <div className="inline-flex bg-white/[0.03] p-1 rounded-xl border border-white/5 flex-1">
                                <button
                                    onClick={() => setBettingMode('winner')}
                                    className={cn("flex-1 px-3 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all flex items-center justify-center gap-1.5", bettingMode === 'winner' ? "bg-red-600 text-white shadow-md" : "text-white/50 hover:text-white")}
                                >
                                    <HandMetal size={12} /> Ganador
                                </button>
                                <button
                                    onClick={() => setBettingMode('score')}
                                    className={cn("flex-1 px-3 py-2 rounded-lg text-[10px] font-black tracking-wide transition-all flex items-center justify-center gap-1.5", bettingMode === 'score' ? "bg-rose-600 text-white shadow-md" : "text-white/50 hover:text-white")}
                                >
                                    <Gauge size={12} /> Marcador
                                </button>
                            </div>

                            {/* View Filter */}
                            <div className="inline-flex bg-white/[0.03] p-1 rounded-xl border border-white/5">
                                {([
                                    { key: 'upcoming', label: 'Próximos', icon: Clock },
                                    { key: 'live', label: 'Vivo', icon: Zap },
                                    { key: 'finished', label: 'Finales', icon: Trophy },
                                    { key: 'all', label: 'Todos', icon: Filter },
                                ] as const).map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => {
                                            setViewFilter(f.key);
                                            // Reset active tab if switching to ranking or history? No, this is just for the play tab
                                        }}
                                        className={cn(
                                            "px-2.5 py-2 rounded-lg text-[10px] font-black transition-all flex items-center gap-1",
                                            viewFilter === f.key
                                                ? "bg-white/10 text-white"
                                                : "text-white/40 hover:text-white/70"
                                        )}
                                    >
                                        <f.icon size={10} />
                                        <span className="hidden sm:inline">{f.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Match List */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="w-12 h-12 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
                                <p className="text-xs text-slate-500 animate-pulse">Cargando partidos...</p>
                            </div>
                        ) : filteredMatches.length === 0 ? (
                            <div className="text-center py-20 text-white/40 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                <AlertTriangle className="mx-auto mb-4 opacity-30 w-10 h-10" />
                                <p className="font-bold text-sm">No hay partidos en esta categoría</p>
                                <p className="text-xs text-slate-600 mt-1">Intenta otro filtro</p>
                            </div>
                        ) : (
                            filteredMatches.map(m => (
                                <PredictionCard
                                    key={m.id}
                                    match={m}
                                    prediction={predictions.find(p => p.match_id === m.id)}
                                    onPredict={handlePredict}
                                    locked={false}
                                    mode={bettingMode}
                                    allPredictions={allPredictions}
                                />
                            ))
                        )}
                    </div>
                ) : activeTab === 'history' ? (
                    /* ─── HISTORY TAB ─── */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-amber-400" />
                                <h2 className="font-bold text-sm text-white">Mis Aciertos</h2>
                                <span className="text-[10px] text-slate-500 font-bold">({predictions.length})</span>
                            </div>
                        </div>

                        {/* Sport Filters for History - ICON ONLY - 7 Sports */}
                        <div className="flex gap-3 overflow-x-auto py-4 -mx-1 px-1 custom-scrollbar no-scrollbar items-center justify-center min-h-[80px]">
                            <button
                                onClick={() => setSportFilter('todos')}
                                title="Todos los deportes"
                                className={cn(
                                    "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center",
                                    sportFilter === 'todos'
                                        ? "bg-amber-500 text-black border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-110"
                                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <LayoutGrid size={22} />
                            </button>
                            {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => (
                                <button
                                    key={sport}
                                    onClick={() => setSportFilter(sport)}
                                    title={sport}
                                    className={cn(
                                        "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center text-xl",
                                        sportFilter === sport
                                            ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-lg scale-110"
                                            : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <SportIcon sport={sport} size={22} className="text-current" />
                                </button>
                            ))}
                        </div>

                        {predictions.length === 0 ? (
                            <div className="text-center py-20 text-white/40 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                <Target className="mx-auto mb-4 opacity-30 w-10 h-10" />
                                <p className="font-bold text-sm">No has intentado acertar aún</p>
                                <p className="text-xs text-slate-600 mt-1">Ve a la pestaña Jugar para comenzar</p>
                            </div>
                        ) : (
                            (() => {
                                // Filter by sport
                                const historyFiltered = predictions.filter(pred => {
                                    if (sportFilter === 'todos') return true;
                                    const m = matches.find(match => match.id === pred.match_id);
                                    return m?.disciplinas?.name === sportFilter;
                                });

                                if (historyFiltered.length === 0) {
                                    return (
                                        <div className="text-center py-10 text-white/40 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                            <p className="font-bold text-sm">No hay aciertos para este deporte</p>
                                        </div>
                                    );
                                }

                                // Sort: finished first (newest), then live, then upcoming
                                const sortedPreds = [...historyFiltered].sort((a, b) => {
                                    const matchA = matches.find(m => m.id === a.match_id);
                                    const matchB = matches.find(m => m.id === b.match_id);
                                    if (!matchA || !matchB) return 0;
                                    const order: Record<string, number> = { 'finalizado': 0, 'en_vivo': 1, 'programado': 2 };
                                    const orderA = order[matchA.estado] ?? 3;
                                    const orderB = order[matchB.estado] ?? 3;
                                    if (orderA !== orderB) return orderA - orderB;
                                    return new Date(matchB.fecha).getTime() - new Date(matchA.fecha).getTime();
                                });

                                return sortedPreds.map(pred => {
                                    const m = matches.find(match => match.id === pred.match_id);
                                    if (!m) return null;

                                    const result = getMatchResult(m);
                                    const isFinished = m.estado === 'finalizado';
                                    const isLive = m.estado === 'en_vivo';
                                    let correct: boolean | null = null;

                                    if (isFinished && result) {
                                        if (pred.winner_pick) {
                                            correct = pred.winner_pick === result;
                                        } else if (pred.goles_a !== null && pred.goles_a !== undefined) {
                                            const md = m.marcador_detalle || {};
                                            const actualA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                                            const actualB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                                            correct = pred.goles_a === actualA && pred.goles_b === actualB;
                                        }
                                    }

                                    const scoreInfo = getCurrentScore(m.disciplinas?.name, m.marcador_detalle || {});

                                    // Card background
                                    const cardBg = isFinished && correct === true
                                        ? "bg-gradient-to-br from-emerald-900/40 via-emerald-900/20 to-[#0a0805] border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                                        : isFinished && correct === false
                                            ? "bg-gradient-to-br from-rose-900/40 via-rose-900/20 to-[#0a0805] border-rose-500/25 shadow-[0_0_40px_rgba(244,63,94,0.08)]"
                                            : isLive
                                                ? "bg-rose-500/5 border-rose-500/20"
                                                : "bg-white/[0.03] border-white/5";

                                    return (
                                        <Link href={`/partido/${m.id}`} key={pred.id}>
                                            <div className={cn("relative p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.01] cursor-pointer", cardBg)}>
                                                {/* Result badge */}
                                                {isFinished && correct !== null && (
                                                    <div className={cn(
                                                        "absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                                                        correct
                                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                                            : "bg-rose-500/20 text-rose-400 border border-rose-500/20"
                                                    )}>
                                                        {correct ? <><CheckCircle size={10} className="inline mr-0.5" /> Acertado</> : <><X size={10} className="inline mr-0.5" /> Fallado</>}
                                                    </div>
                                                )}
                                                {isLive && (
                                                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse">
                                                        <Zap size={10} className="inline mr-0.5" /> En Vivo
                                                    </div>
                                                )}
                                                {!isFinished && !isLive && (
                                                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-500 border border-white/5">
                                                        <Clock size={10} className="inline mr-0.5" /> Pendiente
                                                    </div>
                                                )}

                                                {/* Sport + Date */}
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                                                    <SportIcon sport={m.disciplinas?.name} size={14} className="text-current opacity-70" />
                                                    <span>{m.disciplinas?.name}</span>
                                                    <span className="mx-0.5">•</span>
                                                    <span>{new Date(m.fecha).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                                </div>

                                                {/* Teams and Score */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 text-center">
                                                        <div className={cn(
                                                            "w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-sm font-black mb-1.5",
                                                            isFinished && result === 'A' ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-white/5 border border-white/10 text-white"
                                                        )}>
                                                            {(m.carrera_a?.nombre || m.equipo_a).substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <p className={cn("font-bold text-[11px] leading-tight", isFinished && result === 'A' ? "text-emerald-400" : "text-white/80")}>
                                                            {m.carrera_a?.nombre || m.equipo_a}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-col items-center min-w-[50px]">
                                                        {(isLive || isFinished) ? (
                                                            <div className="text-xl font-black tabular-nums font-mono flex items-center gap-1">
                                                                <span className={cn(isFinished && result === 'A' ? "text-emerald-400" : "text-white")}>{scoreInfo.scoreA}</span>
                                                                <span className="text-white/20">:</span>
                                                                <span className={cn(isFinished && result === 'B' ? "text-emerald-400" : "text-white")}>{scoreInfo.scoreB}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm font-black text-white/15">VS</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 text-center">
                                                        <div className={cn(
                                                            "w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-sm font-black mb-1.5",
                                                            isFinished && result === 'B' ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-white/5 border border-white/10 text-white"
                                                        )}>
                                                            {(m.carrera_b?.nombre || m.equipo_b).substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <p className={cn("font-bold text-[11px] leading-tight", isFinished && result === 'B' ? "text-emerald-400" : "text-white/80")}>
                                                            {m.carrera_b?.nombre || m.equipo_b}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Your prediction */}
                                                <div className={cn(
                                                    "mt-4 p-3 rounded-xl border text-center",
                                                    isFinished && correct === true ? "bg-emerald-500/10 border-emerald-500/15" :
                                                        isFinished && correct === false ? "bg-rose-500/10 border-rose-500/15" :
                                                            "bg-white/5 border-white/5"
                                                )}>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tu acierto</p>
                                                    {(pred.goles_a !== null && pred.goles_a !== undefined && (pred.prediction_type === 'score' || !pred.winner_pick)) ? (
                                                        <p className={cn(
                                                            "text-lg font-black tabular-nums font-mono",
                                                            isFinished && correct === true ? "text-emerald-400" :
                                                                isFinished && correct === false ? "text-rose-400" : "text-white"
                                                        )}>
                                                            {pred.goles_a} - {pred.goles_b}
                                                        </p>
                                                    ) : (
                                                        <p className={cn(
                                                            "text-xs font-black",
                                                            isFinished && correct === true ? "text-emerald-400" :
                                                                isFinished && correct === false ? "text-rose-400" : "text-white"
                                                        )}>
                                                            {pred.winner_pick === 'A' ? <><Trophy size={12} className="inline mr-1" />Gana {m.carrera_a?.nombre || m.equipo_a}</> :
                                                                pred.winner_pick === 'B' ? <><Trophy size={12} className="inline mr-1" />Gana {m.carrera_b?.nombre || m.equipo_b}</> : <><Handshake size={12} className="inline mr-1" />Empate</>}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                });
                            })()
                        )}
                    </div>
                ) : (
                    /* ─── RANKING TAB (REDESIGN) ─── */
                    <div className="space-y-6 animate-in fade-in duration-700">
                        {/* Header del Usuario */}
                        <QuinielaHeader user={user} profile={profile} points={userPoints} />

                        {/* Contenedor Principal del Ranking */}
                        <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
                            {/* Texture Overlay */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none mix-blend-overlay" />
                            
                            {/* Podio Visual (Solo en Líderes) */}
                            {rankingSubTab === 'leaders' && (
                                ranking.length > 0 ? (
                                    <QuinielaPodium top3={ranking.slice(0, 3)} />
                                ) : (
                                    <div className="py-24 text-center">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                                            <Trophy size={32} className="text-white/20" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-[0.2em] text-white/30 font-outfit">Preparando Ranking...</p>
                                    </div>
                                )
                            )}

                            {/* Pestañas de Sub-Ranking */}
                            <nav className="flex items-center gap-10 px-10 py-2 border-y border-white/10 bg-white/[0.02] overflow-x-auto no-scrollbar relative z-10" aria-label="Filtros de ranking">
                                <button 
                                    onClick={() => setRankingSubTab('leaders')}
                                    className={cn(
                                        "pb-4 border-b-2 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap font-outfit transition-all",
                                        rankingSubTab === 'leaders' ? "border-amber-500 text-white" : "border-transparent text-slate-500 hover:text-white"
                                    )}
                                >
                                    Líderes
                                </button>
                                <button 
                                    onClick={() => setRankingSubTab('streaks')}
                                    className={cn(
                                        "pb-4 border-b-2 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap font-outfit transition-all",
                                        rankingSubTab === 'streaks' ? "border-rose-500 text-white" : "border-transparent text-slate-500 hover:text-white"
                                    )}
                                >
                                    Rachas
                                </button>
                                <button 
                                    onClick={() => setRankingSubTab('consistency')}
                                    className={cn(
                                        "pb-4 border-b-2 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap font-outfit transition-all",
                                        rankingSubTab === 'consistency' ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-white"
                                    )}
                                >
                                    Consistencia
                                </button>
                            </nav>

                            {/* Lista de Ranking */}
                            <div className="relative group/ranking-list">
                                <div className="p-4 sm:p-8 space-y-1 max-h-[600px] overflow-y-auto no-scrollbar custom-scrollbar relative z-10 pb-20">
                                    {ranking.length === 0 ? (
                                        <div className="py-20 text-center text-slate-500">
                                            <Users size={40} className="mx-auto mb-4 opacity-10" />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-600">Calculando posiciones</p>
                                        </div>
                                    ) : (
                                        (() => {
                                            const sortedRanking = [...ranking].sort((a, b) => {
                                                if (rankingSubTab === 'streaks') {
                                                    return (b.current_streak || 0) - (a.current_streak || 0) || (b.max_streak || 0) - (a.max_streak || 0);
                                                }
                                                if (rankingSubTab === 'consistency') {
                                                    const accA = a.total_predictions > 0 ? (a.correct_predictions / a.total_predictions) : 0;
                                                    const accB = b.total_predictions > 0 ? (b.correct_predictions / b.total_predictions) : 0;
                                                    return accB - accA;
                                                }
                                                return (b.points || 0) - (a.points || 0);
                                            });

                                            return sortedRanking.map((prof, idx) => (
                                                <div key={prof.id} className="relative group">
                                                    <QuinielaRankingItem 
                                                        profile={prof} 
                                                        rank={idx + 1} 
                                                        isMe={prof.id === user?.id} 
                                                    />
                                                    
                                                    {/* Overlay de métrica específica */}
                                                    <div className="absolute right-24 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                                                        {rankingSubTab === 'streaks' && prof.current_streak > 0 && (
                                                            <div className="flex items-center gap-1.5 text-rose-500">
                                                                <Zap size={14} className="fill-current animate-pulse" />
                                                                <span className="text-xs font-black font-outfit">{prof.current_streak}</span>
                                                            </div>
                                                        )}
                                                        {rankingSubTab === 'consistency' && prof.total_predictions > 0 && (
                                                            <div className="text-[10px] font-black text-blue-400 font-outfit uppercase tracking-tighter">
                                                                {Math.round((prof.correct_predictions / prof.total_predictions) * 100)}% ACC
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ));
                                        })()
                                    )}
                                </div>

                                {/* Sticky User Footer Banner */}
                                {user && ranking.length > 0 && (
                                    <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 z-50 animate-in slide-in-from-bottom-4 duration-500">
                                        <div className="bg-[#1A1612]/95 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black font-outfit">
                                                    #{(() => {
                                                        const userIdx = ranking.findIndex(r => r.id === user.id);
                                                        return userIdx !== -1 ? userIdx + 1 : '??';
                                                    })()}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-outfit">TÚ ESTÁS AQUÍ</p>
                                                    <p className="text-sm font-black text-white font-outfit uppercase">{profile?.full_name || "Tu Perfil"}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-white font-outfit leading-none">{userPoints}</p>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PUNTOS</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
