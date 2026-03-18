"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X, Swords, Activity, Target, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/lib/supabase";
import type { MedalEntry } from "@/modules/medallero/types";

interface TeamStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: MedalEntry | null;
    rank: number;
}

export function TeamStatsModal({ isOpen, onClose, team, rank }: TeamStatsModalProps) {
    const [loadingStats, setLoadingStats] = useState(false);

    const [mount, setMount] = useState(false);

    // Real Stats Data
    const [stats, setStats] = useState({ won: 0, draw: 0, lost: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [evolution, setEvolution] = useState<number[]>([0]); // points over time
    const [pointsTracker, setPointsTracker] = useState(0);

    const safeIncludes = (str1?: string, str2?: string) => {
        if (!str1 || !str2) return false;
        const s1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const s2 = str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return s1.includes(s2) || s2.includes(s1);
    }

    const fetchRealData = async () => {
        if (!team) return;
        setLoadingStats(true);

        const { data: allMatches, error } = await supabase
            .from('partidos')
            .select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)')
            .eq('estado', 'finalizado')
            .order('fecha', { ascending: true });

        if (error || !allMatches) {
            setLoadingStats(false);
            return;
        }

        const matches = allMatches.filter(m => safeIncludes(m.carrera_a?.nombre || m.equipo_a, team.equipo_nombre) || safeIncludes(m.carrera_b?.nombre || m.equipo_b, team.equipo_nombre));

        let w = 0, d = 0, l = 0;
        let pts = 0;
        const ptsEvolution = [0];
        const hist: any[] = [];

        for (const m of matches) {
            const isA = safeIncludes(m.carrera_a?.nombre || m.equipo_a, team.equipo_nombre);

            // Abstract score reading (deals with goals, sets, points, etc)
            const scoreA = m.marcador_detalle?.goles_a ?? m.marcador_detalle?.sets_a ?? m.marcador_detalle?.total_a ?? m.marcador_detalle?.puntos_a ?? m.marcador_detalle?.juegos_a ?? 0;
            const scoreB = m.marcador_detalle?.goles_b ?? m.marcador_detalle?.sets_b ?? m.marcador_detalle?.total_b ?? m.marcador_detalle?.puntos_b ?? m.marcador_detalle?.juegos_b ?? 0;

            const myScore = isA ? scoreA : scoreB;
            const theirScore = isA ? scoreB : scoreA;

            let resultType = 'draw';
            let addedPoints = 1;
            if (myScore > theirScore) {
                resultType = 'win';
                addedPoints = 3;
                w++;
            } else if (myScore < theirScore) {
                resultType = 'loss';
                addedPoints = 0;
                l++;
            } else {
                d++;
            }

            pts += addedPoints;
            ptsEvolution.push(pts);

            // Add specifically to reverse chronological history
            hist.unshift({
                points: addedPoints,
                event: `${m.disciplinas?.name || 'Evento'} vs ${isA ? (m.carrera_b?.nombre || m.equipo_b) : (m.carrera_a?.nombre || m.equipo_a)}`,
                date: new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                result: resultType
            });
        }

        setStats({ won: w, draw: d, lost: l });
        setEvolution(ptsEvolution);
        setPointsTracker(pts);
        setHistory(hist.slice(0, 5)); // Keep latest 5
        setLoadingStats(false);
    };

    useEffect(() => {
        if (isOpen) {
            setMount(true);
            document.body.style.overflow = "hidden";
        } else {
            setTimeout(() => setMount(false), 300); // Transition delay
            document.body.style.overflow = "auto";
        }

        if (isOpen && team) {
            fetchRealData();
        }

        return () => { document.body.style.overflow = "auto"; };
    }, [isOpen, team]);

    if (!mount || !team) return null;

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // Calculate max medals logic for the progress bars using real stats
    const totalMatches = Math.max(stats.won + stats.draw + stats.lost, 1);
    const pWon = Math.round((stats.won / totalMatches) * 100) + "%";
    const pDraw = Math.round((stats.draw / totalMatches) * 100) + "%";
    const pLost = Math.round((stats.lost / totalMatches) * 100) + "%";

    // SVG Chart path calculation
    // M 0 Y1 L X1 Y1 L X2 Y2 ...
    const createSvgPath = () => {
        if (evolution.length === 1) return `M 0 80 L 100 80`;
        const widthPerStep = 100 / (evolution.length - 1);
        const maxPts = Math.max(...evolution, 10); // scale up to at least 10 visually

        const pathUnits = evolution.map((val, idx) => {
            const x = idx * widthPerStep;
            const y = 100 - (val / maxPts * 80); // 100 is bottom, scaled up to 20 for top padding
            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        });

        return pathUnits.join(" ");
    };

    const chartPath = createSvgPath();
    const finalY = evolution.length > 1 ? (100 - (evolution[evolution.length - 1] / Math.max(...evolution, 10) * 80)) : 80;

    // Use Recharts data format
    const chartData = evolution.map((pts, i) => ({
        index: i,
        puntos: pts
    }));

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#17130D]/80 backdrop-blur-md transition-opacity duration-300 overflow-y-auto",
            isOpen ? "opacity-100" : "opacity-0"
        )}>
            {/* Click to close backdrop overlay */}
            <div className="absolute inset-0 z-0" onClick={onClose} />

            <div className={cn(
                "relative z-10 w-full max-w-sm sm:max-w-md bg-[#17130D] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col transition-all duration-300 my-8",
                isOpen ? "translate-y-0 scale-100" : "translate-y-10 scale-95"
            )}>
                {/* Header & Avatar Overlay Area */}
                <div className="p-6 pb-2 pt-8 flex items-start justify-between relative">

                    {/* Close button top right */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex w-full gap-5">
                        {/* Avatar Column */}
                        <div className="relative shrink-0 pt-2">
                            {/* Rank Badge */}
                            <div className="absolute -top-1 -left-1 z-30 w-7 h-7 bg-red-600 shadow-[0_0_15px_rgba(219,20,6,0.6)] rounded-lg flex items-center justify-center font-black text-white text-sm">
                                {rank}
                            </div>
                            {/* Circular Avatar */}
                            <div className="w-20 h-20 rounded-full bg-[#0a0805] shadow-xl relative overflow-hidden flex items-center justify-center border border-white/10 ring-4 ring-[#17130D]">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
                                {team.escudo_url ? (
                                    <img src={team.escudo_url} alt={team.equipo_nombre} className="w-full h-full object-cover z-10" />
                                ) : (
                                    <span className="text-2xl font-black text-white z-10">{getInitials(team.equipo_nombre)}</span>
                                )}
                            </div>
                        </div>

                        {/* Title & Stats */}
                        <div className="flex-1 min-w-0 pr-12">
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter truncate leading-none mb-4">
                                {team.equipo_nombre}
                            </h2>

                            <div className="flex gap-4 items-end justify-between">
                                {/* Progress Stats Real */}
                                <div className="space-y-3 flex-1">
                                    {/* Victorias */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Ganados</span>
                                            <span className="text-xs font-black text-white leading-none tabular-nums">{stats.won}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#FFC000] rounded-full relative shadow-[0_0_5px_rgba(255,192,0,0.8)]" style={{ width: pWon }}>
                                                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white/30 to-transparent blur-[1px]" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Empates */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Empatados</span>
                                            <span className="text-xs font-black text-white leading-none tabular-nums">{stats.draw}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-white/80 rounded-full relative" style={{ width: pDraw }}>
                                                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white/30 to-transparent blur-[1px]" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Derrotas */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">Perdidos</span>
                                            <span className="text-xs font-black text-white leading-none tabular-nums">{stats.lost}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-600 rounded-full relative shadow-[0_0_5px_rgba(219,20,6,0.6)]" style={{ width: pLost }}>
                                                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white/30 to-transparent blur-[1px]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* DUEL Action Button matching reference */}
                                <button className="shrink-0 group flex flex-col items-center gap-1.5">
                                    <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-500 group-hover:bg-red-600 group-hover:text-white transition-all">
                                        <Swords size={18} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-red-500/80 tracking-widest group-hover:text-red-500">
                                        Retar
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subtitle Divider */}
                <div className="px-6 mt-8 mb-4">
                    <h3 className="text-sm font-bold text-white/80 shrink-0 text-center relative z-10 mix-blend-plus-lighter">
                        Evolución en Puntos
                    </h3>
                </div>

                {/* Fancy Real Chart */}
                <div className="relative w-full h-32 px-6 overflow-visible shrink-0 group transition-opacity">
                    <div className="absolute left-6 top-0 bottom-6 flex flex-col justify-between text-[10px] text-white/20 font-mono font-bold pt-2">
                        <span>{Math.max(...evolution, 10)}</span>
                        <span>{Math.max(Math.floor(Math.max(...evolution, 10) / 2), 5)}</span>
                        <span>0</span>
                    </div>
                    {/* Fake Chart Grid */}
                    <div className="ml-8 h-full border-b border-l border-white/5 relative">
                        {loadingStats ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                            </div>
                        ) : (
                            <div className="absolute inset-x-0 -inset-y-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={chartData}
                                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorUninorte" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FFC000" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#DB1406" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>

                                        <Tooltip
                                            content={({ active, payload }: { active?: boolean, payload?: readonly any[] }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-[#0a0805] border border-[#FFC000]/30 p-2 rounded-xl shadow-[0_0_15px_rgba(255,192,0,0.3)] backdrop-blur-md">
                                                            <p className="text-[#FFC000] font-black text-sm">{`${payload[0].value} Pts`}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                            cursor={{ stroke: '#FFC000', strokeWidth: 1, strokeDasharray: '3 3' }}
                                        />

                                        <Area
                                            type="monotone"
                                            dataKey="puntos"
                                            stroke="#FFC000"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorUninorte)"
                                            activeDot={{ r: 6, fill: '#17130D', stroke: '#FFC000', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Pagination indicator matching image bottom */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-40">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                            <span className="w-4 h-1.5 rounded-full bg-white" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                        </div>
                    </div>
                </div>

                {/* Challenge History */}
                <div className="mt-10 px-6 pb-6 border-t border-white/5 pt-6 bg-gradient-to-b from-transparent to-white/[1%]">
                    <h3 className="text-sm font-bold text-white/80 text-center mb-6">
                        Desempeño reciente
                    </h3>

                    <div className="space-y-2 pb-4">
                        {loadingStats ? (
                            <div className="flex justify-center py-6">
                                <span className="text-xs text-white/40 animate-pulse font-bold">Cargando eventos...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-6 text-white/30 text-xs font-bold uppercase tracking-widest border border-white/5 rounded-2xl border-dashed">
                                Sin partidos registrados
                            </div>
                        ) : (
                            history.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        {/* Result visual logic */}
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                                            item.result === 'win' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(219,20,6,0.3)]' :
                                                item.result === 'draw' ? 'bg-slate-500 text-white' :
                                                    'bg-white/5 text-white/40' // loss
                                        )}>
                                            {item.result === 'win' ? `+${item.points}` : item.result === 'draw' ? '+1' : '0'}
                                        </div>
                                        <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors truncate max-w-[200px] sm:max-w-xs">
                                            {item.event}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-white/30 shrink-0">
                                        {item.date}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
