"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, Avatar } from "@/components/ui-primitives";
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
            supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url), delegacion_a_info:delegaciones!delegacion_a_id(escudo_url), delegacion_b_info:delegaciones!delegacion_b_id(escudo_url)').order('fecha', { ascending: true }),
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
        <div className="space-y-5">
            {/* Welcome Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Dashboard</h2>
                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/bitacora"
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                        <History size={13} />
                        Bitácora
                    </Link>
                    <Link
                        href="/admin/partidos"
                        className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                    >
                        Todos los partidos
                        <ArrowUpRight size={13} />
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="relative rounded-xl p-3.5 border border-white/5 bg-white/[0.03] flex items-center gap-3"
                    >
                        <div className={`shrink-0 ${stat.color}`}>
                            <stat.icon size={16} />
                            {stat.pulse && (
                                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{stat.name}</p>
                            <h3 className="text-xl font-bold text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Live Matches */}
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
                            <Zap size={13} className="text-rose-400" />
                            En Curso
                        </h3>
                        {enVivo.length > 0 && (
                            <span className="flex items-center gap-1 text-[9px] font-bold tracking-wider text-rose-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                LIVE
                            </span>
                        )}
                    </div>

                    <div className="space-y-1">
                        {enVivo.length > 0 ? (
                            enVivo.map(p => {
                                const score = getScore(p);
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/5"
                                    >
                                        <span className="text-base shrink-0">{getSportEmoji(p.disciplinas?.name ?? '')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Avatar name={p.carrera_a?.nombre || p.equipo_a} src={p.carrera_a?.escudo_url || p.delegacion_a_info?.escudo_url} size="sm" className="w-5 h-5 shrink-0 border border-white/10 bg-black/40" />
                                                    <span className="text-xs font-semibold text-slate-200 truncate">{p.carrera_a?.nombre || p.equipo_a}</span>
                                                </div>
                                                <span className="text-sm font-bold text-rose-400 ml-2 shrink-0">{score.a}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Avatar name={p.carrera_b?.nombre || p.equipo_b} src={p.carrera_b?.escudo_url || p.delegacion_b_info?.escudo_url} size="sm" className="w-5 h-5 shrink-0 border border-white/10 bg-black/40" />
                                                    <span className="text-xs text-slate-500 truncate">{p.carrera_b?.nombre || p.equipo_b}</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-500 ml-2 shrink-0">{score.b}</span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-6">
                                <Activity size={16} className="text-slate-600 mx-auto mb-1.5" />
                                <p className="text-xs text-slate-500">Sin partidos en curso</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                        <Clock size={13} className="text-slate-500" />
                        <h3 className="text-xs font-bold text-slate-300">Actividad Reciente</h3>
                    </div>

                    <div className="space-y-0.5">
                        {finalizados.concat(programados).length > 0 ? (
                            [...finalizados.slice(0, 4), ...programados.slice(0, 4)].map(p => {
                                const score = getScore(p);
                                const isFinal = p.estado === 'finalizado';
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5"
                                    >
                                        <span className="text-sm shrink-0">{getSportEmoji(p.disciplinas?.name ?? '')}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Avatar name={p.carrera_a?.nombre || p.equipo_a} src={p.carrera_a?.escudo_url || p.delegacion_a_info?.escudo_url} size="sm" className="w-4 h-4 shrink-0 border border-white/10 bg-black/40" />
                                                <p className="text-xs font-medium text-slate-300 truncate">
                                                    {p.carrera_a?.nombre || p.equipo_a} <span className="text-slate-600">vs</span> {p.carrera_b?.nombre || p.equipo_b}
                                                </p>
                                                <Avatar name={p.carrera_b?.nombre || p.equipo_b} src={p.carrera_b?.escudo_url || p.delegacion_b_info?.escudo_url} size="sm" className="w-4 h-4 shrink-0 border border-white/10 bg-black/40" />
                                            </div>
                                            <p className="text-[10px] text-slate-600">
                                                {p.disciplinas?.name} · {new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        {isFinal ? (
                                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                {score.a}-{score.b}
                                            </span>
                                        ) : (
                                            <span className="text-[9px] uppercase text-slate-600 shrink-0">
                                                Prog.
                                            </span>
                                        )}
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-xs text-slate-500">Sin actividad reciente</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Disciplines Overview — horizontal badges */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-center gap-1.5 mb-3">
                    <Trophy size={13} className="text-slate-500" />
                    <h3 className="text-xs font-bold text-slate-300">Disciplinas</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => {
                        const count = partidos.filter(p => p.disciplinas?.name === sport).length;
                        const liveCount = partidos.filter(p => p.disciplinas?.name === sport && p.estado === 'en_curso').length;
                        return (
                            <div
                                key={sport}
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                                    liveCount > 0
                                        ? 'border-rose-500/30 bg-rose-500/5 text-rose-300'
                                        : count > 0
                                        ? 'border-white/8 bg-white/[0.03] text-slate-400'
                                        : 'border-white/5 text-slate-600'
                                }`}
                            >
                                {liveCount > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                )}
                                <span>{getSportEmoji(sport)}</span>
                                <span className="font-medium">{sport}</span>
                                <span className="font-bold">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
