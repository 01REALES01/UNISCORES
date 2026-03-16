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
                                "pb-4 border-b-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                rankingSubTab === tab ? "border-amber-500 text-white" : "border-transparent text-slate-500"
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
                                <QuinielaRankingItem profile={prof} rank={idx + 1} isMe={prof.id === user?.id} />
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
                        <div className="bg-[#1A1612]/95 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black font-black">
                                    #{ranking.findIndex(r => r.id === user.id) + 1}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">TÚ ESTÁS AQUÍ</p>
                                    <p className="text-sm font-black text-white uppercase">{profile?.full_name || "Tu Perfil"}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-white leading-none">{userPoints}</p>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PUNTOS</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
