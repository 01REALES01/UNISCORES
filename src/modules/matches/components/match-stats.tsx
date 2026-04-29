import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PartidoWithRelations as Partido, Evento } from '@/modules/matches/types';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui-primitives';
import { Trophy, Star, Activity, Flame, Target, Users, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { SPORT_COLORS, SPORT_GRADIENT } from '@/lib/constants';

interface MatchStatsProps {
    match: Partido;
    eventos: Evento[];
    sportName?: string;
}

/** MVP guardado en `marcador_detalle.mvp_jugador_id` (designación manual). */
function resolveManualMvp(
    match: Partido,
    eventos: Evento[],
    raw: unknown
): { id: number; nombre: string; profile_id?: string | null } | null {
    if (raw === null || raw === undefined || raw === "") return null;
    const idNum = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    if (Number.isNaN(idNum)) return null;
    const preloaded = (match as Partido & { mvp_jugador?: { id: number; nombre: string; profile_id?: string | null } | null }).mvp_jugador;
    if (preloaded?.id === idNum) return preloaded;
    const fromRoster = match.roster?.find((r) => r.jugador?.id === idNum)?.jugador;
    if (fromRoster) return fromRoster;
    for (const ev of eventos) {
        const j = (ev as { jugadores?: { id: number; nombre: string; profile_id?: string | null } }).jugadores;
        if (j?.id === idNum) return j;
    }
    return null;
}

// Comparative stat row helper
const StatRow = ({ label, valueA, valueB, colorA, colorB }: { label: string, valueA: number, valueB: number, colorA: string, colorB: string }) => {
    const total = valueA + valueB || 1;
    return (
        <div className="flex flex-col gap-2 py-4 border-b border-white/[0.05] last:border-0 relative group">
            <div className="flex justify-between items-end px-1 mb-1">
                <div className="flex flex-col">
                    <span className="text-2xl font-black tabular-nums drop-shadow-[0_0_12px_currentColor]" style={{ color: colorA }}>{valueA}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Local</span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] text-white/90 drop-shadow-sm font-display mb-1">{label}</span>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-black tabular-nums drop-shadow-[0_0_12px_currentColor]" style={{ color: colorB }}>{valueB}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Visitante</span>
                </div>
            </div>
            <div className="relative h-4 bg-black/40 rounded-full overflow-hidden flex p-[3px] border border-white/10 shadow-inner group-hover:border-white/20 transition-all duration-300">
                <div 
                    className="h-full rounded-l-full transition-all duration-1000 relative shadow-[0_0_15px_currentColor]" 
                    style={{ width: `${(valueA / total) * 100}%`, backgroundColor: colorA, color: colorA }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                </div>
                <div 
                    className="h-full rounded-r-full transition-all duration-1000 relative shadow-[0_0_15px_currentColor]" 
                    style={{ width: `${(valueB / total) * 100}%`, backgroundColor: colorB, color: colorB }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
            </div>
        </div>
    );
};

// Possession Hero Banner (Football)
const PossessionHeroBanner = ({ valueA, valueB, colorA }: { valueA: number; valueB: number; colorA: string }) => {
    const total = valueA + valueB || 100;
    const pctA = Math.round((valueA / total) * 100);
    const pctB = 100 - pctA;
    return (
        <div className="flex flex-col gap-3 pb-6 border-b border-white/[0.07]">
            <p className="text-center text-[11px] font-semibold tracking-[0.3em] text-white/40 uppercase">Posesión</p>
            <div className="relative h-14 rounded-full overflow-hidden flex shadow-xl">
                <div
                    className="h-full flex items-center justify-start pl-5 transition-all duration-1000 shrink-0"
                    style={{ width: `${pctA}%`, backgroundColor: colorA }}
                >
                    <span className="text-white font-black text-lg leading-none drop-shadow">{pctA} %</span>
                </div>
                <div
                    className="h-full flex items-center justify-end pr-5 flex-1 transition-all duration-1000"
                    style={{ backgroundColor: 'rgba(255,255,255,0.93)' }}
                >
                    <span className="text-black font-black text-lg leading-none">{pctB} %</span>
                </div>
            </div>
        </div>
    );
};

// Simple stat row — value | label | value (Football style, image reference)
const SimpleStatRow = ({ label, valueA, valueB, colorA }: { label: string; valueA: number; valueB: number; colorA: string }) => {
    const aIsHigher = valueA > valueB;
    const bIsHigher = valueB > valueA;
    return (
        <div className="flex items-center py-2.5 gap-2">
            <div className="w-14 sm:w-20 flex justify-start items-center shrink-0">
                {aIsHigher ? (
                    <span
                        className="inline-flex items-center justify-center min-w-[32px] sm:min-w-[38px] px-2 sm:px-3 py-1 rounded-full text-white font-black text-xs sm:text-sm shadow-lg"
                        style={{ backgroundColor: colorA }}
                    >
                        {valueA}
                    </span>
                ) : (
                    <span className="text-white/75 font-semibold text-xs sm:text-sm">{valueA}</span>
                )}
            </div>
            <span className="flex-1 text-center text-[11px] sm:text-[13px] text-white/50 font-medium tracking-wide truncate px-1">{label}</span>
            <div className="w-14 sm:w-20 flex justify-end items-center shrink-0">
                {bIsHigher ? (
                    <span className="inline-flex items-center justify-center min-w-[32px] sm:min-w-[38px] px-2 sm:px-3 py-1 rounded-full bg-white text-black font-black text-xs sm:text-sm shadow-lg">
                        {valueB}
                    </span>
                ) : (
                    <span className="text-white/75 font-semibold text-xs sm:text-sm">{valueB}</span>
                )}
            </div>
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
    const targetUrl = player.profile.profile_id ? `/perfil/${player.profile.profile_id}` : `/jugador/${player.profile.id}`;
    const cardContent = (
        <div className={cn(
            "flex items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10 transition-all duration-300 group",
            "hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
        )}>
            <div className="relative">
                <Avatar name={player.profile.nombre} className="w-10 h-10 text-[12px] border-2 border-white/20 shrink-0 group-hover:border-white/40 transition-colors" />
                <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/20">
                    <Users size={8} className="text-white/60" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-0.5">{label}</p>
                <p className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight leading-tight">{player.profile.nombre}</p>
            </div>
            <span className="text-base font-black tabular-nums shrink-0 px-3 py-1 rounded-xl border border-white/10 bg-black/60 shadow-inner group-hover:scale-110 transition-transform" style={{ color }}>{count}</span>
        </div>
    );

    return (
        <Link href={targetUrl}>
            {cardContent}
        </Link>
    );
};

const BasketballPlayerTable = ({ 
    teamName, 
    players, 
    color,
    isGuest = false,
    isStatVisible
}: { 
    teamName: string, 
    players: any[], 
    color: string,
    isGuest?: boolean,
    isStatVisible?: (stat: string) => boolean
}) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const displayedPlayers = isExpanded ? players : players.slice(0, 5);

    if (players.length === 0) return null;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {teamName}
                </h3>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{players.length} JUGADORES</span>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl">
                <table className="min-w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.04] border-b border-white/5">
                            <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-white/40 min-w-[140px]">Jugador</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-center whitespace-nowrap">PTS</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-white/50 text-center whitespace-nowrap">2P</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-white/50 text-center whitespace-nowrap">3P</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-white/50 text-center whitespace-nowrap">TL</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-center whitespace-nowrap">REB</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-white/40 text-center whitespace-nowrap">AST</th>
                            <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-amber-400/80 text-center whitespace-nowrap">BLQ</th>
                            <th className="py-3 px-3 pr-4 text-[9px] font-black uppercase tracking-widest text-emerald-400 text-center whitespace-nowrap">ROB</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {displayedPlayers.map((p, idx) => (
                            <tr key={p.profile.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            <Avatar
                                                src={p.profile.avatar_url}
                                                name={p.profile.nombre}
                                                className="w-8 h-8 border border-white/10"
                                            />
                                            {idx === 0 && !isExpanded && (
                                                <div className="absolute -top-1 -left-1 bg-amber-500 rounded-full p-0.5 shadow-lg border border-black/50">
                                                    <Crown size={8} className="text-black" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-white/90 truncate group-hover:text-white transition-colors uppercase tracking-tight max-w-[100px] sm:max-w-[160px]">
                                                {p.profile.nombre} {p.profile.numero ? `#${p.profile.numero}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-3 text-sm font-black tabular-nums text-center text-white">{p.points}</td>
                                <td className="py-3 px-3 text-[11px] font-bold tabular-nums text-center text-white/60 whitespace-nowrap">{p.pts2}/{p.pt2a}</td>
                                <td className="py-3 px-3 text-[11px] font-bold tabular-nums text-center text-white/60 whitespace-nowrap">{p.pts3}/{p.pt3a}</td>
                                <td className="py-3 px-3 text-[11px] font-bold tabular-nums text-center text-white/60 whitespace-nowrap">{p.pts1}/{p.tla}</td>
                                <td className="py-3 px-3 text-xs font-bold tabular-nums text-center text-white/60">{p.rebotes}</td>
                                <td className="py-3 px-3 text-xs font-bold tabular-nums text-center text-white/60">{p.asistencias}</td>
                                <td className="py-3 px-3 text-xs font-black tabular-nums text-center text-amber-500/60">{p.bloqueos}</td>
                                <td className="py-3 px-3 pr-4 text-xs font-black tabular-nums text-center text-emerald-500/80">{p.robos}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {players.length > 5 && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white border-t border-white/5"
                    >
                        {isExpanded ? (
                            <>Ver menos <ChevronUp size={12} /></>
                        ) : (
                            <>Ver todos ({players.length - 5} más) <ChevronDown size={12} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

const VolleyballPlayerTable = ({ 
    teamName, 
    players, 
    color,
    isStatVisible 
}: { 
    teamName: string, 
    players: any[], 
    color: string,
    isStatVisible?: (stat: string) => boolean
}) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const displayedPlayers = isExpanded ? players : players.slice(0, 5);

    if (players.length === 0) return null;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {teamName}
                </h3>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{players.length} JUGADORES</span>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02] shadow-2xl">
                <table className="min-w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/[0.04] border-b border-white/5">
                            <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-white/40 min-w-[140px]">Jugador</th>
                            {(!isStatVisible || isStatVisible('ace')) && <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-emerald-400 text-center whitespace-nowrap">ACE</th>}
                            {(!isStatVisible || isStatVisible('bloqueo')) && <th className="py-3 px-3 text-[9px] font-black uppercase tracking-widest text-amber-400 text-center whitespace-nowrap">BLQ</th>}
                            {(!isStatVisible || isStatVisible('ataque_directo')) && <th className="py-3 px-3 pr-4 text-[9px] font-black uppercase tracking-widest text-sky-400 text-center whitespace-nowrap">ATA</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {displayedPlayers.map((p, idx) => (
                            <tr key={p.profile.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            <Avatar
                                                src={p.profile.avatar_url}
                                                name={p.profile.nombre}
                                                className="w-8 h-8 border border-white/10"
                                            />
                                            {idx === 0 && !isExpanded && (
                                                <div className="absolute -top-1 -left-1 bg-amber-500 rounded-full p-0.5 shadow-lg border border-black/50">
                                                    <Crown size={8} className="text-black" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-white/90 truncate group-hover:text-white transition-colors uppercase tracking-tight max-w-[100px] sm:max-w-[160px]">
                                                {p.profile.nombre} {p.profile.numero ? `#${p.profile.numero}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                {(!isStatVisible || isStatVisible('ace')) && <td className="py-3 px-3 text-sm font-black tabular-nums text-center text-emerald-500/80">{p.aces}</td>}
                                {(!isStatVisible || isStatVisible('bloqueo')) && <td className="py-3 px-3 text-sm font-black tabular-nums text-center text-amber-500/80">{p.bloqueos}</td>}
                                {(!isStatVisible || isStatVisible('ataque_directo')) && <td className="py-3 px-3 pr-4 text-sm font-black tabular-nums text-center text-sky-500/80">{p.ataquesDirectos}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {players.length > 5 && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white border-t border-white/5"
                    >
                        {isExpanded ? (
                            <>Ver menos <ChevronUp size={12} /></>
                        ) : (
                            <>Ver todos ({players.length - 5} más) <ChevronDown size={12} /></>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export const MatchStats = ({ match, eventos, sportName }: MatchStatsProps) => {
    const router = useRouter();
    const isBasketball = sportName?.toLowerCase().includes('baloncesto') || sportName?.toLowerCase().includes('basket');
    const isFootball = sportName?.toLowerCase().includes('futbol') || sportName?.toLowerCase().includes('fútbol') || sportName?.toLowerCase().includes('micro') || sportName?.toLowerCase().includes('sala');
    const isVolleyball = sportName === 'Voleibol';
    const statsConfig = match.marcador_detalle?.stats_config as { enabled: boolean; visible: string[] } | undefined;
    
    // Mostramos estadística si la config no existe, si está habilitada pero no hay array visible, 
    // o si específicamente está en el array 'visible'.
    const isStatVisible = (stat: string) => {
        if (!statsConfig) return true;
        if (!statsConfig.enabled) return false;
        if (!statsConfig.visible) return true;
        return statsConfig.visible.includes(stat);
    };

    const stats = useMemo(() => {
        type PlayerStats = { points: number; goals: number; pts1: number; pts2: number; pts3: number; pt2a: number; pt3a: number; tla: number; rebotes: number; robos: number; asistencias: number; aces: number; bloqueos: number; ataquesDirectos: number; yellowCards: number; redCards: number; profile: any };
        const teamA = {
            goals: 0, fouls: 0, yellowCards: 0, redCards: 0, pts1: 0, pts2: 0, pts3: 0,
            tiros: 0, tirosAlArco: 0, faltasCometidas: 0, tirosEsquina: 0,
            aces: 0, bloqueos: 0, ataquesDirectos: 0,
            rebotes: 0, robos: 0, asistencias: 0,
            players: {} as Record<string, PlayerStats>
        };
        const teamB = {
            goals: 0, fouls: 0, yellowCards: 0, redCards: 0, pts1: 0, pts2: 0, pts3: 0,
            tiros: 0, tirosAlArco: 0, faltasCometidas: 0, tirosEsquina: 0,
            aces: 0, bloqueos: 0, ataquesDirectos: 0,
            rebotes: 0, robos: 0, asistencias: 0,
            players: {} as Record<string, PlayerStats>
        };

        let mvp: any = null;
        let mvpPoints = 0;

        eventos.forEach(evRaw => {
            const ev = evRaw as any;
            const isTeamA = ev.equipo === 'equipo_a' || ev.equipo === match.equipo_a;
            const team = isTeamA ? teamA : teamB;
            
            let pointsGained = 0;
            const eventIsPoint = ['gol', 'anotacion', 'punto', 'punto_1', 'punto_2', 'punto_3', 'ace', 'bloqueo', 'ataque_directo' ].includes(ev.tipo_evento);
            
            if (['gol', 'anotacion', 'punto'].includes(ev.tipo_evento)) {
                team.goals += 1; pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_1') {
                team.goals += 1; team.pts1 += 1; pointsGained = 1;
            } else if (ev.tipo_evento === 'punto_2') {
                team.goals += 2; team.pts2 += 1; pointsGained = 2;
            } else if (ev.tipo_evento === 'punto_3') {
                team.goals += 3; team.pts3 += 1; pointsGained = 3;
            } else if (ev.tipo_evento === 'ace') {
                team.aces += 1; 
                if (isVolleyball) { team.goals += 1; pointsGained = 1; }
            } else if (ev.tipo_evento === 'bloqueo') {
                team.bloqueos += 1;
                if (isVolleyball) { team.goals += 1; pointsGained = 1; }
            } else if (ev.tipo_evento === 'ataque_directo') {
                team.ataquesDirectos += 1;
                if (isVolleyball) { team.goals += 1; pointsGained = 1; }
            } else if (ev.tipo_evento === 'falta') {
                team.rebotes += 1;
            } else if (ev.tipo_evento === 'robo') {
                team.robos += 1;
            } else if (ev.tipo_evento === 'asistencia') {
                team.asistencias += 1;
            }

            // tiro_fallado: count attempts but no points
            if (ev.tipo_evento === 'tiro_fallado') {
                try {
                    const coords = ev.descripcion ? JSON.parse(ev.descripcion) : null;
                    const tipo = coords?.tipo_tiro;
                    if (ev.jugadores) {
                        const pId = ev.jugadores.id;
                        if (!team.players[pId]) {
                            team.players[pId] = { points: 0, goals: 0, pts1: 0, pts2: 0, pts3: 0, pt2a: 0, pt3a: 0, tla: 0, rebotes: 0, robos: 0, asistencias: 0, aces: 0, bloqueos: 0, ataquesDirectos: 0, yellowCards: 0, redCards: 0, profile: ev.jugadores };
                        }
                        if (tipo === '3pt') team.players[pId].pt3a += 1;
                        else if (tipo === 'tl') team.players[pId].tla += 1;
                        else team.players[pId].pt2a += 1;
                    }
                } catch {}
            }

            if (ev.jugadores) {
                const pId = ev.jugadores.id;
                if (!team.players[pId]) {
                    team.players[pId] = { points: 0, goals: 0, pts1: 0, pts2: 0, pts3: 0, pt2a: 0, pt3a: 0, tla: 0, rebotes: 0, robos: 0, asistencias: 0, aces: 0, bloqueos: 0, ataquesDirectos: 0, yellowCards: 0, redCards: 0, profile: ev.jugadores };
                }
                team.players[pId].points += pointsGained;
                if (['gol', 'anotacion'].includes(ev.tipo_evento)) team.players[pId].goals += 1;
                if (ev.tipo_evento === 'punto_1') { team.players[pId].pts1 += 1; team.players[pId].tla += 1; }
                if (ev.tipo_evento === 'punto_2') { team.players[pId].pts2 += 1; team.players[pId].pt2a += 1; }
                if (ev.tipo_evento === 'punto_3') { team.players[pId].pts3 += 1; team.players[pId].pt3a += 1; }
                if (ev.tipo_evento === 'rebote') team.players[pId].rebotes += 1;
                if (ev.tipo_evento === 'robo') team.players[pId].robos += 1;
                if (ev.tipo_evento === 'asistencia') team.players[pId].asistencias += 1;
                if (ev.tipo_evento === 'ace') team.players[pId].aces += 1;
                if (ev.tipo_evento === 'bloqueo') team.players[pId].bloqueos += 1;
                if (ev.tipo_evento === 'ataque_directo') team.players[pId].ataquesDirectos += 1;

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

        const posesionEvt = [...eventos].reverse().find(e => e.tipo_evento === 'posesion');
        let posesion: { equipo_a: number; equipo_b: number } | null = null;
        if (posesionEvt?.descripcion) {
            try { posesion = JSON.parse(posesionEvt.descripcion); } catch {}
        }

        const md = match.marcador_detalle || {};
        const manualMvp = resolveManualMvp(match, eventos, md.mvp_jugador_id);
        const effectiveMvp = manualMvp ?? mvp;
        const mvpIsManual = !!manualMvp;
        const effectiveMvpPoints = mvpIsManual ? 0 : mvpPoints;

        return {
            teamA, teamB, mvp, mvpPoints, topScorersA, topScorersB,
            leaderTriples_A, leaderDoubles_A, leaderFreeThrows_A, leaderPoints_A,
            leaderTriples_B, leaderDoubles_B, leaderFreeThrows_B, leaderPoints_B,
            effectiveMvp,
            mvpIsManual,
            effectiveMvpPoints,
            teamAPlayersSorted: Object.values(teamA.players).sort((a: any, b: any) => b.points - a.points || b.rebotes - a.rebotes),
            teamBPlayersSorted: Object.values(teamB.players).sort((a: any, b: any) => b.points - a.points || b.rebotes - a.rebotes),
            posesion,
        };
    }, [eventos, match.equipo_a, match.marcador_detalle, match.roster, (match as Partido & { mvp_jugador?: unknown }).mvp_jugador]);

    const hasEvents = eventos.length > 0;

    const sportColor = SPORT_COLORS[sportName || ''] || '#7c3aed';
    const teamBColor = '#64748b';

    // ═══ VOLLEYBALL: only show sets won ═══
    if (isVolleyball) {
        const { effectiveMvp, mvpIsManual, effectiveMvpPoints } = stats;
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
                <div className="flex items-center justify-between relative z-10 w-full border-b border-white/10 pb-8">
                    <div className="flex items-center gap-5">
                        <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl relative group")}>
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Activity size={24} className="animate-pulse relative z-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-widest uppercase leading-none">Estadísticas</h3>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> RENDIMIENTO POR SET
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sets Bar - Institutional Style */}
                <div className="relative z-10 w-full bg-black/20 rounded-3xl p-6 border border-white/5 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.25em] text-white/40 mb-5 px-2">
                        {(() => {
                            const dId = (match as any).delegacion_a_id;
                            const cId = match.carrera_a_id || (match.carrera_a as any)?.id;
                            const finalTarget = dId ? `/equipo/${dId}` : cId ? `/carrera/${cId}` : null;
                            
                            return finalTarget ? (
                                <Link 
                                    href={finalTarget} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(finalTarget);
                                    }} 
                                    className="truncate max-w-[80px] sm:max-w-[160px] lg:max-w-none text-white/90 hover:text-emerald-400 transition-colors cursor-pointer"
                                >
                                    {nameA}
                                </Link>
                            ) : (
                                <span className="truncate max-w-[80px] sm:max-w-[160px] lg:max-w-none text-white/90">{nameA}</span>
                            );
                        })()}
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColorVoli }} />
                            <span style={{ color: sportColorVoli }}>PUNTUACIÓN GLOBAL</span>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColorVoli }} />
                        </div>
                        {(() => {
                            const dId = (match as any).delegacion_b_id;
                            const cId = match.carrera_b_id || (match.carrera_b as any)?.id;
                            const finalTarget = dId ? `/equipo/${dId}` : cId ? `/carrera/${cId}` : null;
                            
                            return finalTarget ? (
                                <Link 
                                    href={finalTarget} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(finalTarget);
                                    }} 
                                    className="truncate max-w-[80px] sm:max-w-[160px] lg:max-w-none text-white/90 hover:text-emerald-400 transition-colors cursor-pointer"
                                >
                                    {nameB}
                                </Link>
                            ) : (
                                <span className="truncate max-w-[80px] sm:max-w-[160px] lg:max-w-none text-white/90">{nameB}</span>
                            );
                        })()}
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

                {/* Per-set detail — Dynamic list */}
                <div className="relative z-10 grid grid-cols-1 gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-2 px-1">Desglose por Sets</p>
                    {(() => {
                        const existingSets = Object.keys(detalle.sets || {}).map(Number);
                        const currentSet = detalle.set_actual || 1;
                        
                        // Show sets that have scores OR are the current active set
                        const setsToShow = existingSets.filter(s => {
                            const scores = (detalle.sets as Record<string, { puntos_a: number; puntos_b: number }>)?.[s];
                            const hasScore = (scores?.puntos_a ?? 0) > 0 || (scores?.puntos_b ?? 0) > 0;
                            const isCurrent = s === currentSet;
                            return hasScore || isCurrent;
                        });

                        // Always include the current set even if it has no score
                        if (!setsToShow.includes(currentSet) && match.estado === 'en_curso') {
                            setsToShow.push(currentSet);
                        }

                        return setsToShow.sort((a, b) => a - b);
                    })().map((setNum) => {
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

                {(
                    isStatVisible('ace') ||
                    isStatVisible('bloqueo') ||
                    isStatVisible('ataque_directo')
                ) && (
                    <div className="relative z-10 bg-white/[0.04] rounded-[2rem] p-6 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-5 px-1 underline decoration-white/10 underline-offset-8">Desglose Técnico</p>
                        {isStatVisible('ace') && <SimpleStatRow label="Aces" valueA={stats.teamA.aces} valueB={stats.teamB.aces} colorA={sportColorVoli} />}
                        {isStatVisible('bloqueo') && <SimpleStatRow label="Bloqueos" valueA={stats.teamA.bloqueos} valueB={stats.teamB.bloqueos} colorA={sportColorVoli} />}
                        {isStatVisible('ataque_directo') && <SimpleStatRow label="Ataques Directos" valueA={stats.teamA.ataquesDirectos} valueB={stats.teamB.ataquesDirectos} colorA={sportColorVoli} />}
                    </div>
                )}

                {/* ═══ TABLAS DE JUGADORES — VOLEIBOL ═══ */}
                {statsConfig?.enabled !== false && (
                    <div className="relative z-10 flex flex-col gap-8 mt-4">
                        <VolleyballPlayerTable 
                            teamName={match.equipo_a} 
                            players={stats.teamAPlayersSorted} 
                            color={sportColorVoli}
                            isStatVisible={isStatVisible}
                        />
                        <VolleyballPlayerTable 
                            teamName={match.equipo_b} 
                            players={stats.teamBPlayersSorted} 
                            color={teamBColorVoli}
                            isStatVisible={isStatVisible}
                        />
                    </div>
                )}

                {effectiveMvp && (
                    <div className="relative z-10 w-full pt-10 mt-2 border-t border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-5 px-1 flex items-center gap-3">
                            <Trophy size={14} className="text-amber-500" /> Reconocimiento individual
                        </p>
                        <div className="relative group overflow-hidden p-[1.5px] rounded-[2.5rem] bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1">
                            <Link
                                href={
                                    effectiveMvp.profile_id
                                        ? `/perfil/${effectiveMvp.profile_id}`
                                        : `/jugador/${effectiveMvp.id}`
                                }
                                className="block h-full relative z-10"
                            >
                                <div className="relative bg-gradient-to-br from-[#1a1409] via-[#0D0A05] to-black rounded-[2.4rem] p-7 sm:p-10 flex flex-col justify-between h-full min-h-[200px] overflow-hidden">
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                    <div className="flex items-center justify-between mb-6 relative z-10">
                                        <div className="px-5 py-2 rounded-2xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2">
                                            <Crown size={14} /> Jugador más valioso
                                        </div>
                                        <Trophy size={28} className="text-amber-500/20 group-hover:scale-110 transition-all" />
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10 w-full">
                                        <div className="relative shrink-0 mx-auto sm:mx-0">
                                            <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
                                            <Avatar
                                                name={effectiveMvp.nombre}
                                                className="w-24 h-24 sm:w-28 sm:h-28 border-[6px] border-amber-500/40 shadow-2xl bg-black ring-2 ring-amber-500/20"
                                            />
                                            <div className="absolute -bottom-2 -right-2 w-9 h-9 sm:w-10 sm:h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-black">
                                                <Star className="fill-black text-black" size={14} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                                            <p
                                                lang="es"
                                                className="text-xl min-[380px]:text-2xl sm:text-3xl md:text-4xl font-black text-white leading-[1.12] mb-3 sm:mb-4 drop-shadow-2xl uppercase tracking-tight break-words hyphens-auto text-balance px-1 sm:px-0 max-w-full"
                                            >
                                                {effectiveMvp.nombre}
                                            </p>
                                            <div className="inline-flex flex-wrap items-center justify-center sm:justify-start gap-3 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md max-w-full">
                                                {mvpIsManual ? (
                                                    <span className="text-[10px] sm:text-xs font-black text-amber-500/80 uppercase tracking-widest leading-snug text-center sm:text-left">
                                                        Designación oficial · Voleibol
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl font-black tabular-nums text-amber-500 leading-none">
                                                            {effectiveMvpPoints}
                                                        </span>
                                                        <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">
                                                            Puntos en eventos
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ═══ RENDIMIENTO GLOBAL SECTION ═══
    const isProgrammed = match.estado === 'programado';

    const { teamA, teamB, topScorersA, topScorersB,
        leaderTriples_A, leaderDoubles_A, leaderFreeThrows_A, leaderPoints_A,
        leaderTriples_B, leaderDoubles_B, leaderFreeThrows_B, leaderPoints_B,
        effectiveMvp, mvpIsManual, effectiveMvpPoints } = stats;
    
    // Total calculation with safety fallback to 1 to avoid division by zero
    const totalGoals = teamA.goals + teamB.goals || 1;
    const totalFouls = teamA.fouls + teamB.fouls || 1;

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] max-w-4xl mx-auto bg-white/[0.04] backdrop-blur-3xl border border-white/10 p-4 sm:p-7 lg:p-10 mt-6 sm:mt-10 shadow-3xl flex flex-col gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Internal Glow Mesh */}
            <div className="absolute inset-0 p-[1px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            {/* Ambient Atmosphere */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] blur-[150px] rounded-full pointer-events-none opacity-20" style={{ backgroundColor: sportColor }} />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] blur-[100px] rounded-full pointer-events-none opacity-5" style={{ backgroundColor: teamBColor }} />

            {/* Header-like Title */}
            <div className="flex items-center justify-between relative z-10 w-full border-b border-white/10 pb-8">
                <div className="flex items-center gap-5">
                    <div className={cn("p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl relative group")}>
                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Activity size={24} className="animate-pulse relative z-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-white tracking-widest uppercase leading-none">Estadísticas</h3>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                             <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> RENDIMIENTO EN TIEMPO REAL
                        </p>
                    </div>
                </div>
                {isProgrammed && (
                    <div className="bg-emerald-500/10 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] px-4 py-2 rounded-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        PRÓXIMO ENCUENTRO
                    </div>
                )}
            </div>

            {/* Score Bar - Standardized Style */}
            <div className="relative z-10 w-full bg-white/[0.04] rounded-xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/10 shadow-inner">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/40 mb-4 sm:mb-5 px-1 sm:px-2 gap-2">
                    {(() => {
                        const dId = (match as any).delegacion_a_id;
                        const cId = match.carrera_a_id || (match.carrera_a as any)?.id;
                        const finalTarget = dId ? `/equipo/${dId}` : cId ? `/carrera/${cId}` : null;
                        
                        return finalTarget ? (
                            <Link 
                                href={finalTarget} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(finalTarget);
                                }} 
                                className="truncate max-w-[100px] sm:max-w-[200px] lg:max-w-none text-white/90 hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                                {match.equipo_a}
                            </Link>
                        ) : (
                            <span className="truncate max-w-[100px] sm:max-w-[200px] lg:max-w-none text-white/90">{match.equipo_a}</span>
                        );
                    })()}
                    <span className="text-[8px] sm:text-[9px] text-white/20 tracking-[0.3em]">VS</span>
                    {(() => {
                        const dId = (match as any).delegacion_b_id;
                        const cId = match.carrera_b_id || (match.carrera_b as any)?.id;
                        const finalTarget = dId ? `/equipo/${dId}` : cId ? `/carrera/${cId}` : null;
                        
                        return finalTarget ? (
                            <Link 
                                href={finalTarget} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(finalTarget);
                                }} 
                                className="truncate max-w-[100px] sm:max-w-[200px] lg:max-w-none text-white/90 hover:text-emerald-400 transition-colors cursor-pointer text-right"
                            >
                                {match.equipo_b}
                            </Link>
                        ) : (
                            <span className="truncate max-w-[100px] sm:max-w-[200px] lg:max-w-none text-white/90 text-right">{match.equipo_b}</span>
                        );
                    })()}
                </div>

                <div className="flex flex-col group p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-colors bg-black/20 border border-white/5">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-lg sm:text-xl font-black tabular-nums text-white drop-shadow-md">{teamA.goals}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]" style={{ color: sportColor }}>
                                {isBasketball ? 'PUNTOS' : 'GOLES'}
                            </span>
                        </div>
                        <span className="text-lg sm:text-xl font-black tabular-nums text-white/90 drop-shadow-md">{teamB.goals}</span>
                    </div>
                    <div className="flex-1 h-1.5 sm:h-2 bg-black/60 rounded-full overflow-hidden flex shadow-inner border border-white/5 p-[1px]">
                        <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(teamA.goals / totalGoals) * 100}%`, backgroundColor: sportColor }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                        </div>
                        <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(teamB.goals / totalGoals) * 100}%`, backgroundColor: teamBColor }}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ BASKETBALL SECTION ═══ */}
            {isBasketball && (
                <div className="relative z-10 flex flex-col gap-6">
                    {/* --- Technical Breakdown: List Style (Like Football) --- */}
                    <div className="bg-white/[0.04] rounded-xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 sm:mb-5 px-1 underline decoration-white/10 underline-offset-8">Desglose Técnico</p>
                        <div className="flex flex-col">
                            <SimpleStatRow label="Triples" valueA={teamA.pts3} valueB={teamB.pts3} colorA={sportColor} />
                            <SimpleStatRow label="Dobles" valueA={teamA.pts2} valueB={teamB.pts2} colorA={sportColor} />
                            <SimpleStatRow label="Tiros Libres" valueA={teamA.pts1} valueB={teamB.pts1} colorA={sportColor} />
                            
                            {(isStatVisible('rebote') || isStatVisible('robo') || isStatVisible('asistencia') || isStatVisible('bloqueo') || isStatVisible('falta')) && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                                    {isStatVisible('rebote') && <SimpleStatRow label="Rebotes" valueA={teamA.rebotes} valueB={teamB.rebotes} colorA={sportColor} />}
                                    {isStatVisible('robo') && <SimpleStatRow label="Robos" valueA={teamA.robos} valueB={teamB.robos} colorA={sportColor} />}
                                    {isStatVisible('asistencia') && <SimpleStatRow label="Asistencias" valueA={teamA.asistencias} valueB={teamB.asistencias} colorA={sportColor} />}
                                    {isStatVisible('bloqueo') && <SimpleStatRow label="Bloqueos" valueA={teamA.bloqueos} valueB={teamB.bloqueos} colorA={sportColor} />}
                                    {isStatVisible('falta') && <SimpleStatRow label="Faltas" valueA={teamA.fouls} valueB={teamB.fouls} colorA={sportColor} />}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ TABLA DE ESTADÍSTICAS INDIVIDUALES ═══ */}
                    {statsConfig?.enabled !== false && (
                        <div className="flex flex-col gap-8 mt-4">
                            <BasketballPlayerTable 
                                teamName={match.equipo_a} 
                                players={stats.teamAPlayersSorted} 
                                color={sportColor}
                                isStatVisible={isStatVisible}
                            />
                            <BasketballPlayerTable 
                                teamName={match.equipo_b} 
                                players={stats.teamBPlayersSorted} 
                                color={teamBColor}
                                isGuest
                                isStatVisible={isStatVisible}
                            />
                        </div>
                    )}

                    {!(statsConfig?.enabled !== false && (stats.teamAPlayersSorted.length > 0 || stats.teamBPlayersSorted.length > 0)) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mt-4">
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate px-1" style={{ color: sportColor }}>{match.equipo_a} — Líderes</p>
                                <LeaderCard label="Líder en Puntos" player={leaderPoints_A} count={leaderPoints_A?.points || 0} color={sportColor} />
                                <LeaderCard label="Líder en Triples" player={leaderTriples_A} count={leaderTriples_A?.pts3 || 0} color={sportColor} />
                                <LeaderCard label="Líder en Dobles" player={leaderDoubles_A} count={leaderDoubles_A?.pts2 || 0} color={sportColor} />
                                <LeaderCard label="Líder en T. Libres" player={leaderFreeThrows_A} count={leaderFreeThrows_A?.pts1 || 0} color={sportColor} />
                            </div>
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate px-1" style={{ color: teamBColor }}>{match.equipo_b} — Líderes</p>
                                <LeaderCard label="Líder en Puntos" player={leaderPoints_B} count={leaderPoints_B?.points || 0} color={teamBColor} />
                                <LeaderCard label="Líder en Triples" player={leaderTriples_B} count={leaderTriples_B?.pts3 || 0} color={teamBColor} />
                                <LeaderCard label="Líder en Dobles" player={leaderDoubles_B} count={leaderDoubles_B?.pts2 || 0} color={teamBColor} />
                                <LeaderCard label="Líder en T. Libres" player={leaderFreeThrows_B} count={leaderFreeThrows_B?.pts1 || 0} color={teamBColor} />
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* ═══ FOOTBALL SECTION ═══ */}
            {isFootball && (
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="bg-white/[0.04] rounded-xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 sm:mb-5 px-1 underline decoration-white/10 underline-offset-8">Desglose Técnico</p>
                        {/* --- Possession Hero: always first --- */}
                    {isStatVisible('posesion') && stats.posesion && (
                        <PossessionHeroBanner
                            valueA={stats.posesion.equipo_a}
                            valueB={stats.posesion.equipo_b}
                            colorA={sportColor}
                        />
                    )}

                    {/* --- Rest of stats in clean row format --- */}
                    <div className="pt-2">
                        {isStatVisible('tiro') && (
                            <SimpleStatRow label="Tiros totales" valueA={teamA.tiros} valueB={teamB.tiros} colorA={sportColor} />
                        )}
                        {isStatVisible('tiro_al_arco') && (
                            <SimpleStatRow label="Disparos a puerta" valueA={teamA.tirosAlArco} valueB={teamB.tirosAlArco} colorA={sportColor} />
                        )}
                        {isStatVisible('falta_cometida') && (
                            <SimpleStatRow label="Faltas" valueA={teamA.faltasCometidas} valueB={teamB.faltasCometidas} colorA={sportColor} />
                        )}
                        {isStatVisible('tiro_esquina') && (
                            <SimpleStatRow label="Saques de esquina" valueA={teamA.tirosEsquina} valueB={teamB.tirosEsquina} colorA={sportColor} />
                        )}
                        <SimpleStatRow label="Tarjetas amarillas" valueA={teamA.yellowCards} valueB={teamB.yellowCards} colorA="#D97706" />
                        <SimpleStatRow label="Tarjetas rojas" valueA={teamA.redCards} valueB={teamB.redCards} colorA="#DC2626" />
                    </div>
                </div>
            </div>
            )}

            {/* ═══ PERFORMANCE SECTION ═══ */}
            <div className="flex flex-col gap-10 relative z-10 w-full pt-8 border-t border-white/5">
                
                {!(statsConfig?.enabled !== false && (stats.teamAPlayersSorted.length > 0 || stats.teamBPlayersSorted.length > 0)) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Team A */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col relative overflow-hidden transition-all hover:bg-white/[0.05] shadow-xl">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sportColor }} />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90 font-sans">
                                    {isBasketball ? 'Anotadores' : (isFootball ? 'Goleadores' : 'Participantes')}
                                </p>
                            </div>
                            <Users size={14} className="text-white/20" />
                        </div>
                        <div className="space-y-3 flex-1 relative z-10">
                            {topScorersA.length > 0 ? topScorersA.slice(0, 4).map((player, idx) => {
                                const row = (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-4 p-2.5 rounded-2xl transition-all relative group/item",
                                        "hover:bg-white/5 active:scale-[0.98] border border-transparent hover:border-white/10"
                                    )}>
                                        <div className="relative">
                                            <Avatar name={player.profile.nombre} className="w-10 h-10 text-[12px] border border-white/20 shrink-0 shadow-2xl" />
                                            <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-black border border-white/10 flex items-center justify-center text-[8px] font-black text-white/60">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[13px] font-black text-white group-hover/item:text-emerald-400 transition-colors block uppercase tracking-tight leading-snug">
                                                {player.profile.nombre}
                                            </span>
                                            {isBasketball && (
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter mt-1 block">
                                                    {player.pts3}T · {player.pts2}D · {player.pts1}L
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black tabular-nums text-white shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ color: sportColor }}>
                                                {isFootball ? player.goals : player.points}
                                            </span>
                                            {isFootball && <Target size={12} className="text-white/20" />}
                                        </div>
                                    </div>
                                );
                                return (
                                    <Link key={idx} href={player.profile.profile_id ? `/perfil/${player.profile.profile_id}` : `/jugador/${player.profile.id}`}>
                                        {row}
                                    </Link>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center py-10 bg-black/20 rounded-[1.5rem] border border-dashed border-white/5 opacity-40">
                                    <Users size={24} className="mb-3 text-white/10" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Sin registros oficiales</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Team B */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col relative overflow-hidden transition-all hover:bg-white/[0.05] shadow-xl">
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: teamBColor }} />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90 font-sans">
                                    {isBasketball ? 'Anotadores' : (isFootball ? 'Goleadores' : 'Participantes')}
                                </p>
                            </div>
                            <Users size={14} className="text-white/20" />
                        </div>
                        <div className="space-y-3 flex-1 relative z-10">
                            {topScorersB.length > 0 ? topScorersB.slice(0, 4).map((player, idx) => {
                                const row = (
                                    <div key={idx} className={cn(
                                        "flex items-center gap-4 p-2.5 rounded-2xl transition-all relative group/item",
                                        "hover:bg-white/5 active:scale-[0.98] border border-transparent hover:border-white/10"
                                    )}>
                                        <div className="relative">
                                            <Avatar name={player.profile.nombre} className="w-10 h-10 text-[12px] border border-white/20 shrink-0 shadow-2xl" />
                                            <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-black border border-white/10 flex items-center justify-center text-[8px] font-black text-white/60">
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[13px] font-black text-white group-hover/item:text-emerald-400 transition-colors block uppercase tracking-tight leading-snug">
                                                {player.profile.nombre}
                                            </span>
                                            {isBasketball && (
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter mt-1 block">
                                                    {player.pts3}T · {player.pts2}D · {player.pts1}L
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black tabular-nums text-white shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                                {isFootball ? player.goals : player.points}
                                            </span>
                                            {isFootball && <Target size={12} className="text-white/20" />}
                                        </div>
                                    </div>
                                );
                                return (
                                    <Link key={idx} href={player.profile.profile_id ? `/perfil/${player.profile.profile_id}` : `/jugador/${player.profile.id}`}>
                                        {row}
                                    </Link>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center py-10 bg-black/20 rounded-[1.5rem] border border-dashed border-white/5 opacity-40">
                                    <Users size={24} className="mb-3 text-white/10" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Sin registros oficiales</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>}

                {/* MVP Player Card - Hero Position */}
                {effectiveMvp ? (
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-5 px-4 flex items-center gap-3">
                             <Trophy size={14} className="text-amber-500" /> RECONOCIMIENTO INDIVIDUAL
                        </p>
                        <div className="relative group overflow-hidden p-[1.5px] rounded-[2.5rem] bg-gradient-to-br from-amber-200 via-amber-500 to-amber-900 shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:-translate-y-1">
                            <Link href={effectiveMvp.profile_id ? `/perfil/${effectiveMvp.profile_id}` : `/jugador/${effectiveMvp.id}`} className="block h-full relative z-10">
                                <div className="relative bg-gradient-to-br from-[#1a1409] via-[#0D0A05] to-black rounded-[2.4rem] p-6 sm:p-10 flex flex-col justify-between h-full min-h-[260px] sm:min-h-[240px] overflow-hidden">
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                    
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 relative z-10">
                                        <div className="px-4 sm:px-5 py-2 rounded-2xl bg-amber-500 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 max-w-full">
                                            <Crown size={14} className="shrink-0" /> <span className="leading-tight">JUGADOR MÁS VALIOSO</span>
                                        </div>
                                        <Trophy size={28} className="text-amber-500/20 group-hover:scale-125 group-hover:text-amber-500/40 transition-all duration-500 shrink-0 hidden sm:block" />
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10 w-full">
                                        <div className="relative shrink-0 mx-auto sm:mx-0">
                                            <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
                                            <Avatar name={effectiveMvp.nombre} className="w-28 h-28 sm:w-32 sm:h-32 border-[6px] border-amber-500/40 shadow-2xl bg-black ring-2 ring-amber-500/20" />
                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-black">
                                                <Star className="fill-black text-black" size={16} />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 w-full text-center sm:text-left pb-1">
                                            <p
                                                lang="es"
                                                className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.1] mb-3 sm:mb-4 drop-shadow-2xl uppercase tracking-tight break-words hyphens-auto text-balance px-1 sm:px-0"
                                            >
                                                {effectiveMvp.nombre}
                                            </p>
                                            
                                            {(() => {
                                                const mvpFullStats = topScorersA.find(p => p.profile.id === effectiveMvp.id || p.profile.profile_id === effectiveMvp.profile_id) || 
                                                                     topScorersB.find(p => p.profile.id === effectiveMvp.id || p.profile.profile_id === effectiveMvp.profile_id);
                                                
                                                if (mvpFullStats && isBasketball) {
                                                    return (
                                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                                                            {mvpFullStats.points > 0 && (
                                                                <div className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-amber-500">{mvpFullStats.points}</span>
                                                                    <span className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest">PTS</span>
                                                                </div>
                                                            )}
                                                            {(mvpFullStats.pts2 > 0 || mvpFullStats.pt2a > 0) && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-white">{mvpFullStats.pts2}/{mvpFullStats.pt2a}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">2P</span>
                                                                </div>
                                                            )}
                                                            {(mvpFullStats.pts3 > 0 || mvpFullStats.pt3a > 0) && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-white">{mvpFullStats.pts3}/{mvpFullStats.pt3a}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">3P</span>
                                                                </div>
                                                            )}
                                                            {(mvpFullStats.pts1 > 0 || mvpFullStats.tla > 0) && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-white">{mvpFullStats.pts1}/{mvpFullStats.tla}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">TL</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.rebotes > 0 && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-white">{mvpFullStats.rebotes}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">REB</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.asistencias > 0 && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-white">{mvpFullStats.asistencias}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">AST</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.bloqueos > 0 && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-amber-500/80">{mvpFullStats.bloqueos}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">BLQ</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.robos > 0 && (
                                                                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[50px]">
                                                                    <span className="text-xl font-black text-emerald-400">{mvpFullStats.robos}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">ROB</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                
                                                if (mvpFullStats && isFootball) {
                                                    return (
                                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                                                            {mvpFullStats.goals > 0 && (
                                                                <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center min-w-[60px]">
                                                                    <span className="text-xl font-black text-amber-500">{mvpFullStats.goals}</span>
                                                                    <span className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest">GOLES</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.asistencias > 0 && (
                                                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[60px]">
                                                                    <span className="text-xl font-black text-white">{mvpFullStats.asistencias}</span>
                                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">AST</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.yellowCards > 0 && (
                                                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[60px]">
                                                                    <span className="text-xl font-black text-amber-500">{mvpFullStats.yellowCards}</span>
                                                                    <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">TA</span>
                                                                </div>
                                                            )}
                                                            {mvpFullStats.redCards > 0 && (
                                                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center min-w-[60px]">
                                                                    <span className="text-xl font-black text-red-500">{mvpFullStats.redCards}</span>
                                                                    <span className="text-[8px] font-black text-red-500/60 uppercase tracking-widest">TR</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                // Fallback to basic tag
                                                return (
                                                    <div className="inline-flex flex-wrap items-center justify-center sm:justify-start gap-3 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md max-w-full">
                                                        {mvpIsManual ? (
                                                            <span className="text-[10px] sm:text-xs font-black text-amber-500/80 uppercase tracking-widest leading-snug text-center sm:text-left">
                                                                {isFootball ? 'Designación oficial · Fútbol' : 'Designación oficial'}
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className="text-2xl font-black tabular-nums text-amber-500 leading-none">{effectiveMvpPoints}</span>
                                                                <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">{isBasketball ? 'PUNTOS TOTALES' : (isFootball ? 'GOLES MARCADOS' : 'IMPACTO')}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="relative group overflow-hidden rounded-[2.5rem] bg-white/[0.02] border border-white/5 min-h-[220px] flex flex-col items-center justify-center text-center p-8 grayscale opacity-20">
                        <Trophy size={40} className="text-white/20 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">MVP AWARDS</p>
                        <p className="text-xs text-white/20 font-medium max-w-[160px]">Pendiente de inicio</p>
                    </div>
                )}
            </div>
        </div>
    );
}
