"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/use-matches";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_GRADIENT, SPORT_GLOW, SPORT_EMOJI } from "@/lib/constants";
import { getCurrentScore } from "@/lib/sport-scoring";
import { SportIcon } from "@/components/sport-icons";
import { cn } from "@/lib/utils";
import { 
    Calendar as CalendarIcon, Trophy, Zap, Search, Activity, 
    MapPin, LayoutGrid, Clock, ChevronRight, MoveRight
} from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui-primitives";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { PublicLiveTimer } from "@/components/public-live-timer";

// --- Types ---
type MatchStatus = 'FINALIZADO' | 'EN_JUEGO' | 'PROGRAMADO';

export default function PartidosPage() {
    const { user, profile, isStaff } = useAuth();
    const { matches: rawMatches, loading } = useMatches();
    const [searchQuery, setSearchQuery] = useState("");

    // 1. Filter by search
    const filteredMatches = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return rawMatches.filter(m => {
            const teamA = (m.carrera_a?.nombre || m.equipo_a || "").toLowerCase();
            const teamB = (m.carrera_b?.nombre || m.equipo_b || "").toLowerCase();
            const sport = (m.disciplinas?.name || "").toLowerCase();
            return teamA.includes(q) || teamB.includes(q) || sport.includes(q);
        });
    }, [rawMatches, searchQuery]);

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
            let label = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { 
                weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' 
            });
            
            if (fecha === todayStr) label = `Hoy — ${label}`;
            else if (fecha === yesterdayStr) label = `Ayer — ${label}`;
            else if (fecha === tomorrowStr) label = `Mañana — ${label}`;

            // Internal sorting: en_vivo (0), programado (1), finalizado (2)
            const sorted = groups[fecha].sort((a, b) => {
                const stateOrder = { "en_vivo": 0, "programado": 1, "finalizado": 2 };
                const orderA = stateOrder[a.estado as keyof typeof stateOrder] ?? 99;
                const orderB = stateOrder[b.estado as keyof typeof stateOrder] ?? 99;
                
                if (orderA !== orderB) return orderA - orderB;
                return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
            });

            return { fecha, label, partidos: sorted };
        });
    }, [filteredMatches]);

    return (
        <div className="min-h-screen bg-[#0a0816] text-white font-sans pb-24 overflow-x-hidden">
            {/* Ambient Background - MORE PURPLE/COBALT */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 max-w-6xl mx-auto px-4 pt-10">
                <header className="mb-12 flex flex-col items-center text-center gap-4">
                    <div className="animate-in fade-in zoom-in duration-1000">
                        <div className="flex items-center justify-center gap-2 mb-2">
                             <div className="p-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                <Activity size={20} />
                            </div>
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Temporada Regular</h4>
                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Temporada Regular</h4>
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tighter uppercase leading-none">
                            PARTIDOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 drop-shadow-[0_5px_15px_rgba(99,102,241,0.3)]">2026</span>
                        </h1>
                    </div>
                    <div className="relative w-full max-w-md animate-in slide-in-from-bottom duration-700">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                            type="text"
                            placeholder="Busca tu equipo o deporte..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 bg-white/5 backdrop-blur-md border border-white/10 rounded-[1.5rem] pl-12 pr-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all placeholder:text-white/20 shadow-2xl"
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 rounded-[2rem] bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : groupedMatches.length > 0 ? (
                    <div className="space-y-16">
                        {groupedMatches.map(group => (
                            <section key={group.fecha} className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-white/10" />
                                    <h2 className="text-[10px] font-black text-white/60 px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md uppercase tracking-[0.3em]">
                                        {group.label}
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/5 to-white/10" />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {group.partidos.map(partido => (
                                        <div key={partido.id} className="h-full">
                                            {partido.estado === 'en_vivo' ? (
                                                <LiveMatchCard partido={partido} />
                                            ) : partido.estado === 'finalizado' ? (
                                                <ResultCard partido={partido} />
                                            ) : (
                                                <UpcomingMatchCard partido={partido} />
                                            )}
                                        </div>
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

// --- Unified Match Card Component Base ---

function UnifiedCard({ 
    partido, 
    statusLabel, 
    statusIcon, 
    statusColor,
    scoreDisplay, // For Results/Live
    timeDisplay,  // For Upcoming
    highlightWinner = false
}: { 
    partido: any, 
    statusLabel: string,
    statusIcon?: React.ReactNode,
    statusColor?: string,
    scoreDisplay?: { a: any, b: any },
    timeDisplay?: string,
    highlightWinner?: boolean
}) {
    const sportName = partido.disciplinas?.name || 'Deporte';
    const genero = (partido.genero || 'masculino').toLowerCase();
    const winnerA = highlightWinner && Number(scoreDisplay?.a) > Number(scoreDisplay?.b);
    const winnerB = highlightWinner && Number(scoreDisplay?.b) > Number(scoreDisplay?.a);

    return (
        <Link href={`/partido/${partido.id}`} className="group block h-full">
            <div className={cn(
                "relative h-full overflow-hidden rounded-[2rem] border bg-[#0a0805]/90 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
                SPORT_BORDER[sportName] || 'border-white/10',
                SPORT_GLOW[sportName] || 'hover:shadow-white/5'
            )}>
                {/* Ambient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity duration-700`} />
                <div className="absolute -bottom-4 -right-4 pointer-events-none select-none group-hover:scale-110 transition-transform duration-700 origin-bottom-right">
                    <SportIcon sport={sportName} size={120} className={cn("opacity-[0.08] group-hover:opacity-[0.2] transition-all duration-500 drop-shadow-[0_0_20px_currentColor]", SPORT_ACCENT[sportName] || 'text-white')} />
                </div>

                <div className="relative p-6 flex flex-col h-full justify-center">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-full bg-black/60 flex items-center justify-center border border-white/10 shadow-[0_0_10px_currentColor]", SPORT_ACCENT[sportName])}>
                                <SportIcon sport={sportName} size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-tight">{sportName}</span>
                                <span className="text-[11px] font-medium text-white/60 leading-tight truncate max-w-[120px] mt-0.5">{partido.lugar || 'Sede'}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                            {statusLabel === 'LIVE' ? (
                                <PublicLiveTimer detalle={partido.marcador_detalle || {}} deporte={sportName} />
                            ) : (
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10",
                                    statusColor
                                )}>
                                    {statusIcon}
                                    <span className="text-[9px] font-black uppercase tracking-wider">{statusLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 grid grid-cols-[1.2fr_auto_1.2fr] items-center gap-6 py-1">
                        {/* Team A */}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <Avatar name={getDisplayName(partido, 'a')} size="lg" className={cn(
                                "w-14 h-14 border-2 transition-all duration-500 bg-[#0a0805]",
                                winnerA ? (
                                    sportName === 'Fútbol' ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110" :
                                    sportName === 'Baloncesto' ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] scale-110" :
                                    sportName === 'Voleibol' ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110" :
                                    sportName === 'Tenis' ? "border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.5)] scale-110" :
                                    sportName === 'Tenis de Mesa' ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-110" :
                                    sportName === 'Ajedrez' ? "border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-110" :
                                    sportName === 'Natación' ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-110" :
                                    "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110"
                                ) : "border-white/10 grayscale-[0.5] opacity-80"
                            )} />
                            <span className={cn("text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-2 max-w-[90px]", winnerA ? "text-white" : "text-white/40")}>
                                {getDisplayName(partido, 'a')}
                            </span>
                        </div>

                        {/* Center Display (Score or Time) */}
                        <div className="flex flex-col items-center justify-center min-w-[80px]">
                            {timeDisplay ? (
                                <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg mb-1">
                                    {timeDisplay}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 font-black text-5xl text-white tracking-tighter tabular-nums drop-shadow-lg mb-1">
                                    <span className={winnerB ? "opacity-30" : ""}>{scoreDisplay?.a}</span>
                                    <span className="text-white/20 text-3xl -mt-1">:</span>
                                    <span className={winnerA ? "opacity-30" : ""}>{scoreDisplay?.b}</span>
                                </div>
                            )}
                            
                            <div className={cn(
                                "text-[9px] font-black tracking-[0.2em] uppercase transition-all",
                                genero === 'femenino' ? "text-pink-500/80" :
                                genero === 'mixto' ? "text-purple-500/80" :
                                "text-blue-500/80"
                            )}>
                                {genero}
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <Avatar name={getDisplayName(partido, 'b')} size="lg" className={cn(
                                "w-14 h-14 border-2 transition-all duration-500 bg-[#0a0805]",
                                winnerB ? (
                                    sportName === 'Fútbol' ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-110" :
                                    sportName === 'Baloncesto' ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)] scale-110" :
                                    sportName === 'Voleibol' ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110" :
                                    sportName === 'Tenis' ? "border-lime-500 shadow-[0_0_20px_rgba(132,204,22,0.5)] scale-110" :
                                    sportName === 'Tenis de Mesa' ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-110" :
                                    sportName === 'Ajedrez' ? "border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-110" :
                                    sportName === 'Natación' ? "border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-110" :
                                    "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-110"
                                ) : "border-white/10 grayscale-[0.5] opacity-80"
                            )} />
                            <span className={cn("text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-2 max-w-[90px]", winnerB ? "text-white" : "text-white/40")}>
                                {getDisplayName(partido, 'b')}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={cn(
                        "mt-4 pt-3 border-t border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 opacity-40 group-hover:opacity-100",
                        SPORT_ACCENT[sportName] || 'text-white/40'
                    )}>
                        Analizar Partido <MoveRight size={12} className="ml-3 group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

function LiveMatchCard({ partido }: { partido: any }) {
    const sportName = partido.disciplinas?.name || 'Deporte';
    const { scoreA, scoreB } = getCurrentScore(sportName, partido.marcador_detalle || {});
    
    return (
        <UnifiedCard 
            partido={partido}
            statusLabel="LIVE"
            scoreDisplay={{ a: scoreA, b: scoreB }}
        />
    );
}

function UpcomingMatchCard({ partido }: { partido: any }) {
    const date = new Date(partido.fecha);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <UnifiedCard 
            partido={partido}
            statusLabel="PROGRAMADO"
            statusColor="text-white/30"
            timeDisplay={timeStr}
        />
    );
}

function ResultCard({ partido }: { partido: any }) {
    const sportName = partido.disciplinas?.name || 'Deporte';
    const { scoreA, scoreB } = getCurrentScore(sportName, partido.marcador_detalle || {});

    return (
        <UnifiedCard 
            partido={partido}
            statusLabel="FINALIZADO"
            statusColor="text-white/20"
            scoreDisplay={{ a: scoreA, b: scoreB }}
            highlightWinner={true}
        />
    );
}
