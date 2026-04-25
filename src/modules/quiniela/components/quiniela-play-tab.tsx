import { useState, useMemo, useEffect, useRef } from "react";
import { LayoutGrid, Clock, Zap, Trophy, Filter, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORT_ACCENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { PredictionCard } from "./prediction-card";
import { isPartidoQuinielaEligible } from "../helpers";

const PLAY_SPORT_FILTERS = ['todos', 'Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez'] as const;
const PLAY_GENDER_FILTERS = ['todos', 'masculino', 'femenino'] as const;

export type QuinielaPlayRestore = {
    day?: string;
    sport?: string;
    gender?: string;
    focusMatchId?: string;
};

interface QuinielaPlayTabProps {
    matches: any[];
    predictions: any[];
    allPredictions: any[];
    onPredict: (matchId: any, data: any) => Promise<any>;
    loading: boolean;
    playRestore?: QuinielaPlayRestore;
}

// Group matches by date key (YYYY-MM-DD)
function getDateKey(fecha: string) {
    return new Date(fecha).toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function formatDayLabel(dateKey: string) {
    const date = new Date(dateKey + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return 'Hoy';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Mañana';

    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDayStatus(matches: any[]): 'open' | 'mixed' | 'closed' | 'finished' {
    const allFinished = matches.every(m => m.estado === 'finalizado');
    if (allFinished) return 'finished';

    const allStarted = matches.every(m => m.estado !== 'programado');
    if (allStarted) return 'closed';

    const someStarted = matches.some(m => m.estado !== 'programado');
    if (someStarted) return 'mixed';

    return 'open';
}

function getEarliestUpcoming(matches: any[]): Date | null {
    const upcoming = matches
        .filter(m => m.estado === 'programado')
        .map(m => new Date(m.fecha))
        .sort((a, b) => a.getTime() - b.getTime());
    return upcoming[0] || null;
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return <span>Cerrando...</span>;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return <span>Se abre en {days}d</span>;
    }

    return <span>Cierra en {hours}h {minutes}m</span>;
}

export function QuinielaPlayTab({ matches, predictions, allPredictions, onPredict, loading, playRestore }: QuinielaPlayTabProps) {
    const [sportFilter, setSportFilter] = useState<string>('todos');
    const [genderFilter, setGenderFilter] = useState<string>('todos');

    // Filter matches (sport, gender, placeholder exclusion)
    const baseFilteredMatches = useMemo(() => matches.filter(m => {
        if (!isPartidoQuinielaEligible(m)) return false;
        if (sportFilter !== 'todos' && m.disciplinas?.name !== sportFilter) return false;
        if (genderFilter !== 'todos' && (m.genero || 'masculino').toLowerCase() !== genderFilter.toLowerCase()) return false;

        const a = String(m.equipo_a || '').toUpperCase();
        const b = String(m.equipo_b || '').toUpperCase();
        const noDefinidos = ['GANADOR', 'PERDEDOR', 'LLAVE', 'FINAL', '1RO', '2DO', '3RO', '4TO'];
        if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
        if (noDefinidos.some(kw => a.includes(kw) || b.includes(kw))) return false;

        return true;
    }), [matches, sportFilter, genderFilter]);

    // Group by day
    const dayGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        baseFilteredMatches.forEach(m => {
            const key = getDateKey(m.fecha);
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        // Sort each group by time
        Object.values(groups).forEach(g => g.sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
        return groups;
    }, [baseFilteredMatches]);

    // Sorted day keys (only today and future)
    const sortedDays = useMemo(() => {
        const todayKey = getDateKey(new Date().toISOString());
        return Object.keys(dayGroups)
            .filter(d => d >= todayKey)
            .sort((a, b) => a.localeCompare(b));
    }, [dayGroups]);

    // Find default day: first day with upcoming matches, or today, or first available
    const defaultDay = useMemo(() => {
        const todayKey = getDateKey(new Date().toISOString());
        // First day with open matches
        const firstOpen = sortedDays.find(d => {
            const status = getDayStatus(dayGroups[d]);
            return status === 'open' || status === 'mixed';
        });
        if (firstOpen) return firstOpen;
        // Today if it has matches
        if (sortedDays.includes(todayKey)) return todayKey;
        // First day overall
        return sortedDays[0] || todayKey;
    }, [sortedDays, dayGroups]);

    const [selectedDay, setSelectedDay] = useState<string>(defaultDay);
    const restoredFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!playRestore?.focusMatchId) restoredFocusRef.current = null;
    }, [playRestore?.focusMatchId]);

    // Update selected day when default changes
    useEffect(() => {
        if (!sortedDays.includes(selectedDay) && defaultDay) {
            setSelectedDay(defaultDay);
        }
    }, [sortedDays, selectedDay, defaultDay]);

    // Restore sport / gender from URL (return from partido detail)
    useEffect(() => {
        if (!playRestore) return;
        const s = playRestore.sport;
        if (s && (PLAY_SPORT_FILTERS as readonly string[]).includes(s)) {
            setSportFilter(s);
        }
        const g = playRestore.gender;
        if (g && (PLAY_GENDER_FILTERS as readonly string[]).includes(g)) {
            setGenderFilter(g);
        }
    }, [playRestore?.sport, playRestore?.gender]);

    // Restore day: prefer the day of the focused match once `matches` is loaded
    useEffect(() => {
        if (!playRestore?.focusMatchId || matches.length === 0) return;
        const id = parseInt(playRestore.focusMatchId, 10);
        if (Number.isNaN(id)) return;
        const hit = matches.find((x: any) => x.id === id);
        if (!hit?.fecha) return;
        const key = getDateKey(hit.fecha);
        if (sortedDays.includes(key)) setSelectedDay(key);
    }, [playRestore?.focusMatchId, matches, sortedDays]);

    useEffect(() => {
        if (playRestore?.focusMatchId) return;
        const d = playRestore?.day;
        if (d && sortedDays.includes(d)) setSelectedDay(d);
    }, [playRestore?.day, playRestore?.focusMatchId, sortedDays]);

    const currentDayIndex = sortedDays.indexOf(selectedDay);
    const currentDayMatches = dayGroups[selectedDay] || [];
    const dayStatus = currentDayMatches.length > 0 ? getDayStatus(currentDayMatches) : 'open';
    const earliestUpcoming = currentDayMatches.length > 0 ? getEarliestUpcoming(currentDayMatches) : null;

    // Scroll to the card we returned from (after day/filters apply and list renders)
    useEffect(() => {
        const fid = playRestore?.focusMatchId;
        if (!fid || loading) return;
        if (restoredFocusRef.current === fid) return;
        const el = document.getElementById(`quiniela-match-${fid}`);
        if (!el) return;
        restoredFocusRef.current = fid;
        requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [playRestore?.focusMatchId, loading, selectedDay, currentDayMatches.length]);

    const goToPrevDay = () => {
        if (currentDayIndex > 0) setSelectedDay(sortedDays[currentDayIndex - 1]);
    };
    const goToNextDay = () => {
        if (currentDayIndex < sortedDays.length - 1) setSelectedDay(sortedDays[currentDayIndex + 1]);
    };

    const quinielaReturnQuery = useMemo(() => {
        const qs = new URLSearchParams();
        qs.set("from", "quiniela");
        qs.set("tab", "play");
        qs.set("day", selectedDay);
        qs.set("sport", sportFilter);
        qs.set("gender", genderFilter);
        return qs.toString();
    }, [selectedDay, sportFilter, genderFilter]);

    return (
        <div className="space-y-5">
            {/* 1. Sport Selection */}
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
                    {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez'].map(sport => (
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

            {/* 2. Gender Selection */}
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

            {/* ── Day Navigator ── */}
            {!loading && sortedDays.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 space-y-3">
                    {/* Day selector */}
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-2xl border border-white/5 p-3">
                        <button
                            onClick={goToPrevDay}
                            disabled={currentDayIndex <= 0}
                            className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all border",
                                currentDayIndex > 0
                                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                                    : "border-transparent text-white/10 cursor-not-allowed"
                            )}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                                <CalendarDays size={14} className="text-violet-400" />
                                <span className="text-sm font-display font-black text-white uppercase tracking-wider">
                                    {formatDayLabel(selectedDay)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {dayStatus === 'open' && earliestUpcoming && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                                            Abierta • <CountdownTimer targetDate={earliestUpcoming} />
                                        </span>
                                    </div>
                                )}
                                {dayStatus === 'mixed' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                                            Parcialmente abierta
                                        </span>
                                    </div>
                                )}
                                {dayStatus === 'closed' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                                        <Lock size={10} className="text-rose-400" />
                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">En curso</span>
                                    </div>
                                )}
                                {dayStatus === 'finished' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                                        <Trophy size={10} className="text-white/40" />
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">Finalizada</span>
                                    </div>
                                )}
                                <span className="text-[9px] font-bold text-white/30">
                                    {currentDayMatches.length} {currentDayMatches.length === 1 ? 'partido' : 'partidos'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={goToNextDay}
                            disabled={currentDayIndex >= sortedDays.length - 1}
                            className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all border",
                                currentDayIndex < sortedDays.length - 1
                                    ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                                    : "border-transparent text-white/10 cursor-not-allowed"
                            )}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Quick day pills */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                        {sortedDays.map(day => {
                            const status = getDayStatus(dayGroups[day]);
                            const isSelected = day === selectedDay;
                            const matchCount = dayGroups[day].length;
                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 border transition-all",
                                        isSelected
                                            ? "bg-violet-500/20 border-violet-500/30 text-violet-300 shadow-lg scale-105"
                                            : status === 'finished'
                                                ? "bg-white/[0.02] border-white/5 text-white/25 hover:text-white/40"
                                                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {status === 'open' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                    {status === 'mixed' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                    {status === 'closed' && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                                    {status === 'finished' && <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                                    <span>{formatDayLabel(day)}</span>
                                    <span className="text-white/20">{matchCount}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Match List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-violet-400 animate-spin" />
                    <p className="text-sm text-white/40 font-display font-black tracking-wide animate-pulse">Cargando partidos...</p>
                </div>
            ) : currentDayMatches.length === 0 ? (
                <div className="text-center py-20 text-white/40 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                    <AlertTriangle className="mx-auto mb-4 opacity-30 w-10 h-10" />
                    <p className="font-bold text-sm">No hay partidos en esta categoría</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {currentDayMatches.map(m => (
                        <PredictionCard
                            key={m.id}
                            match={m}
                            prediction={predictions.find(p => p.match_id === m.id)}
                            onPredict={onPredict}
                            locked={m.estado === 'finalizado' || m.estado === 'en_curso'}
                            allPredictions={allPredictions}
                            quinielaReturnQuery={quinielaReturnQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
