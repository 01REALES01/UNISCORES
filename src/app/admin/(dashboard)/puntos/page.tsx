"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Trophy, Settings, Save, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEPORTES_INDIVIDUALES, DEPORTES_CON_CATEGORIA, DEPORTES_CON_BRACKET } from "@/lib/constants";
import type { PuntosConfig, ClasificacionDisciplina } from "@/modules/puntos/types";

type Categoria = 'principiante' | 'intermedio' | 'avanzado';
const CATEGORIAS: Categoria[] = ['principiante', 'intermedio', 'avanzado'];

interface Disciplina { id: number; name: string; icon?: string }
interface Carrera { id: number; nombre: string; escudo_url?: string }

function getTipoDeporte(disciplinaNombre: string): 'equipo' | 'individual' {
    return DEPORTES_INDIVIDUALES.includes(disciplinaNombre) ? 'individual' : 'equipo';
}

const GENEROS = ['masculino', 'femenino', 'mixto'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Points config editor (admin only)
// ─────────────────────────────────────────────────────────────────────────────
function PuntosConfigTab({ isAdmin }: { isAdmin: boolean }) {
    const [configs, setConfigs] = useState<PuntosConfig[]>([]);
    const [editing, setEditing] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('puntos_config').select('*').order('tipo_deporte').order('posicion')
            .then(({ data }) => { if (data) setConfigs(data); setLoading(false); });
    }, []);

    const handleSave = async (config: PuntosConfig) => {
        const newPuntos = editing[config.id] ?? config.puntos;
        const { error } = await supabase
            .from('puntos_config')
            .update({ puntos: newPuntos, updated_at: new Date().toISOString() })
            .eq('id', config.id);
        if (error) { toast.error('Error al guardar: ' + error.message); return; }
        setConfigs(prev => prev.map(c => c.id === config.id ? { ...c, puntos: newPuntos } : c));
        const updated = { ...editing };
        delete updated[config.id];
        setEditing(updated);
        toast.success('Guardado');
    };

    const grouped = configs.reduce<Record<string, PuntosConfig[]>>((acc, c) => {
        (acc[c.tipo_deporte] ??= []).push(c);
        return acc;
    }, {});

    if (loading) return <div className="text-white/40 text-sm py-8 text-center">Cargando...</div>;
    if (!isAdmin) return <div className="text-white/40 text-sm py-8 text-center">Solo admins pueden editar la configuración de puntos.</div>;

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([tipo, rows]) => (
                <div key={tipo} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400/80">{tipo}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {rows.map(c => (
                            <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                                <span className="text-white/40 text-xs w-16">{c.posicion}° lugar</span>
                                <span className="text-white/60 text-sm flex-1">{c.descripcion}</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={editing[c.id] ?? c.puntos}
                                    onChange={e => setEditing(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-amber-500/50"
                                />
                                <span className="text-white/30 text-xs">pts</span>
                                {editing[c.id] !== undefined && editing[c.id] !== c.puntos && (
                                    <button onClick={() => handleSave(c)} className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors">
                                        <Save size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Classification entry
// ─────────────────────────────────────────────────────────────────────────────
function ClasificacionTab() {
    const { profile } = useAuth();
    const { logAction } = useAuditLogger();

    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [configs, setConfigs] = useState<PuntosConfig[]>([]);
    const [existing, setExisting] = useState<ClasificacionDisciplina[]>([]);

    const [selectedDisc, setSelectedDisc] = useState<number | null>(null);
    const [selectedGenero, setSelectedGenero] = useState<'masculino' | 'femenino' | 'mixto'>('masculino');
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
    const [positions, setPositions] = useState<Record<number, number | null>>({});
    const [saving, setSaving] = useState(false);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase.from('disciplinas').select('id, name, icon').order('name'),
            supabase.from('carreras').select('id, nombre, escudo_url').order('nombre'),
            supabase.from('puntos_config').select('*').order('tipo_deporte').order('posicion'),
        ]).then(([d, c, p]) => {
            if (d.data) setDisciplinas(d.data);
            if (c.data) setCarreras(c.data);
            if (p.data) setConfigs(p.data);
        });
    }, []);

    const fetchExisting = useCallback(async (discId: number, genero: string, categoria: Categoria | null) => {
        let query = supabase
            .from('clasificacion_disciplina')
            .select('*, disciplinas(id, name), carreras(id, nombre, escudo_url)')
            .eq('disciplina_id', discId)
            .eq('genero', genero)
            .order('posicion');

        if (categoria) {
            query = query.eq('categoria', categoria);
        } else {
            query = query.is('categoria', null);
        }

        const { data } = await query;
        if (data) {
            setExisting(data);
            const pos: Record<number, number | null> = {};
            data.forEach((e: ClasificacionDisciplina) => { pos[e.posicion] = e.carrera_id; });
            setPositions(pos);
        } else {
            setExisting([]);
            setPositions({});
        }
    }, []);

    useEffect(() => {
        if (selectedDisc) fetchExisting(selectedDisc, selectedGenero, selectedCategoria);
    }, [selectedDisc, selectedGenero, selectedCategoria, fetchExisting]);

    // Reset categoria when discipline changes
    useEffect(() => {
        const name = disciplinas.find(d => d.id === selectedDisc)?.name ?? '';
        setSelectedCategoria(DEPORTES_CON_CATEGORIA.includes(name) ? 'principiante' : null);
    }, [selectedDisc, disciplinas]);

    const selectedDiscName = disciplinas.find(d => d.id === selectedDisc)?.name ?? '';
    const tipoDeporte = selectedDiscName ? getTipoDeporte(selectedDiscName) : 'equipo';
    const hasCategoria = DEPORTES_CON_CATEGORIA.includes(selectedDiscName);
    const hasBracket = DEPORTES_CON_BRACKET.includes(selectedDiscName);
    const configForType = configs.filter(c => c.tipo_deporte === tipoDeporte);
    const maxPositions = configForType.length || 8;

    const getPuntos = (pos: number) =>
        configForType.find(c => c.posicion === pos)?.puntos ?? 0;

    const handleSave = async () => {
        if (!selectedDisc || !profile) return;
        setSaving(true);
        try {
            const entries = Object.entries(positions)
                .filter(([, carreraId]) => carreraId != null)
                .map(([posicion, carreraId]) => ({
                    disciplina_id: selectedDisc,
                    carrera_id: carreraId!,
                    genero: selectedGenero,
                    categoria: selectedCategoria,
                    posicion: Number(posicion),
                    puntos_obtenidos: getPuntos(Number(posicion)),
                    created_by: profile.id,
                    updated_at: new Date().toISOString(),
                }));

            const { error } = await supabase
                .from('clasificacion_disciplina')
                .upsert(entries, { onConflict: 'disciplina_id,carrera_id,genero,categoria' });

            if (error) { toast.error('Error: ' + error.message); return; }

            await logAction('SET_CLASIFICACION', 'config', String(selectedDisc), {
                disciplina: selectedDiscName,
                genero: selectedGenero,
                categoria: selectedCategoria,
                entries: entries.length,
            });

            toast.success('Clasificación guardada');
            fetchExisting(selectedDisc, selectedGenero, selectedCategoria);
        } finally {
            setSaving(false);
        }
    };

    const handleCalcular = async () => {
        if (!selectedDisc) return;
        setCalculating(true);
        try {
            const res = await fetch('/api/admin/calcular-posiciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    disciplina_id: selectedDisc,
                    genero: selectedGenero,
                    categoria: selectedCategoria,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error ?? 'Error al calcular');
                return;
            }
            toast.success(`${data.message}`);
            if (data.skipped?.length) {
                data.skipped.forEach((s: string) => toast.info(s, { duration: 6000 }));
            }
            fetchExisting(selectedDisc, selectedGenero, selectedCategoria);
        } catch {
            toast.error('Error de red al calcular posiciones');
        } finally {
            setCalculating(false);
        }
    };

    const handleDelete = async (entryId: number) => {
        const { error } = await supabase.from('clasificacion_disciplina').delete().eq('id', entryId);
        if (error) { toast.error('Error: ' + error.message); return; }
        toast.success('Entrada eliminada');
        if (selectedDisc) fetchExisting(selectedDisc, selectedGenero, selectedCategoria);
    };

    return (
        <div className="space-y-6">
            {/* Selectors */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={selectedDisc ?? ''}
                    onChange={e => setSelectedDisc(Number(e.target.value) || null)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                    <option value="">Selecciona disciplina...</option>
                    {disciplinas.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <select
                    value={selectedGenero}
                    onChange={e => setSelectedGenero(e.target.value as typeof selectedGenero)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                    {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {hasCategoria && (
                    <select
                        value={selectedCategoria ?? ''}
                        onChange={e => setSelectedCategoria(e.target.value as Categoria || null)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    >
                        {CATEGORIAS.map(cat => (
                            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                        ))}
                    </select>
                )}
                {selectedDisc && (
                    <span className="px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-widest">
                        {tipoDeporte}
                    </span>
                )}
            </div>

            {selectedDisc && (
                <>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-white/40">
                                Posiciones — {selectedDiscName} {selectedGenero}
                                {selectedCategoria ? ` · ${selectedCategoria}` : ''}
                            </span>
                            {hasBracket && (
                                <button
                                    onClick={handleCalcular}
                                    disabled={calculating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    <Zap size={11} />
                                    {calculating ? 'Calculando...' : 'Calcular desde resultados'}
                                </button>
                            )}
                        </div>
                        <div className="divide-y divide-white/5">
                            {Array.from({ length: maxPositions }, (_, i) => i + 1).map(pos => (
                                <div key={pos} className="flex items-center gap-4 px-4 py-3">
                                    <div className="w-12 text-center">
                                        <span className={cn(
                                            "text-xs font-black",
                                            pos === 1 ? "text-amber-400" : pos === 2 ? "text-slate-300" : pos === 3 ? "text-amber-700" : "text-white/30"
                                        )}>
                                            {pos}°
                                        </span>
                                    </div>
                                    <select
                                        value={positions[pos] ?? ''}
                                        onChange={e => setPositions(prev => ({ ...prev, [pos]: Number(e.target.value) || null }))}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                    >
                                        <option value="">Sin asignar</option>
                                        {carreras.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                    <span className="text-amber-400/70 text-xs font-bold w-12 text-right">
                                        {getPuntos(pos)} pts
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        <Save size={14} />
                        {saving ? 'Guardando...' : 'Guardar Clasificación'}
                    </button>
                </>
            )}

            {/* Existing entries */}
            {existing.length > 0 && (
                <div>
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Entradas guardadas</p>
                    <div className="space-y-2">
                        {existing.map(e => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
                                <span className="text-amber-400 font-black text-sm w-8">{e.posicion}°</span>
                                <span className="text-white/80 text-sm flex-1">{(e.carreras as any)?.nombre ?? `Carrera ${e.carrera_id}`}</span>
                                {e.categoria && (
                                    <span className="text-violet-400/60 text-xs px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/10">
                                        {e.categoria}
                                    </span>
                                )}
                                <span className="text-amber-400/60 text-xs">{e.puntos_obtenidos} pts</span>
                                <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PuntosAdminPage() {
    const { profile, isAdmin } = useAuth();
    const [tab, setTab] = useState<'clasificacion' | 'config'>('clasificacion');

    const tabs = [
        { id: 'clasificacion', label: 'Clasificación', icon: Trophy },
        ...(isAdmin ? [{ id: 'config', label: 'Configurar Puntos', icon: Settings }] : []),
    ] as const;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Trophy size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-xl">Sistema de Puntos</h1>
                        <p className="text-white/30 text-xs">Ingresa las posiciones finales por disciplina</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                tab === t.id
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "text-white/30 hover:text-white/60"
                            )}
                        >
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {tab === 'clasificacion' && <ClasificacionTab />}
                {tab === 'config' && <PuntosConfigTab isAdmin={isAdmin} />}
            </div>
        </div>
    );
}
