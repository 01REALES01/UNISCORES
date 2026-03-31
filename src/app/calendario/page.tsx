"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    ChevronLeft, ChevronRight, Trophy, Bell, Ticket,
    Activity, ArrowLeft, Calendar as CalendarIcon, MapPin, BatteryCharging, Flame
} from "lucide-react";
import Link from "next/link";
import { SPORT_EMOJI, SPORT_GRADIENT, SPORT_ACCENT, SPORT_BORDER } from "@/lib/constants";
import { Avatar, Button, Badge } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { SportIcon } from "@/components/sport-icons";
import { useMatches } from "@/hooks/use-matches";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";

const SPORTS_FILTERS = [
    { id: 'all', label: 'Todos', icon: Trophy },
    { id: 'Fútbol', label: 'Fútbol' },
    { id: 'Baloncesto', label: 'Baloncesto' },
    { id: 'Tenis', label: 'Tenis' },
    { id: 'Tenis de Mesa', label: 'Tenis de Mesa' },
    { id: 'Voleibol', label: 'Voleibol' },
    { id: 'Natación', label: 'Natación' },
    { id: 'Ajedrez', label: 'Ajedrez' }
];

type Match = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    atleta_a?: any;
    atleta_b?: any;
    carrera_a?: { nombre: string };
    carrera_b?: { nombre: string };
    estado: 'programado' | 'en_curso' | 'finalizado';
    fecha: string;
    lugar: string;
    marcador_detalle: any;
    disciplinas: { name: string; emoji?: string; icon?: string };
};

