"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Upload, Trash2, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";

interface Inscripcion {
    id: number;
    carrera_id: number;
    disciplina_id: number;
    genero: string;
    equipo_nombre: string;
    carreras: { id: number; nombre: string; escudo_url?: string } | null;
    disciplinas: { id: number; name: string } | null;
}

interface GroupedInscripcion {
    disciplina: string;
    genero: string;
    equipos: {
        equipo_nombre: string;
        carreras: { id: number; nombre: string }[];
    }[];
}

function groupInscripciones(rows: Inscripcion[]): GroupedInscripcion[] {
    const map = new Map<string, GroupedInscripcion>();

    for (const row of rows) {
        const key = `${row.disciplinas?.name}|${row.genero}`;
        if (!map.has(key)) {
            map.set(key, {
                disciplina: row.disciplinas?.name ?? '?',
                genero: row.genero,
                equipos: [],
            });
        }
        const group = map.get(key)!;
        let equipo = group.equipos.find(e => e.equipo_nombre === row.equipo_nombre);
        if (!equipo) {
            equipo = { equipo_nombre: row.equipo_nombre, carreras: [] };
            group.equipos.push(equipo);
        }
        if (row.carreras) {
            equipo.carreras.push({ id: row.carrera_id, nombre: row.carreras.nombre });
        }
    }

    return Array.from(map.values()).sort((a, b) =>
        a.disciplina.localeCompare(b.disciplina) || a.genero.localeCompare(b.genero)
    );
}

export default function InscripcionesPage() {
    const { profile } = useAuth();
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [unmatched, setUnmatched] = useState<{ sheet: string; equipo: string; carrera: string }[]>([]);

    const fetchInscripciones = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('carrera_disciplina')
            .select('*, carreras(id, nombre, escudo_url), disciplinas(id, name)')
            .order('disciplina_id')
            .order('genero');
        setInscripciones(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchInscripciones(); }, [fetchInscripciones]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        setUploading(true);
        setUnmatched([]);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/import-inscripciones', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error ?? 'Error al importar');
                return;
            }

            toast.success(data.message);
            if (data.unmatched_count > 0) {
                setUnmatched(data.unmatched);
                toast.warning(`${data.unmatched_count} equipos sin match — revisa abajo`);
            }
            fetchInscripciones();
        } catch {
            toast.error('Error de red al importar');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDisciplina = async (disciplinaId: number, genero: string) => {
        const { error } = await supabase
            .from('carrera_disciplina')
            .delete()
            .eq('disciplina_id', disciplinaId)
            .eq('genero', genero);
        if (error) { toast.error('Error: ' + error.message); return; }
        toast.success('Inscripciones eliminadas');
        fetchInscripciones();
    };

    const grouped = groupInscripciones(inscripciones);

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <ClipboardList size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-white font-black text-xl">Inscripciones</h1>
                            <p className="text-white/30 text-xs">Carreras inscritas por disciplina — importado del Excel</p>
                        </div>
                    </div>

                    <label className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-colors",
                        uploading
                            ? "bg-white/5 border-white/5 text-white/20 pointer-events-none"
                            : "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-400"
                    )}>
                        {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploading ? 'Importando...' : 'Importar Excel'}
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                    </label>
                </div>

                {/* Unmatched warning */}
                {unmatched.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                            <AlertTriangle size={14} />
                            Equipos sin match automático — revisar manualmente
                        </div>
                        <div className="space-y-1">
                            {unmatched.map((u, i) => (
                                <div key={i} className="text-white/50 text-xs font-mono">
                                    [{u.sheet}] "{u.equipo}" → "{u.carrera}" no encontrado
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats */}
                {inscripciones.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Inscripciones totales', value: inscripciones.length },
                            { label: 'Disciplinas', value: grouped.length },
                            { label: 'Carreras únicas', value: new Set(inscripciones.map(i => i.carrera_id)).size },
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
                    <div className="text-center py-16 space-y-3">
                        <div className="text-white/20 text-sm">No hay inscripciones importadas.</div>
                        <div className="text-white/10 text-xs">Sube el Excel de Olimpiadas para importar automáticamente.</div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {grouped.map(group => {
                            const disciplinaRow = inscripciones.find(i => i.disciplinas?.name === group.disciplina);
                            const disciplinaId = disciplinaRow?.disciplina_id;

                            return (
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
                                        {disciplinaId && (
                                            <button
                                                onClick={() => handleDeleteDisciplina(disciplinaId, group.genero)}
                                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-colors"
                                                title="Eliminar inscripciones de esta disciplina"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {group.equipos.map(equipo => (
                                            <div key={equipo.equipo_nombre}
                                                className="flex items-start gap-3 px-4 py-3">
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
                                                <CheckCircle size={14} className="text-emerald-400/50 mt-0.5 shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
