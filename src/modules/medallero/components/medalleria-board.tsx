"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Trophy, Medal, Award, Crown, TrendingUp, Filter, Users, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { MedalSkeleton } from "@/components/skeletons";
import { TeamStatsModal } from "./team-stats-modal";
import { SPORT_EMOJI, CARRERAS_UNINORTE, SPORT_COLORS } from "@/lib/constants";
import { getCarreraName } from "@/lib/sport-helpers";
import { Button } from "@/components/ui-primitives";
import { SportIcon } from "@/components/sport-icons";

// Tipo centralizado en modules/medallero/types.ts — re-exportado para compatibilidad
import type { MedalEntry } from '@/modules/medallero/types';
export type { MedalEntry };

// Datos simulados (Fallback)
const SAMPLE_DATA: MedalEntry[] = [
    { id: 1, equipo_nombre: "Ingeniería Civil", oro: 8, plata: 4, bronce: 2, puntos: 54 },
    { id: 2, equipo_nombre: "Medicina", oro: 6, plata: 7, bronce: 3, puntos: 54 },
    { id: 3, equipo_nombre: "Ingeniería Mecánica", oro: 5, plata: 5, bronce: 1, puntos: 41 },
    { id: 4, equipo_nombre: "Derecho", oro: 4, plata: 2, bronce: 5, puntos: 31 },
    { id: 5, equipo_nombre: "Arquitectura", oro: 2, plata: 5, bronce: 6, puntos: 31 },
    { id: 6, equipo_nombre: "Ingeniería de Sistemas", oro: 1, plata: 3, bronce: 4, puntos: 18 },
    { id: 7, equipo_nombre: "Psicología", oro: 0, plata: 4, bronce: 2, puntos: 14 },
    { id: 8, equipo_nombre: "Comunicación Social", oro: 0, plata: 1, bronce: 5, puntos: 8 },
].sort((a, b) => b.puntos - a.puntos); // Ordenar por puntos total

