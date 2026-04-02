"use client";

import { m } from "framer-motion";
import { Zap, Calendar, Trophy, TrendingUp } from "lucide-react";
import { Badge, Button } from "@/components/ui-primitives";
import Link from "next/link";

export function WelcomeHero() {
    return (
        <section className="relative w-full py-16 md:py-24 px-6 overflow-hidden bg-black/40 backdrop-blur-2xl rounded-[2.5rem] mb-12 border border-white/5">
            {/* Background elements - HYBRID INSTITUTIONAL */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-[200px] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Antorcha background */}
            <div className="absolute inset-0 flex items-end justify-end pointer-events-none overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/Antorcha.png"
                    alt=""
                    className="w-[600px] md:w-[900px] h-auto opacity-10 translate-y-[30%] -mr-24 md:-mr-32"
                    style={{ filter: "brightness(0) invert(1)" }}
                    aria-hidden="true"
                />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Badge variant="outline" className="mb-6 px-4 py-1.5 border-transparent text-emerald-400 bg-transparent font-bold tracking-[0.2em] text-[10px] md:text-xs uppercase">
                        <Zap size={14} className="mr-2 fill-current" /> 60 Años de Excelencia
                    </Badge>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-[#F5F5DC] mb-6 leading-[0.9]">
                        OLIMPIADAS <br />
                        UNINORTE 2026
                    </h1>

                    <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                        Vive la pasión, el esfuerzo y la gloria del evento deportivo más grande de nuestra institución. Más de 5 disciplinas, un solo espíritu.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/calendario">
                            <Button className="font-display w-full sm:w-auto rounded-full h-12 px-8 text-sm md:text-base bg-white/5 hover:bg-white/10 text-white/90 active:scale-95 transition-all border border-white/10 tracking-wide font-bold">
                                Ver Calendario
                            </Button>
                        </Link>
                        <Link href="/partidos">
                            <Button
                                variant="outline"
                                className="font-display w-full sm:w-auto rounded-full h-12 px-8 text-sm md:text-base border-white/5 bg-transparent hover:bg-white/5 active:scale-95 transition-all text-white/70 backdrop-blur-sm tracking-wide font-bold"
                            >
                                <TrendingUp size={16} className="mr-2" />
                                Ir a Partidos
                            </Button>
                        </Link>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-8 text-white/50 font-bold uppercase tracking-widest text-[10px] sm:text-xs">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-white/40" />
                            <span>8 Abr - 14 May</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <div className="flex items-center gap-2">
                            <Trophy size={14} className="text-white/40" />
                            <span>+5 Disciplinas</span>
                        </div>
                    </div>
                </m.div>
            </div>

            {/* Bottom floating logo hint */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </section>
    );
}
