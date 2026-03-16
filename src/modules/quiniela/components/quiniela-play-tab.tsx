import { useState } from "react";
import { LayoutGrid, Flame, Gauge, HandMetal, Clock, Zap, Trophy, Filter, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORT_ACCENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { PredictionCard } from "./prediction-card";

interface QuinielaPlayTabProps {
    matches: any[];
    predictions: any[];
    allPredictions: any[];
    onPredict: (matchId: any, data: any) => Promise<any>;
    loading: boolean;
}

export function QuinielaPlayTab({ matches, predictions, allPredictions, onPredict, loading }: QuinielaPlayTabProps) {
    const [viewFilter, setViewFilter] = useState<'upcoming' | 'live' | 'finished' | 'all'>('upcoming');
    const [sportFilter, setSportFilter] = useState<string>('todos');
    const [bettingMode, setBettingMode] = useState<'score' | 'winner'>('winner');

    const filteredMatches = matches.filter(m => {
        if (viewFilter === 'upcoming' && m.estado !== 'programado') return false;
        if (viewFilter === 'live' && m.estado !== 'en_vivo') return false;
        if (viewFilter === 'finished' && m.estado !== 'finalizado') return false;
        if (sportFilter !== 'todos' && m.disciplinas?.name !== sportFilter) return false;
        return true;
    });

    return (
        <div className="space-y-5">
            {/* Sport Filters */}
            <div className="flex gap-3 overflow-x-auto py-4 -mx-1 px-1 no-scrollbar items-center justify-center min-h-[80px]">
                <button
                    onClick={() => setSportFilter('todos')}
                    className={cn(
                        "w-12 h-12 rounded-2xl transition-all shrink-0 border flex items-center justify-center",
                        sportFilter === 'todos'
                            ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110"
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
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
                                ? [SPORT_ACCENT[sport] || "text-white", "bg-white/10 border-current shadow-lg scale-110"]
                                : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <SportIcon sport={sport} size={22} className="text-current" />
                    </button>
                ))}
            </div>

            {/* Mode + Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="inline-flex bg-white/[0.03] p-1 rounded-xl border border-white/5 flex-1">
                    <button
                        onClick={() => setBettingMode('winner')}
                        className={cn("flex-1 px-3 py-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5", bettingMode === 'winner' ? "bg-red-600 text-white shadow-md" : "text-white/50 hover:text-white")}
                    >
                        <HandMetal size={12} /> Ganador
                    </button>
                    <button
                        onClick={() => setBettingMode('score')}
                        className={cn("flex-1 px-3 py-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1.5", bettingMode === 'score' ? "bg-rose-600 text-white shadow-md" : "text-white/50 hover:text-white")}
                    >
                        <Gauge size={12} /> Marcador
                    </button>
                </div>

                <div className="inline-flex bg-white/[0.03] p-1 rounded-xl border border-white/5">
                    {([
                        { key: 'upcoming', label: 'Próximos', icon: Clock },
                        { key: 'live', label: 'Vivo', icon: Zap },
                        { key: 'finished', label: 'Finales', icon: Trophy },
                        { key: 'all', label: 'Todos', icon: Filter },
                    ] as const).map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setViewFilter(f.key)}
                            className={cn(
                                "px-2.5 py-2 rounded-lg text-[10px] font-black transition-all flex items-center gap-1",
                                viewFilter === f.key ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                            )}
                        >
                            <f.icon size={10} />
                            <span className="hidden sm:inline">{f.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Match List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
                    <p className="text-xs text-slate-500 animate-pulse">Cargando partidos...</p>
                </div>
            ) : filteredMatches.length === 0 ? (
                <div className="text-center py-20 text-white/40 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <AlertTriangle className="mx-auto mb-4 opacity-30 w-10 h-10" />
                    <p className="font-bold text-sm">No hay partidos en esta categoría</p>
                </div>
            ) : (
                filteredMatches.map(m => (
                    <PredictionCard
                        key={m.id}
                        match={m}
                        prediction={predictions.find(p => p.match_id === m.id)}
                        onPredict={onPredict}
                        locked={m.estado === 'finalizado' || m.estado === 'en_vivo'}
                        mode={bettingMode}
                        allPredictions={allPredictions}
                    />
                ))
            )}
        </div>
    );
}