export default function CalendarioPage() {
    const { user, profile, isStaff } = useAuth();
    const { matches, loading } = useMatches();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [activeFilter, setActiveFilter] = useState('all');

    // Calendar logic
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    // 0 is Sunday, let's make Monday 0 for standard display
    let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() - 1;
    if (firstDayOfMonth === -1) firstDayOfMonth = 6; // Sunday becomes 6

    const totalCells = firstDayOfMonth + daysInMonth;
    const trailingEmptyCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Filtered data
    const filteredMatches = useMemo(() => {
        if (activeFilter === 'all') return matches;
        if (activeFilter === 'live') return matches.filter(m => m.estado === 'en_curso');
        return matches.filter(m => m.disciplinas?.name === activeFilter);
    }, [matches, activeFilter]);

    // Matches for selected date
    const selectedDateMatches = useMemo(() => {
        return filteredMatches.filter(m => {
            const matchDate = new Date(m.fecha);
            return isSameDay(matchDate, selectedDate);
        });
    }, [filteredMatches, selectedDate]);

    // Match of the Day (First live or next upcoming overall, or last finished)
    const matchOfTheDay = useMemo(() => {
        const liveMatch = filteredMatches.find(m => m.estado === 'en_curso');
        if (liveMatch) return liveMatch;
        const upcomingMatches = filteredMatches.filter(m => new Date(m.fecha) >= new Date() && m.estado === 'programado');
        if (upcomingMatches.length > 0) return upcomingMatches[0];

        // If no live or upcoming, show the most recently finished
        const finishedMatches = filteredMatches.filter(m => m.estado === 'finalizado').sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        return finishedMatches[0] || null;
    }, [filteredMatches]);

    // Matches strictly for the selected date
    const upcomingFixtures = useMemo(() => {
        let list = [...selectedDateMatches];
        if (matchOfTheDay) {
            list = list.filter(m => m.id !== matchOfTheDay.id);
        }
        return list;
    }, [selectedDateMatches, matchOfTheDay]);

    return (
        <div className="min-h-screen bg-background text-white selection:bg-indigo-500/30 font-sans pb-20">
            {/* Ambient Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Main Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {SPORTS_FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                title={filter.label}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-300 border",
                                    activeFilter === filter.id
                                        ? "bg-indigo-500/20 border-indigo-500/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-110"
                                        : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:scale-105"
                                )}
                            >
                                {filter.icon ? <filter.icon size={20} /> : <SportIcon sport={filter.id} size={20} />}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setActiveFilter('live')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all",
                            activeFilter === 'live'
                                ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                                : "bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
                        )}
                    >
                        <Activity size={16} className={cn(activeFilter === 'live' ? "animate-bounce" : "animate-pulse")} />
                        En Curso
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: CALENDAR */}
                    <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">

                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl sm:text-3xl font-black text-white capitalize">
                                {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrevMonth}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
                                >
                                    <ChevronLeft size={20} className="text-white/70" />
                                </button>
                                <button
                                    onClick={handleNextMonth}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
                                >
                                    <ChevronRight size={20} className="text-white/70" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex-1">
                            {/* Days of week */}
                            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map((day) => (
                                    <div key={day} className="text-center text-[10px] sm:text-xs font-black text-white/30 uppercase tracking-widest">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-7 bg-background/50 rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden divide-x divide-y divide-white/5">
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-start-${i}`} className="aspect-square pointer-events-none" />
                                ))}

                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                                    const isSelected = isSameDay(selectedDate, dayDate);
                                    const isToday = isSameDay(new Date(), dayDate);

                                    // Check events for this day
                                    const eventsToday = filteredMatches.filter(m => isSameDay(new Date(m.fecha), dayDate));
                                    const hasEvents = eventsToday.length > 0;
                                    
                                    // Group events by sport to only show one icon per sport
                                    const uniqueSportsMap = new Map<string, string>();
                                    eventsToday.forEach(e => {
                                        const sportName = e.disciplinas?.name;
                                        if (!sportName) return;
                                        const currentStatus = uniqueSportsMap.get(sportName);
                                        // Prioritize status: en_curso > programado > finalizado
                                        if (!currentStatus) {
                                            uniqueSportsMap.set(sportName, e.estado);
                                        } else if (e.estado === 'en_curso') {
                                            uniqueSportsMap.set(sportName, 'en_curso');
                                        } else if (e.estado === 'programado' && currentStatus === 'finalizado') {
                                            uniqueSportsMap.set(sportName, 'programado');
                                        }
                                    });
                                    const uniqueSportsEvents = Array.from(uniqueSportsMap.entries()).map(([name, estado]) => ({ name, estado }));

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(dayDate)}
                                            className={cn(
                                                "aspect-square flex flex-col items-center justify-start py-1 sm:py-3 transition-all relative group focus:outline-none",
                                                isSelected
                                                    ? "bg-indigo-500/20 z-20 shadow-[inset_0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-inset ring-indigo-500/50"
                                                    : (isToday
                                                        ? "bg-rose-500/10 z-10 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)] ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20"
                                                        : "hover:bg-white/5 hover:z-10")
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[11px] sm:text-lg font-bold z-10 transition-colors",
                                                isSelected ? "text-indigo-400" : (isToday ? "text-rose-400 font-black" : "text-white/60 group-hover:text-white")
                                            )}>
                                                {i + 1}
                                            </span>

                                            {/* Event Indicators */}
                                            {hasEvents && !isSelected && (
                                                <div className="absolute bottom-0.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 sm:gap-1 w-[90%] flex-wrap cursor-pointer" title={`${eventsToday.length} eventos en total`}>
                                                    {uniqueSportsEvents.slice(0, 3).map((s, idx) => (
                                                        <div key={idx} className={cn(
                                                            "w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center bg-background border",
                                                            s.estado === 'en_curso' ? 'border-rose-500/50 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                                s.estado === 'finalizado' ? 'border-white/10 text-white/30' : 'border-indigo-500/30 text-indigo-400'
                                                        )}>
                                                            <SportIcon sport={s.name} size={10} className="scale-[0.6] sm:scale-100 transition-transform" />
                                                        </div>
                                                    ))}
                                                    {uniqueSportsEvents.length > 3 && (
                                                        <div className="text-[7px] sm:text-[9px] font-black text-white/50 pl-0.5">
                                                            +{uniqueSportsEvents.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Extra details on selected */}
                                            {isSelected && hasEvents && (
                                                <div className="absolute bottom-1 sm:bottom-2 bg-background px-1 py-0 sm:py-0.5 rounded-md border border-indigo-500/30 text-[7px] sm:text-[9px] font-mono font-black text-indigo-400 z-10">
                                                    {eventsToday.length} EVTS
                                                </div>
                                            )}

                                            {isSelected && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none" />
                                            )}
                                        </button>
                                    );
                                })}

                                {Array.from({ length: trailingEmptyCells }).map((_, i) => (
                                    <div key={`empty-end-${i}`} className="aspect-square pointer-events-none" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CARDS */}
                    <div className="space-y-8 flex flex-col">

                        {/* Match of the Day Card */}
                        {matchOfTheDay ? (
                            <div className="bg-gradient-to-br from-indigo-950/40 to-[#0a0805]/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className={cn(
                                        "text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-lg flex items-center gap-2",
                                        matchOfTheDay.estado === 'en_curso' ? 'bg-rose-600 shadow-rose-500/50' : 'bg-indigo-600 shadow-indigo-500/50'
                                    )}>
                                        {matchOfTheDay.estado === 'en_curso' ? <Activity size={14} className="animate-pulse" /> : <Trophy size={14} />}
                                        {matchOfTheDay.estado === 'en_curso' ? 'En Curso Ahora' : 'Partido del Día'}
                                    </div>

                                    <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-md">
                                        <SportIcon sport={matchOfTheDay.disciplinas?.name ?? ''} size={14} /> {matchOfTheDay.disciplinas?.name}
                                    </div>

                                    {matchOfTheDay.marcador_detalle?.tipo === 'carrera' ? (
                                        <div className="flex flex-col items-center justify-center w-full relative z-10 py-2 sm:py-4 gap-4 mb-8">
                                            {/* Race details */}
                                            <div className="flex flex-col items-center bg-white/5 px-6 py-4 rounded-3xl border border-white/10 w-full max-w-sm shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                                                <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight text-center">
                                                    {matchOfTheDay.marcador_detalle?.distancia}
                                                </h4>
                                                <span className="text-xs sm:text-sm font-bold text-indigo-400 uppercase tracking-widest mt-1 text-center">
                                                    {matchOfTheDay.marcador_detalle?.estilo}
                                                </span>
                                            </div>

                                            {/* Status/Participants */}
                                            {matchOfTheDay.estado === 'finalizado' ? (
                                                <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center mb-1">Resultados Finales</span>
                                                    {Array.isArray(matchOfTheDay.marcador_detalle?.participantes) &&
                                                    [...matchOfTheDay.marcador_detalle.participantes]
                                                        .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                                        .slice(0, 3)
                                                        .map((p: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
                                                            <div className="flex items-center gap-3">
                                                                <span className={cn(
                                                                    "text-sm sm:text-base font-black w-6 text-center",
                                                                    p.posicion === 1 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" :
                                                                    p.posicion === 2 ? "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]" :
                                                                    p.posicion === 3 ? "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]" : "text-white/50"
                                                                )}>
                                                                    #{p.posicion}
                                                                </span>
                                                                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px]">{p.nombre}</span>
                                                            </div>
                                                            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 tabular-nums">{p.tiempo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    {matchOfTheDay.estado === 'en_curso' ? (
                                                        <div className="flex flex-col items-center gap-3 mt-2">
                                                            <span className="text-sm font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)] flex items-center gap-2">
                                                                <Activity size={16} className="animate-pulse" />
                                                                En Progreso
                                                            </span>
                                                            <span className="text-xs font-bold text-white/50 bg-black/40 px-4 py-1.5 rounded-full">{matchOfTheDay.marcador_detalle?.participantes?.length || 0} Participantes</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3 mt-2">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-3xl sm:text-4xl font-black tracking-tighter text-[#FFC000]">
                                                                    {new Date(matchOfTheDay.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className="text-[9px] font-black text-white/30 uppercase mt-1">HOY</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white/50 bg-black/40 px-4 py-1.5 rounded-full">{matchOfTheDay.marcador_detalle?.participantes?.length || 0} Participantes registrados</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between w-full mb-8 relative">
                                            <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0 text-center px-2 sm:px-4">
                                                <Avatar 
                                                    name={getDisplayName(matchOfTheDay, 'a')} 
                                                    src={matchOfTheDay.atleta_a?.avatar_url || matchOfTheDay.carrera_a?.escudo_url}
                                                    size="lg" 
                                                    className={cn(
                                                        "w-16 h-16 sm:w-20 sm:h-20 shadow-xl transition-all duration-500 border-2 bg-background shrink-0",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0) > (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0)
                                                            ? (
                                                                matchOfTheDay.disciplinas?.name === 'Fútbol' ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Baloncesto' ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Voleibol' ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Tenis' ? "border-lime-500 shadow-[0_0_30px_rgba(132,204,22,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Tenis de Mesa' ? "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Ajedrez' ? "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Natación' ? "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] scale-110" :
                                                                "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110"
                                                            )
                                                            : "border-white/10 opacity-60"
                                                    )} 
                                                />
                                                <div className="flex flex-col min-w-0 items-center w-full">
                                                    <span className={cn(
                                                        "text-xs sm:text-sm font-black w-full truncate block leading-tight",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0) > (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0) ? "text-white" : "text-white/40"
                                                    )}>
                                                        {getDisplayName(matchOfTheDay, 'a')}
                                                    </span>
                                                    {getCarreraSubtitle(matchOfTheDay, 'a') && <span className="text-[10px] text-white/40 font-bold truncate block w-full">{getCarreraSubtitle(matchOfTheDay, 'a')}</span>}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center justify-center shrink-0 min-w-[100px] sm:min-w-[140px] relative z-10">
                                                {matchOfTheDay.estado === 'en_curso' ? (
                                                    <div className="flex flex-col items-center">
                                                        {matchOfTheDay.disciplinas?.name === 'Ajedrez' ? (
                                                            <span className="text-sm sm:text-base font-black text-rose-500 tracking-widest bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/30">VS</span>
                                                        ) : (
                                                            <span className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tighter drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                                                                {(matchOfTheDay.marcador_detalle?.goles_a || matchOfTheDay.marcador_detalle?.sets_a || matchOfTheDay.marcador_detalle?.total_a || 0)}
                                                                -
                                                                {(matchOfTheDay.marcador_detalle?.goles_b || matchOfTheDay.marcador_detalle?.sets_b || matchOfTheDay.marcador_detalle?.total_b || 0)}
                                                            </span>
                                                        )}
                                                        <div className="scale-75 origin-top mt-1">
                                                            <PublicLiveTimer detalle={matchOfTheDay.marcador_detalle} deporte={matchOfTheDay.disciplinas?.name} />
                                                        </div>
                                                    </div>
                                                ) : matchOfTheDay.estado === 'finalizado' ? (
                                                    <div className="flex flex-col items-center">
                                                        {matchOfTheDay.disciplinas?.name === 'Ajedrez' ? (
                                                            <span className="text-xs sm:text-sm font-black text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                                                                {matchOfTheDay.marcador_detalle?.goles_a === matchOfTheDay.marcador_detalle?.goles_b ? 'EMPATE' : 'FINAL'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                                                {(matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.sets_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0)}
                                                                -
                                                                {(matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.sets_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0)}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-black text-white/30 uppercase mt-1">
                                                            FINALIZADO
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl sm:text-3xl font-black tracking-tighter text-[#FFC000]">
                                                            {new Date(matchOfTheDay.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[9px] font-black text-white/30 uppercase mt-1">
                                                            HOY
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1 min-w-0 text-center px-2 sm:px-4">
                                                <Avatar 
                                                    name={getDisplayName(matchOfTheDay, 'b')} 
                                                    src={matchOfTheDay.atleta_b?.avatar_url || matchOfTheDay.carrera_b?.escudo_url}
                                                    size="lg" 
                                                    className={cn(
                                                        "w-16 h-16 sm:w-20 sm:h-20 shadow-xl transition-all duration-500 border-2 bg-background shrink-0",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0) > (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0)
                                                            ? (
                                                                matchOfTheDay.disciplinas?.name === 'Fútbol' ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Baloncesto' ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Voleibol' ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Tenis' ? "border-lime-500 shadow-[0_0_30px_rgba(132,204,22,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Tenis de Mesa' ? "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Ajedrez' ? "border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.5)] scale-110" :
                                                                matchOfTheDay.disciplinas?.name === 'Natación' ? "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] scale-110" :
                                                                "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110"
                                                            )
                                                            : "border-white/10 opacity-60"
                                                    )} 
                                                />
                                                <div className="flex flex-col min-w-0 items-center w-full">
                                                    <span className={cn(
                                                        "text-xs sm:text-sm font-black w-full truncate block leading-tight",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0) > (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0) ? "text-white" : "text-white/40"
                                                    )}>
                                                        {getDisplayName(matchOfTheDay, 'b')}
                                                    </span>
                                                    {getCarreraSubtitle(matchOfTheDay, 'b') && <span className="text-[10px] text-white/40 font-bold truncate block w-full">{getCarreraSubtitle(matchOfTheDay, 'b')}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col w-full gap-3 text-center">
                                        <Link href={`/mapa?lugar=${encodeURIComponent(matchOfTheDay.lugar || '')}`} className="w-full">
                                            <div className="flex items-center justify-center gap-2 text-xs font-mono text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors px-4 py-2 rounded-xl w-full mb-2 cursor-pointer shadow-sm group">
                                                <MapPin size={14} className="group-hover:text-indigo-200 transition-colors" />
                                                <span className="truncate">{matchOfTheDay.lugar}</span>
                                                <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-auto" />
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-3 w-full">
                                            <Link href={`/partido/${matchOfTheDay.id}`} className="flex-1">
                                                <button className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-white to-gray-200 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                                                    <Ticket size={16} /> Ver Detalles
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center shadow-2xl min-h-[300px]">
                                <Trophy size={48} className="text-white/10 mb-4" />
                                <h3 className="text-lg font-bold text-white/50">Sin Partido Destacado</h3>
                                <p className="text-sm text-white/30 mt-2 max-w-[200px]">No hay partidos próximos para la fecha o filtro seleccionado.</p>
                            </div>
                        )}

                        {/* Upcoming Fixtures */}
                        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 sm:p-8 shadow-2xl flex-1 flex flex-col min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white">
                                    {isSameDay(selectedDate, new Date()) ? 'Encuentros de Hoy' : `Partidos (${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })})`}
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-black bg-background border-white/10">{upcomingFixtures.length}</Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar content-start">
                                {loading && (
                                    <div className="text-center py-6 text-white/30 text-xs font-bold uppercase animate-pulse">Cargando...</div>
                                )}

                                {!loading && upcomingFixtures.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-3xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                        <div className="w-16 h-16 mb-4 relative z-10 flex items-center justify-center group-hover:-translate-y-2 transition-transform duration-500">
                                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                                            <BatteryCharging size={40} className="text-amber-400 drop-shadow-2xl" />
                                        </div>
                                        <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-rose-400 font-black text-lg sm:text-xl mb-2 tracking-tight relative z-10">
                                            ¡Día Libre!
                                        </h4>
                                        <p className="text-white/50 text-xs sm:text-sm font-bold max-w-[240px] leading-relaxed relative z-10">
                                            No hay eventos programados para esta fecha. ¡Descansa y prepárate para lo que viene!
                                        </p>
                                    </div>
                                )}

                                {!loading && upcomingFixtures.map(match => {
                                    const sportBorder = SPORT_BORDER[match.disciplinas?.name ?? ''] || 'border-indigo-500/20';
                                    const sportAccent = SPORT_ACCENT[match.disciplinas?.name ?? ''] || 'text-indigo-400';
                                    const isLive = match.estado === 'en_curso';

                                    return (
                                        <Link key={match.id} href={`/partido/${match.id}`} className="block">
                                            <div className={cn(
                                                "bg-background rounded-2xl border p-4 transition-all hover:bg-white/5 group relative overflow-hidden shadow-lg",
                                                sportBorder
                                            )}>
                                                {/* Optional fade overlay based on sport */}
                                                <div className={`absolute inset-0 bg-gradient-to-r ${SPORT_GRADIENT[match.disciplinas?.name ?? ''] || 'from-indigo-500/5'} to-transparent opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none`} />

                                                <div className="relative z-10 flex flex-col h-full justify-between">
                                                    <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs uppercase font-black text-white/40 tracking-widest">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center border",
                                                                isLive ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 text-white/70"
                                                            )}>
                                                                <SportIcon sport={match.disciplinas?.name ?? ''} size={12} />
                                                            </span>
                                                            <span className={sportAccent}>{match.disciplinas?.name}</span>
                                                            <span className="opacity-50">• {new Date(match.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                        </div>
                                                        {isLive && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]" />}
                                                    </div>

                                                    {match.marcador_detalle?.tipo === 'carrera' ? (
                                                        <div className="flex flex-col items-center justify-center w-full py-3 bg-black/20 rounded-xl border border-white/5 mt-2">
                                                            <h5 className="text-sm font-black text-white uppercase tracking-tight truncate px-4 text-center">
                                                                {match.marcador_detalle?.distancia}
                                                            </h5>
                                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">
                                                                {match.marcador_detalle?.estilo}
                                                            </span>
                                                            
                                                            {match.estado === 'finalizado' ? (
                                                                <div className="flex flex-col gap-1 w-full px-6 mt-3">
                                                                    {Array.isArray(match.marcador_detalle?.participantes) && 
                                                                     [...match.marcador_detalle.participantes]
                                                                        .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                                                        .slice(0, 3)
                                                                        .map((p: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                                            <div className="flex gap-2 items-center">
                                                                                <span className={cn(
                                                                                    "text-[10px] sm:text-xs font-black w-4 text-center",
                                                                                    p.posicion === 1 ? "text-amber-400" :
                                                                                    p.posicion === 2 ? "text-slate-300" :
                                                                                    p.posicion === 3 ? "text-amber-600" : "text-white/50"
                                                                                )}>#{p.posicion}</span>
                                                                                <span className="text-[10px] sm:text-xs font-bold text-white/80 truncate max-w-[100px]">{p.nombre}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-mono text-emerald-400 tabular-nums">{p.tiempo}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-3">
                                                                    <span className="text-[10px] font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                                                        {match.marcador_detalle?.participantes?.length || 0} Participantes
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between mt-2">
                                                            {/* Team A */}
                                                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                                                <Avatar 
                                                                    name={getDisplayName(match, 'a')} 
                                                                    src={match.atleta_a?.avatar_url || match.carrera_a?.escudo_url}
                                                                    className={cn(
                                                                        "w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black bg-background transition-all duration-500 border-2 shrink-0",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0) > (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0)
                                                                            ? (
                                                                                match.disciplinas?.name === 'Fútbol' ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" :
                                                                                match.disciplinas?.name === 'Baloncesto' ? "border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" :
                                                                                match.disciplinas?.name === 'Voleibol' ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]" :
                                                                                match.disciplinas?.name === 'Tenis' ? "border-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.4)]" :
                                                                                match.disciplinas?.name === 'Tenis de Mesa' ? "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" :
                                                                                match.disciplinas?.name === 'Ajedrez' ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.4)]" :
                                                                                match.disciplinas?.name === 'Natación' ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]" :
                                                                                "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                                                            )
                                                                            : "border-white/10 opacity-60"
                                                                    )} 
                                                                />
                                                                <div className="flex flex-col flex-1 min-w-0 pr-2">
                                                                    <span className={cn(
                                                                        "font-bold text-xs sm:text-sm truncate block w-full",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0) > (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0) ? "text-white" : "text-white/40"
                                                                    )}>
                                                                        {getDisplayName(match, 'a')}
                                                                    </span>
                                                                    {getCarreraSubtitle(match, 'a') && (
                                                                        <span className="text-[9px] text-white/40 truncate block w-full font-bold">{getCarreraSubtitle(match, 'a')}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="px-2 sm:px-3 shrink-0 min-w-[70px] sm:min-w-[90px] flex flex-col items-center justify-center">
                                                                {isLive ? (
                                                                    <>
                                                                        {match.disciplinas?.name === 'Ajedrez' ? (
                                                                            <span className="text-xs font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">VS</span>
                                                                        ) : (
                                                                            <span className="text-sm font-black text-rose-500 tabular-nums">
                                                                                {(match.marcador_detalle?.goles_a || match.marcador_detalle?.sets_a || match.marcador_detalle?.total_a || 0)} - {(match.marcador_detalle?.goles_b || match.marcador_detalle?.sets_b || match.marcador_detalle?.total_b || 0)}
                                                                            </span>
                                                                        )}
                                                                        <div className="scale-75 origin-top mt-0 flex items-center">
                                                                            <PublicLiveTimer detalle={match.marcador_detalle} deporte={match.disciplinas?.name} />
                                                                        </div>
                                                                    </>
                                                                ) : match.estado === 'finalizado' ? (
                                                                    <>
                                                                        {match.disciplinas?.name === 'Ajedrez' ? (
                                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/20">
                                                                                {match.marcador_detalle?.goles_a === match.marcador_detalle?.goles_b ? 'EMPATE' : 'FIN'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-sm font-black text-white tabular-nums">
                                                                                {(match.marcador_detalle?.goles_a ?? match.marcador_detalle?.sets_a ?? match.marcador_detalle?.total_a ?? 0)} - {(match.marcador_detalle?.goles_b ?? match.marcador_detalle?.sets_b ?? match.marcador_detalle?.total_b ?? 0)}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[8px] font-black text-white/30 uppercase mt-0.5">{match.disciplinas?.name === 'Ajedrez' ? '' : 'FINAL'}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">VS</span>
                                                                )}
                                                            </div>

                                                            {/* Team B */}
                                                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 flex-row-reverse justify-end">
                                                                <Avatar 
                                                                    name={getDisplayName(match, 'b')} 
                                                                    src={match.atleta_b?.avatar_url || match.carrera_b?.escudo_url}
                                                                    className={cn(
                                                                        "w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black bg-background transition-all duration-500 border-2 shrink-0",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0) > (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0)
                                                                            ? (
                                                                                match.disciplinas?.name === 'Fútbol' ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" :
                                                                                match.disciplinas?.name === 'Baloncesto' ? "border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" :
                                                                                match.disciplinas?.name === 'Voleibol' ? "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]" :
                                                                                match.disciplinas?.name === 'Tenis' ? "border-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.4)]" :
                                                                                match.disciplinas?.name === 'Tenis de Mesa' ? "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" :
                                                                                match.disciplinas?.name === 'Ajedrez' ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.4)]" :
                                                                                match.disciplinas?.name === 'Natación' ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]" :
                                                                                "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                                                                            )
                                                                            : "border-white/10 opacity-60"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col flex-1 min-w-0 items-end text-right pl-2">
                                                                    <span className={cn(
                                                                        "font-bold text-xs sm:text-sm truncate block w-full",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0) > (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0) ? "text-white" : "text-white/40"
                                                                    )}>
                                                                        {getDisplayName(match, 'b')}
                                                                    </span>
                                                                    {getCarreraSubtitle(match, 'b') && (
                                                                        <span className="text-[9px] text-white/40 truncate block w-full font-bold">{getCarreraSubtitle(match, 'b')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
