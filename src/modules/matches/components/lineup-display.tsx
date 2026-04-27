"use client";

import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import type { PartidoWithRelations } from "@/modules/matches/types";

interface LineupDisplayProps {
    match: PartidoWithRelations;
    sportColor?: string;
}

export function LineupDisplay({ match, sportColor = "#10b981" }: LineupDisplayProps) {
    const roster = match.roster ?? [];
    const titularesA = roster
        .filter(r => r.equipo_a_or_b === "equipo_a" && r.es_titular && r.jugador)
        .sort((a, b) => (a.jugador?.numero ?? 99) - (b.jugador?.numero ?? 99));
    const titularesB = roster
        .filter(r => r.equipo_a_or_b === "equipo_b" && r.es_titular && r.jugador)
        .sort((a, b) => (a.jugador?.numero ?? 99) - (b.jugador?.numero ?? 99));

    if (titularesA.length === 0 && titularesB.length === 0) return null;

    const nameA = getDisplayName(match, "a");
    const nameB = getDisplayName(match, "b");

    const TeamList = ({
        players,
        name,
        incomplete,
    }: {
        players: typeof titularesA;
        name: string;
        incomplete: boolean;
    }) => (
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
                <span
                    className="block truncate text-[10px] font-black uppercase tracking-[0.2em]"
                    style={{ color: sportColor }}
                >
                    {name}
                </span>
                <span className="text-[9px] font-bold text-white/20">
                    {players.length}/11
                </span>
            </div>

            {players.length === 0 ? (
                <div
                    className="rounded-xl border border-dashed py-6 text-center"
                    style={{ borderColor: `${sportColor}10` }}
                >
                    <p className="text-[9px] font-bold text-white/20">Sin titular marcado</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {players.map(r => (
                        <div
                            key={r.id}
                            className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
                            style={{ borderColor: `${sportColor}08`, background: `${sportColor}04` }}
                        >
                            <div
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border font-mono text-[9px] font-black"
                                style={{
                                    borderColor: `${sportColor}20`,
                                    background: `${sportColor}10`,
                                    color: `${sportColor}90`,
                                }}
                            >
                                {r.jugador?.numero ?? "–"}
                            </div>
                            <span className="truncate text-[11px] font-bold text-white/80">
                                {r.jugador?.nombre}
                            </span>
                        </div>
                    ))}
                    {incomplete && (
                        <p className="text-[8px] font-bold text-amber-500/60 pt-1">
                            Alineación incompleta
                        </p>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div
            className="mt-8 overflow-hidden rounded-[2rem] border backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{
                borderColor: `${sportColor}15`,
                background: `linear-gradient(to bottom, ${sportColor}08, transparent)`,
            }}
        >
            <div className="px-6 py-4 border-b flex items-center gap-3" style={{ borderColor: `${sportColor}08` }}>
                <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl border"
                    style={{ background: `${sportColor}15`, borderColor: `${sportColor}25` }}
                >
                    <Users2 size={15} style={{ color: sportColor }} />
                </div>
                <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
                        Alineaciones Titulares
                    </h3>
                    <p className="text-[9px] font-bold text-white/20 mt-0.5">11 inicial</p>
                </div>
            </div>

            <div className="px-6 pb-6 pt-4">
                <div
                    className={cn(
                        "grid gap-6",
                        "grid-cols-1 sm:grid-cols-2"
                    )}
                >
                    <TeamList
                        players={titularesA}
                        name={nameA}
                        incomplete={titularesA.length > 0 && titularesA.length < 11}
                    />
                    <div className="hidden sm:block w-px self-stretch" style={{ background: `${sportColor}08` }} />
                    <TeamList
                        players={titularesB}
                        name={nameB}
                        incomplete={titularesB.length > 0 && titularesB.length < 11}
                    />
                </div>
            </div>
        </div>
    );
}
