"use client";

import { useState, useMemo, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Badge, Button } from "@/components/ui-primitives";
import { MapPin, Users, Activity, Trophy, Move, Crosshair, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { LUGARES_OLIMPICOS, SPORT_EMOJI } from "@/lib/constants";

// Coordenadas ajustadas al mapa generado (Dark Blueprint):
const VENUE_COORDINATES: Record<string, { x: number; y: number; label: string }> = {
    'Coliseo Uninorte': { x: 44, y: 48, label: 'Coliseo' },
    'Cancha de Fútbol': { x: 61, y: 57, label: 'Estadio' },
    'Piscina Centro Deportivo': { x: 82, y: 80, label: 'Piscinas' },
};

type Match = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    carrera_a?: { nombre: string } | null;
    carrera_b?: { nombre: string } | null;
    delegacion_a?: string;
    delegacion_b?: string;
    disciplinas: { name: string; icon?: string; emoji?: string };
    estado: 'programado' | 'en_vivo' | 'finalizado';
    lugar: string;
    marcador_detalle?: any;
    fecha?: string;
};

interface CampusMapInteractiveProps {
    matches: Match[];
}

export function CampusMapInteractive({ matches }: CampusMapInteractiveProps) {
    const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
    const [calibrationMode, setCalibrationMode] = useState(false);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);

    // Agrupar partidos por lugar
    const venueMatches = useMemo(() => {
        const groups: Record<string, Match[]> = {};
        LUGARES_OLIMPICOS.forEach(l => groups[l] = []);

        matches.forEach(m => {
            let venueKey: string | undefined = undefined;

            // Búsqueda flexible por palabras clave para mayor robustez
            if (m.lugar?.includes('Coliseo')) venueKey = 'Coliseo Uninorte';
            else if (m.lugar?.toLowerCase().includes('futbol') || m.lugar?.toLowerCase().includes('fútbol') || m.lugar?.includes('Cancha #1') || m.lugar?.includes('Cancha #2')) venueKey = 'Cancha de Fútbol';
            else if (m.lugar?.includes('Piscina')) venueKey = 'Piscina Centro Deportivo';
            else {
                // Fallback: búsqueda exacta en la lista oficial
                venueKey = LUGARES_OLIMPICOS.find(v => m.lugar?.includes(v));
            }

            if (venueKey && groups[venueKey]) {
                groups[venueKey].push(m);
            }
        });
        return groups;
    }, [matches]);

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!calibrationMode) {
            setSelectedVenue(null); // Click outside pin closes card
            return;
        }

        // Logic for Calibration Mode
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        console.log(`📍 Coordenada Clickeada: { x: ${Math.round(x)}, y: ${Math.round(y)} }`);
        alert(`📍 Coordenada: { x: ${Math.round(x)}, y: ${Math.round(y)} }\n(Copiada a consola)`);
    };

    return (
        <div className="relative w-full h-full bg-white rounded-3xl overflow-hidden border border-black/10 shadow-2xl group/map">

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                <Button
                    size="icon"
                    variant="outline"
                    className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-white/10 rounded-full w-10 h-10"
                    onClick={() => transformComponentRef.current?.zoomIn()}
                >
                    <ZoomIn size={18} />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-white/10 rounded-full w-10 h-10"
                    onClick={() => transformComponentRef.current?.zoomOut()}
                >
                    <ZoomOut size={18} />
                </Button>
                <Button
                    size="icon"
                    variant="outline"
                    className="bg-black/50 backdrop-blur-md border-white/10 hover:bg-white/10 rounded-full w-10 h-10"
                    onClick={() => transformComponentRef.current?.resetTransform()}
                >
                    <Maximize size={18} />
                </Button>

                {/* Calibration Toggle */}
                <Button
                    size="icon"
                    variant="outline"
                    className={`rounded-full w-10 h-10 transition-colors ${calibrationMode ? 'bg-[#FFC000] text-black border-[#FFC000]' : 'bg-black/50 border-white/10 text-zinc-500'}`}
                    onClick={() => setCalibrationMode(!calibrationMode)}
                    title="Modo Calibración (Click para obtener coordenadas)"
                >
                    <Crosshair size={18} />
                </Button>
            </div>

            {/* Floating Recenter Button */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                <Button
                    variant="secondary"
                    className="bg-white/90 hover:bg-white text-black font-bold uppercase tracking-wider text-xs px-6 py-2 rounded-full shadow-xl hover:scale-105 transition-transform"
                    onClick={() => transformComponentRef.current?.resetTransform()}
                >
                    <Crosshair className="w-4 h-4 mr-2" />
                    Centrar Mapa
                </Button>
            </div>

            <TransformWrapper
                ref={transformComponentRef}
                initialScale={0.8}
                centerOnInit={true}
                minScale={0.2}
                maxScale={4}
                limitToBounds={false}
                wheel={{ step: 0.1 }}
            >
                <TransformComponent wrapperClass="w-full h-full bg-white" contentClass="w-full h-full flex items-center justify-center">
                    {/* Infinite Map Container */}
                    <div
                        className="relative w-[1600px] h-[1000px] cursor-move bg-white"
                        onClick={handleMapClick}
                    >
                        {/* MAP IMAGE & VIGNETTE WRAPPER */}
                        <div className="absolute inset-0 pointer-events-none bg-white">
                            <Image
                                src="/campus_real.jpg"
                                alt="Mapa Campus Uninorte"
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>

                        {/* Calibration Grid (Optional visibility) */}
                        {calibrationMode && (
                            <div className="absolute inset-0 pointer-events-none opacity-20"
                                style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '10% 10%' }}
                            />
                        )}

                        {/* 2. INTERACTIVE PINS */}
                        {Object.keys(VENUE_COORDINATES).map((venueName) => {
                            const coords = VENUE_COORDINATES[venueName];
                            const activeMatches = venueMatches[venueName] || [];
                            const liveMatch = activeMatches.find(m => m.estado === 'en_vivo');
                            const nextMatch = activeMatches.find(m => m.estado === 'programado');

                            const statusColor = liveMatch ? 'bg-[#DB1406]' : (nextMatch ? 'bg-[#FFC000]' : 'bg-[#0a0805]/80');
                            const hasActivity = activeMatches.length > 0;

                            return (
                                <div
                                    key={venueName}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Don't trigger map click
                                        if (!calibrationMode) setSelectedVenue(venueName === selectedVenue ? null : venueName);
                                    }}
                                >
                                    {/* Pulse Effect for Live Matches */}
                                    {liveMatch && (
                                        <div className="absolute inset-0 rounded-full bg-[#DB1406] animate-ping opacity-75 duration-1000" />
                                    )}

                                    {/* PIN ICON */}
                                    <div className={`relative flex flex-col items-center group/pin transition-transform duration-300 ${selectedVenue === venueName ? 'scale-125' : 'hover:scale-110'}`}>

                                        {/* Marker Icon */}
                                        <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center backdrop-blur-sm transition-colors ${statusColor} ${selectedVenue === venueName ? 'ring-4 ring-white/20' : ''}`}>
                                            {liveMatch ? <Activity size={14} className="text-white animate-pulse" /> : <MapPin size={14} className="text-white" />}
                                        </div>

                                        {/* Label (Always visible on selected, or hover) */}
                                        <div className={`mt-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${selectedVenue === venueName || hasActivity ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 group-hover/pin:opacity-100 group-hover/pin:translate-y-0'}`}>
                                            {coords.label}
                                            {calibrationMode && <span className="text-[#FFC000] ml-1 text-[8px]">({Math.round(coords.x)}, {Math.round(coords.y)})</span>}
                                        </div>
                                    </div>

                                    {/* POPUP CARD (When Selected) - Scale inverse so it stays readable? No, simpler to just render */}
                                    <AnimatePresence>
                                        {selectedVenue === venueName && !calibrationMode && (
                                            <m.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 md:w-72 bg-[#0a0805]/95 backdrop-blur-xl border border-[#FFC000]/10 rounded-2xl shadow-2xl overflow-hidden z-50 cursor-default"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Header */}
                                                <div className="p-3 border-b border-white/5 bg-[#17130D]/50 flex justify-between items-center">
                                                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                                        <MapPin size={14} className="text-[#FFC000]" /> {venueName}
                                                    </h4>
                                                    <button onClick={() => setSelectedVenue(null)} className="text-zinc-500 hover:text-white">
                                                        <span className="sr-only">Cerrar</span>
                                                        &times;
                                                    </button>
                                                </div>

                                                {/* Content */}
                                                <div className="p-0 max-h-60 overflow-y-auto custom-scrollbar">
                                                    {activeMatches.length > 0 ? (
                                                        <div className="divide-y divide-white/5">
                                                            {activeMatches.map((m) => (
                                                                <Link key={m.id} href={`/partido/${m.id}`} className="block p-3 hover:bg-white/5 transition-colors">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <Badge variant="secondary" className={`text-[10px] h-5 ${m.estado === 'en_vivo' ? 'bg-[#DB1406]/20 text-[#DB1406] animate-pulse border-[#DB1406]/20' : 'bg-[#FFC000]/10 text-[#FFC000] border-[#FFC000]/20'}`}>
                                                                            {m.estado === 'en_vivo' ? 'EN JUEGO' : 'PROGRAMADO'}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-white/50 font-mono flex items-center gap-1">
                                                                            {m.fecha ? new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex justify-between items-center">
                                                                        <div className="text-center flex-1">
                                                                            <p className="text-xs font-bold text-white truncate max-w-[80px] mx-auto" title={m.carrera_a?.nombre || m.equipo_a}>{m.delegacion_a || m.carrera_a?.nombre || m.equipo_a}</p>
                                                                        </div>
                                                                        <div className="px-2 font-black text-lg text-[#FFC000] font-mono tabular-nums">
                                                                            {m.estado === 'en_vivo'
                                                                                ? `${(m.marcador_detalle?.goles_a || m.marcador_detalle?.total_a || m.marcador_detalle?.sets_a || 0)} - ${(m.marcador_detalle?.goles_b || m.marcador_detalle?.total_b || m.marcador_detalle?.sets_b || 0)}`
                                                                                : 'VS'
                                                                            }
                                                                        </div>
                                                                        <div className="text-center flex-1">
                                                                            <p className="text-xs font-bold text-white truncate max-w-[80px] mx-auto" title={m.carrera_b?.nombre || m.equipo_b}>{m.delegacion_b || m.carrera_b?.nombre || m.equipo_b}</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-2 flex items-center justify-center gap-1 opacity-50 text-[10px] uppercase tracking-widest">
                                                                        <span>{m.disciplinas.emoji || SPORT_EMOJI[m.disciplinas.name] || '🏅'} {m.disciplinas.name}</span>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 text-center text-zinc-500 space-y-2">
                                                            <Trophy size={24} className="mx-auto opacity-20" />
                                                            <p className="text-xs">No hay actividad programada hoy aquí.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </m.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
}
