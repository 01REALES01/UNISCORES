"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type MedalEntry = {
    id: number;
    equipo_nombre: string;
    oro: number;
    plata: number;
    bronce: number;
    puntos: number;
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

    const fetchMedallero = async () => {
        setLoading(true);
        // Intentar cargar de Supabase
        const { data, error } = await supabase
            .from('medallero')
            .select('*')
            .order('puntos', { ascending: false }) // Prioridad Puntos
            .order('oro', { ascending: false })
            .order('plata', { ascending: false });

        if (!error && data && data.length > 0) {
            setMedallero(data);
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

    // Componente de Podio Individual
    const TopPodium = ({ entry, rank }: { entry: MedalEntry, rank: number }) => {
        // Alturas dinámicas
        const heightMetadata = rank === 1
            ? { h: "h-48 sm:h-56", bg: "from-yellow-500/20 via-yellow-500/5 to-transparent border-yellow-500/30", text: "text-yellow-400", icon: "🥇" }
            : rank === 2
                ? { h: "h-36 sm:h-44", bg: "from-slate-300/20 via-slate-300/5 to-transparent border-slate-300/30", text: "text-slate-300", icon: "🥈" }
                : { h: "h-28 sm:h-36", bg: "from-orange-700/20 via-orange-700/5 to-transparent border-orange-600/30", text: "text-orange-400", icon: "🥉" };

        return (
            <div className="flex flex-col items-center justify-end group w-1/3 max-w-[140px]">
                {/* Avatar Flotante */}
                <div className={`mb-4 relative transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-105`}>
                    <div className={cn(
                        "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl rotate-3 flex items-center justify-center bg-[#0a0f1c] border-2 shadow-2xl relative z-10",
                        rank === 1 ? 'border-yellow-500/50 shadow-yellow-500/20' : rank === 2 ? 'border-slate-300/50 shadow-slate-300/20' : 'border-orange-600/50 shadow-orange-600/20'
                    )}>
                        <span className="text-lg sm:text-xl font-black">{getInitials(entry.equipo_nombre)}</span>
                        {rank === 1 && <div className="absolute -top-4 -right-4 text-3xl animate-bounce delay-700">👑</div>}
                    </div>
                </div>

                {/* Barra */}
                <div className={cn(
                    "w-full rounded-t-3xl flex flex-col items-center justify-end pb-4 border-x border-t backdrop-blur-md relative overflow-hidden transition-all duration-700 bg-gradient-to-t",
                    heightMetadata.bg,
                    heightMetadata.h
                )}>
                    <div className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums leading-none mb-1 drop-shadow-lg">
                        {entry.oro}
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 text-white">Oros</span>
                </div>

                {/* Info */}
                <div className="mt-4 text-center w-full">
                    <p className={cn("font-bold text-xs sm:text-sm tracking-tight leading-tight line-clamp-2 min-h-[2.5em]", rank === 1 ? 'text-white' : 'text-slate-400')}>
                        {entry.equipo_nombre}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Total</span>
                        <span className="text-sm font-bold text-white">{entry.puntos}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && medallero.length === 0) return (
        <div className="w-full h-96 animate-pulse bg-white/5 rounded-[3rem]" />
    );

    // Separar top 3
    const top3 = medallero.slice(0, 3);
    const rest = medallero.slice(3);

    // Orden visual del podio: 2 - 1 - 3
    let podiumOrder: MedalEntry[] = [];
    if (top3.length >= 1) {
        if (top3.length === 1) podiumOrder = [top3[0]];
        else if (top3.length === 2) podiumOrder = [top3[1], top3[0]];
        else podiumOrder = [top3[1], top3[0], top3[2]];
    }

    return (
        <section className="relative overflow-hidden rounded-[3rem] bg-[#0a0f1c]/60 border border-white/5 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="relative z-10 p-8 sm:p-10 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 shadow-lg">
                            <Trophy className="text-yellow-500 w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase italic">
                                Medallería Oficial
                            </h2>
                            <p className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-widest">
                                Ranking por Carreras
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold tracking-wide">RESULTADOS EN VIVO</span>
                    </div>
                </div>
            </div>

            <div className="p-8 sm:p-10">
                {/* Visual Podium */}
                <div className="flex justify-center items-end gap-2 sm:gap-4 mb-16 min-h-[300px]">
                    {podiumOrder.map((entry) => {
                        // Determinar rank real
                        // Si es el objeto en index 0 de top3 estandar, es rank 1.
                        const realRank = top3.indexOf(entry) + 1;
                        return <TopPodium key={entry.id} entry={entry} rank={realRank} />;
                    })}
                </div>

                {/* Remaining List */}
                {rest.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-6 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                            <span>Posición & Carrera</span>
                            <div className="flex gap-6 sm:gap-12 mr-4">
                                <span className="w-8 text-center">Oro</span>
                                <span className="w-8 text-center">Plata</span>
                                <span className="w-8 text-center">Bronce</span>
                                <span className="w-12 text-right">Puntos</span>
                            </div>
                        </div>

                        {rest.map((entry, idx) => (
                            <div key={entry.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 font-black text-lg flex items-center justify-center border border-white/5">
                                        {idx + 4}
                                    </div>
                                    <div className="font-bold text-base text-slate-200 group-hover:text-white transition-colors">
                                        {entry.equipo_nombre}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 sm:gap-12 font-mono text-base">
                                    <div className="w-8 text-center font-bold text-yellow-500 flex justify-center">{entry.oro > 0 ? entry.oro : <span className="opacity-10 text-white">-</span>}</div>
                                    <div className="w-8 text-center font-bold text-slate-400 flex justify-center">{entry.plata > 0 ? entry.plata : <span className="opacity-10 text-white">-</span>}</div>
                                    <div className="w-8 text-center font-bold text-orange-600 flex justify-center">{entry.bronce > 0 ? entry.bronce : <span className="opacity-10 text-white">-</span>}</div>
                                    <div className="w-12 text-right font-black text-white text-lg">
                                        {entry.puntos}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {medallero.length === 0 && !loading && (
                    <div className="text-center py-20 text-slate-500 opacity-50">
                        No hay datos registrados aún.
                    </div>
                )}
            </div>
        </section>
    );
}
