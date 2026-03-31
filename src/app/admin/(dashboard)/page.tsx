"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui-primitives";
import { Activity, Calendar, Trophy, Users, TrendingUp, Zap, Clock, ArrowUpRight, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import Link from "next/link";
import { getCurrentScore } from "@/lib/sport-scoring";

import type { PartidoWithRelations as Partido } from '@/modules/matches/types';
import { useAuth } from '@/shared/hooks/useAuth';

export default function AdminDashboard() {
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fetchAttemptRef = useRef(0);
    const { loading: authLoading } = useAuth();

    const fetchData = useCallback(async () => {
        const { data } = await safeQuery(
            supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)').order('fecha', { ascending: false }),
            'admin-dashboard'
        );
        if (data) {
            setPartidos(data as any);
            setLoading(false);
            fetchAttemptRef.current = 0;
        } else if (fetchAttemptRef.current < 5) {
            // Retry up to 5x — handles auth race on cold start / network hiccup / token refresh
            fetchAttemptRef.current++;
            retryRef.current = setTimeout(() => fetchData(), 800);
        } else {
            setLoading(false);
        }
    }, []);

    // Gate on authLoading: prevents fetching before the Supabase session is ready
    useEffect(() => {
        if (authLoading) return;

        fetchAttemptRef.current = 0;
        fetchData();

        const freshFetch = () => {
            fetchAttemptRef.current = 0;
            if (retryRef.current) clearTimeout(retryRef.current);
            fetchData();
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) freshFetch();
        };

        window.addEventListener('app:revalidate', freshFetch);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const sub = supabase
            .channel('admin-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => fetchData(), 800);
            })
            .subscribe();

        return () => {
            window.removeEventListener('app:revalidate', freshFetch);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (retryRef.current) clearTimeout(retryRef.current);
            supabase.removeChannel(sub);
        };
    }, [fetchData, authLoading]);

    const enVivo = partidos.filter(p => p.estado === 'en_curso');
    const finalizados = partidos.filter(p => p.estado === 'finalizado');
    const programados = partidos.filter(p => p.estado === 'programado');
    const disciplinasSet = new Set(partidos.map(p => p.disciplinas?.name).filter(Boolean));

    const stats = [
        {
            name: "En Curso",
            value: enVivo.length,
            icon: Zap,
            color: "text-red-500",
            bg: "bg-red-500/10",
            ring: "ring-red-500/20",
            pulse: enVivo.length > 0,
        },
        {
            name: "Total Partidos",
            value: partidos.length,
            icon: Calendar,
            color: "text-red-500",
            bg: "bg-red-500/10",
            ring: "ring-red-500/20",
            pulse: false,
        },
        {
            name: "Disciplinas",
            value: disciplinasSet.size,
            icon: Trophy,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            ring: "ring-amber-500/20",
            pulse: false,
        },
        {
            name: "Finalizados",
            value: finalizados.length,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            ring: "ring-emerald-500/20",
            pulse: false,
        },
    ];

    const getSportEmoji = (name: string) => {
        const map: Record<string, string> = {
            'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
            'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
        };
        return map[name] || '🏅';
    };

    // Importar al inicio del archivo (nota: esto requiere mover el import arriba, lo haré en el bloque diff completo)

    const getScore = (p: Partido) => {
        // Usar la lógica centralizada que maneja sets, cuartos, y goles
        const scoreInfo = getCurrentScore(p.disciplinas?.name ?? '', p.marcador_detalle || {});
        // Para la vista de lista, mostramos el score principal (Goles en fútbol, Puntos de Set en Volley)
        // O tal vez prefieran ver Sets en Volley? 
        // getCurrentScore para Volley devuelve: scoreA=PuntosSet, subScoreA=SetsGanados
        // En la lista dashboard, espacio es pequeño.

        // Si es Volley/Tenis, mostramos Sets si no están jugando (o resumen), 
        // pero "En Curso" queremos ver qué está pasando.
        // getCurrentScore ya decide qué es lo "importante".

        return { a: scoreInfo.scoreA, b: scoreInfo.scoreB };
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="h-10 w-48 bg-muted/30 rounded-xl" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted/20 rounded-2xl" />)}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-64 bg-muted/20 rounded-2xl" />
                    <div className="h-64 bg-muted/20 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Resumen en tiempo real de las Olimpiadas UNINORTE 2026
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <Link
                        href="/admin/bitacora"
                        className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-primary transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
                    >
                        <History size={16} />
                        Bitácora
                    </Link>
                    <Link
                        href="/admin/partidos"
                        className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                        Ver todos los partidos
                        <ArrowUpRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className={`relative group overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-500/10 border border-white/5 bg-white/8/40 backdrop-blur-md`}
                    >
                        {/* Glow Gradient Background */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${stat.pulse ? 'from-rose-500 to-orange-500' : 'from-red-500 to-cyan-500'}`} />

                        <div className="relative flex items-center justify-between z-10">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
                                <h3 className="text-4xl font-black text-white tracking-tight">{stat.value}</h3>
                            </div>

                            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} ring-1 ${stat.ring} shadow-lg`}>
                                <stat.icon size={24} />
                                {stat.pulse && (
                                    <span className="absolute top-4 right-4 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Live Matches */}
                <div className="rounded-3xl border border-white/5 bg-white/8/40 backdrop-blur-md p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-lg font-bold flex items-center gap-3 text-white">
                            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                                <Zap size={18} />
                            </div>
                            En Curso Ahora
                        </h3>
                        {enVivo.length > 0 && (
                            <span className="flex items-center gap-2 text-[10px] font-black tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                LIVE
                            </span>
                        )}
                    </div>

                    <div className="space-y-3 relative z-10">
                        {enVivo.length > 0 ? (
                            enVivo.map(p => {
                                const score = getScore(p);
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-rose-500/30 transition-all group"
                                    >
                                        <span className="text-3xl filter drop-shadow-md">{getSportEmoji(p.disciplinas?.name ?? '')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-bold text-slate-200 truncate">{p.carrera_a?.nombre || p.equipo_a}</span>
                                                <span className="text-xl font-black text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">{score.a}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-400 truncate">{p.carrera_b?.nombre || p.equipo_b}</span>
                                                <span className="text-xl font-black text-slate-500">{score.b}</span>
                                            </div>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                                            <ArrowUpRight size={16} />
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
                                <div className="inline-flex p-4 rounded-full bg-white/5 mb-3">
                                    <Activity size={24} className="text-slate-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-400">No hay partidos en curso</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="rounded-3xl border border-white/5 bg-white/8/40 backdrop-blur-md p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-lg font-bold flex items-center gap-3 text-white">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                <Clock size={18} />
                            </div>
                            Actividad Reciente
                        </h3>
                    </div>

                    <div className="space-y-2 relative z-10">
                        {finalizados.concat(programados).length > 0 ? (
                            [...finalizados.slice(0, 3), ...programados.slice(0, 3)].map(p => {
                                const score = getScore(p);
                                const isFinal = p.estado === 'finalizado';
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                                    >
                                        <span className="text-2xl opacity-80">{getSportEmoji(p.disciplinas?.name ?? '')}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-200 truncate">
                                                {p.carrera_a?.nombre || p.equipo_a} <span className="text-slate-500 mx-1">vs</span> {p.carrera_b?.nombre || p.equipo_b}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-0.5">
                                                {p.disciplinas?.name} • {new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        {isFinal ? (
                                            <span className="text-xs font-bold font-mono bg-white/5 text-slate-300 px-3 py-1.5 rounded-lg border border-white/5">
                                                {score.a} - {score.b}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                                Programado
                                            </span>
                                        )}
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
                                <p className="text-sm font-medium text-slate-400">Sin actividad reciente</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Disciplines Overview */}
            {/* Disciplines Overview */}
            <div className="rounded-3xl border border-white/5 bg-white/8/40 backdrop-blur-md p-8 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        <Trophy size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Disciplinas Activas</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
                    {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => {
                        const count = partidos.filter(p => p.disciplinas?.name === sport).length;
                        const liveCount = partidos.filter(p => p.disciplinas?.name === sport && p.estado === 'en_curso').length;
                        return (
                            <div
                                key={sport}
                                className={`relative group flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${count > 0
                                    ? 'border-white/10 bg-white/5 hover:bg-white/10 hover:shadow-lg hover:shadow-red-500/10'
                                    : 'border-white/5 bg-transparent opacity-40 hover:opacity-100'
                                    }`}
                            >
                                {liveCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                                    </span>
                                )}
                                <span className="text-3xl filter drop-shadow-lg transition-transform group-hover:scale-110 duration-300">{getSportEmoji(sport)}</span>
                                <span className="text-[10px] font-bold text-center leading-tight text-slate-300 uppercase tracking-wider">{sport}</span>
                                <div className="mt-1 flex items-baseline gap-1">
                                    <span className={`text-xl font-black ${liveCount > 0 ? 'text-rose-400' : 'text-red-400'}`}>{count}</span>
                                    <span className="text-[8px] font-medium text-slate-500">parts</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
