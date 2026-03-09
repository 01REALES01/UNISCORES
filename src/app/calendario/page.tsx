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

const SPORTS_FILTERS = [
    { id: 'all', label: 'All Sports', icon: Trophy },
    { id: 'Fútbol', label: 'Fútbol' },
    { id: 'Baloncesto', label: 'Baloncesto' },
    { id: 'Tenis', label: 'Tenis' },
    { id: 'Voleibol', label: 'Voleibol' },
    { id: 'Natación', label: 'Natación' }
];

type Match = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    carrera_a?: { nombre: string };
    carrera_b?: { nombre: string };
    estado: 'programado' | 'en_vivo' | 'finalizado';
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
        if (activeFilter === 'live') return matches.filter(m => m.estado === 'en_vivo');
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
        const liveMatch = filteredMatches.find(m => m.estado === 'en_vivo');
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
        <div className="min-h-screen bg-black text-white selection:bg-rose-500/30 font-sans pb-20">
            {/* Ambient Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Main Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex flex-wrap items-center gap-3">
                        {SPORTS_FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 border",
                                    activeFilter === filter.id
                                        ? "bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        : "bg-[#17130D]/80 border-white/5 text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                {filter.icon ? <filter.icon size={16} /> : <SportIcon sport={filter.id} size={16} />}
                                {filter.label}
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
                        Live
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: CALENDAR */}
                    <div className="xl:col-span-2 bg-[#17130D]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">

                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl sm:text-3xl font-black text-white capitalize">
                                {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrevMonth}
                                    className="w-10 h-10 rounded-full bg-[#0a0805] flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
                                >
                                    <ChevronLeft size={20} className="text-white/70" />
                                </button>
                                <button
                                    onClick={handleNextMonth}
                                    className="w-10 h-10 rounded-full bg-[#0a0805] flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
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
                            <div className="grid grid-cols-7 bg-[#0a0805]/50 rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden divide-x divide-y divide-white/5">
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-${i}`} className="aspect-square bg-transparent border-transparent" />
                                ))}

                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                                    const isSelected = isSameDay(selectedDate, dayDate);
                                    const isToday = isSameDay(new Date(), dayDate);

                                    // Check events for this day
                                    const eventsToday = filteredMatches.filter(m => isSameDay(new Date(m.fecha), dayDate));
                                    const hasEvents = eventsToday.length > 0;
                                    const hasLive = eventsToday.some(m => m.estado === 'en_vivo');

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(dayDate)}
                                            className={cn(
                                                "aspect-square flex flex-col items-center justify-start py-2 sm:py-3 transition-all relative group focus:outline-none",
                                                isSelected
                                                    ? "bg-indigo-500/20 z-20 shadow-[inset_0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-inset ring-indigo-500/50"
                                                    : (isToday
                                                        ? "bg-rose-500/10 z-10 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)] ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20"
                                                        : "hover:bg-white/5 hover:z-10")
                                            )}
                                        >
                                            <span className={cn(
                                                "text-sm sm:text-lg font-bold z-10 transition-colors",
                                                isSelected ? "text-indigo-400" : (isToday ? "text-rose-400 font-black" : "text-white/60 group-hover:text-white")
                                            )}>
                                                {i + 1}
                                            </span>

                                            {/* Event Indicators */}
                                            {hasEvents && !isSelected && (
                                                <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 sm:gap-1 w-[90%] flex-wrap">
                                                    {eventsToday.slice(0, 3).map((e, idx) => (
                                                        <div key={idx} className={cn(
                                                            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center bg-[#0a0805] border",
                                                            e.estado === 'en_vivo' ? 'border-rose-500/50 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                                e.estado === 'finalizado' ? 'border-white/10 text-white/30' : 'border-indigo-500/30 text-indigo-400'
                                                        )}>
                                                            <SportIcon sport={e.disciplinas?.name} size={10} className="scale-75 sm:scale-100 transition-transform" />
                                                        </div>
                                                    ))}
                                                    {eventsToday.length > 3 && (
                                                        <div className="text-[8px] sm:text-[9px] font-black text-white/50 pl-0.5">
                                                            +{eventsToday.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Extra details on selected */}
                                            {isSelected && hasEvents && (
                                                <div className="absolute bottom-2 bg-[#0a0805] px-1.5 py-0.5 rounded-md border border-indigo-500/30 text-[9px] font-mono font-black text-indigo-400 z-10">
                                                    {eventsToday.length} EVTS
                                                </div>
                                            )}

                                            {isSelected && (
                                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CARDS */}
                    <div className="space-y-8 flex flex-col">

                        {/* Match of the Day Card */}
                        {matchOfTheDay ? (
                            <div className="bg-gradient-to-br from-[#1A1F2C]/90 to-[#0a0805]/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className={cn(
                                        "text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-lg flex items-center gap-2",
                                        matchOfTheDay.estado === 'en_vivo' ? 'bg-rose-600 shadow-rose-500/50' : 'bg-indigo-600 shadow-indigo-500/50'
                                    )}>
                                        {matchOfTheDay.estado === 'en_vivo' ? <Activity size={14} className="animate-pulse" /> : <Trophy size={14} />}
                                        {matchOfTheDay.estado === 'en_vivo' ? 'En Vivo Ahora' : 'Match of the Day'}
                                    </div>

                                    <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-md">
                                        <SportIcon sport={matchOfTheDay.disciplinas?.name} size={14} /> {matchOfTheDay.disciplinas?.name}
                                    </div>

                                    <div className="flex items-center justify-between w-full mb-8 relative">
                                        <div className="flex flex-col items-center gap-3 w-[40%] text-center">
                                            <Avatar name={matchOfTheDay.carrera_a?.nombre || matchOfTheDay.equipo_a} size="lg" className="w-16 h-16 sm:w-20 sm:h-20 shadow-xl border-2 border-white/10 bg-[#0a0805]" />
                                            <span className="text-xs sm:text-sm font-black line-clamp-2 leading-tight">
                                                {matchOfTheDay.carrera_a?.nombre || matchOfTheDay.equipo_a}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center justify-center w-[20%] relative z-10 shrink-0">
                                            {matchOfTheDay.estado === 'en_vivo' ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tighter drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                                                        {(matchOfTheDay.marcador_detalle?.goles_a || matchOfTheDay.marcador_detalle?.sets_a || matchOfTheDay.marcador_detalle?.total_a || 0)}
                                                        -
                                                        {(matchOfTheDay.marcador_detalle?.goles_b || matchOfTheDay.marcador_detalle?.sets_b || matchOfTheDay.marcador_detalle?.total_b || 0)}
                                                    </span>
                                                    <div className="scale-75 origin-top mt-1">
                                                        <PublicLiveTimer detalle={matchOfTheDay.marcador_detalle} deporte={matchOfTheDay.disciplinas?.name} />
                                                    </div>
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

                                        <div className="flex flex-col items-center gap-3 w-[40%] text-center">
                                            <Avatar name={matchOfTheDay.carrera_b?.nombre || matchOfTheDay.equipo_b} size="lg" className="w-16 h-16 sm:w-20 sm:h-20 shadow-xl border-2 border-white/10 bg-[#0a0805]" />
                                            <span className="text-xs sm:text-sm font-black line-clamp-2 leading-tight">
                                                {matchOfTheDay.carrera_b?.nombre || matchOfTheDay.equipo_b}
                                            </span>
                                        </div>
                                    </div>

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
                                                <button className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-white to-gray-300 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                                                    <Ticket size={16} /> Ir al Partido
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#17130D]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center shadow-2xl min-h-[300px]">
                                <Trophy size={48} className="text-white/10 mb-4" />
                                <h3 className="text-lg font-bold text-white/50">Sin Partido Destacado</h3>
                                <p className="text-sm text-white/30 mt-2 max-w-[200px]">No hay partidos próximos para la fecha o filtro seleccionado.</p>
                            </div>
                        )}

                        {/* Upcoming Fixtures */}
                        <div className="bg-[#17130D]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 sm:p-8 shadow-2xl flex-1 flex flex-col min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-white">
                                    {isSameDay(selectedDate, new Date()) ? 'Encuentros de Hoy' : `Partidos (${selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })})`}
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-black bg-[#0a0805] border-white/10">{upcomingFixtures.length}</Badge>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
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
                                            ¡Día Libre de Competencias!
                                        </h4>
                                        <p className="text-white/50 text-xs sm:text-sm font-bold max-w-[240px] leading-relaxed relative z-10">
                                            Nuestros atletas están descansando. ¡Recarga todas tus energías porque la acción vuelve pronto!
                                        </p>
                                    </div>
                                )}

                                {!loading && upcomingFixtures.map(match => {
                                    const sportBorder = SPORT_BORDER[match.disciplinas?.name] || 'border-indigo-500/20';
                                    const sportAccent = SPORT_ACCENT[match.disciplinas?.name] || 'text-indigo-400';
                                    const isLive = match.estado === 'en_vivo';

                                    return (
                                        <Link key={match.id} href={`/partido/${match.id}`} className="block">
                                            <div className={cn(
                                                "bg-[#0a0805] rounded-2xl border p-4 transition-all hover:bg-white/5 group relative overflow-hidden shadow-lg",
                                                sportBorder
                                            )}>
                                                {/* Optional fade overlay based on sport */}
                                                <div className={`absolute inset-0 bg-gradient-to-r ${SPORT_GRADIENT[match.disciplinas?.name] || 'from-indigo-500/5'} to-transparent opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none`} />

                                                <div className="relative z-10 flex flex-col h-full justify-between">
                                                    <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs uppercase font-black text-white/40 tracking-widest">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "w-6 h-6 rounded-full flex items-center justify-center border",
                                                                isLive ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 text-white/70"
                                                            )}>
                                                                <SportIcon sport={match.disciplinas?.name} size={12} />
                                                            </span>
                                                            <span className={sportAccent}>{match.disciplinas?.name}</span>
                                                            <span className="opacity-50">• {new Date(match.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                        </div>
                                                        {isLive && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]" />}
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <Avatar name={match.carrera_a?.nombre || match.equipo_a} className="w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black bg-[#17130D]" />
                                                            <span className="font-bold text-xs sm:text-sm truncate pr-2">
                                                                {match.carrera_a?.nombre || match.equipo_a}
                                                            </span>
                                                        </div>

                                                        <div className="px-3 shrink-0 flex flex-col items-center justify-center">
                                                            {isLive ? (
                                                                <>
                                                                    <span className="text-sm font-black text-rose-500 tabular-nums">
                                                                        {(match.marcador_detalle?.goles_a || match.marcador_detalle?.sets_a || match.marcador_detalle?.total_a || 0)} - {(match.marcador_detalle?.goles_b || match.marcador_detalle?.sets_b || match.marcador_detalle?.total_b || 0)}
                                                                    </span>
                                                                    <div className="scale-50 origin-top mt-0 flex items-center">
                                                                        <PublicLiveTimer detalle={match.marcador_detalle} deporte={match.disciplinas?.name} />
                                                                    </div>
                                                                </>
                                                            ) : match.estado === 'finalizado' ? (
                                                                <>
                                                                    <span className="text-sm font-black text-white/60 tabular-nums">
                                                                        {(match.marcador_detalle?.goles_a ?? match.marcador_detalle?.sets_a ?? match.marcador_detalle?.total_a ?? 0)} - {(match.marcador_detalle?.goles_b ?? match.marcador_detalle?.sets_b ?? match.marcador_detalle?.total_b ?? 0)}
                                                                    </span>
                                                                    <span className="text-[8px] font-black text-white/30 uppercase mt-0.5">FINAL</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">VS</span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse justify-end">
                                                            <Avatar name={match.carrera_b?.nombre || match.equipo_b} className="w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black bg-[#17130D]" />
                                                            <span className="font-bold text-xs sm:text-sm truncate pl-2 text-right">
                                                                {match.carrera_b?.nombre || match.equipo_b}
                                                            </span>
                                                        </div>
                                                    </div>
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
