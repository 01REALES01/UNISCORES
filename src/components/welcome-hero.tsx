"use client";

import { m } from "framer-motion";
import { Zap, Calendar, Trophy, ChevronRight, TrendingUp } from "lucide-react";
import { Badge, Button } from "@/components/ui-primitives";
import Link from "next/link";

export function WelcomeHero() {
    return (
        <section className="relative w-full py-12 md:py-20 px-6 overflow-hidden bg-[#0d0b1a]/40 backdrop-blur-2xl rounded-[2.5rem] mb-12 border border-white/10 shadow-2xl">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay rotate-180" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-900/5 rounded-full blur-[100px] -ml-32 -mb-32" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="relative z-10 max-w-4xl mx-auto text-center">
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Badge variant="outline" className="mb-6 px-4 py-1.5 border-red-500/20 text-red-400 bg-red-500/5 backdrop-blur-md">
                        <Zap size={14} className="mr-2 fill-current" /> 60 Años de Excelencia
                    </Badge>

                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
                        OLIMPIADAS <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-orange-500">
                            UNINORTE 2026
                        </span>
                    </h1>

                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                        Vive la pasión, el esfuerzo y la gloria del evento deportivo más grande de nuestra institución. Más de 5 disciplinas, un solo espíritu.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/calendario">
                            <Button className="w-full sm:w-auto rounded-full h-14 px-10 text-base shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 transition-all">
                                Ver Calendario
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            onClick={() => {
                                const el = document.getElementById('finalizados');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    // Fallback if not found
                                    window.location.href = '/#finalizados';
                                }
                            }}
                            className="w-full sm:w-auto rounded-full h-14 px-10 text-base border-white/10 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-slate-300"
                        >
                            <TrendingUp size={18} className="mr-2 text-red-500" />
                            Ir a Resultados
                        </Button>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-red-500" />
                            <span>15 Sep - 30 Oct</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Trophy size={14} className="text-orange-500" />
                            <span>+5 Disciplinas</span>
                        </div>
                    </div>
                </m.div>
            </div>

            {/* Bottom floating logo hint */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
        </section>
    );
}
