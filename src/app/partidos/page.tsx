"use client";

import { useEffect, useState, useMemo } from "react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/use-matches";
import { SportIcon } from "@/components/sport-icons";
import { cn } from "@/lib/utils";
import {
    Calendar as CalendarIcon, Search, Activity,
    LayoutGrid
} from "lucide-react";
import { getCurrentScore } from "@/lib/sport-scoring";
import { UnifiedCard } from "@/modules/matches/components/unified-card";

// --- Types ---
const GENDERS = [
    { label: 'Todos', value: 'todos', icon: '⚥' },
    { label: 'Masculino', value: 'masculino', icon: '♂' },
    { label: 'Femenino', value: 'femenino', icon: '♀' },
];

export default function PartidosPage() {
    const { user, profile, isStaff } = useAuth();
    const { matches: rawMatches, loading } = useMatches();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSport, setSelectedSport] = useState("Todos");
    const [selectedGender, setSelectedGender] = useState<string>("masculino");
    
    // Derive unique sport names from all matches
    const availableSports = useMemo(() => {
        const sports = new Set<string>();
        rawMatches.forEach(m => {
            const name = m.disciplinas?.name;
            if (name) sports.add(name);
        });
        return Array.from(sports).sort();
    }, [rawMatches]);

    // 1. Filter by search + sport + gender
    const filteredMatches = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return rawMatches.filter(m => {
            if (selectedSport !== "Todos" && m.disciplinas?.name !== selectedSport) return false;
            if (selectedGender !== 'todos' && (m.genero || 'masculino').toLowerCase() !== selectedGender.toLowerCase()) return false;
            const teamA = (m.carrera_a?.nombre || m.equipo_a || "").toLowerCase();
            const teamB = (m.carrera_b?.nombre || m.equipo_b || "").toLowerCase();
            const sport = (m.disciplinas?.name || "").toLowerCase();
            return teamA.includes(q) || teamB.includes(q) || sport.includes(q);
        });
    }, [rawMatches, searchQuery, selectedSport, selectedGender]);

    // 2. Grouping Function
    const groupedMatches = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        filteredMatches.forEach(match => {
            const fecha = match.fecha.split('T')[0];
            if (!groups[fecha]) groups[fecha] = [];
            groups[fecha].push(match);
        });

        return Object.keys(groups).sort().map(fecha => {
            const dateObj = new Date(fecha + 'T12:00:00');
            let label = dateObj.toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'short'
            });

            const isToday = fecha === todayStr;
            const isYesterday = fecha === yesterdayStr;
            const isTomorrow = fecha === tomorrowStr;

            if (isToday) label = `HOY — ${label}`;
            else if (isYesterday) label = `Ayer — ${label}`;
            else if (isTomorrow) label = `Mañana — ${label}`;

            const sorted = groups[fecha].sort((a, b) => {
                const stateOrder = { "en_curso": 0, "programado": 1, "finalizado": 2 };
                const orderA = stateOrder[a.estado as keyof typeof stateOrder] ?? 99;
                const orderB = stateOrder[b.estado as keyof typeof stateOrder] ?? 99;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
            });

            return { fecha, label, partidos: sorted, isToday };
        });
    }, [filteredMatches]);

    // 3. Auto-scroll to today
    useEffect(() => {
        if (!loading && groupedMatches.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const targetDate = groupedMatches.find(g => g.fecha >= todayStr)?.fecha;

            if (targetDate) {
                setTimeout(() => {
                    const element = document.getElementById(`date-${targetDate}`);
                    if (element) {
                        const isMobile = window.innerWidth < 768;
                        const offset = isMobile ? 220 : 250; 
                        const bodyRect = document.body.getBoundingClientRect().top;
                        const elementRect = element.getBoundingClientRect().top;
                        const elementPosition = elementRect - bodyRect;
                        const offsetPosition = elementPosition - offset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'auto'
                        });
                    }
                }, 100);
            }
        }
    }, [loading, groupedMatches.length]);

    return (
        <div className="min-h-screen bg-background text-white selection:bg-white/10 font-sans pb-20 relative">

        {/* Background Element Watermark */}
        <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-end overflow-hidden opacity-[0.25]">
            <img 
                src="/elementos/08.png" 
                alt="" 
                className="w-[800px] md:w-[1100px] h-auto translate-x-[15%] -translate-y-[10%] filter contrast-125 brightness-150" 
                aria-hidden="true"
            />
        </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 max-w-6xl mx-auto px-4 pt-10">
                <header className="mb-12 flex flex-col items-center text-center gap-4">
                    <div className="animate-in fade-in zoom-in duration-1000">
                        <div className="flex items-center justify-center gap-2 mb-2">
                             <div className="p-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <Activity size={20} className="text-violet-400" />
                            </div>
                            <h4 className="text-xs font-black text-violet-400 tracking-[0.2em] uppercase">Temporada regular</h4>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter leading-none font-display text-white drop-shadow-2xl">
                            Partidos <span className="text-emerald-400">2026</span>
                        </h1>
                    </div>
                    <div className="relative w-full max-w-md animate-in slide-in-from-bottom duration-700">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
                        <input
                            type="text"
                            placeholder="Busca tu equipo o deporte..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 bg-white/[0.12] backdrop-blur-3xl border border-white/30 rounded-[1.5rem] pl-12 pr-6 text-sm font-bold focus:outline-none focus:bg-white/[0.18] focus:ring-4 focus:ring-white/10 focus:border-white/40 transition-all placeholder:text-white/40 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                        />
                    </div>
                </header>

                {/* ── Filter Area (Sticky) ── */}
                <div className="sticky top-[64px] sm:top-[72px] z-50 px-4 py-4 mb-4 transition-all duration-300">
                    <div className="flex flex-col gap-4 sm:gap-6 max-w-6xl mx-auto">
                        <div className="flex justify-center w-full">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1 w-full max-w-4xl justify-start sm:justify-center">
                                <button
                                    onClick={() => setSelectedSport("Todos")}
                                    className={cn(
                                        "relative min-w-[105px] sm:min-w-[110px] h-24 sm:h-28 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center border transition-all duration-500 overflow-hidden shrink-0 shadow-2xl",
                                        selectedSport === "Todos"
                                            ? "bg-violet-600/30 border-violet-500/50 scale-105"
                                            : "bg-background/40 border-white/10 hover:border-white/20 hover:bg-white/[0.05] backdrop-blur-xl"
                                    )}
                                >
                                    <div className="z-10 flex flex-col items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                                            selectedSport === "Todos" ? "bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)]" : "bg-white/5 border border-white/10"
                                        )}>
                                            <LayoutGrid size={24} className={selectedSport === "Todos" ? "text-white" : "text-white/40"} />
                                        </div>
                                        <span className={cn(
                                            "text-[11px] font-black uppercase tracking-[0.2em] transition-colors",
                                            selectedSport === "Todos" ? "text-white" : "text-white/30"
                                        )}>
                                            Todos
                                        </span>
                                    </div>
                                </button>
                                {availableSports.map((sport) => {
                                    const isActive = selectedSport === sport;
                                    return (
                                        <button
                                            key={sport}
                                            onClick={() => setSelectedSport(sport)}
                                            className={cn(
                                                "group/btn relative min-w-[105px] sm:min-w-[110px] h-24 sm:h-28 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center border transition-all duration-500 overflow-hidden shrink-0 shadow-2xl",
                                                isActive
                                                    ? "bg-violet-600/30 border-violet-500/50 scale-105"
                                                    : "bg-[#1a0b38]/40 border-white/10 hover:border-white/20 hover:bg-white/[0.05] backdrop-blur-xl"
                                            )}
                                        >
                                            <div className="z-10 flex flex-col items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-500 overflow-hidden",
                                                    isActive ? "shadow-[0_0_20px_rgba(139,92,246,0.3)] border-transparent" : "bg-white/5 border border-white/10"
                                                )}>
                                                    <SportIcon sport={sport} size={32} />
                                                </div>
                                                <span className={cn(
                                                    "text-[11px] font-black uppercase tracking-[0.2em] transition-colors",
                                                    isActive ? "text-white" : "text-white/30 group-hover/btn:text-white/60"
                                                )}>
                                                    {sport}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Gender pills */}
                        <div className="flex justify-center w-full">
                            <div className="flex gap-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
                                {GENDERS.map((g) => {
                                    const isSelected = selectedGender === g.value;
                                    return (
                                        <button key={g.value} onClick={() => setSelectedGender(g.value)}
                                            className={cn(
                                                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full text-[8.5px] sm:text-[10px] font-display font-black tracking-widest transition-all border whitespace-nowrap",
                                                isSelected ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-xl scale-105" : "bg-transparent border-transparent text-white/30 hover:text-white/60"
                                            )}>
                                            <span className={cn("text-xs sm:text-sm leading-none", isSelected ? "text-[#7C3AED]" : "text-violet-400")}>{g.icon}</span>
                                            <span className="uppercase">{g.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 rounded-[2rem] bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : groupedMatches.length > 0 ? (
                    <div className="space-y-16">
                        {groupedMatches.map(group => (
                            <section
                                key={group.fecha}
                                id={`date-${group.fecha}`}
                                className="relative animate-in fade-in slide-in-from-bottom-6 duration-1000 scroll-mt-[350px] sm:scroll-mt-[450px] bg-transparent pb-16"
                            >
                                <div className="flex items-center justify-center gap-4 mb-6 sm:mb-10 sticky top-[275px] sm:top-[320px] z-40 py-4 pointer-events-none">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/10 max-w-[100px] sm:max-w-xs" />
                                    <h2 className={cn(
                                        "flex items-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-full border backdrop-blur-3xl transition-all duration-500 shadow-2xl",
                                        group.isToday
                                            ? "bg-black border-emerald-500/40 text-white shadow-[0_0_40px_rgba(139,92,246,0.2)] scale-105"
                                            : "bg-[#09080d] border-white/20 text-white shadow-black/80 ring-1 ring-white/10"
                                    )}>
                                        <div className="flex items-baseline gap-2">
                                            {(() => {
                                                const parts = group.label.split(',');
                                                return (
                                                    <>
                                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                                                            {parts[0]}
                                                        </span>
                                                        {parts[1] && (
                                                            <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                                                                {parts[1]}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        {group.isToday && (
                                            <div className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </div>
                                        )}
                                    </h2>
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/10 max-w-[100px] sm:max-w-xs" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {group.partidos.map(partido => (
                                        <MatchCardEntry key={partido.id} partido={partido} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 flex items-center justify-center text-white/10 mb-6 border border-white/5">
                            <CalendarIcon size={40} />
                        </div>
                        <h3 className="text-lg font-black text-white/60 mb-2 uppercase tracking-tight">Sin encuentros</h3>
                        <p className="text-white/30 text-sm max-w-[200px] leading-relaxed font-black">Prueba con otra búsqueda.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function MatchCardEntry({ partido }: { partido: any }) {
    const sportName = partido.disciplinas?.name || 'Deporte';
    const { scoreA, scoreB } = getCurrentScore(sportName, partido.marcador_detalle || {});

    if (partido.estado === 'en_curso') {
        return (
            <UnifiedCard
                partido={partido}
                statusLabel="LIVE"
                scoreDisplay={{ a: scoreA, b: scoreB }}
            />
        );
    }

    if (partido.estado === 'finalizado') {
        return (
            <UnifiedCard
                partido={partido}
                statusLabel="FINALIZADO"
                scoreDisplay={{ a: scoreA, b: scoreB }}
                highlightWinner={true}
            />
        );
    }

    const date = new Date(partido.fecha);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return (
        <UnifiedCard
            partido={partido}
            statusLabel="PROGRAMADO"
            timeDisplay={timeStr}
        />
    );
}
