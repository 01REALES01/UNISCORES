"use client";

import { useState, useMemo } from "react";
import type { Evento, PartidoWithRelations as Partido } from "@/modules/matches/types";
import { parseShotCoords } from "@/lib/audit-helpers";
import { cn } from "@/lib/utils";

const COLOR_A = '#f97316';
const COLOR_B = '#3b82f6';

// Media cancha FIBA — Orientación vertical / cuadrada para móvil
// ViewBox 160 × 170 (representa 16m × 17m incluyendo márgenes, cancha de 14m x 15m)
function CourtSVG() {
    return (
        <svg
            viewBox="0 0 160 170"
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
            preserveAspectRatio="xMidYMid meet"
        >
            {/* Suelo parqué */}
            <rect x="0" y="0" width="160" height="170" fill="#c8964a" />

            {/* Vetas del parqué */}
            {Array.from({ length: 17 }).map((_, i) => (
                <rect key={i} x="0" y={i * 10} width="160" height="4" fill="rgba(180,120,40,0.18)" />
            ))}

            {/* Borde exterior cancha (y=10 to 160, width 150. x=10 to 150, length 140) */}
            <rect x="10" y="10" width="140" height="150" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />

            {/* Línea central (X=10 es la de medio campo) */}
            <line x1="10" y1="10" x2="10" y2="160" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />

            {/* Círculo central (medio campo X=10, Y=85, r=18) */}
            <path d="M 10 67 A 18 18 0 0 1 10 103" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8" />

            {/* Pintura / Zona */}
            <rect x="92" y="60.5" width="58" height="49" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />

            {/* Semicírculo Tiro Libre */}
            <path d="M 92 67 A 18 18 0 0 0 92 103" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
            <path d="M 92 67 A 18 18 0 0 1 92 103" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" strokeDasharray="3 2" />

            {/* Aro y Tablero */}
            <line x1="138" y1="76" x2="138" y2="94" stroke="rgba(255,255,255,0.9)" strokeWidth="1" />
            <line x1="138" y1="85" x2="136.5" y2="85" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
            <circle cx="134.25" cy="85" r="2.25" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" />

            {/* Area Restringida */}
            <path d="M 134.25 72.5 A 12.5 12.5 0 0 0 134.25 97.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5" />

            {/* Línea de Triple */}
            <path d="M 150 19 L 120.1 19 A 67.5 67.5 0 0 0 120.1 151 L 150 151" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
        </svg>
    );
}

type ShotFilter = 'todos' | 'equipo_a' | 'equipo_b';
type TipoFilter = 'todos' | '2pt' | '3pt';

interface BasketballShotChartProps {
    match: Partido;
    eventos: Evento[];
    sportColor?: string;
}

interface ShotPoint {
    x: number;
    y: number;
    resultado: 'anotado' | 'fallado';
    tipo_tiro: '2pt' | '3pt' | 'tl';
    equipo: 'equipo_a' | 'equipo_b';
    jugador?: string;
}

