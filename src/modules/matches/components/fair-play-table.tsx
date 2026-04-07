"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, Square } from "lucide-react";

interface TeamFairPlay {
    team: string;
    score: number;
    amarillas: number;
    rojas: number;
    otros: number;
}

interface FairPlayTableProps {
    genero: string;
    sportName: string;
}

export function FairPlayTable({ genero, sportName }: FairPlayTableProps) {
    const [data, setData] = useState<TeamFairPlay[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!sportName) return;
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);

            // Resolve disciplina_id from sport name
            const { data: disc } = await supabase
                .from('disciplinas')
                .select('id')
                .eq('name', sportName)
                .single();

            if (!disc) { if (!cancelled) { setData([]); setLoading(false); } return; }

            // Get all match IDs for this discipline/gender
            const { data: partidos } = await supabase
                .from('partidos')
                .select('id, equipo_a, equipo_b, delegacion_a, delegacion_b')
                .eq('disciplina_id', disc.id)
                .eq('genero', genero);

            if (!partidos || partidos.length === 0) {
                if (!cancelled) { setData([]); setLoading(false); }
                return;
            }

            const matchIds = partidos.map((p: any) => p.id);

            // Initialize teams with baseline 2000
            const scores: Record<string, number> = {};
            const amarillas: Record<string, number> = {};
            const rojas: Record<string, number> = {};
            const otros: Record<string, number> = {};

            partidos.forEach((p: any) => {
                const a = p.delegacion_a || p.equipo_a;
                const b = p.delegacion_b || p.equipo_b;
                if (a && !(a in scores)) { scores[a] = 2000; amarillas[a] = 0; rojas[a] = 0; otros[a] = 0; }
                if (b && !(b in scores)) { scores[b] = 2000; amarillas[b] = 0; rojas[b] = 0; otros[b] = 0; }
            });

            const { data: eventos } = await supabase
                .from('olympics_eventos')
                .select('tipo_evento, equipo, descripcion')
                .in('partido_id', matchIds)
                .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento', 'ajuste_fair_play']);

            (eventos ?? []).forEach((e: any) => {
                const team = e.equipo;
                if (!team) return;
                if (!(team in scores)) { scores[team] = 2000; amarillas[team] = 0; rojas[team] = 0; otros[team] = 0; }
                if (e.tipo_evento === 'tarjeta_amarilla') { scores[team] -= 50; amarillas[team]++; }
                else if (e.tipo_evento === 'tarjeta_roja') { scores[team] -= 100; rojas[team]++; }
                else if (e.tipo_evento === 'expulsion_delegado') { scores[team] -= 100; otros[team]++; }
                else if (e.tipo_evento === 'mal_comportamiento') { scores[team] -= 100; otros[team]++; }
                else if (e.tipo_evento === 'ajuste_fair_play') { scores[team] += Number(e.descripcion ?? 0); otros[team]++; }
            });

            const rows: TeamFairPlay[] = Object.keys(scores).map(team => ({
                team,
                score: scores[team],
                amarillas: amarillas[team],
                rojas: rojas[team],
                otros: otros[team],
            })).sort((a, b) => b.score - a.score);

            if (!cancelled) { setData(rows); setLoading(false); }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [sportName, genero]);

    if (data.length === 0 && !loading) return null;

    const maxScore = 2000;

    return (
        <div className="rounded-[2rem] border border-white/8 bg-black/30 backdrop-blur-xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 bg-white/[0.03] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Shield size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-display font-black text-base tracking-tight text-white">
                            Fair Play
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-0.5">
                            {sportName} · {genero}
                        </p>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    Baseline: 2000 pts
                </div>
            </div>

            {loading ? (
                <div className="py-8 text-center text-white/30 text-xs font-bold uppercase animate-pulse">Cargando...</div>
            ) : (
                <div className="divide-y divide-white/5">
                    {data.map((row, idx) => {
                        const pct = Math.max(0, Math.min(100, (row.score / maxScore) * 100));
                        const isTop = idx === 0;
                        const isPerfect = row.score === 2000;
                        return (
                            <div key={row.team} className={cn(
                                "px-5 py-4 flex items-center gap-4 transition-colors hover:bg-white/[0.03]",
                                isTop && "bg-emerald-500/[0.04]"
                            )}>
                                {/* Rank */}
                                <div className={cn(
                                    "w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 border",
                                    idx === 0 ? "bg-amber-400/10 border-amber-400/30 text-amber-400" :
                                    idx === 1 ? "bg-slate-400/10 border-slate-400/30 text-slate-400" :
                                    "bg-white/3 border-white/8 text-white/25"
                                )}>
                                    {idx + 1}
                                </div>

                                {/* Team name + bar */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-bold text-white truncate">{row.team}</span>
                                        <span className={cn(
                                            "text-xs font-black tabular-nums ml-2 shrink-0",
                                            isPerfect ? "text-emerald-400" : row.score >= 1900 ? "text-white/70" : row.score >= 1800 ? "text-amber-400" : "text-rose-400"
                                        )}>
                                            {row.score}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-700",
                                                isPerfect ? "bg-emerald-500" : row.score >= 1900 ? "bg-sky-500" : row.score >= 1800 ? "bg-amber-500" : "bg-rose-500"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Card indicators */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {row.amarillas > 0 && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                            <Square size={8} className="text-amber-400 fill-amber-400" />
                                            <span className="text-[10px] font-black text-amber-400">{row.amarillas}</span>
                                        </div>
                                    )}
                                    {row.rojas > 0 && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                            <Square size={8} className="text-rose-400 fill-rose-400" />
                                            <span className="text-[10px] font-black text-rose-400">{row.rojas}</span>
                                        </div>
                                    )}
                                    {row.otros > 0 && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                                            <AlertTriangle size={8} className="text-orange-400" />
                                            <span className="text-[10px] font-black text-orange-400">{row.otros}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5">
                    <Square size={8} className="text-amber-400 fill-amber-400 shrink-0" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Amarilla −50</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Square size={8} className="text-rose-400 fill-rose-400 shrink-0" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Roja −100</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <AlertTriangle size={8} className="text-orange-400 shrink-0" />
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">Expulsión / Mal comportamiento −100</span>
                </div>
            </div>
        </div>
    );
}
