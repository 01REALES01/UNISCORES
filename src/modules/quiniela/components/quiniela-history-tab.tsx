import { useState } from "react";
import { History, LayoutGrid, Target, Trophy, Handshake, Clock, Zap, CheckCircle, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/components/sport-icons";
import { getCurrentScore } from "@/lib/sport-scoring";
import { getMatchResult } from "@/modules/quiniela/helpers";

interface QuinielaHistoryTabProps {
    predictions: any[];
    matches: any[];
}

export function QuinielaHistoryTab({ predictions, matches }: QuinielaHistoryTabProps) {
    const [sportFilter, setSportFilter] = useState<string>('todos');

    const historyFiltered = predictions.filter(pred => {
        if (sportFilter === 'todos') return true;
        const m = matches.find(match => match.id === pred.match_id);
        return m?.disciplinas?.name === sportFilter;
    });

    const sortedPreds = [...historyFiltered].sort((a, b) => {
        const matchA = matches.find(m => m.id === a.match_id);
        const matchB = matches.find(m => m.id === b.match_id);
        if (!matchA || !matchB) return 0;
        const order: Record<string, number> = { 'finalizado': 0, 'en_curso': 1, 'programado': 2 };
        const orderA = order[matchA.estado] ?? 3;
        const orderB = order[matchB.estado] ?? 3;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(matchB.fecha).getTime() - new Date(matchA.fecha).getTime();
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <History size={16} className="text-amber-400" />
                <h2 className="font-bold text-sm text-white">Mis Aciertos</h2>
                <span className="text-[10px] text-slate-500 font-bold">({predictions.length})</span>
            </div>

            <div className="flex gap-3 overflow-x-auto py-4 -mx-1 px-1 no-scrollbar items-center justify-center min-h-[80px]">
                <button
                    onClick={() => setSportFilter('todos')}
                    className={cn(
                        "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center",
                        sportFilter === 'todos'
                            ? "bg-amber-500 text-black border-amber-500 shadow-lg scale-110"
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                    )}
                >
                    <LayoutGrid size={22} />
                </button>
                {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => (
                    <button
                        key={sport}
                        onClick={() => setSportFilter(sport)}
                        className={cn(
                            "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center text-xl",
                            sportFilter === sport
                                ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-lg scale-110"
                                : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10"
                        )}
                    >
                        <SportIcon sport={sport} size={22} className="text-current" />
                    </button>
                ))}
            </div>

            {historyFiltered.length === 0 ? (
                <div className="text-center py-20 text-white/40 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <Target className="mx-auto mb-4 opacity-30 w-10 h-10" />
                    <p className="font-bold text-sm">No hay aciertos aquí</p>
                </div>
            ) : (
                sortedPreds.map(pred => {
                    const m = matches.find(match => match.id === pred.match_id);
                    if (!m) return null;

                    const result = getMatchResult(m);
                    const isFinished = m.estado === 'finalizado';
                    const isLive = m.estado === 'en_curso';
                    let correct: boolean | null = null;

                    if (isFinished && result) {
                        if (pred.winner_pick) {
                            correct = pred.winner_pick === result;
                        } else if (pred.goles_a !== null) {
                            const md = m.marcador_detalle || {};
                            const actualA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                            const actualB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                            correct = pred.goles_a === actualA && pred.goles_b === actualB;
                        }
                    }

                    const scoreInfo = getCurrentScore(m.disciplinas?.name, m.marcador_detalle || {});
                    const cardBg = isFinished && correct === true
                        ? "bg-emerald-900/40 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                        : isFinished && correct === false
                            ? "bg-rose-900/40 border-rose-500/25 shadow-lg shadow-rose-500/10"
                            : isLive ? "bg-rose-500/5 border-rose-500/20" : "bg-white/[0.03] border-white/5";

                    return (
                        <Link href={`/partido/${m.id}`} key={pred.id}>
                            <div className={cn("relative p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.01]", cardBg)}>
                                <div className="absolute top-3 right-3">
                                    {isFinished && (
                                        <div className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider", correct ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                            {correct ? <><CheckCircle size={10} className="inline mr-1" /> Acertado</> : <><X size={10} className="inline mr-1" /> Fallado</>}
                                        </div>
                                    )}
                                    {isLive && <div className="px-2.5 py-1 rounded-full text-[9px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse">EN CURSO</div>}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-4">
                                    <SportIcon sport={m.disciplinas?.name} size={14} />
                                    <span>{m.disciplinas?.name} • {new Date(m.fecha).toLocaleDateString()}</span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    {m.marcador_detalle?.tipo === 'carrera' ? (
                                        <div className="flex flex-col items-center justify-center w-full">
                                            <span className="text-lg font-black text-white text-center tracking-tighter">
                                                {m.marcador_detalle?.distancia} {m.marcador_detalle?.estilo}
                                            </span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                                                Prueba
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 text-center">
                                                <div className="w-10 h-10 mx-auto bg-white/5 rounded-xl flex items-center justify-center font-black mb-1 transition-transform group-hover:scale-105">{(m.carrera_a?.nombre || m.equipo_a).substring(0, 2).toUpperCase()}</div>
                                                <p className="text-[10px] font-bold truncate">{m.carrera_a?.nombre || m.equipo_a}</p>
                                            </div>
                                            <div className="text-lg font-black tabular-nums">
                                                {m.disciplinas?.name === 'Ajedrez' ? (
                                                    <span className="text-sm">{isFinished ? 'FIN' : 'VS'}</span>
                                                ) : (
                                                    `${scoreInfo.scoreA} : ${scoreInfo.scoreB}`
                                                )}
                                            </div>
                                            <div className="flex-1 text-center">
                                                <div className="w-10 h-10 mx-auto bg-white/5 rounded-xl flex items-center justify-center font-black mb-1 transition-transform group-hover:scale-105">{(m.carrera_b?.nombre || m.equipo_b).substring(0, 2).toUpperCase()}</div>
                                                <p className="text-[10px] font-bold truncate">{m.carrera_b?.nombre || m.equipo_b}</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="mt-4 p-2.5 rounded-xl bg-black/20 border border-white/5 text-center">
                                    <p className="text-[8px] font-bold uppercase text-slate-500">Predicción</p>
                                    <p className="text-xs font-black">
                                        {pred.winner_pick 
                                            ? (pred.winner_pick === 'A' ? m.carrera_a?.nombre || m.equipo_a : pred.winner_pick === 'B' ? m.carrera_b?.nombre || m.equipo_b : 'Empate')
                                            : `${pred.goles_a} - ${pred.goles_b}`}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    );
                })
            )}
        </div>
    );
}
