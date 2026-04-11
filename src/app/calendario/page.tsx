"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    ChevronLeft, ChevronRight, Trophy, Ticket,
    Activity, MapPin, BatteryCharging
} from "lucide-react";
import Link from "next/link";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_COLORS } from "@/lib/constants";
import { Avatar, Badge } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { SportIcon } from "@/components/sport-icons";
import { useMatches } from "@/hooks/use-matches";
import { useJornadas } from "@/hooks/use-jornadas";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayName, getCarreraSubtitle, getAbbr } from "@/lib/sport-helpers";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";
import { JornadaCard } from "@/modules/matches/components/match-card";

// Helper for shield URLs
function getShieldUrl(match: any, side: "a" | "b") {
    if (side === "a") {
        return (
            match.atleta_a?.avatar_url ||
            match.carrera_a?.escudo_url ||
            match.delegacion_a_info?.escudo_url
        );
    }
    return (
        match.atleta_b?.avatar_url ||
        match.carrera_b?.escudo_url ||
        match.delegacion_b_info?.escudo_url
    );
}

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
    const { jornadas, loading: jornadasLoading } = useJornadas();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedGender, setSelectedGender] = useState<string>("todos");

    // Calendar logic
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    let firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() - 1;
    if (firstDayOfMonth === -1) firstDayOfMonth = 6;

    const totalCells = firstDayOfMonth + daysInMonth;
    const trailingEmptyCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            if (activeFilter !== 'all') {
                if (activeFilter === 'live') {
                    if (m.estado !== 'en_curso') return false;
                } else if (m.disciplinas?.name !== activeFilter) return false;
            }
            const matchGender = (m.genero || 'masculino').toLowerCase();
            if (selectedGender !== 'todos' && matchGender !== selectedGender.toLowerCase() && matchGender !== 'mixto') return false;
            return true;
        });
    }, [matches, activeFilter, selectedGender]);

    const filteredJornadas = useMemo(() => {
        return jornadas.filter(j => {
            if (activeFilter !== 'all' && activeFilter !== 'live' && j.disciplinas?.name !== activeFilter) return false;
            if (activeFilter === 'live' && j.estado !== 'en_curso') return false;
            if (selectedGender !== 'todos' && j.genero !== selectedGender && j.genero !== 'mixto') return false;
            return true;
        });
    }, [jornadas, activeFilter, selectedGender]);

    const selectedDateMatches = useMemo(() => {
        return filteredMatches.filter(m => {
            const matchDate = new Date(m.fecha);
            return isSameDay(matchDate, selectedDate);
        });
    }, [filteredMatches, selectedDate]);

    const selectedDateJornadas = useMemo(() => {
        return filteredJornadas.filter(j => isSameDay(new Date(j.scheduled_at), selectedDate));
    }, [filteredJornadas, selectedDate]);

    const matchOfTheDay = useMemo(() => {
        const liveMatch = filteredMatches.find(m => m.estado === 'en_curso');
        if (liveMatch) return liveMatch;
        const upcomingMatches = filteredMatches.filter(m => new Date(m.fecha) >= new Date() && m.estado === 'programado');
        if (upcomingMatches.length > 0) return upcomingMatches[0];
        const finishedMatches = filteredMatches.filter(m => m.estado === 'finalizado').sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        return finishedMatches[0] || null;
    }, [filteredMatches]);

    const upcomingFixtures = useMemo(() => {
        let list = [...selectedDateMatches];
        if (matchOfTheDay) {
            list = list.filter(m => m.id !== matchOfTheDay.id);
        }
        return list;
    }, [selectedDateMatches, matchOfTheDay]);

    return (
        <div className="min-h-screen bg-background text-white selection:bg-white/10 font-sans pb-20 relative overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-start overflow-hidden opacity-30">
                <img 
                    src="/elementos/08.png" 
                    alt="" 
                    className="w-[800px] h-auto -translate-x-[15%] translate-y-[10%] filter contrast-110 brightness-100 rotate-[-10deg]" 
                    aria-hidden="true"
                />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1400px] mx-auto px-4 sm:px-8 relative z-10 pt-10 pb-32">
                <header className="mb-12 flex flex-col items-center text-center gap-4">
                    <div className="animate-in fade-in zoom-in duration-1000">
                        <div className="flex items-center justify-center gap-2 mb-2">
                             <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <Activity size={20} className="text-emerald-400" />
                            </div>
                            <h4 className="text-xs font-black text-emerald-400 tracking-[0.2em] uppercase">Calendario Olímpico</h4>
                        </div>
                        <h1 className="text-6xl sm:text-8xl font-bold tracking-tighter leading-none font-display text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                            Agenda <span className="text-emerald-400">2026</span>
                        </h1>
                    </div>
                </header>

                <div className="sticky top-[72px] z-40 -mx-4 px-4 py-8 mb-12 transition-all duration-300">
                    <div className="flex flex-col gap-4 sm:gap-8 max-w-6xl mx-auto">
                        <div className="flex justify-center w-full">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 px-1 w-full max-w-5xl justify-start sm:justify-center group">
                                {SPORTS_FILTERS.map((filter) => {
                                    const isActive = activeFilter === filter.id;
                                    return (
                                        <button
                                            key={filter.id}
                                            onClick={() => setActiveFilter(filter.id)}
                                            className={cn(
                                                "group/btn relative min-w-[90px] sm:min-w-[110px] h-20 sm:h-28 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center border transition-all duration-500 overflow-hidden shrink-0",
                                                isActive
                                                    ? "bg-violet-600/20 border-violet-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-105"
                                                    : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.08] backdrop-blur-3xl"
                                            )}
                                        >
                                            {isActive && <div className="absolute inset-0 bg-gradient-to-b from-violet-100/50 to-transparent pointer-events-none" />}
                                            <div className="z-10 flex flex-col items-center gap-3">
                                                {filter.icon ? (
                                                    <filter.icon size={isActive ? 38 : 28} className={cn("transition-all duration-500", isActive ? "text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "text-white/20")} />
                                                ) : (
                                                    <SportIcon sport={filter.id} size={isActive ? 38 : 30} className={cn("transition-all duration-500", isActive ? "drop-shadow-[0_0_10px_rgba(139,92,246,0.6)] scale-110" : "opacity-60 group-hover/btn:opacity-100")} />
                                                )}
                                                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] transition-colors", isActive ? "text-violet-400" : "text-white/30 group-hover/btn:text-white/60")}>
                                                    {filter.label}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                            <div className="flex gap-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl max-w-full overflow-x-auto no-scrollbar scroll-smooth">
                                {[
                                    { label: 'Todos', value: 'todos', icon: '⚥' },
                                    { label: 'Masculino', value: 'masculino', icon: '♂' },
                                    { label: 'Femenino', value: 'femenino', icon: '♀' },
                                ].map((g) => {
                                    const isSelected = selectedGender === g.value;
                                    return (
                                        <button
                                            key={g.value}
                                            onClick={() => setSelectedGender(g.value)}
                                            className={cn(
                                                "relative flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-6 py-2.5 rounded-full text-[10px] font-display font-black tracking-widest transition-all overflow-hidden border whitespace-nowrap shrink-0",
                                                isSelected ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-xl scale-105" : "bg-transparent border-transparent text-white/30 hover:text-white/60"
                                            )}
                                        >
                                            <span className={cn("text-sm leading-none", isSelected ? "text-[#7C3AED]" : "text-violet-400")}>{g.icon}</span>
                                            <span className="uppercase">{g.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setActiveFilter(activeFilter === 'live' ? 'all' : 'live')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border relative overflow-hidden group",
                                    activeFilter === 'live' ? "bg-emerald-600 border-emerald-500 text-white shadow-lg" : "bg-white/[0.03] border-white/10 text-emerald-400 hover:bg-white/[0.08] backdrop-blur-3xl shadow-xl"
                                )}
                            >
                                <Activity size={14} className={cn(activeFilter === 'live' ? "animate-bounce" : "animate-pulse")} />
                                <span>En Curso</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-2 mb-10 relative z-0">
                    <InstitutionalBanner variant={3} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* LEFT COLUMN: CALENDAR */}
                    <div className="xl:col-span-2 bg-black/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/[0.05] shadow-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl sm:text-4xl font-black text-white capitalize drop-shadow-md font-display tracking-tighter">
                                {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={handlePrevMonth} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all text-white/40 hover:text-white">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={handleNextMonth} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all text-white/40 hover:text-white">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <div className="grid grid-cols-7 mb-3 px-1">
                                {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map((day) => (
                                    <div key={day} className="text-center text-[8px] sm:text-[9px] font-black text-white/20 uppercase tracking-[0.2em] font-sans">{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 border border-white/5 rounded-[1.5rem] overflow-hidden divide-x divide-y divide-white/[0.03] bg-black/20 shadow-inner">
                                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                    <div key={`empty-start-${i}`} className="aspect-square bg-white/[0.01]" />
                                ))}

                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                                    const isSelected = isSameDay(selectedDate, dayDate);
                                    const isToday = isSameDay(new Date(), dayDate);
                                    const eventsToday = filteredMatches.filter(m => isSameDay(new Date(m.fecha), dayDate));
                                    const jornadasToday = filteredJornadas.filter(j => isSameDay(new Date(j.scheduled_at), dayDate));
                                    const hasEvents = eventsToday.length > 0 || jornadasToday.length > 0;
                                    const uniqueSportsMap = new Map<string, string>();
                                    eventsToday.forEach(e => {
                                        const sportName = e.disciplinas?.name;
                                        if (sportName) uniqueSportsMap.set(sportName, e.estado);
                                    });
                                    jornadasToday.forEach(j => {
                                        const sportName = j.disciplinas?.name;
                                        if (sportName) uniqueSportsMap.set(sportName, j.estado);
                                    });
                                    const uniqueSportsEvents = Array.from(uniqueSportsMap.entries()).map(([name, estado]) => ({ name, estado }));

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDate(dayDate)}
                                            className={cn(
                                                "aspect-square flex flex-col items-center justify-between py-2 sm:py-3 transition-opacity relative group focus:outline-none overflow-hidden",
                                                isSelected ? "bg-[#7C3AED] z-10" : (isToday ? "bg-emerald-500/10 z-0 border border-emerald-500/20" : "hover:bg-white/[0.05]")
                                            )}
                                        >
                                            <span className={cn("text-xs sm:text-lg font-black transition-colors font-display", isSelected ? "text-white" : (isToday ? "text-emerald-400" : "text-white/30 group-hover:text-white/60"))}>
                                                {i + 1}
                                            </span>
                                            {hasEvents && (
                                                <div className={cn("mb-1 flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 px-0.5", isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100")}>
                                                    {uniqueSportsEvents.slice(0, 3).map((s, idx) => (
                                                        <div key={idx} className={cn("transition-colors", s.estado === 'en_curso' ? "text-emerald-400" : isSelected ? "text-white/80" : "text-violet-400")}>
                                                            <SportIcon sport={s.name} size={isSelected ? 10 : 9} variant="react" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {isSelected && hasEvents && (
                                                <div className="absolute top-1 right-1 bg-black/40 px-1 py-0.5 rounded-md text-[6px] font-black text-white/90 z-10 backdrop-blur-sm">{eventsToday.length} EVTS</div>
                                            )}
                                        </button>
                                    );
                                })}

                                {Array.from({ length: trailingEmptyCells }).map((_, i) => (
                                    <div key={`empty-end-${i}`} className="aspect-square bg-white/[0.01]" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CARDS — Improved for better readability and premium look */}
                    <div className="space-y-6 flex flex-col xl:min-w-[420px]">
                        {matchOfTheDay ? (
                            <div className="bg-black/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/[0.05] p-6 sm:p-7 flex flex-col relative overflow-hidden shadow-2xl group transition-all duration-500">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                {matchOfTheDay.estado === 'en_curso' && (
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
                                )}

                                <div className="relative z-10 flex flex-col items-center w-full">
                                    <div className={cn(
                                        "text-[#311651] text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full mb-6 flex items-center gap-2 shadow-xl border-2 border-white/20",
                                        matchOfTheDay.estado === 'en_curso' ? 'bg-emerald-400' : 'bg-[#F5F5DC]'
                                    )}>
                                        {matchOfTheDay.estado === 'en_curso' ? <Activity size={10} className="animate-pulse" /> : <Trophy size={10} />}
                                        {matchOfTheDay.estado === 'en_curso' ? 'En Vivo Ahora' : 'Partido Destacado'}
                                    </div>

                                    <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/5 border border-white/5 rounded-xl backdrop-blur-xl shrink-0">
                                        <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center">
                                            <SportIcon sport={matchOfTheDay.disciplinas?.name ?? ''} size={12} variant="react" className="text-violet-400" />
                                        </div>
                                        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.1em]">{matchOfTheDay.disciplinas?.name}</span>
                                    </div>

                                    {matchOfTheDay.marcador_detalle?.tipo === 'carrera' ? (
                                        <div className="flex flex-col items-center justify-center w-full relative z-10 py-2 gap-6 mb-4">
                                            <div className="flex flex-col items-center bg-black/40 border border-white/10 shadow-inner px-10 py-8 rounded-[3rem] w-full max-w-sm">
                                                <h4 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter text-center drop-shadow-md">{matchOfTheDay.marcador_detalle?.distancia}</h4>
                                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-[0.4em] mt-3 text-center opacity-80">{matchOfTheDay.marcador_detalle?.estilo}</span>
                                            </div>
                                            {matchOfTheDay.estado === 'finalizado' && (
                                                <div className="flex flex-col gap-3 w-full max-w-sm mt-4">
                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] text-center mb-2">Podio Final</span>
                                                    {Array.isArray(matchOfTheDay.marcador_detalle?.participantes) &&
                                                        [...matchOfTheDay.marcador_detalle.participantes]
                                                            .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                                            .slice(0, 3)
                                                            .map((p: any, idx: number) => (
                                                                <div key={idx} className="flex items-center justify-between bg-white/[0.03] border border-white/5 px-6 py-4 rounded-[2rem] group/podio hover:bg-white/[0.08] transition-all">
                                                                    <div className="flex items-center gap-4">
                                                                        <span className={cn("text-2xl font-black w-8 text-center", p.posicion === 1 ? "drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse" : p.posicion === 2 ? "opacity-90" : p.posicion === 3 ? "opacity-70" : "opacity-20")}>
                                                                            {p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : p.posicion === 3 ? '🥉' : `#${p.posicion}`}
                                                                        </span>
                                                                        <span className="text-sm font-black text-white/90 truncate max-w-[160px]">{p.nombre}</span>
                                                                    </div>
                                                                    <span className="text-sm font-mono font-black text-emerald-400 tabular-nums">{p.tiempo}</span>
                                                                </div>
                                                            ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between w-full mb-10 relative px-2 gap-2">
                                            {(() => {
                                                const det = matchOfTheDay.marcador_detalle || {};
                                                const isTenis = matchOfTheDay.disciplinas?.name === 'Tenis' || matchOfTheDay.disciplinas?.name === 'Tenis de Mesa';
                                                
                                                const scoreA = isTenis ? (det.sets_a ?? 0) : (det.goles_a ?? det.puntos_a ?? det.total_a ?? 0);
                                                const scoreB = isTenis ? (det.sets_b ?? 0) : (det.goles_b ?? det.puntos_b ?? det.total_b ?? 0);
                                                const winnerSide = matchOfTheDay.estado === 'finalizado' && scoreA !== scoreB ? (scoreA > scoreB ? 'a' : 'b') : null;
                                                const shieldA = getShieldUrl(matchOfTheDay, 'a');
                                                const shieldB = getShieldUrl(matchOfTheDay, 'b');

                                                return (
                                                    <>
                                                        <div className="flex flex-col items-center gap-3 flex-1">
                                                            <div className="relative">
                                                                <Avatar 
                                                                    name={getDisplayName(matchOfTheDay, 'a')} 
                                                                    src={shieldA} 
                                                                    size="lg" 
                                                                    className={cn(
                                                                        "w-16 h-16 transition-all duration-500",
                                                                        winnerSide === "a" ? "border-[3px] border-amber-400 scale-110 shadow-[0_0_20px_rgba(251,191,36,0.4)]" : "border-2 border-white/5 bg-black/40"
                                                                    )} 
                                                                />
                                                                {winnerSide === "a" && (
                                                                    <div className="absolute -top-1 -right-1 z-20 bg-amber-500 rounded-full p-0.5 shadow-lg">
                                                                        <Trophy size={10} className="text-black" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-[0.15em] leading-tight text-center max-w-[80px] transition-colors",
                                                                winnerSide === "a" ? "text-white" : winnerSide === "b" ? "text-white/40" : "text-white/20"
                                                            )}>
                                                                {getDisplayName(matchOfTheDay, 'a')}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[100px] sm:min-w-[140px]">
                                                            {matchOfTheDay.estado === 'en_curso' ? (
                                                                <div className="flex flex-col items-center gap-3">
                                                                    {matchOfTheDay.disciplinas?.name === 'Ajedrez' ? (
                                                                        <span className="text-xl font-black text-emerald-400 tracking-[0.3em] animate-pulse">VS</span>
                                                                    ) : (
                                                                        <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-md leading-none tabular-nums">
                                                                            {scoreA}-{scoreB}
                                                                        </span>
                                                                    )}
                                                                    <div className="scale-90"><PublicLiveTimer detalle={matchOfTheDay.marcador_detalle} deporte={matchOfTheDay.disciplinas?.name} /></div>
                                                                </div>
                                                            ) : matchOfTheDay.estado === 'finalizado' ? (
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter drop-shadow-lg leading-none tabular-nums">
                                                                        {scoreA}-{scoreB}
                                                                    </span>
                                                                    <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.2em]">Finalizado</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-4xl sm:text-5xl font-black tracking-tighter text-white drop-shadow-lg leading-none">
                                                                        {new Date(matchOfTheDay.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                    </span>
                                                                    <div className="mt-3 px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
                                                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em]">{isSameDay(new Date(matchOfTheDay.fecha), new Date()) ? 'HOY' : 'PROGRAMADO'}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col items-center gap-3 flex-1">
                                                            <div className="relative">
                                                                <Avatar 
                                                                    name={getDisplayName(matchOfTheDay, 'b')} 
                                                                    src={shieldB} 
                                                                    size="lg" 
                                                                    className={cn(
                                                                        "w-16 h-16 transition-all duration-500",
                                                                        winnerSide === "b" ? "border-[3px] border-amber-400 scale-110 shadow-[0_0_20px_rgba(251,191,36,0.4)]" : "border-2 border-white/5 bg-black/40"
                                                                    )} 
                                                                />
                                                                {winnerSide === "b" && (
                                                                    <div className="absolute -top-1 -right-1 z-20 bg-amber-500 rounded-full p-0.5 shadow-lg">
                                                                        <Trophy size={10} className="text-black" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-[0.15em] leading-tight text-center max-w-[80px] transition-colors",
                                                                winnerSide === "b" ? "text-white" : winnerSide === "a" ? "text-white/40" : "text-white/20"
                                                            )}>
                                                                {getDisplayName(matchOfTheDay, 'b')}
                                                            </span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    <div className="flex flex-col w-full gap-4 mt-4">
                                        <div className="flex items-center justify-center gap-2 text-[8px] font-black text-white/20 bg-black/20 border border-white/5 px-4 py-3 rounded-xl w-full shadow-inner tracking-[0.1em] uppercase mb-4">
                                            <MapPin size={12} className="text-emerald-400/40" />
                                            <span className="truncate">{matchOfTheDay.lugar}</span>
                                        </div>
                                        <Link href={`/partido/${matchOfTheDay.id}`} className="w-full">
                                            <button className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 text-[#311651] hover:from-emerald-500 hover:to-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] border border-white/10">
                                                <Ticket size={14} className="opacity-60" />
                                                Ver Detalles
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-black/20 border border-white/5 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center min-h-[350px] shadow-sm backdrop-blur-xl">
                                <Trophy size={64} className="text-white/[0.03] mb-6" />
                                <h3 className="text-xl font-black text-white/20 uppercase tracking-widest">Sin Destacados</h3>
                                <p className="text-xs text-white/10 mt-3 uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">No hay eventos próximos.</p>
                            </div>
                        )}

                        <div className="bg-black/20 backdrop-blur-3xl rounded-[3rem] border border-white/[0.05] shadow-2xl p-8 flex-1 flex flex-col min-h-[450px]">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-white tracking-tighter uppercase">Encuentros</h3>
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1 opacity-60">{selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}</span>
                                </div>
                                <div className="px-5 py-2.5 bg-black/40 rounded-2xl border border-white/10 flex items-center gap-3 shadow-inner">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-sm font-black text-white/60 tabular-nums">{upcomingFixtures.length + selectedDateJornadas.length}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 flex-1 overflow-y-auto pr-2 custom-scrollbar content-start">
                                {loading || jornadasLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                                        <Activity size={48} className="animate-spin text-white" />
                                        <span className="text-[10px] font-black uppercase tracking-[1em] ml-[1em]">Cargando</span>
                                    </div>
                                ) : upcomingFixtures.length === 0 && selectedDateJornadas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-black/20 border border-white/5 rounded-[3rem] group transition-all">
                                        <div className="w-20 h-20 rounded-[2.5rem] bg-white/[0.03] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700 border border-white/5 group-hover:border-emerald-500/20">
                                            <BatteryCharging size={40} className="text-white/5 group-hover:text-emerald-400/40 transition-colors" />
                                        </div>
                                        <h4 className="text-white/40 font-black text-xl mb-3 uppercase tracking-tight">Día Libre</h4>
                                        <p className="text-white/[0.08] text-[10px] uppercase tracking-[0.3em] leading-relaxed max-w-[220px]">No hay más eventos programados.</p>
                                    </div>
                                ) : (
                                    <>
                                    {selectedDateJornadas.map(jornada => (
                                        <JornadaCard key={`jornada-${jornada.id}`} jornada={jornada} />
                                    ))}
                                    {upcomingFixtures.map(match => {
                                        const sportName = match.disciplinas?.name || 'Deporte';
                                        const sportAccent = SPORT_ACCENT[sportName] || 'text-violet-500';
                                        const sportColor = SPORT_COLORS[sportName] || '#a78bfa';
                                        const isLive = match.estado === 'en_curso';
                                        const isFinished = match.estado === 'finalizado';
                                        const genero = (match.genero || 'masculino').toLowerCase();
                                        const isRace = match.marcador_detalle?.tipo === 'carrera';
                                        const det = match.marcador_detalle || {};
                                        
                                        // Standard scoring logic
                                        const isTenis = sportName === 'Tenis' || sportName === 'Tenis de Mesa';
                                        const scoreA = isTenis ? (det.sets_a ?? 0) : (det.goles_a ?? det.puntos_a ?? det.total_a ?? 0);
                                        const scoreB = isTenis ? (det.sets_b ?? 0) : (det.goles_b ?? det.puntos_b ?? det.total_b ?? 0);

                                        // Winner logic
                                        const winnerSide = isFinished && scoreA !== scoreB ? (scoreA > scoreB ? 'a' : 'b') : null;

                                        const shieldA = getShieldUrl(match, 'a');
                                        const shieldB = getShieldUrl(match, 'b');

                                        // Sport icon from public folder
                                        const sportIconMap: Record<string, string> = {
                                            "Fútbol": "/FutbolIcono.png",
                                            "Baloncesto": "/BasketIcono.png",
                                            "Voleibol": "/VolleyIcono.png",
                                            "Tenis": "/TenisIcono.png",
                                            "Tenis de Mesa": "/TenisDMIcono.png",
                                            "Ajedrez": "/AjedrezIcono.png",
                                            "Natación": "/NatacionIcono.png",
                                        };
                                        const sportWatermark = sportIconMap[sportName];

                                        return (
                                            <Link key={match.id} href={`/partido/${match.id}`} className="block group/item">
                                                <div
                                                    className={cn(
                                                        "border rounded-2xl sm:rounded-[2rem] p-5 sm:p-7 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] group/card",
                                                        isLive ? "border-emerald-500/40" : "border-white/[0.08]"
                                                    )}
                                                    style={{
                                                        background: `radial-gradient(ellipse at 0% 0%, ${sportColor}18 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${sportColor}12 0%, transparent 55%)`,
                                                    }}
                                                >
                                                    {/* Sport watermark icon */}
                                                    {sportWatermark && (
                                                        <div
                                                            className="absolute -right-3 -bottom-3 pointer-events-none select-none z-0 transition-all duration-700 group-hover/card:scale-110 group-hover/card:opacity-[0.14]"
                                                            style={{ opacity: 0.08 }}
                                                        >
                                                            <img src={sportWatermark} alt="" className="w-28 h-28 sm:w-36 sm:h-36 object-contain" />
                                                        </div>
                                                    )}

                                                    {/* Radial glow */}
                                                    <div
                                                        className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full blur-[80px] pointer-events-none z-0 opacity-25"
                                                        style={{ backgroundColor: sportColor }}
                                                    />

                                                    {isLive && <div className="absolute inset-0 bg-emerald-500/[0.03] pointer-events-none" />}

                                                    <div className="relative z-10 flex flex-col gap-5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={cn(
                                                                        "w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-lg",
                                                                        isLive
                                                                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-110"
                                                                            : "bg-black/40"
                                                                    )}
                                                                    style={!isLive ? { borderColor: `${sportColor}40`, backgroundColor: `${sportColor}12` } : undefined}
                                                                >
                                                                    <SportIcon sport={sportName} size={24} variant="react" className={cn("transition-all", isLive ? "text-emerald-400" : sportAccent)} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={cn("text-xs font-black uppercase tracking-[0.25em]", sportAccent)}>{sportName}</span>
                                                                    <div className="flex items-center gap-2 mt-1.5">
                                                                        <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border", genero === 'femenino' ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : genero === 'mixto' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400")}>{genero}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <span className="text-base font-black text-white tabular-nums drop-shadow-md">{new Date(match.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                                                {isLive ? (
                                                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full shadow-lg">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.1em]">LIVE</span>
                                                                    </div>
                                                                ) : isFinished ? <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Finalizado</span> : null}
                                                            </div>
                                                        </div>

                                                        {isRace ? (
                                                            <div className="bg-black/60 border border-white/5 rounded-[2rem] p-6 flex flex-col items-center gap-3 shadow-inner">
                                                                <span className="text-lg font-black text-white tracking-tight text-center leading-tight">{det.distancia} {det.estilo}</span>
                                                                {isFinished ? (
                                                                    <div className="flex gap-4 mt-4 w-full justify-center overflow-x-auto no-scrollbar py-2">
                                                                        {(Array.isArray(det.participantes) ? det.participantes : []).sort((a: any, b: any) => (a.posicion || 99) - (b.posicion || 99)).slice(0, 3).map((p: any, idx: number) => (
                                                                            <div key={idx} className="flex flex-col items-center gap-2 bg-white/[0.02] px-5 py-4 rounded-[1.5rem] border border-white/5 min-w-[95px] hover:bg-white/[0.05] transition-all">
                                                                                <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                                                <span className="text-[10px] font-black text-white/70 truncate max-w-[80px]">{p.nombre}</span>
                                                                                <span className="text-[10px] font-mono font-black text-emerald-400">{p.tiempo || '--'}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] mt-2">{det.participantes?.length || 0} Atletas en Lista</span>}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-5">
                                                                <div className="flex items-center justify-between transition-all">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="relative">
                                                                            <Avatar
                                                                                name={getDisplayName(match, 'a')}
                                                                                src={shieldA}
                                                                                size="sm"
                                                                                className={cn(
                                                                                    "w-12 h-12 transition-all duration-500",
                                                                                    winnerSide === "a"
                                                                                        ? "border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-110"
                                                                                        : "border border-white/10 bg-black/40"
                                                                                )}
                                                                            />
                                                                            {winnerSide === "a" && (
                                                                                <div className="absolute -top-1 -right-1 z-20 bg-amber-500 rounded-full p-0.5 shadow-lg">
                                                                                    <Trophy size={8} className="text-black" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className={cn(
                                                                                "text-[15px] font-black truncate leading-tight transition-colors",
                                                                                winnerSide === "a" ? "text-white" : winnerSide === "b" ? "text-white/40" : "text-white/80"
                                                                            )}>
                                                                                {getDisplayName(match, 'a')}
                                                                            </span>
                                                                            <span className="text-[9px] font-black text-white/30 truncate uppercase tracking-widest mt-1">
                                                                                {getCarreraSubtitle(match, 'a') || 'Competidor'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {(isLive || isFinished) && (
                                                                        <span className={cn(
                                                                            "text-3xl font-black tabular-nums min-w-[2.5rem] text-right",
                                                                            winnerSide === "a" ? "text-white" : winnerSide === "b" ? "text-white/10" : "text-white/80"
                                                                        )}>
                                                                            {scoreA}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center justify-between transition-all">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="relative">
                                                                            <Avatar
                                                                                name={getDisplayName(match, 'b')}
                                                                                src={shieldB}
                                                                                size="sm"
                                                                                className={cn(
                                                                                    "w-12 h-12 transition-all duration-500",
                                                                                    winnerSide === "b"
                                                                                        ? "border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-110"
                                                                                        : "border border-white/10 bg-black/40"
                                                                                )}
                                                                            />
                                                                            {winnerSide === "b" && (
                                                                                <div className="absolute -top-1 -right-1 z-20 bg-amber-500 rounded-full p-0.5 shadow-lg">
                                                                                    <Trophy size={8} className="text-black" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className={cn(
                                                                                "text-[15px] font-black truncate leading-tight transition-colors",
                                                                                winnerSide === "b" ? "text-white" : winnerSide === "a" ? "text-white/40" : "text-white/80"
                                                                            )}>
                                                                                {getDisplayName(match, 'b')}
                                                                            </span>
                                                                            <span className="text-[9px] font-black text-white/30 truncate uppercase tracking-widest mt-1">
                                                                                {getCarreraSubtitle(match, 'b') || 'Competidor'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {(isLive || isFinished) && (
                                                                        <span className={cn(
                                                                            "text-3xl font-black tabular-nums min-w-[2.5rem] text-right",
                                                                            winnerSide === "b" ? "text-white" : winnerSide === "a" ? "text-white/10" : "text-white/80"
                                                                        )}>
                                                                            {scoreB}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between border-t border-white/5 pt-5 mt-auto">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <MapPin size={14} className="text-emerald-400/30 shrink-0" />
                                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] truncate">
                                                                    {match.lugar || 'Complejo Deportivo'}
                                                                </span>
                                                            </div>
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] bg-white/5 border-white/10 text-white/40 px-3 py-1 rounded-full whitespace-nowrap">
                                                                Detalles
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