export function BasketballShotChart({ match, eventos, sportColor = COLOR_A }: BasketballShotChartProps) {
    const [teamFilter, setTeamFilter] = useState<ShotFilter>('todos');
    const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
    const [showMissed, setShowMissed] = useState(true);
    const [showMade, setShowMade] = useState(true);

    const shots = useMemo<ShotPoint[]>(() => {
        return eventos
            .filter(e => ['punto_2', 'punto_3', 'tiro_fallado'].includes(e.tipo_evento))
            .map(e => {
                const coords = parseShotCoords(e.descripcion);
                if (!coords) return null;
                return {
                    x: coords.x,
                    y: coords.y,
                    resultado: coords.resultado,
                    tipo_tiro: coords.tipo_tiro,
                    equipo: e.equipo as 'equipo_a' | 'equipo_b',
                    jugador: e.jugadores?.nombre,
                };
            })
            .filter(Boolean) as ShotPoint[];
    }, [eventos]);

    const filtered = useMemo(() => shots.filter(s => {
        if (teamFilter !== 'todos' && s.equipo !== teamFilter) return false;
        if (tipoFilter !== 'todos' && s.tipo_tiro !== tipoFilter) return false;
        if (!showMade && s.resultado === 'anotado') return false;
        if (!showMissed && s.resultado === 'fallado') return false;
        return true;
    }), [shots, teamFilter, tipoFilter, showMade, showMissed]);

    // Stats
    const statsA = useMemo(() => {
        const all = shots.filter(s => s.equipo === 'equipo_a');
        const pt2 = all.filter(s => s.tipo_tiro === '2pt');
        const pt3 = all.filter(s => s.tipo_tiro === '3pt');
        const tl = all.filter(s => s.tipo_tiro === 'tl');
        return {
            pt2m: pt2.filter(s => s.resultado === 'anotado').length,
            pt2a: pt2.length,
            pt3m: pt3.filter(s => s.resultado === 'anotado').length,
            pt3a: pt3.length,
            tlm: tl.filter(s => s.resultado === 'anotado').length,
            tla: tl.length,
        };
    }, [shots]);

    const statsB = useMemo(() => {
        const all = shots.filter(s => s.equipo === 'equipo_b');
        const pt2 = all.filter(s => s.tipo_tiro === '2pt');
        const pt3 = all.filter(s => s.tipo_tiro === '3pt');
        const tl = all.filter(s => s.tipo_tiro === 'tl');
        return {
            pt2m: pt2.filter(s => s.resultado === 'anotado').length,
            pt2a: pt2.length,
            pt3m: pt3.filter(s => s.resultado === 'anotado').length,
            pt3a: pt3.length,
            tlm: tl.filter(s => s.resultado === 'anotado').length,
            tla: tl.length,
        };
    }, [shots]);

    if (shots.length === 0) return null;

    const nameA = match.carrera_a?.nombre || match.equipo_a || 'Equipo A';
    const nameB = match.carrera_b?.nombre || match.equipo_b || 'Equipo B';

    const pct = (m: number, a: number) => a === 0 ? '-' : `${Math.round((m / a) * 100)}%`;

    return (
        <div className="flex flex-col gap-4 rounded-[1.5rem] sm:rounded-[2rem] bg-white/[0.03] border border-white/10 p-4 sm:p-6 mt-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="text-xl">🏀</div>
                <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Mapa de Tiros</h4>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{shots.length} tiros registrados</p>
                </div>
            </div>

            {/* Shooting % table */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-1 text-[11px] font-black uppercase tracking-wide">
                {/* Header */}
                <div className="text-right truncate" style={{ color: COLOR_A }}>{nameA.split(' ')[0]}</div>
                <div className="text-center text-white/30 text-[10px]">TIRO</div>
                <div className="text-left truncate" style={{ color: COLOR_B }}>{nameB.split(' ')[0]}</div>

                {/* 2PT */}
                <div className="text-right tabular-nums">
                    <span className="text-white">{statsA.pt2m}/{statsA.pt2a}</span>
                    <span className="text-white/30 ml-1 text-[10px]">{pct(statsA.pt2m, statsA.pt2a)}</span>
                </div>
                <div className="text-center text-white/40 text-[10px] font-bold">TC</div>
                <div className="text-left tabular-nums">
                    <span className="text-white">{statsB.pt2m}/{statsB.pt2a}</span>
                    <span className="text-white/30 ml-1 text-[10px]">{pct(statsB.pt2m, statsB.pt2a)}</span>
                </div>

                {/* 3PT */}
                <div className="text-right tabular-nums">
                    <span className="text-white">{statsA.pt3m}/{statsA.pt3a}</span>
                    <span className="text-white/30 ml-1 text-[10px]">{pct(statsA.pt3m, statsA.pt3a)}</span>
                </div>
                <div className="text-center text-white/40 text-[10px] font-bold">3P</div>
                <div className="text-left tabular-nums">
                    <span className="text-white">{statsB.pt3m}/{statsB.pt3a}</span>
                    <span className="text-white/30 ml-1 text-[10px]">{pct(statsB.pt3m, statsB.pt3a)}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {/* Team filter */}
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {([['todos', 'Todos'], ['equipo_a', nameA.split(' ')[0]], ['equipo_b', nameB.split(' ')[0]]] as const).map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setTeamFilter(val as ShotFilter)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all",
                                teamFilter === val ? "bg-white text-black" : "text-white/40 hover:text-white/70"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {/* Tipo filter */}
                <div className="flex rounded-xl border border-white/10 overflow-hidden">
                    {([['todos', 'Todos'], ['2pt', '2PT'], ['3pt', '3PT']] as const).map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setTipoFilter(val as TipoFilter)}
                            className={cn(
                                "px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all",
                                tipoFilter === val ? "bg-white text-black" : "text-white/40 hover:text-white/70"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {/* Made/missed toggles */}
                <button
                    onClick={() => setShowMade(v => !v)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all",
                        showMade ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-white/10 text-white/30")}
                >
                    <div className="w-2.5 h-2.5 rounded-full bg-current" /> Anotado
                </button>
                <button
                    onClick={() => setShowMissed(v => !v)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all",
                        showMissed ? "border-rose-500/40 text-rose-400 bg-rose-500/10" : "border-white/10 text-white/30")}
                >
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-current" /> Fallado
                </button>
            </div>

            {/* Court */}
            <div className="relative w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ aspectRatio: '160/170' }}>
                <CourtSVG />
                {filtered.map((shot, i) => {
                    const color = shot.equipo === 'equipo_a' ? COLOR_A : COLOR_B;
                    const isHit = shot.resultado === 'anotado';
                    return (
                        <div
                            key={i}
                            title={`${shot.jugador ?? (shot.equipo === 'equipo_a' ? nameA : nameB)} — ${shot.tipo_tiro} ${shot.resultado}`}
                            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
                            style={{ left: `${shot.x}%`, top: `${shot.y}%` }}
                        >
                            {isHit ? (
                                <div
                                    className="w-3.5 h-3.5 rounded-full border border-white/50 shadow-md"
                                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                                />
                            ) : (
                                <div
                                    className="w-3.5 h-3.5 rounded-full border-2 bg-transparent"
                                    style={{ borderColor: color }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white/50" /> Anotado
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border-2 border-white/50" /> Fallado
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_A }} /> {nameA.split(' ')[0]}
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLOR_B }} /> {nameB.split(' ')[0]}
                </div>
            </div>
        </div>
    );
}
