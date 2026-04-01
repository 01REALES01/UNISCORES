"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    ChevronLeft, ChevronRight, Trophy, Ticket,
    Activity, MapPin, BatteryCharging
} from "lucide-react";
import Link from "next/link";
import { SPORT_ACCENT, SPORT_BORDER } from "@/lib/constants";
import { Avatar, Badge } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { SportIcon } from "@/components/sport-icons";
import { useMatches } from "@/hooks/use-matches";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";

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
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 font-sans pb-20 relative overflow-hidden">
            {/* AMBIENT HYBRID BACKGROUND - Controlled, institutional chromatic light */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            {/* Background Element Watermark */}
            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-start overflow-hidden opacity-20">
                <img 
                    src="/elementos/08.png" 
                    alt="" 
                    className="w-[700px] md:w-[1000px] h-auto -translate-x-[20%] translate-y-[10%]" 
                    aria-hidden="true"
                />
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
                                    "flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl transition-all duration-300 relative overflow-hidden group border",
                                    activeFilter === filter.id
                                        ? "bg-violet-600/90 border-violet-500/50 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] scale-105"
                                        : "bg-white/5 backdrop-blur-sm border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {/* Active subtle inner glow */}
                                {activeFilter === filter.id && <div className="absolute inset-0 bg-gradient-to-t from-violet-400/20 to-transparent pointer-events-none" />}
                                
                                {filter.icon ? <filter.icon size={20} className="relative z-10" /> : <SportIcon sport={filter.id} size={20} className="relative z-10" />}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setActiveFilter('live')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all border relative overflow-hidden group",
                            activeFilter === 'live'
                                ? "bg-emerald-500/90 border-emerald-400/50 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                                : "bg-emerald-500/10 border-emerald-500/20 backdrop-blur-sm text-emerald-400 hover:bg-emerald-500/20"
                        )}
                    >
                        {activeFilter === 'live' && <div className="absolute inset-0 bg-gradient-to-t from-emerald-400/30 to-transparent pointer-events-none" />}
                        <Activity size={16} className={cn("relative z-10", activeFilter === 'live' ? "animate-bounce" : "animate-pulse")} />
                        <span className="relative z-10">En Curso</span>
                    </button>
                </div>

                {/* ━━━ INSTITUTIONAL BRAND BREAK ━━━ */}
                <div className="mt-2 mb-10 relative z-0">
                    <InstitutionalBanner variant={3} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: CALENDAR */}
                    {/* HYBRID GLASS CARD */}
                    <div className="xl:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl p-6 sm:p-8 flex flex-col min-h-[500px]">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl sm:text-3xl font-black text-white capitalize drop-shadow-sm">
                                {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrevMonth}
                                    className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                                >
                                    <ChevronLeft size={20} className="text-white/70" />
                                </button>
                                <button
                                    onClick={handleNextMonth}
                                    className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
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
                                    <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-violet-300/60 uppercase tracking-widest">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-7 bg-background/40 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden divide-x divide-y divide-white/5 shadow-inner">
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-start-${i}`} className="aspect-square pointer-events-none" />
                                ))}

                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                                    const isSelected = isSameDay(selectedDate, dayDate);
                                    const isToday = isSameDay(new Date(), dayDate);

                                    const eventsToday = filteredMatches.filter(m => isSameDay(new Date(m.fecha), dayDate));
                                    const hasEvents = eventsToday.length > 0;
                                    
                                    const uniqueSportsMap = new Map<string, string>();
                                    eventsToday.forEach(e => {
                                        const sportName = e.disciplinas?.name;
                                        if (!sportName) return;
                                        const currentStatus = uniqueSportsMap.get(sportName);
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
                                                    ? "bg-violet-600/80 backdrop-blur-md z-20 shadow-[inset_0_0_20px_rgba(124,58,237,0.5)] border border-violet-400/30"
                                                    : (isToday
                                                        ? "bg-emerald-500/10 z-10 hover:bg-emerald-500/20 border border-emerald-500/20"
                                                        : "hover:bg-white/5 hover:z-10")
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[11px] sm:text-lg font-bold z-10 transition-colors",
                                                isSelected ? "text-white drop-shadow-md" : (isToday ? "text-emerald-400 font-black drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]" : "text-white/60 group-hover:text-white")
                                            )}>
                                                {i + 1}
                                            </span>

                                            {/* Event Indicators */}
                                            {hasEvents && !isSelected && (
                                                <div className="absolute bottom-0.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 sm:gap-1 w-[90%] flex-wrap" title={`${eventsToday.length} eventos en total`}>
                                                    {uniqueSportsEvents.slice(0, 3).map((s, idx) => (
                                                        <div key={idx} className={cn(
                                                            "w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center bg-background border",
                                                            s.estado === 'en_curso' ? 'border-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                                s.estado === 'finalizado' ? 'border-white/10 text-white/30' : 'border-violet-500/30 text-violet-400'
                                                        )}>
                                                            <SportIcon sport={s.name} size={12} className="scale-[0.8] sm:scale-100" variant="react" />
                                                        </div>
                                                    ))}
                                                    {uniqueSportsEvents.length > 3 && (
                                                        <div className="text-[7px] sm:text-[9px] font-black text-white/50 pl-0.5">
                                                            +{uniqueSportsEvents.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isSelected && hasEvents && (
                                                <div className="absolute bottom-1 sm:bottom-2 bg-background/80 px-1 py-0 sm:py-0.5 rounded-md border border-violet-400/30 text-[7px] sm:text-[9px] font-mono font-bold text-white z-10 shadow-sm">
                                                    {eventsToday.length} EVTS
                                                </div>
                                            )}
                                            
                                            {/* Subtle gradient overlay for selection */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-violet-400/20 to-transparent pointer-events-none" />
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
                    <div className="space-y-6 flex flex-col">
                        
                        {/* Match of the Day Card - HIGH IMPACT HYBRID */}
                        {matchOfTheDay ? (
                            <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-[2rem] border border-white/20 p-6 sm:p-8 flex flex-col relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] group">
                                {/* Decor Lighting */}
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                                <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-violet-500/20 rounded-full blur-[60px]" />
                                {matchOfTheDay.estado === 'en_curso' && (
                                    <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-emerald-500/20 rounded-full blur-[60px]" />
                                )}

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className={cn(
                                        "text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 flex items-center gap-2 shadow-lg border",
                                        matchOfTheDay.estado === 'en_curso' ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-emerald-400' : 'bg-violet-600/40 border-violet-500/50 shadow-[0_0_15px_rgba(124,58,237,0.3)] text-violet-200'
                                    )}>
                                        {matchOfTheDay.estado === 'en_curso' ? <Activity size={14} className="animate-pulse" /> : <Trophy size={14} />}
                                        {matchOfTheDay.estado === 'en_curso' ? 'En Curso Ahora' : 'Partido del Día'}
                                    </div>

                                    <div className="text-[10px] text-white/80 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 bg-black/30 px-3 py-1 rounded-md border border-white/10 backdrop-blur-sm">
                                        <SportIcon sport={matchOfTheDay.disciplinas?.name ?? ''} size={16} variant="react" /> {matchOfTheDay.disciplinas?.name}
                                    </div>

                                    {matchOfTheDay.marcador_detalle?.tipo === 'carrera' ? (
                                        <div className="flex flex-col items-center justify-center w-full relative z-10 py-2 sm:py-4 gap-4 mb-8">
                                            <div className="flex flex-col items-center bg-black/20 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] px-6 py-4 rounded-3xl w-full max-w-sm backdrop-blur-sm">
                                                <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight text-center drop-shadow-md">
                                                    {matchOfTheDay.marcador_detalle?.distancia}
                                                </h4>
                                                <span className="text-xs sm:text-sm font-bold text-violet-300 uppercase tracking-widest mt-1 text-center">
                                                    {matchOfTheDay.marcador_detalle?.estilo}
                                                </span>
                                            </div>

                                            {matchOfTheDay.estado === 'finalizado' ? (
                                                <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center mb-1">Resultados Finales</span>
                                                    {Array.isArray(matchOfTheDay.marcador_detalle?.participantes) &&
                                                    [...matchOfTheDay.marcador_detalle.participantes]
                                                        .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                                        .slice(0, 3)
                                                        .map((p: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between bg-black/30 border border-white/5 px-4 py-3 rounded-2xl backdrop-blur-sm">
                                                            <div className="flex items-center gap-3">
                                                                <span className={cn(
                                                                    "text-sm sm:text-base font-black w-6 text-center drop-shadow-md",
                                                                    p.posicion === 1 ? "text-amber-400 shadow-amber-400" :
                                                                    p.posicion === 2 ? "text-slate-300 shadow-slate-300" :
                                                                    p.posicion === 3 ? "text-amber-600 shadow-amber-600" : "text-white/50"
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
                                                            <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                                                <Activity size={16} className="animate-pulse" />
                                                                En Progreso
                                                            </span>
                                                            <span className="text-xs font-bold text-white/70 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">{matchOfTheDay.marcador_detalle?.participantes?.length || 0} Participantes</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3 mt-2">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-3xl sm:text-4xl font-black tracking-tighter text-white drop-shadow-lg">
                                                                    {new Date(matchOfTheDay.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-white/50 uppercase mt-1 tracking-widest">HOY</span>
                                                            </div>
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
                                                        "w-16 h-16 sm:w-20 sm:h-20 shrink-0 border-2 bg-background shadow-xl transition-all duration-500",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0) > (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0)
                                                            ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110"
                                                            : "border-white/20 opacity-90"
                                                    )} 
                                                />
                                                <div className="flex flex-col min-w-0 items-center w-full">
                                                    <span className={cn(
                                                        "text-xs sm:text-sm font-bold w-full truncate block leading-tight",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0) > (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0) ? "text-white" : "text-white/70"
                                                    )}>
                                                        {getDisplayName(matchOfTheDay, 'a')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center justify-center shrink-0 min-w-[100px] sm:min-w-[140px]">
                                                {matchOfTheDay.estado === 'en_curso' ? (
                                                    <div className="flex flex-col items-center">
                                                        {matchOfTheDay.disciplinas?.name === 'Ajedrez' ? (
                                                            <span className="text-sm sm:text-base font-black text-emerald-400 tracking-widest drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">VS</span>
                                                        ) : (
                                                            <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
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
                                                            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest px-3 py-1 bg-black/30 border border-white/10 rounded-lg backdrop-blur-sm">
                                                                {matchOfTheDay.marcador_detalle?.goles_a === matchOfTheDay.marcador_detalle?.goles_b ? 'EMPATE' : 'FINAL'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-lg">
                                                                {(matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.sets_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0)}
                                                                -
                                                                {(matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.sets_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0)}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-bold text-white/50 uppercase mt-1 tracking-widest">
                                                            FINALIZADO
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white drop-shadow-lg">
                                                            {new Date(matchOfTheDay.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-white/50 uppercase mt-1 tracking-widest">
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
                                                        "w-16 h-16 sm:w-20 sm:h-20 shrink-0 border-2 bg-background shadow-xl transition-all duration-500",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0) > (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0)
                                                            ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-110"
                                                            : "border-white/20 opacity-90"
                                                    )} 
                                                />
                                                <div className="flex flex-col min-w-0 items-center w-full">
                                                    <span className={cn(
                                                        "text-xs sm:text-sm font-bold w-full truncate block leading-tight",
                                                        matchOfTheDay.estado === 'finalizado' && (matchOfTheDay.marcador_detalle?.goles_b ?? matchOfTheDay.marcador_detalle?.total_b ?? 0) > (matchOfTheDay.marcador_detalle?.goles_a ?? matchOfTheDay.marcador_detalle?.total_a ?? 0) ? "text-white" : "text-white/70"
                                                    )}>
                                                        {getDisplayName(matchOfTheDay, 'b')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col w-full gap-3 text-center">
                                        <Link href={`/mapa?lugar=${encodeURIComponent(matchOfTheDay.lugar || '')}`} className="w-full">
                                            <div className="flex items-center justify-center gap-2 text-xs font-medium text-violet-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-400/30 transition-all px-4 py-3 rounded-xl w-full mb-2 backdrop-blur-sm group shadow-sm">
                                                <MapPin size={14} className="group-hover:text-violet-200" />
                                                <span className="truncate">{matchOfTheDay.lugar}</span>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-3 w-full">
                                            <Link href={`/partido/${matchOfTheDay.id}`} className="flex-1">
                                                <button className="w-full bg-violet-600 text-white hover:bg-violet-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border border-violet-400/50">
                                                    <Ticket size={16} /> Ver Detalles
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center min-h-[300px] shadow-2xl">
                                <Trophy size={48} className="text-white/10 mb-4" />
                                <h3 className="text-lg font-bold text-white/50">Sin Partido Destacado</h3>
                                <p className="text-sm text-white/30 mt-2 max-w-[200px]">No hay partidos próximos para la fecha o filtro seleccionado.</p>
                            </div>
                        )}

                        {/* Upcoming Fixtures - HYBRID LIST */}
                        <div className="bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl p-6 sm:p-8 flex-1 flex flex-col min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white drop-shadow-sm">
                                    {isSameDay(selectedDate, new Date()) ? 'Encuentros de Hoy' : `Partidos (${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })})`}
                                </h3>
                                <Badge variant="outline" className="text-[10px] bg-black/30 border-white/10 text-white/70 backdrop-blur-md">{upcomingFixtures.length}</Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar content-start">
                                {loading && (
                                    <div className="text-center py-6 text-white/30 text-xs font-bold uppercase animate-pulse tracking-widest">Cargando...</div>
                                )}

                                {!loading && upcomingFixtures.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-black/20 border border-white/5 rounded-2xl backdrop-blur-sm shadow-inner group transition-all hover:bg-white/5">
                                        <BatteryCharging size={40} className="text-white/20 mb-4 group-hover:text-violet-400/50 transition-colors" />
                                        <h4 className="text-white font-bold text-lg mb-2">¡Día Libre!</h4>
                                        <p className="text-white/50 text-xs sm:text-sm font-medium max-w-[240px]">
                                            No hay eventos programados para esta fecha.
                                        </p>
                                    </div>
                                )}

                                {!loading && upcomingFixtures.map(match => {
                                    const sportAccent = SPORT_ACCENT[match.disciplinas?.name ?? ''] || 'text-violet-400';
                                    const isLive = match.estado === 'en_curso';

                                    return (
                                        <Link key={match.id} href={`/partido/${match.id}`} className="block">
                                            <div className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-4 transition-all relative overflow-hidden group shadow-md hover:shadow-xl backdrop-blur-sm">
                                                {/* Subtle gradient hover */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/10 group-hover:to-transparent transition-all pointer-events-none opacity-0 group-hover:opacity-100" />
                                                
                                                <div className="relative z-10 flex flex-col h-full justify-between">
                                                    <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs uppercase font-bold text-white/50 tracking-widest">
                                                        <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                                                            <span className={cn(
                                                                "w-5 h-5 rounded-full flex items-center justify-center border",
                                                                isLive ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/10 border-white/10 text-white/70"
                                                            )}>
                                                                <SportIcon sport={match.disciplinas?.name ?? ''} size={14} variant="react" />
                                                            </span>
                                                            <span className={sportAccent}>{match.disciplinas?.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span>{new Date(match.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                            {isLive && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                                                        </div>
                                                    </div>

                                                    {match.marcador_detalle?.tipo === 'carrera' ? (
                                                        <div className="flex flex-col items-center justify-center w-full py-3 bg-black/20 border border-white/5 rounded-xl mt-2">
                                                            <h5 className="text-sm font-bold text-white uppercase tracking-tight text-center drop-shadow-sm">
                                                                {match.marcador_detalle?.distancia}
                                                            </h5>
                                                            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mt-0.5">
                                                                {match.marcador_detalle?.estilo}
                                                            </span>
                                                            
                                                            {match.estado === 'finalizado' ? (
                                                                <div className="flex flex-col gap-1 w-full px-4 sm:px-6 mt-3">
                                                                    {Array.isArray(match.marcador_detalle?.participantes) && 
                                                                     [...match.marcador_detalle.participantes]
                                                                        .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                                                        .slice(0, 3)
                                                                        .map((p: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between items-center bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg">
                                                                            <div className="flex gap-2 items-center">
                                                                                <span className={cn(
                                                                                    "text-[10px] font-bold w-4 text-center",
                                                                                    p.posicion === 1 ? "text-amber-400 shadow-amber-400" :
                                                                                    p.posicion === 2 ? "text-slate-300 shadow-slate-300" :
                                                                                    p.posicion === 3 ? "text-amber-600 shadow-amber-600" : "text-white/50"
                                                                                )}>#{p.posicion}</span>
                                                                                <span className="text-[10px] text-white/80 truncate max-w-[100px]">{p.nombre}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-mono text-emerald-400">{p.tiempo}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-3">
                                                                    <span className="text-[10px] text-white/50 font-medium bg-black/30 border border-white/5 px-3 py-1 rounded-full">
                                                                        {match.marcador_detalle?.participantes?.length || 0} Participantes
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between mt-2">
                                                            {/* Team A */}
                                                            <div className="flex items-center gap-3 flex-1 min-w-0 bg-black/10 px-3 py-2 rounded-l-xl border-y border-l border-white/5">
                                                                <Avatar 
                                                                    name={getDisplayName(match, 'a')} 
                                                                    src={match.atleta_a?.avatar_url || match.carrera_a?.escudo_url}
                                                                    className={cn(
                                                                        "w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black shrink-0 border bg-background shadow-md",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0) > (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0)
                                                                            ? "border-emerald-500"
                                                                            : "border-white/10 opacity-90"
                                                                    )} 
                                                                />
                                                                <div className="flex flex-col flex-1 min-w-0 pr-1">
                                                                    <span className={cn(
                                                                        "font-bold text-xs sm:text-sm truncate block w-full",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0) > (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0) ? "text-white" : "text-white/70"
                                                                    )}>
                                                                        {getDisplayName(match, 'a')}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="px-3 shrink-0 min-w-[70px] sm:min-w-[90px] flex flex-col items-center justify-center bg-black/20 py-2 border-y border-white/5 h-full">
                                                                {isLive ? (
                                                                    <>
                                                                        {match.disciplinas?.name === 'Ajedrez' ? (
                                                                            <span className="text-xs font-bold text-emerald-400 uppercase drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">VS</span>
                                                                        ) : (
                                                                            <span className="text-sm font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                                                                {(match.marcador_detalle?.goles_a || match.marcador_detalle?.sets_a || match.marcador_detalle?.total_a || 0)} - {(match.marcador_detalle?.goles_b || match.marcador_detalle?.sets_b || match.marcador_detalle?.total_b || 0)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                ) : match.estado === 'finalizado' ? (
                                                                    <>
                                                                        {match.disciplinas?.name === 'Ajedrez' ? (
                                                                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                                                                {match.marcador_detalle?.goles_a === match.marcador_detalle?.goles_b ? 'EMP' : 'FIN'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-sm font-black text-white/90">
                                                                                {(match.marcador_detalle?.goles_a ?? match.marcador_detalle?.sets_a ?? match.marcador_detalle?.total_a ?? 0)} - {(match.marcador_detalle?.goles_b ?? match.marcador_detalle?.sets_b ?? match.marcador_detalle?.total_b ?? 0)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">VS</span>
                                                                )}
                                                            </div>

                                                            {/* Team B */}
                                                            <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse justify-end bg-black/10 px-3 py-2 rounded-r-xl border-y border-r border-white/5">
                                                                <Avatar 
                                                                    name={getDisplayName(match, 'b')} 
                                                                    src={match.atleta_b?.avatar_url || match.carrera_b?.escudo_url}
                                                                    className={cn(
                                                                        "w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black shrink-0 border bg-background shadow-md",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0) > (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0)
                                                                            ? "border-emerald-500"
                                                                            : "border-white/10 opacity-90"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col flex-1 min-w-0 items-end text-right pl-1">
                                                                    <span className={cn(
                                                                        "font-bold text-xs sm:text-sm truncate block w-full",
                                                                        match.estado === 'finalizado' && (match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0) > (match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0) ? "text-white" : "text-white/70"
                                                                    )}>
                                                                        {getDisplayName(match, 'b')}
                                                                    </span>
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
