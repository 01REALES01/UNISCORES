"use client";

import { cn } from "@/lib/utils";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_EMOJI } from "@/lib/constants";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert } from "lucide-react";
import { calculateStandings, type TeamStanding } from "../utils/standings";


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
                .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja']);

            if (!error && data) {
                const counts: Record<string, number> = {};
                data.forEach(e => {
                    const team = e.equipo;
                    if (!team) return;
                    if (!counts[team]) counts[team] = 0;
                    if (e.tipo_evento === 'tarjeta_amarilla') counts[team] -= 1;
                    if (e.tipo_evento === 'tarjeta_roja') counts[team] -= 3;
                });
                setFairPlayData(counts);
            }
        };
        fetchFairPlay();
    }, [matches]);

    const standings = useMemo(() => {
        return calculateStandings(matches, sportName, fairPlayData);
    }, [matches, sportName, fairPlayData]);

    const accent = SPORT_ACCENT[sportName] || 'text-amber-400';
    const border = SPORT_BORDER[sportName] || 'border-white/10';

    return (
        <div className={cn("bg-[#0a0805] border rounded-2xl overflow-hidden shadow-xl", border)}>
            {/* Group Header */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                <span className="text-lg font-black">{SPORT_EMOJI[sportName] || '🏅'}</span>
                <h3 className={cn("font-extrabold text-sm uppercase tracking-widest", accent)}>
                    Grupo {grupo}
                </h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-white/5 text-white/40 uppercase tracking-wider">
                            <th className="text-left py-2.5 px-4 font-bold">#</th>
                            <th className="text-left py-2.5 px-4 font-bold">Equipo</th>
                            <th className="text-center py-2.5 px-2 font-bold">PJ</th>
                            <th className="text-center py-2.5 px-2 font-bold">PG</th>
                            <th className="text-center py-2.5 px-2 font-bold">PE</th>
                            <th className="text-center py-2.5 px-2 font-bold">PP</th>
                            <th className="text-center py-2.5 px-2 font-bold">{sportName === 'Voleibol' ? 'SG' : 'GF'}</th>
                            <th className="text-center py-2.5 px-2 font-bold">{sportName === 'Voleibol' ? 'SP' : 'GC'}</th>
                            <th className="text-center py-2.5 px-2 font-bold">{sportName === 'Voleibol' ? 'RS' : 'DIF'}</th>
                            {sportName === 'Voleibol' && <th className="text-center py-2.5 px-2 font-bold whitespace-nowrap">RP</th>}
                            <th className="text-center py-2.5 px-2 font-bold">FP</th>
                            <th className="text-center py-2.5 px-4 font-bold">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((team, idx) => {
                            const qualified = idx < 2;
                            return (
                                <tr
                                    key={team.team}
                                    className={cn(
                                        "border-b border-white/5 transition-colors hover:bg-white/5",
                                        qualified && "bg-emerald-500/5"
                                    )}
                                >
                                    <td className="py-3 px-4">
                                        <span className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                            qualified ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/40"
                                        )}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={cn(
                                            "font-bold text-sm truncate max-w-[150px] block",
                                            qualified ? "text-white" : "text-white/70"
                                        )}>
                                            {team.team}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-2 text-white/60 font-mono">{team.played}</td>
                                    <td className="text-center py-3 px-2 text-emerald-400 font-mono font-bold">{team.won}</td>
                                    <td className="text-center py-3 px-2 text-white/40 font-mono">{team.drawn}</td>
                                    <td className="text-center py-3 px-2 text-red-400 font-mono">{team.lost}</td>
                                    <td className="text-center py-3 px-2 text-white/60 font-mono">
                                        {sportName === 'Voleibol' ? team.setsWon : team.pointsFor}
                                    </td>
                                    <td className="text-center py-3 px-2 text-white/60 font-mono">
                                        {sportName === 'Voleibol' ? team.setsLost : team.pointsAgainst}
                                    </td>
                                    <td className="text-center py-3 px-2 font-mono font-bold">
                                        {sportName === 'Voleibol' ? (
                                            <span className="text-white/40">
                                                {(team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost)).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className={team.diff > 0 ? 'text-emerald-400' : team.diff < 0 ? 'text-red-400' : 'text-white/40'}>
                                                {team.diff > 0 ? `+${team.diff}` : team.diff}
                                            </span>
                                        )}
                                    </td>
                                    {sportName === 'Voleibol' && (
                                        <td className="text-center py-3 px-2 text-white/30 font-mono text-[10px]">
                                            {(team.gamePointsAgainst === 0 ? team.gamePointsFor : (team.gamePointsFor / team.gamePointsAgainst)).toFixed(3)}
                                        </td>
                                    )}
                                    <td className="text-center py-3 px-2 font-mono">
                                        <span className={cn(
                                            "flex items-center justify-center gap-1",
                                            team.fairPlay < 0 ? "text-amber-500" : "text-white/20"
                                        )}>
                                            <ShieldAlert size={10} />
                                            {team.fairPlay}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-4">
                                        <span className={cn(
                                            "font-black text-lg",
                                            qualified ? accent : "text-white/50"
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
            <div className="px-4 py-3 border-t border-white/5">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-2">Partidos del Grupo</p>
                <div className="space-y-1.5">
                    {matches.map((m) => {
                        const { scoreA, scoreB } = getScoreFromMatch(m);
                        const teamA = m.delegacion_a || m.equipo_a;
                        const teamB = m.delegacion_b || m.equipo_b;

                        return (
                            <Link href={`/partido/${m.id}`} key={m.id} className="block group">
                                <div className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-lg border border-white/5 hover:border-white/15 transition-all text-xs",
                                    m.estado === 'en_curso' && "border-red-500/30 bg-red-500/5"
                                )}>
                                    <span className={cn(
                                        "font-bold truncate max-w-[100px]",
                                        m.estado === 'finalizado' && scoreA > scoreB ? "text-white" : "text-white/60"
                                    )}>
                                        {teamA}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {m.estado === 'finalizado' ? (
                                            <span className="font-black text-white">
                                                {scoreA} - {scoreB}
                                            </span>
                                        ) : m.estado === 'en_curso' ? (
                                            <span className="font-black text-red-400 animate-pulse">
                                                {scoreA} - {scoreB}
                                            </span>
                                        ) : (
                                            <span className="text-white/30 text-[10px] font-mono">
                                                {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "font-bold truncate max-w-[100px] text-right",
                                        m.estado === 'finalizado' && scoreB > scoreA ? "text-white" : "text-white/60"
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
