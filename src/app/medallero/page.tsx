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
        <div className="min-h-screen bg-background text-white selection:bg-indigo-500/30 font-sans">
            {/* Ambient Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Main Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-12 relative z-10">
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
