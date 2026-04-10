"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui-primitives";
import { BarChart3, Target, Trophy, ShieldAlert, Users } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";

import { PulseHeader } from "@/modules/estadisticas/components/pulse-header";
import { LeaderboardTable, type LeaderboardEntry } from "@/modules/estadisticas/components/leaderboard-table";
import { PopularityRanking, type TopCareer, type TopUser } from "@/modules/estadisticas/components/popularity-ranking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPointValue(tipo: string): number {
    if (!tipo) return 1;
    const t = tipo.toLowerCase();
    if (t === 'punto_3') return 3;
    if (t === 'punto_2') return 2;
    return 1;
}

function SectionHeader({ title, delay = 0 }: { title: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay }}
            className="flex items-center gap-4 mb-6"
        >
            <div className="h-8 flex-1 border-t border-white/5 relative">
              <div className="absolute top-[-1px] left-0 w-24 h-[1px] bg-gradient-to-r from-violet-500/50 to-transparent" />
            </div>
            <span className="text-sm font-display font-black tracking-widest text-white/70 shrink-0 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 shadow-inner">
                {title}
            </span>
            <div className="h-8 flex-1 border-t border-white/5" />
        </motion.div>
    );
}

export default function EstadisticasPage() {
    const { user, profile, isStaff, loading: authLoading } = useAuth();
    const [allMatches, setAllMatches] = useState<any[]>([]);
    const [eventos, setEventos] = useState<any[]>([]);
    const [topGoleadores, setTopGoleadores] = useState<LeaderboardEntry[]>([]);
    const [topAnotadores, setTopAnotadores] = useState<LeaderboardEntry[]>([]);
    const [topTarjeteadores, setTopTarjeteadores] = useState<LeaderboardEntry[]>([]);
    const [topCareers, setTopCareers] = useState<TopCareer[]>([]);
    const [topUsers, setTopUsers] = useState<TopUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSport, setActiveSport] = useState<string>("Todos");

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // 1. Fetch raw data without complex joins first to be safe
            const [allMatchesRes, eventosRes, topCareersRes, topUsersRes, disciplinesRes] = await Promise.all([
                supabase.from('partidos').select('id, estado, disciplina_id, carrera_a_id, carrera_b_id'),
                supabase.from('olympics_eventos').select('tipo_evento, partido_id, equipo, jugador_id_normalized'),
                supabase.from('carreras').select('id, nombre, escudo_url, followers_count').order('followers_count', { ascending: false }).limit(10),
                supabase.from('profiles').select('id, full_name, avatar_url, followers_count').order('followers_count', { ascending: false }).limit(10),
                supabase.from('disciplinas').select('id, name')
            ]);

            // 2. Fetch all required players with their profile and career info
            const playerIds = Array.from(new Set((eventosRes.data || []).map(e => e.jugador_id_normalized).filter(Boolean)));
            const { data: playersData } = await supabase.from('jugadores').select('id, nombre, profile_id, carrera_id, profiles(avatar_url)').in('id', playerIds);
            const playerMap = new Map(playersData?.map(j => [j.id, j]));

            const { data: allCareers } = await supabase.from('carreras').select('id, nombre, escudo_url');
            const careerMap = new Map(allCareers?.map(c => [c.id, c]));
            
            const discMap = new Map(disciplinesRes.data?.map(d => [d.id, d.name]));

            // 3. Smart Linker: Fetch all profiles to link orphans by name
            const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, avatar_url');
            const profileByName = new Map(allProfiles?.map(p => [p.full_name?.toLowerCase(), p]));

            const matches = (allMatchesRes.data || []).map(m => ({ ...m, disciplina_name: discMap.get(m.disciplina_id) }));
            const allEvents = (eventosRes.data || []).map(e => {
                const p = matches.find(m => m.id === e.partido_id);
                return { ...e, partidos: p, jugadores: playerMap.get(e.jugador_id_normalized) };
            });

            // Count events from finalized OR in-course matches for live updates
            const activeEventos = allEvents.filter((e: any) => 
                e.partidos?.estado === 'finalizado' || e.partidos?.estado === 'en_curso'
            );
            
            setAllMatches(matches);
            setEventos(activeEventos);
            setTopCareers(topCareersRes?.data || []);
            setTopUsers(topUsersRes?.data || []);

            // ⚽ Goleadores
            const soccerMap = new Map<number, LeaderboardEntry>();
            activeEventos.filter(e => {
                const type = e.tipo_evento?.toLowerCase() || '';
                const sport = e.partidos?.disciplina_name || '';
                return (type === 'gol') && (sport.includes('Fútbol') || sport.includes('Futsal'));
            }).forEach(e => {
                const j = e.jugadores;
                if (!j || !e.partidos) return; // Fix: Safety check for e.partidos

                const currentMatch = e.partidos;
                const matchCareerId = e.equipo === 'equipo_a' ? currentMatch.carrera_a_id : currentMatch.carrera_b_id;
                
                if (!soccerMap.has(j.id)) {
                    // Try to find a profile by name if profile_id is missing
                    const fallbackProfile = !j.profile_id ? profileByName.get(j.nombre?.toLowerCase()) : null;
                    const finalProfileId = j.profile_id || fallbackProfile?.id;
                    
                    // Handle profiles join being an array or object
                    const profilesData = (j as any).profiles;
                    const joinedAvatar = Array.isArray(profilesData) ? profilesData[0]?.avatar_url : profilesData?.avatar_url;
                    const finalAvatar = joinedAvatar || fallbackProfile?.avatar_url;

                    // Career Logic: Priority 1: Player's official career, Priority 2: Team in match
                    const careerId = j.carrera_id || matchCareerId;
                    const c = careerMap.get(careerId || 0);

                    soccerMap.set(j.id, {
                        id: j.id, rank: 0, nombre: j.nombre, avatar_url: finalAvatar,
                        profile_id: finalProfileId, equipo: c?.nombre, escudo_url: c?.escudo_url,
                        value: 0
                    });
                }
                soccerMap.get(j.id)!.value++;
            });
            setTopGoleadores(Array.from(soccerMap.values()).sort((a, b) => b.value - a.value).slice(0, 20));

            // 🏀 Anotadores Basket
            const basketMap = new Map<number, LeaderboardEntry>();
            activeEventos.filter(e => {
                const sport = e.partidos?.disciplina_name || '';
                const type = e.tipo_evento?.toLowerCase() || '';
                return sport.includes('Baloncesto') && (type.startsWith('punto') || type === 'puntos');
            }).forEach(e => {
                const j = e.jugadores;
                if (!j || !e.partidos) return;

                const currentMatch = e.partidos;
                const matchCareerId = e.equipo === 'equipo_a' ? currentMatch.carrera_a_id : currentMatch.carrera_b_id;

                if (!basketMap.has(j.id)) {
                    const fallbackProfile = !j.profile_id ? profileByName.get(j.nombre?.toLowerCase()) : null;
                    const finalProfileId = j.profile_id || fallbackProfile?.id;
                    
                    const profilesData = (j as any).profiles;
                    const joinedAvatar = Array.isArray(profilesData) ? profilesData[0]?.avatar_url : profilesData?.avatar_url;
                    const finalAvatar = joinedAvatar || fallbackProfile?.avatar_url;

                    const careerId = j.carrera_id || matchCareerId;
                    const c = careerMap.get(careerId || 0);

                    basketMap.set(j.id, {
                        id: j.id, rank: 0, nombre: j.nombre, avatar_url: finalAvatar,
                        profile_id: finalProfileId, equipo: c?.nombre, escudo_url: c?.escudo_url,
                        value: 0
                    });
                }
                basketMap.get(j.id)!.value += getPointValue(e.tipo_evento);
            });
            setTopAnotadores(Array.from(basketMap.values()).sort((a, b) => b.value - a.value).slice(0, 20));

            // 🟨 Tarjeteadores
            const cardMap = new Map<number, LeaderboardEntry & { yellow: number, red: number }>();
            activeEventos.filter(e => {
                const sport = e.partidos?.disciplina_name || '';
                const type = e.tipo_evento?.toLowerCase() || '';
                return (sport.includes('Fútbol') || sport.includes('Futsal')) && type.startsWith('tarjeta');
            }).forEach(e => {
                const j = e.jugadores;
                if (!j || !e.partidos) return;

                const currentMatch = e.partidos;
                const matchCareerId = e.equipo === 'equipo_a' ? currentMatch.carrera_a_id : currentMatch.carrera_b_id;

                if (!cardMap.has(j.id)) {
                    const fallbackProfile = !j.profile_id ? profileByName.get(j.nombre?.toLowerCase()) : null;
                    const finalProfileId = j.profile_id || fallbackProfile?.id;
                    
                    const profilesData = (j as any).profiles;
                    const joinedAvatar = Array.isArray(profilesData) ? profilesData[0]?.avatar_url : profilesData?.avatar_url;
                    const finalAvatar = joinedAvatar || fallbackProfile?.avatar_url;

                    const careerId = j.carrera_id || matchCareerId;
                    const c = careerMap.get(careerId || 0);

                    cardMap.set(j.id, {
                        id: j.id, rank: 0, nombre: j.nombre, avatar_url: finalAvatar,
                        profile_id: finalProfileId, equipo: c?.nombre, escudo_url: c?.escudo_url,
                        value: 0, yellow: 0, red: 0
                    });
                }
                const p = cardMap.get(j.id)!;
                const t = e.tipo_evento?.toLowerCase();
                if (t === 'tarjeta_amarilla') { p.yellow++; p.value += 1; }
                else if (t === 'tarjeta_roja') { p.red++; p.value += 3; }
            });
            setTopTarjeteadores(Array.from(cardMap.values()).map(p => ({
                ...p, secondaryStats: [{ label: "Amarillas", value: p.yellow }, { label: "Rojas", value: p.red }]
            })).sort((a, b) => b.value - a.value).slice(0, 20));

        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const availableSports = useMemo(() => {
        const set = new Set<string>();
        allMatches.forEach(m => { if (m.disciplinas?.name) set.add(m.disciplinas.name); });
        return Array.from(set).sort();
    }, [allMatches]);

    const pulseData = useMemo(() => {
        const isAll = activeSport === 'Todos';
        const filteredMatches = isAll ? allMatches : allMatches.filter(m => m.disciplina_name === activeSport);
        const filteredEventos = isAll ? eventos : eventos.filter(e => e.partidos?.disciplina_name === activeSport);

        const totalMatches = filteredMatches.length;
        const finalizedMatches = filteredMatches.filter(m => m.estado === 'finalizado').length;

        let goals = 0;
        let points = 0;
        let yellowCards = 0;
        let redCards = 0;

        filteredEventos.forEach(e => {
            if (e.tipo_evento?.toLowerCase() === 'gol') goals++;
            else if (['punto', 'punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento?.toLowerCase())) {
                points += getPointValue(e.tipo_evento);
            }
            if (e.tipo_evento?.toLowerCase() === 'tarjeta_amarilla') yellowCards++;
            if (e.tipo_evento?.toLowerCase() === 'tarjeta_roja') redCards++;
        });

        const activeSportsCount = new Set(allMatches.map(m => m.disciplinas?.name).filter(Boolean)).size;

        return { 
            sport: activeSport, 
            totalMatches, 
            finalizedMatches, 
            metric1: { value: goals, label: "Goles", sublabel: "En fútbol y futsal" },
            metric2: { value: yellowCards + redCards, label: "Tarjetas", sublabel: `${yellowCards} amarillas · ${redCards} rojas` },
            metric3: { value: isAll ? activeSportsCount : finalizedMatches, label: isAll ? "Disciplinas" : "Completados", sublabel: isAll ? "Deportes activos" : "Partidos jugados" }
        };
    }, [allMatches, eventos, activeSport]);

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><UniqueLoading size="lg" /></div>;

    const hasMatches = allMatches.length > 0;

    return (
        <div className="min-h-screen bg-background text-white selection:bg-indigo-500/30 overflow-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-32">
                {/* Global Background Decor - Elemento 8 Watermark */}
                <div className="fixed left-1/2 -translate-x-1/2 top-40 w-[800px] h-[800px] pointer-events-none select-none z-[-1]">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 0.4, scale: 1, rotate: 0 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="w-full h-full"
                    >
                        <img 
                            src="/Olimpiadas elementos [Recuperado]-08.png" 
                            alt="" 
                            className="w-full h-full object-contain animate-float opacity-50"
                            style={{ filter: 'drop-shadow(0 0 100px rgba(16, 185, 129, 0.3))' }}
                        />
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 sm:mb-20 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2.5 mb-4">
                        <BarChart3 size={16} className="text-indigo-400" />
                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1 font-bold tracking-wide text-[10px]">Analytics</Badge>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 leading-none mb-6">Estadísticas</h1>
                    <p className="text-white/40 text-sm font-display tracking-widest max-w-lg pt-2 uppercase leading-relaxed">Panorama completo del torneo. Los líderes que están haciendo historia.</p>
                </motion.div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <UniqueLoading size="md" />
                        <p className="text-[11px] font-bold tracking-wide text-white/30 mt-6 font-display">Procesando datos del torneo...</p>
                    </div>
                ) : (
                    <div className="space-y-12 sm:space-y-16">
                        {(topCareers.length > 0 || topUsers.length > 0) && (
                            <section>
                                <SectionHeader title="Ránking de Popularidad" delay={0.1} />
                                <PopularityRanking topCareers={topCareers} topUsers={topUsers} />
                            </section>
                        )}

                        {!hasMatches ? (
                            <div className="text-center py-24 border border-white/5 rounded-2xl bg-white/[0.02]">
                                <Target size={36} className="mx-auto text-white/15 mb-4" />
                                <p className="text-[11px] font-bold text-white/20 tracking-wider font-display">Aún no hay partidos registrados para mostrar métricas de juego</p>
                            </div>
                        ) : (
                            <>
                                <section>
                                    <SectionHeader title="Resumen General" delay={0.2} />
                                    <PulseHeader activeSport={activeSport} onSportChange={setActiveSport} availableSports={availableSports} data={pulseData} />
                                </section>

                                <div className="grid grid-cols-1 gap-12 sm:gap-16 relative">
                                    <section className="relative z-10">
                                        <SectionHeader title="Máximos Goleadores" delay={0.3} />
                                        <LeaderboardTable title="Bota de Oro" icon={Trophy} entries={topGoleadores} sportName="Fútbol / Futsal" accentColor="#10b981" valueLabel="Goles" />
                                    </section>
                                    <section className="relative z-10">
                                        <SectionHeader title="Máximos Anotadores" delay={0.4} />
                                        <LeaderboardTable title="Puntos Totales" icon={Target} entries={topAnotadores} sportName="Baloncesto" accentColor="#f59e0b" valueLabel="Puntos" />
                                    </section>
                                    <section className="relative z-10">
                                        <SectionHeader title="Control de Disciplina" delay={0.5} />
                                        <LeaderboardTable title="Lucha por el Juego Limpio" icon={ShieldAlert} entries={topTarjeteadores} sportName="Fútbol / Futsal" accentColor="#facc15" valueLabel="Pts Disciplina" />
                                        <p className="mt-4 px-6 text-[10px] font-medium text-white/20 italic">* Puntuación: Roja (3 pts), Amarilla (1 pt). A mayor puntuación, menor disciplina.</p>
                                    </section>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
