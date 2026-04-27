"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import type { PartidoWithRelations, Evento } from "@/modules/matches/types";

interface BasketballLineupDisplayProps {
    match: PartidoWithRelations;
    eventos: Evento[];
    sportColor?: string;
}

interface PlayerStats {
    pts: number;
    p3: number;
    p2: number;
    p1: number;
}

function computePlayerStats(eventos: Evento[]): Record<number, PlayerStats> {
    const stats: Record<number, PlayerStats> = {};
    for (const e of eventos) {
        const pid = e.jugadores?.id;
        if (!pid) continue;
        if (!['punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento)) continue;
        if (!stats[pid]) stats[pid] = { pts: 0, p3: 0, p2: 0, p1: 0 };
        if (e.tipo_evento === 'punto_1') { stats[pid].pts += 1; stats[pid].p1++; }
        if (e.tipo_evento === 'punto_2') { stats[pid].pts += 2; stats[pid].p2++; }
        if (e.tipo_evento === 'punto_3') { stats[pid].pts += 3; stats[pid].p3++; }
    }
    return stats;
}

export function BasketballLineupDisplay({ match, eventos, sportColor = '#F59E0B' }: BasketballLineupDisplayProps) {
    const [activeTeam, setActiveTeam] = useState<'equipo_a' | 'equipo_b'>('equipo_a');

    const roster = match.roster ?? [];
    const titularesA = roster.filter(r => r.equipo_a_or_b === 'equipo_a' && r.es_titular && r.jugador);
    const titularesB = roster.filter(r => r.equipo_a_or_b === 'equipo_b' && r.es_titular && r.jugador);

    if (titularesA.length === 0 && titularesB.length === 0) return null;

    const playerStats = computePlayerStats(eventos);
    const nameA = getDisplayName(match, 'a');
    const nameB = getDisplayName(match, 'b');

    const activePlayers = (activeTeam === 'equipo_a' ? titularesA : titularesB)
        .sort((a, b) => {
            const sA = playerStats[a.jugador!.id]?.pts ?? 0;
            const sB = playerStats[b.jugador!.id]?.pts ?? 0;
            if (sB !== sA) return sB - sA;
            return (a.jugador?.numero ?? 99) - (b.jugador?.numero ?? 99);
        });

    const hasStats = eventos.some(e => ['punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento));

    return (
        <div
            className="mt-8 overflow-hidden rounded-[2rem] border backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{
                borderColor: `${sportColor}15`,
                background: `linear-gradient(to bottom, ${sportColor}08, transparent)`,
            }}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b" style={{ borderColor: `${sportColor}08` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-3">
                    Quinteto Inicial
                </p>
                {/* Team toggle */}
                <div
                    className="flex rounded-2xl p-1 gap-1"
                    style={{ background: `${sportColor}08`, border: `1px solid ${sportColor}12` }}
                >
                    {([['equipo_a', nameA], ['equipo_b', nameB]] as const).map(([key, name]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setActiveTeam(key)}
                            className={cn(
                                "flex-1 rounded-xl py-2 px-3 text-[10px] font-black uppercase tracking-wider transition-all truncate",
                                activeTeam === key
                                    ? "text-black shadow-sm"
                                    : "text-white/40 hover:text-white/70"
                            )}
                            style={activeTeam === key ? { background: sportColor } : {}}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="px-4 pb-5 pt-3">
                {/* Column headers */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-2 mb-2">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest w-6 text-center">#</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Jugador</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest w-8 text-right">Pts</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest w-6 text-right">3P</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest w-6 text-right">2P</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest w-6 text-right">TL</span>
                </div>

                <div className="space-y-1">
                    {activePlayers.length === 0 ? (
                        <div
                            className="rounded-xl border border-dashed py-6 text-center"
                            style={{ borderColor: `${sportColor}10` }}
                        >
                            <p className="text-[9px] font-bold text-white/20">Sin titulares marcados</p>
                        </div>
                    ) : (
                        activePlayers.map(r => {
                            const st = playerStats[r.jugador!.id] ?? { pts: 0, p3: 0, p2: 0, p1: 0 };
                            const isLeader = hasStats && st.pts > 0 && st.pts === Math.max(
                                ...activePlayers.map(p => playerStats[p.jugador!.id]?.pts ?? 0)
                            );
                            return (
                                <div
                                    key={r.id}
                                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center px-2 py-2.5 rounded-xl transition-colors"
                                    style={{
                                        background: isLeader ? `${sportColor}10` : undefined,
                                        borderLeft: isLeader ? `2px solid ${sportColor}60` : '2px solid transparent',
                                    }}
                                >
                                    <div
                                        className="w-6 h-6 flex items-center justify-center rounded-lg font-mono text-[9px] font-black"
                                        style={{
                                            background: `${sportColor}10`,
                                            color: `${sportColor}90`,
                                        }}
                                    >
                                        {r.jugador?.numero ?? '–'}
                                    </div>
                                    <span className="text-[11px] font-bold text-white/80 truncate">
                                        {r.jugador?.nombre}
                                    </span>
                                    <span
                                        className="w-8 text-right text-[12px] font-black tabular-nums"
                                        style={{ color: hasStats ? (st.pts > 0 ? sportColor : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.2)' }}
                                    >
                                        {hasStats ? st.pts : '–'}
                                    </span>
                                    <span className="w-6 text-right text-[10px] font-bold text-white/30 tabular-nums">
                                        {hasStats ? st.p3 : '–'}
                                    </span>
                                    <span className="w-6 text-right text-[10px] font-bold text-white/30 tabular-nums">
                                        {hasStats ? st.p2 : '–'}
                                    </span>
                                    <span className="w-6 text-right text-[10px] font-bold text-white/30 tabular-nums">
                                        {hasStats ? st.p1 : '–'}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {activePlayers.length > 0 && hasStats && (
                    <div className="mt-3 pt-2.5 border-t grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center px-2" style={{ borderColor: `${sportColor}08` }}>
                        <div className="w-6" />
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">Total</span>
                        <span
                            className="w-8 text-right text-[11px] font-black tabular-nums"
                            style={{ color: sportColor }}
                        >
                            {activePlayers.reduce((sum, r) => sum + (playerStats[r.jugador!.id]?.pts ?? 0), 0)}
                        </span>
                        <span className="w-6 text-right text-[9px] font-bold text-white/20 tabular-nums">
                            {activePlayers.reduce((sum, r) => sum + (playerStats[r.jugador!.id]?.p3 ?? 0), 0)}
                        </span>
                        <span className="w-6 text-right text-[9px] font-bold text-white/20 tabular-nums">
                            {activePlayers.reduce((sum, r) => sum + (playerStats[r.jugador!.id]?.p2 ?? 0), 0)}
                        </span>
                        <span className="w-6 text-right text-[9px] font-bold text-white/20 tabular-nums">
                            {activePlayers.reduce((sum, r) => sum + (playerStats[r.jugador!.id]?.p1 ?? 0), 0)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
