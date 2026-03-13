"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MedalSkeleton } from "@/components/skeletons";
import { TeamStatsModal } from "./team-stats-modal";
import { SPORT_EMOJI, CARRERAS_UNINORTE } from "@/lib/constants";
import { getCarreraName } from "@/lib/sport-helpers";
import { Button } from "./ui-primitives";
import { Filter, Users } from "lucide-react";

export type MedalEntry = {
    id: number;
    equipo_nombre: string;
    oro: number;
    plata: number;
    bronce: number;
    puntos: number;
    won?: number;
    draw?: number;
    lost?: number;
    played?: number;
    updated_at?: string;
};

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
    const [selectedTeam, setSelectedTeam] = useState<{ team: MedalEntry, rank: number } | null>(null);
    const [activeSport, setActiveSport] = useState<string>('todos');
    const [activeGender, setActiveGender] = useState<string>('todos');

    const fetchMedallero = async () => {
        setLoading(true);

        const { data: matches, error } = await safeQuery(
            supabase.from('partidos')
                .select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)')
                .eq('estado', 'finalizado'),
            'medallero-calc'
        );

        if (error || !matches) {
            setMedallero(SAMPLE_DATA);
            setLoading(false);
            return;
        }

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

        filteredMatches.forEach(m => {
            const disc = m.disciplinas?.name;
            const det = m.marcador_detalle || {};
            const faseNormalizada = (m.fase || '').toLowerCase().trim();
            const isFinal = faseNormalizada === 'final';
            const isTercero = faseNormalizada === 'tercer puesto' || faseNormalizada === 'tercer_puesto' || faseNormalizada === '3er puesto';

            // 1. Point-based common logic (for PJ/PG/PE/PP)
            const carreraA = getCarreraName(m, 'a');
            const carreraB = getCarreraName(m, 'b');

            const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? 0;
            const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? 0;

            if (careerStats[carreraA]) careerStats[carreraA].played!++;
            if (careerStats[carreraB]) careerStats[carreraB].played!++;

            if (scoreA > scoreB) {
                if (careerStats[carreraA]) { careerStats[carreraA].won!++; careerStats[carreraA].puntos += 3; }
                if (careerStats[carreraB]) careerStats[carreraB].lost!++;
                
                // Medals Logic (Only for sports that are NOT races, races handle it differently)
                if (det.tipo !== 'carrera') {
                    if (isFinal) {
                        if (careerStats[carreraA]) careerStats[carreraA].oro++;
                        if (careerStats[carreraB]) careerStats[carreraB].plata++;
                    } else if (isTercero) {
                        if (careerStats[carreraA]) careerStats[carreraA].bronce++;
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
                    } else if (isTercero) {
                        if (careerStats[carreraB]) careerStats[carreraB].bronce++;
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
                    // Try to match the career name from the result
                    const possibleName = res.equipo_nombre || res.equipo || res.delegacion;
                    if (!possibleName) return;
                    
                    // Direct match or search in stats
                    let matchedCareer = possibleName;
                    if (!careerStats[matchedCareer]) {
                        matchedCareer = Object.keys(careerStats).find(k => 
                            k.toLowerCase().includes(possibleName.toLowerCase()) || 
                            possibleName.toLowerCase().includes(k.toLowerCase())
                        ) || matchedCareer;
                    }

                    if (careerStats[matchedCareer]) {
                        if (res.puesto === 1) careerStats[matchedCareer].oro++;
                        else if (res.puesto === 2) careerStats[matchedCareer].plata++;
                        else if (res.puesto === 3) careerStats[matchedCareer].bronce++;
                    }
                });
            }
        });

        // Convert to Array and Sort
        const result = Object.values(careerStats).filter(c => c.played! > 0 || c.oro > 0 || c.plata > 0 || c.bronce > 0);
        
        result.sort((a, b) => {
            if (b.oro !== a.oro) return b.oro - a.oro;
            if (b.plata !== a.plata) return b.plata - a.plata;
            if (b.bronce !== a.bronce) return b.bronce - a.bronce;
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

        return () => {
            if (rtDebounceRef.current) clearTimeout(rtDebounceRef.current);
            supabase.removeChannel(channel);
        };
    }, [activeSport, activeGender]);

    // Helper para formatear nombres largos en Avatar
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };



    // Componente de Podio Individual Estilizado
    const TopPodium = ({ entry, rank }: { entry: MedalEntry, rank: number }) => {
        const isFirst = rank === 1;
        const widthCls = isFirst ? "w-[120px] sm:w-[150px]" : "w-[100px] sm:w-[130px]";
        const heightMetadata = isFirst
            ? { wrapper: "h-[320px] sm:h-[360px]", topPad: "pt-8" }
            : { wrapper: "h-[250px] sm:h-[280px]", topPad: "pt-4" };

        return (
            <div
                onClick={() => setSelectedTeam({ team: entry, rank })}
                className={cn(
                    "flex flex-col items-center group cursor-pointer relative",
                    heightMetadata.wrapper, widthCls
                )}
            >
                {/* Posición & Avatar Circle (Flotando arriba del pilar) */}
                <div className="absolute top-0 z-30 flex flex-col items-center">
                    {/* Badge de Ranking */}
                    <div className={cn(
                        "absolute -top-3 sm:-top-4 z-40 flex items-center justify-center font-black rounded-lg text-white shadow-lg",
                        isFirst
                            ? "w-8 h-8 sm:w-10 sm:h-10 text-lg sm:text-xl bg-red-600 shadow-red-600/50"
                            : "w-6 h-6 sm:w-8 sm:h-8 text-sm sm:text-base bg-red-600 shadow-red-600/40"
                    )}>
                        {rank}
                    </div>

                    {/* Circular Avatar Dark Pill */}
                    <div className={cn(
                        "rounded-full flex items-center justify-center bg-[#0f0c08] relative overflow-hidden ring-2 ring-white/5 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105",
                        isFirst ? "w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] mt-4 ring-offset-2 ring-offset-[#0a0805] ring-red-600/50" : "w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] mt-2 opacity-90 group-hover:opacity-100"
                    )}>
                        {/* Gradient Inside Avatar */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
                        <span className={cn(
                            "font-black text-white/50 z-10 transition-colors group-hover:text-white/80",
                            isFirst ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                        )}>
                            {getInitials(entry.equipo_nombre)}
                        </span>
                    </div>
                </div>

                {/* Vertical Pill Base (Representa el Pilar) */}
                <div className={cn(
                    "w-full bg-[#1a1625] rounded-[2rem] border border-white/5 flex flex-col items-center justify-end pb-6 sm:pb-8 mt-auto relative transition-colors group-hover:bg-[#1f1b2e] overflow-hidden",
                    "h-[220px] sm:h-[250px]" // Static height relative to bottom
                )}>
                    {isFirst && (
                        <div className="absolute top-0 inset-x-8 h-[2px] bg-red-600 shadow-[0_0_15px_rgba(219,20,6,0.8)] rounded-full" />
                    )}

                    {/* Hover Glow Background inside Pill */}
                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="flex gap-1.5 mb-2">
                             <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-amber-400">🥇</span>
                                <span className="text-xl font-black text-white">{entry.oro}</span>
                             </div>
                             <div className="w-[1px] h-6 bg-white/10 mx-1" />
                             <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-slate-300">🥈</span>
                                <span className="text-xl font-black text-white">{entry.plata}</span>
                             </div>
                             <div className="w-[1px] h-6 bg-white/10 mx-1" />
                             <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-amber-700">🥉</span>
                                <span className="text-xl font-black text-white">{entry.bronce}</span>
                             </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                            Medallas de Torneo
                        </span>
                    </div>
                </div>

                {/* Equipo Nombre Display en el podio */}
                <span className="absolute -bottom-10 font-bold text-[9px] sm:text-[10px] text-center text-white/60 uppercase tracking-widest block transition-colors w-[120%] leading-tight line-clamp-2 break-words group-hover:text-white">
                    {entry.equipo_nombre}
                </span>
            </div>
        );
    };

    if (loading && medallero.length === 0) return (
        <MedalSkeleton />
    );

    const top3 = medallero.slice(0, 3);
    let podiumOrder: MedalEntry[] = [];
    if (top3.length >= 1) {
        if (top3.length === 1) podiumOrder = [top3[0]];
        else if (top3.length === 2) podiumOrder = [top3[1], top3[0]];
        else podiumOrder = [top3[1], top3[0], top3[2]];
    }

    return (
        <section className="relative overflow-hidden rounded-[1rem] sm:rounded-[2.5rem] bg-[#0a0816] shadow-2xl pb-6">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header & Filters */}
            <div className="relative z-10 p-6 sm:p-10 border-b border-white/5 space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-xl shadow-red-600/20">
                            <Trophy className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                                Medallería Oficial
                            </h2>
                            <p className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-[0.2em] mt-2">
                                Ranking por Medallas de Oro
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Gender Selection */}
                    <div className="flex p-1 bg-white/[0.03] border border-white/5 rounded-2xl shrink-0">
                        {[
                            { id: 'todos', label: 'Todos', icon: <Users size={14}/> },
                            { id: 'masculino', label: '♂ Más', icon: '♂' },
                            { id: 'femenino', label: '♀ Fem', icon: '♀' },
                            { id: 'mixto', label: '⚤ Mix', icon: '⚤' },
                        ].map(g => (
                            <button
                                key={g.id}
                                onClick={() => setActiveGender(g.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeGender === g.id 
                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30" 
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <span className="text-sm">{g.icon}</span>
                                <span className="hidden sm:inline">{g.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Discipline Tabs */}
                    <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
                        <button
                            onClick={() => setActiveSport('todos')}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeSport === 'todos' 
                                    ? "bg-white/10 text-white border border-white/10 shadow-xl" 
                                    : "text-white/30 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Filter size={14} />
                            General
                        </button>
                        {Object.entries(SPORT_EMOJI).map(([name, emoji]) => (
                            <button
                                key={name}
                                onClick={() => setActiveSport(name)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    activeSport === name 
                                        ? "bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg" 
                                        : "text-white/30 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <span className="text-lg">{emoji}</span>
                                <span>{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-10 pb-10 border-b border-white/5 relative z-20">
                <div className="flex justify-center items-end gap-2 sm:gap-4 mb-10 min-h-[300px]">
                    {podiumOrder.map((entry) => {
                        const realRank = top3.indexOf(entry) + 1;
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
                                key={entry.id}
                                onClick={() => setSelectedTeam({ team: entry, rank: idx + 1 })}
                                className="flex bg-[#1a1625] border border-white/5 hover:border-white/20 transition-all duration-300 group cursor-pointer shadow-lg"
                                style={{ height: '120px' }}
                            >
                                {/* Avatar Column */}
                                <div className="w-[100px] sm:w-[130px] shrink-0 border-r border-white/5 relative overflow-hidden flex items-center justify-center bg-black/40">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent mix-blend-overlay" />
                                    <span className="text-4xl sm:text-5xl font-black text-white/10 uppercase tracking-tighter mix-blend-plus-lighter z-10 filter grayscale contrast-200">
                                        {getInitials(entry.equipo_nombre)}
                                    </span>
                                    {/* Optional hovering glow */}
                                    <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/10 transition-colors duration-500" />
                                </div>

                                {/* Center Content Column */}
                                <div className="flex-1 px-4 sm:px-6 py-4 flex flex-col justify-between overflow-hidden">
                                    <div>
                                        {/* Rank Number with Yellow Underline */}
                                        <div className="inline-block border-b-2 border-[#FFC000] pb-0.5 mb-1.5 flex gap-2 items-center">
                                            <span className="text-[11px] sm:text-xs font-black text-white tracking-widest leading-none drop-shadow-md">{rank}</span>
                                            <span className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-none">Global</span>
                                        </div>

                                        {/* Name */}
                                        <h2 className="text-lg sm:text-2xl font-bold text-white/90 leading-none tracking-tight truncate pb-1">
                                            {entry.equipo_nombre}
                                        </h2>

                                        <span className="text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5 block truncate">
                                            PJ: {entry.played || 0} Partidos
                                        </span>
                                    </div>

                                    {/* Stats matching the image */}
                                    {/* Stats: Medals Row */}
                                    <div className="flex gap-6 sm:gap-10 mt-auto items-end">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                                                <Medal size={14} />
                                            </div>
                                            <span className="text-base sm:text-xl font-black text-white tabular-nums">
                                                {entry.oro.toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-60">
                                            <div className="w-6 h-6 rounded-full bg-slate-300/10 flex items-center justify-center text-slate-300">
                                                <Medal size={14} />
                                            </div>
                                            <span className="text-sm sm:text-base font-black text-white tabular-nums">
                                                {entry.plata.toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-60">
                                            <div className="w-6 h-6 rounded-full bg-amber-700/10 flex items-center justify-center text-amber-700">
                                                <Medal size={14} />
                                            </div>
                                            <span className="text-sm sm:text-base font-black text-white tabular-nums">
                                                {entry.bronce.toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Points Box (Right Column) - Now shows Total Medals or Points as tiebreaker */}
                                <div className="w-[80px] sm:w-[130px] shrink-0 border-l border-white/5 flex flex-col items-center justify-center bg-black/60 group-hover:bg-[#111111] transition-colors relative">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-600/5" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-none mb-1 tabular-nums drop-shadow-lg relative z-10">
                                            {entry.oro + entry.plata + entry.bronce}
                                        </span>
                                        <span className="text-[7px] sm:text-[9px] font-black text-white/30 uppercase tracking-[0.2em] pt-1 relative z-10">
                                            Total Medals
                                        </span>
                                    </div>
                                    
                                    <div className="mt-2 text-[9px] font-bold text-red-500/60 font-mono">
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

            <TeamStatsModal
                isOpen={!!selectedTeam}
                onClose={() => setSelectedTeam(null)}
                team={selectedTeam?.team || null}
                rank={selectedTeam?.rank || 1}
            />
        </section>
    );
}
