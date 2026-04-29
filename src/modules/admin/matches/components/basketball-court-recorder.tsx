"use client";

import { useState, useRef, useCallback } from "react";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Media cancha horizontal — aro a la DERECHA, jugadores atacan de izquierda a derecha.
// ViewBox 560 × 300 (ratio ~28m × 15m FIBA, media cancha = 14m × 15m → 280×300).
// Aro en (520, 150). Zona: x=280..560, y=97..203 (106px alto, 240px ancho aprox).
// Arco 3pt radio ≈ 200px desde el aro (6.75m / 14m * 280 ≈ 135... usamos 200 para el viewBox 560).
//
// Sistema de coordenadas normalizado: x=0..100 (izquierda=media cancha, derecha=fondo)
//                                      y=0..100 (arriba=banda, abajo=banda)
// Aro en x≈93, y=50

const HOOP_SVG_X = 134.25;
const HOOP_SVG_Y = 85;

function detectShotType(pctX: number, pctY: number): '2pt' | '3pt' {
    // Calculamos las coordenadas SVG exactas basadas en el viewBox (160x170)
    const svgX = (pctX / 100) * 160;
    const svgY = (pctY / 100) * 170;
    
    // Distancia al aro (centro matemático: 134.25, 85)
    const dist = Math.sqrt(Math.pow(svgX - HOOP_SVG_X, 2) + Math.pow(svgY - HOOP_SVG_Y, 2));
    
    // Lógica esquinas FIBA
    if (svgX >= 120.1) {
        // La línea de 3 está a las Y=19 (top) y Y=151 (bottom) exactas del SVG
        if (svgY <= 19 || svgY >= 151) return '3pt';
        return '2pt';
    }
    
    // Arco frontal FIBA (Radio exacto = 67.5 unidades, o 6.75m)
    return dist >= 67.5 ? '3pt' : '2pt';
}

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

interface ShotMenuProps {
    x: number; // % del contenedor
    y: number;
    tipo: '2pt' | '3pt';
    onConfirm: (r: 'anotado' | 'fallado') => void;
    onCancel: () => void;
}

function ShotMenu({ x, y, tipo, onConfirm, onCancel }: ShotMenuProps) {
    const left = Math.min(Math.max(x, 18), 78);
    const top = y > 60 ? Math.max(y - 28, 5) : y + 8;
    return (
        <div
            className="absolute flex flex-col items-center gap-2 animate-in zoom-in-95 duration-150 z-20"
            style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, 0)' }}
        >
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-black/90 border border-white/20 text-white/80 shadow-xl backdrop-blur-sm whitespace-nowrap">
                {tipo === '3pt' ? '🔥 Triple' : '🏀 2 puntos'}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onConfirm('anotado')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide bg-emerald-500 text-black shadow-xl active:scale-95 transition-all whitespace-nowrap"
                >
                    <Check size={14} strokeWidth={3} /> Canasta
                </button>
                <button
                    onClick={() => onConfirm('fallado')}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-xl active:scale-95 transition-all whitespace-nowrap"
                >
                    <X size={14} strokeWidth={3} /> Fallo
                </button>
            </div>
            <button onClick={onCancel} className="text-[10px] text-white/30 hover:text-white/60 transition-colors font-bold uppercase tracking-widest">
                cancelar
            </button>
        </div>
    );
}

interface Shot {
    x: number;
    y: number;
    resultado: 'anotado' | 'fallado';
    tipo_tiro: '2pt' | '3pt' | 'tl';
    equipo: 'equipo_a' | 'equipo_b';
}

interface BasketballCourtRecorderProps {
    match: any;
    jugadoresA: any[];
    jugadoresB: any[];
    onAddShot: (
        tipo_evento: string,
        equipo: 'equipo_a' | 'equipo_b',
        jugador_id: number | null,
        coords: { x: number; y: number; resultado: 'anotado' | 'fallado'; tipo_tiro: '2pt' | '3pt' | 'tl' }
    ) => Promise<boolean>;
    existingShots: Shot[];
}

