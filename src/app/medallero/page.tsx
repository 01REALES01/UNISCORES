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
        <div className="min-h-screen bg-black text-white selection:bg-red-500/30">

            {/* Main Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-12">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <MedalLeaderboard />
                </div>

                <div className="mt-12 text-center">
                    <p className="text-white/40 font-bold tracking-wide text-sm max-w-lg mx-auto">
                        El ranking se calcula automáticamente: Oro (5pts), Plata (3pts), Bronce (1pt).
                        Los resultados se actualizan al finalizar cada evento.
                    </p>
                </div>
            </main>
        </div>
    );
}
