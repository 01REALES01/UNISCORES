"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, Users, RefreshCw, ExternalLink, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Carrera {
    id: number;
    nombre: string;
    escudo_url?: string | null;
    deportes: { disciplina_name: string; genero: string }[];
}

interface Equipo {
    id: number;
    nombre: string;
    disciplina_name: string;
    genero: string;
    carreras: { id: number; nombre: string }[];
}

type Tab = "carreras" | "equipos";

// ─── Component ────────────────────────────────────────────────────────────────

export default function DirectorioPage() {
    const [tab, setTab] = useState<Tab>("carreras");
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);

        // ── Carreras ──────────────────────────────────────────────────────────
        const { data: carrerasRaw } = await supabase
            .from("carreras")
            .select("id, nombre, escudo_url")
            .order("nombre");

        // Get enrolled sports per carrera via delegaciones
        const { data: delegData } = await supabase
            .from("delegaciones")
            .select("carrera_ids, disciplina_id, genero, disciplinas(name)")
            .not("disciplina_id", "is", null)
            .not("genero", "is", null)
            .filter("carrera_ids", "neq", "{}");

        // Build map: carrera_id → enrolled sports
        const carreraSports = new Map<number, { disciplina_name: string; genero: string }[]>();
        for (const d of delegData ?? []) {
            const name = Array.isArray(d.disciplinas) ? d.disciplinas[0]?.name : (d.disciplinas as any)?.name ?? "";
            for (const cid of d.carrera_ids ?? []) {
                if (!carreraSports.has(cid)) carreraSports.set(cid, []);
                carreraSports.get(cid)!.push({ disciplina_name: name, genero: d.genero });
            }
        }

        setCarreras(
            (carrerasRaw ?? []).map(c => ({
                ...c,
                deportes: carreraSports.get(c.id) ?? [],
            }))
        );

        // ── Equipos (delegaciones with ≥1 carrera) ────────────────────────────
        const { data: delegFull } = await supabase
            .from("delegaciones")
            .select("id, nombre, disciplina_id, genero, carrera_ids, disciplinas(name)")
            .not("disciplina_id", "is", null)
            .not("genero", "is", null)
            .order("disciplina_id")
            .order("genero")
            .order("nombre");

        const allCarreraIds = [
            ...new Set((delegFull ?? []).flatMap(d => d.carrera_ids ?? [])),
        ];
        const { data: carrerasMap } = allCarreraIds.length > 0
            ? await supabase.from("carreras").select("id, nombre").in("id", allCarreraIds)
            : { data: [] };
        const cmap = Object.fromEntries((carrerasMap ?? []).map(c => [c.id, c]));

        setEquipos(
            (delegFull ?? [])
                .filter(d => (d.carrera_ids?.length ?? 0) > 0)
                .map((d: any) => ({
                    id: d.id,
                    nombre: d.nombre,
                    disciplina_name: Array.isArray(d.disciplinas) ? d.disciplinas[0]?.name : d.disciplinas?.name ?? "?",
                    genero: d.genero,
                    carreras: (d.carrera_ids ?? []).map((id: number) => cmap[id]).filter(Boolean),
                }))
        );

        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <BookOpen size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-xl">Directorio</h1>
                            <p className="text-white/30 text-xs">Programas y equipos del torneo</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 text-xs font-bold transition-colors disabled:opacity-40"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        Actualizar
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {(["carreras", "equipos"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors capitalize",
                                tab === t
                                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                    : "bg-white/5 text-white/40 border border-white/10 hover:text-white/60"
                            )}
                        >
                            {t === "carreras" ? <GraduationCap size={13} /> : <Users size={13} />}
                            {t === "carreras" ? `Carreras (${carreras.length})` : `Equipos (${equipos.length})`}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-white/20 text-sm text-center py-16">Cargando...</div>
                ) : tab === "carreras" ? (
                    <CarrerasTab carreras={carreras} />
                ) : (
                    <EquiposTab equipos={equipos} />
                )}
            </div>
        </div>
    );
}

// ─── Carreras Tab ─────────────────────────────────────────────────────────────

function CarrerasTab({ carreras }: { carreras: Carrera[] }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {carreras.map(c => (
                <Link
                    key={c.id}
                    href={`/carrera/${c.id}`}
                    target="_blank"
                    className="group flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/20 transition-all"
                >
                    {/* Escudo */}
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.escudo_url ? (
                            <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain" />
                        ) : (
                            <GraduationCap size={18} className="text-white/20" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-white/80 text-sm font-bold truncate">{c.nombre}</span>
                            <ExternalLink size={11} className="text-white/20 shrink-0 group-hover:text-violet-400 transition-colors" />
                        </div>

                        {c.deportes.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {c.deportes.map((d, i) => (
                                    <span
                                        key={i}
                                        className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 border border-white/5 font-medium"
                                    >
                                        {SPORT_EMOJI[d.disciplina_name] ?? "🏅"} {d.disciplina_name} {d.genero === "femenino" ? "♀" : d.genero === "masculino" ? "♂" : ""}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-[10px] text-white/15 mt-1 block">Sin inscripciones</span>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
}

// ─── Equipos Tab ──────────────────────────────────────────────────────────────

function EquiposTab({ equipos }: { equipos: Equipo[] }) {
    // Group by disciplina + genero
    const groups = new Map<string, { label: string; items: Equipo[] }>();
    for (const e of equipos) {
        const key = `${e.disciplina_name}_${e.genero}`;
        if (!groups.has(key)) {
            groups.set(key, {
                label: `${SPORT_EMOJI[e.disciplina_name] ?? "🏅"} ${e.disciplina_name} — ${e.genero}`,
                items: [],
            });
        }
        groups.get(key)!.items.push(e);
    }

    return (
        <div className="space-y-4">
            {[...groups.entries()].map(([key, group]) => (
                <div key={key} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                        <span className="text-white/60 text-xs font-bold">{group.label}</span>
                        <span className="text-white/20 text-xs ml-2">{group.items.length} equipos</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {group.items.map(e => (
                            <Link
                                key={e.id}
                                href={`/equipo/${e.id}`}
                                target="_blank"
                                className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <span className="text-white/80 text-sm font-medium">{e.nombre}</span>
                                    {e.carreras.length > 1 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {e.carreras.map(c => (
                                                <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400/70 border border-violet-500/10">
                                                    {c.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {e.carreras.length === 1 && (
                                        <span className="text-white/20 text-xs">{e.carreras[0]?.nombre}</span>
                                    )}
                                    <ExternalLink size={11} className="text-white/20 group-hover:text-violet-400 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
