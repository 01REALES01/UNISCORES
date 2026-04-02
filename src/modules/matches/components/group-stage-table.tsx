"use client";

import { cn } from "@/lib/utils";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_EMOJI } from "@/lib/constants";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Trophy, ArrowRight, Activity, Zap, Medal } from "lucide-react";
import { calculateStandings, type TeamStanding } from "../utils/standings";
import { Badge } from "@/shared/components/ui-primitives";
import { SportIcon } from "@/components/sport-icons";


function getScoreFromMatch(match: any): { scoreA: number; scoreB: number } {
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

interface GroupStageTableProps {
    matches: any[];
    sportName: string;
    grupo: string;
}

export function GroupStageTable({ matches, sportName, grupo }: GroupStageTableProps) {
    const [fairPlayData, setFairPlayData] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchFairPlay = async () => {
            const matchIds = matches.map(m => m.id);
            if (matchIds.length === 0) return;

            const { data, error } = await supabase
                .from('olympics_eventos')
                .select('tipo_evento, equipo')
                .in('partido_id', matchIds)
                .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento']);

            if (!error && data) {
                const counts: Record<string, number> = {};
                // Initialize all matches teams with 2000 base points
                matches.forEach(m => {
                    const teamA = m.delegacion_a || m.equipo_a;
                    const teamB = m.delegacion_b || m.equipo_b;
                    if (teamA && !counts[teamA]) counts[teamA] = 2000;
                    if (teamB && !counts[teamB]) counts[teamB] = 2000;
                });

                data.forEach(e => {
                    const team = e.equipo;
                    if (!team) return;
                    if (!(team in counts)) counts[team] = 2000;
                    // Fútbol: -50 amarilla, -100 roja, -100 expulsion, -100 mal comportamiento
                    if (e.tipo_evento === 'tarjeta_amarilla') counts[team] -= 50;
                    if (e.tipo_evento === 'tarjeta_roja') counts[team] -= 100;
                    if (e.tipo_evento === 'expulsion_delegado') counts[team] -= 100;
                    if (e.tipo_evento === 'mal_comportamiento') counts[team] -= 100;
                });
                setFairPlayData(counts);
            }
        };
        fetchFairPlay();
    }, [matches]);

    const standings = useMemo(() => {
        return calculateStandings(matches, sportName, fairPlayData);
    }, [matches, sportName, fairPlayData]);

    const accent = "text-primary";
    const border = "border-primary/10";

    return (
        <div className={cn("bg-black/20 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl")}>
            {/* Group Header */}
            <div className="px-6 py-6 sm:px-8 border-b border-white/5 flex items-center justify-between bg-white/[0.03]">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-lg transition-transform group-hover:scale-110">
                        <SportIcon sport={sportName} size={24} className="scale-110 drop-shadow-md" />
                    </div>
                    <div>
                        <h3 className="font-display font-black text-2xl text-white tracking-tight">
                            Grupo {grupo}
                        </h3>
                        <p className="text-xs font-bold text-white/50 tracking-wide font-display mt-0.5">Fase de Grupos</p>
                    </div>
                </div>
                <Trophy size={20} className="text-white/20" />
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-w-full">
                <table className="w-full text-xs min-w-[650px]">
                    <thead>
                        <tr className="border-b border-white/5 text-white/30 uppercase tracking-[0.2em] text-[10px] font-black bg-white/[0.02]">
                            <th className="text-left py-4 px-6 sm:px-8">#</th>
                            <th className="text-left py-4 px-4 w-1/3">Equipo</th>
                            <th className="text-center py-4 px-3 w-10">PJ</th>
                            <th className="text-center py-4 px-3 w-10">PG</th>
                            <th className="text-center py-4 px-3 w-10">PE</th>
                            <th className="text-center py-4 px-3 w-10">PP</th>
                            <th className="text-center py-4 px-3 w-10">{sportName === 'Voleibol' ? 'SG' : 'GF'}</th>
                            <th className="text-center py-4 px-3 w-10">{sportName === 'Voleibol' ? 'SP' : 'GC'}</th>
                            <th className="text-center py-4 px-3 w-10">{sportName === 'Voleibol' ? 'RS' : 'DIF'}</th>
                            <th className="text-center py-4 px-3 w-12">FP</th>
                            <th className="text-center py-4 px-6 sm:px-8 w-16 text-violet-300">PTS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {standings.map((team, idx) => {
                            const qualified = idx < 2;
                            return (
                                <tr
                                    key={team.team}
                                    className={cn(
                                        "transition-all duration-300 hover:bg-white/[0.04]",
                                        qualified && "bg-white/[0.02]"
                                    )}
                                >
                                    <td className="py-4 px-6 sm:px-8">
                                        <span className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shadow-inner border transition-all",
                                            qualified ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"
                                        )}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={cn(
                                            "font-black text-[13px] uppercase tracking-wide truncate max-w-[200px] block transition-colors",
                                            qualified ? "text-white" : "text-white/70"
                                        )}>
                                            {team.team}
                                        </span>
                                    </td>
                                    <td className="text-center py-4 px-3 text-white/50 font-bold tabular-nums">{team.played}</td>
                                    <td className="text-center py-4 px-3 text-emerald-400 font-black tabular-nums">{team.won}</td>
                                    <td className="text-center py-4 px-3 text-white/40 font-bold tabular-nums">{team.drawn}</td>
                                    <td className="text-center py-4 px-3 text-rose-400 font-bold tabular-nums">{team.lost}</td>
                                    <td className="text-center py-4 px-3 text-white/50 tabular-nums">
                                        {sportName === 'Voleibol' ? team.setsWon : team.pointsFor}
                                    </td>
                                    <td className="text-center py-4 px-3 text-white/50 tabular-nums">
                                        {sportName === 'Voleibol' ? team.setsLost : team.pointsAgainst}
                                    </td>
                                    <td className="text-center py-4 px-3 font-black tabular-nums">
                                        {sportName === 'Voleibol' ? (
                                            <span className="text-white/40 italic">
                                                {(team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost)).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className={cn("italic", team.diff > 0 ? 'text-emerald-400 font-black' : team.diff < 0 ? 'text-rose-400 font-bold' : 'text-white/40 font-bold')}>
                                                {team.diff > 0 ? `+${team.diff}` : team.diff}
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center py-4 px-3">
                                        <div className={cn(
                                            "inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md border tabular-nums transition-colors",
                                            team.fairPlay < 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-400 font-black" : "bg-white/5 border-white/5 text-white/30 font-bold"
                                        )}>
                                            <ShieldAlert size={10} className="shrink-0" />
                                            {team.fairPlay}
                                        </div>
                                    </td>
                                    <td className="text-center py-4 px-6 sm:px-8">
                                        <span className={cn(
                                            "font-black text-xl italic tracking-tighter tabular-nums transition-all",
                                            qualified ? "text-violet-300 scale-105 drop-shadow-md" : "text-white/60"
                                        )}>
                                            {team.points}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Group Matches */}
            <div className="px-6 py-6 sm:px-8 bg-black/40 border-t border-white/5 space-y-6">
                <div className="flex items-center gap-4">
                    <Activity size={18} className="text-white/40" />
                    <p className="text-sm text-white/60 font-display font-black tracking-wide">Calendario de Jornadas</p>
                    <div className="flex-1 h-px bg-white/5 ml-2" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {matches.map((m) => {
                        const { scoreA, scoreB } = getScoreFromMatch(m);
                        const teamA = m.delegacion_a || m.equipo_a;
                        const teamB = m.delegacion_b || m.equipo_b;

                        return (
                            <Link href={`/partido/${m.id}`} key={m.id} className="block group/m">
                                <div className={cn(
                                    "flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-300",
                                    m.estado === 'en_curso' 
                                        ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                                )}>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-tight truncate w-1/3 transition-colors",
                                        m.estado === 'finalizado' && scoreA > scoreB ? "text-white" : "text-white/60 group-hover/m:text-white/90"
                                    )}>
                                        {teamA}
                                    </span>
                                    
                                    <div className="flex justify-center items-center w-1/3">
                                        {m.estado === 'finalizado' ? (
                                            <span className="font-black text-[11px] tabular-nums text-white bg-white/10 px-3 py-1 rounded-full border border-white/5 shadow-inner">
                                                {scoreA} — {scoreB}
                                            </span>
                                        ) : m.estado === 'en_curso' ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Badge variant="live" className="px-1.5 py-0 min-h-[14px] text-[7px] leading-tight animate-pulse bg-emerald-500/20 text-emerald-400 border-emerald-500/30">EN CURSO</Badge>
                                                <span className="font-black text-sm text-emerald-400 tabular-nums tracking-tighter drop-shadow-sm">
                                                    {scoreA} — {scoreB}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Clock size={10} className="text-white/30" />
                                                <span className="text-white/40 text-[9px] font-black tabular-nums tracking-wider uppercase">
                                                    {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-tight truncate w-1/3 text-right transition-colors",
                                        m.estado === 'finalizado' && scoreB > scoreA ? "text-white" : "text-white/60 group-hover/m:text-white/90"
                                    )}>
                                        {teamB}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Minimal Clock icon for the pending state
function Clock({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
    )
}
