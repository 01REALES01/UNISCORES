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
        if (viewFilter === 'live' && m.estado !== 'en_curso') return false;
        if (viewFilter === 'finished' && m.estado !== 'finalizado') return false;
        if (sportFilter !== 'todos' && m.disciplinas?.name !== sportFilter) return false;
        
        // Evitar que aparezcan partidos "placeholder" (llaves sin definir) en la quiniela
        const a = String(m.equipo_a || '').toUpperCase();
        const b = String(m.equipo_b || '').toUpperCase();
        const noDefinidos = ['GANADOR', 'PERDEDOR', 'LLAVE', 'FINAL', '1RO', '2DO', '3RO', '4TO'];
        if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
        if (noDefinidos.some(kw => a.includes(kw) || b.includes(kw))) return false;

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
                <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 flex-1 shadow-inner group/modes">
                    <button
                        onClick={() => setBettingMode('winner')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-display font-black tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border", 
                            bettingMode === 'winner' 
                                ? "bg-white/10 text-white border-white/10 shadow-lg ring-1 ring-white/10 scale-[1.02] z-10" 
                                : "text-white/40 hover:text-white/60 border-transparent hover:bg-white/5"
                        )}
                    >
                        <HandMetal size={16} className={cn("transition-colors", bettingMode === 'winner' ? "text-violet-400" : "opacity-50")} /> 
                        <span className="uppercase tracking-[0.2em]">Ganador</span>
                    </button>
                    <button
                        onClick={() => setBettingMode('score')}
                        className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-display font-black tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border", 
                            bettingMode === 'score' 
                                ? "bg-white/10 text-white border-white/10 shadow-lg ring-1 ring-white/10 scale-[1.02] z-10" 
                                : "text-white/40 hover:text-white/60 border-transparent hover:bg-white/5"
                        )}
                    >
                        <Gauge size={16} className={cn("transition-colors", bettingMode === 'score' ? "text-violet-400" : "opacity-50")} /> 
                        <span className="uppercase tracking-[0.2em]">Marcador</span>
                    </button>
                </div>

                <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 flex-1 shadow-inner group/filters">
                    {([
                        { key: 'upcoming', label: 'Próximos', icon: Clock },
                        { key: 'live', label: 'En Curso', icon: Zap },
                        { key: 'finished', label: 'Finales', icon: Trophy },
                        { key: 'all', label: 'Todos', icon: Filter },
                    ] as const).map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setViewFilter(f.key)}
                            className={cn(
                                "flex-1 py-3 rounded-xl text-[10px] font-display font-black tracking-widest transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1.5 border",
                                viewFilter === f.key 
                                    ? "bg-white/10 text-white border-white/10 shadow-lg ring-1 ring-white/10 scale-[1.02] z-10" 
                                    : "text-white/30 hover:text-white/60 border-transparent hover:bg-white/5"
                            )}
                        >
                            <f.icon size={16} className={cn("transition-colors", viewFilter === f.key ? (f.key === 'live' ? "text-rose-400" : "text-emerald-400") : "opacity-50")} />
                            <span className="hidden sm:inline uppercase tracking-[0.2em]">{f.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Match List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-violet-400 animate-spin" />
                    <p className="text-sm text-white/40 font-display font-black tracking-wide animate-pulse">Cargando partidos...</p>
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
                        locked={m.estado === 'finalizado' || m.estado === 'en_curso'}
                        mode={bettingMode}
                        allPredictions={allPredictions}
                    />
                ))
            )}
        </div>
    );
}
