"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Plus, Trash2, Save, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Jornada {
    id: number;
    disciplina_id: number;
    genero: string;
    numero: number;
    nombre: string | null;
    scheduled_at: string;
    lugar: string | null;
    estado: 'programado' | 'en_curso' | 'finalizado';
    disciplinas: { name: string } | null;
}

interface Carrera { id: number; nombre: string; }
interface Jugador { id: number; nombre: string; carrera_id: number | null; }

interface ResultRow {
    key: string; // local key for React
    jugador_id: number | null;
    carrera_id: number | null;
    posicion: number;
    puntos_olimpicos: number | null;
    notas: string;
}

function estadoBadge(estado: string) {
    if (estado === 'finalizado') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (estado === 'en_curso')   return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-white/5 text-white/40 border-white/10';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JornadaDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [jornada, setJornada] = useState<Jornada | null>(null);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [jugadores, setJugadores] = useState<Jugador[]>([]);
    const [rows, setRows] = useState<ResultRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);

        const [jornadaRes, carrerasRes, jugadoresRes, resultadosRes] = await Promise.all([
            supabase.from('jornadas')
                .select('id, disciplina_id, genero, numero, nombre, scheduled_at, lugar, estado, disciplinas(name)')
                .eq('id', id)
                .single(),
            supabase.from('carreras').select('id, nombre').order('nombre'),
            supabase.from('jugadores')
                .select('id, nombre, carrera_id')
                .order('nombre'),
            supabase.from('jornada_resultados')
                .select('jugador_id, carrera_id, posicion, puntos_olimpicos, notas')
                .eq('jornada_id', id)
                .order('posicion'),
        ]);

        setJornada((jornadaRes.data as any) ?? null);
        setCarreras(carrerasRes.data ?? []);
        setJugadores(jugadoresRes.data ?? []);

        const existingRows: ResultRow[] = (resultadosRes.data ?? []).map((r: any, i: number) => ({
            key: `existing-${i}`,
            jugador_id: r.jugador_id ?? null,
            carrera_id: r.carrera_id,
            posicion: r.posicion,
            puntos_olimpicos: r.puntos_olimpicos ?? null,
            notas: r.notas ?? '',
        }));
        setRows(existingRows.length > 0 ? existingRows : [newRow(1)]);
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    function newRow(pos: number): ResultRow {
        return { key: `new-${Date.now()}-${pos}`, jugador_id: null, carrera_id: null, posicion: pos, puntos_olimpicos: null, notas: '' };
    }

    function addRow() {
        const nextPos = rows.length > 0 ? Math.max(...rows.map(r => r.posicion)) + 1 : 1;
        setRows(prev => [...prev, newRow(nextPos)]);
    }

    function removeRow(key: string) {
        setRows(prev => prev.filter(r => r.key !== key));
    }

    function updateRow(key: string, field: Partial<ResultRow>) {
        setRows(prev => prev.map(r => r.key === key ? { ...r, ...field } : r));
    }

    function handleJugadorChange(key: string, jugadorId: number | null) {
        const jugador = jugadores.find(j => j.id === jugadorId);
        updateRow(key, {
            jugador_id: jugadorId,
            carrera_id: jugador?.carrera_id ?? null,
        });
    }

    async function save(finalizar = false) {
        const validRows = rows.filter(r => r.carrera_id !== null);
        if (validRows.length === 0) {
            toast.error('Agrega al menos un participante con programa');
            return;
        }

        const positions = validRows.map(r => r.posicion);
        if (new Set(positions).size !== positions.length) {
            toast.error('Hay posiciones duplicadas');
            return;
        }

        finalizar ? setFinalizing(true) : setSaving(true);

        try {
            const res = await fetch(`/api/admin/jornadas/${id}/resultados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resultados: validRows.map(r => ({
                        jugador_id:       r.jugador_id,
                        carrera_id:       r.carrera_id,
                        posicion:         r.posicion,
                        puntos_olimpicos: r.puntos_olimpicos,
                        notas:            r.notas || undefined,
                    })),
                    finalizar,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || 'Error al guardar');
                return;
            }

            toast.success(finalizar ? 'Jornada finalizada y puntos sincronizados' : 'Resultados guardados');
            fetchData();
        } catch {
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
            setFinalizing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-violet-400" size={32} />
            </div>
        );
    }

    if (!jornada) {
        return <div className="text-white/30 text-center py-20">Jornada no encontrada</div>;
    }

    const sportName = (jornada.disciplinas as any)?.name ?? '';
    const isFinalized = jornada.estado === 'finalizado';

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Back */}
            <Link href="/admin/jornadas" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors">
                <ChevronLeft size={16} /> Volver a Jornadas
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-white font-black text-2xl">
                        {jornada.nombre ?? `Ronda ${jornada.numero}`}
                    </h1>
                    <p className="text-white/40 text-sm mt-1">
                        {sportName} · {jornada.genero} ·{' '}
                        {new Date(jornada.scheduled_at).toLocaleString('es-CO', {
                            weekday: 'long', day: 'numeric', month: 'long',
                            hour: '2-digit', minute: '2-digit',
                        })}
                        {jornada.lugar ? ` · ${jornada.lugar}` : ''}
                    </p>
                </div>
                <span className={cn("px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border mt-1", estadoBadge(jornada.estado))}>
                    {jornada.estado === 'finalizado' ? 'Finalizado' : jornada.estado === 'en_curso' ? 'En curso' : 'Programado'}
                </span>
            </div>

            {isFinalized && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-300 text-sm font-medium">
                    Esta jornada está finalizada. Puedes editar los resultados, pero deberás volver a guardar para actualizar el medallero.
                </div>
            )}

            {/* Results table */}
            <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Resultados</h2>

                <div className="space-y-2">
                    {rows.map((row) => (
                        <div key={row.key} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                            {/* Posición */}
                            <input
                                type="number"
                                min={1}
                                value={row.posicion}
                                onChange={e => updateRow(row.key, { posicion: parseInt(e.target.value) || 1 })}
                                className="w-14 text-center bg-white/5 border border-white/10 rounded-xl text-white text-sm font-black py-2 focus:outline-none focus:border-violet-500/50"
                                placeholder="Pos"
                            />

                            {/* Jugador (opcional) */}
                            <select
                                value={row.jugador_id ?? ''}
                                onChange={e => handleJugadorChange(row.key, e.target.value ? parseInt(e.target.value) : null)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl text-white text-sm py-2 px-3 focus:outline-none focus:border-violet-500/50 appearance-none"
                            >
                                <option value="">Jugador (opcional)</option>
                                {jugadores.map(j => (
                                    <option key={j.id} value={j.id}>{j.nombre}</option>
                                ))}
                            </select>

                            {/* Programa */}
                            <select
                                value={row.carrera_id ?? ''}
                                onChange={e => updateRow(row.key, { carrera_id: e.target.value ? parseInt(e.target.value) : null })}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl text-white text-sm py-2 px-3 focus:outline-none focus:border-violet-500/50 appearance-none"
                            >
                                <option value="">Programa *</option>
                                {carreras.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>

                            {/* Puntos olímpicos override */}
                            <input
                                type="number"
                                min={0}
                                value={row.puntos_olimpicos ?? ''}
                                onChange={e => updateRow(row.key, { puntos_olimpicos: e.target.value ? parseInt(e.target.value) : null })}
                                className="w-20 text-center bg-white/5 border border-white/10 rounded-xl text-white text-sm py-2 focus:outline-none focus:border-violet-500/50"
                                placeholder="Pts"
                                title="Puntos olímpicos (opcional — si se deja vacío se derivará de la tabla de puntos)"
                            />

                            <button
                                onClick={() => removeRow(row.key)}
                                className="p-2 rounded-xl text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addRow}
                    className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors py-1"
                >
                    <Plus size={16} /> Agregar participante
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <button
                    onClick={() => save(false)}
                    disabled={saving || finalizing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar
                </button>

                {!isFinalized && (
                    <button
                        onClick={() => save(true)}
                        disabled={saving || finalizing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                    >
                        {finalizing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Finalizar y sincronizar puntos
                    </button>
                )}

                {isFinalized && (
                    <button
                        onClick={() => save(true)}
                        disabled={saving || finalizing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                    >
                        {finalizing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        Re-sincronizar puntos
                    </button>
                )}
            </div>

            <p className="text-xs text-white/20">
                * Programa es requerido. Jugador es opcional. Puntos olímpicos: déjalo vacío para usar la tabla de puntos configurada.
            </p>
        </div>
    );
}
