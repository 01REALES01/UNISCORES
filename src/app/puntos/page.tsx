"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { MainNavbar } from "@/components/main-navbar";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClasificacionGeneralRow } from "@/modules/puntos/types";

const POSITION_BADGES: Record<number, { label: string; color: string }> = {
    1: { label: '1°', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    2: { label: '2°', color: 'text-slate-300 bg-slate-500/10 border-slate-500/30' },
    3: { label: '3°', color: 'text-amber-700 bg-amber-900/20 border-amber-700/30' },
};

function RankBadge({ rank }: { rank: number }) {
    const badge = POSITION_BADGES[rank];
    if (badge) {
        return (
            <span className={cn("w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black shrink-0", badge.color)}>
                {badge.label}
            </span>
        );
    }
    return (
        <span className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-xs font-bold text-white/30 shrink-0">
            {rank}
        </span>
    );
}

function CarreraRow({ row, rank }: { row: ClasificacionGeneralRow; rank: number }) {
    const [open, setOpen] = useState(false);
    const detalles = row.detalle_disciplinas ?? [];

    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <button
                onClick={() => detalles.length > 0 && setOpen(!open)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
                <RankBadge rank={rank} />

                {row.escudo_url ? (
                    <img src={row.escudo_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 shrink-0" />
                )}

                <span className="text-white font-bold text-sm flex-1">{row.carrera_nombre}</span>

                <div className="text-right">
                    <span className="text-amber-400 font-black text-lg">{row.total_puntos}</span>
                    <span className="text-white/30 text-xs ml-1">pts</span>
                </div>

                {detalles.length > 0 && (
                    open
                        ? <ChevronUp size={14} className="text-white/20 shrink-0" />
                        : <ChevronDown size={14} className="text-white/20 shrink-0" />
                )}
            </button>

            {open && detalles.length > 0 && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                    {detalles.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-white/30 text-xs w-4">{d.posicion}°</span>
                            <span className="text-white/60 text-sm flex-1">{d.disciplina_nombre}</span>
                            <span className="text-xs text-white/20 capitalize">{d.genero}</span>
                            {d.categoria && (
                                <span className="text-violet-400/60 text-xs px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/10 capitalize">
                                    {d.categoria}
                                </span>
                            )}
                            <span className="text-amber-400/70 text-xs font-bold">{d.puntos} pts</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PuntosPage() {
    const { user, profile, isStaff } = useAuth();
    const [rows, setRows] = useState<ClasificacionGeneralRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [generoFilter, setGeneroFilter] = useState<'todos' | 'masculino' | 'femenino'>('todos');

    useEffect(() => {
        supabase
            .from('view_clasificacion_general')
            .select('*')
            .then(({ data }) => {
                setRows(data ?? []);
                setLoading(false);
            });
    }, []);

    // Filter by genero inside detalle
    const filteredRows = rows
        .map(row => {
            if (generoFilter === 'todos') return row;
            const filtered = (row.detalle_disciplinas ?? []).filter(d => d.genero === generoFilter);
            const total = filtered.reduce((sum, d) => sum + d.puntos, 0);
            return { ...row, detalle_disciplinas: filtered, total_puntos: total };
        })
        .filter(row => generoFilter === 'todos' || row.total_puntos > 0)
        .sort((a, b) => b.total_puntos - a.total_puntos);

    return (
        <div className="min-h-screen bg-[#0a0805] text-white font-sans">
            {/* Ambient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[700px] h-[700px] bg-amber-500/8 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[100px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-2xl mx-auto px-4 pt-10 pb-12 relative z-10">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Trophy size={18} className="text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-2xl">Puntos Olímpicos</h1>
                            <p className="text-white/30 text-sm">Clasificación general por carreras</p>
                        </div>
                    </div>

                    {/* Gender filter */}
                    <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
                        {(['todos', 'masculino', 'femenino'] as const).map(g => (
                            <button
                                key={g}
                                onClick={() => setGeneroFilter(g)}
                                className={cn(
                                    "px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all",
                                    generoFilter === g
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        : "text-white/30 hover:text-white/60"
                                )}
                            >
                                {g}
                            </button>
                        ))}
                    </div>

                    {/* Leaderboard */}
                    {loading ? (
                        <div className="text-white/20 text-sm text-center py-16">Cargando...</div>
                    ) : filteredRows.length === 0 ? (
                        <div className="text-white/20 text-sm text-center py-16">
                            Aún no hay clasificaciones registradas.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredRows.map((row, i) => (
                                <CarreraRow key={row.carrera_id} row={row} rank={i + 1} />
                            ))}
                        </div>
                    )}

                    <p className="text-white/20 text-xs text-center">
                        Puntos por posición: equipo (1° = 15pts … 8° = 1pt) · individual (1° = 10pts … 8° = 1pt)
                    </p>
                </div>
            </main>
        </div>
    );
}
