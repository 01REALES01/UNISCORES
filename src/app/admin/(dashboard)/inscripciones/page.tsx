"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ClipboardList, Trash2, RefreshCw, Info, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Delegacion {
    id: number;
    nombre: string;
    genero: string;
    carrera_ids: number[];
    disciplinas: { id: number; name: string } | null;
    carreras: { id: number; nombre: string; escudo_url?: string }[];
}

interface GroupedEquipo {
    disciplina: string;
    disciplina_id: number;
    genero: string;
    equipos: {
        delegacion_id: number;
        equipo_nombre: string;
        carreras: { id: number; nombre: string }[];
    }[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InscripcionesPage() {
    const [delegaciones, setDelegaciones] = useState<Delegacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);

        // 1. Load delegaciones with disciplina join
        const { data: deleg, error } = await supabase
            .from('delegaciones')
            .select('id, nombre, genero, carrera_ids, disciplinas(id, name)')
            .not('disciplina_id', 'is', null)
            .not('genero', 'is', null)
            .order('disciplina_id')
            .order('genero');

        if (error) { toast.error('Error: ' + error.message); setLoading(false); return; }

        // 2. Resolve all carrera names in one query
        const allIds = [...new Set((deleg ?? []).flatMap(d => d.carrera_ids ?? []))];
        const { data: carreras } = allIds.length > 0
            ? await supabase.from('carreras').select('id, nombre, escudo_url').in('id', allIds)
            : { data: [] };

        const carreraMap = Object.fromEntries((carreras ?? []).map(c => [c.id, c]));

        setDelegaciones(
            (deleg ?? [])
                .map((d: any) => ({
                    id: d.id,
                    nombre: d.nombre,
                    genero: d.genero,
                    carrera_ids: d.carrera_ids ?? [],
                    disciplinas: Array.isArray(d.disciplinas) ? d.disciplinas[0] : d.disciplinas,
                    carreras: (d.carrera_ids ?? []).map((id: number) => carreraMap[id]).filter(Boolean),
                }))
                .filter(d => d.carrera_ids.length > 0)
        );
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Group by disciplina+genero for display
    const grouped: GroupedEquipo[] = [];
    const seen = new Map<string, GroupedEquipo>();

    for (const d of delegaciones) {
        const key = `${d.disciplinas?.id}_${d.genero}`;
        if (!seen.has(key)) {
            const g: GroupedEquipo = {
                disciplina: d.disciplinas?.name ?? '?',
                disciplina_id: d.disciplinas?.id ?? 0,
                genero: d.genero,
                equipos: [],
            };
            seen.set(key, g);
            grouped.push(g);
        }
        seen.get(key)!.equipos.push({
            delegacion_id: d.id,
            equipo_nombre: d.nombre,
            carreras: d.carreras,
        });
    }

    const totalCarreras = delegaciones.reduce((s, d) => s + d.carrera_ids.length, 0);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/sync-delegaciones', { method: 'POST' });
            const json = await res.json();
            if (!res.ok) { toast.error('Error: ' + json.error); return; }
            toast.success(json.summary || 'Sincronizado');
            if (json.unresolved?.length > 0) {
                toast.warning(`${json.unresolved.length} equipos sin resolver — revisa la consola`);
                console.warn('Equipos sin carrera match:', json.unresolved);
            }
            fetchData();
        } catch (e: unknown) {
            toast.error('Error inesperado: ' + String(e));
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteDisciplina = async (disciplinaId: number, genero: string) => {
        if (!confirm(`¿Eliminar todas las delegaciones de este deporte+género?`)) return;
        const { error } = await supabase
            .from('delegaciones')
            .delete()
            .eq('disciplina_id', disciplinaId)
            .eq('genero', genero);
        if (error) { toast.error('Error: ' + error.message); return; }
        toast.success('Delegaciones eliminadas');
        fetchData();
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <ClipboardList size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-xl">Inscripciones</h1>
                            <p className="text-white/30 text-xs">Equipos inscritos por disciplina — derivado de delegaciones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSync}
                            disabled={syncing || loading}
                            title="Resuelve carrera_ids para equipos combinados (DCPRI, COM.SOCIAL/PSICOLOGÍA...)"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400/70 hover:text-amber-300 text-xs font-bold transition-colors disabled:opacity-40"
                        >
                            <Zap size={12} className={syncing ? 'animate-pulse' : ''} />
                            Sync
                        </button>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 text-xs font-bold transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                    <Info size={14} className="text-blue-400/70 shrink-0 mt-0.5" />
                    <p className="text-blue-300/60 text-xs leading-relaxed">
                        Las inscripciones se derivan automáticamente de la tabla <strong className="text-blue-300/80">delegaciones</strong>.
                        El fixture importado crea las delegaciones. Usa <strong className="text-blue-300/80">Sync</strong> para resolver equipos combinados
                        (DCPRI → 3 carreras, COM. SOCIAL/PSICOLOGÍA → 2 carreras, etc.) usando el mapeo estático.
                    </p>
                </div>

                {/* Stats */}
                {delegaciones.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Equipos totales', value: delegaciones.length },
                            { label: 'Disciplinas activas', value: grouped.length },
                            { label: 'Programas inscritos', value: totalCarreras },
                        ].map(s => (
                            <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-center">
                                <div className="text-violet-400 font-black text-2xl">{s.value}</div>
                                <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Groups */}
                {loading ? (
                    <div className="text-white/20 text-sm text-center py-16">Cargando...</div>
                ) : grouped.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                        <div className="text-white/20 text-sm">No hay delegaciones cargadas.</div>
                        <div className="text-white/10 text-xs">Usa el Schedule Import para cargar el fixture desde el Excel.</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {grouped.map(group => (
                            <div key={`${group.disciplina}-${group.genero}`}
                                className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{SPORT_EMOJI[group.disciplina] ?? '🏅'}</span>
                                        <span className="text-white font-bold text-sm">{group.disciplina}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-bold",
                                            group.genero === 'femenino'
                                                ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                                                : group.genero === 'masculino'
                                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                : "bg-white/5 text-white/40 border border-white/10"
                                        )}>
                                            {group.genero}
                                        </span>
                                        <span className="text-white/20 text-xs">{group.equipos.length} equipos</span>
                                    </div>
                                    {group.disciplina_id > 0 && (
                                        <button
                                            onClick={() => handleDeleteDisciplina(group.disciplina_id, group.genero)}
                                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-colors"
                                            title="Eliminar delegaciones de esta disciplina"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                                <div className="divide-y divide-white/5">
                                    {group.equipos.map(equipo => (
                                        <div key={equipo.delegacion_id} className="flex items-start gap-3 px-4 py-3">
                                            <div className="flex-1">
                                                <div className="text-white/80 text-sm font-medium">
                                                    {equipo.equipo_nombre}
                                                </div>
                                                {equipo.carreras.length > 1 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {equipo.carreras.map(c => (
                                                            <span key={c.id}
                                                                className="text-xs px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400/80 border border-violet-500/10">
                                                                {c.nombre}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-white/20 text-xs shrink-0 mt-0.5">
                                                {equipo.carreras.length === 1
                                                    ? equipo.carreras[0]?.nombre
                                                    : `${equipo.carreras.length} carreras`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
