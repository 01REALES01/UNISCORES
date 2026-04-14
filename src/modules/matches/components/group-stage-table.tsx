"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, CheckCircle2, ChevronRight, Shield, Square } from "lucide-react";
import { calculateStandings } from "../utils/standings";
import { SportIcon } from "@/components/sport-icons";

function getScoreFromMatch(match: any): { scoreA: number; scoreB: number } {
    const md = match.marcador_detalle || {};
    const sport = match.disciplinas?.name || '';
    if (sport === 'Fútbol') return { scoreA: md.goles_a ?? 0, scoreB: md.goles_b ?? 0 };
    if (sport === 'Voleibol' || sport === 'Tenis' || sport === 'Tenis de Mesa')
        return { scoreA: md.sets_a ?? 0, scoreB: md.sets_b ?? 0 };
    return {
        scoreA: md.total_a ?? md.puntos_a ?? md.goles_a ?? 0,
        scoreB: md.total_b ?? md.puntos_b ?? md.goles_b ?? 0,
    };
}

const GROUP_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    A: { bg: 'bg-sky-500/10',    text: 'text-sky-400',    border: 'border-sky-500/20',    glow: 'shadow-sky-500/10' },
    B: { bg: 'bg-rose-500/10',   text: 'text-rose-400',   border: 'border-rose-500/20',   glow: 'shadow-rose-500/10' },
    C: { bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/20',glow: 'shadow-emerald-500/10' },
    D: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  glow: 'shadow-amber-500/10' },
    E: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/10' },
};
const DEFAULT_GROUP_COLOR = { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10', glow: '' };

function PositionBadge({ idx }: { idx: number }) {
    if (idx === 0) return (
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black border border-amber-400/30 bg-amber-400/10 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.15)]">1</div>
    );
    if (idx === 1) return (
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black border border-slate-400/30 bg-slate-400/10 text-slate-400">2</div>
    );
    return (
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black border border-white/8 bg-white/3 text-white/25">{idx + 1}</div>
    );
}

interface GroupStageTableProps {
    matches: any[];
    sportName: string;
    grupo: string;
    light?: boolean;
    teamIdMap?: Record<string, { teamId?: string; athleteId?: string; avatarUrl?: string; escudoUrl?: string }>;
}

