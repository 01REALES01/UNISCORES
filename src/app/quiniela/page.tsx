"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, History, Trophy, Info } from "lucide-react";
import { Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { MainNavbar } from "@/components/main-navbar";
import { useQuiniela } from "@/modules/quiniela/hooks/use-quiniela";
import { QuinielaPlayTab } from "@/modules/quiniela/components/quiniela-play-tab";
import { QuinielaHistoryTab } from "@/modules/quiniela/components/quiniela-history-tab";
import { QuinielaRankingTab } from "@/modules/quiniela/components/quiniela-ranking-tab";
import UniqueLoading from "@/components/ui/morph-loading";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";

export default function QuinielaPage() {
    const { user, profile, isStaff, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<'play' | 'history' | 'ranking'>('play');
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    const { matches, predictions, allPredictions, ranking, loading, userPublicProfile, handlePredict, stats } = useQuiniela();

    useEffect(() => {
        const t = searchParams.get("tab");
        if (t === "play" || t === "history" || t === "ranking") setActiveTab(t);
    }, [searchParams]);

    const playRestore = useMemo(
        () => ({
            day: searchParams.get("day") ?? undefined,
            sport: searchParams.get("sport") ?? undefined,
            gender: searchParams.get("gender") ?? undefined,
            focusMatchId: searchParams.get("focus") ?? undefined,
        }),
        [searchParams]
    );

    useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

    useEffect(() => {
        if (!authLoading && user && !sessionStorage.getItem('quiniela_disclaimer_v2_shown')) setShowDisclaimer(true);
    }, [authLoading, user]);

    const handleDismissDisclaimer = () => {
        sessionStorage.setItem('quiniela_disclaimer_v2_shown', 'true');
        setShowDisclaimer(false);
    };

    if (authLoading || !user) return <div className="min-h-screen bg-background flex items-center justify-center"><UniqueLoading size="lg" /></div>;

    const navItems = [
        { id: 'play', label: 'Jugar', icon: Flame },
        { id: 'history', label: 'Historial', icon: History },
        { id: 'ranking', label: 'Ranking', icon: Trophy }
    ];

    return (
        <div className="min-h-screen bg-background text-white font-sans pb-20 selection:bg-violet-500/30">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[120px] animate-pulse" />
            </div>

            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-end overflow-hidden opacity-20">
                <img 
                    src="/elementos/07.png" 
                    alt="" 
                    className="w-[700px] md:w-[1000px] h-auto translate-x-[10%] -translate-y-[5%] grayscale contrast-125 brightness-150" 
                    aria-hidden="true"
                />
            </div>

            {showDisclaimer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 text-white border border-white/10 shadow-inner">
                            <Info size={32} className="opacity-80" />
                        </div>
                        <h3 className="text-2xl font-display font-black mb-4 tracking-tight text-white/90">Aviso Institucional</h3>
                        <p className="text-sm text-white/60 mb-8 leading-relaxed">Este espacio es <strong className="text-white">100% recreativo</strong>. No se realizan apuestas económicas de ningún tipo.</p>
                        <Button onClick={handleDismissDisclaimer} className="w-full bg-white text-black hover:bg-slate-200 rounded-xl h-12 font-bold shadow-xl transition-all border-none font-display text-sm tracking-wide">
                            Entendido
                        </Button>
                    </div>
                </div>
            )}

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <div className="max-w-xl mx-auto p-4 space-y-6 relative z-10 pt-4">
                <div className="flex flex-col items-center text-center gap-1 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <p className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-[0.3em]">
                        Predict & win
                    </p>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
                        Acierta y gana
                    </h1>
                </div>

                {/* ━━━ INSTITUTIONAL BRAND BREAK (MOVED UP) ━━━ */}
                <div className="mb-4">
                    <InstitutionalBanner variant={8} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[ {v: stats.totalPredictions, l: 'Predicciones', c: 'text-white' }, {v: stats.correctPredictions, l: 'Acertadas', c: 'text-emerald-400' }, {v: `${stats.accuracy}%`, l: 'Precisión', c: 'text-violet-400' }].map((s, i) => (
                        <div key={i} className="p-3 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 text-center shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                            <p className={cn("text-2xl font-black font-mono tracking-tighter relative z-10", s.c)}>{s.v}</p>
                            <p className="text-[10px] font-bold text-white/40 relative z-10">{s.l}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
                    {navItems.map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id as any)} 
                            className={cn(
                                "py-3 rounded-xl text-xs font-display font-black tracking-wide transition-all duration-300 flex items-center justify-center gap-2 border", 
                                activeTab === item.id 
                                    ? "bg-white/10 border-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
                                    : "text-white/40 hover:bg-white/5 hover:text-white/80 border-transparent"
                            )}
                        >
                            <item.icon size={14} className={activeTab === item.id ? "text-violet-400" : "opacity-60"} /> 
                            <span className="hidden sm:inline">{item.label}</span>
                        </button>
                    ))}
                </div>

                {activeTab === 'play' && (
                    <QuinielaPlayTab
                        matches={matches}
                        predictions={predictions}
                        allPredictions={allPredictions}
                        onPredict={handlePredict}
                        loading={loading}
                        playRestore={playRestore}
                    />
                )}
                {activeTab === 'history' && <QuinielaHistoryTab predictions={predictions} matches={matches} />}
                {activeTab === 'ranking' && <QuinielaRankingTab ranking={ranking} user={user} profile={profile} userPoints={userPublicProfile?.points || 0} />}
            </div>
        </div>
    );
}
