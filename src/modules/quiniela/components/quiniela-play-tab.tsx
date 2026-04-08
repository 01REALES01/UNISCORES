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
    const [genderFilter, setGenderFilter] = useState<string>('todos');

    const filteredMatches = matches.filter(m => {
        if (viewFilter === 'upcoming' && m.estado !== 'programado') return false;
        if (viewFilter === 'live' && m.estado !== 'en_curso') return false;
        if (viewFilter === 'finished' && m.estado !== 'finalizado') return false;
        if (sportFilter !== 'todos' && m.disciplinas?.name !== sportFilter) return false;
        if (genderFilter !== 'todos' && (m.genero || 'masculino').toLowerCase() !== genderFilter.toLowerCase()) return false;
        
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
             {/* 1. Sport Selection (Mobile First - Descriptive) */}
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase text-white/50 tracking-[0.25em] drop-shadow-sm">Deporte</span>
                    {sportFilter !== 'todos' && (
                        <button onClick={() => setSportFilter('todos')} className="text-[9px] font-bold text-violet-400 uppercase tracking-widest hover:text-white transition-colors">Limpiar</button>
                    )}
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                    <button
                        onClick={() => setSportFilter('todos')}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all duration-300 shrink-0",
                            sportFilter === 'todos'
                                ? "bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.15)] scale-105"
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <LayoutGrid size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Todos</span>
                    </button>
                    {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => (
                        <button
                            key={sport}
                            onClick={() => setSportFilter(sport)}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3.5 rounded-2xl border transition-all duration-300 shrink-0",
                                sportFilter === sport
                                    ? [SPORT_ACCENT[sport] || "text-white", "bg-white/10 border-current shadow-lg scale-105"]
                                    : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <SportIcon sport={sport} size={18} className="text-current" />
                            <span className="text-xs font-black uppercase tracking-widest">{sport}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Gender Selection (Matches Partidos style) */}
            <div className="flex justify-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                <div className="flex gap-1.5 p-1.5 bg-black/40 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl w-full">
                    {[
                        { label: 'Todos', value: 'todos', icon: Filter },
                        { label: 'Masculino', value: 'masculino', icon: Zap },
                        { label: 'Femenino', value: 'femenino', icon: Trophy },
                    ].map((g) => {
                        const isSelected = genderFilter === g.value;
                        return (
                            <button
                                key={g.value}
                                onClick={() => setGenderFilter(g.value)}
                                className={cn(
                                    "relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-display font-black tracking-widest transition-all border whitespace-nowrap",
                                    isSelected
                                        ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-xl scale-105"
                                        : "bg-transparent border-transparent text-white/50 hover:text-white/80"
                                )}
                            >
                                <g.icon size={12} className={cn(isSelected ? "text-[#7C3AED]" : "text-violet-400")} />
                                <span className="uppercase">{g.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filter Row */}
            <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 shadow-inner group/filters">
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
                                : "text-white/50 hover:text-white/80 border-transparent hover:bg-white/5"
                        )}
                    >
                        <f.icon size={16} className={cn("transition-colors", viewFilter === f.key ? (f.key === 'live' ? "text-rose-400" : "text-emerald-400") : "opacity-50")} />
                        <span className="hidden sm:inline uppercase tracking-[0.2em]">{f.label}</span>
                    </button>
                ))}
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
                        allPredictions={allPredictions}
                    />
                ))
            )}
        </div>
    );
}