export function MedalLeaderboard() {
    const [medallero, setMedallero] = useState<MedalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSport, setActiveSport] = useState<string>('Fútbol');
    const [activeGender, setActiveGender] = useState<string>('todos');
    const [carreraMap, setCarreraMap] = useState<Record<string, number>>({});
    const router = useRouter();
    const fetchMedalleroRef = useRef<() => void>(() => {});

    const fetchMedallero = async () => {
        setLoading(true);

        const [matchesResult, carrerasResult] = await Promise.all([
            safeQuery(
                supabase.from('partidos')
                    .select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)'),
                'medallero-fetch'
            ),
            supabase.from('carreras').select('id, nombre'),
        ]);

        const { data: rawMatches, error } = matchesResult;

        // Build name→id map for career links
        if (carrerasResult.data) {
            const map: Record<string, number> = {};
            carrerasResult.data.forEach((c: any) => { map[c.nombre] = c.id; });
            setCarreraMap(map);
        }

        if (error || !rawMatches) {
            setMedallero(SAMPLE_DATA);
            setLoading(false);
            return;
        }

        // Pre-normalize matches (handle array/object join and status)
        const matches = rawMatches.map(m => ({
            ...m,
            disciplinas: Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas,
            estado_norm: (m.estado || '').toLowerCase().trim()
        })).filter(m => m.estado_norm === 'finalizado');

        // Initialize Career map
        const careerStats: Record<string, MedalEntry> = {};
        CARRERAS_UNINORTE.forEach((name, idx) => {
            careerStats[name] = {
                id: idx,
                equipo_nombre: name,
                oro: 0,
                plata: 0,
                bronce: 0,
                puntos: 0,
                won: 0,
                draw: 0,
                lost: 0,
                played: 0
            };
        });

        // Filter and Process Matches
        const filteredMatches = matches.filter(m => {
            if (activeSport !== 'todos' && m.disciplinas?.name !== activeSport) return false;
            if (activeGender !== 'todos' && (m.genero || 'masculino') !== activeGender) return false;
            return true;
        });

        // Helper for fuzzy matching careers
        const normalize = (str: string) => str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const getMatchedCareer = (name: string): string => {
            const normName = normalize(name);
            // 1. Direct match
            if (careerStats[name]) return name;
            // 2. Fuzzy match in constants
            return Object.keys(careerStats).find(k => normalize(k) === normName) ||
                Object.keys(careerStats).find(k => normalize(k).includes(normName) || normName.includes(normalize(k))) ||
                name;
        };

        filteredMatches.forEach(m => {
            const disc = m.disciplinas?.name;
            const det = m.marcador_detalle || {};
            const faseNormalizada = (m.fase || '').toLowerCase().trim();
            const isFinal = faseNormalizada.includes('final');
            const isTercero = faseNormalizada.includes('tercer') || faseNormalizada.includes('3er') || faseNormalizada.includes('3º');

            // 1. Point-based common logic (for PJ/PG/PE/PP)
            const rawCarreraA = getCarreraName(m, 'a');
            const rawCarreraB = getCarreraName(m, 'b');

            const carreraA = getMatchedCareer(rawCarreraA);
            const carreraB = getMatchedCareer(rawCarreraB);

            // Fetch scores safely
            const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? 0;
            const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? 0;

            if (careerStats[carreraA]) {
                careerStats[carreraA].played!++;
                if (m.carrera_a?.escudo_url) careerStats[carreraA].escudo_url = m.carrera_a.escudo_url;
            }
            if (careerStats[carreraB]) {
                careerStats[carreraB].played!++;
                if (m.carrera_b?.escudo_url) careerStats[carreraB].escudo_url = m.carrera_b.escudo_url;
            }

            if (scoreA > scoreB) {
                if (careerStats[carreraA]) { careerStats[carreraA].won!++; careerStats[carreraA].puntos += 3; }
                if (careerStats[carreraB]) careerStats[carreraB].lost!++;

                // Medals Logic (Only for sports that are NOT races, races handle it differently)
                if (det.tipo !== 'carrera') {
                    if (isFinal) {
                        if (careerStats[carreraA]) careerStats[carreraA].oro++;
                        if (careerStats[carreraB]) careerStats[carreraB].plata++;
                    }
                }
            } else if (scoreB > scoreA) {
                if (careerStats[carreraB]) { careerStats[carreraB].won!++; careerStats[carreraB].puntos += 3; }
                if (careerStats[carreraA]) careerStats[carreraA].lost!++;

                // Medals Logic
                if (det.tipo !== 'carrera') {
                    if (isFinal) {
                        if (careerStats[carreraB]) careerStats[carreraB].oro++;
                        if (careerStats[carreraA]) careerStats[carreraA].plata++;
                    }
                }
            } else {
                if (careerStats[carreraA]) { careerStats[carreraA].draw!++; careerStats[carreraA].puntos += 1; }
                if (careerStats[carreraB]) { careerStats[carreraB].draw!++; careerStats[carreraB].puntos += 1; }
            }

            // 2. Race-specific logic (Swimming / Athletics)
            if (det.tipo === 'carrera' && det.resultados) {
                const results = det.resultados as any[];
                results.forEach(res => {
                    const possibleName = res.equipo_nombre || res.equipo || res.delegacion;
                    if (!possibleName) return;
                    const matchedCareer = getMatchedCareer(possibleName);

                    if (careerStats[matchedCareer]) {
                        if (res.puesto === 1) careerStats[matchedCareer].oro++;
                        else if (res.puesto === 2) careerStats[matchedCareer].plata++;
                        // For race participants, PJ is also counted
                        careerStats[matchedCareer].played!++;
                    }
                });
            }
        });

        // Convert to Array and Sort
        const result = Object.values(careerStats).filter(c => c.played! > 0 || c.oro > 0 || c.plata > 0 || c.bronce > 0);

        result.sort((a, b) => {
            if (b.oro !== a.oro) return b.oro - a.oro;
            if (b.plata !== a.plata) return b.plata - a.plata;
            return b.puntos - a.puntos;
        });

        setMedallero(result);
        setLoading(false);
    };

    const rtDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetchMedallero();

        const channel = supabase
            .channel('realtime-medallero')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                if (rtDebounceRef.current) clearTimeout(rtDebounceRef.current);
                rtDebounceRef.current = setTimeout(() => fetchMedallero(), 1000);
            })
            .subscribe();

        // Keep ref current so the app:revalidate listener always calls the latest version
        fetchMedalleroRef.current = fetchMedallero;

        return () => {
            if (rtDebounceRef.current) clearTimeout(rtDebounceRef.current);
            supabase.removeChannel(channel);
        };
    }, [activeSport, activeGender]);

    // Listen for global revalidation signal (fired by VisibilityRevalidate after 15s away)
    useEffect(() => {
        const handler = () => fetchMedalleroRef.current();
        window.addEventListener('app:revalidate', handler);
        return () => window.removeEventListener('app:revalidate', handler);
    }, []);

    // Helper para formatear nombres largos en Avatar
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };



    // Componente de Podio Individual Estilizado (NUEVO DISEÑO PREMIUM)
    const TopPodium = ({ entry, rank }: { entry: MedalEntry, rank: number }) => {
        const isFirst = rank === 1;

        // Colores y Estilos según Ranking - Brighter version
        const podiumConfigs: Record<number, any> = {
            1: {
                glow: "shadow-[0_0_50px_rgba(251,146,60,0.3)] border-orange-500/60 ring-2 ring-orange-500/20",
                height: "h-[320px] sm:h-[350px]",
                icon: <Trophy size={20} className="text-orange-400" />,
                iconBg: "bg-orange-500/20",
                number: "01",
                numberColor: "text-orange-500 drop-shadow-[0_0_15px_rgba(251,146,60,0.6)]"
            },
            2: {
                glow: "shadow-[0_0_30px_rgba(148,163,184,0.15)] border-slate-400/30",
                height: "h-[280px] sm:h-[300px]",
                icon: <Medal size={18} className="text-slate-300" />,
                iconBg: "bg-slate-300/10",
                number: "02",
                numberColor: "text-slate-400/80"
            },
            3: {
                glow: "shadow-[0_0_30px_rgba(180,83,9,0.15)] border-amber-800/30",
                height: "h-[270px] sm:h-[290px]",
                icon: <Award size={18} className="text-amber-700" />,
                iconBg: "bg-amber-700/10",
                number: "03",
                numberColor: "text-amber-700/80"
            }
        };

        const config = podiumConfigs[rank] || podiumConfigs[1];

        return (
            <div
                onClick={() => carreraMap[entry.equipo_nombre] ? router.push(`/carrera/${carreraMap[entry.equipo_nombre]}`) : undefined}
                className={cn(
                    "flex flex-col items-center group cursor-pointer relative",
                    isFirst ? "z-30 w-[140px] sm:w-[180px]" : "z-20 w-[110px] sm:w-[140px]"
                )}
            >
                {/* LÍDER Badge */}
                {isFirst && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[9px] font-black px-4 py-1 rounded-md uppercase tracking-widest shadow-lg animate-bounce z-40">
                        Líder
                    </div>
                )}

                {/* Vertical Pilar */}
                <div className={cn(
                    "w-full bg-[#0d0b1a] rounded-[2rem] border transition-all duration-500 group-hover:bg-[#110f22] flex flex-col items-center pt-6 sm:pt-10 overflow-hidden relative",
                    config.height, config.glow,
                    "group-hover:scale-[1.02]"
                )}>
                    {/* Top Medal Icon in Circle */}
                    <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-white/5 shrink-0",
                        config.iconBg
                    )}>
                        {config.icon}
                    </div>

                    {/* Team Avatar/Initial */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-xl flex items-center justify-center mb-3 sm:mb-4 border border-white/5 overflow-hidden p-1 shrink-0">
                        {entry.escudo_url ? (
                            <img src={entry.escudo_url} alt={entry.equipo_nombre} className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-lg sm:text-xl font-black text-white/50">{getInitials(entry.equipo_nombre)}</span>
                        )}
                    </div>

                    {/* Info */}
                    <div className="text-center px-2 space-y-1 mb-6">
                        <h4 className="text-[10px] sm:text-[12px] font-black text-white uppercase tracking-tighter leading-tight line-clamp-2 px-1">
                            {carreraMap[entry.equipo_nombre] ? (
                                <Link href={`/carrera/${carreraMap[entry.equipo_nombre]}`} className="hover:text-orange-400 transition-colors">
                                    {entry.equipo_nombre}
                                </Link>
                            ) : entry.equipo_nombre}
                        </h4>
                        <p className="text-[9px] sm:text-[11px] font-bold text-white/40 italic">
                            {entry.oro} Oros
                        </p>
                    </div>

                    {/* Bottom Number Box */}
                    <div className="mt-auto w-full bg-black/40 h-16 sm:h-20 flex items-center justify-center relative border-t border-white/5">
                        <span className={cn(
                            "text-4xl sm:text-5xl font-black tracking-tighter",
                            config.numberColor
                        )}>
                            {config.number}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && medallero.length === 0) return (
        <MedalSkeleton />
    );

    const top2 = medallero.slice(0, 2);
    let podiumOrder: MedalEntry[] = [];
    if (top2.length >= 1) {
        if (top2.length === 1) podiumOrder = [top2[0]];
        else podiumOrder = [top2[1], top2[0]];
    }

    return (
        <section className="relative overflow-hidden rounded-[1rem] sm:rounded-[2.5rem] bg-[#0a0816] shadow-2xl pb-6">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header & Filters Section matching reference image */}
            <div className="relative z-10 p-6 sm:p-10 border-b border-white/5 space-y-10">
                {/* Reference style title */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[9px] sm:text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">
                            Actualizado en tiempo real
                        </span>
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        Podio Olímpico
                    </h2>
                    {/* Filters Row - Redesigned for Premium Appeal */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Gender Selection */}
                            <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl w-full sm:w-auto self-start">
                                {[
                                    { id: 'todos', label: 'Todos', icon: <Users size={16} /> },
                                    { id: 'masculino', label: 'Masc', icon: '♂' },
                                    { id: 'femenino', label: 'Fem', icon: '♀' },
                                    { id: 'mixto', label: 'Mix', icon: '⚤' },
                                ].map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setActiveGender(g.id)}
                                        className={cn(
                                            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                            activeGender === g.id
                                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                                : "text-white/30 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <span className="text-base">{g.icon}</span>
                                        <span className="hidden sm:inline">{g.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                                <Filter size={12} />
                                <span>Búsqueda por Disciplina</span>
                            </div>
                        </div>

                        {/* Discipline Tabs */}
                        <div className="relative group">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-linear-r py-1">
                                {Object.keys(SPORT_COLORS).map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => setActiveSport(name)}
                                        className={cn(
                                            "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap border shrink-0",
                                            activeSport === name
                                                ? "bg-orange-500 text-white border-transparent shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                                                : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <SportIcon sport={name} size={18} />
                                        <span>{name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-10 pt-10 pb-10 border-b border-white/5 relative z-20">
                <div className="flex justify-center items-end gap-2 sm:gap-4 mb-4 sm:mb-10 min-h-[350px]">
                    {podiumOrder.map((entry) => {
                        const realRank = top2.indexOf(entry) + 1;
                        return <TopPodium key={'podium-' + entry.id} entry={entry} rank={realRank} />;
                    })}
                </div>
            </div>

            <div className="px-4 sm:px-10 mt-8">
                {/* List Design matching reference image */}
                <div className="flex flex-col gap-3 relative z-20">
                    {medallero.map((entry, idx) => {
                        const rank = (idx + 1).toString().padStart(2, '0');
                        return (
                            <div
                                key={entry.id || entry.equipo_nombre}
                                className="flex flex-col sm:flex-row bg-[#1a1625]/90 backdrop-blur-sm border border-white/5 hover:border-white/20 transition-all duration-300 group shadow-xl rounded-3xl overflow-hidden min-h-[120px]"
                            >
                                <div className="flex flex-1 w-full">
                                    {/* Avatar Column */}
                                    <div className="w-[80px] sm:w-[130px] shrink-0 border-r border-white/5 relative flex items-center justify-center bg-black/40 p-2">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay" />
                                        {entry.escudo_url ? (
                                            <div className="w-14 h-14 sm:w-20 sm:h-20 z-10 drop-shadow-lg relative flex items-center justify-center">
                                                <img src={entry.escudo_url} alt={entry.equipo_nombre} className="w-full h-full object-contain filter group-hover:brightness-110 transition-all" />
                                            </div>
                                        ) : (
                                            <span className="text-3xl sm:text-5xl font-black text-white/10 uppercase tracking-tighter mix-blend-plus-lighter z-10 filter grayscale contrast-200">
                                                {getInitials(entry.equipo_nombre)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Center Content Column */}
                                    <div className="flex-1 px-4 sm:px-6 py-4 flex flex-col justify-between min-w-0">
                                        <div className="mb-3">
                                            {/* Rank Number with Yellow Underline */}
                                            <div className="inline-flex border-b-2 border-[#FFC000] pb-0.5 mb-2 gap-2 items-center">
                                                <span className="text-[11px] sm:text-xs font-black text-white tracking-widest leading-none drop-shadow-md">{rank}</span>
                                                <span className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-none">Global</span>
                                            </div>

                                            {/* Name */}
                                            <h2 className="text-sm sm:text-xl font-black text-white/90 leading-tight tracking-tight line-clamp-2">
                                                {carreraMap[entry.equipo_nombre] ? (
                                                    <Link href={`/carrera/${carreraMap[entry.equipo_nombre]}`} className="hover:text-orange-400 transition-colors">
                                                        {entry.equipo_nombre}
                                                    </Link>
                                                ) : entry.equipo_nombre}
                                            </h2>

                                            <span className="text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1 block truncate">
                                                PJ: {entry.played || 0} Partidos
                                            </span>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-8 mt-auto items-end">
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                                                    <Trophy size={11} className="sm:w-3.5 sm:h-3.5" />
                                                </div>
                                                <span className="text-xs sm:text-xl font-black text-white tabular-nums">
                                                    {entry.oro.toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-2 opacity-60">
                                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-300/10 flex items-center justify-center text-slate-300">
                                                    <Medal size={11} className="sm:w-3.5 sm:h-3.5" />
                                                </div>
                                                <span className="text-xs sm:text-base font-black text-white tabular-nums">
                                                    {entry.plata.toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Points Box (Right Column) */}
                                <div className="w-full sm:w-[130px] h-12 sm:h-auto shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 flex flex-row sm:flex-col items-center justify-between sm:justify-center px-6 sm:px-0 bg-black/60 group-hover:bg-[#111111] transition-colors relative">
                                    <div className="absolute inset-0 bg-gradient-to-r sm:bg-gradient-to-b from-transparent to-red-600/5 pointer-events-none" />
                                    
                                    <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-0">
                                        <span className="text-xl sm:text-4xl font-black text-white tracking-tighter leading-none tabular-nums drop-shadow-lg relative z-10">
                                            {entry.oro + entry.plata}
                                        </span>
                                        <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-[0.2em] sm:pt-1 relative z-10">
                                            Total Medals
                                        </span>
                                    </div>

                                    <div className="text-[10px] font-bold text-red-500/80 font-mono tracking-widest sm:mt-2">
                                        {entry.puntos} PTS
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {medallero.length === 0 && !loading && (
                <div className="text-center py-20 text-white/50 font-bold">
                    No hay datos registrados aún.
                </div>
            )}


        </section>
    );
}
