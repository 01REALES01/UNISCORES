"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Avatar, Badge } from "@/components/ui-primitives";
import { LayoutGrid, Trophy, Star, Loader2, ArrowUpRight, Flame, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";

type LeaderboardPlayer = {
    profile_id: string;
    full_name: string;
    avatar_url: string | null;
    score: number;
    sport: string;
};

export default function EstadisticasPage() {
    const { user, profile, isStaff, loading: authLoading } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSport, setActiveSport] = useState<string>("Fútbol");
    const [sportsAvailable, setSportsAvailable] = useState<string[]>([]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch all scoring events joined with player and match disciplines
            const { data, error } = await supabase
                .from('olympics_eventos')
                .select(`
                    id,
                    tipo_evento,
                    jugadores(id, nombre, profile_id),
                    partidos!inner(
                        disciplina_id,
                        estado,
                        disciplinas(name)
                    )
                `)
                .in('tipo_evento', ['gol', 'punto', 'punto_1', 'punto_2', 'punto_3']);

            if (error) throw error;
            if (data) {
                // Only use events from finalized matches
                const finalized = data.filter((ev: any) => ev.partidos?.estado === 'finalizado');
                setEvents(finalized);

                // Extract unique sports
                const sports = new Set<string>();
                finalized.forEach((ev: any) => {
                    if (ev.partidos?.disciplinas?.name) {
                        sports.add(ev.partidos.disciplinas.name);
                    }
                });
                const sportsArray = Array.from(sports);
                setSportsAvailable(sportsArray);
                if (sportsArray.length > 0 && !sportsArray.includes(activeSport)) {
                    setActiveSport(sportsArray[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch profile details for player profile_ids
    const [profilesMap, setProfilesMap] = useState<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());

    useEffect(() => {
        const profileIds = [...new Set(events.map((ev: any) => ev.jugadores?.profile_id).filter(Boolean))];
        if (profileIds.length === 0) return;

        supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', profileIds)
            .then(({ data }) => {
                if (data) {
                    const map = new Map<string, { full_name: string; avatar_url: string | null }>();
                    data.forEach((p: any) => map.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
                    setProfilesMap(map);
                }
            });
    }, [events]);

    const leaderboard = useMemo(() => {
        const playerMap = new Map<string, LeaderboardPlayer>();

        events.forEach(ev => {
            const sportName = ev.partidos?.disciplinas?.name;
            if (sportName !== activeSport) return;

            const jugador = ev.jugadores;
            if (!jugador) return;

            const profileId = jugador.profile_id;
            const profileData = profileId ? profilesMap.get(profileId) : null;

            const id = profileId || `temp_${jugador.id}`;
            const name = profileData?.full_name || jugador.nombre || "Jugador Desconocido";
            const avatar = profileData?.avatar_url || null;

            let pointsToAdd = 1;
            if (ev.tipo_evento === 'punto_2') pointsToAdd = 2;
            if (ev.tipo_evento === 'punto_3') pointsToAdd = 3;

            if (!playerMap.has(id)) {
                playerMap.set(id, { profile_id: id, full_name: name, avatar_url: avatar, score: 0, sport: sportName });
            }
            playerMap.get(id)!.score += pointsToAdd;
        });

        return Array.from(playerMap.values()).sort((a, b) => b.score - a.score).slice(0, 10);
    }, [events, activeSport, profilesMap]);

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0805]"><UniqueLoading size="lg" /></div>;

    const metricName = activeSport.toLowerCase().includes('fútbol') || activeSport.toLowerCase().includes('futsal') ? 'GOLES' : 'PUNTOS';

    return (
        <div className="min-h-screen bg-[#060504] text-white selection:bg-amber-500/30 overflow-hidden">
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-32 relative z-10">
                
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-16 relative"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/10 blur-[120px] rounded-[100%] pointer-events-none z-0" />
                    <div className="relative z-10 inline-block mb-3">
                        <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/5 px-4 py-1.5 font-black tracking-[0.2em] text-[10px]">
                            LÍDERES GLOBALES
                        </Badge>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black font-outfit leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 mb-4 relative z-10 drop-shadow-sm">
                        Top Anotadores
                    </h1>
                    <p className="text-white/40 text-sm md:text-base font-medium max-w-xl mx-auto flex items-center justify-center gap-2">
                        Clasificación general por disciplina deportiva. <Flame className="text-amber-500" size={16} />
                    </p>
                </motion.div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
                    {sportsAvailable.length > 0 ? (
                        sportsAvailable.map(sport => (
                            <button
                                key={sport}
                                onClick={() => setActiveSport(sport)}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border",
                                    activeSport === sport 
                                        ? "bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]" 
                                        : "bg-[#0F0D0B] border-white/5 text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                {sport}
                            </button>
                        ))
                    ) : !loading && (
                        <div className="px-6 py-2.5 rounded-full text-[11px] font-black text-white/30 border border-white/5 bg-white/5">
                            NO HAY EVENTOS REGISTRADOS
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <UniqueLoading size="md" />
                        <p className="text-[10px] font-black tracking-widest text-white/40 mt-6 uppercase">Procesando datos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        
                        {/* THE PODIUM (Top 3) */}
                        <div className="lg:col-span-12 flex items-end justify-center h-[350px] mb-8 gap-4 px-4">
                            {/* 2nd Place */}
                            {leaderboard[1] && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                                    className="flex flex-col items-center w-[120px] md:w-[150px]"
                                >
                                    <Avatar name={leaderboard[1].full_name} src={leaderboard[1].avatar_url} className="w-16 h-16 md:w-20 md:h-20 border-4 border-[#C0C0C0] mb-4 shadow-[0_0_20px_rgba(192,192,192,0.2)] z-10" />
                                    <div className="w-full flex flex-col items-center bg-gradient-to-t from-[#0A0806] to-[#12100E] border-t border-x border-white/5 rounded-t-2xl py-6 h-[180px] relative shadow-2xl">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C0C0C0] to-transparent opacity-50" />
                                        <span className="text-[#C0C0C0] font-black text-4xl font-outfit opacity-20 absolute top-4">2</span>
                                        <span className="text-[10px] uppercase tracking-widest text-white/50 font-black mt-10 text-center px-2 truncate w-full">{leaderboard[1].full_name}</span>
                                        <span className="text-xl font-black text-white mt-2">{leaderboard[1].score}</span>
                                        <span className="text-[8px] text-white/30 tracking-[0.2em]">{metricName}</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* 1st Place */}
                            {leaderboard[0] && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                                    className="flex flex-col items-center w-[140px] md:w-[180px] z-20"
                                >
                                    <div className="relative">
                                        <Trophy className="absolute -top-10 left-1/2 -translate-x-1/2 text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" size={36} />
                                        <Avatar name={leaderboard[0].full_name} src={leaderboard[0].avatar_url} className="w-20 h-20 md:w-28 md:h-28 border-4 border-[#FFD700] mb-4 shadow-[0_0_30px_rgba(255,215,0,0.3)] z-10" />
                                    </div>
                                    <div className="w-full flex flex-col items-center bg-gradient-to-t from-[#140F00] to-[#2A2000] border-t border-x border-[#FFD700]/20 rounded-t-2xl py-6 h-[220px] relative shadow-2xl">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
                                        <span className="text-[#FFD700] font-black text-6xl font-outfit opacity-20 absolute top-2">1</span>
                                        <span className="text-xs uppercase tracking-widest text-[#FFD700] font-black mt-14 text-center px-2 truncate w-full drop-shadow-md">{leaderboard[0].full_name}</span>
                                        <span className="text-3xl font-black text-white mt-2">{leaderboard[0].score}</span>
                                        <span className="text-[9px] text-white/50 font-black tracking-[0.2em]">{metricName}</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* 3rd Place */}
                            {leaderboard[2] && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                                    className="flex flex-col items-center w-[120px] md:w-[150px]"
                                >
                                    <Avatar name={leaderboard[2].full_name} src={leaderboard[2].avatar_url} className="w-16 h-16 md:w-20 md:h-20 border-4 border-[#CD7F32] mb-4 shadow-[0_0_20px_rgba(205,127,50,0.2)] z-10" />
                                    <div className="w-full flex flex-col items-center bg-gradient-to-t from-[#0A0604] to-[#140B06] border-t border-x border-white/5 rounded-t-2xl py-6 h-[160px] relative shadow-2xl">
                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#CD7F32] to-transparent opacity-50" />
                                        <span className="text-[#CD7F32] font-black text-4xl font-outfit opacity-20 absolute top-4">3</span>
                                        <span className="text-[10px] uppercase tracking-widest text-white/50 font-black mt-8 text-center px-2 truncate w-full">{leaderboard[2].full_name}</span>
                                        <span className="text-xl font-black text-white mt-2">{leaderboard[2].score}</span>
                                        <span className="text-[8px] text-white/30 tracking-[0.2em]">{metricName}</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Leaderboard List (4-10) */}
                        <div className="lg:col-span-8 lg:col-start-3 space-y-3">
                            {leaderboard.slice(3).map((player, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    transition={{ duration: 0.4, delay: 0.3 + (idx * 0.05) }}
                                    key={player.profile_id} 
                                    className="flex items-center justify-between p-4 rounded-3xl bg-[#0A0705] border border-white/5 hover:border-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-8 flex justify-center text-white/20 font-black font-outfit text-xl group-hover:text-white/40 transition-colors">
                                            {idx + 4}
                                        </div>
                                        <Avatar name={player.full_name} src={player.avatar_url} className="w-12 h-12" />
                                        <Link href={`/perfil/${player.profile_id.replace('temp_', '')}`} className="flex flex-col group-hover:translate-x-1 transition-transform">
                                            <span className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors uppercase font-outfit">
                                                {player.full_name}
                                            </span>
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Ver Perfil</span>
                                        </Link>
                                    </div>
                                    <div className="px-5 py-2 rounded-2xl bg-[#0F0D0B] border border-white/5 flex flex-col items-center">
                                        <span className="text-xl font-black tabular-nums text-white">
                                            {player.score}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            
                            {leaderboard.length === 0 && (
                                <div className="text-center py-20 border border-white/5 rounded-[2.5rem] bg-[#0A0705] opacity-50">
                                    <Target size={32} className="mx-auto text-white/20 mb-4" />
                                    <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.3em]">
                                        Sin datos de anotadores
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
