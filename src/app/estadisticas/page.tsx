"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Badge } from "@/components/ui-primitives";
import { BarChart3, Target } from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";

import { PulseHeader } from "@/modules/estadisticas/components/pulse-header";
import { DominanceMatrix, type CareerRanking } from "@/modules/estadisticas/components/dominance-matrix";
import { SportBreakdown, type SportStat } from "@/modules/estadisticas/components/sport-breakdown";
import { DisciplineTracker, type CardedPlayer } from "@/modules/estadisticas/components/discipline-tracker";
import { RecordBook, type RecordEntry } from "@/modules/estadisticas/components/record-book";
import { HeadToHead, type Rivalry } from "@/modules/estadisticas/components/head-to-head";
import { PopularityRanking, type TopCareer, type TopUser } from "@/modules/estadisticas/components/popularity-ranking";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPointValue(tipo: string): number {
    if (tipo === 'punto_3') return 3;
    if (tipo === 'punto_2') return 2;
    return 1; // gol, punto, punto_1
}

function getScoreFromDetalle(detalle: any, side: 'a' | 'b'): number {
    if (!detalle) return 0;
    return Number(detalle[`goles_${side}`] ?? detalle[`total_${side}`] ?? detalle[`sets_${side}`] ?? 0);
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title, delay = 0 }: { title: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay }}
            className="flex items-center gap-3 mb-4"
        >
            <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 shrink-0">
                {title}
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-white/5 to-transparent" />
        </motion.div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EstadisticasPage() {
    const { user, profile, isStaff, loading: authLoading } = useAuth();
    const [matches, setMatches] = useState<any[]>([]);
    const [allMatches, setAllMatches] = useState<any[]>([]);
    const [eventos, setEventos] = useState<any[]>([]);
    const [topScorers, setTopScorers] = useState<any[]>([]);
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
            const [matchesRes, allMatchesRes, eventosRes, scorersRes, topCareersRes, topUsersRes] = await Promise.all([
                // 1. Finalized matches with career joins
                supabase
                    .from('partidos')
                    .select(`
                        id, estado, fecha, marcador_detalle, disciplina_id,
                        carrera_a_id, carrera_b_id,
                        disciplinas:disciplina_id(name),
                        carrera_a:carreras!carrera_a_id(id, nombre, escudo_url),
                        carrera_b:carreras!carrera_b_id(id, nombre, escudo_url)
                    `)
                    .eq('estado', 'finalizado'),

                // 2. All matches (for progress tracking)
                supabase
                    .from('partidos')
                    .select('id, estado, disciplina_id, disciplinas:disciplina_id(name)'),

                // 3. All relevant events (scoring + cards)
                supabase
                    .from('olympics_eventos')
                    .select(`
                        tipo_evento, partido_id, equipo,
                        jugadores(id, nombre, profile_id),
                        partidos!inner(estado, disciplinas(name))
                    `)
                    .in('tipo_evento', ['gol', 'punto', 'punto_1', 'punto_2', 'punto_3', 'tarjeta_amarilla', 'tarjeta_roja']),

                // 4. Top scorers view (with fallback)
                safeQuery(
                    supabase.from('view_top_scorers').select('*'),
                    'estadisticas-scorers'
                ),

                // 5. Top Careers by followers
                supabase.from('carreras').select('id, nombre, escudo_url, followers_count').order('followers_count', { ascending: false }).limit(5),
                // 6. Top Users by followers
                supabase.from('profiles').select('id, full_name, avatar_url, followers_count').order('followers_count', { ascending: false }).limit(5)
            ]);

            setMatches(matchesRes.data || []);
            setAllMatches(allMatchesRes.data || []);
            // Only finalized events
            setEventos((eventosRes.data || []).filter((e: any) => e.partidos?.estado === 'finalizado'));
            setTopScorers(scorersRes.data || []);
            setTopCareers(topCareersRes?.data || []);
            setTopUsers(topUsersRes?.data || []);
        } catch (err) {
            console.error("Error fetching stats:", err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Computed: Pulse Header ──────────────────────────────────────────────

    const availableSports = useMemo(() => {
        const set = new Set<string>();
        allMatches.forEach(m => { if (m.disciplinas?.name) set.add(m.disciplinas.name); });
        return Array.from(set).sort();
    }, [allMatches]);

    const pulseData = useMemo(() => {
        const isAll = activeSport === 'Todos';
        const filteredMatches = isAll ? allMatches : allMatches.filter(m => m.disciplinas?.name === activeSport);
        const filteredEventos = isAll ? eventos : eventos.filter(e => e.partidos?.disciplinas?.name === activeSport);

        const totalMatches = filteredMatches.length;
        const finalizedMatches = filteredMatches.filter(m => m.estado === 'finalizado').length;

        let goals = 0;
        let points = 0;
        let yellowCards = 0;
        let redCards = 0;

        filteredEventos.forEach(e => {
            if (e.tipo_evento === 'gol') goals++;
            else if (['punto', 'punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento)) {
                points += getPointValue(e.tipo_evento);
            }
            if (e.tipo_evento === 'tarjeta_amarilla') yellowCards++;
            if (e.tipo_evento === 'tarjeta_roja') redCards++;
        });

        const isFutbol = activeSport === 'Fútbol' || activeSport === 'Futsal';
        const isBasket = activeSport === 'Baloncesto';
        const isVolley = activeSport === 'Voleibol';
        const isTenis = activeSport === 'Tenis';
        const isMesa = activeSport === 'Tenis de Mesa';
        const isAjedrez = activeSport === 'Ajedrez';
        const isNatacion = activeSport === 'Natación';

        // Sport-adaptive metrics
        let metric1, metric2, metric3;

        if (isAll) {
            const activeSportsCount = new Set(allMatches.map(m => m.disciplinas?.name).filter(Boolean)).size;
            metric1 = { value: goals, label: "GOLES", sublabel: "En fútbol y futsal" };
            metric2 = { value: yellowCards + redCards, label: "TARJETAS", sublabel: `${yellowCards} amarillas · ${redCards} rojas` };
            metric3 = { value: activeSportsCount, label: "DISCIPLINAS", sublabel: "Deportes activos" };
        } else if (isFutbol) {
            const avg = finalizedMatches > 0 ? (goals / finalizedMatches) : 0;
            metric1 = { value: goals, label: "GOLES", sublabel: "Goles anotados" };
            metric2 = { value: Math.round(avg * 10) / 10, label: "PROMEDIO", sublabel: "Goles por partido" };
            metric3 = { value: yellowCards + redCards, label: "TARJETAS", sublabel: `${yellowCards} amarillas · ${redCards} rojas` };
        } else if (isBasket) {
            const avg = finalizedMatches > 0 ? (points / finalizedMatches) : 0;
            metric1 = { value: points, label: "PUNTOS", sublabel: "Puntos anotados" };
            metric2 = { value: Math.round(avg), label: "PROMEDIO", sublabel: "Puntos por partido" };
            metric3 = { value: yellowCards + redCards, label: "FALTAS", sublabel: `${yellowCards + redCards} registradas` };
        } else if (isVolley || isMesa) {
            const avg = finalizedMatches > 0 ? (points / finalizedMatches) : 0;
            metric1 = { value: points, label: "PUNTOS", sublabel: "Puntos en sets" };
            metric2 = { value: Math.round(avg), label: "PROMEDIO", sublabel: "Puntos por partido" };
            metric3 = { value: finalizedMatches, label: "COMPLETADOS", sublabel: "Partidos jugados" };
        } else if (isTenis) {
            metric1 = { value: points, label: "JUEGOS", sublabel: "Juegos disputados" };
            metric2 = { value: finalizedMatches, label: "COMPLETADOS", sublabel: "Partidos jugados" };
            metric3 = { value: goals + points, label: "TOTAL", sublabel: "Anotaciones totales" };
        } else if (isAjedrez) {
            metric1 = { value: finalizedMatches, label: "PARTIDAS", sublabel: "Partidas disputadas" };
            metric2 = { value: goals + points, label: "MOVIMIENTOS", sublabel: "Eventos registrados" };
            metric3 = { value: totalMatches - finalizedMatches, label: "PENDIENTES", sublabel: "Por jugar" };
        } else if (isNatacion) {
            metric1 = { value: finalizedMatches, label: "CARRERAS", sublabel: "Carreras completadas" };
            metric2 = { value: totalMatches - finalizedMatches, label: "PENDIENTES", sublabel: "Por disputar" };
            metric3 = { value: totalMatches, label: "PROGRAMADAS", sublabel: "Total del torneo" };
        } else {
            metric1 = { value: goals + points, label: "ANOTACIONES", sublabel: "Eventos de puntuación" };
            metric2 = { value: yellowCards + redCards, label: "TARJETAS", sublabel: `${yellowCards} amarillas · ${redCards} rojas` };
            metric3 = { value: finalizedMatches, label: "COMPLETADOS", sublabel: "Partidos jugados" };
        }

        return { sport: activeSport, totalMatches, finalizedMatches, metric1, metric2, metric3 };
    }, [allMatches, eventos, activeSport]);

    // ─── Computed: Dominance Matrix ──────────────────────────────────────────

    const careerRankings = useMemo((): CareerRanking[] => {
        const map = new Map<number, CareerRanking>();

        matches.forEach(m => {
            const ca = m.carrera_a;
            const cb = m.carrera_b;
            if (!ca?.id || !cb?.id) return;

            const scoreA = getScoreFromDetalle(m.marcador_detalle, 'a');
            const scoreB = getScoreFromDetalle(m.marcador_detalle, 'b');

            // Initialize careers
            for (const c of [ca, cb]) {
                if (!map.has(c.id)) {
                    map.set(c.id, {
                        carrera_id: c.id,
                        nombre: c.nombre,
                        escudo_url: c.escudo_url,
                        victorias: 0, derrotas: 0, empates: 0,
                        total_partidos: 0, win_rate: 0,
                        puntos_favor: 0, puntos_contra: 0,
                    });
                }
            }

            const ra = map.get(ca.id)!;
            const rb = map.get(cb.id)!;

            ra.total_partidos++;
            rb.total_partidos++;
            ra.puntos_favor += scoreA;
            ra.puntos_contra += scoreB;
            rb.puntos_favor += scoreB;
            rb.puntos_contra += scoreA;

            if (scoreA > scoreB) { ra.victorias++; rb.derrotas++; }
            else if (scoreB > scoreA) { rb.victorias++; ra.derrotas++; }
            else { ra.empates++; rb.empates++; }
        });

        const rankings = Array.from(map.values());
        rankings.forEach(r => {
            r.win_rate = r.total_partidos > 0 ? (r.victorias / r.total_partidos) * 100 : 0;
        });

        return rankings.sort((a, b) => b.victorias - a.victorias || b.win_rate - a.win_rate);
    }, [matches]);

    // ─── Computed: Sport Breakdown ───────────────────────────────────────────

    const sportStats = useMemo((): SportStat[] => {
        const sportMap = new Map<string, { total: number; finalized: number; points: number }>();

        // Count matches per sport
        allMatches.forEach(m => {
            const name = m.disciplinas?.name;
            if (!name) return;
            if (!sportMap.has(name)) sportMap.set(name, { total: 0, finalized: 0, points: 0 });
            const s = sportMap.get(name)!;
            s.total++;
            if (m.estado === 'finalizado') s.finalized++;
        });

        // Sum points per sport from eventos
        eventos.forEach(e => {
            if (!['gol', 'punto', 'punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento)) return;
            const name = e.partidos?.disciplinas?.name;
            if (!name || !sportMap.has(name)) return;
            sportMap.get(name)!.points += getPointValue(e.tipo_evento);
        });

        // Top scorer per sport from view
        const topByDisciplina = new Map<string, { nombre: string; puntos: number }>();
        topScorers.forEach((s: any) => {
            const disc = s.disciplina;
            if (!disc) return;
            const current = topByDisciplina.get(disc);
            if (!current || s.puntos_totales > current.puntos) {
                topByDisciplina.set(disc, { nombre: s.nombre, puntos: s.puntos_totales });
            }
        });

        return Array.from(sportMap.entries())
            .map(([name, data]) => {
                const isFutbol = name === 'Fútbol' || name === 'Futsal';
                const isSetSport = ['Voleibol', 'Tenis', 'Tenis de Mesa'].includes(name);
                return {
                    name,
                    totalMatches: data.total,
                    finalizedMatches: data.finalized,
                    totalPoints: data.points,
                    avgPerMatch: data.finalized > 0 ? data.points / data.finalized : 0,
                    metricLabel: isFutbol ? 'Goles' : isSetSport ? 'Puntos' : name === 'Ajedrez' ? 'Partidas' : 'Anotaciones',
                    avgLabel: isFutbol ? 'Goles/Partido' : isSetSport ? 'Pts/Partido' : 'Prom/Partido',
                    topScorer: topByDisciplina.get(name) || null,
                };
            })
            .sort((a, b) => b.finalizedMatches - a.finalizedMatches);
    }, [allMatches, eventos, topScorers]);

    // ─── Computed: Discipline Tracker ────────────────────────────────────────

    const { yellowLeaders, redLeaders } = useMemo(() => {
        const yellowMap = new Map<number, CardedPlayer>();
        const redMap = new Map<number, CardedPlayer>();

        eventos.forEach(e => {
            if (e.tipo_evento !== 'tarjeta_amarilla' && e.tipo_evento !== 'tarjeta_roja') return;
            const j = e.jugadores;
            if (!j) return;

            const map = e.tipo_evento === 'tarjeta_amarilla' ? yellowMap : redMap;
            if (!map.has(j.id)) {
                map.set(j.id, {
                    jugador_id: j.id,
                    nombre: j.nombre,
                    profile_id: j.profile_id,
                    deporte: e.partidos?.disciplinas?.name || '',
                    count: 0,
                });
            }
            map.get(j.id)!.count++;
        });

        return {
            yellowLeaders: Array.from(yellowMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
            redLeaders: Array.from(redMap.values()).sort((a, b) => b.count - a.count).slice(0, 5),
        };
    }, [eventos]);

    // ─── Computed: Record Book ───────────────────────────────────────────────

    const records = useMemo((): RecordEntry[] => {
        // Best single-match performance (any sport)
        const matchPlayerMap = new Map<string, { pts: number; nombre: string; sport: string; matchId: number }>();

        eventos.forEach(e => {
            if (!['gol', 'punto', 'punto_1', 'punto_2', 'punto_3'].includes(e.tipo_evento)) return;
            const j = e.jugadores;
            if (!j) return;
            const sport = e.partidos?.disciplinas?.name || '';
            const key = `${j.id}-${e.partido_id}`;

            if (!matchPlayerMap.has(key)) {
                matchPlayerMap.set(key, { pts: 0, nombre: j.nombre, sport, matchId: e.partido_id });
            }
            matchPlayerMap.get(key)!.pts += getPointValue(e.tipo_evento);
        });

        const allPerformances = Array.from(matchPlayerMap.values()).sort((a, b) => b.pts - a.pts);

        const result: RecordEntry[] = [];

        // Overall best
        if (allPerformances.length > 0) {
            const best = allPerformances[0];
            result.push({
                label: "Mejor actuación",
                value: best.pts,
                playerName: best.nombre,
                sportName: best.sport,
                icon: "flame",
            });
        }

        // Best per football
        const bestFutbol = allPerformances.find(p => p.sport === 'Fútbol' || p.sport === 'Futsal');
        if (bestFutbol && bestFutbol !== allPerformances[0]) {
            result.push({
                label: "Más goles (partido)",
                value: bestFutbol.pts,
                playerName: bestFutbol.nombre,
                sportName: bestFutbol.sport,
                icon: "zap",
            });
        }

        // Best basketball
        const bestBasket = allPerformances.find(p => p.sport === 'Baloncesto');
        if (bestBasket && bestBasket !== allPerformances[0]) {
            result.push({
                label: "Más puntos (partido)",
                value: bestBasket.pts,
                playerName: bestBasket.nombre,
                sportName: bestBasket.sport,
                icon: "target",
            });
        }

        // Largest victory margin
        let maxMargin = { margin: 0, winner: '', loser: '', sport: '' };
        matches.forEach(m => {
            const scoreA = getScoreFromDetalle(m.marcador_detalle, 'a');
            const scoreB = getScoreFromDetalle(m.marcador_detalle, 'b');
            const margin = Math.abs(scoreA - scoreB);
            if (margin > maxMargin.margin) {
                const winner = scoreA > scoreB ? m.carrera_a?.nombre : m.carrera_b?.nombre;
                const loser = scoreA > scoreB ? m.carrera_b?.nombre : m.carrera_a?.nombre;
                maxMargin = {
                    margin,
                    winner: winner || 'Equipo',
                    loser: loser || 'Equipo',
                    sport: m.disciplinas?.name || '',
                };
            }
        });

        if (maxMargin.margin > 0) {
            result.push({
                label: "Mayor diferencia",
                value: maxMargin.margin,
                playerName: maxMargin.winner,
                sportName: maxMargin.sport,
                context: `vs ${maxMargin.loser}`,
                icon: "swords",
            });
        }

        return result;
    }, [eventos, matches]);

    // ─── Computed: Head-to-Head ──────────────────────────────────────────────

    const rivalries = useMemo((): Rivalry[] => {
        const pairMap = new Map<string, Rivalry>();

        matches.forEach(m => {
            const ca = m.carrera_a;
            const cb = m.carrera_b;
            if (!ca?.id || !cb?.id) return;

            // Normalize pair key (smaller id first)
            const [idA, idB] = ca.id < cb.id ? [ca.id, cb.id] : [cb.id, ca.id];
            const key = `${idA}-${idB}`;

            if (!pairMap.has(key)) {
                const first = ca.id < cb.id ? ca : cb;
                const second = ca.id < cb.id ? cb : ca;
                pairMap.set(key, {
                    carrera_a: { id: first.id, nombre: first.nombre, escudo_url: first.escudo_url },
                    carrera_b: { id: second.id, nombre: second.nombre, escudo_url: second.escudo_url },
                    wins_a: 0, wins_b: 0, draws: 0, totalMatches: 0,
                });
            }

            const rivalry = pairMap.get(key)!;
            rivalry.totalMatches++;

            const scoreA = getScoreFromDetalle(m.marcador_detalle, 'a');
            const scoreB = getScoreFromDetalle(m.marcador_detalle, 'b');

            // Map actual carrera to normalized position
            const isNormal = ca.id < cb.id; // ca maps to rivalry.carrera_a
            const winnerIsA = scoreA > scoreB;
            const winnerIsB = scoreB > scoreA;

            if (winnerIsA) {
                if (isNormal) rivalry.wins_a++;
                else rivalry.wins_b++;
            } else if (winnerIsB) {
                if (isNormal) rivalry.wins_b++;
                else rivalry.wins_a++;
            } else {
                rivalry.draws++;
            }
        });

        return Array.from(pairMap.values())
            .filter(r => r.totalMatches >= 2)
            .sort((a, b) => b.totalMatches - a.totalMatches)
            .slice(0, 6);
    }, [matches]);

    // ─── Render ──────────────────────────────────────────────────────────────

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    const hasData = matches.length > 0 || eventos.length > 0;

    return (
        <div className="min-h-screen bg-background text-white selection:bg-indigo-500/30 overflow-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-[100px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-32">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-10 sm:mb-14"
                >
                    <div className="flex items-center gap-2.5 mb-3">
                        <BarChart3 size={16} className="text-indigo-400" />
                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1 font-black tracking-[0.2em] text-[9px]">
                            ANALYTICS
                        </Badge>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-sans leading-[0.95] text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 mb-2">
                        Estadísticas
                    </h1>
                    <p className="text-white/30 text-sm font-medium max-w-md">
                        Panorama completo del torneo. Datos en tiempo real de todas las disciplinas.
                    </p>
                </motion.div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <UniqueLoading size="md" />
                        <p className="text-[10px] font-black tracking-widest text-white/30 mt-6 uppercase">
                            Procesando datos del torneo...
                        </p>
                    </div>
                ) : !hasData ? (
                    <div className="text-center py-24 border border-white/5 rounded-2xl bg-white/[0.02]">
                        <Target size={36} className="mx-auto text-white/15 mb-4" />
                        <p className="text-xs font-black text-white/25 uppercase tracking-[0.3em]">
                            Aún no hay partidos finalizados
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12 sm:space-y-16">
                        {/* 1. Pulse Header */}
                        <section>
                            <SectionHeader title="Resumen General" delay={0.1} />
                            <PulseHeader
                                activeSport={activeSport}
                                onSportChange={setActiveSport}
                                availableSports={availableSports}
                                data={pulseData}
                            />
                        </section>

                        {/* 2. Sport Breakdown */}
                        {sportStats.length > 0 && (
                            <section>
                                <SectionHeader title="Por Disciplina" delay={0.2} />
                                <SportBreakdown sports={sportStats} />
                            </section>
                        )}

                        {/* 2.5 Popularity Ranking */}
                        {(topCareers.length > 0 || topUsers.length > 0) && (
                            <section>
                                <SectionHeader title="Ránking de Popularidad" delay={0.25} />
                                <PopularityRanking topCareers={topCareers} topUsers={topUsers} />
                            </section>
                        )}

                        {/* 3. Dominance Matrix */}
                        {careerRankings.length > 0 && (
                            <section>
                                <SectionHeader title="Power Rankings" delay={0.3} />
                                <DominanceMatrix rankings={careerRankings} />
                            </section>
                        )}

                        {/* 4. Record Book */}
                        {records.length > 0 && (
                            <section>
                                <SectionHeader title="Récords del Torneo" delay={0.4} />
                                <RecordBook records={records} />
                            </section>
                        )}

                        {/* 5. Discipline Tracker */}
                        {(yellowLeaders.length > 0 || redLeaders.length > 0) && (
                            <section>
                                <SectionHeader title="Disciplina" delay={0.5} />
                                <DisciplineTracker
                                    yellowLeaders={yellowLeaders}
                                    redLeaders={redLeaders}
                                />
                            </section>
                        )}

                        {/* 6. Head-to-Head */}
                        {rivalries.length > 0 && (
                            <section>
                                <SectionHeader title="Rivalidades" delay={0.6} />
                                <HeadToHead rivalries={rivalries} />
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
