"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import { MainNavbar } from "@/components/main-navbar";
import { Avatar } from "@/components/ui-primitives";
import { SportIcon } from "@/components/sport-icons";
import {
    Trophy, Star, Award, Medal, Flame,
    LayoutGrid, TrendingUp, Target, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORT_COLORS, SPORT_EMOJI, SPORT_ACCENT } from "@/lib/constants";
import Link from "next/link";
import { motion } from "framer-motion";
import UniqueLoading from "@/components/ui/morph-loading";

type Scorer = {
    jugador_id: number;
    nombre: string;
    numero: number | null;
    profile_id: string | null;
    disciplina: string;
    goles: number;
    puntos_totales: number;
    partidos_jugados: number;
    mejor_partido: number;
};

export default function LideresPage() {
    const { user, profile, isStaff } = useAuth();
    const [scorers, setScorers] = useState<Scorer[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSport, setActiveSport] = useState<string>("todos");
    const [sports, setSports] = useState<string[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchScorers = async () => {
        setLoading(true);

        // Try the view first, fallback to direct query
        let data: Scorer[] = [];

        const viewResult = await safeQuery(
            supabase.from('view_top_scorers').select('*'),
            'lideres-view'
        );

        if (viewResult.data && viewResult.data.length > 0) {
            data = viewResult.data;
        } else {
            // Fallback: compute from olympics_eventos directly
            const { data: eventos } = await supabase
                .from('olympics_eventos')
                .select(`
                    tipo_evento, partido_id, equipo,
                    jugadores(id, nombre, numero, profile_id),
                    partidos(estado, disciplinas(name))
                `)
                .in('tipo_evento', ['gol', 'punto', 'punto_1', 'punto_2', 'punto_3']);

            if (eventos && eventos.length > 0) {
                const map = new Map<string, Scorer>();

                for (const e of eventos as any[]) {
                    const j = e.jugadores;
                    const p = e.partidos;
                    if (!j || !p || p.estado !== 'finalizado') continue;

                    const disc = p.disciplinas?.name || 'Desconocido';
                    const key = `${j.id}-${disc}`;

                    if (!map.has(key)) {
                        map.set(key, {
                            jugador_id: j.id,
                            nombre: j.nombre,
                            numero: j.numero,
                            profile_id: j.profile_id,
                            disciplina: disc,
                            goles: 0,
                            puntos_totales: 0,
                            partidos_jugados: 0,
                            mejor_partido: 0,
                        });
                    }

                    const s = map.get(key)!;
                    const pts = e.tipo_evento === 'gol' ? 1
                        : e.tipo_evento === 'punto' ? 1
                        : e.tipo_evento === 'punto_1' ? 1
                        : e.tipo_evento === 'punto_2' ? 2
                        : e.tipo_evento === 'punto_3' ? 3 : 0;

                    if (e.tipo_evento === 'gol') s.goles++;
                    s.puntos_totales += pts;
                }

                // Count distinct matches per player
                const matchMap = new Map<string, Set<number>>();
                for (const e of eventos as any[]) {
                    const j = e.jugadores;
                    const p = e.partidos;
                    if (!j || !p || p.estado !== 'finalizado') continue;
                    const disc = p.disciplinas?.name || 'Desconocido';
                    const key = `${j.id}-${disc}`;
                    if (!matchMap.has(key)) matchMap.set(key, new Set());
                    matchMap.get(key)!.add(e.partido_id);
                }

                for (const [key, matches] of matchMap) {
                    const s = map.get(key);
                    if (s) s.partidos_jugados = matches.size;
                }

                data = Array.from(map.values())
                    .filter(s => s.puntos_totales > 0)
                    .sort((a, b) => b.puntos_totales - a.puntos_totales);
            }
        }

        setScorers(data);

        // Extract unique sports
        const uniqueSports = [...new Set(data.map(s => s.disciplina))].sort();
        setSports(uniqueSports);

        setLoading(false);
    };

    useEffect(() => {
        fetchScorers();

        const channel = supabase
            .channel('realtime-lideres')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'olympics_eventos' }, () => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => fetchScorers(), 2000);
            })
            .subscribe();

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            supabase.removeChannel(channel);
        };
    }, []);

    const filtered = activeSport === 'todos'
        ? scorers
        : scorers.filter(s => s.disciplina === activeSport);

    const top3 = filtered.slice(0, 3);
    const rest = filtered.slice(3);

    const scoringLabel = (sport: string) => {
        if (sport === 'Fútbol' || sport === 'Futsal') return 'Goles';
        return 'Puntos';
    };

    const currentLabel = activeSport === 'todos' ? 'Puntos' : scoringLabel(activeSport);

    if (loading) return (
        <div className="min-h-screen bg-[#060510] flex items-center justify-center">
            <UniqueLoading size="lg" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#060510] text-white selection:bg-amber-500/30 overflow-x-hidden">
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 right-0 w-[700px] h-[700px] bg-amber-600/5 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-red-600/4 rounded-full blur-[120px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-8 pb-24 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em]">
                            Actualizado en tiempo real
                        </span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter uppercase leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40">
                        Líderes
                    </h1>
                    <p className="text-white/30 text-sm font-bold mt-3 max-w-lg">
                        Los máximos anotadores y goleadores de las Olimpiadas Uninorte 2026.
                    </p>
                </motion.div>

                {/* Sport Filters */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-10">
                    <button
                        onClick={() => setActiveSport('todos')}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0",
                            activeSport === 'todos'
                                ? "bg-white/10 text-white border-white/20 shadow-xl"
                                : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <LayoutGrid size={16} /> Todos
                    </button>
                    {sports.map(name => (
                        <button
                            key={name}
                            onClick={() => setActiveSport(name)}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0",
                                activeSport === name
                                    ? "text-white border-transparent shadow-lg"
                                    : "bg-white/[0.02] border-white/5 text-white/30 hover:text-white hover:bg-white/5"
                            )}
                            style={activeSport === name ? {
                                backgroundColor: `${SPORT_COLORS[name] || '#fff'}20`,
                                borderColor: `${SPORT_COLORS[name] || '#fff'}40`,
                                boxShadow: `0 0 20px ${SPORT_COLORS[name] || '#fff'}15`
                            } : undefined}
                        >
                            <SportIcon sport={name} size={18} />
                            {name}
                        </button>
                    ))}
                </div>

                {/* Empty State */}
                {filtered.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-6">
                            <Target size={32} className="text-white/10" />
                        </div>
                        <p className="text-sm font-black text-white/20 uppercase tracking-widest">
                            Sin anotadores registrados
                        </p>
                        <p className="text-[10px] text-white/10 mt-2">
                            Los líderes aparecerán cuando los administradores registren eventos en los partidos.
                        </p>
                    </div>
                )}

                {/* Podium — Top 3 */}
                {top3.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-12"
                    >
                        <div className="flex items-end justify-center gap-3 sm:gap-6 py-8 relative min-h-[300px]">
                            {/* Ambient floor glow */}
                            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-amber-500/5 to-transparent blur-2xl -z-10" />

                            {[
                                { pos: 2, data: top3[1], h: "h-[220px] sm:h-[260px]", color: "border-slate-400/30", numberColor: "text-slate-400", medal: "🥈", glow: "shadow-slate-500/10" },
                                { pos: 1, data: top3[0], h: "h-[280px] sm:h-[340px]", color: "border-amber-500/50", numberColor: "text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]", medal: "🥇", glow: "shadow-amber-500/20" },
                                { pos: 3, data: top3[2], h: "h-[180px] sm:h-[220px]", color: "border-amber-800/30", numberColor: "text-amber-700", medal: "🥉", glow: "shadow-amber-800/10" },
                            ].map((slot) => {
                                if (!slot.data) return <div key={slot.pos} className="flex-1 max-w-[160px]" />;
                                const s = slot.data;
                                const isWinner = slot.pos === 1;
                                const sportColor = SPORT_COLORS[s.disciplina] || '#f59e0b';

                                return (
                                    <motion.div
                                        key={slot.pos}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 + slot.pos * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                        className={cn(
                                            "flex flex-col items-center relative",
                                            isWinner ? "z-30 w-[140px] sm:w-[180px]" : "z-20 w-[110px] sm:w-[140px]"
                                        )}
                                    >
                                        {isWinner && (
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[9px] font-black px-4 py-1 rounded-md uppercase tracking-widest shadow-lg animate-bounce z-40">
                                                Líder
                                            </div>
                                        )}

                                        <div className={cn(
                                            "w-full bg-[#0d0b1a] rounded-[2rem] border transition-all duration-500 flex flex-col items-center pt-8 sm:pt-10 overflow-hidden relative group cursor-pointer hover:scale-[1.02]",
                                            slot.h, slot.color, `shadow-2xl ${slot.glow}`
                                        )}>
                                            {/* Sport emoji */}
                                            <span className="text-2xl mb-3">{SPORT_EMOJI[s.disciplina] || '🏅'}</span>

                                            {/* Avatar */}
                                            <div className="relative mb-3">
                                                {s.profile_id ? (
                                                    <Link href={`/perfil/${s.profile_id}`}>
                                                        <Avatar name={s.nombre} className={cn(
                                                            "shadow-2xl border-2",
                                                            isWinner ? "w-20 h-20 border-amber-400" : "w-14 h-14 border-white/10"
                                                        )} />
                                                    </Link>
                                                ) : (
                                                    <Avatar name={s.nombre} className={cn(
                                                        "shadow-2xl border-2",
                                                        isWinner ? "w-20 h-20 border-amber-400" : "w-14 h-14 border-white/10"
                                                    )} />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="text-center px-2 mb-4">
                                                <p className={cn(
                                                    "text-[10px] sm:text-[11px] font-black truncate max-w-[120px] uppercase tracking-wider font-outfit",
                                                    isWinner ? "text-white" : "text-slate-400"
                                                )}>
                                                    {s.nombre.split(' ')[0]}
                                                </p>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
                                                    {s.disciplina}
                                                </p>
                                                {s.numero !== null && (
                                                    <p className="text-[8px] font-bold text-white/15 mt-0.5">#{s.numero}</p>
                                                )}
                                            </div>

                                            {/* Bottom score box */}
                                            <div className="mt-auto w-full bg-black/40 py-4 flex flex-col items-center border-t border-white/5">
                                                <span className={cn(
                                                    "text-3xl sm:text-4xl font-black tracking-tighter leading-none tabular-nums",
                                                    slot.numberColor
                                                )}>
                                                    {s.puntos_totales}
                                                </span>
                                                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">
                                                    {currentLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Full Ranking List */}
                {rest.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-2"
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25 mb-4 px-1">
                            Ranking Completo
                        </h3>

                        {rest.map((s, idx) => {
                            const rank = idx + 4;
                            const sportColor = SPORT_COLORS[s.disciplina] || '#f59e0b';
                            const emoji = SPORT_EMOJI[s.disciplina] || '🏅';

                            return (
                                <div
                                    key={`${s.jugador_id}-${s.disciplina}`}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0d0b1a]/80 border border-white/5 hover:border-white/15 hover:bg-white/[0.03] transition-all group"
                                >
                                    {/* Rank */}
                                    <div className="w-8 text-center">
                                        <span className="text-sm font-black text-white/20 tabular-nums">{rank}</span>
                                    </div>

                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                        {s.profile_id ? (
                                            <Link href={`/perfil/${s.profile_id}`}>
                                                <Avatar name={s.nombre} className="w-10 h-10 rounded-xl border border-white/10" />
                                            </Link>
                                        ) : (
                                            <Avatar name={s.nombre} className="w-10 h-10 rounded-xl border border-white/10" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {s.profile_id ? (
                                                <Link href={`/perfil/${s.profile_id}`} className="text-sm font-black text-white/80 truncate hover:text-white transition-colors">
                                                    {s.nombre}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-black text-white/80 truncate">{s.nombre}</span>
                                            )}
                                            {s.numero !== null && (
                                                <span className="text-[9px] font-bold text-white/20">#{s.numero}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[9px]">{emoji}</span>
                                            <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">{s.disciplina}</span>
                                            <span className="text-[8px] font-bold text-white/15">• {s.partidos_jugados} PJ</span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {s.mejor_partido > 0 && (
                                            <div className="hidden sm:flex flex-col items-center">
                                                <span className="text-[7px] font-black text-white/15 uppercase tracking-widest">Mejor</span>
                                                <span className="text-xs font-black text-white/40 tabular-nums">{s.mejor_partido}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/5 bg-black/30">
                                            <Star size={12} style={{ color: sportColor }} className="fill-current opacity-80" />
                                            <span className="text-base font-black text-white tabular-nums">{s.puntos_totales}</span>
                                            <span className="text-[7px] font-bold text-white/20 uppercase">{currentLabel.substring(0, 3)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Footer */}
                <div className="mt-16 text-center">
                    <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">
                        Olimpiadas Uninorte 2026
                    </p>
                </div>
            </main>
        </div>
    );
}
