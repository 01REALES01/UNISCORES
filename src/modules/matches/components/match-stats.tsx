import React, { useMemo } from 'react';
import type { PartidoWithRelations as Partido, Evento } from '@/modules/matches/types';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui-primitives';
import { Trophy, Star, Activity, Flame } from 'lucide-react';

interface MatchStatsProps {
    match: Partido;
    eventos: Evento[];
    sportName?: string;
}

export function MatchStats({ match, eventos, sportName }: MatchStatsProps) {
    const isBasketball = sportName?.toLowerCase().includes('baloncesto') || sportName?.toLowerCase().includes('basket');
    const isFootball = sportName?.toLowerCase().includes('futbol') || sportName?.toLowerCase().includes('fútbol') || sportName?.toLowerCase().includes('micro') || sportName?.toLowerCase().includes('sala');

    // 1. Calculate stats based on eventos
    const stats = useMemo(() => {
        const teamA = { 
            goals: 0, fouls: 0, yellowCards: 0, redCards: 0, pts1: 0, pts2: 0, pts3: 0, 
            players: {} as Record<string, { points: number, goals: number, pts1: number, pts2: number, pts3: number, profile: any }> 
        };
        const teamB = { 
            goals: 0, fouls: 0, yellowCards: 0, redCards: 0, pts1: 0, pts2: 0, pts3: 0, 
            players: {} as Record<string, { points: number, goals: number, pts1: number, pts2: number, pts3: number, profile: any }> 
        };

        let maxPoints = 0;
        let mvp: any = null;
        let mvpPoints = 0;

        eventos.forEach(evRaw => {
            const ev = evRaw as any; // Bypass TS for joined DB properties
            const isTeamA = ev.equipo === 'equipo_a' || ev.equipo === match.equipo_a;
            const team = isTeamA ? teamA : teamB;
            
            // Add point logic based on your event types (using 'tipo_evento' from DB)
            let pointsGained = 0;
            if (['gol', 'anotacion', 'punto'].includes(ev.tipo_evento)) {
                team.goals += 1;
                pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_1') {
                team.goals += 1; // 1 point added to total score
                team.pts1 += 1;
                pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_2') {
                team.goals += 2; // 2 points added to total score
                team.pts2 += 1;
                pointsGained = 2;
            } else if (ev.tipo_evento === 'punto_3') {
                team.goals += 3; // 3 points added to total score
                team.pts3 += 1;
                pointsGained = 3;
            } else if (ev.tipo_evento === 'falta') {
                team.fouls += 1;
            } else if (ev.tipo_evento === 'tarjeta_amarilla') {
                team.yellowCards += 1;
            } else if (ev.tipo_evento === 'tarjeta_roja') {
                team.redCards += 1;
            }

            if (ev.jugadores && ev.jugadores.perfiles) {
                const pId = ev.jugadores.perfiles.id;
                if (!team.players[pId]) {
                    team.players[pId] = { points: 0, goals: 0, pts1: 0, pts2: 0, pts3: 0, profile: ev.jugadores.perfiles };
                }
                team.players[pId].points += pointsGained;

                if (['gol', 'anotacion'].includes(ev.tipo_evento)) team.players[pId].goals += 1;
                if (ev.tipo_evento === 'punto_1') team.players[pId].pts1 += 1;
                if (ev.tipo_evento === 'punto_2') team.players[pId].pts2 += 1;
                if (ev.tipo_evento === 'punto_3') team.players[pId].pts3 += 1;

                if (team.players[pId].points > mvpPoints) {
                    mvpPoints = team.players[pId].points;
                    mvp = ev.jugadores.perfiles;
                }
            }
        });

        const allPlayersA = Object.values(teamA.players);
        const allPlayersB = Object.values(teamB.players);

        // Sort by goals if football, otherwise by raw points
        const topScorersA = allPlayersA.filter(p => p.goals > 0 || p.points > 0).sort((a, b) => b.points - a.points);
        const topScorersB = allPlayersB.filter(p => p.goals > 0 || p.points > 0).sort((a, b) => b.points - a.points);
        const topContributors = [...allPlayersA, ...allPlayersB].filter(p => p.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);

        return {
            teamA, teamB, mvp, mvpPoints, topScorersA, topScorersB, topContributors
        };
    }, [eventos, match.equipo_a]);

    const hasEvents = eventos.length > 0;

    if (!hasEvents) {
        return (
            <div className="rounded-[2.5rem] bg-[#0A0705] border border-white/5 p-8 text-center mt-8">
                <Activity size={32} className="text-white/10 mx-auto mb-4" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 font-outfit mb-2">Estadísticas del Encuentro</h3>
                <p className="text-[10px] text-white/20 font-bold max-w-sm mx-auto">No hay eventos ni estadísticas registradas para este partido aún.</p>
            </div>
        );
    }

    const { teamA, teamB, mvp, mvpPoints, topScorersA, topScorersB, topContributors } = stats;
    const totalGoals = teamA.goals + teamB.goals || 1; // prevent div by zero
    const totalFouls = teamA.fouls + teamB.fouls || 1;

    return (
        <div className="rounded-[2.5rem] max-w-4xl mx-auto bg-gradient-to-b from-[#0A0705] to-[#040302] border border-white/5 p-10 mt-12 shadow-2xl relative overflow-hidden flex flex-col gap-12">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-center relative z-10 w-full mb-4 border-b border-white/5 pb-8">
                <h3 className="text-[16px] font-black uppercase tracking-[0.4em] text-white/90 font-outfit flex items-center gap-4">
                    <Activity size={24} className="text-red-500 animate-pulse" /> Rendimiento Global
                </h3>
            </div>

            {/* Puntos / Goles Generales */}
            <div className="relative z-10 w-full">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/60 mb-4 px-2">
                    <span className="truncate flex-1 text-left text-white">{match.equipo_a}</span>
                    <span className="text-amber-500 px-4 flex-shrink-0 text-[10px] tracking-[0.3em]">{isBasketball ? 'PUNTOS DE EQUIPO' : 'ANOTACIONES TOTALES'}</span>
                    <span className="truncate flex-1 text-right text-white">{match.equipo_b}</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-4xl font-black tabular-nums">{teamA.goals}</span>
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                        <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000" style={{ width: `${(teamA.goals / totalGoals) * 100}%` }} />
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000" style={{ width: `${(teamB.goals / totalGoals) * 100}%` }} />
                    </div>
                    <span className="text-4xl font-black tabular-nums">{teamB.goals}</span>
                </div>
            </div>

            {/* Baloncesto Stats Exclusivas */}
            {isBasketball && (
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                    {[
                        { label: 'Tiros Libres (1pt)', a: teamA.pts1, b: teamB.pts1 },
                        { label: 'Dobles (2pts)', a: teamA.pts2, b: teamB.pts2 },
                        { label: 'Triples (3pts)', a: teamA.pts3, b: teamB.pts3 }
                    ].map(stat => {
                        const t = stat.a + stat.b || 1;
                        return (
                            <div key={stat.label} className="text-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-3">{stat.label}</span>
                                <div className="flex items-center justify-between gap-4 text-sm font-black tabular-nums">
                                    <span className="text-red-400">{stat.a}</span>
                                    <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-red-500" style={{ width: `${(stat.a / t) * 100}%` }} />
                                        <div className="h-full bg-blue-500" style={{ width: `${(stat.b / t) * 100}%` }} />
                                    </div>
                                    <span className="text-blue-400">{stat.b}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Soccer Stats Exclusivas */}
            {isFootball && (
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="p-6 rounded-3xl bg-[#0F0D0B] border border-white/5 flex flex-col items-center justify-center">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Faltas Cometidas</span>
                        <div className="flex items-center gap-6 w-full">
                            <span className="text-xl font-black tabular-nums text-red-400 w-8 text-right">{teamA.fouls}</span>
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden flex">
                                <div className="h-full bg-red-500/50" style={{ width: `${(teamA.fouls / totalFouls) * 100}%` }} />
                                <div className="h-full bg-blue-500/50" style={{ width: `${(teamB.fouls / totalFouls) * 100}%` }} />
                            </div>
                            <span className="text-xl font-black tabular-nums text-blue-400 w-8 text-left">{teamB.fouls}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-[#0F0D0B] border border-yellow-500/10 text-center">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Amarillas</span>
                            <div className="flex justify-center gap-4 text-xl font-black tabular-nums text-yellow-500">
                                <span>{teamA.yellowCards}</span><span className="text-white/10">-</span><span>{teamB.yellowCards}</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#0F0D0B] border border-red-500/10 text-center">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Rojas</span>
                            <div className="flex justify-center gap-4 text-xl font-black tabular-nums text-red-500">
                                <span>{teamA.redCards}</span><span className="text-white/10">-</span><span>{teamB.redCards}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MVP & Scorers Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 w-full pt-8 border-t border-white/5">
                
                {/* MVP Player Card */}
                {mvp && (
                    <div className="p-[2px] rounded-[2.5rem] bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative group overflow-hidden h-full">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                        <div className="absolute top-6 right-6 text-amber-900 drop-shadow-[0_0_10px_rgba(245,158,11,1)]">
                            <Trophy size={48} />
                        </div>
                        <div className="bg-gradient-to-b from-[#1c1203] to-[#0A0705] rounded-[2.4rem] p-8 flex flex-col justify-between relative overflow-hidden h-full min-h-[220px]">
                            <div className="absolute -right-20 -bottom-20 opacity-5 text-amber-500 pointer-events-none">
                                <Flame size={200} />
                            </div>
                            
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500 mb-6 drop-shadow-md">Jugador Más Valioso</p>
                            
                            <div className="flex items-center gap-6 relative z-10 mb-4">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-amber-500/30 rounded-full blur-xl" />
                                    <Avatar name={mvp.full_name} className="w-20 h-20 border-4 border-amber-500 text-3xl font-outfit shadow-2xl" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-2xl font-black font-outfit leading-tight mb-2 text-white drop-shadow-lg">{mvp.full_name}</p>
                                    <Badge title={`${mvpPoints} Ptos aportados`} className="bg-amber-500/20 text-amber-500 border border-amber-500/30 font-mono text-xl tabular-nums rounded-xl px-4 py-1.5 shadow-inner">
                                        <Star size={14} className="inline mr-2 -translate-y-0.5 fill-amber-500" />
                                        {mvpPoints} pts
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Team Scorers / Contributors */}
                <div className="flex flex-col gap-6 h-full">
                    {/* Team A Scorers */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 h-1/2 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex justify-between relative z-10">
                            <span className="text-red-400 truncate max-w-[120px]">{match.equipo_a}</span>
                            <span>{isBasketball ? 'ANOTADORES' : (isFootball ? 'GOLEADORES' : 'DESTACADOS')}</span>
                        </p>
                        <div className="space-y-4 flex-1 relative z-10">
                            {topScorersA.slice(0, 3).map((player, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                        <Avatar name={player.profile.full_name} className="w-10 h-10 text-sm border-2 border-red-500/20" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black truncate max-w-[150px] uppercase font-outfit text-white/90">{player.profile.full_name}</span>
                                            {isBasketball && (
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{player.pts3}T • {player.pts2}D • {player.pts1}L</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xl font-black tabular-nums text-white bg-black/50 px-3 py-1 rounded-xl shadow-inner border border-white/5">{isFootball ? player.goals : player.points}</span>
                                </div>
                            ))}
                            {topScorersA.length === 0 && <span className="text-xs font-bold text-white/20 italic block mt-4">Nadie ha anotado aún</span>}
                        </div>
                    </div>
                    {/* Team B Scorers */}
                    <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 h-1/2 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex justify-between relative z-10">
                            <span className="text-blue-400 truncate max-w-[120px]">{match.equipo_b}</span>
                            <span>{isBasketball ? 'ANOTADORES' : (isFootball ? 'GOLEADORES' : 'DESTACADOS')}</span>
                        </p>
                        <div className="space-y-4 flex-1 relative z-10">
                            {topScorersB.slice(0, 3).map((player, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-4">
                                        <Avatar name={player.profile.full_name} className="w-10 h-10 text-sm border-2 border-blue-500/20" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black truncate max-w-[150px] uppercase font-outfit text-white/90">{player.profile.full_name}</span>
                                            {isBasketball && (
                                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{player.pts3}T • {player.pts2}D • {player.pts1}L</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xl font-black tabular-nums text-white bg-black/50 px-3 py-1 rounded-xl shadow-inner border border-white/5">{isFootball ? player.goals : player.points}</span>
                                </div>
                            ))}
                            {topScorersB.length === 0 && <span className="text-xs font-bold text-white/20 italic block mt-4">Nadie ha anotado aún</span>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
