"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_EMOJI } from "@/lib/constants";
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
    disciplinas: { name: string; icon?: string; emoji?: string };
};

interface GroupStageTableProps {
    matches: Match[];
    sportName: string;
    grupo: string;
}

type TeamStanding = {
    team: string;
    played: number;
    won: number;
    lost: number;
    drawn: number;
    pointsFor: number;
    pointsAgainst: number;
    diff: number;
    points: number;
};

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

export function GroupStageTable({ matches, sportName, grupo }: GroupStageTableProps) {
    const standings = useMemo(() => {
        const teams: Record<string, TeamStanding> = {};

        // Initialize teams from all matches in the group
        matches.forEach((m) => {
            const teamA = m.delegacion_a || m.equipo_a;
            const teamB = m.delegacion_b || m.equipo_b;

            if (!teams[teamA]) {
                teams[teamA] = { team: teamA, played: 0, won: 0, lost: 0, drawn: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, points: 0 };
            }
            if (!teams[teamB]) {
                teams[teamB] = { team: teamB, played: 0, won: 0, lost: 0, drawn: 0, pointsFor: 0, pointsAgainst: 0, diff: 0, points: 0 };
            }

            // Only count finished matches
            if (m.estado === 'finalizado') {
                const { scoreA, scoreB } = getScoreFromMatch(m);

                teams[teamA].played++;
                teams[teamB].played++;
                teams[teamA].pointsFor += scoreA;
                teams[teamA].pointsAgainst += scoreB;
                teams[teamB].pointsFor += scoreB;
                teams[teamB].pointsAgainst += scoreA;

                if (scoreA > scoreB) {
                    teams[teamA].won++;
                    teams[teamB].lost++;
                    teams[teamA].points += 3;
                } else if (scoreB > scoreA) {
                    teams[teamB].won++;
                    teams[teamA].lost++;
                    teams[teamB].points += 3;
                } else {
                    teams[teamA].drawn++;
                    teams[teamB].drawn++;
                    teams[teamA].points += 1;
                    teams[teamB].points += 1;
                }
            }
        });

        // Calculate diff and sort
        return Object.values(teams)
            .map(t => ({ ...t, diff: t.pointsFor - t.pointsAgainst }))
            .sort((a, b) => b.points - a.points || b.diff - a.diff || b.pointsFor - a.pointsFor);
    }, [matches]);

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
                            <th className="text-center py-2.5 px-2 font-bold">GF</th>
                            <th className="text-center py-2.5 px-2 font-bold">GC</th>
                            <th className="text-center py-2.5 px-2 font-bold">DIF</th>
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
                                    <td className="text-center py-3 px-2 text-white/60 font-mono">{team.pointsFor}</td>
                                    <td className="text-center py-3 px-2 text-white/60 font-mono">{team.pointsAgainst}</td>
                                    <td className="text-center py-3 px-2 font-mono font-bold">
                                        <span className={team.diff > 0 ? 'text-emerald-400' : team.diff < 0 ? 'text-red-400' : 'text-white/40'}>
                                            {team.diff > 0 ? `+${team.diff}` : team.diff}
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
                                    m.estado === 'en_vivo' && "border-red-500/30 bg-red-500/5"
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
                                        ) : m.estado === 'en_vivo' ? (
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
