"use client";

import { MedalLeaderboard } from "@/components/medalleria-board";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui-primitives";

export default function MedalleroPage() {
    const { user, profile, isStaff } = useAuth();

    return (
        <div className="min-h-screen bg-background text-white selection:bg-indigo-500/30 font-sans relative overflow-hidden">
            {/* Ambient Background Gradient & 3D Element */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-background mix-blend-multiply opacity-50" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] max-w-[1400px] opacity-[0.05] mix-blend-screen pointer-events-none">
                    <img src="/elementos/08.png" alt="Olympics 3D BG" className="w-full h-auto object-contain filter invert opacity-80" />
                </div>

                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '10s' }} />
            </div>

            {/* Main Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-12 pb-12 relative z-10">
                <div className="flex flex-col items-center text-center gap-1 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <p className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-[0.3em]">
                        Ranking de facultades
                    </p>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
                        Medallería
                    </h1>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <MedalLeaderboard />
                </div>

                <div className="mt-12 text-center">
                    <p className="text-white/40 font-bold tracking-wide text-sm max-w-lg mx-auto">
                        El ranking se calcula automáticamente: Oro (5pts), Plata (3pts).
                        Los resultados se actualizan al finalizar cada evento.
                    </p>
                </div>
            </main>
        </div>
    );
}
