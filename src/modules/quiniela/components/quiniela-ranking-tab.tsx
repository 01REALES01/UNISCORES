import { useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuinielaHeader } from "./quiniela-header";
import { QuinielaPodium } from "./quiniela-podium";
import { QuinielaRankingItem } from "./quiniela-ranking-item";

interface QuinielaRankingTabProps {
    ranking: any[];
    user: any;
    profile: any;
    userPoints: number;
}

export function QuinielaRankingTab({ ranking, user, profile, userPoints }: QuinielaRankingTabProps) {
    const [rankingSubTab, setRankingSubTab] = useState<'leaders' | 'streaks' | 'consistency'>('leaders');

    const sortedRanking = [...ranking].sort((a, b) => {
        if (rankingSubTab === 'streaks') {
            return (b.current_streak || 0) - (a.current_streak || 0) || (b.max_streak || 0) - (a.max_streak || 0);
        }
        if (rankingSubTab === 'consistency') {
            const accA = a.total_predictions > 0 ? (a.correct_predictions / a.total_predictions) : 0;
            const accB = b.total_predictions > 0 ? (b.correct_predictions / b.total_predictions) : 0;
            return accB - accA;
        }
        return (b.points || 0) - (a.points || 0);
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <QuinielaHeader user={user} profile={profile} points={userPoints} />

            <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none" />

                {rankingSubTab === 'leaders' && (
                    ranking.length > 0 ? <QuinielaPodium top3={ranking.slice(0, 3)} /> : (
                        <div className="py-24 text-center">
                            <Trophy size={32} className="text-white/20 mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-white/30">Cargando...</p>
                        </div>
                    )
                )}

                <nav className="flex items-center gap-10 px-10 py-2 border-y border-white/10 bg-white/[0.02] overflow-x-auto no-scrollbar relative z-10">
                    {['leaders', 'streaks', 'consistency'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setRankingSubTab(tab as any)}
                            className={cn(
                                "pb-4 border-b-2 text-sm font-display font-black tracking-wide transition-all",
                                rankingSubTab === tab ? "border-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "border-transparent text-slate-500 hover:text-white/70"
                            )}
                        >
                            {tab === 'leaders' ? 'Líderes' : tab === 'streaks' ? 'Rachas' : 'Consistencia'}
                        </button>
                    ))}
                </nav>

                <div className="p-4 sm:p-8 space-y-1 max-h-[600px] overflow-y-auto no-scrollbar relative z-10 pb-20">
                    {ranking.length === 0 ? (
                        <div className="py-20 text-center text-slate-500">
                            <Users size={40} className="mx-auto mb-4 opacity-10" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-600">Calculando...</p>
                        </div>
                    ) : (
                        sortedRanking.map((prof, idx) => (
                            <div key={prof.id} className="relative group">
                                <QuinielaRankingItem profile={prof} rank={idx + 1} isMe={prof.id === user?.id} mode={rankingSubTab} />
                                <div className="absolute right-24 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
                                    {rankingSubTab === 'streaks' && prof.current_streak > 0 && (
                                        <div className="flex items-center gap-1.5 text-rose-500">
                                            <Zap size={14} className="fill-current animate-pulse" />
                                            <span className="text-xs font-black">{prof.current_streak}</span>
                                        </div>
                                    )}
                                    {rankingSubTab === 'consistency' && prof.total_predictions > 0 && (
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
                                            {Math.round((prof.correct_predictions / prof.total_predictions) * 100)}% ACC
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {user && ranking.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-black/60 backdrop-blur-3xl border border-amber-500/30 rounded-[2rem] p-4 shadow-[0_0_40px_rgba(245,158,11,0.15)] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-[1.25rem] bg-amber-500 flex items-center justify-center text-black font-black text-lg shadow-inner">
                                    #{ranking.findIndex(r => r.id === user.id) + 1}
                                </div>
                                <div>
                                    <p className="text-xs font-display font-bold text-amber-500 tracking-wide">Tú estás aquí</p>
                                    <p className="text-base font-black text-white font-display tracking-tight">{profile?.full_name || "Tu Perfil"}</p>
                                </div>
                            </div>
                            <div className="text-right bg-white/[0.03] px-4 py-2 rounded-2xl border border-white/5">
                                <p className="text-2xl font-black text-white leading-none font-mono tracking-tighter">{userPoints}</p>
                                <p className="text-[10px] font-bold text-slate-500 tracking-wider mt-1">Puntos</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
