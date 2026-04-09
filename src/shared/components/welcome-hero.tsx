"use client";

import { m } from "framer-motion";
import { Zap, Calendar, Trophy, TrendingUp } from "lucide-react";
import { Badge, Button } from "@/components/ui-primitives";
import Link from "next/link";

export function WelcomeHero() {
    return (
        <section className="relative w-full py-16 md:py-28 px-6 overflow-hidden bg-black/40 backdrop-blur-2xl rounded-[2.5rem] mb-12 border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            {/* Background elements - HYBRID INSTITUTIONAL */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[200px] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Bloom Glow behind the flame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <m.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.15, 0.25, 0.15]
                    }}
                    transition={{ 
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[140px] translate-x-1/2 translate-y-1/4" 
                />
            </div>

            {/* Dynamic Flame background */}
            <div className="absolute inset-0 flex items-center justify-end pointer-events-none overflow-hidden">
                <m.div
                    animate={{ 
                        y: [0, -15, 0],
                        rotate: [0, 2, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="relative translate-x-[25%] md:translate-x-[30%] translate-y-[15%] opacity-25 hover:opacity-40 transition-opacity duration-1000"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/elementos/19.png"
                        alt=""
                        className="w-[450px] md:w-[700px] h-auto drop-shadow-[0_0_60px_rgba(124,58,237,0.2)] brightness-[0.8] contrast-[1.1] grayscale-[0.2]"
                        aria-hidden="true"
                    />
                </m.div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <m.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-violet-500/20 bg-white/5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-1000 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                        <Zap size={14} className="text-emerald-400 fill-emerald-400/20" />
                        <span className="text-[10px] md:text-xs font-black text-white/80 uppercase tracking-[0.2em]">60 Años de Legado</span>
                    </div>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/Olimpiadas elementos.png"
                        alt="Olimpiadas Deportivas Interprogramas Uninorte"
                        className="w-[320px] md:w-[500px] lg:w-[580px] h-auto mx-auto mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-transform duration-700 cursor-default"
                    />

                    <p className="text-white/80 text-base md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium uppercase tracking-widest px-4 drop-shadow-md">
                        Vive la gloria del evento deportivo más esperado. <br className="hidden md:block" />
                        <span className="text-white font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Más de 5 disciplinas, un solo espíritu.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                        <Link href="/calendario" className="w-full sm:w-auto">
                            <Button className="font-display w-full sm:w-auto rounded-2xl h-14 px-10 text-sm md:text-base bg-white text-violet-950 hover:bg-[#F5F5DC] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] tracking-widest font-black uppercase">
                                <Calendar size={18} className="mr-2" />
                                Ver Calendario
                            </Button>
                        </Link>
                        <Link href="/partidos" className="w-full sm:w-auto">
                            <Button
                                variant="outline"
                                className="font-display w-full sm:w-auto rounded-2xl h-14 px-10 text-sm md:text-base border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/80 backdrop-blur-md tracking-widest font-black uppercase"
                            >
                                <TrendingUp size={18} className="mr-2" />
                                Ir a Partidos
                            </Button>
                        </Link>
                    </div>

                    <div className="mt-16 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-white/30 font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px]">
                        <div className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors">
                                <Calendar size={12} />
                            </div>
                            <span>8 - 29 Abr</span>
                        </div>
                        <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-violet-500/40" />
                        <div className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors">
                                <Trophy size={12} />
                            </div>
                            <span>Ranking Global</span>
                        </div>
                    </div>
                </m.div>
            </div>

            {/* Bottom floating accent line */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
        </section>
    );
}
