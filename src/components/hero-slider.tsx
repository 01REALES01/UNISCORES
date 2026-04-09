"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Zap, Users, Clock } from "lucide-react";
import { Badge, Button } from "@/components/ui-primitives";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SPORT_EMOJI, SPORT_GRADIENT, SPORT_ACCENT, SPORT_GLOW, SPORT_LIVE_TEXT, SPORT_LIVE_BG_WRAPPER, SPORT_LIVE_BAR } from "@/lib/constants";
import { getCurrentScore } from "@/lib/sport-scoring";
import { getDisplayName, getCarreraSubtitle, isRaceMatch, getSwimmingEventTitle } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/components/sport-icons";
import { PublicLiveTimer } from "@/components/public-live-timer";

// Helper para obtener iniciales
const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

// Helper para obtener el icono prioritario
const getMatchIcon = (match: any, side: 'a' | 'b') => {
    const athlete = side === 'a' ? match.atleta_a : match.atleta_b;
    const carrera = side === 'a' ? match.carrera_a : match.carrera_b;
    const delegation = side === 'a' ? match.delegacion_a_info : match.delegacion_b_info;
    
    return athlete?.avatar_url || carrera?.escudo_url || delegation?.escudo_url;
};

export function HeroSlider({ matches, activeFilter = 'todos' }: { matches: any[], activeFilter?: string }) {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index when filter changes
    useEffect(() => {
        setCurrentIndex(0);
    }, [activeFilter]);

    // Filtrar partidos destacados: En vivo primero, luego programados cercanos
    const filteredBySport = (activeFilter === 'todos' || activeFilter === 'favoritos')
        ? matches
        : matches.filter(m => m.disciplinas?.name === activeFilter);

    const featuredMatches = filteredBySport
        .filter(m => m.estado === 'en_vivo' || m.estado === 'programado')
        .sort((a, b) => {
            if (a.estado === 'en_vivo' && b.estado !== 'en_vivo') return -1;
            if (b.estado === 'en_vivo' && a.estado !== 'en_vivo') return 1;

            // Programmed matches: Show the ones closest to NOW first (Ascending)
            const now = new Date().getTime();
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();

            // If both are in the future, show the closest one first
            return dateA - dateB;
        })
        .slice(0, 5); // Top 5

    console.log("HeroSlider debug:", {
        activeFilter,
        matchesLength: matches.length,
        filteredBySportLength: filteredBySport.length,
        featuredMatchesLength: featuredMatches.length,
        featuredMatchesStates: featuredMatches.map(m => m.estado)
    });

    // Auto-advance
    useEffect(() => {
        if (featuredMatches.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredMatches.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [featuredMatches.length]);

    // Si no hay partidos, mostrar banner genérico
    if (featuredMatches.length === 0) return (
        <div className="relative w-full h-[350px] md:h-[400px] rounded-[2rem] overflow-hidden mb-8 group bg-[#110e0a] border border-white/10 shadow-2xl">
            <div className="absolute inset-0 opacity-40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-red-900/40 via-orange-900/20 to-black/60" />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Badge className="mb-4 bg-white/10 text-orange-300 border-orange-500/30 px-4 py-1.5 mx-auto">
                        <Zap size={12} className="mr-2 text-[#FFC000]" /> Próximamente
                    </Badge>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-orange-100 to-amber-500/50 mb-4 drop-shadow-lg">
                        OLIMPIADAS 2026
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto text-lg mb-8 leading-relaxed">
                        Prepárate para vivir la emoción del deporte universitario. Revisa el calendario y participa en Acierta y Gana.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/calendario">
                            <Button className="rounded-full px-8 bg-orange-600 hover:bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.4)] border border-orange-400/20 font-bold">
                                Ver Calendario
                            </Button>
                        </Link>
                    </div>
                </m.div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-600/20 rounded-full blur-[100px]" />
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px]" />
        </div>
    );

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % featuredMatches.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + featuredMatches.length) % featuredMatches.length);

    // FIX: Ensure index is always valid even if matches list shrinks
    const safeIndex = currentIndex % featuredMatches.length;
    const currentMatch = featuredMatches[safeIndex];

    if (!currentMatch) return null;

    // Calculate score using shared logic
    const scoreInfo = getCurrentScore(currentMatch.disciplinas?.name, currentMatch.marcador_detalle || {});

    return (
        <div className="relative w-full h-[320px] md:h-[380px] rounded-[2rem] overflow-hidden mb-8 group border border-white/10 shadow-2xl">
            <AnimatePresence mode="wait">
                <m.div
                    key={currentMatch.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 bg-[#17130D]"
                >
                    {/* Background Abstracto / Deportes */}
                    <div className="absolute inset-0 opacity-40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-10" />
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 transition-colors duration-1000", SPORT_GRADIENT[currentMatch.disciplinas?.name] || (currentMatch.estado === 'en_vivo' ? 'from-rose-900/40 via-black to-black' : 'from-orange-900/40 via-black to-black'))} />

                    {/* Glowing Sport Watermark */}
                    <div className="absolute -bottom-20 -right-10 pointer-events-none select-none z-0 scale-150 opacity-10 blur-[2px] md:opacity-20 md:blur-0">
                        <SportIcon sport={currentMatch.disciplinas?.name} size={400} className={cn("drop-shadow-[0_0_50px_currentColor]", SPORT_ACCENT[currentMatch.disciplinas?.name] || 'text-white')} />
                    </div>

                    {/* Top-Left Absolute Timer */}
                    {currentMatch.estado === 'en_vivo' && currentMatch.marcador_detalle?.timer && (
                        <m.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="absolute top-5 left-5 md:top-7 md:left-7 z-30 bg-black/40 backdrop-blur-md border border-white/10 shadow-xl rounded-full px-3 py-1.5 md:px-4 md:py-2 flex items-center justify-center"
                        >
                            <PublicLiveTimer detalle={currentMatch.marcador_detalle} deporte={currentMatch.disciplinas?.name} />
                        </m.div>
                    )}

                    {/* Content Container */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">

                        {/* Status Badge */}
                        <m.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-2 md:mb-4"
                        >
                            {currentMatch.estado === 'en_vivo' ? (
                                <div className="flex items-center justify-center gap-2.5 text-rose-500 text-[10px] md:text-xs font-black tracking-[0.3em] uppercase transition-all duration-500">
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)]" />
                                    </div>
                                    <span className="drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]">En Vivo Ahora</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2.5 text-orange-500/60 text-[10px] md:text-xs font-black tracking-[0.3em] uppercase transition-all duration-500">
                                    <Calendar size={12} />
                                    <span>Programado</span>
                                </div>
                            )}
                        </m.div>

                        {/* Sport Badge - Centered independently */}
                        <div className="flex justify-center mb-4">
                            <div className="flex items-center gap-2.5 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
                                <SportIcon sport={currentMatch.disciplinas?.name} size={14} className="opacity-70" />
                                <span>{currentMatch.disciplinas?.name}</span>
                            </div>
                        </div>

                        {/* Teams & Score — Conditional for Swimming/Race */}
                        <div className="flex items-center justify-center gap-3 md:gap-12 w-full max-w-4xl px-2">
                            {(() => {
                                const sName = currentMatch.disciplinas?.name || '';
                                const isRace = isRaceMatch(currentMatch);
                                const gender = (currentMatch.genero || 'masculino').toLowerCase();

                                if (isRace) {
                                    // ── Swimming / Race Layout ──────────────────────
                                    return (
                                        <m.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="flex flex-col items-center gap-3 w-full"
                                        >
                                            {/* Event Title */}
                                            <div className="flex flex-col items-center gap-2">
                                                <h3 className="text-[2.5rem] md:text-[4.5rem] font-black tracking-tighter leading-none text-white drop-shadow-2xl">
                                                    {getSwimmingEventTitle(currentMatch)}
                                                </h3>
                                                {currentMatch.marcador_detalle?.serie && (
                                                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 px-4 py-1 font-black uppercase tracking-widest text-[10px] md:text-sm">
                                                        Serie {currentMatch.marcador_detalle.serie}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Status info */}
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-4 text-slate-300">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                                                        <Users size={16} className="text-cyan-400" />
                                                        <span className="text-xs md:text-sm font-bold uppercase tracking-wider">
                                                            {(currentMatch.marcador_detalle?.participantes || []).length} Nadadores
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Category/Gender */}
                                                    <div className={cn(
                                                        "px-3 py-1.5 rounded-full border backdrop-blur-sm flex items-center gap-2",
                                                        gender === 'femenino' ? "bg-pink-500/10 border-pink-500/30 text-pink-400" :
                                                        gender === 'mixto' ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                                                        "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                                    )}>
                                                        <span className="text-xs md:text-sm font-bold uppercase tracking-wider">
                                                            {gender}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Live indicator specific for swimming */}
                                                {currentMatch.estado === 'en_vivo' && (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="flex items-center gap-2 text-cyan-400 text-sm md:text-md font-black tracking-[0.3em] uppercase animate-pulse">
                                                            <div className="relative flex h-3 w-3">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]" />
                                                            </div>
                                                            <span>Prueba en Curso</span>
                                                        </div>
                                                        <div className="w-48 h-1.5 bg-cyan-900/40 rounded-full overflow-hidden border border-cyan-500/20">
                                                            <div className="h-full bg-cyan-500 w-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </m.div>
                                    );
                                }

                                // ── Bilateral VS Layout (Original) ──────────────
                                const liveText = SPORT_LIVE_TEXT[sName] || SPORT_LIVE_TEXT.default;
                                const liveBg = SPORT_LIVE_BG_WRAPPER[sName] || SPORT_LIVE_BG_WRAPPER.default;
                                const liveBar = SPORT_LIVE_BAR[sName] || SPORT_LIVE_BAR.default;

                                return (
                                    <>
                                        {/* Team A */}
                                        <m.div
                                            initial={{ x: -50, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="flex flex-col items-center gap-2 md:gap-3 flex-1 text-center"
                                        >
                                            <div className="w-14 h-14 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md shrink-0 overflow-hidden p-3 group-hover:border-white/20 transition-colors">
                                                {getMatchIcon(currentMatch, 'a') ? (
                                                    <img 
                                                        src={getMatchIcon(currentMatch, 'a')} 
                                                        alt={getDisplayName(currentMatch, 'a')} 
                                                        className="w-full h-full object-contain drop-shadow-lg" 
                                                    />
                                                ) : (
                                                    <span className="text-xl md:text-5xl font-black text-white/10">{getInitials(getDisplayName(currentMatch, 'a'))}</span>
                                                )}
                                            </div>
                                            <h3 className="text-[11px] md:text-xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 line-clamp-2 md:line-clamp-none px-1">
                                                {getDisplayName(currentMatch, 'a')}
                                            </h3>
                                            {getCarreraSubtitle(currentMatch, 'a') && (
                                                <span className="hidden md:block text-[10px] md:text-xs text-slate-500 font-medium">{getCarreraSubtitle(currentMatch, 'a')}</span>
                                            )}
                                        </m.div>

                                        {/* VS / Score */}
                                        <div className="flex flex-col items-center gap-1 z-20 mx-1 md:mx-4 relative min-w-[70px] md:min-w-[180px]">
                                            {sName === 'Ajedrez' ? (
                                                currentMatch.estado === 'en_vivo' ? (
                                                    <div className="flex flex-col items-center justify-center w-full min-h-[80px] md:min-h-[100px]">
                                                        <div className="flex items-center gap-3">
                                                            <span className="relative flex h-3 w-3 md:h-4 md:w-4">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3 w-3 md:h-4 md:w-4 bg-rose-500"></span>
                                                            </span>
                                                            <span className="text-lg md:text-2xl font-black text-rose-500 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                                                                EN VIVO
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-3xl md:text-6xl font-black text-white/10 italic">VS</div>
                                                )
                                            ) : currentMatch.estado === 'en_vivo' ? (
                                                <div className="flex flex-col items-center w-full">
                                                    <div className="text-[2rem] md:text-[5rem] leading-none font-black font-mono tracking-tighter flex items-center justify-center gap-1.5 md:gap-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                                        <span className="text-white text-right w-8 md:w-20">{scoreInfo.scoreA}</span>
                                                        <div className="w-1.5 md:w-5 h-1 md:h-2 bg-white/20 rounded-full shrink-0" />
                                                        <span className="text-white text-left w-8 md:w-20">{scoreInfo.scoreB}</span>
                                                    </div>

                                                    {/* Dynamic Info Row */}
                                                    <div className="flex flex-col items-center mt-2 md:mt-3 w-full">
                                                        <div className={cn("flex flex-col items-center gap-1.5 mb-2 md:mb-3")}>
                                                            <div className={cn("flex items-center gap-2 text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] brightness-125", liveText)}>
                                                                <span>{scoreInfo.extra || 'EN CURSO'}</span>
                                                            </div>

                                                            {/* Neon Gender Label */}
                                                            <div className={cn(
                                                                "text-[9px] md:text-[10px] font-medium tracking-[0.25em] uppercase transition-all duration-1000",
                                                                currentMatch.genero === 'femenino' ? "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" :
                                                                    currentMatch.genero === 'mixto' ? "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" :
                                                                        "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                                                            )}>
                                                                {currentMatch.genero || 'masculino'}
                                                            </div>
                                                        </div>

                                                        {/* Glowing Progress Status Bar */}
                                                        <div className={cn("w-[80%] md:w-full h-1 md:h-1.5 rounded-full overflow-hidden relative", liveBg)}>
                                                            <div className={cn("h-full rounded-full w-[100%] absolute top-0 left-0 animate-pulse", liveBar)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-3xl md:text-6xl font-black text-white/10 italic">VS</div>
                                            )}
                                        </div>

                                        {/* Team B */}
                                        <m.div
                                            initial={{ x: 50, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="flex flex-col items-center gap-2 md:gap-3 flex-1 text-center"
                                        >
                                            <div className="w-14 h-14 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md shrink-0 overflow-hidden p-3 group-hover:border-white/20 transition-colors">
                                                {getMatchIcon(currentMatch, 'b') ? (
                                                    <img 
                                                        src={getMatchIcon(currentMatch, 'b')} 
                                                        alt={getDisplayName(currentMatch, 'b')} 
                                                        className="w-full h-full object-contain drop-shadow-lg" 
                                                    />
                                                ) : (
                                                    <span className="text-xl md:text-5xl font-black text-white/10">{getInitials(getDisplayName(currentMatch, 'b'))}</span>
                                                )}
                                            </div>
                                            <h3 className="text-[11px] md:text-xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 line-clamp-2 md:line-clamp-none px-1">
                                                {getDisplayName(currentMatch, 'b')}
                                            </h3>
                                            {getCarreraSubtitle(currentMatch, 'b') && (
                                                <span className="hidden md:block text-[10px] md:text-xs text-slate-500 font-medium">{getCarreraSubtitle(currentMatch, 'b')}</span>
                                            )}
                                        </m.div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Meta Info & CTA */}
                        <m.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-1 sm:mt-2 flex flex-col items-center gap-4"
                        >
                            <div className="flex items-center gap-6 text-[10px] md:text-sm font-bold tracking-[0.1em] uppercase">
                                <div className="flex items-center gap-2 text-white/60">
                                    <MapPin size={14} className="text-orange-500/80" />
                                    <span>{currentMatch.lugar}</span>
                                </div>
                                <div className="w-[1px] h-3 bg-white/10" />
                                <div className="flex items-center gap-2 text-white/60">
                                    <Clock size={14} className="text-orange-500/80" />
                                    <ClockDisplay date={currentMatch.fecha} />
                                </div>
                            </div>

                            <Link href={`/partido/${currentMatch.id}`} className="relative z-30">
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        // Fallback programmatic navigation
                                        router.push(`/partido/${currentMatch.id}`);
                                    }}
                                    className={cn(
                                        "rounded-full px-10 h-10 md:h-12 text-[10px] md:text-xs font-black uppercase tracking-[0.25em] bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all duration-300 shadow-none hover:shadow-none whitespace-nowrap",
                                        SPORT_ACCENT[currentMatch.disciplinas?.name] || 'text-white/80',
                                        "hover:drop-shadow-[0_0_15px_currentColor] border-white/10 hover:border-white/20"
                                    )}
                                >
                                    Ver Detalles
                                </Button>
                            </Link>
                        </m.div>
                    </div>
                </m.div>
            </AnimatePresence>

            {/* Controls */}
            {
                featuredMatches.length > 1 && (
                    <>
                        <button onClick={prevSlide} className="absolute left-1.5 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full bg-black/40 md:bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-black/60 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20">
                            <ChevronLeft size={20} className="md:size-[24px] mr-0.5" />
                        </button>
                        <button onClick={nextSlide} className="absolute right-1.5 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 rounded-full bg-black/40 md:bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-black/60 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20">
                            <ChevronRight size={20} className="md:size-[24px] ml-0.5" />
                        </button>

                        {/* Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                            {featuredMatches.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/20 hover:bg-white/40'}`}
                                />
                            ))}
                        </div>
                    </>
                )
            }
        </div >
    );
}

function ClockDisplay({ date }: { date: string }) {
    if (!date) return null;
    const d = new Date(date);
    const dateFormatted = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-tight">
            <span className="text-white/80">{dateFormatted}</span>
            <span className="text-white/40 leading-none pb-0.5">•</span>
            <span className="text-white/80">{timeFormatted}</span>
        </span>
    );
}
