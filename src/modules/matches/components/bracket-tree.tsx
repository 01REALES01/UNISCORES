"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_EMOJI } from "@/lib/constants";
import { Trophy, Activity } from "lucide-react";
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
    // Baloncesto y otros deportes usan total_a y total_b (con puntos_a/puntos_b como fallback histórico)
    return {
        scoreA: md.total_a ?? md.puntos_a ?? md.goles_a ?? 0,
        scoreB: md.total_b ?? md.puntos_b ?? md.goles_b ?? 0
    };
}

// ─── Match Card for each slot in the bracket ────────────────────────────────
function BracketMatchCard({ match, sportName }: { match: Match | null; sportName: string }) {
    const accent = SPORT_ACCENT[sportName] || 'text-amber-400';

    if (!match) {
        return (
            <div className="w-[220px] bg-black/10 border border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[88px] opacity-60">
                <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">Por definir</span>
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

    return (
        <Link href={`/partido/${match.id}`} className="block group w-[220px]">
            <div className={cn(
                "w-full bg-black/40 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-2xl hover:border-white/20",
                isLive ? "border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20" : "border-white/10"
            )}>
                {/* Live badge */}
                {isLive && (
                    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 flex justify-center items-center gap-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                        <Activity size={10} className="text-emerald-400 animate-pulse relative z-10" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] relative z-10">En Curso</span>
                    </div>
                )}

                {/* Team Info Container */}
                <div className="flex flex-col relative z-10">
                    {/* Team A */}
                    <div className={cn(
                        "flex items-center justify-between px-4 py-3 border-b border-white/5 transition-colors",
                        winnerA ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    )}>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                            {winnerA
                                ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                : <div className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
                            }
                            <span className={cn(
                                "text-[11px] font-black uppercase tracking-tight truncate",
                                isByeA ? "text-white/25 italic" : winnerA ? "text-white" : "text-white/60 group-hover:text-white/80"
                            )}>
                                {teamA || 'Por Definir'}
                            </span>
                        </div>
                        {!isByeA && (
                            <span className={cn(
                                "text-[13px] font-black font-mono ml-2 flex-shrink-0 tabular-nums",
                                isLive ? "text-emerald-400" : winnerA ? "text-white" : "text-white/30"
                            )}>
                                {isFinished || isLive ? scoreA : '-'}
                            </span>
                        )}
                    </div>

                    {/* Team B */}
                    <div className={cn(
                        "flex items-center justify-between px-4 py-3 transition-colors",
                        winnerB ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    )}>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                            {winnerB
                                ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                : <div className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
                            }
                            <span className={cn(
                                "text-[11px] font-black uppercase tracking-tight truncate",
                                isByeB ? "text-white/25 italic" : winnerB ? "text-white" : "text-white/60 group-hover:text-white/80"
                            )}>
                                {teamB || 'Por Definir'}
                            </span>
                        </div>
                        {!isByeB && (
                            <span className={cn(
                                "text-[13px] font-black font-mono ml-2 flex-shrink-0 tabular-nums",
                                isLive ? "text-emerald-400" : winnerB ? "text-white" : "text-white/30"
                            )}>
                                {isFinished || isLive ? scoreB : '-'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Date for scheduled matches */}
                {match.estado === 'programado' && (
                    <div className="bg-white/[0.03] border-t border-white/5 px-4 py-2 flex items-center justify-center gap-2">
                        <span className="text-[9px] text-white/40 font-black tracking-widest uppercase">
                            {new Date(match.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[9px] text-white/40 font-black tracking-widest uppercase">
                            {new Date(match.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}

// ─── Round Column ────────────────────────────────────────────────────────────
function RoundColumn({ title, matches, sportName, roundRank, totalMaxRank }: { 
    title: string; 
    matches: (Match | null)[]; 
    sportName: string;
    roundRank: number;
    totalMaxRank: number;
}) {
    // Base height for the most populated round (e.g. 140px per match in R64)
    // As we go to later rounds, slot height doubles to maintain centering.
    const baseHeight = 110; 
    const slotHeight = baseHeight * Math.pow(2, (totalMaxRank - roundRank));

    return (
        <div className="flex flex-col items-center flex-shrink-0">
            {/* Round Title */}
            <div className="mb-4 h-12 flex items-center justify-center w-full shrink-0">
                <span className={cn(
                    "text-[10px] font-display font-black tracking-[0.2em] px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] uppercase shadow-inner whitespace-nowrap",
                    (title === 'Final' || title === 'final') ? "text-amber-400 border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.1)] bg-amber-500/10" : "text-white/40"
                )}>
                    {title}
                </span>
            </div>

            {/* Match Cards Container - Fixed Progression Scaling */}
            <div className="flex flex-col w-[260px]">
                {matches.map((match, idx) => (
                    <div 
                        key={idx} 
                        className="relative z-10 flex items-center justify-center transition-all duration-700"
                        style={{ height: `${slotHeight}px` }}
                    >
                        <div className="w-[210px]">
                            <BracketMatchCard match={match} sportName={sportName} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main BracketTree Component ──────────────────────────────────────────────
const FASE_LABELS: Record<string, string> = {
    primera_ronda: '1ra Ronda',
    dieciseisavos: '1/16 Final',
    treintaidosavos: '1/32 Final',
    octavos: 'Octavos',
    cuartos: 'Cuartos de Final',
    semifinal: 'Semifinal',
    final: 'Final',
    tercer_puesto: '3er Puesto',
};
// Phase progression order: earliest round first → final last
const PHASE_ORDER = ['primera_ronda', 'treintaidosavos', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'];

export function BracketTree({ matches, sportName }: BracketTreeProps) {
    const tercerPuesto = useMemo(() => {
        return matches
            .filter(m => m.fase === 'tercer_puesto')
            .sort((a, b) => (a.bracket_order ?? 0) - (b.bracket_order ?? 0));
    }, [matches]);

    const hasTercer = tercerPuesto.length > 0;

    // Determine connector line style based on round type
    const getConnectorCount = (matchesCount: number): number => {
        return Math.floor(matchesCount / 2);
    };

    // Normalize rounds: only create columns for phases that have matches,
    // assign consecutive ranks to avoid empty intermediate columns.
    const normalizedRounds = useMemo(() => {
        // 1. Group matches by fase
        const byFase: Record<string, Match[]> = {};
        matches.forEach((m: any) => {
            const f = (m.fase || '').toLowerCase().trim();
            if (f === 'tercer_puesto') return;
            if (!byFase[f]) byFase[f] = [];
            byFase[f].push(m);
        });

        // 2. Keep only phases that have matches, in bracket progression order
        const existing = PHASE_ORDER.filter(f => byFase[f]?.length > 0);
        if (existing.length === 0) return { rounds: [], maxRank: 0 };

        // 3. Determine maxRank from the largest round's match count
        //    This ensures the first column's slot height is correct for centering
        const largestRound = Math.max(...existing.map(f => byFase[f].length));
        const maxRank = Math.max(
            Math.ceil(Math.log2(Math.max(largestRound, 2))),
            existing.length - 1
        );

        // 4. Build columns: earliest round gets highest rank, final gets 0
        const result: { fase: string; matches: (Match | null)[]; rank: number }[] = [];
        existing.forEach((fase, i) => {
            const rank = maxRank - i;
            const ms = byFase[fase].sort((a: Match, b: Match) =>
                (a.bracket_order ?? 0) - (b.bracket_order ?? 0)
            );

            // Slot count: at least 2^rank, but never fewer than actual matches
            const slotCount = Math.max(Math.pow(2, rank), ms.length);
            const slice: (Match | null)[] = new Array(slotCount).fill(null);

            // Place matches using bracket_order (0-indexed) directly
            ms.forEach((m: Match, idx: number) => {
                const pos = m.bracket_order ?? idx;
                if (pos >= 0 && pos < slotCount && slice[pos] === null) {
                    slice[pos] = m;
                } else {
                    // Fallback: find first empty slot
                    const empty = slice.findIndex(s => s === null);
                    if (empty !== -1) slice[empty] = m;
                }
            });

            result.push({ fase, matches: slice, rank });
        });

        return { rounds: result, maxRank };
    }, [matches]);

    const { rounds: displayRounds, maxRank } = normalizedRounds;

    if (displayRounds.length === 0 && !hasTercer) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Trophy size={48} className="text-white/10 mb-4" />
                <p className="text-white/30 text-sm font-bold">No hay partidos de eliminación programados aún</p>
                <p className="text-white/20 text-xs mt-1">Los brackets se generarán después de la fase de grupos</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Bracket Tree */}
            <div className="overflow-x-auto pb-12 pt-4 w-full flex justify-start scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="flex items-start gap-0 min-w-max px-4">
                    {displayRounds.map((round, roundIdx) => (
                        <div key={`${round.fase}-${round.rank}`} className="flex">
                            <div className="w-[260px]">
                                <RoundColumn
                                    title={FASE_LABELS[round.fase] || round.fase}
                                    matches={round.matches}
                                    sportName={sportName}
                                    roundRank={round.rank}
                                    totalMaxRank={maxRank}
                                />
                            </div>
                            
                            {/* Connector Lines - Dynamic Heights */}
                            {roundIdx < displayRounds.length - 1 && (
                                <div className="flex flex-col w-24 flex-shrink-0 opacity-20">
                                    {/* Offset for Title */}
                                    <div className="h-16 shrink-0" />
                                    {Array(getConnectorCount(round.matches.length))
                                        .fill(null)
                                        .map((_, i) => {
                                            const baseH = 110;
                                            const pairHeight = baseH * Math.pow(2, (maxRank - round.rank));
                                            return (
                                                <div 
                                                    key={i} 
                                                    className="relative"
                                                    style={{ height: `${pairHeight}px` }}
                                                >
                                                    <div className="absolute top-1/4 bottom-1/4 right-0 left-0 border-r-2 border-t-2 border-b-2 border-white rounded-r-[3rem]" />
                                                    <div className="absolute top-1/2 right-0 w-12 border-t-2 border-white translate-x-full" />
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tercer Puesto (Separate section below) */}
            {hasTercer && (
                <div className="max-w-[280px] mx-auto mt-16 bg-black/40 p-8 rounded-[3rem] border border-white/5 shadow-3xl flex flex-col items-center backdrop-blur-xl group">
                    <div className="mb-6 flex items-center justify-center w-full px-5 py-2.5 rounded-full border border-orange-500/20 bg-orange-500/5 shadow-inner">
                        <span className="text-[11px] font-display font-black tracking-[0.2em] text-orange-400/80 uppercase">
                            🥉 Tercer Puesto
                        </span>
                    </div>
                    <div className="w-[220px] group-hover:scale-105 transition-transform duration-500">
                        <BracketMatchCard match={tercerPuesto[0]} sportName={sportName} />
                    </div>
                </div>
            )}
        </div>
    );
}
