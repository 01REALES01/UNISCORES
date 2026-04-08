import React, { useMemo } from 'react';
import Link from 'next/link';
import type { PartidoWithRelations as Partido, Evento } from '@/modules/matches/types';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui-primitives';
import { Trophy, Star, Activity, Flame, Target, Crosshair, Users } from 'lucide-react';
import { SPORT_COLORS, SPORT_GRADIENT } from '@/lib/constants';

interface MatchStatsProps {
    match: Partido;
    eventos: Evento[];
    sportName?: string;
}

// Comparative stat row helper
const StatRow = ({ label, valueA, valueB, colorA, colorB }: { label: string, valueA: number, valueB: number, colorA: string, colorB: string }) => {
    const total = valueA + valueB || 1;
    return (
        <div className="flex items-center gap-3 sm:gap-4 py-3 border-b border-white/[0.05] last:border-0">
            <span className="text-xl sm:text-2xl font-black tabular-nums w-10 text-right drop-shadow-[0_0_10px_currentColor]" style={{ color: colorA }}>{valueA}</span>
            <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden flex p-[2px] border border-white/5 shadow-inner">
                <div className="h-full rounded-l-full transition-all duration-1000 relative" style={{ width: `${(valueA / total) * 100}%`, backgroundColor: colorA }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
                <div className="h-full rounded-r-full transition-all duration-1000 relative" style={{ width: `${(valueB / total) * 100}%`, backgroundColor: colorB }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                </div>
            </div>
            <span className="text-xl sm:text-2xl font-black tabular-nums w-10 text-left drop-shadow-[0_0_10px_currentColor]" style={{ color: colorB }}>{valueB}</span>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white/50 w-24 sm:w-28 text-right font-display">{label}</span>
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

export function MatchStats({ match, eventos, sportName }: MatchStatsProps) {
    const isBasketball = sportName?.toLowerCase().includes('baloncesto') || sportName?.toLowerCase().includes('basket');
    const isFootball = sportName?.toLowerCase().includes('futbol') || sportName?.toLowerCase().includes('fútbol') || sportName?.toLowerCase().includes('micro') || sportName?.toLowerCase().includes('sala');
    const isVolleyball = sportName === 'Voleibol';

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

    const sportColor = SPORT_COLORS[sportName || ''] || '#7c3aed';
    const teamBColor = '#64748b';

    // ═══ VOLLEYBALL: only show sets won ═══
    if (isVolleyball) {
        const detalle = match.marcador_detalle || {};
        const setsA: number = detalle.sets_a ?? 0;
        const setsB: number = detalle.sets_b ?? 0;
        const totalSets = setsA + setsB || 1;
        const sportColorVoli = sportColor;
        const teamBColorVoli = teamBColor;
        const nameA = match.carrera_a?.nombre || match.equipo_a || 'Equipo A';
        const nameB = match.carrera_b?.nombre || match.equipo_b || 'Equipo B';

        return (
            <div className="relative overflow-hidden rounded-[2.5rem] max-w-4xl mx-auto backdrop-blur-3xl border p-7 sm:p-10 mt-10 shadow-3xl flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700" 
                style={{ 
                    background: `linear-gradient(135deg, ${sportColor}15 0%, rgba(255,255,255,0.01) 100%)`,
                    borderColor: `${sportColor}30`
                }}>
                {/* Internal Glow Mesh */}
                <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] blur-[150px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: sportColorVoli }} />

                {/* Header-like Title */}
                <div className="flex items-center justify-between relative z-10 w-full border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className={cn("p-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-lg", `text-${sportColorVoli}`)}>
                            <Activity size={22} className="animate-pulse" style={{ color: sportColorVoli }} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Estadísticas</h3>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-0.5">Rendimiento por set</p>
                        </div>
                    </div>
                </div>

                {/* Sets Bar - Institutional Style */}
                <div className="relative z-10 w-full bg-black/20 rounded-3xl p-6 border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.25em] text-white/40 mb-5 px-2">
                        <span className="truncate max-w-[120px] sm:max-w-none text-white/90">{nameA}</span>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColorVoli }} />
                            <span style={{ color: sportColorVoli }}>PUNTUACIÓN GLOBAL</span>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColorVoli }} />
                        </div>
                        <span className="truncate max-w-[120px] sm:max-w-none text-white/90">{nameB}</span>
                    </div>
                    <div className="flex items-center gap-6 sm:gap-10">
                        <span className="text-5xl sm:text-7xl font-black tabular-nums text-white drop-shadow-2xl">{setsA}</span>
                        <div className="flex-1 h-4 bg-black/40 rounded-full overflow-hidden flex shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5 p-[2px]">
                            <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(setsA / totalSets) * 100}%`, backgroundColor: sportColorVoli }}>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                            </div>
                            <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(setsB / totalSets) * 100}%`, backgroundColor: teamBColorVoli }}>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                            </div>
                        </div>
                        <span className="text-5xl sm:text-7xl font-black tabular-nums text-white/90 drop-shadow-2xl">{setsB}</span>
                    </div>
                </div>

                {/* Per-set detail — best of 3 */}
                <div className="relative z-10 grid grid-cols-1 gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-2 px-1">Desglose Técnico</p>
                    {[1, 2, 3].map((setNum) => {
                        const scores = (detalle.sets as Record<string, { puntos_a: number; puntos_b: number }>)?.[setNum];
                        const played = scores !== undefined;
                        const isCurrent = setNum === (detalle.set_actual ?? 1) && match.estado === 'en_curso';
                        return (
                            <div key={setNum} className={cn(
                                "p-4 rounded-2xl border transition-all duration-500",
                                played || isCurrent 
                                    ? "bg-white/[0.03] border-white/5 opacity-100 shadow-lg" 
                                    : "bg-white/[0.01] border-transparent opacity-20"
                            )}>
                                <StatRow
                                    label={`SET ${setNum}`}
                                    valueA={scores?.puntos_a ?? 0}
                                    valueB={scores?.puntos_b ?? 0}
                                    colorA={sportColorVoli}
                                    colorB={teamBColorVoli}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ═══ RENDIMIENTO GLOBAL SECTION ═══
    const isProgrammed = match.estado === 'programado';

    const { teamA, teamB, mvp, mvpPoints, topScorersA, topScorersB,
        leaderTriples_A, leaderDoubles_A, leaderFreeThrows_A, leaderPoints_A,
        leaderTriples_B, leaderDoubles_B, leaderFreeThrows_B, leaderPoints_B } = stats;
    
    // Total calculation with safety fallback to 1 to avoid division by zero
    const totalGoals = teamA.goals + teamB.goals || 1;
    const totalFouls = teamA.fouls + teamB.fouls || 1;

    return (
        <div className="relative overflow-hidden rounded-[2.5rem] max-w-4xl mx-auto bg-white/[0.04] backdrop-blur-3xl border border-white/10 p-7 sm:p-10 mt-10 shadow-3xl flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Internal Glow Mesh */}
            <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            {/* Ambient Atmosphere */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] blur-[150px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: sportColor }} />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] blur-[100px] rounded-full pointer-events-none opacity-5" style={{ backgroundColor: teamBColor }} />

            {/* Header-like Title */}
            <div className="flex items-center justify-between relative z-10 w-full border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10")}>
                        <Activity size={20} className="animate-pulse" style={{ color: sportColor }} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase font-sans leading-none">Estadísticas</h3>
                    </div>
                </div>
                {isProgrammed && (
                    <div className="bg-white/10 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/10">
                        Próximo Encuentro
                    </div>
                )}
            </div>

            {/* Score Bar - Institutional Style */}
            <div className="relative z-10 w-full bg-black/20 rounded-3xl p-6 border border-white/5 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.25em] text-white/40 mb-5 px-2">
                    <span className="truncate max-w-[120px] sm:max-w-none text-white/90">{match.equipo_a}</span>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColor }} />
                        <span style={{ color: sportColor }}>{isBasketball ? 'PUNTOS' : 'GOLES'}</span>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColor }} />
                    </div>
                    <span className="truncate max-w-[120px] sm:max-w-none text-white/90">{match.equipo_b}</span>
                </div>
                <div className="flex items-center gap-6 sm:gap-10">
                    <span className="text-5xl sm:text-7xl font-black tabular-nums text-white drop-shadow-2xl">{teamA.goals}</span>
                    <div className="flex-1 h-4 bg-black/40 rounded-full overflow-hidden flex shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5 p-[2px]">
                        <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(teamA.goals / totalGoals) * 100}%`, backgroundColor: sportColor }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                        </div>
                        <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(teamB.goals / totalGoals) * 100}%`, backgroundColor: teamBColor }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                        </div>
                    </div>
                    <span className="text-5xl sm:text-7xl font-black tabular-nums text-white/90 drop-shadow-2xl">{teamB.goals}</span>
                </div>
            </div>

            {/* ═══ BASKETBALL SECTION ═══ */}
            {isBasketball && (
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-5 px-1 underline decoration-white/10 underline-offset-8">Desglose de Tiros</p>
                        <StatRow label="Triples" valueA={teamA.pts3} valueB={teamB.pts3} colorA={sportColor} colorB={teamBColor} />
                        <StatRow label="Dobles" valueA={teamA.pts2} valueB={teamB.pts2} colorA={sportColor} colorB={teamBColor} />
                        <StatRow label="T. Libres" valueA={teamA.pts1} valueB={teamB.pts1} colorA={sportColor} colorB={teamBColor} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate px-1" style={{ color: sportColor }}>{match.equipo_a} — Líderes</p>
                            <LeaderCard label="Líder en Puntos" player={leaderPoints_A} count={leaderPoints_A?.points || 0} color={sportColor} />
                            <LeaderCard label="Líder en Triples" player={leaderTriples_A} count={leaderTriples_A?.pts3 || 0} color={sportColor} />
                            <LeaderCard label="Líder en Dobles" player={leaderDoubles_A} count={leaderDoubles_A?.pts2 || 0} color={sportColor} />
                            <LeaderCard label="Líder en T. Libres" player={leaderFreeThrows_A} count={leaderFreeThrows_A?.pts1 || 0} color={sportColor} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate px-1" style={{ color: teamBColor }}>{match.equipo_b} — Líderes</p>
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
                <div className="relative z-10 space-y-2 bg-white/5 rounded-[2rem] p-6 border border-white/10 transition-all hover:bg-white/[0.07]">
                    <div className="flex items-center gap-3 mb-6 px-1">
                        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: sportColor }} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 font-sans">Disciplina</p>
                    </div>
                    <StatRow label="Faltas" valueA={teamA.fouls} valueB={teamB.fouls} colorA={sportColor} colorB={teamBColor} />
                    <StatRow label="Amarillas" valueA={teamA.yellowCards} valueB={teamB.yellowCards} colorA="#FFD700" colorB="#FFD700" />
                    <StatRow label="Rojas" valueA={teamA.redCards} valueB={teamB.redCards} colorA="#FF3B30" colorB="#FF3B30" />
                </div>
            )}

            {/* ═══ MVP & SCORERS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 w-full pt-8 border-t border-white/5">
                
                {/* MVP Player Card */}
                {mvp ? (
                    <div className="relative group overflow-hidden p-[1px] rounded-[2.5rem] bg-gradient-to-br from-amber-300 via-amber-500 to-amber-900 shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
                        <Link href={mvp.profile_id ? `/perfil/${mvp.profile_id}` : '#'} className={cn("block h-full relative z-10", !mvp.profile_id && "pointer-events-none")}>
                            <div className="absolute inset-0 bg-gradient-to-b from-[#201504] to-[#0A0705] rounded-[2.4rem] p-7 sm:p-8 flex flex-col justify-between h-full min-h-[220px]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
                                <div className="absolute bottom-4 right-4 opacity-5 text-amber-500">
                                    <Flame size={120} />
                                </div>
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div className="px-3 py-1 rounded-full bg-amber-500 text-black text-[8px] font-black uppercase tracking-[0.2em] shadow-[0_4px_15px_rgba(245,158,11,0.5)]">
                                        MOST VALUABLE PLAYER
                                    </div>
                                    <Trophy size={24} className="text-amber-500/50" />
                                </div>
                                
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="relative shrink-0">
                                        <div className="absolute -inset-2 bg-amber-500/20 rounded-full blur-xl" />
                                        <Avatar name={mvp.nombre} className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-amber-500 shadow-2xl bg-black" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 drop-shadow-md truncate">{mvp.nombre}</p>
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                            <Star size={14} className="fill-amber-500 text-amber-500" />
                                            <span className="text-lg font-black tabular-nums text-amber-500 leading-none">{mvpPoints} PTS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                ) : (
                    <div className="relative group overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/5 min-h-[220px] flex flex-col items-center justify-center text-center p-8 grayscale opacity-20">
                        <Trophy size={40} className="text-white/20 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">MVP AWARDS</p>
                        <p className="text-xs text-white/20 font-medium max-w-[160px]">Pendiente de inicio</p>
                    </div>
                )}

                {/* Team Scorers – Side by Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Team A */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col relative overflow-hidden transition-all hover:bg-white/[0.08]">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="w-1 h-3 rounded-full" style={{ backgroundColor: sportColor }} />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80 font-sans">
                                {isBasketball ? 'Anotadores' : (isFootball ? 'Goleadores' : 'Participantes')}
                            </p>
                        </div>
                        <div className="space-y-2 flex-1 relative z-10">
                            {topScorersA.length > 0 ? topScorersA.slice(0, 4).map((player, idx) => {
                                const row = (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-3 p-1.5 rounded-xl transition-all",
                                        player.profile.profile_id ? "hover:bg-white/10 cursor-pointer active:scale-95" : ""
                                    )}>
                                        <Avatar name={player.profile.nombre} className="w-8 h-8 text-[10px] border border-white/10 shrink-0 shadow-lg" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] font-black text-white/90 truncate block uppercase tracking-tight">{player.profile.nombre}</span>
                                            {isBasketball && <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter">{player.pts3}T · {player.pts2}D · {player.pts1}L</span>}
                                        </div>
                                        <span className="text-lg font-black tabular-nums text-white/90 shrink-0 drop-shadow-md" style={{ color: sportColor }}>{isFootball ? player.goals : player.points}</span>
                                    </div>
                                );
                                return player.profile.profile_id ? <Link key={idx} href={`/perfil/${player.profile.profile_id}`}>{row}</Link> : row;
                            }) : (
                                <div className="flex flex-col items-center justify-center py-6 bg-black/10 rounded-2xl border border-dashed border-white/5">
                                    <Users size={20} className="mb-2 text-white/5" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/10">Sin registros</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team B */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col relative overflow-hidden transition-all hover:bg-white/[0.08]">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="w-1 h-3 rounded-full" style={{ backgroundColor: teamBColor }} />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80 font-sans">
                                {isBasketball ? 'Anotadores' : (isFootball ? 'Goleadores' : 'Participantes')}
                            </p>
                        </div>
                        <div className="space-y-2 flex-1 relative z-10">
                            {topScorersB.length > 0 ? topScorersB.slice(0, 4).map((player, idx) => {
                                const row = (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-3 p-1.5 rounded-xl transition-all",
                                        player.profile.profile_id ? "hover:bg-white/10 cursor-pointer active:scale-95" : ""
                                    )}>
                                        <Avatar name={player.profile.nombre} className="w-8 h-8 text-[10px] border border-white/10 shrink-0 shadow-lg" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] font-black text-white/90 truncate block uppercase tracking-tight">{player.profile.nombre}</span>
                                            {isBasketball && <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter">{player.pts3}T · {player.pts2}D · {player.pts1}L</span>}
                                        </div>
                                        <span className="text-lg font-black tabular-nums text-white/90 shrink-0 drop-shadow-md">{isFootball ? player.goals : player.points}</span>
                                    </div>
                                );
                                return player.profile.profile_id ? <Link key={idx} href={`/perfil/${player.profile.profile_id}`}>{row}</Link> : row;
                            }) : (
                                <div className="flex flex-col items-center justify-center py-6 bg-black/10 rounded-2xl border border-dashed border-white/5">
                                    <Users size={20} className="mb-2 text-white/5" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/10">Sin registros</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
