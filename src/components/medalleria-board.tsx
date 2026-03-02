"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MedalSkeleton } from "@/components/skeletons";
import { TeamStatsModal } from "./team-stats-modal";

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

    const safeIncludes = (str1?: string, str2?: string) => {
        if (!str1 || !str2) return false;
        const s1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const s2 = str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return s1.includes(s2) || s2.includes(s1);
    }

    const fetchMedallero = async () => {
        setLoading(true);

        const [medalRes, matchRes] = await Promise.all([
            safeQuery(supabase.from('medallero').select('*').order('puntos', { ascending: false }).order('oro', { ascending: false }).order('plata', { ascending: false }), 'medallero'),
            safeQuery(supabase.from('partidos').select('*').eq('estado', 'finalizado'), 'medallero-matches'),
        ]);

        const data = medalRes.data;
        const matches = matchRes.data;

        if (data && data.length > 0) {
            const extendedData = data.map(team => {
                let won = 0, draw = 0, lost = 0;
                let calculatedPoints = 0;
                matches?.forEach(m => {
                    const isA = safeIncludes(m.equipo_a, team.equipo_nombre);
                    const isB = safeIncludes(m.equipo_b, team.equipo_nombre);
                    if (!isA && !isB) return;

                    const scoreA = m.marcador_detalle?.goles_a ?? m.marcador_detalle?.sets_a ?? m.marcador_detalle?.total_a ?? m.marcador_detalle?.puntos_a ?? m.marcador_detalle?.juegos_a ?? 0;
                    const scoreB = m.marcador_detalle?.goles_b ?? m.marcador_detalle?.sets_b ?? m.marcador_detalle?.total_b ?? m.marcador_detalle?.puntos_b ?? m.marcador_detalle?.juegos_b ?? 0;

                    const myScore = isA ? scoreA : scoreB;
                    const theirScore = isA ? scoreB : scoreA;

                    if (myScore > theirScore) {
                        won++;
                        calculatedPoints += 3;
                    }
                    else if (myScore < theirScore) {
                        lost++;
                    }
                    else {
                        draw++;
                        calculatedPoints += 1;
                    }
                });

                return { ...team, puntos: calculatedPoints, won, draw, lost, played: won + draw + lost };
            });

            extendedData.sort((a, b) => {
                if (b.puntos !== a.puntos) return b.puntos - a.puntos;
                return (b.won || 0) - (a.won || 0);
            });

            setMedallero(extendedData);
        } else {
            console.log("Usando datos simulados de medallería (fallback)");
            setMedallero(SAMPLE_DATA);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMedallero();

        // Realtime updates
        const channel = supabase
            .channel('public:medallero')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'medallero' }, () => {
                fetchMedallero();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

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
                    "w-full bg-[#17130D] rounded-[2rem] border border-white/5 flex flex-col items-center justify-end pb-6 sm:pb-8 mt-auto relative transition-colors group-hover:bg-[#1f1911] overflow-hidden",
                    "h-[220px] sm:h-[250px]" // Static height relative to bottom
                )}>
                    {isFirst && (
                        <div className="absolute top-0 inset-x-8 h-[2px] bg-red-600 shadow-[0_0_15px_rgba(219,20,6,0.8)] rounded-full" />
                    )}

                    {/* Hover Glow Background inside Pill */}
                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 flex flex-col items-center">
                        <span className={cn(
                            "font-black tabular-nums leading-none tracking-tighter text-white",
                            isFirst ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"
                        )}>
                            {entry.puntos}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/40 mt-2">
                            Pts
                        </span>
                    </div>
                </div>

                {/* Equipo Nombre Display en el podio */}
                <span className="font-bold text-[10px] sm:text-xs text-center text-white/60 uppercase tracking-wider block mt-4 group-hover:text-white transition-colors truncate w-[140%]">
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
        <section className="relative overflow-hidden rounded-[1rem] sm:rounded-[2.5rem] bg-[#0a0805] shadow-2xl pb-6">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 p-6 sm:p-10 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                        <Trophy className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase italic">
                            Leaderboard General
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-white/50 uppercase tracking-widest">
                            Olimpiadas Oficiales
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-10 pb-8 border-b border-white/5 relative z-20">
                <div className="flex justify-center items-end gap-2 sm:gap-4 mb-2 min-h-[300px]">
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
                                className="flex bg-[#17130D] border border-white/5 hover:border-white/20 transition-all duration-300 group cursor-pointer shadow-lg"
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
                                    <div className="flex gap-4 sm:gap-10 mt-auto items-end">
                                        <div className="flex flex-col gap-0.5 min-w-[36px]">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Gan</span>
                                            <span className="text-xs sm:text-sm font-black text-[#FFC000]/90 leading-none tabular-nums" style={{ color: '#FFC000' }}>
                                                {(entry.won || 0).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-[36px]">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Emp</span>
                                            <span className="text-xs sm:text-sm font-black text-slate-300/90 leading-none tabular-nums" style={{ color: '#dcc62e' }}>
                                                {(entry.draw || 0).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-[36px]">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Per</span>
                                            <span className="text-xs sm:text-sm font-black text-orange-600/90 leading-none tabular-nums" style={{ color: '#e84a4a' }}>
                                                {(entry.lost || 0).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Points Box (Right Column) */}
                                <div className="w-[80px] sm:w-[130px] shrink-0 border-l border-white/5 flex flex-col items-center justify-center bg-black/60 group-hover:bg-[#111111] transition-colors relative">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-red-600/5" />
                                    <span className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-none mb-1 tabular-nums drop-shadow-lg relative z-10">
                                        {entry.puntos}
                                    </span>
                                    <span className="text-[9px] sm:text-[11px] font-bold text-white/30 uppercase tracking-widest pt-1 relative z-10">
                                        Total
                                    </span>
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
