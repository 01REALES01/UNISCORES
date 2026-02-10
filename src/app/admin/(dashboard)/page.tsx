"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui-primitives";
import { Activity, Calendar, Trophy, Users, TrendingUp, Zap, Clock, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Partido = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    estado: string;
    fecha: string;
    marcador_detalle: any;
    disciplinas: { name: string };
};

export default function AdminDashboard() {
    const [partidos, setPartidos] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data } = await supabase
                .from('partidos')
                .select('*, disciplinas(name)')
                .order('fecha', { ascending: false });
            if (data) setPartidos(data as any);
            setLoading(false);
        };
        fetchData();

        // Real-time updates
        const sub = supabase
            .channel('admin-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    const enVivo = partidos.filter(p => p.estado === 'en_vivo');
    const finalizados = partidos.filter(p => p.estado === 'finalizado');
    const programados = partidos.filter(p => p.estado === 'programado');
    const disciplinasSet = new Set(partidos.map(p => p.disciplinas?.name).filter(Boolean));

    const stats = [
        {
            name: "En Vivo",
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
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            ring: "ring-blue-500/20",
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

    const getScore = (p: Partido) => {
        const md = p.marcador_detalle || {};
        const a = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
        const b = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
        return { a, b };
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
                <Link
                    href="/admin/partidos"
                    className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                    Ver todos los partidos
                    <ArrowUpRight size={16} />
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card
                        key={stat.name}
                        className={`relative overflow-hidden flex items-center p-5 space-x-4 border-border/30 hover:border-border/60 transition-all duration-300 group hover:shadow-lg ${stat.pulse ? 'ring-2 ' + stat.ring : ''}`}
                    >
                        {/* Glow effect */}
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl opacity-30 group-hover:opacity-50 transition-opacity`} />

                        <div className={`relative p-3.5 rounded-2xl ${stat.bg} ${stat.color} ring-1 ${stat.ring}`}>
                            <stat.icon size={22} />
                            {stat.pulse && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                            <h3 className="text-3xl font-black mt-0.5">{stat.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Live Matches */}
                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Zap size={18} className="text-red-500" />
                            En Vivo Ahora
                        </h3>
                        {enVivo.length > 0 && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                </span>
                                LIVE
                            </span>
                        )}
                    </div>
                    <div className="space-y-3">
                        {enVivo.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground/50">
                                <Activity size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No hay partidos en vivo</p>
                                <p className="text-xs mt-1">Inicia un partido desde la sección de Partidos</p>
                            </div>
                        ) : (
                            enVivo.map(p => {
                                const score = getScore(p);
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all group"
                                    >
                                        <span className="text-2xl">{getSportEmoji(p.disciplinas?.name)}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold truncate">{p.equipo_a}</span>
                                                <span className="text-lg font-black text-primary mx-2">{score.a}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-muted-foreground truncate">{p.equipo_b}</span>
                                                <span className="text-lg font-black text-muted-foreground mx-2">{score.b}</span>
                                            </div>
                                        </div>
                                        <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </Card>

                {/* Recent / Upcoming */}
                <Card className="p-6 border-border/30">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Clock size={18} className="text-blue-500" />
                            Actividad Reciente
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {[...finalizados.slice(0, 3), ...programados.slice(0, 3)].length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground/50">
                                <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No hay actividad reciente</p>
                                <p className="text-xs mt-1">Crea un partido para empezar</p>
                            </div>
                        ) : (
                            [...finalizados.slice(0, 3), ...programados.slice(0, 3)].map(p => {
                                const score = getScore(p);
                                const isFinal = p.estado === 'finalizado';
                                return (
                                    <Link
                                        key={p.id}
                                        href={`/admin/partidos/${p.id}`}
                                        className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted/30 transition-all group"
                                    >
                                        <span className="text-xl">{getSportEmoji(p.disciplinas?.name)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {p.equipo_a} vs {p.equipo_b}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {p.disciplinas?.name} · {new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        {isFinal ? (
                                            <span className="text-sm font-bold font-mono bg-muted/50 px-2.5 py-1 rounded-lg">
                                                {score.a} - {score.b}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400">
                                                Programado
                                            </span>
                                        )}
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>

            {/* Disciplines Overview */}
            <Card className="p-6 border-border/30">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" />
                    Disciplinas Activas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'].map(sport => {
                        const count = partidos.filter(p => p.disciplinas?.name === sport).length;
                        const liveCount = partidos.filter(p => p.disciplinas?.name === sport && p.estado === 'en_vivo').length;
                        return (
                            <div
                                key={sport}
                                className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${count > 0
                                        ? 'border-border/40 bg-muted/20 hover:bg-muted/40'
                                        : 'border-border/20 bg-muted/5 opacity-50'
                                    }`}
                            >
                                {liveCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                                    </span>
                                )}
                                <span className="text-3xl">{getSportEmoji(sport)}</span>
                                <span className="text-[10px] font-bold text-center leading-tight">{sport}</span>
                                <span className="text-lg font-black">{count}</span>
                                <span className="text-[9px] text-muted-foreground">partidos</span>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
