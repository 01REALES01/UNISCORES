"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui-primitives";
import {
    BarChart,
    DonutChart,
    MiniLineChart,
    ProgressBar,
    StatMiniCard,
} from "@/components/charts";
import {
    BarChart3,
    Trophy,
    TrendingUp,
    Target,
    Medal,
    Activity,
    Users,
    Flame,
    Calendar,
    ArrowUpRight,
    Filter,
    Loader2,
} from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { SPORT_EMOJI } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// Tipos centralizados en modules/ — importados aquí
import type { PartidoWithRelations as Partido, Evento } from '@/modules/matches/types';

const SPORT_COLORS: Record<string, string> = {
    Fútbol: "#34d399",
    Baloncesto: "#fb923c",
    Voleibol: "#60a5fa",
    Tenis: "#a3e635",
    "Tenis de Mesa": "#f87171",
    Ajedrez: "#94a3b8",
    Natación: "#22d3ee",
};

export default function EstadisticasPage() {
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDisciplina, setFilterDisciplina] = useState<string>("all");
    const { isPeriodista } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isPeriodista) {
            router.push('/admin/noticias');
        }
    }, [isPeriodista, router]);

    // Fetch data
    const rtDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [partidosRes, eventosRes] = await Promise.all([
                safeQuery(
                    supabase.from("partidos").select("*, disciplinas(name)").order("fecha", { ascending: false }),
                    'stats-partidos'
                ),
                safeQuery(
                    supabase.from("olympics_eventos").select("*").order("created_at", { ascending: false }),
                    'stats-eventos'
                ),
            ]);

            if (partidosRes.data) setPartidos(partidosRes.data as any);
            if (eventosRes.data) setEventos(eventosRes.data as any);
            setLoading(false);
        };

        fetchData();

        const sub = supabase
            .channel("stats-dashboard")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "partidos" },
                () => {
                    if (rtDebounce.current) clearTimeout(rtDebounce.current);
                    rtDebounce.current = setTimeout(() => fetchData(), 800);
                }
            )
            .subscribe();

        return () => {
            if (rtDebounce.current) clearTimeout(rtDebounce.current);
            supabase.removeChannel(sub);
        };
    }, []);

    // ===== COMPUTED STATS =====
    const filteredPartidos = useMemo(() => {
        if (filterDisciplina === "all") return partidos;
        return partidos.filter((p) => p.disciplinas?.name === filterDisciplina);
    }, [partidos, filterDisciplina]);

    const disciplinas = useMemo(() => {
        const set = new Set(partidos.map((p) => p.disciplinas?.name).filter((n): n is string => Boolean(n)));
        return Array.from(set);
    }, [partidos]);

    const finalizados = filteredPartidos.filter((p) => p.estado === "finalizado");
    const enVivo = filteredPartidos.filter((p) => p.estado === "en_vivo");
    const programados = filteredPartidos.filter((p) => p.estado === "programado");

    // Partidos por disciplina (for bar chart)
    const partidosPorDisciplina = useMemo(() => {
        const map: Record<string, number> = {};
        partidos.forEach((p) => {
            const name = p.disciplinas?.name;
            if (name) map[name] = (map[name] || 0) + 1;
        });
        return Object.entries(map)
            .map(([label, value]) => ({
                label,
                value,
                color: SPORT_COLORS[label] || "#818cf8",
                icon: SPORT_EMOJI[label] || "🏅",
            }))
            .sort((a, b) => b.value - a.value);
    }, [partidos]);

    // Estado de partidos (for donut chart)
    const estadoData = useMemo(() => [
        { label: "Finalizados", value: finalizados.length, color: "#34d399", icon: "✅" },
        { label: "En Vivo", value: enVivo.length, color: "#f87171", icon: "🔴" },
        { label: "Programados", value: programados.length, color: "#60a5fa", icon: "📅" },
    ], [finalizados, enVivo, programados]);

    // Goles/puntos por equipo (top scorers)
    const equipoStats = useMemo(() => {
        const map: Record<string, { goles: number; partidos: number; victorias: number }> = {};

        filteredPartidos.forEach((p) => {
            const md = p.marcador_detalle || {};
            const scoreA = md.goles_a ?? md.total_a ?? 0;
            const scoreB = md.goles_b ?? md.total_b ?? 0;

            // Equipo A
            if (!map[p.equipo_a]) map[p.equipo_a] = { goles: 0, partidos: 0, victorias: 0 };
            map[p.equipo_a].goles += scoreA;
            map[p.equipo_a].partidos += 1;
            if (p.estado === "finalizado" && scoreA > scoreB) map[p.equipo_a].victorias += 1;

            // Equipo B
            if (!map[p.equipo_b]) map[p.equipo_b] = { goles: 0, partidos: 0, victorias: 0 };
            map[p.equipo_b].goles += scoreB;
            map[p.equipo_b].partidos += 1;
            if (p.estado === "finalizado" && scoreB > scoreA) map[p.equipo_b].victorias += 1;
        });

        return Object.entries(map)
            .map(([name, stats]) => ({
                name,
                ...stats,
                winRate: stats.partidos > 0
                    ? Math.round((stats.victorias / stats.partidos) * 100)
                    : 0,
            }))
            .sort((a, b) => b.victorias - a.victorias || b.goles - a.goles);
    }, [filteredPartidos]);

    // Actividad por día (últimos 7 días)
    const actividadDiaria = useMemo(() => {
        const days: { label: string; value: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            const label = date.toLocaleDateString("es-CO", {
                weekday: "short",
            });
            const count = partidos.filter((p) => {
                const pDate = new Date(p.fecha).toISOString().split("T")[0];
                return pDate === dateStr;
            }).length;
            days.push({ label, value: count });
        }
        return days;
    }, [partidos]);

    // Total goles/puntos
    const totalGolesStats = useMemo(() => {
        let totalA = 0;
        let totalB = 0;
        filteredPartidos.forEach((p) => {
            const md = p.marcador_detalle || {};
            totalA += md.goles_a ?? md.total_a ?? 0;
            totalB += md.goles_b ?? md.total_b ?? 0;
        });
        return { totalA, totalB, total: totalA + totalB };
    }, [filteredPartidos]);

    // Promedio goles por partido
    const avgGoals = finalizados.length > 0
        ? (totalGolesStats.total / finalizados.length).toFixed(1)
        : "0";

    // Eventos recientes
    const eventosRecientes = eventos.slice(0, 8);

    // Resultado más abultado
    const biggestWin = useMemo(() => {
        let maxDiff = 0;
        let result: Partido | null = null;
        finalizados.forEach((p) => {
            const md = p.marcador_detalle || {};
            const a = md.goles_a ?? md.total_a ?? 0;
            const b = md.goles_b ?? md.total_b ?? 0;
            const diff = Math.abs(a - b);
            if (diff > maxDiff) {
                maxDiff = diff;
                result = p;
            }
        });
        return result as Partido | null;
    }, [finalizados]);

    // ===== LOADING STATE =====
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center py-20">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8" data-testid="estadisticas-page">
            {/* ===== HEADER ===== */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-3">
                        <BarChart3 className="text-primary" size={32} />
                        Estadísticas
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Análisis y rendimiento de las Olimpiadas UNINORTE 2026
                    </p>
                </div>
                {/* Filter */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-muted-foreground" />
                    <select
                        value={filterDisciplina}
                        onChange={(e) => setFilterDisciplina(e.target.value)}
                        className="bg-muted/30 border border-border/40 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                        id="filter-disciplina"
                    >
                        <option value="all">Todas las disciplinas</option>
                        {disciplinas.map((d) => (
                            <option key={d} value={d}>
                                {SPORT_EMOJI[d] || "🏅"} {d}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ===== QUICK STATS ===== */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatMiniCard
                    icon="📊"
                    label="Total Partidos"
                    value={filteredPartidos.length}
                    change={enVivo.length > 0 ? `${enVivo.length} en vivo` : undefined}
                    changeType={enVivo.length > 0 ? "up" : "neutral"}
                />
                <StatMiniCard
                    icon="⚽"
                    label="Goles / Puntos"
                    value={totalGolesStats.total}
                    change={`~${avgGoals}/partido`}
                    changeType="neutral"
                />
                <StatMiniCard
                    icon="🏆"
                    label="Finalizados"
                    value={finalizados.length}
                    change={
                        filteredPartidos.length > 0
                            ? `${Math.round((finalizados.length / filteredPartidos.length) * 100)}%`
                            : "0%"
                    }
                    changeType="up"
                />
                <StatMiniCard
                    icon="🎯"
                    label="Disciplinas"
                    value={disciplinas.length}
                    change={`${programados.length} próximos`}
                    changeType="neutral"
                />
            </div>

            {/* ===== CHARTS ROW 1 ===== */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Bar Chart: Partidos por disciplina */}
                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Trophy size={18} className="text-amber-500" />
                            Partidos por Disciplina
                        </h3>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                            {partidos.length} total
                        </span>
                    </div>
                    {partidosPorDisciplina.length > 0 ? (
                        <BarChart data={partidosPorDisciplina} height={280} />
                    ) : (
                        <EmptyState message="No hay partidos registrados aún" />
                    )}
                </Card>

                {/* Donut Chart: Estado de partidos */}
                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Target size={18} className="text-red-500" />
                            Estado de Partidos
                        </h3>
                    </div>
                    {filteredPartidos.length > 0 ? (
                        <div className="flex justify-center py-4">
                            <DonutChart
                                data={estadoData}
                                size={220}
                                thickness={32}
                                centerLabel="Partidos"
                            />
                        </div>
                    ) : (
                        <EmptyState message="No hay datos disponibles" />
                    )}
                </Card>
            </div>

            {/* ===== CHARTS ROW 2 ===== */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Actividad semanal */}
                <Card className="p-6 border-border/30 lg:col-span-1">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Activity size={18} className="text-emerald-500" />
                        Actividad Semanal
                    </h3>
                    <div className="py-4">
                        <MiniLineChart data={actividadDiaria} height={80} color="#34d399" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-muted/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black">{actividadDiaria.reduce((s, d) => s + d.value, 0)}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                                Esta semana
                            </p>
                        </div>
                        <div className="bg-muted/20 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black">
                                {Math.max(...actividadDiaria.map((d) => d.value))}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                                Día pico
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Ranking de equipos */}
                <Card className="p-6 border-border/30 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Medal size={18} className="text-amber-400" />
                            Ranking de Equipos
                        </h3>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                            Por victorias
                        </span>
                    </div>
                    {equipoStats.length > 0 ? (
                        <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                            {equipoStats.slice(0, 10).map((team, i) => (
                                <div
                                    key={team.name}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/10 hover:bg-muted/20 border border-border/10 transition-all group"
                                >
                                    {/* Position */}
                                    <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${i === 0
                                            ? "bg-amber-500/20 text-amber-400"
                                            : i === 1
                                                ? "bg-slate-400/20 text-slate-300"
                                                : i === 2
                                                    ? "bg-orange-700/20 text-orange-500"
                                                    : "bg-muted/30 text-muted-foreground"
                                            }`}
                                    >
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                                    </div>

                                    {/* Team info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                                            {team.name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground">
                                                {team.partidos}P
                                            </span>
                                            <span className="text-[10px] text-emerald-400">
                                                {team.victorias}V
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {team.goles} pts
                                            </span>
                                        </div>
                                    </div>

                                    {/* Win rate */}
                                    <div className="w-24 hidden sm:block">
                                        <ProgressBar
                                            value={team.winRate}
                                            color={
                                                team.winRate >= 70
                                                    ? "#34d399"
                                                    : team.winRate >= 40
                                                        ? "#fbbf24"
                                                        : "#f87171"
                                            }
                                            size="sm"
                                            showPercentage={false}
                                        />
                                    </div>
                                    <span
                                        className={`text-xs font-bold px-2 py-1 rounded-lg ${team.winRate >= 70
                                            ? "bg-emerald-400/10 text-emerald-400"
                                            : team.winRate >= 40
                                                ? "bg-amber-400/10 text-amber-400"
                                                : "bg-red-400/10 text-red-400"
                                            }`}
                                    >
                                        {team.winRate}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No hay equipos con participación aún" />
                    )}
                </Card>
            </div>

            {/* ===== BOTTOM ROW ===== */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Biggest win */}
                <Card className="p-6 border-border/30">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Flame size={18} className="text-orange-500" />
                        Resultado Más Abultado
                    </h3>
                    {biggestWin ? (
                        <div className="bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-2xl border border-orange-500/10 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-2xl">
                                    {SPORT_EMOJI[biggestWin.disciplinas?.name ?? ''] || "🏅"}
                                </span>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                    {biggestWin.disciplinas?.name}
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-center">
                                    <p className="font-bold text-lg">{biggestWin.equipo_a}</p>
                                    <p className="text-4xl font-black mt-1 text-primary">
                                        {biggestWin.marcador_detalle?.goles_a ??
                                            biggestWin.marcador_detalle?.total_a ??
                                            0}
                                    </p>
                                </div>
                                <span className="text-2xl font-bold text-muted-foreground/30">vs</span>
                                <div className="text-center">
                                    <p className="font-bold text-lg">{biggestWin.equipo_b}</p>
                                    <p className="text-4xl font-black mt-1 text-muted-foreground">
                                        {biggestWin.marcador_detalle?.goles_b ??
                                            biggestWin.marcador_detalle?.total_b ??
                                            0}
                                    </p>
                                </div>
                            </div>
                            <p className="text-center text-xs text-muted-foreground mt-4">
                                {new Date(biggestWin.fecha).toLocaleDateString("es-CO", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    ) : (
                        <EmptyState message="No hay partidos finalizados aún" />
                    )}
                </Card>

                {/* Goles por equipo - breakdown */}
                <Card className="p-6 border-border/30">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <TrendingUp size={18} className="text-primary" />
                        Distribución de Puntos
                    </h3>
                    {totalGolesStats.total > 0 ? (
                        <div className="space-y-6">
                            <div className="flex justify-center py-4">
                                <DonutChart
                                    data={[
                                        { label: "Local (A)", value: totalGolesStats.totalA, color: "#818cf8" },
                                        { label: "Visitante (B)", value: totalGolesStats.totalB, color: "#a78bfa" },
                                    ]}
                                    size={180}
                                    thickness={26}
                                    centerLabel="Puntos"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-red-500/10 rounded-xl p-4 text-center border border-red-500/10">
                                    <p className="text-3xl font-black text-red-400">
                                        {totalGolesStats.totalA}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">
                                        Equipo Local
                                    </p>
                                </div>
                                <div className="bg-orange-500/10 rounded-xl p-4 text-center border border-orange-500/10">
                                    <p className="text-3xl font-black text-orange-400">
                                        {totalGolesStats.totalB}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">
                                        Equipo Visitante
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <EmptyState message="No hay puntos registrados aún" />
                    )}
                </Card>
            </div>
        </div>
    );
}

// ===== EMPTY STATE COMPONENT =====
function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-12 text-muted-foreground/50">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs mt-1 text-muted-foreground/30">
                Los datos aparecerán cuando haya actividad
            </p>
        </div>
    );
}
