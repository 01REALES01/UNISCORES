"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MedalLeaderboard } from "@/components/medalleria-board";
import { Clock, MapPin, Trophy, Activity, Calendar } from "lucide-react";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { getCurrentScore } from "@/lib/sport-scoring";
import { Badge, Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";

// --- Components for TV View ---

const TvLiveMatch = ({ match }: { match: any }) => {
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(match.disciplinas?.name || '', match.marcador_detalle || {});
    const isRace = match.marcador_detalle?.tipo === 'carrera';

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-700">
            <div className="bg-rose-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-xl mb-8 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                🔴 En Vivo Ahora
            </div>

            <div className="w-full max-w-6xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/4 w-1/2 h-full bg-indigo-500/20 blur-[150px] rounded-full mix-blend-screen" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-12 opacity-80">
                        <div className="flex items-center gap-4 text-2xl font-bold text-slate-300">
                            <span className="text-4xl">{SPORT_EMOJI[match.disciplinas?.name] || '🏅'}</span>
                            {match.disciplinas?.name}
                        </div>
                        <div className="flex items-center gap-3 text-xl font-mono text-indigo-300 bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20">
                            <MapPin size={24} /> {match.lugar || 'Campo Central'}
                        </div>
                    </div>

                    {isRace ? (
                        <div className="text-center">
                            <h2 className="text-6xl font-black text-white mb-12 tracking-tight">{match.equipo_a}</h2>
                            <div className="space-y-4">
                                {(match.marcador_detalle?.participantes || [])
                                    .sort((a: any, b: any) => (a.posicion || 99) - (b.posicion || 99))
                                    .slice(0, 5) // Top 5 only for TV readability
                                    .map((p: any, idx: number) => (
                                        <div key={idx} className={cn(
                                            "flex items-center justify-between p-6 rounded-3xl text-3xl font-bold",
                                            idx === 0 ? "bg-[#FFC000] text-black" : "bg-white/10 text-white"
                                        )}>
                                            <div className="flex items-center gap-6">
                                                <span className="font-black opacity-50 w-12 text-center">{idx + 1}</span>
                                                <span>{p.nombre}</span>
                                                <span className="text-xl opacity-70 uppercase tracking-wider font-medium ml-4">({p.equipo})</span>
                                            </div>
                                            <div className="font-mono">{p.tiempo || '--:--'}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-12">
                            {/* Team A */}
                            <div className="flex flex-col items-center gap-6">
                                <Avatar name={match.equipo_a} className="w-48 h-48 text-6xl shadow-2xl border-4 border-white/10 bg-[#17130D]" />
                                <h1 className="text-4xl lg:text-5xl font-black text-white text-center leading-tight uppercase tracking-tight max-w-sm">
                                    {match.equipo_a}
                                </h1>
                            </div>

                            {/* Score */}
                            <div className="flex flex-col items-center">
                                <div className="text-[10rem] lg:text-[12rem] leading-none font-black text-white tabular-nums tracking-tighter drop-shadow-2xl flex items-center gap-8">
                                    <span>{scoreA}</span>
                                    <span className="text-white/20 -mt-8">:</span>
                                    <span>{scoreB}</span>
                                </div>
                                <div className="mt-6 scale-150 transform origin-top">
                                    <PublicLiveTimer detalle={match.marcador_detalle} />
                                </div>
                                {extra && <div className="mt-8 text-2xl font-bold text-indigo-300 uppercase tracking-widest bg-indigo-500/10 px-6 py-2 rounded-full border border-indigo-500/20">{extra}</div>}
                            </div>

                            {/* Team B */}
                            <div className="flex flex-col items-center gap-6">
                                <Avatar name={match.equipo_b} className="w-48 h-48 text-6xl shadow-2xl border-4 border-white/10 bg-[#17130D]" />
                                <h1 className="text-4xl lg:text-5xl font-black text-white text-center leading-tight uppercase tracking-tight max-w-sm">
                                    {match.equipo_b}
                                </h1>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <p className="mt-12 text-slate-500 text-xl font-medium animate-pulse">Siguiente vista en unos segundos...</p>
        </div>
    );
};

const TvUpcoming = ({ matches }: { matches: any[] }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in slide-in-from-right duration-700">
            <h1 className="text-5xl font-black text-white mb-16 flex items-center gap-6">
                <Calendar className="w-16 h-16 text-indigo-500" />
                Próximos Encuentros
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
                {matches.slice(0, 3).map((match) => (
                    <div key={match.id} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:opacity-100 transition-opacity">
                            <Badge variant="outline" className="text-xl px-4 py-1">{match.disciplinas?.name}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-4xl font-bold text-white mt-8">
                            <div className="flex flex-col items-center gap-4">
                                <Avatar name={match.equipo_a} size="lg" className="h-24 w-24 text-2xl" />
                                <span className="text-xl text-center line-clamp-1 max-w-[150px]">{match.equipo_a}</span>
                            </div>
                            <div className="text-slate-500 font-light">vs</div>
                            <div className="flex flex-col items-center gap-4">
                                <Avatar name={match.equipo_b} size="lg" className="h-24 w-24 text-2xl" />
                                <span className="text-xl text-center line-clamp-1 max-w-[150px]">{match.equipo_b}</span>
                            </div>
                        </div>
                        <div className="mt-auto bg-white/5 rounded-2xl p-4 flex items-center justify-center gap-4 text-xl text-indigo-300 font-mono">
                            <Clock />
                            {new Date(match.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Page Component ---

export default function TvPage() {
    const [view, setView] = useState<'live' | 'medals' | 'upcoming'>('medals'); // Start with medals
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
    const [currentLiveIndex, setCurrentLiveIndex] = useState(0);

    const fetchData = async () => {
        // Fetch Live
        const { data: live } = await supabase
            .from('partidos')
            .select('*, disciplinas(*)')
            .eq('estado', 'en_vivo');

        if (live) setLiveMatches(live);

        // Fetch Upcoming
        const { data: upcoming } = await supabase
            .from('partidos')
            .select('*, disciplinas(*)')
            .eq('estado', 'programado')
            .gt('fecha', new Date().toISOString())
            .order('fecha', { ascending: true })
            .limit(5);

        if (upcoming) setUpcomingMatches(upcoming);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh data every 30s
        return () => clearInterval(interval);
    }, []);

    // Rotation Logic
    useEffect(() => {
        const rotate = () => {
            setView(current => {
                if (current === 'medals') {
                    if (liveMatches.length > 0) return 'live';
                    if (upcomingMatches.length > 0) return 'upcoming';
                    return 'medals';
                }
                if (current === 'live') {
                    // Si hay más partidos en vivo, rotar entre ellos? 
                    // Por simplicidad, pasamos a upcoming tras ver uno
                    // (O rota índices de liveMatches si quisieramos ser pro)
                    if (upcomingMatches.length > 0) return 'upcoming';
                    return 'medals';
                }
                if (current === 'upcoming') {
                    return 'medals';
                }
                return 'medals';
            });
        };

        const duration = view === 'live' ? 15000 : 10000; // 15s for live, 10s for others
        const timer = setTimeout(rotate, duration);
        return () => clearTimeout(timer);
    }, [view, liveMatches.length, upcomingMatches.length]);


    // Cycle through live matches if multiple
    useEffect(() => {
        if (view === 'live' && liveMatches.length > 1) {
            const timer = setInterval(() => {
                setCurrentLiveIndex(prev => (prev + 1) % liveMatches.length);
            }, 8000); // Change match every 8s within the live view block
            return () => clearInterval(timer);
        }
    }, [view, liveMatches.length]);


    return (
        <div className="min-h-screen bg-[#0a0805] text-white overflow-hidden relative selection:bg-none cursor-none">
            {/* Background ambient elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 blur-[120px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <main className="relative z-10 w-full h-screen flex flex-col">
                {/* Header TV */}
                <header className="h-24 px-12 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Trophy className="text-[#FFC000] w-10 h-10" />
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">Olimpiadas 2026</h1>
                            <p className="text-sm text-slate-400 font-mono tracking-widest">TRANSMISIÓN OFICIAL</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-slate-400 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            ONLINE
                        </div>
                        <Clock className="text-slate-500" />
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {view === 'medals' && (
                        <div className="h-full flex items-center justify-center p-8 scale-110">
                            <div className="w-full max-w-5xl">
                                <MedalLeaderboard />
                            </div>
                        </div>
                    )}

                    {view === 'live' && liveMatches.length > 0 && (
                        <TvLiveMatch match={liveMatches[currentLiveIndex]} />
                    )}

                    {view === 'upcoming' && (
                        <TvUpcoming matches={upcomingMatches} />
                    )}
                </div>

                {/* Footer Progress Bar */}
                <div className="h-2 bg-white/5 w-full overflow-hidden">
                    <div
                        key={view}
                        className="h-full bg-indigo-500 animate-loading-bar"
                        style={{ animationDuration: view === 'live' ? '15s' : '10s' }}
                    />
                </div>
            </main>

            <style jsx global>{`
                @keyframes loading-bar {
                    from { width: 0%; }
                    to { width: 100%; }
                }
                .animate-loading-bar {
                    animation-name: loading-bar;
                    animation-timing-function: linear;
                }
            `}</style>
        </div>
    );
}
