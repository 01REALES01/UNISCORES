"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Flame, History, Trophy, Info } from "lucide-react";
import { Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { MainNavbar } from "@/components/main-navbar";
import { useQuiniela } from "@/modules/quiniela/hooks/use-quiniela";
import { QuinielaPlayTab } from "@/modules/quiniela/components/quiniela-play-tab";
import { QuinielaHistoryTab } from "@/modules/quiniela/components/quiniela-history-tab";
import { QuinielaRankingTab } from "@/modules/quiniela/components/quiniela-ranking-tab";
import UniqueLoading from "@/components/ui/morph-loading";

export default function QuinielaPage() {
    const { user, profile, isStaff, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'play' | 'history' | 'ranking'>('ranking');
    const [showDisclaimer, setShowDisclaimer] = useState(false);

    const { matches, predictions, allPredictions, ranking, loading, userPublicProfile, handlePredict, stats } = useQuiniela();

    useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

    useEffect(() => {
        if (!authLoading && user && !sessionStorage.getItem('quiniela_disclaimer_v2_shown')) setShowDisclaimer(true);
    }, [authLoading, user]);

    const handleDismissDisclaimer = () => {
        sessionStorage.setItem('quiniela_disclaimer_v2_shown', 'true');
        setShowDisclaimer(false);
    };

    if (authLoading || !user) return <div className="min-h-screen bg-[#0a0805] flex items-center justify-center"><UniqueLoading size="lg" /></div>;

    const navItems = [
        { id: 'play', label: 'Jugar', icon: Flame, className: 'bg-white text-black shadow-xl' },
        { id: 'history', label: 'Historial', icon: History, className: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-600/20' },
        { id: 'ranking', label: 'Ranking', icon: Trophy, className: 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-600/20' }
    ];

    return (
        <div className="min-h-screen bg-[#0d0906] text-white font-sans pb-20 selection:bg-orange-500/30">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-orange-500/10 rounded-full blur-[120px] animate-pulse" />
            </div>

            {showDisclaimer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0a0805] border border-blue-500/30 rounded-3xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6 text-blue-400 border border-blue-500/20"><Info size={32} /></div>
                        <h3 className="text-2xl font-black mb-4">Aviso Institucional</h3>
                        <p className="text-sm text-slate-300 mb-8 leading-relaxed">Este espacio es <strong className="text-white">100% recreativo</strong>. No se realizan apuestas económicas.</p>
                        <Button onClick={handleDismissDisclaimer} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-12 font-bold">Entendido</Button>
                    </div>
                </div>
            )}

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <div className="max-w-xl mx-auto p-4 space-y-6 relative z-10">
                <div className="grid grid-cols-3 gap-3">
                    {[ {v: stats.totalPredictions, l: 'Aciertos', c: 'text-white' }, {v: stats.correctPredictions, l: 'Acertadas', c: 'text-emerald-400' }, {v: `${stats.accuracy}%`, l: 'Precisión', c: 'text-red-400' }].map((s, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                            <p className={cn("text-2xl font-black", s.c)}>{s.v}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{s.l}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-white/[0.03] rounded-2xl border border-white/5">
                    {navItems.map((item) => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5", activeTab === item.id ? item.className : 'text-white/50 hover:bg-white/5')}>
                            <item.icon size={14} /> {item.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'play' && <QuinielaPlayTab matches={matches} predictions={predictions} allPredictions={allPredictions} onPredict={handlePredict} loading={loading} />}
                {activeTab === 'history' && <QuinielaHistoryTab predictions={predictions} matches={matches} />}
                {activeTab === 'ranking' && <QuinielaRankingTab ranking={ranking} user={user} profile={profile} userPoints={userPublicProfile?.points || 0} />}
            </div>
        </div>
    );
}
