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
            <div className="w-full bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-3 text-center">
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Por definir</span>
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
        <Link href={`/partido/${match.id}`} className="block group">
            <div className={cn(
                "w-full bg-background border rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl",
                isLive ? "border-red-500/40 shadow-[0_0_15px_rgba(219,20,6,0.15)]" : "border-white/10 hover:border-white/20"
            )}>
                {/* Live badge */}
                {isLive && (
                    <div className="bg-red-500/10 border-b border-red-500/20 px-3 py-1 flex items-center gap-1.5">
                        <Activity size={10} className="text-red-400 animate-pulse" />
                        <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">En Curso</span>
                    </div>
                )}

                {/* Team A */}
                <div className={cn(
                    "flex items-center justify-between px-3 py-2 border-b border-white/5",
                    winnerA && "bg-emerald-500/5"
                )}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {winnerA && <div className="w-1 h-4 rounded-full bg-emerald-500 flex-shrink-0" />}
                        <span className={cn(
                            "text-xs font-bold truncate",
                            winnerA ? "text-white" : winnerB ? "text-white/40" : "text-white/80"
                        )}>
                            {teamA || 'TBD'}
                        </span>
                    </div>
                    <span className={cn(
                        "text-sm font-black font-mono ml-2 flex-shrink-0",
                        isLive ? "text-red-400" : winnerA ? accent : "text-white/40"
                    )}>
                        {isFinished || isLive ? scoreA : '-'}
                    </span>
                </div>

                {/* Team B */}
                <div className={cn(
                    "flex items-center justify-between px-3 py-2",
                    winnerB && "bg-emerald-500/5"
                )}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {winnerB && <div className="w-1 h-4 rounded-full bg-emerald-500 flex-shrink-0" />}
                        <span className={cn(
                            "text-xs font-bold truncate",
                            winnerB ? "text-white" : winnerA ? "text-white/40" : "text-white/80"
                        )}>
                            {teamB || 'TBD'}
                        </span>
                    </div>
                    <span className={cn(
                        "text-sm font-black font-mono ml-2 flex-shrink-0",
                        isLive ? "text-red-400" : winnerB ? accent : "text-white/40"
                    )}>
                        {isFinished || isLive ? scoreB : '-'}
                    </span>
                </div>

                {/* Date for scheduled matches */}
                {match.estado === 'programado' && (
                    <div className="bg-white/[0.02] border-t border-white/5 px-3 py-1.5 text-center">
                        <span className="text-[9px] text-white/30 font-mono">
                            {new Date(match.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · {new Date(match.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
}

// ─── Round Column ────────────────────────────────────────────────────────────
function RoundColumn({ title, matches, sportName, gapClass }: { title: string; matches: (Match | null)[]; sportName: string; gapClass: string }) {
    const accent = SPORT_ACCENT[sportName] || 'text-amber-400';

    return (
        <div className="flex flex-col items-center min-w-[200px]">
            {/* Round Title */}
            <div className="mb-4">
                <span className={cn(
                    "text-[10px] uppercase tracking-[0.2em] font-black",
                    title === 'Final' ? accent : "text-white/40"
                )}>
                    {title}
                </span>
            </div>

            {/* Match Cards */}
            <div className={cn("flex flex-col items-center justify-center flex-1 w-full", gapClass)}>
                {matches.map((match, idx) => (
                    <div key={idx} className="w-full">
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
            <div className="overflow-x-auto pb-4">
                <div className="flex items-stretch gap-4 min-w-max px-2">
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
                            <div className="flex flex-col justify-center w-8 flex-shrink-0">
                                {[0, 1].map(i => (
                                    <div key={i} className="flex-1 flex flex-col justify-center">
                                        <div className="border-r-2 border-t-2 border-b-2 border-white/10 rounded-r-lg h-1/2 mr-0" />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Semifinales */}
                    {semisDisplay.length > 0 && (
                        <>
                            <RoundColumn
                                title="Semifinales"
                                matches={semisDisplay}
                                sportName={sportName}
                                gapClass="gap-16"
                            />
                            {/* Connector Lines */}
                            <div className="flex flex-col justify-center w-8 flex-shrink-0">
                                <div className="border-r-2 border-t-2 border-b-2 border-white/10 rounded-r-lg h-1/3 mr-0" />
                            </div>
                        </>
                    )}

                    {/* Final */}
                    <div className="flex flex-col items-center min-w-[200px]">
                        <div className="mb-4 flex items-center gap-2">
                            <Trophy size={14} className={SPORT_ACCENT[sportName] || 'text-amber-400'} />
                            <span className={cn(
                                "text-[10px] uppercase tracking-[0.2em] font-black",
                                SPORT_ACCENT[sportName] || 'text-amber-400'
                            )}>
                                Final
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 w-full">
                            <BracketMatchCard match={finalDisplay[0]} sportName={sportName} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tercer Puesto (Separate section below) */}
            {hasTercer && (
                <div className="max-w-[260px] mx-auto">
                    <div className="mb-3 text-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-white/30">
                            🥉 Tercer Puesto
                        </span>
                    </div>
                    <BracketMatchCard match={rounds.tercer[0]} sportName={sportName} />
                </div>
            )}
        </div>
    );
}
