"use client";

import { cn } from "@/lib/utils";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_EMOJI } from "@/lib/constants";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Trophy, ArrowRight, Activity, Zap, Medal } from "lucide-react";
import { calculateStandings, type TeamStanding } from "../utils/standings";
import { Badge } from "@/shared/components/ui-primitives";


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
        <div className={cn("bg-card/40 backdrop-blur-3xl border rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)]", border)}>
            {/* Group Header */}
            <div className="px-8 py-6 border-b border-primary/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10 shadow-lg transition-transform group-hover:scale-110">
                        <span className="text-2xl">{SPORT_EMOJI[sportName] || '🏅'}</span>
                    </div>
                    <div>
                        <h3 className={cn("font-black text-lg uppercase tracking-tighter italic", accent)}>
                            Grupo {grupo}
                        </h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Fase de Grupos</p>
                    </div>
                </div>
                <Trophy size={20} className="text-primary/20" />
            </div>

            {/* Table */}
            <div className="overflow-x-auto min-w-full">
                <table className="w-full text-xs min-w-[650px]">
                    <thead>
                        <tr className="border-b border-primary/5 text-slate-600 uppercase tracking-[0.3em] text-[9px] font-black bg-background/30">
                            <th className="text-left py-5 px-8 font-black">#</th>
                            <th className="text-left py-5 px-4 font-black">Equipo</th>
                            <th className="text-center py-5 px-3 font-black">PJ</th>
                            <th className="text-center py-5 px-3 font-black">PG</th>
                            <th className="text-center py-5 px-3 font-black">PE</th>
                            <th className="text-center py-5 px-3 font-black">PP</th>
                            <th className="text-center py-5 px-3 font-black">{sportName === 'Voleibol' ? 'SG' : 'GF'}</th>
                            <th className="text-center py-5 px-3 font-black">{sportName === 'Voleibol' ? 'SP' : 'GC'}</th>
                            <th className="text-center py-5 px-3 font-black">{sportName === 'Voleibol' ? 'RS' : 'DIF'}</th>
                            <th className="text-center py-5 px-3 font-black">FP</th>
                            <th className="text-center py-5 px-8 font-black text-primary">PTS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                        {standings.map((team, idx) => {
                            const qualified = idx < 2;
                            return (
                                <tr
                                    key={team.team}
                                    className={cn(
                                        "transition-all duration-300 hover:bg-primary/5 group/row",
                                        qualified && "bg-secondary/[0.02]"
                                    )}
                                >
                                    <td className="py-5 px-8">
                                        <span className={cn(
                                            "w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner border transition-all",
                                            qualified ? "bg-secondary border-secondary/20 text-white shadow-secondary/20" : "bg-card border-primary/5 text-slate-600 group-hover/row:border-primary/20"
                                        )}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <span className={cn(
                                            "font-black text-sm uppercase tracking-tight truncate max-w-[180px] block transition-colors",
                                            qualified ? "text-white" : "text-slate-500 group-hover/row:text-slate-400"
                                        )}>
                                            {team.team}
                                        </span>
                                    </td>
                                    <td className="text-center py-5 px-3 text-slate-500 font-bold tabular-nums">{team.played}</td>
                                    <td className="text-center py-5 px-3 text-secondary font-black tabular-nums">{team.won}</td>
                                    <td className="text-center py-5 px-3 text-slate-400 tabular-nums">{team.drawn}</td>
                                    <td className="text-center py-5 px-3 text-slate-700 tabular-nums">{team.lost}</td>
                                    <td className="text-center py-5 px-3 text-slate-500 tabular-nums">
                                        {sportName === 'Voleibol' ? team.setsWon : team.pointsFor}
                                    </td>
                                    <td className="text-center py-5 px-3 text-slate-500 tabular-nums">
                                        {sportName === 'Voleibol' ? team.setsLost : team.pointsAgainst}
                                    </td>
                                    <td className="text-center py-5 px-3 font-black tabular-nums">
                                        {sportName === 'Voleibol' ? (
                                            <span className="text-slate-500 italic">
                                                {(team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost)).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className={cn("italic", team.diff > 0 ? 'text-secondary font-black' : team.diff < 0 ? 'text-slate-700 font-bold' : 'text-slate-400 font-bold')}>
                                                {team.diff > 0 ? `+${team.diff}` : team.diff}
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center py-5 px-3">
                                        <div className={cn(
                                            "inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border tabular-nums transition-colors",
                                            team.fairPlay < 0 ? "bg-primary/5 border-primary/20 text-primary font-black" : "bg-card border-primary/5 text-slate-600 font-black opacity-40 hover:opacity-100"
                                        )}>
                                            <ShieldAlert size={10} className="shrink-0" />
                                            {team.fairPlay}
                                        </div>
                                    </td>
                                    <td className="text-center py-5 px-8">
                                        <span className={cn(
                                            "font-black text-xl italic tracking-tighter tabular-nums transition-all",
                                            qualified ? "text-primary scale-110 drop-shadow-xl" : "text-slate-500"
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
            <div className="px-8 py-6 bg-primary/[0.03] space-y-6">
                <div className="flex items-center gap-4">
                    <Activity size={14} className="text-primary/40" />
                    <p className="text-[10px] text-primary/60 uppercase tracking-[0.4em] font-black">Calendario de Jornadas</p>
                    <div className="flex-1 h-px bg-primary/10" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches.map((m) => {
                        const { scoreA, scoreB } = getScoreFromMatch(m);
                        const teamA = m.delegacion_a || m.equipo_a;
                        const teamB = m.delegacion_b || m.equipo_b;

                        return (
                            <Link href={`/partido/${m.id}`} key={m.id} className="block group/m">
                                <div className={cn(
                                    "flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-300 shadow-sm",
                                    m.estado === 'en_curso' 
                                        ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-primary/10" 
                                        : "bg-card border-primary/5 hover:border-primary/20 hover:shadow-lg hover:bg-card/80"
                                )}>
                                    <span className={cn(
                                        "text-[11px] font-black uppercase tracking-tight truncate max-w-[100px] transition-colors",
                                        m.estado === 'finalizado' && scoreA > scoreB ? "text-white" : "text-slate-500 group-hover/m:text-slate-400"
                                    )}>
                                        {teamA}
                                    </span>
                                    
                                    <div className="flex items-center gap-3">
                                        {m.estado === 'finalizado' ? (
                                            <span className="font-black text-xs tabular-nums text-white bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/5 shadow-inner">
                                                {scoreA} — {scoreB}
                                            </span>
                                        ) : m.estado === 'en_curso' ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <Badge variant="live" className="px-2 py-0.5 text-[7px] animate-pulse">LIVE</Badge>
                                                <span className="font-black text-sm text-primary tabular-nums tracking-tighter drop-shadow-[0_0_10px_rgba(109,40,217,0.4)]">
                                                    {scoreA} — {scoreB}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Clock size={10} className="text-slate-700" />
                                                <span className="text-slate-500 text-[10px] font-black tabular-nums">
                                                    {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <span className={cn(
                                        "text-[11px] font-black uppercase tracking-tight truncate max-w-[100px] text-right transition-colors",
                                        m.estado === 'finalizado' && scoreB > scoreA ? "text-white" : "text-slate-500 group-hover/m:text-slate-400"
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
