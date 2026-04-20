import { useMemo, useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuinielaHeader } from "./quiniela-header";
import { QuinielaPastPodiums } from "./quiniela-past-podiums";
import { QuinielaPodium } from "./quiniela-podium";
import { QuinielaRankingItem } from "./quiniela-ranking-item";
import type { QuinielaPodiumWeek } from "./quiniela-past-podiums";
import { formatQuinielaWeekRangeEs } from "@/modules/quiniela/lib/week-label";

interface QuinielaRankingTabProps {
    ranking: any[];
    rankingWeekMeta: { weekStart: string | null; weekEnd: string | null };
    userWeeklyPoints: number;
    userTotalPoints: number;
    user: any;
    profile: any;
    podiumHistory: QuinielaPodiumWeek[];
}

export function QuinielaRankingTab({
    ranking,
    rankingWeekMeta,
    userWeeklyPoints,
    userTotalPoints,
    user,
    profile,
    podiumHistory,
}: QuinielaRankingTabProps) {
    const [rankingSubTab, setRankingSubTab] = useState<'leaders' | 'streaks' | 'consistency'>('leaders');

    const sortedRanking = useMemo(() => {
        return [...ranking].sort((a, b) => {
            if (rankingSubTab === "streaks") {
                return (b.current_streak || 0) - (a.current_streak || 0) || (b.max_streak || 0) - (a.max_streak || 0);
            }
            if (rankingSubTab === "consistency") {
                const accA = a.total_predictions > 0 ? a.correct_predictions / a.total_predictions : 0;
                const accB = b.total_predictions > 0 ? b.correct_predictions / b.total_predictions : 0;
                return accB - accA;
            }
            return (b.weekly_points || 0) - (a.weekly_points || 0) || (b.points || 0) - (a.points || 0);
        });
    }, [ranking, rankingSubTab]);

    const weekBanner =
        rankingWeekMeta.weekStart && rankingWeekMeta.weekEnd
            ? formatQuinielaWeekRangeEs(rankingWeekMeta.weekStart, rankingWeekMeta.weekEnd)
            : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <QuinielaHeader user={user} profile={profile} totalPoints={userTotalPoints} weeklyPoints={userWeeklyPoints} />

            <QuinielaPastPodiums weeks={podiumHistory ?? []} />

            <div className="bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none" />

                {weekBanner && rankingSubTab === "leaders" && (
                    <div className="relative z-10 mx-4 mt-4 space-y-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center sm:mx-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90">Cómo leer el ranking</p>
                        <p className="text-xs font-semibold leading-relaxed text-white/70">
                            Las posiciones son por puntos de <span className="text-amber-400 font-bold">esta semana</span>. En cada fila también ves el{" "}
                            <span className="text-violet-300 font-bold">total histórico</span> (todos tus aciertos del torneo).
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 pt-1">
                            Semana actual · {weekBanner} · Colombia
                        </p>
                    </div>
                )}

                {rankingSubTab === 'leaders' && (
                    ranking.length > 0 ? <QuinielaPodium top3={sortedRanking.slice(0, 3)} /> : (
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
                            {tab === 'leaders' ? 'Esta semana' : tab === 'streaks' ? 'Rachas' : 'Consistencia'}
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
                        <div className="bg-black/60 backdrop-blur-3xl border border-amber-500/30 rounded-[2rem] p-4 shadow-[0_0_40px_rgba(245,158,11,0.15)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 shrink-0 rounded-[1.25rem] bg-amber-500 flex items-center justify-center text-black font-black text-lg shadow-inner">
                                    #{sortedRanking.findIndex((r) => r.id === user.id) + 1}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-display font-bold text-amber-500 tracking-wide">Tú estás aquí</p>
                                    <p className="text-base font-black text-white font-display tracking-tight truncate">{profile?.full_name || "Tu Perfil"}</p>
                                </div>
                            </div>
                            {rankingSubTab === "leaders" ? (
                                <div className="flex w-full shrink-0 items-stretch justify-end gap-3 sm:w-auto">
                                    <div className="flex min-w-0 flex-1 flex-col justify-center rounded-2xl border border-violet-500/35 bg-violet-950/50 px-4 py-2.5 sm:flex-initial sm:min-w-[7.5rem]">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-violet-300">Total histórico</p>
                                        <p className="text-2xl font-black tabular-nums leading-none text-white sm:text-3xl">{userTotalPoints}</p>
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-col justify-center rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 sm:flex-initial sm:min-w-[7.5rem]">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Esta semana</p>
                                        <p className="text-2xl font-black tabular-nums leading-none text-white sm:text-3xl">{userWeeklyPoints}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-right shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5">
                                    <p className="text-2xl font-black text-white leading-none font-mono tracking-tighter">{userTotalPoints}</p>
                                    <p className="text-[9px] font-bold text-slate-500 tracking-wider mt-0.5">Pts total</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
