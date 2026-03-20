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
    // 1. Calculate stats based on eventos
    const stats = useMemo(() => {
        const teamA = { goals: 0, fouls: 0, yellowCards: 0, redCards: 0, players: {} as Record<string, { points: number, profile: any }> };
        const teamB = { goals: 0, fouls: 0, yellowCards: 0, redCards: 0, players: {} as Record<string, { points: number, profile: any }> };

        let maxPoints = 0;
        let mvp: any = null;
        let mvpPoints = 0;

        eventos.forEach(evRaw => {
            const ev = evRaw as any; // Bypass TS for joined DB properties
            const isTeamA = ev.equipo === 'equipo_a' || ev.equipo === match.equipo_a;
            const team = isTeamA ? teamA : teamB;
            
            // Add point logic based on your event types (using 'tipo_evento' from DB)
            let pointsGained = 0;
            if (['gol', 'anotacion', 'punto', 'punto_1'].includes(ev.tipo_evento)) {
                team.goals += 1;
                pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_2') {
                team.goals += 2;
                pointsGained = 2;
            } else if (ev.tipo_evento === 'punto_3') {
                team.goals += 3;
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
                    team.players[pId] = { points: 0, profile: ev.jugadores.perfiles };
                }
                team.players[pId].points += pointsGained;

                if (team.players[pId].points > mvpPoints) {
                    mvpPoints = team.players[pId].points;
                    mvp = ev.jugadores.perfiles;
                }
            }
        });

        // Collect top contributors
        const allPlayers = [
            ...Object.values(teamA.players),
            ...Object.values(teamB.players)
        ].filter(p => p.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);

        return {
            teamA,
            teamB,
            mvp,
            mvpPoints,
            topContributors: allPlayers
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

    const { teamA, teamB, mvp, mvpPoints, topContributors } = stats;
    const totalGoals = teamA.goals + teamB.goals || 1; // prevent div by zero
    const totalFouls = teamA.fouls + teamB.fouls || 1;

    return (
        <div className="rounded-[2.5rem] bg-gradient-to-b from-[#0A0705] to-[#050403] border border-white/5 p-8 mt-8 shadow-2xl relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-10 relative z-10">
                <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-white/80 font-outfit flex items-center gap-2">
                    <Activity size={16} className="text-red-500" /> Rendimiento Global
                </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                
                {/* Left Column: Team Comparison Bars */}
                <div className="space-y-8">
                    {/* Goals / Points Comparison */}
                    <div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60 mb-2.5">
                            <span className="truncate flex-1 text-left">{match.equipo_a}</span>
                            <span className="text-amber-500 px-2 flex-shrink-0">ANOTACIONES</span>
                            <span className="truncate flex-1 text-right">{match.equipo_b}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black tabular-nums">{teamA.goals}</span>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                                <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${(teamA.goals / totalGoals) * 100}%` }} />
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(teamB.goals / totalGoals) * 100}%` }} />
                            </div>
                            <span className="text-xl font-black tabular-nums">{teamB.goals}</span>
                        </div>
                    </div>

                    {/* Fouls Comparison */}
                    {(teamA.fouls > 0 || teamB.fouls > 0) && (
                        <div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/60 mb-2.5">
                                <span className="truncate flex-1 text-left">{match.equipo_a}</span>
                                <span className="text-white/30 px-2 flex-shrink-0">FALTAS</span>
                                <span className="truncate flex-1 text-right">{match.equipo_b}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-base font-black tabular-nums text-white/50">{teamA.fouls}</span>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-white/20 transition-all duration-1000" style={{ width: `${(teamA.fouls / totalFouls) * 100}%` }} />
                                    <div className="h-full bg-white/20 transition-all duration-1000" style={{ width: `${(teamB.fouls / totalFouls) * 100}%` }} />
                                </div>
                                <span className="text-base font-black tabular-nums text-white/50">{teamB.fouls}</span>
                            </div>
                        </div>
                    )}

                    {/* Cards / Infractions small grid */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div className="p-4 rounded-2xl bg-[#0F0D0B] border border-white/5 text-center">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Tarjetas Amarillas</span>
                            <div className="flex justify-center gap-4 text-lg font-black tabular-nums text-yellow-500">
                                <span>{teamA.yellowCards}</span>
                                <span className="text-white/10">-</span>
                                <span>{teamB.yellowCards}</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#0F0D0B] border border-white/5 text-center">
                            <span className="block text-[8px] font-black uppercase tracking-widest text-white/30 mb-2">Tarjetas Rojas</span>
                            <div className="flex justify-center gap-4 text-lg font-black tabular-nums text-red-500">
                                <span>{teamA.redCards}</span>
                                <span className="text-white/10">-</span>
                                <span>{teamB.redCards}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: MVP & Top Contributors */}
                <div className="space-y-6">
                    {/* MVP Card */}
                    {mvp && (
                        <div className="p-1 rounded-[2rem] bg-gradient-to-br from-amber-500/20 via-transparent to-transparent shadow-[0_0_30px_rgba(245,158,11,0.05)] relative group">
                            <div className="absolute top-4 right-4 text-amber-500 animate-pulse">
                                <Trophy size={20} />
                            </div>
                            <div className="bg-[#0A0705] rounded-[1.8rem] p-6 flex items-center gap-5 relative overflow-hidden h-full">
                                <div className="absolute -right-10 -bottom-10 opacity-5">
                                    <Flame size={120} />
                                </div>
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-amber-500/20 rounded-full blur-md" />
                                    <Avatar name={mvp.full_name} className="w-16 h-16 border-2 border-amber-500 text-xl font-outfit" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">MVP del Encuentro</p>
                                    <p className="text-xl font-black font-outfit leading-tight mb-1">{mvp.full_name}</p>
                                    <p className="text-sm font-bold text-white/50">{mvpPoints} Aportaciones</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other Contributors */}
                    {topContributors.length > 0 && (
                        <div className="p-6 rounded-[2rem] bg-[#0A0705] border border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-5">Destacados</p>
                            <div className="space-y-4">
                                {topContributors.map((player, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={player.profile.full_name} className="w-8 h-8 text-xs border border-white/10" />
                                            <div>
                                                <p className="text-xs font-black truncate max-w-[140px] uppercase font-outfit">{player.profile.full_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-black tabular-nums text-white/80">{player.points}</span>
                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
