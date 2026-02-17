"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Zap } from "lucide-react";
import { Badge, Button } from "@/components/ui-primitives";
import Link from "next/link";
import { SPORT_EMOJI } from "@/lib/constants";

// Helper para obtener iniciales
const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

export function HeroSlider({ matches }: { matches: any[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Filtrar partidos destacados: En vivo primero, luego programados cercanos
    const featuredMatches = matches
        .filter(m => m.estado === 'en_vivo' || m.estado === 'programado')
        .sort((a, b) => {
            if (a.estado === 'en_vivo' && b.estado !== 'en_vivo') return -1;
            if (b.estado === 'en_vivo' && a.estado !== 'en_vivo') return 1;
            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        })
        .slice(0, 5); // Top 5

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
        <div className="relative w-full h-[350px] md:h-[400px] rounded-3xl overflow-hidden mb-8 group bg-[#0a0f1c] border border-white/5 shadow-2xl">
            <div className="absolute inset-0 opacity-40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-black/60" />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <Badge className="mb-4 bg-white/10 text-indigo-300 border-indigo-500/30 px-4 py-1.5 mx-auto">
                        <Zap size={12} className="mr-2 text-yellow-500" /> Próximamente
                    </Badge>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-500/50 mb-4 drop-shadow-lg">
                        OLIMPIADAS 2026
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto text-lg mb-8 leading-relaxed">
                        Prepárate para vivir la emoción del deporte universitario. Revisa el calendario y haz tus predicciones.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/calendario">
                            <Button className="rounded-full px-8 bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_30px_rgba(79,70,229,0.4)] border border-indigo-400/20 font-bold">
                                Ver Calendario
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px]" />
        </div>
    );

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % featuredMatches.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + featuredMatches.length) % featuredMatches.length);

    const currentMatch = featuredMatches[currentIndex];

    if (!currentMatch) return null;

    return (
        <div className="relative w-full h-[400px] md:h-[450px] rounded-3xl overflow-hidden mb-8 group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentMatch.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 bg-[#0a0f1c]"
                >
                    {/* Background Abstracto / Deportes */}
                    <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${currentMatch.estado === 'en_vivo' ? 'from-rose-900/40 via-black to-black' : 'from-indigo-900/40 via-black to-black'}`} />

                    {/* Content Container */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">

                        {/* Status Badge */}
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-6"
                        >
                            {currentMatch.estado === 'en_vivo' ? (
                                <Badge className="bg-rose-600 text-white border-rose-500 animate-pulse px-4 py-1.5 text-xs tracking-widest uppercase">
                                    <Zap size={12} className="mr-2 fill-current" /> En Vivo Ahora
                                </Badge>
                            ) : (
                                <Badge className="bg-indigo-600/20 text-indigo-300 border-indigo-500/30 px-4 py-1.5 text-xs tracking-widest uppercase">
                                    <Calendar size={12} className="mr-2" /> Programado
                                </Badge>
                            )}
                        </motion.div>

                        {/* Teams & Score */}
                        <div className="flex items-center justify-center gap-4 md:gap-12 w-full max-w-4xl">
                            {/* Team A */}
                            <motion.div
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col items-center gap-4 flex-1 text-right"
                            >
                                <div className="w-20 h-20 md:w-32 md:h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-sm transform -rotate-3">
                                    <span className="text-3xl md:text-5xl font-black">{getInitials(currentMatch.equipo_a)}</span>
                                </div>
                                <h3 className="text-xl md:text-3xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                                    {currentMatch.delegacion_a || currentMatch.equipo_a}
                                </h3>
                            </motion.div>

                            {/* VS / Score */}
                            <div className="flex flex-col items-center gap-2 z-20 mx-4">
                                {currentMatch.estado === 'en_vivo' ? (
                                    <div className="text-5xl md:text-7xl font-black font-mono tracking-tighter flex items-center gap-4">
                                        <span className="text-white">{currentMatch.marcador_detalle?.goles_a || currentMatch.marcador_detalle?.total_a || 0}</span>
                                        <span className="text-white/20">-</span>
                                        <span className="text-white">{currentMatch.marcador_detalle?.goles_b || currentMatch.marcador_detalle?.total_b || 0}</span>
                                    </div>
                                ) : (
                                    <div className="text-4xl md:text-6xl font-black text-white/10 italic">VS</div>
                                )}
                                <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
                                    <span>{SPORT_EMOJI[currentMatch.disciplinas?.name] || '🏅'}</span>
                                    <span>{currentMatch.disciplinas?.name}</span>
                                </div>
                            </div>

                            {/* Team B */}
                            <motion.div
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col items-center gap-4 flex-1 text-left"
                            >
                                <div className="w-20 h-20 md:w-32 md:h-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-sm transform rotate-3">
                                    <span className="text-3xl md:text-5xl font-black">{getInitials(currentMatch.equipo_b)}</span>
                                </div>
                                <h3 className="text-xl md:text-3xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                                    {currentMatch.delegacion_b || currentMatch.equipo_b}
                                </h3>
                            </motion.div>
                        </div>

                        {/* Meta Info & CTA */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 flex flex-col items-center gap-4"
                        >
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <MapPin size={14} />
                                {currentMatch.lugar}
                                <span className="mx-2 text-slate-600">•</span>
                                <ClockDisplay date={currentMatch.fecha} />
                            </div>

                            <Link href={`/partido/${currentMatch.id}`}>
                                <Button className="rounded-full px-8 bg-white/10 hover:bg-white/20 border border-white/5 backdrop-blur-md">
                                    Ver Detalles
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Controls */}
            {featuredMatches.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/50 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 hover:bg-black/50 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20">
                        <ChevronRight size={20} />
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
            )}
        </div>
    );
}

function ClockDisplay({ date }: { date: string }) {
    if (!date) return null;
    return (
        <span className="flex items-center gap-1">
            <Calendar size={14} />
            {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    );
}