export function BasketballCourtRecorder({
    match, jugadoresA, jugadoresB, onAddShot, existingShots,
}: BasketballCourtRecorderProps) {
    const [selectedTeam, setSelectedTeam] = useState<'equipo_a' | 'equipo_b'>('equipo_a');
    const [selectedJugador, setSelectedJugador] = useState<number | null>(null);
    const [pendingShot, setPendingShot] = useState<{ x: number; y: number; tipo: '2pt' | '3pt' } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastFeedback, setLastFeedback] = useState<string | null>(null);
    const courtRef = useRef<HTMLDivElement>(null);

    const colorA = '#f97316';
    const colorB = '#3b82f6';
    const teamColor = selectedTeam === 'equipo_a' ? colorA : colorB;
    const currentJugadores = selectedTeam === 'equipo_a' ? jugadoresA : jugadoresB;
    const selectedJugadorName = currentJugadores.find((j: any) => j.id === selectedJugador)?.nombre ?? null;

    const nameA = match.carrera_a?.nombre || match.delegacion_a || match.equipo_a || 'Equipo A';
    const nameB = match.carrera_b?.nombre || match.delegacion_b || match.equipo_b || 'Equipo B';

    const handleCourtClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (pendingShot || isSubmitting) return;
        const rect = courtRef.current!.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPendingShot({ x, y, tipo: detectShotType(x, y) });
    }, [pendingShot, isSubmitting]);

    const handleConfirm = useCallback(async (resultado: 'anotado' | 'fallado') => {
        if (!pendingShot || isSubmitting) return;
        setIsSubmitting(true);
        const coords = { x: pendingShot.x, y: pendingShot.y, resultado, tipo_tiro: pendingShot.tipo };
        const tipo_evento = resultado === 'anotado'
            ? (pendingShot.tipo === '3pt' ? 'punto_3' : 'punto_2')
            : 'tiro_fallado';
        const ok = await onAddShot(tipo_evento, selectedTeam, selectedJugador, coords);
        if (ok) {
            const jug = selectedJugadorName ? ` · ${selectedJugadorName.split(' ')[0]}` : '';
            setLastFeedback(resultado === 'anotado'
                ? `+${pendingShot.tipo === '3pt' ? 3 : 2}${jug}`
                : `Fallo${jug}`);
            setTimeout(() => setLastFeedback(null), 1800);
        }
        setPendingShot(null);
        setIsSubmitting(false);
    }, [pendingShot, isSubmitting, selectedTeam, selectedJugador, selectedJugadorName, onAddShot]);

    const handleFreeThrow = useCallback(async (resultado: 'anotado' | 'fallado') => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        // Coordenadas fijas de la línea de Tiro Libre: X = 92, Y = 85 (en svg 160x170)
        const coords = { x: (92 / 160) * 100, y: (85 / 170) * 100, resultado, tipo_tiro: 'tl' as const };
        const tipo_evento = resultado === 'anotado' ? 'punto_1' : 'tiro_fallado';
        const ok = await onAddShot(tipo_evento, selectedTeam, selectedJugador, coords);
        if (ok) {
            const jug = selectedJugadorName ? ` · ${selectedJugadorName.split(' ')[0]}` : '';
            setLastFeedback(resultado === 'anotado' ? `+1 TL${jug}` : `Fallo TL${jug}`);
            setTimeout(() => setLastFeedback(null), 1800);
        }
        setIsSubmitting(false);
    }, [isSubmitting, selectedTeam, selectedJugador, selectedJugadorName, onAddShot]);

    return (
        <div className="flex flex-col gap-4 w-full">

            {/* Team selector */}
            <div className="grid grid-cols-2 gap-2">
                {(['equipo_a', 'equipo_b'] as const).map(tid => {
                    const isSelected = selectedTeam === tid;
                    const color = tid === 'equipo_a' ? colorA : colorB;
                    const name = tid === 'equipo_a' ? nameA : nameB;
                    return (
                        <button key={tid}
                            onClick={() => { setSelectedTeam(tid); setSelectedJugador(null); }}
                            className={cn("flex items-center gap-2 px-3 py-2.5 rounded-2xl border-2 transition-all text-left",
                                isSelected ? "bg-white/10 text-white" : "bg-black/20 border-white/5 text-white/30")}
                            style={isSelected ? { borderColor: color, boxShadow: `0 0 16px ${color}25` } : {}}
                        >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[11px] font-black uppercase tracking-tight truncate">{name}</span>
                        </button>
                    );
                })}
            </div>

            {/* Player selector */}
            <div className="flex flex-col gap-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-1">
                    {selectedJugador ? `Jugador: ${selectedJugadorName}` : 'Jugador (opcional)'}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setSelectedJugador(null)}
                        className={cn("flex-shrink-0 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                            selectedJugador === null ? "bg-white text-black border-white" : "border-white/10 text-white/30 hover:text-white/60")}
                    >
                        Equipo
                    </button>
                    {currentJugadores.map((j: any) => (
                        <button key={j.id}
                            onClick={() => setSelectedJugador(j.id)}
                            className={cn("flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap")}
                            style={selectedJugador === j.id
                                ? { borderColor: teamColor, backgroundColor: teamColor, color: '#000' }
                                : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
                        >
                            {j.numero != null && <span className="font-mono font-black">{j.numero}</span>}
                            <span className="truncate max-w-[80px]">{j.nombre.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Court — horizontal, aro a la derecha */}
            <div
                ref={courtRef}
                onClick={handleCourtClick}
                className="relative w-full rounded-2xl overflow-hidden cursor-crosshair select-none shadow-2xl border border-white/10"
                style={{ aspectRatio: '160/170' }}
            >
                <CourtSVG />

                {/* Shots */}
                {existingShots.map((shot, i) => {
                    const color = shot.equipo === 'equipo_a' ? colorA : colorB;
                    return (
                        <div key={i}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${shot.x}%`, top: `${shot.y}%` }}
                        >
                            {shot.resultado === 'anotado'
                                ? <div className="w-4 h-4 rounded-full border-2 border-white/40 shadow-lg" style={{ backgroundColor: color }} />
                                : <div className="w-4 h-4 rounded-full border-2 bg-transparent shadow-md" style={{ borderColor: color }} />
                            }
                        </div>
                    );
                })}

                {/* Pending crosshair */}
                {pendingShot && (
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                        style={{ left: `${pendingShot.x}%`, top: `${pendingShot.y}%` }}>
                        <div className="w-5 h-5 rounded-full border-4 border-white animate-ping opacity-80" />
                    </div>
                )}

                {/* Menu */}
                {pendingShot && (
                    <ShotMenu x={pendingShot.x} y={pendingShot.y} tipo={pendingShot.tipo}
                        onConfirm={handleConfirm} onCancel={() => setPendingShot(null)} />
                )}

                {/* Feedback */}
                {lastFeedback && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 bg-emerald-500 text-black rounded-full text-[11px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-30 whitespace-nowrap">
                        {lastFeedback}
                    </div>
                )}

                {isSubmitting && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 rounded-2xl">
                        <div className="w-7 h-7 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    </div>
                )}
            </div>

            {/* Acciones de Tiro Libre */}
            <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                    onClick={() => handleFreeThrow('anotado')}
                    disabled={isSubmitting}
                    className={cn("flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all border",
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95",
                        isSubmitting && "opacity-50 pointer-events-none"
                    )}
                >
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    TL Canasta
                </button>
                <button
                    onClick={() => handleFreeThrow('fallado')}
                    disabled={isSubmitting}
                    className={cn("flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all border",
                        "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80 active:scale-95",
                        isSubmitting && "opacity-50 pointer-events-none"
                    )}
                >
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-current" />
                    TL Fallo
                </button>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-white/60" />Anotado</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-white/60" />Fallado</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorA }} />{nameA.split(' ')[0]}</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorB }} />{nameB.split(' ')[0]}</div>
            </div>
        </div>
    );
}
