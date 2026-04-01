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
    const teamA = match.delegacion_a || match.equipo_a;
    const teamB = match.delegacion_b || match.equipo_b;
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
                                winnerA ? "text-white" : "text-white/60 group-hover:text-white/80"
                            )}>
                                {teamA || 'TBD'}
                            </span>
                        </div>
                        <span className={cn(
                            "text-[13px] font-black font-mono ml-2 flex-shrink-0 tabular-nums",
                            isLive ? "text-emerald-400" : winnerA ? "text-white" : "text-white/30"
                        )}>
                            {isFinished || isLive ? scoreA : '-'}
                        </span>
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
                                winnerB ? "text-white" : "text-white/60 group-hover:text-white/80"
                            )}>
                                {teamB || 'TBD'}
                            </span>
                        </div>
                        <span className={cn(
                            "text-[13px] font-black font-mono ml-2 flex-shrink-0 tabular-nums",
                            isLive ? "text-emerald-400" : winnerB ? "text-white" : "text-white/30"
                        )}>
                            {isFinished || isLive ? scoreB : '-'}
                        </span>
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
function RoundColumn({ title, matches, sportName, gapClass }: { title: string; matches: (Match | null)[]; sportName: string; gapClass: string }) {
    return (
        <div className="flex flex-col items-center flex-shrink-0">
            {/* Round Title */}
            <div className="mb-6 flex justify-center w-full">
                <span className={cn(
                    "text-sm font-display font-black tracking-wide px-5 py-2 rounded-full border border-white/5 bg-white/[0.02]",
                    title === 'Final' ? "text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.15)] bg-amber-500/10" : "text-white/60"
                )}>
                    {title}
                </span>
            </div>

            {/* Match Cards */}
            <div className={cn("flex flex-col items-center justify-center flex-1 w-full", gapClass)}>
                {matches.map((match, idx) => (
                    <div key={idx} className="w-[220px]">
                        <BracketMatchCard match={match} sportName={sportName} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main BracketTree Component ──────────────────────────────────────────────
export function BracketTree({ matches, sportName }: BracketTreeProps) {
    const rounds = useMemo(() => {
        const sortByOrder = (a: Match, b: Match) => (a.bracket_order ?? 0) - (b.bracket_order ?? 0);

        const cuartos = matches.filter(m => m.fase === 'cuartos').sort(sortByOrder);
        const semis = matches.filter(m => m.fase === 'semifinal').sort(sortByOrder);
        const final = matches.filter(m => m.fase === 'final').sort(sortByOrder);
        const tercer = matches.filter(m => m.fase === 'tercer_puesto').sort(sortByOrder);

        return { cuartos, semis, final, tercer };
    }, [matches]);

    const hasCuartos = rounds.cuartos.length > 0;
    const hasSemis = rounds.semis.length > 0;
    const hasFinal = rounds.final.length > 0;
    const hasTercer = rounds.tercer.length > 0;

    const noMatches = !hasCuartos && !hasSemis && !hasFinal && !hasTercer;

    if (noMatches) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Trophy size={48} className="text-white/10 mb-4" />
                <p className="text-white/30 text-sm font-bold">No hay partidos de eliminación programados aún</p>
                <p className="text-white/20 text-xs mt-1">Los brackets se generarán después de la fase de grupos</p>
            </div>
        );
    }

    // Pad arrays with nulls to maintain bracket structure
    const cuartosDisplay = hasCuartos ? [...rounds.cuartos, ...Array(Math.max(0, 4 - rounds.cuartos.length)).fill(null)] : [];
    const semisDisplay = hasSemis ? [...rounds.semis, ...Array(Math.max(0, 2 - rounds.semis.length)).fill(null)] : [];
    const finalDisplay = hasFinal ? rounds.final : [null];

    return (
        <div className="space-y-8">
            {/* Bracket Tree */}
            <div className="overflow-x-auto pb-8 pt-4 w-full flex justify-start lg:justify-center no-scrollbar">
                <div className="flex items-stretch gap-6 min-w-max px-4">
                    {/* Cuartos de Final */}
                    {cuartosDisplay.length > 0 && (
                        <>
                            <RoundColumn
                                title="Cuartos de Final"
                                matches={cuartosDisplay}
                                sportName={sportName}
                                gapClass="gap-4"
                            />
                            {/* Connector Lines */}
                            <div className="flex flex-col justify-center w-10 flex-shrink-0 opacity-40">
                                {[0, 1].map(i => (
                                    <div key={i} className="flex-1 flex flex-col justify-center relative my-11">
                                        <div className="border-r border-t border-b border-white/20 rounded-r-2xl h-1/2 w-full ml-0 transition-colors hover:border-violet-400/50" />
                                        <div className="absolute top-1/2 right-0 w-4 border-t border-white/20 translate-x-full transition-colors hover:border-violet-400/50" />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Semifinales */}
                    {semisDisplay.length > 0 && (
                        <div className="flex gap-6">
                            <RoundColumn
                                title="Semifinales"
                                matches={semisDisplay}
                                sportName={sportName}
                                gapClass="gap-[104px]"
                            />
                            {/* Connector Lines */}
                            <div className="flex flex-col justify-center w-10 flex-shrink-0 opacity-40">
                                <div className="relative h-[256px] flex flex-col justify-center w-full">
                                    <div className="border-r border-t border-b border-white/20 rounded-r-2xl h-full w-full ml-0 transition-colors hover:border-violet-400/50" />
                                    <div className="absolute top-1/2 right-0 w-4 border-t border-white/20 translate-x-full transition-colors hover:border-violet-400/50" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final */}
                    <div className="flex flex-col items-center flex-shrink-0">
                        <div className="mb-6 flex items-center justify-center w-full px-5 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.15)] relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent translate-x-[-100%] animate-[shimmer_3s_infinite]" />
                            <Trophy size={16} className="text-amber-400 mr-2 relative z-10" />
                            <span className="text-sm font-display font-black tracking-wide text-amber-400 relative z-10">
                                La Gran Final
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 w-full" style={{ paddingLeft: '16px' }}>
                            <div className="w-[220px]">
                                <BracketMatchCard match={finalDisplay[0]} sportName={sportName} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tercer Puesto (Separate section below) */}
            {hasTercer && (
                <div className="max-w-[260px] mx-auto mt-12 bg-black/20 p-6 rounded-[2rem] border border-white/5 shadow-xl flex flex-col items-center">
                    <div className="mb-5 flex items-center justify-center w-full px-4 py-2 rounded-full border border-orange-500/20 bg-orange-500/5">
                        <span className="text-sm font-display font-black tracking-wide text-orange-400/80">
                            🥉 Tercer Puesto
                        </span>
                    </div>
                    <div className="w-[220px]">
                        <BracketMatchCard match={rounds.tercer[0]} sportName={sportName} />
                    </div>
                </div>
            )}
        </div>
    );
}
