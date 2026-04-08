"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Trophy, Activity, Swords, Clock } from "lucide-react";
import Link from "next/link";

type Match = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    delegacion_a?: string;
    delegacion_b?: string;
    estado: string;
    marcador_detalle: any;
    fecha: string;
    genero?: string;
    fase?: string;
    grupo?: string;
    bracket_order?: number;
    disciplinas: { name: string; icon?: string; emoji?: string };
};

interface BracketTreeProps {
    matches: Match[];
    sportName: string;
    light?: boolean;
}

function getScoreFromMatch(match: Match): { scoreA: number; scoreB: number } {
    const md = match.marcador_detalle || {};
    const sport = match.disciplinas?.name || '';

    if (sport === 'Fútbol') {
        return { scoreA: md.goles_a ?? 0, scoreB: md.goles_b ?? 0 };
    }
    if (sport === 'Voleibol' || sport === 'Tenis' || sport === 'Tenis de Mesa') {
        return { scoreA: md.sets_a ?? 0, scoreB: md.sets_b ?? 0 };
    }
    return {
        scoreA: md.total_a ?? md.puntos_a ?? md.goles_a ?? 0,
        scoreB: md.total_b ?? md.puntos_b ?? md.goles_b ?? 0
    };
}

// Phase visual config
const PHASE_CONFIG: Record<string, { label: string; shortLabel: string; color: string; glow: string; lightColor: string }> = {
    primera_ronda: {
        label: '1ra Ronda', shortLabel: 'R1',
        color: 'text-slate-400 border-slate-500/20 bg-slate-500/5',
        glow: '',
        lightColor: 'text-slate-500 border-slate-200 bg-slate-50',
    },
    treintaidosavos: {
        label: '1/32 Final', shortLabel: 'R32',
        color: 'text-slate-400 border-slate-500/20 bg-slate-500/5',
        glow: '',
        lightColor: 'text-slate-500 border-slate-200 bg-slate-50',
    },
    dieciseisavos: {
        label: '1/16 Final', shortLabel: 'R16',
        color: 'text-slate-400 border-slate-500/20 bg-slate-500/5',
        glow: '',
        lightColor: 'text-slate-500 border-slate-200 bg-slate-50',
    },
    octavos: {
        label: 'Octavos', shortLabel: 'R8',
        color: 'text-sky-400 border-sky-400/20 bg-sky-400/5',
        glow: '',
        lightColor: 'text-sky-600 border-sky-200 bg-sky-50',
    },
    cuartos: {
        label: 'Cuartos de Final', shortLabel: 'QF',
        color: 'text-violet-400 border-violet-400/20 bg-violet-400/5',
        glow: '',
        lightColor: 'text-violet-600 border-violet-200 bg-violet-50',
    },
    semifinal: {
        label: 'Semifinal', shortLabel: 'SF',
        color: 'text-orange-400 border-orange-400/20 bg-orange-400/5',
        glow: 'shadow-[0_0_20px_rgba(251,146,60,0.1)]',
        lightColor: 'text-orange-600 border-orange-200 bg-orange-50',
    },
    final: {
        label: 'Final', shortLabel: 'F',
        color: 'text-amber-400 border-amber-400/30 bg-amber-400/8',
        glow: 'shadow-[0_0_30px_rgba(251,191,36,0.15)]',
        lightColor: 'text-amber-600 border-amber-300 bg-amber-50',
    },
};