export function GroupStageTable({ matches, sportName, grupo, light = false, teamIdMap = {} }: GroupStageTableProps) {
    const [fairPlayData, setFairPlayData] = useState<Record<string, number>>({});
    const matchIds = useMemo(() => matches.map(m => m.id), [matches]);

    const fetchFairPlay = useCallback(async () => {
        if (matchIds.length === 0) return;

        // Build lookup: matchId + '_equipo_a' → real team name
        // Events store 'equipo_a'/'equipo_b' as literals, not the real name
        const teamNameByMatchAndSide: Record<string, string> = {};
        matches.forEach(m => {
            const a = m.delegacion_a || m.equipo_a;
            const b = m.delegacion_b || m.equipo_b;
            if (a) teamNameByMatchAndSide[`${m.id}_equipo_a`] = a;
            if (b) teamNameByMatchAndSide[`${m.id}_equipo_b`] = b;
        });

        const { data, error } = await supabase
            .from('olympics_eventos')
            .select('tipo_evento, equipo, descripcion, partido_id')
            .in('partido_id', matchIds)
            .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento', 'ajuste_fair_play']);

        if (!error && data) {
            const counts: Record<string, number> = {};
            matches.forEach(m => {
                const a = m.delegacion_a || m.equipo_a;
                const b = m.delegacion_b || m.equipo_b;
                if (a && !counts[a]) counts[a] = 2000;
                if (b && !counts[b]) counts[b] = 2000;
            });
            data.forEach((e: any) => {
                if (!e.equipo) return;
                // Resolve 'equipo_a'/'equipo_b' to the real team name using the lookup map
                const resolvedTeam = teamNameByMatchAndSide[`${e.partido_id}_${e.equipo}`] || e.equipo;
                if (!(resolvedTeam in counts)) counts[resolvedTeam] = 2000;
                if (e.tipo_evento === 'tarjeta_amarilla') counts[resolvedTeam] -= 50;
                if (e.tipo_evento === 'tarjeta_roja') counts[resolvedTeam] -= 100;
                if (e.tipo_evento === 'expulsion_delegado') counts[resolvedTeam] -= 100;
                if (e.tipo_evento === 'mal_comportamiento') counts[resolvedTeam] -= 100;
                if (e.tipo_evento === 'ajuste_fair_play') counts[resolvedTeam] += Number(e.descripcion ?? 0);
            });
            setFairPlayData(counts);
        }
    }, [matchIds, matches]);

    // Initial load + re-fetch when matches prop changes
    useEffect(() => {
        fetchFairPlay();
    }, [fetchFairPlay]);

    // Real-time subscription: re-fetch whenever a card event is inserted/deleted/updated
    useEffect(() => {
        if (matchIds.length === 0) return;

        const channel = supabase
            .channel(`fairplay-group-${grupo}-${matchIds.join('-')}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'olympics_eventos' },
                (payload: any) => {
                    const FP_TYPES = ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento', 'ajuste_fair_play'];
                    const record = payload.new || payload.old;
                    // Only re-fetch if it's a relevant event for one of our matches
                    if (record && matchIds.includes(record.partido_id) && FP_TYPES.includes(record.tipo_evento)) {
                        fetchFairPlay();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [matchIds, grupo, fetchFairPlay]);

    const standings = useMemo(() => calculateStandings(matches, sportName, fairPlayData, teamIdMap), [matches, sportName, fairPlayData, teamIdMap]);

    const gc = GROUP_COLORS[grupo?.toUpperCase()] || DEFAULT_GROUP_COLOR;
    const played = matches.filter(m => m.estado === 'finalizado').length;
    const total  = matches.length;
    const isVoley = sportName === 'Voleibol';
    const isFutbol = sportName === 'Fútbol';

    return (
        <div className={cn(
            "rounded-[2rem] border overflow-hidden shadow-xl transition-all duration-500",
            light ? "bg-white border-slate-100" : "bg-black/30 border-white/8 backdrop-blur-xl"
        )}>
            <div className={cn(
                "px-6 py-5 border-b flex items-center justify-between gap-4",
                light ? "bg-slate-50 border-slate-100" : "bg-white/[0.03] border-white/5"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border font-black text-xl font-display shadow-inner shrink-0", gc.bg, gc.border, gc.text)}>
                        {grupo}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className={cn("font-display font-black text-lg tracking-tight", light ? "text-slate-900" : "text-white")}>Grupo {grupo}</h3>
                            <SportIcon sport={sportName} size={16} className="opacity-40" />
                        </div>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-0.5", light ? "text-slate-400" : "text-white/30")}>
                            {played}/{total} partidos jugados
                        </p>
                    </div>
                </div>
                <div className="flex-1 max-w-[100px] hidden sm:block">
                    <div className={cn("h-1.5 rounded-full overflow-hidden", light ? "bg-slate-100" : "bg-white/5")}>
                        <div className={cn("h-full rounded-full transition-all duration-700", gc.bg.replace('/10', '/60'))} style={{ width: total > 0 ? `${(played / total) * 100}%` : '0%' }} />
                    </div>
                    <p className={cn("text-[8px] font-bold mt-1 text-right", light ? "text-slate-300" : "text-white/20")}>{total > 0 ? Math.round((played / total) * 100) : 0}%</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                    <thead>
                        <tr className={cn("text-[10px] sm:text-[10px] font-black uppercase tracking-[0.2em] border-b", light ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white/[0.02] border-white/5 text-white/30")}>
                            <th className="text-left py-4 px-6 sm:px-8">#</th>
                            <th className="text-left py-4 px-4 w-1/3">Equipo</th>
                            <th className="text-center py-4 px-3 w-10">PJ</th>
                            <th className="text-center py-4 px-3 w-10">PG</th>
                            {sportName !== 'Voleibol' && <th className="text-center py-4 px-3 w-10">PE</th>}
                            <th className="text-center py-4 px-3 w-10">PP</th>
                            <th className="text-center py-4 px-3 w-10">{isVoley ? 'SG' : 'GF'}</th>
                            <th className="text-center py-4 px-3 w-10">{isVoley ? 'SP' : 'GC'}</th>
                            {isVoley && <th className="text-center py-4 px-3 w-14" title="Coeficiente de Puntos">CP</th>}
                            <th className="text-center py-4 px-3 w-10">{isVoley ? 'CS' : 'DIF'}</th>
                            {isFutbol && (
                                <th className="text-center py-4 px-3 w-16" title="Fair Play">
                                    <div className="flex items-center justify-center gap-1">
                                        <Shield size={10} className="text-emerald-400/70" />
                                        <span>FP</span>
                                    </div>
                                </th>
                            )}
                            <th className={cn("text-center py-4 px-6 sm:px-8 w-16", light ? "text-violet-500" : "text-violet-300")}>PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map((team, idx) => {
                            const qualified = idx < 2;
                            const isQualifyLine = idx === 1 && standings.length > 2;

                            return (
                                <tr key={team.team} className={cn("transition-all duration-300 hover:bg-white/[0.04]", qualified && "bg-white/[0.02]")}>
                                    <td className="py-4 px-6 sm:px-8"><PositionBadge idx={idx} /></td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const href = team.athleteId ? `/perfil/${team.athleteId}` : (team.teamId ? `/carrera/${team.teamId}` : null);
                                                const content = (
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1 shrink-0 group-hover/row:scale-110 transition-transform">
                                                            {(team as any).avatar_url ? (
                                                                <img src={(team as any).avatar_url} alt="" className="w-full h-full object-contain" />
                                                            ) : <div className="text-[8px] font-black opacity-20">{team.team.substring(0,2)}</div>}
                                                        </div>
                                                        <span className={cn("font-black text-[12px] uppercase tracking-wide truncate max-w-[140px] sm:max-w-[200px] transition-all duration-300", qualified ? (light ? "text-slate-900" : "text-white") : (light ? "text-slate-400" : "text-white/40"), href && "group-hover/row:text-violet-400")}>
                                                            {team.team}
                                                        </span>
                                                    </div>
                                                );
                                                return href ? (
                                                    <Link href={href} className="flex items-center gap-2 group/link -ml-2">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-violet-500/10 transition-all duration-300 border border-transparent hover:border-violet-500/20 active:scale-95">
                                                            {content}
                                                            <ChevronRight size={10} className="text-violet-400 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all" />
                                                        </div>
                                                    </Link>
                                                ) : <div className="px-2 py-1">{content}</div>;
                                            })()}
                                            {qualified && <CheckCircle2 size={12} className="text-emerald-400 shrink-0 opacity-70" />}
                                        </div>
                                    </td>
                                    <td className="text-center py-4 px-3 text-white/50 font-bold tabular-nums">{team.played}</td>
                                    <td className="text-center py-4 px-3 text-emerald-400 font-black tabular-nums">{team.won}</td>
                                    {sportName !== 'Voleibol' && <td className="text-center py-4 px-3 text-white/40 font-bold tabular-nums">{team.drawn}</td>}
                                    <td className="text-center py-4 px-3 text-rose-400 font-bold tabular-nums">{team.lost}</td>
                                    <td className="text-center py-4 px-3 text-white/50 tabular-nums">{isVoley ? team.setsWon : team.pointsFor}</td>
                                    <td className="text-center py-4 px-3 text-white/50 tabular-nums">{isVoley ? team.setsLost : team.pointsAgainst}</td>
                                    {isVoley && (
                                        <td className="text-center py-4 px-3 tabular-nums">
                                            <span className="text-white/40 italic">{(team.gamePointsAgainst === 0 ? team.gamePointsFor : team.gamePointsFor / team.gamePointsAgainst).toFixed(3)}</span>
                                        </td>
                                    )}
                                    <td className="text-center py-4 px-3 font-black tabular-nums">
                                        {isVoley ? (
                                            <span className="text-white/40 italic">{(team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost)).toFixed(3)}</span>
                                        ) : (
                                            <span className={cn("italic", team.diff > 0 ? 'text-emerald-400' : team.diff < 0 ? 'text-rose-400' : 'text-white/40')}>
                                                {team.diff > 0 ? `+${team.diff}` : team.diff}
                                            </span>
                                        )}
                                    </td>
                                    {isFutbol && (
                                        <td className="text-center py-4 px-3">
                                            <div className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-black text-[11px] tabular-nums border",
                                                team.fairPlayPoints === 2000
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : team.fairPlayPoints >= 1900
                                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                                    : team.fairPlayPoints >= 1800
                                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                            )}>
                                                <Shield size={9} className="shrink-0 opacity-70" />
                                                {team.fairPlayPoints}
                                            </div>
                                        </td>
                                    )}
                                    <td className="text-center py-4 px-6 sm:px-8 text-lg font-black tabular-nums tracking-tighter text-white">
                                        {team.points}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={cn("px-5 py-5 border-t space-y-2", light ? "bg-slate-50/40 border-slate-100" : "bg-black/20 border-white/5")}>
                <div className="flex items-center gap-2 mb-3">
                    <Activity size={12} className={cn("shrink-0", light ? "text-slate-400" : "text-white/30")} />
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", light ? "text-slate-400" : "text-white/30")}>Partidos</span>
                    <div className={cn("flex-1 h-px", light ? "bg-slate-100" : "bg-white/5")} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matches.map((m) => {
                        const { scoreA, scoreB } = getScoreFromMatch(m);
                        const isFinished = m.estado === 'finalizado';
                        const isLive     = m.estado === 'en_curso';
                        const winnerA = isFinished && scoreA > scoreB;
                        const winnerB = isFinished && scoreB > scoreA;
                        
                        // Fallback icon logic using teamIdMap
                        const nameA = m.delegacion_a || m.equipo_a || '';
                        const nameB = m.delegacion_b || m.equipo_b || '';
                        const mapA = teamIdMap[nameA.trim().toLowerCase()] || {};
                        const mapB = teamIdMap[nameB.trim().toLowerCase()] || {};
                        
                        const iconA = m.atleta_a?.avatar_url || m.carrera_a?.escudo_url || m.delegacion_a_info?.escudo_url || mapA.avatarUrl || mapA.escudoUrl;
                        const iconB = m.atleta_b?.avatar_url || m.carrera_b?.escudo_url || m.delegacion_b_info?.escudo_url || mapB.avatarUrl || mapB.escudoUrl;

                        return (
                            <Link href={`/partido/${m.id}`} key={m.id} className="block group/m">
                                <div className={cn("relative flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-200 overflow-hidden", isLive ? "bg-emerald-500/8 border-emerald-500/25" : light ? "bg-white border-slate-100" : "bg-white/[0.03] border-white/8")}>
                                    <div className="flex items-center gap-2 w-[40%] relative z-10">
                                        <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center p-0.5 shrink-0">
                                            {iconA ? (
                                                <img src={iconA} alt="" className="w-full h-full object-contain" />
                                            ) : <div className="text-[6px] opacity-20">{nameA.substring(0,1)}</div>}
                                        </div>
                                        <span className={cn("text-[10px] font-black uppercase tracking-tight truncate", winnerA ? "text-white" : isFinished ? "text-white/30" : "text-white/55")}>{nameA}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center w-[20%] relative z-10 shrink-0">
                                        <span className="font-black text-[12px] tabular-nums">
                                            {isFinished || isLive ? (
                                                `${scoreA}–${scoreB}`
                                            ) : (
                                                <span
                                                    className={cn(
                                                        "italic text-[10px] tracking-widest",
                                                        light ? "text-slate-400" : "text-white/25"
                                                    )}
                                                >
                                                    vs
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 w-[40%] justify-end relative z-10">
                                        <span className={cn("text-[10px] font-black uppercase tracking-tight truncate text-right", winnerB ? "text-white" : isFinished ? "text-white/30" : "text-white/55")}>{nameB}</span>
                                        <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center p-0.5 shrink-0">
                                            {iconB ? (
                                                <img src={iconB} alt="" className="w-full h-full object-contain" />
                                            ) : <div className="text-[6px] opacity-20">{nameB.substring(0,1)}</div>}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
