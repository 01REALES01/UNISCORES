"use client";

import { useState } from "react";
import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import { FOOTBALL_FORMATIONS, FOOTBALL_POSITION_LABELS } from "@/lib/formation-config";
import type { PartidoWithRelations } from "@/modules/matches/types";

interface SoccerLineupDisplayProps {
    match: PartidoWithRelations;
    sportColor?: string;
}

const FW = 280;
const FH = 400;
const VPAD = 26;
const SVG_H = FH + 2 * VPAD;
const PA_W = 140, PA_H = 80;
const GA_W = 70, GA_H = 30;
const GOAL_W = 50, GOAL_H = 12;
const CC_R = 36;
const R = 17;
const NAME_Y = R + 6;

function SoccerField() {
    const mx = (FW - PA_W) / 2;
    const gam = (FW - GA_W) / 2;
    const gom = (FW - GOAL_W) / 2;
    return (
        <g transform={`translate(0,${VPAD})`}>
            <rect x={0} y={0} width={FW} height={FH} rx={6} fill="#2d7a3a" />
            {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x={0} y={i * (FH / 8)} width={FW} height={FH / 8}
                    fill={i % 2 === 0 ? "#2d7a3a" : "#2a7035"} />
            ))}
            <rect x={2} y={2} width={FW - 4} height={FH - 4} rx={5} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
            <line x1={2} y1={FH / 2} x2={FW - 2} y2={FH / 2} stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
            <circle cx={FW / 2} cy={FH / 2} r={CC_R} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
            <circle cx={FW / 2} cy={FH / 2} r={2.5} fill="rgba(255,255,255,0.55)" />
            <rect x={mx} y={2} width={PA_W} height={PA_H} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
            <rect x={gam} y={2} width={GA_W} height={GA_H} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
            <rect x={gom} y={-GOAL_H} width={GOAL_W} height={GOAL_H} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} rx={1} />
            <rect x={mx} y={FH - 2 - PA_H} width={PA_W} height={PA_H} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
            <rect x={gam} y={FH - 2 - GA_H} width={GA_W} height={GA_H} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
            <rect x={gom} y={FH} width={GOAL_W} height={GOAL_H} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} rx={1} />
        </g>
    );
}

function getFirstSurname(nombre: string): string {
    const parts = nombre.trim().split(/\s+/);
    if (parts.length >= 3) return parts[parts.length - 2];
    if (parts.length === 2) return parts[1];
    return parts[0] ?? "";
}

interface PlayerNodeProps {
    x: number;
    y: number;
    numero?: number | null;
    nombre: string;
    color: string;
}

function PlayerNode({ x, y, numero, nombre, color }: PlayerNodeProps) {
    const svgX = (x / 100) * FW;
    const svgY = VPAD + ((100 - y) / 100) * FH;
    const raw = getFirstSurname(nombre);
    const label = raw.length > 9 ? raw.slice(0, 9) : raw;
    return (
        <g transform={`translate(${svgX},${svgY})`}>
            <circle r={R} fill={color} stroke="white" strokeWidth={1.5} opacity={0.95} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="800" fill="white" y={0}>
                {numero ?? "?"}
            </text>
            <text textAnchor="middle" dominantBaseline="hanging" fontSize={8} fontWeight="800"
                fill="black" stroke="black" strokeWidth={3} strokeLinejoin="round"
                paintOrder="stroke" opacity={0.55} y={NAME_Y}>
                {label}
            </text>
            <text textAnchor="middle" dominantBaseline="hanging" fontSize={8} fontWeight="800" fill="white" y={NAME_Y}>
                {label}
            </text>
        </g>
    );
}

export function SoccerLineupDisplay({ match, sportColor = "#10b981" }: SoccerLineupDisplayProps) {
    const [activeTeam, setActiveTeam] = useState<"a" | "b">("a");

    const roster = match.roster ?? [];
    const titularesA = roster.filter(r => r.equipo_a_or_b === "equipo_a" && r.es_titular && r.jugador);
    const titularesB = roster.filter(r => r.equipo_a_or_b === "equipo_b" && r.es_titular && r.jugador);

    if (titularesA.length === 0 && titularesB.length === 0) return null;

    const activeTitulares = activeTeam === "a" ? titularesA : titularesB;
    const formacion = activeTeam === "a" ? match.formacion_a : match.formacion_b;
    const coordMap = formacion ? FOOTBALL_FORMATIONS[formacion] : null;
    const hasPositions = activeTitulares.some(r => r.posicion && coordMap?.[r.posicion]);

    const nameA = getDisplayName(match, "a");
    const nameB = getDisplayName(match, "b");

    return (
        <div
            className="mt-8 overflow-hidden rounded-[2rem] border backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{ borderColor: `${sportColor}15`, background: `linear-gradient(to bottom, ${sportColor}08, transparent)` }}
        >
            <div className="flex items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: `${sportColor}08` }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border"
                        style={{ background: `${sportColor}15`, borderColor: `${sportColor}25` }}>
                        <Users2 size={15} style={{ color: sportColor }} />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Alineaciones</h3>
                        {formacion && <p className="mt-0.5 text-[9px] font-bold text-white/30">{formacion}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: `${sportColor}15`, background: `${sportColor}06` }}>
                    {(["a", "b"] as const).map((side) => (
                        <button key={side} type="button" onClick={() => setActiveTeam(side)}
                            className={cn(
                                "rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-wider transition-all",
                                activeTeam === side ? "text-white shadow-sm" : "text-white/30 hover:text-white/60"
                            )}
                            style={activeTeam === side ? { background: sportColor } : {}}>
                            {side === "a" ? nameA : nameB}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-5">
                {hasPositions && coordMap ? (
                    <div className="mx-auto" style={{ maxWidth: 320 }}>
                        <svg viewBox={`0 0 ${FW} ${SVG_H}`} className="w-full rounded-xl"
                            style={{ aspectRatio: `${FW}/${SVG_H}` }}>
                            <SoccerField />
                            {activeTitulares.map((r) => {
                                if (!r.posicion || !coordMap[r.posicion]) return null;
                                const coord = coordMap[r.posicion];
                                return (
                                    <PlayerNode key={r.id} x={coord.x} y={coord.y}
                                        numero={r.jugador?.numero} nombre={r.jugador?.nombre ?? ""}
                                        color={sportColor} />
                                );
                            })}
                        </svg>
                        {formacion && (
                            <p className="mt-2 text-center text-[9px] font-black uppercase tracking-widest text-white/20">{formacion}</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {activeTitulares.length === 0 ? (
                            <div className="rounded-xl border border-dashed py-6 text-center" style={{ borderColor: `${sportColor}10` }}>
                                <p className="text-[9px] font-bold text-white/20">Sin titulares marcados</p>
                            </div>
                        ) : (
                            activeTitulares
                                .sort((a, b) => (a.jugador?.numero ?? 99) - (b.jugador?.numero ?? 99))
                                .map(r => (
                                    <div key={r.id} className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
                                        style={{ borderColor: `${sportColor}08`, background: `${sportColor}04` }}>
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border font-mono text-[9px] font-black"
                                            style={{ borderColor: `${sportColor}20`, background: `${sportColor}10`, color: `${sportColor}90` }}>
                                            {r.jugador?.numero ?? "–"}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="block truncate text-[11px] font-bold text-white/80">{r.jugador?.nombre}</span>
                                            {r.posicion && (
                                                <span className="text-[8px] font-bold text-white/25">
                                                    {FOOTBALL_POSITION_LABELS[r.posicion] ?? r.posicion}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