// ─── Match Card ──────────────────────────────────────────────────────────────
function BracketMatchCard({ match, fase, light = false }: {
    match: Match | null;
    fase?: string;
    light?: boolean;
}) {
    const isFinal = fase === 'final';

    if (!match) {
        return (
            <div className={cn(
                "w-full rounded-2xl flex flex-col items-center justify-center gap-1.5 min-h-[84px] border border-dashed transition-colors",
                light ? "bg-slate-50/60 border-slate-200" : "bg-white/[0.02] border-white/8"
            )}>
                <div className={cn("w-5 h-5 rounded-full border-2 border-dashed flex items-center justify-center", light ? "border-slate-200" : "border-white/10")}>
                    <span className={cn("text-[8px]", light ? "text-slate-300" : "text-white/15")}>?</span>
                </div>
                <span className={cn("text-[9px] uppercase tracking-[0.25em] font-black", light ? "text-slate-300" : "text-white/15")}>vacío</span>
            </div>
        );
    }

    const { scoreA, scoreB } = getScoreFromMatch(match);
    const rawTeamA = match.delegacion_a || match.equipo_a;
    const rawTeamB = match.delegacion_b || match.equipo_b;
    const isByeA = rawTeamA?.toUpperCase() === 'BYE' || rawTeamA?.toUpperCase() === 'TBD';
    const isByeB = rawTeamB?.toUpperCase() === 'BYE' || rawTeamB?.toUpperCase() === 'TBD';
    const teamA = isByeA ? 'Por Definir' : rawTeamA;
    const teamB = isByeB ? 'Por Definir' : rawTeamB;
    const isLive = match.estado === 'en_curso';
    const isFinished = match.estado === 'finalizado';
    const winnerA = isFinished && scoreA > scoreB;
    const winnerB = isFinished && scoreB > scoreA;

    // Score display: for tennis show "2-1" style summary if both sets played
    const showScore = isFinished || isLive;

    return (
        <Link href={`/partido/${match.id}`} className="block group w-full">
            <div className={cn(
                "w-full border rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5",
                light
                    ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200"
                    : "bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/30",
                isLive && (light
                    ? "border-emerald-400/60 ring-1 ring-emerald-400/30 shadow-emerald-50"
                    : "border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.12)]"),
                isFinal && !isLive && (light
                    ? "border-amber-300/60 shadow-amber-50"
                    : "border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.08)]"),
            )}>
                {/* Live badge */}
                {isLive && (
                    <div className={cn(
                        "border-b px-3 py-1.5 flex justify-center items-center gap-2 overflow-hidden relative",
                        light ? "bg-emerald-50 border-emerald-100" : "bg-emerald-500/10 border-emerald-500/20"
                    )}>
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" />
                        <Activity size={9} className="text-emerald-500 animate-pulse relative z-10" />
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.25em] relative z-10">En Curso</span>
                    </div>
                )}

                {/* Teams */}
                <div className="flex flex-col">
                    {/* Team A */}
                    <div className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 border-b transition-colors",
                        light ? "border-slate-100" : "border-white/5",
                        winnerA
                            ? (light ? "bg-emerald-50/60" : "bg-gradient-to-r from-emerald-500/[0.08] to-transparent")
                            : ""
                    )}>
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1.5">
                            {/* Winner dot / status */}
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all",
                                winnerA
                                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                                    : isByeA
                                        ? (light ? "bg-slate-100" : "bg-white/5")
                                        : (light ? "bg-slate-200" : "bg-white/10")
                            )} />
                            <span className={cn(
                                "text-[11px] font-black uppercase tracking-tight truncate transition-colors",
                                isByeA
                                    ? (light ? "text-slate-300 italic" : "text-white/20 italic")
                                    : winnerA
                                        ? (light ? "text-slate-900" : "text-white")
                                        : (light ? "text-slate-500 group-hover:text-slate-800" : "text-white/55 group-hover:text-white/80")
                            )}>
                                {teamA || 'Por Definir'}
                            </span>
                        </div>
                        {!isByeA && (
                            <span className={cn(
                                "text-[13px] font-black font-mono flex-shrink-0 tabular-nums leading-none px-1.5 py-0.5 rounded-lg transition-colors",
                                showScore
                                    ? winnerA
                                        ? (light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-emerald-400")
                                        : isLive
                                            ? (light ? "text-emerald-600" : "text-emerald-400")
                                            : (light ? "text-slate-400" : "text-white/30")
                                    : (light ? "text-slate-200" : "text-white/15")
                            )}>
                                {showScore ? scoreA : '–'}
                            </span>
                        )}
                    </div>

                    {/* Team B */}
                    <div className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 transition-colors",
                        winnerB
                            ? (light ? "bg-emerald-50/60" : "bg-gradient-to-r from-emerald-500/[0.08] to-transparent")
                            : ""
                    )}>
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1.5">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all",
                                winnerB
                                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                                    : isByeB
                                        ? (light ? "bg-slate-100" : "bg-white/5")
                                        : (light ? "bg-slate-200" : "bg-white/10")
                            )} />
                            <span className={cn(
                                "text-[11px] font-black uppercase tracking-tight truncate transition-colors",
                                isByeB
                                    ? (light ? "text-slate-300 italic" : "text-white/20 italic")
                                    : winnerB
                                        ? (light ? "text-slate-900" : "text-white")
                                        : (light ? "text-slate-500 group-hover:text-slate-800" : "text-white/55 group-hover:text-white/80")
                            )}>
                                {teamB || 'Por Definir'}
                            </span>
                        </div>
                        {!isByeB && (
                            <span className={cn(
                                "text-[13px] font-black font-mono flex-shrink-0 tabular-nums leading-none px-1.5 py-0.5 rounded-lg transition-colors",
                                showScore
                                    ? winnerB
                                        ? (light ? "bg-emerald-100 text-emerald-700" : "bg-emerald-500/15 text-emerald-400")
                                        : isLive
                                            ? (light ? "text-emerald-600" : "text-emerald-400")
                                            : (light ? "text-slate-400" : "text-white/30")
                                    : (light ? "text-slate-200" : "text-white/15")
                            )}>
                                {showScore ? scoreB : '–'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Footer: date for scheduled, VS for pending TBD */}
                {match.estado === 'programado' && !isByeA && !isByeB && (
                    <div className={cn(
                        "border-t px-3 py-1.5 flex items-center justify-center gap-2",
                        light ? "bg-slate-50/60 border-slate-100" : "bg-black/10 border-white/5"
                    )}>
                        <Clock size={8} className={light ? "text-slate-300" : "text-white/20"} />
                        <span className={cn("text-[8px] font-black tracking-widest uppercase", light ? "text-slate-300" : "text-white/25")}>
                            {new Date(match.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className={cn("text-[8px]", light ? "text-slate-200" : "text-white/10")}>·</span>
                        <span className={cn("text-[8px] font-black tracking-widest uppercase", light ? "text-slate-300" : "text-white/25")}>
                            {new Date(match.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}

// ─── Round Column ─────────────────────────────────────────────────────────────
function RoundColumn({
    fase,
    matchCount,
    matches,
    roundRank,
    totalMaxRank,
    light = false,
}: {
    fase: string;
    matchCount: number;
    matches: (Match | null)[];
    roundRank: number;
    totalMaxRank: number;
    light?: boolean;
}) {
    const cfg = PHASE_CONFIG[fase] || PHASE_CONFIG['primera_ronda'];
    const isFinal = fase === 'final';
    const baseHeight = 108;
    const slotHeight = baseHeight * Math.pow(2, totalMaxRank - roundRank);

    return (
        <div className="flex flex-col items-center flex-shrink-0">
            {/* Round Header */}
            <div className="mb-5 h-14 flex items-center justify-center w-full shrink-0 px-2">
                <div className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl border transition-all",
                    light ? cfg.lightColor : cn(cfg.color, cfg.glow),
                    isFinal && "px-6"
                )}>
                    {isFinal && <Trophy size={11} className={light ? "text-amber-500" : "text-amber-400"} />}
                    <span className={cn(
                        "font-black uppercase tracking-[0.18em] whitespace-nowrap leading-none",
                        isFinal ? "text-[11px]" : "text-[9px]"
                    )}>
                        {cfg.label}
                    </span>
                    {matchCount > 0 && !isFinal && (
                        <span className={cn(
                            "text-[7px] font-bold opacity-60 tracking-wider",
                            light ? "" : "text-current"
                        )}>
                            {matchCount} partidos
                        </span>
                    )}
                </div>
            </div>

            {/* Match slots */}
            <div className="flex flex-col w-[240px]">
                {matches.map((match, idx) => (
                    <div
                        key={idx}
                        className="relative z-10 flex items-center justify-center"
                        style={{ height: `${slotHeight}px` }}
                    >
                        <div className={cn("w-[220px]", isFinal && "w-[234px]")}>
                            <BracketMatchCard match={match} fase={fase} light={light} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Phase progression order
const PHASE_ORDER = ['primera_ronda', 'treintaidosavos', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'];

// ─── Connector between rounds ─────────────────────────────────────────────────
function RoundConnector({
    pairCount,
    pairHeight,
    light,
    isFinalConnector,
}: {
    pairCount: number;
    pairHeight: number;
    light: boolean;
    isFinalConnector: boolean;
}) {
    return (
        <div className="flex flex-col w-10 flex-shrink-0">
            <div className="h-[76px] shrink-0" />
            {Array(pairCount).fill(null).map((_, i) => (
                <div
                    key={i}
                    className="relative"
                    style={{ height: `${pairHeight}px` }}
                >
                    {/* Bracket arm: top half */}
                    <div
                        className={cn(
                            "absolute left-0 right-0 top-1/4 h-1/2 border-r-2 border-t-2 border-b-2 rounded-r-xl transition-colors",
                            isFinalConnector
                                ? (light ? "border-amber-300/50" : "border-amber-500/25")
                                : (light ? "border-slate-200" : "border-white/12")
                        )}
                    />
                    {/* Horizontal line to next card */}
                    <div
                        className={cn(
                            "absolute top-1/2 right-0 w-full border-t-2 translate-x-full transition-colors",
                            isFinalConnector
                                ? (light ? "border-amber-300/50" : "border-amber-500/25")
                                : (light ? "border-slate-200" : "border-white/12")
                        )}
                        style={{ width: '10px' }}
                    />
                </div>
            ))}
        </div>
    );
}

// ─── Main BracketTree ─────────────────────────────────────────────────────────
export function BracketTree({ matches, sportName, light = false }: BracketTreeProps) {
    const isTenis = sportName === 'Tenis' || sportName === 'Tenis de Mesa';
    const tercerPuesto = useMemo(() => {
        return matches
            .filter(m => m.fase === 'tercer_puesto')
            .sort((a, b) => (a.bracket_order ?? 0) - (b.bracket_order ?? 0));
    }, [matches]);

    // Oficial: NINGÚN deporte en el torneo tiene partido de tercer puesto
    const hasTercer = false;

    const normalizedRounds = useMemo(() => {
        const byFase: Record<string, Match[]> = {};
        matches.forEach((m: any) => {
            const f = (m.fase || '').toLowerCase().trim();
            if (f === 'tercer_puesto') return;
            if (!byFase[f]) byFase[f] = [];
            byFase[f].push(m);
        });

        const existing = PHASE_ORDER.filter(f => byFase[f]?.length > 0);
        if (existing.length === 0) return { rounds: [], maxRank: 0 };

        const largestRound = Math.max(...existing.map(f => byFase[f].length));
        const maxRank = Math.max(
            Math.ceil(Math.log2(Math.max(largestRound, 2))),
            existing.length - 1
        );

        const result: { fase: string; matches: (Match | null)[]; rank: number; realCount: number }[] = [];
        existing.forEach((fase, i) => {
            const rank = maxRank - i;
            const ms = byFase[fase].sort((a: Match, b: Match) =>
                (a.bracket_order ?? 0) - (b.bracket_order ?? 0)
            );

            const slotCount = Math.max(Math.pow(2, rank), ms.length);
            const slice: (Match | null)[] = new Array(slotCount).fill(null);

            ms.forEach((m: Match, idx: number) => {
                const pos = m.bracket_order ?? idx;
                if (pos >= 0 && pos < slotCount && slice[pos] === null) {
                    slice[pos] = m;
                } else {
                    const empty = slice.findIndex(s => s === null);
                    if (empty !== -1) slice[empty] = m;
                }
            });

            result.push({ fase, matches: slice, rank, realCount: ms.length });
        });

        return { rounds: result, maxRank };
    }, [matches]);

    const { rounds: displayRounds, maxRank } = normalizedRounds;

    if (displayRounds.length === 0 && !hasTercer) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className={cn(
                    "w-16 h-16 rounded-3xl border-2 border-dashed flex items-center justify-center",
                    light ? "border-slate-200" : "border-white/10"
                )}>
                    <Swords size={24} className={light ? "text-slate-200" : "text-white/10"} />
                </div>
                <div>
                    <p className={cn("text-sm font-black uppercase tracking-wider", light ? "text-slate-300" : "text-white/25")}>
                        Sin brackets aún
                    </p>
                    <p className={cn("text-xs mt-1", light ? "text-slate-200" : "text-white/15")}>
                        Se generarán después de la fase de grupos
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Bracket tree */}
            <div className={cn(
                "overflow-x-auto pb-10 pt-2 w-full scrollbar-thin",
                light ? "scrollbar-thumb-violet-100 scrollbar-track-transparent" : "scrollbar-thumb-white/8 scrollbar-track-transparent"
            )}>
                <div className="flex items-start gap-0 min-w-max px-6">
                    {displayRounds.map((round, roundIdx) => {
                        const isNextFinal = displayRounds[roundIdx + 1]?.fase === 'final';
                        const pairCount = Math.floor(round.matches.length / 2);
                        const baseH = 108;
                        const pairHeight = baseH * Math.pow(2, maxRank - round.rank);

                        return (
                            <div key={`${round.fase}-${round.rank}`} className="flex">
                                <RoundColumn
                                    fase={round.fase}
                                    matchCount={round.realCount}
                                    matches={round.matches}
                                    roundRank={round.rank}
                                    totalMaxRank={maxRank}
                                    light={light}
                                />

                                {roundIdx < displayRounds.length - 1 && (
                                    isTenis
                                        ? <div className="w-4 flex-shrink-0" />
                                        : <RoundConnector
                                            pairCount={pairCount}
                                            pairHeight={pairHeight}
                                            light={light}
                                            isFinalConnector={isNextFinal}
                                        />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tercer Puesto */}
            {hasTercer && (
                <div className="flex justify-center mt-4">
                    <div className={cn(
                        "flex flex-col items-center gap-4 p-6 rounded-3xl border backdrop-blur-xl",
                        light ? "bg-white/80 border-orange-200 shadow-orange-100/50" : "bg-black/30 border-orange-500/15"
                    )}>
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-full border",
                            light ? "border-orange-200 bg-orange-50" : "border-orange-500/20 bg-orange-500/8"
                        )}>
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">🥉 Tercer Puesto</span>
                        </div>
                        <div className="w-[240px]">
                            <BracketMatchCard match={tercerPuesto[0]} fase="tercer_puesto" light={light} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
