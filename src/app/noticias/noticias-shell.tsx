"use client";

import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";

import { Newspaper } from "lucide-react";

export function NoticiasShell({ children }: { children: React.ReactNode }) {
    const { user, profile, isStaff } = useAuth();

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 font-sans pb-24 relative overflow-hidden">
            {/* Ambient Background - HYBRID INSTITUTIONAL */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
                
                {/* Background Element Watermark */}
                <div className="absolute inset-0 flex items-center justify-end opacity-20">
                    <img 
                        src="/elementos/05.png" 
                        alt="" 
                        className="w-[600px] md:w-[900px] h-auto translate-x-[10%] -translate-y-5" 
                        aria-hidden="true"
                    />
                </div>
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />
            <main className="max-w-5xl mx-auto px-4 pt-10 pb-12 relative z-10">
                <header className="mb-12 flex flex-col items-center text-center gap-4">
                    <div className="animate-in fade-in zoom-in duration-1000">
                        <div className="flex items-center justify-center gap-2 mb-2 text-violet-400/80">
                             <div className="p-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <Newspaper size={20} />
                            </div>
                            <h4 className="text-sm font-bold tracking-wide font-display">Actualidad olímpica</h4>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
                            Últimas <span className="text-emerald-400 font-display">noticias</span>
                        </h1>
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
}
