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
            supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)').order('fecha', { ascending: true }),
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="relative rounded-2xl p-5 border border-white/5 bg-white/[0.04]"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
                                <h3 className="text-4xl font-black text-white tracking-tight">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={22} />
                                {stat.pulse && (
                                    <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Live Matches */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                                <Zap size={16} />
                            </div>
                            En Curso Ahora
                        </h3>
                        {enVivo.length > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                LIVE
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {enVivo.length > 0 ? (
                            enVivo.map(p => {
                                const score = getScore(p);
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/5"
                                    >
                                        <span className="text-2xl">{getSportEmoji(p.disciplinas?.name ?? '')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-sm font-bold text-slate-200 truncate">{p.carrera_a?.nombre || p.equipo_a}</span>
                                                <span className="text-lg font-black text-rose-400">{score.a}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-400 truncate">{p.carrera_b?.nombre || p.equipo_b}</span>
                                                <span className="text-lg font-black text-slate-500">{score.b}</span>
                                            </div>
                                        </div>
                                        <ArrowUpRight size={15} className="text-white/20 shrink-0" />
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 rounded-xl border border-dashed border-white/10">
                                <Activity size={22} className="text-slate-600 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-500">No hay partidos en curso</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400">
                            <Clock size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-white">Actividad Reciente</h3>
                    </div>

                    <div className="space-y-1">
                        {finalizados.concat(programados).length > 0 ? (
                            [...finalizados.slice(0, 3), ...programados.slice(0, 3)].map(p => {
                                const score = getScore(p);
                                const isFinal = p.estado === 'finalizado';
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5"
                                    >
                                        <span className="text-xl">{getSportEmoji(p.disciplinas?.name ?? '')}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-200 truncate">
                                                {p.carrera_a?.nombre || p.equipo_a} <span className="text-slate-500">vs</span> {p.carrera_b?.nombre || p.equipo_b}
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                {p.disciplinas?.name} · {new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        {isFinal ? (
                                            <span className="text-xs font-bold font-mono bg-white/5 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5 shrink-0">
                                                {score.a} - {score.b}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-slate-500/10 text-slate-400 border border-white/5 shrink-0">
                                                Programado
                                            </span>
                                        )}
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 rounded-xl border border-dashed border-white/10">
                                <p className="text-sm font-medium text-slate-500">Sin actividad reciente</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Disciplines Overview */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 mb-5">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Trophy size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-white">Disciplinas Activas</h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => {
                        const count = partidos.filter(p => p.disciplinas?.name === sport).length;
                        const liveCount = partidos.filter(p => p.disciplinas?.name === sport && p.estado === 'en_curso').length;
                        return (
                            <div
                                key={sport}
                                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border ${
                                    count > 0 ? 'border-white/8 bg-white/[0.03]' : 'border-white/5 opacity-40'
                                }`}
                            >
                                {liveCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                                    </span>
                                )}
                                <span className="text-2xl">{getSportEmoji(sport)}</span>
                                <span className="text-[9px] font-bold text-center leading-tight text-slate-400 uppercase tracking-wide">{sport}</span>
                                <span className={`text-lg font-black ${liveCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
