import React, { useMemo } from 'react';
import Link from 'next/link';
import type { PartidoWithRelations as Partido, Evento } from '@/modules/matches/types';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui-primitives';
import { Trophy, Star, Activity, Flame, Target, Crosshair } from 'lucide-react';
import { SPORT_COLORS, SPORT_GRADIENT } from '@/lib/constants';

interface MatchStatsProps {
    match: Partido;
    eventos: Evento[];
    sportName?: string;
}

export function MatchStats({ match, eventos, sportName }: MatchStatsProps) {
    const isBasketball = sportName?.toLowerCase().includes('baloncesto') || sportName?.toLowerCase().includes('basket');
    const isFootball = sportName?.toLowerCase().includes('futbol') || sportName?.toLowerCase().includes('fútbol') || sportName?.toLowerCase().includes('micro') || sportName?.toLowerCase().includes('sala');

    const stats = useMemo(() => {
        const teamA = { 
            goals: 0, fouls: 0, yellowCards: 0, redCards: 0, pts1: 0, pts2: 0, pts3: 0, 
            players: {} as Record<string, { points: number, goals: number, pts1: number, pts2: number, pts3: number, profile: any }> 
        };
        const teamB = { 
            goals: 0, fouls: 0, yellowCards: 0, redCards: 0, pts1: 0, pts2: 0, pts3: 0, 
            players: {} as Record<string, { points: number, goals: number, pts1: number, pts2: number, pts3: number, profile: any }> 
        };

        let mvp: any = null;
        let mvpPoints = 0;

        eventos.forEach(evRaw => {
            const ev = evRaw as any;
            const isTeamA = ev.equipo === 'equipo_a' || ev.equipo === match.equipo_a;
            const team = isTeamA ? teamA : teamB;
            
            let pointsGained = 0;
            if (['gol', 'anotacion', 'punto'].includes(ev.tipo_evento)) {
                team.goals += 1; pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_1') {
                team.goals += 1; team.pts1 += 1; pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_2') {
                team.goals += 2; team.pts2 += 1; pointsGained = 2;
            } else if (ev.tipo_evento === 'punto_3') {
                team.goals += 3; team.pts3 += 1; pointsGained = 3;
            } else if (ev.tipo_evento === 'falta') {
                team.fouls += 1;
            } else if (ev.tipo_evento === 'tarjeta_amarilla') {
                team.yellowCards += 1;
            } else if (ev.tipo_evento === 'tarjeta_roja') {
                team.redCards += 1;
            }

            if (ev.jugadores) {
                const pId = ev.jugadores.id;
                if (!team.players[pId]) {
                    team.players[pId] = { points: 0, goals: 0, pts1: 0, pts2: 0, pts3: 0, profile: ev.jugadores };
                }
                team.players[pId].points += pointsGained;
                if (['gol', 'anotacion'].includes(ev.tipo_evento)) team.players[pId].goals += 1;
                if (ev.tipo_evento === 'punto_1') team.players[pId].pts1 += 1;
                if (ev.tipo_evento === 'punto_2') team.players[pId].pts2 += 1;
                if (ev.tipo_evento === 'punto_3') team.players[pId].pts3 += 1;

                if (team.players[pId].points > mvpPoints) {
                    mvpPoints = team.players[pId].points;
                    mvp = ev.jugadores;
                }
            }
        });

        const allPlayersA = Object.values(teamA.players);
        const allPlayersB = Object.values(teamB.players);
        const topScorersA = allPlayersA.filter(p => p.goals > 0 || p.points > 0).sort((a, b) => b.points - a.points);
        const topScorersB = allPlayersB.filter(p => p.goals > 0 || p.points > 0).sort((a, b) => b.points - a.points);

        // Basketball leaders per category
        const leaderTriples_A = allPlayersA.filter(p => p.pts3 > 0).sort((a, b) => b.pts3 - a.pts3)[0] || null;
        const leaderDoubles_A = allPlayersA.filter(p => p.pts2 > 0).sort((a, b) => b.pts2 - a.pts2)[0] || null;
        const leaderFreeThrows_A = allPlayersA.filter(p => p.pts1 > 0).sort((a, b) => b.pts1 - a.pts1)[0] || null;
        const leaderPoints_A = allPlayersA.filter(p => p.points > 0).sort((a, b) => b.points - a.points)[0] || null;
        const leaderTriples_B = allPlayersB.filter(p => p.pts3 > 0).sort((a, b) => b.pts3 - a.pts3)[0] || null;
        const leaderDoubles_B = allPlayersB.filter(p => p.pts2 > 0).sort((a, b) => b.pts2 - a.pts2)[0] || null;
        const leaderFreeThrows_B = allPlayersB.filter(p => p.pts1 > 0).sort((a, b) => b.pts1 - a.pts1)[0] || null;
        const leaderPoints_B = allPlayersB.filter(p => p.points > 0).sort((a, b) => b.points - a.points)[0] || null;

        return {
            teamA, teamB, mvp, mvpPoints, topScorersA, topScorersB,
            leaderTriples_A, leaderDoubles_A, leaderFreeThrows_A, leaderPoints_A,
            leaderTriples_B, leaderDoubles_B, leaderFreeThrows_B, leaderPoints_B
        };
    }, [eventos, match.equipo_a]);

    const hasEvents = eventos.length > 0;

    if (!hasEvents) {
        return (
            <div className="rounded-[2rem] bg-[#0A0705] border border-white/5 p-8 text-center mt-8">
                <Activity size={32} className="text-white/10 mx-auto mb-4" />
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 font-outfit mb-2">Estadísticas del Encuentro</h3>
                <p className="text-[10px] text-white/20 font-bold max-w-sm mx-auto">No hay eventos ni estadísticas registradas para este partido aún.</p>
            </div>
        );
    }

    const sportColor = SPORT_COLORS[sportName || ''] || '#ef4444';
    const teamBColor = '#64748b';

    const { teamA, teamB, mvp, mvpPoints, topScorersA, topScorersB,
        leaderTriples_A, leaderDoubles_A, leaderFreeThrows_A, leaderPoints_A,
        leaderTriples_B, leaderDoubles_B, leaderFreeThrows_B, leaderPoints_B } = stats;
    const totalGoals = teamA.goals + teamB.goals || 1;
    const totalFouls = teamA.fouls + teamB.fouls || 1;

    // Comparative stat row helper
    const StatRow = ({ label, valueA, valueB, colorA = sportColor, colorB = teamBColor }: { label: string, valueA: number, valueB: number, colorA?: string, colorB?: string }) => {
        const total = valueA + valueB || 1;
        return (
            <div className="flex items-center gap-3 sm:gap-4 py-2.5 border-b border-white/[0.03] last:border-0">
                <span className="text-base sm:text-lg font-black tabular-nums w-8 text-right" style={{ color: colorA }}>{valueA}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${(valueA / total) * 100}%`, backgroundColor: colorA, opacity: 0.7 }} />
                    <div className="h-full rounded-r-full transition-all duration-700" style={{ width: `${(valueB / total) * 100}%`, backgroundColor: colorB, opacity: 0.7 }} />
                </div>
                <span className="text-base sm:text-lg font-black tabular-nums w-8 text-left" style={{ color: colorB }}>{valueB}</span>
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/30 w-20 sm:w-24 text-right">{label}</span>
            </div>
        );
    };

    // Basketball leader card helper
    const LeaderCard = ({ label, player, count, color }: { label: string, player: any, count: number, color: string }) => {
        if (!player) return (
            <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Target size={12} className="text-white/15" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20">{label}</p>
                    <p className="text-[10px] text-white/15 italic">Sin datos</p>
                </div>
            </div>
        );
        const cardContent = (
            <div className={cn(
                "flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/5 transition-all duration-200",
                player.profile.profile_id ? "hover:bg-white/[0.08] hover:border-white/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer" : ""
            )}>
                <Avatar name={player.profile.nombre} className="w-8 h-8 text-[10px] border border-white/10 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30">{label}</p>
                    <p className="text-[10px] sm:text-xs font-black text-white/80 truncate">{player.profile.nombre}</p>
                </div>
                <span className="text-sm font-black tabular-nums shrink-0 px-2 py-0.5 rounded-lg border border-white/5 bg-black/40" style={{ color }}>{count}</span>
            </div>
        );

        if (player.profile.profile_id) {
            return (
                <Link href={`/perfil/${player.profile.profile_id}`}>
                    {cardContent}
                </Link>
            );
        }

        return cardContent;
    };

    return (
        <div className="rounded-[2rem] max-w-4xl mx-auto bg-gradient-to-b from-[#0A0705] to-[#040302] border border-white/5 p-5 sm:p-8 mt-10 shadow-2xl relative overflow-hidden flex flex-col gap-8">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] rounded-full pointer-events-none opacity-10" style={{ backgroundColor: sportColor }} />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] blur-[100px] rounded-full pointer-events-none opacity-5" style={{ backgroundColor: teamBColor }} />

            {/* Header */}
            <div className="flex items-center justify-center relative z-10 w-full border-b border-white/5 pb-5">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-white/80 font-outfit flex items-center gap-3">
                    <Activity size={18} className="animate-pulse" style={{ color: sportColor }} /> Rendimiento Global
                </h3>
            </div>

            {/* Score Bar */}
            <div className="relative z-10 w-full">
                <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-white/50 mb-3 px-1">
                    <span className="truncate flex-1 text-left text-white/80 max-w-[100px] sm:max-w-none">{match.equipo_a}</span>
                    <span className="px-2 flex-shrink-0 text-[7px] sm:text-[9px] tracking-[0.25em]" style={{ color: sportColor }}>{isBasketball ? 'PUNTOS' : 'GOLES'}</span>
                    <span className="truncate flex-1 text-right text-white/80 max-w-[100px] sm:max-w-none">{match.equipo_b}</span>
                </div>
                <div className="flex items-center gap-3 sm:gap-5">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums text-white">{teamA.goals}</span>
                    <div className="flex-1 h-2 sm:h-2.5 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                        <div className="h-full rounded-l-full transition-all duration-1000" style={{ width: `${(teamA.goals / totalGoals) * 100}%`, backgroundColor: sportColor }} />
                        <div className="h-full rounded-r-full transition-all duration-1000" style={{ width: `${(teamB.goals / totalGoals) * 100}%`, backgroundColor: teamBColor }} />
                    </div>
                    <span className="text-3xl sm:text-4xl font-black tabular-nums text-white">{teamB.goals}</span>
                </div>
            </div>

            {/* ═══ BASKETBALL SECTION ═══ */}
            {isBasketball && (
                <div className="relative z-10 flex flex-col gap-6">
                    {/* Shooting Breakdown – Clean horizontal rows */}
                    <div className="bg-white/[0.02] rounded-2xl p-4 sm:p-5 border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 text-center">Desglose de Tiros</p>
                        <StatRow label="Triples" valueA={teamA.pts3} valueB={teamB.pts3} />
                        <StatRow label="Dobles" valueA={teamA.pts2} valueB={teamB.pts2} />
                        <StatRow label="T. Libres" valueA={teamA.pts1} valueB={teamB.pts1} />
                    </div>

                    {/* Per-Team Leaders – Mirrored Dual Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Team A Leaders */}
                        <div className="flex flex-col gap-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 truncate" style={{ color: sportColor }}>{match.equipo_a} — Líderes</p>
                            <LeaderCard label="Líder en Puntos" player={leaderPoints_A} count={leaderPoints_A?.points || 0} color={sportColor} />
                            <LeaderCard label="Líder en Triples" player={leaderTriples_A} count={leaderTriples_A?.pts3 || 0} color={sportColor} />
                            <LeaderCard label="Líder en Dobles" player={leaderDoubles_A} count={leaderDoubles_A?.pts2 || 0} color={sportColor} />
                            <LeaderCard label="Líder en T. Libres" player={leaderFreeThrows_A} count={leaderFreeThrows_A?.pts1 || 0} color={sportColor} />
                        </div>
                        {/* Team B Leaders */}
                        <div className="flex flex-col gap-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 truncate" style={{ color: teamBColor }}>{match.equipo_b} — Líderes</p>
                            <LeaderCard label="Líder en Puntos" player={leaderPoints_B} count={leaderPoints_B?.points || 0} color={teamBColor} />
                            <LeaderCard label="Líder en Triples" player={leaderTriples_B} count={leaderTriples_B?.pts3 || 0} color={teamBColor} />
                            <LeaderCard label="Líder en Dobles" player={leaderDoubles_B} count={leaderDoubles_B?.pts2 || 0} color={teamBColor} />
                            <LeaderCard label="Líder en T. Libres" player={leaderFreeThrows_B} count={leaderFreeThrows_B?.pts1 || 0} color={teamBColor} />
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ FOOTBALL SECTION ═══ */}
            {isFootball && (
                <div className="relative z-10 bg-white/[0.02] rounded-2xl p-4 sm:p-5 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 text-center">Disciplina</p>
                    <StatRow label="Faltas" valueA={teamA.fouls} valueB={teamB.fouls} />
                    <StatRow label="Amarillas" valueA={teamA.yellowCards} valueB={teamB.yellowCards} colorA="#eab308" colorB="#eab308" />
                    <StatRow label="Rojas" valueA={teamA.redCards} valueB={teamB.redCards} colorA="#ef4444" colorB="#ef4444" />
                </div>
            )}

            {/* ═══ MVP & SCORERS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 w-full pt-5 border-t border-white/5">
                
                {/* MVP Player Card */}
                {mvp && (
                    <div className="relative group overflow-hidden p-[2px] rounded-[2rem] bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 shadow-[0_0_40px_rgba(245,158,11,0.12)] transition-transform duration-300 hover:scale-[1.02]">
                        <Link href={mvp.profile_id ? `/perfil/${mvp.profile_id}` : '#'} className={cn("block h-full", !mvp.profile_id && "pointer-events-none")}>
                            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                            <div className="absolute top-5 right-5 text-amber-900/50">
                                <Trophy size={40} />
                            </div>
                            <div className="bg-gradient-to-b from-[#1c1203] to-[#0A0705] rounded-[1.9rem] p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden min-h-[180px] h-full">
                                <div className="absolute -right-16 -bottom-16 opacity-5 text-amber-500 pointer-events-none">
                                    <Flame size={160} />
                                </div>
                                
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-500 mb-4 drop-shadow-md">Jugador Más Valioso</p>
                                
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="relative shrink-0">
                                        <div className="absolute -inset-1.5 bg-amber-500/25 rounded-full blur-lg" />
                                        <Avatar name={mvp.nombre} className="w-14 h-14 sm:w-16 sm:h-16 border-3 border-amber-500 text-xl font-outfit shadow-2xl" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base sm:text-lg font-black font-outfit leading-tight mb-1.5 text-white drop-shadow-lg truncate">{mvp.nombre}</p>
                                        <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 font-mono text-sm tabular-nums rounded-lg px-2.5 py-1 shadow-inner">
                                            <Star size={12} className="inline mr-1.5 -translate-y-0.5 fill-amber-500" />
                                            {mvpPoints} pts
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Team Scorers – Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Team A */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full pointer-events-none opacity-10" style={{ backgroundColor: sportColor }} />
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/40 mb-3 relative z-10 truncate" style={{ color: sportColor }}>
                            {isBasketball ? 'Anotadores' : (isFootball ? 'Goleadores' : 'Destacados')}
                        </p>
                        <div className="space-y-2.5 flex-1 relative z-10">
                            {topScorersA.slice(0, 3).map((player, idx) => {
                                const row = (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-2 transition-opacity p-1 rounded-lg",
                                        player.profile.profile_id ? "hover:bg-white/5 cursor-pointer" : ""
                                    )}>
                                        <Avatar name={player.profile.nombre} className="w-7 h-7 text-[9px] border border-white/10 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black truncate block text-white/80">{player.profile.nombre}</span>
                                            {isBasketball && <span className="text-[7px] font-bold text-white/20">{player.pts3}T·{player.pts2}D·{player.pts1}L</span>}
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-white shrink-0">{isFootball ? player.goals : player.points}</span>
                                    </div>
                                );
                                
                                return player.profile.profile_id ? (
                                    <Link key={idx} href={`/perfil/${player.profile.profile_id}`}>
                                        {row}
                                    </Link>
                                ) : row;
                            })}
                            {topScorersA.length === 0 && <span className="text-[10px] text-white/15 italic">Sin datos</span>}
                        </div>
                    </div>
                    {/* Team B */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 sm:p-4 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 blur-2xl rounded-full pointer-events-none opacity-10" style={{ backgroundColor: teamBColor }} />
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/40 mb-3 relative z-10 truncate" style={{ color: teamBColor }}>
                            {isBasketball ? 'Anotadores' : (isFootball ? 'Goleadores' : 'Destacados')}
                        </p>
                        <div className="space-y-2.5 flex-1 relative z-10">
                            {topScorersB.slice(0, 3).map((player, idx) => {
                                const row = (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-2 transition-opacity p-1 rounded-lg",
                                        player.profile.profile_id ? "hover:bg-white/5 cursor-pointer" : ""
                                    )}>
                                        <Avatar name={player.profile.nombre} className="w-7 h-7 text-[9px] border border-white/10 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black truncate block text-white/80">{player.profile.nombre}</span>
                                            {isBasketball && <span className="text-[7px] font-bold text-white/20">{player.pts3}T·{player.pts2}D·{player.pts1}L</span>}
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-white shrink-0">{isFootball ? player.goals : player.points}</span>
                                    </div>
                                );
                                
                                return player.profile.profile_id ? (
                                    <Link key={idx} href={`/perfil/${player.profile.profile_id}`}>
                                        {row}
                                    </Link>
                                ) : row;
                            })}
                            {topScorersB.length === 0 && <span className="text-[10px] text-white/15 italic">Sin datos</span>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
