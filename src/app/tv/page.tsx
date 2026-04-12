"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MedalLeaderboard } from "@/components/medalleria-board";
import { Clock, MapPin, Trophy, Calendar, QrCode, MonitorPlay, ChevronLeft } from "lucide-react";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { getCurrentScore } from "@/lib/sport-scoring";
import { Badge, Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { SafeBackButton } from "@/shared/components/safe-back-button";
import { SPORT_EMOJI } from "@/lib/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Components for TV View ---

const TvLiveMatch = ({ match }: { match: any }) => {
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(match.disciplinas?.name || '', match.marcador_detalle || {});
    const isRace = match.marcador_detalle?.tipo === 'carrera';

    return (
        <div className="h-[90%] flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-700">
            <div className="bg-rose-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-xl mb-8 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.5)]">
                🔴 En Curso Ahora
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
                            <h2 className="text-6xl font-black text-white mb-12 tracking-tight">{match.carrera_a?.nombre || match.equipo_a}</h2>
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
                                <Avatar name={match.carrera_a?.nombre || match.equipo_a} src={match.carrera_a?.escudo_url} className="w-48 h-48 text-6xl shadow-2xl border-4 border-white/10 bg-background" />
                                <h1 className="text-4xl lg:text-5xl font-black text-white text-center leading-tight uppercase tracking-tight max-w-sm">
                                    {match.carrera_a?.nombre || match.equipo_a}
                                </h1>
                            </div>

                            {/* Score */}
                            <div className="flex flex-col items-center">
                                <div className="text-[10rem] lg:text-[14rem] leading-none font-black text-white tabular-nums tracking-tighter drop-shadow-2xl flex items-center justify-center gap-8 w-full min-w-[500px]">
                                    <span className="text-right w-1/2">{scoreA}</span>
                                    <div className="w-12 h-3 bg-white/20 rounded-full shrink-0" />
                                    <span className="text-left w-1/2">{scoreB}</span>
                                </div>

                                <div className="flex flex-col items-center mt-12 w-full max-w-[350px]">
                                    <div className="flex items-center gap-4 text-2xl font-black uppercase tracking-widest text-[#00E676] drop-shadow-[0_0_15px_rgba(0,230,118,0.5)] mb-6">
                                        {extra ? <span>{extra}</span> : <span>EN CURSO</span>}

                                        {match.marcador_detalle?.timer && (
                                            <>
                                                <span className="opacity-50">•</span>
                                                <div className="scale-150 origin-left">
                                                    <PublicLiveTimer detalle={match.marcador_detalle} deporte={match.disciplinas?.name} />
                                                </div>
                                            </>
                                        )}

                                        {subScoreA !== undefined && subScoreB !== undefined && (
                                            <>
                                                <span className="opacity-50">•</span>
                                                <span>{subLabel || 'PTS'}: {subScoreA} - {subScoreB}</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="w-full h-2 rounded-full overflow-hidden bg-[#00E676]/20 relative">
                                        <div className="h-full bg-[#00E676] rounded-full w-[100%] absolute top-0 left-0 shadow-[0_0_20px_#00E676] animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            {/* Team B */}
                            <div className="flex flex-col items-center gap-6">
                                <Avatar name={match.carrera_b?.nombre || match.equipo_b} src={match.carrera_b?.escudo_url} className="w-48 h-48 text-6xl shadow-2xl border-4 border-white/10 bg-background" />
                                <h1 className="text-4xl lg:text-5xl font-black text-white text-center leading-tight uppercase tracking-tight max-w-sm">
                                    {match.carrera_b?.nombre || match.equipo_b}
                                </h1>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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
                                <Avatar name={match.carrera_a?.nombre || match.equipo_a} src={match.carrera_a?.escudo_url} size="lg" className="h-24 w-24 text-2xl" />
                                <span className="text-xl text-center line-clamp-1 max-w-[150px]">{match.carrera_a?.nombre || match.equipo_a}</span>
                            </div>
                            <div className="text-slate-500 font-light">vs</div>
                            <div className="flex flex-col items-center gap-4">
                                <Avatar name={match.carrera_b?.nombre || match.equipo_b} src={match.carrera_b?.escudo_url} size="lg" className="h-24 w-24 text-2xl" />
                                <span className="text-xl text-center line-clamp-1 max-w-[150px]">{match.carrera_b?.nombre || match.equipo_b}</span>
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

const TvQuiniela = ({ leaderboard }: { leaderboard: any[] }) => {
    return (
        <div className="h-[90%] flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom duration-700 w-full relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80%] bg-[#00E676]/5 blur-[150px] rounded-full pointer-events-none" />
            <h1 className="text-5xl font-black text-[#00E676] mb-12 flex items-center gap-6 drop-shadow-[0_0_20px_rgba(0,230,118,0.5)] z-10">
                <Trophy className="w-16 h-16" />
                Top Quiniela (Acierta y Gana)
            </h1>

            <div className="w-full max-w-5xl flex flex-col gap-6 relative z-10">
                {leaderboard.slice(0, 5).map((user, idx) => (
                    <div key={user.profile_id} className="flex items-center gap-6 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group shadow-2xl">
                        {idx === 0 && <div className="absolute inset-0 bg-gradient-to-r from-[#FFC000]/20 to-transparent pointer-events-none" />}
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black shrink-0 shadow-lg border",
                            idx === 0 ? "bg-gradient-to-br from-[#FFD700] to-[#FF8C00] text-black border-[#FFC000]" :
                            idx === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-black border-slate-300" :
                            idx === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white border-amber-700" : "bg-white/5 text-white/50 border-white/10"
                        )}>{idx + 1}</div>
                        
                        <div className="flex flex-col flex-1 z-10">
                            <span className="text-3xl font-bold">{user.full_name || 'Universitario'}</span>
                            <span className="text-white/50 text-xl font-mono">Top Jugador</span>
                        </div>
                        
                        <div className="text-right z-10">
                            <span className="text-5xl font-black text-[#00E676] w-24 inline-block">{user.puntos_totales}</span>
                            <span className="text-white/40 font-black uppercase tracking-widest text-lg ml-4">PTS</span>
                        </div>
                    </div>
                ))}
            </div>
            {leaderboard.length === 0 && (
                <div className="text-white/50 text-2xl font-bold">Aún no hay puntos registrados. ¡Participa!</div>
            )}
        </div>
    );
};

// -- News Ticker (Marquee) --
const NewsTicker = ({ recentMatches }: { recentMatches: any[] }) => {
    if (!recentMatches || recentMatches.length === 0) return null;

    const messages = recentMatches.map(m => {
        const scoreA = m.marcador_detalle?.goles_a ?? m.marcador_detalle?.sets_a ?? m.marcador_detalle?.total_a ?? 0;
        const scoreB = m.marcador_detalle?.goles_b ?? m.marcador_detalle?.sets_b ?? m.marcador_detalle?.total_b ?? 0;
        return `${SPORT_EMOJI[m.disciplinas?.name] || '🏅'} ${m.disciplinas?.name}: ${m.carrera_a?.nombre || m.equipo_a} ${scoreA} - ${scoreB} ${m.carrera_b?.nombre || m.equipo_b}`;
    });

    const combinedText = messages.join('   •   ');

    return (
        <div className="h-16 bg-black/80 border-t border-white/10 flex items-center overflow-hidden whitespace-nowrap relative shrink-0">
            <div className="absolute left-0 top-0 bottom-0 px-8 bg-gradient-to-r from-red-600 to-red-700 text-white font-black uppercase tracking-widest flex items-center z-20 shadow-[20px_0_30px_rgba(0,0,0,0.8)] border-r border-red-500">
                ÚLTIMOS RESULTADOS
            </div>
            {/* White-space and duplicated text for infinite scroll effect */}
            <div className="inline-block animate-marquee pl-[450px] pr-[100px] text-2xl font-bold text-white/90">
                {combinedText} <span className="text-red-500 mx-8">•</span> {combinedText}
            </div>
            <style jsx>{`
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-marquee {
                animation: marquee 40s linear infinite;
            }
            `}</style>
        </div>
    );
};


// --- Main Page Component ---

export default function TvPage() {
    const router = useRouter();
    const [view, setView] = useState<'live' | 'medals' | 'upcoming' | 'quiniela'>('medals');
    const [liveMatches, setLiveMatches] = useState<any[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
    const [recentMatches, setRecentMatches] = useState<any[]>([]);
    const [quinielaLeaderboard, setQuinielaLeaderboard] = useState<any[]>([]);
    const [currentLiveIndex, setCurrentLiveIndex] = useState(0);

    const fetchData = async () => {
        // Fetch Live
        const { data: live } = await supabase
            .from('partidos')
            .select('*, disciplinas(*), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)')
            .eq('estado', 'en_curso');

        if (live) setLiveMatches(live);

        // Fetch Upcoming
        const { data: upcoming } = await supabase
            .from('partidos')
            .select('*, disciplinas(*), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)')
            .eq('estado', 'programado')
            .gt('fecha', new Date().toISOString())
            .order('fecha', { ascending: true })
            .limit(5);

        if (upcoming) setUpcomingMatches(upcoming);

        // Fetch Recent
        const { data: recent } = await supabase
            .from('partidos')
            .select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)')
            .eq('estado', 'finalizado')
            .order('updated_at', { ascending: false })
            .limit(10);
            
        if (recent) setRecentMatches(recent);

        // Fetch Quiniela
        const { data: quinielaLogs } = await supabase
            .from('quiniela_logs')
            .select('profile_id, puntos_obtenidos, perfiles:profiles(full_name)');
        
        if (quinielaLogs) {
            const userPts: Record<string, { profile_id: string, full_name: string, puntos_totales: number }> = {};
            quinielaLogs.forEach((lg: any) => {
                if (!userPts[lg.profile_id]) {
                    const prof = Array.isArray(lg.perfiles) ? lg.perfiles[0] : lg.perfiles;
                    userPts[lg.profile_id] = { 
                        profile_id: lg.profile_id, 
                        full_name: prof?.full_name || '', 
                        puntos_totales: 0 
                    };
                }
                userPts[lg.profile_id].puntos_totales += (lg.puntos_obtenidos || 0);
            });
            const lb = Object.values(userPts).sort((a, b) => b.puntos_totales - a.puntos_totales);
            setQuinielaLeaderboard(lb);
        }
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
                const availableViews: any[] = ['medals', 'quiniela'];
                if (liveMatches.length > 0) availableViews.push('live');
                if (upcomingMatches.length > 0) availableViews.push('upcoming');

                // Defines the preferred sequence of screens
                const sequence = ['medals', 'quiniela', 'live', 'upcoming'].filter(v => availableViews.includes(v));

                const currentIndex = sequence.indexOf(current);
                if (currentIndex === -1) return sequence[0] as any;
                
                return sequence[(currentIndex + 1) % sequence.length] as any;
            });
        };

        const timer = setTimeout(rotate, 15000); // Wait 15s per screen
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
        <>
            {/* MOBILE BLOCKER */}
            <div className="md:hidden min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full" />
                <MonitorPlay className="w-24 h-24 text-red-500 mb-8 opacity-80" />
                <h1 className="text-3xl font-black uppercase tracking-wider mb-4 font-sans">Vista Exclusiva<br/>para TV</h1>
                <p className="text-white/40 mb-12 font-bold max-w-xs mx-auto">Esta vista de tablero está diseñada únicamente para pantallas gigantes (Digital Signage).</p>
                <SafeBackButton fallback="/" className="bg-[#111] hover:bg-white hover:text-black transition-all text-white border border-white/10 px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center gap-3 shadow-2xl relative z-10 shadow-none hover:shadow-none" label="Volver al inicio" />
            </div>

            {/* TV VIEW - HIDDEN ON MOBILE */}
            <div className="hidden md:flex min-h-screen bg-background text-white overflow-hidden relative selection:bg-none cursor-none flex-col">
                
                {/* Floating QR Code in bottom-right (above everything else) */}
                <div className="fixed bottom-32 right-12 z-50 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center justify-center animate-in fade-in duration-1000">
                    <div className="bg-white p-2 rounded-2xl mb-4 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <QrCode className="w-24 h-24 text-black" />
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-[0.2em] text-red-500 mb-1">¡ESCANEA Y ÚNETE!</span>
                    <span className="text-[10px] font-bold text-white/50">Juega la Quiniela desde tu tu móvil</span>
                </div>

                {/* Background ambient elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-blob" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 blur-[120px] rounded-full animate-blob animation-delay-2000" />
                </div>

                {/* Header TV */}
                <header className="h-28 px-12 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0 relative z-10">
                    <div className="flex items-center gap-6">
                        <Trophy className="text-[#FFC000] w-12 h-12" />
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Olimpiadas 2026</h1>
                            <p className="text-sm text-[#FFC000]/70 font-black uppercase tracking-[0.4em]">TRANSMISIÓN OFICIAL UNINORTE</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="px-6 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-sm font-black tracking-widest text-red-500 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="text-white/40 w-6 h-6" />
                            <span className="text-2xl font-mono text-white/80 font-bold">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative z-10">
                    {view === 'medals' && (
                        <div className="h-full w-full flex items-start justify-center p-8 overflow-hidden mask-fade-y">
                            <div className="w-full max-w-6xl animate-slow-scroll pb-[50vh]">
                                <h1 className="text-4xl font-black text-center text-white mb-12 uppercase tracking-widest opacity-50 mt-8">Posiciones Globales</h1>
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

                    {view === 'quiniela' && (
                        <TvQuiniela leaderboard={quinielaLeaderboard} />
                    )}
                </div>

                {/* Footer Sections */}
                <div className="shrink-0 relative z-10 flex flex-col">
                    {/* News Ticker Marquee */}
                    <NewsTicker recentMatches={recentMatches} />

                    {/* Footer Progress Bar */}
                    <div className="h-3 bg-white/5 w-full overflow-hidden">
                        <div
                            key={view}
                            className="h-full bg-indigo-500 shadow-[0_0_20px_#6366f1] animate-loading-bar"
                            style={{ animationDuration: '15s' }}
                        />
                    </div>
                </div>

                <style jsx global>{`
                    @keyframes loading-bar {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                    .animate-loading-bar {
                        animation-name: loading-bar;
                        animation-timing-function: linear;
                    }

                    @keyframes slowScroll {
                        0% { transform: translateY(0); }
                        10% { transform: translateY(0); }
                        90% { transform: translateY(calc(-100% + 75vh)); }
                        100% { transform: translateY(calc(-100% + 75vh)); }
                    }
                    .animate-slow-scroll {
                        animation: slowScroll 25s linear infinite;
                    }
                    .mask-fade-y {
                        mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
                    }
                `}</style>
            </div>
        </>
    );
}
