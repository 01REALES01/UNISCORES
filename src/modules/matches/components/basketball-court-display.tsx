"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import type { PartidoWithRelations, Evento } from "@/modules/matches/types";

interface BasketballCourtDisplayProps {
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

export function BasketballCourtDisplay({ match, eventos, sportColor = '#F59E0B' }: BasketballCourtDisplayProps) {
    const [activeTeam, setActiveTeam] = useState<'equipo_a' | 'equipo_b'>('equipo_a');

    const roster = match.roster ?? [];
    const titularesA = roster.filter(r => r.equipo_a_or_b === 'equipo_a' && r.es_titular && r.jugador);
    const titularesB = roster.filter(r => r.equipo_a_or_b === 'equipo_b' && r.es_titular && r.jugador);

    if (titularesA.length === 0 && titularesB.length === 0) return null;

    const playerStats = computePlayerStats(eventos);
    const nameA = getDisplayName(match, 'a');
    const nameB = getDisplayName(match, 'b');
    const hasStats = eventos.some(e => ['punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento));

    const activePlayers = [...(activeTeam === 'equipo_a' ? titularesA : titularesB)].sort((a, b) => {
        const sA = playerStats[a.jugador!.id]?.pts ?? 0;
        const sB = playerStats[b.jugador!.id]?.pts ?? 0;
        if (sB !== sA) return sB - sA;
        return (a.jugador?.numero ?? 99) - (b.jugador?.numero ?? 99);
    });

    return (
        <div
            className="mt-8 overflow-hidden rounded-[2rem] border backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{ borderColor: `${sportColor}15`, background: `linear-gradient(to bottom, ${sportColor}08, transparent)` }}
        >
            <div className="border-b px-6 py-4" style={{ borderColor: `${sportColor}08` }}>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Quinteto Inicial</p>
                <div className="flex gap-1 rounded-2xl p-1" style={{ background: `${sportColor}08`, border: `1px solid ${sportColor}12` }}>
                    {([['equipo_a', nameA], ['equipo_b', nameB]] as const).map(([key, name]) => (
                        <button key={key} type="button" onClick={() => setActiveTeam(key)}
                            className={cn(
                                "flex-1 truncate rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all",
                                activeTeam === key ? "text-black shadow-sm" : "text-white/40 hover:text-white/70"
                            )}
                            style={activeTeam === key ? { background: sportColor } : {}}>
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 pb-5 pt-3">
                <div className="mb-2 grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-3 px-2">
                    <span className="w-6 text-center text-[8px] font-black uppercase tracking-widest text-white/20">#</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Jugador</span>
                    <span className="w-8 text-right text-[8px] font-black uppercase tracking-widest text-white/20">Pts</span>
                    <span className="w-6 text-right text-[8px] font-black uppercase tracking-widest text-white/20">3P</span>
                    <span className="w-6 text-right text-[8px] font-black uppercase tracking-widest text-white/20">2P</span>
                    <span className="w-6 text-right text-[8px] font-black uppercase tracking-widest text-white/20">TL</span>
                </div>

                <div className="space-y-1">
                    {activePlayers.length === 0 ? (
                        <div className="rounded-xl border border-dashed py-6 text-center" style={{ borderColor: `${sportColor}10` }}>
                            <p className="text-[9px] font-bold text-white/20">Sin titulares marcados</p>
                        </div>
                    ) : (
                        activePlayers.map(r => {
                            const st = playerStats[r.jugador!.id] ?? { pts: 0, p3: 0, p2: 0, p1: 0 };
                            const isLeader = hasStats && st.pts > 0 && st.pts === Math.max(...activePlayers.map(p => playerStats[p.jugador!.id]?.pts ?? 0));
                            return (
                                <div key={r.id}
                                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-3 rounded-xl px-2 py-2.5 transition-colors"
                                    style={{ background: isLeader ? `${sportColor}10` : undefined, borderLeft: isLeader ? `2px solid ${sportColor}60` : '2px solid transparent' }}>
                                    <div className="flex h-6 w-6 items-center justify-center rounded-lg font-mono text-[9px] font-black"
                                        style={{ background: `${sportColor}10`, color: `${sportColor}90` }}>
                                        {r.jugador?.numero ?? '–'}
                                    </div>
                                    <span className="truncate text-[11px] font-bold text-white/80">{r.jugador?.nombre}</span>
                                    <span className="w-8 text-right text-[12px] font-black tabular-nums"
                                        style={{ color: hasStats ? (st.pts > 0 ? sportColor : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.2)' }}>
                                        {hasStats ? st.pts : '–'}
                                    </span>
                                    <span className="w-6 text-right text-[10px] font-bold tabular-nums text-white/30">{hasStats ? st.p3 : '–'}</span>
                                    <span className="w-6 text-right text-[10px] font-bold tabular-nums text-white/30">{hasStats ? st.p2 : '–'}</span>
                                    <span className="w-6 text-right text-[10px] font-bold tabular-nums text-white/30">{hasStats ? st.p1 : '–'}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                {activePlayers.length > 0 && hasStats && (
                    <div className="mt-3 grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-x-3 border-t px-2 pt-2.5"
                        style={{ borderColor: `${sportColor}08` }}>
                        <div className="w-6" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/30">Total</span>
                        <span className="w-8 text-right text-[11px] font-black tabular-nums" style={{ color: sportColor }}>
                            {activePlayers.reduce((s, r) => s + (playerStats[r.jugador!.id]?.pts ?? 0), 0)}
                        </span>
                        <span className="w-6 text-right text-[9px] font-bold tabular-nums text-white/20">
                            {activePlayers.reduce((s, r) => s + (playerStats[r.jugador!.id]?.p3 ?? 0), 0)}
                        </span>
                        <span className="w-6 text-right text-[9px] font-bold tabular-nums text-white/20">
                            {activePlayers.reduce((s, r) => s + (playerStats[r.jugador!.id]?.p2 ?? 0), 0)}
                        </span>
                        <span className="w-6 text-right text-[9px] font-bold tabular-nums text-white/20">
                            {activePlayers.reduce((s, r) => s + (playerStats[r.jugador!.id]?.p1 ?? 0), 0)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
