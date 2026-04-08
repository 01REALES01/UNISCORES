"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Trophy, Settings, Save, Trash2, Zap, LayoutDashboard, Shield, Plus, Minus } from "lucide-react";
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
// Team entry: equipo_nombre (as seen in carrera_disciplina) → one or more carrera_ids
type EnrolledTeam = { equipo_nombre: string; carrera_ids: number[] };

function ClasificacionTab() {
    const { profile } = useAuth();
    const { logAction } = useAuditLogger();

    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [configs, setConfigs] = useState<PuntosConfig[]>([]);
    const [existing, setExisting] = useState<ClasificacionDisciplina[]>([]);
    // Enrolled teams for the selected disciplina+genero (from carrera_disciplina table)
    const [enrolledTeams, setEnrolledTeams] = useState<EnrolledTeam[]>([]);

    const [selectedDisc, setSelectedDisc] = useState<number | null>(null);
    const [selectedGenero, setSelectedGenero] = useState<'masculino' | 'femenino' | 'mixto'>('masculino');
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
    // positions: posicion → equipo_nombre (e.g. "DCPRI", "MEDICINA")
    const [positions, setPositions] = useState<Record<number, string | null>>({});
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

    /** Load enrolled teams + existing positions together so reverse-mapping works */
    const fetchData = useCallback(async (discId: number, genero: string, categoria: Categoria | null) => {
        // 1. Load enrolled teams for this disciplina+genero
        const { data: cdData } = await supabase
            .from('carrera_disciplina')
            .select('equipo_nombre, carrera_id')
            .eq('disciplina_id', discId)
            .eq('genero', genero);

        const teamMap: Record<string, number[]> = {};
        (cdData ?? []).forEach((r: any) => {
            if (!teamMap[r.equipo_nombre]) teamMap[r.equipo_nombre] = [];
            teamMap[r.equipo_nombre].push(r.carrera_id);
        });
        const teams: EnrolledTeam[] = Object.entries(teamMap).map(([equipo_nombre, carrera_ids]) => ({ equipo_nombre, carrera_ids }));
        setEnrolledTeams(teams);

        // 2. Load existing clasificacion entries
        let query = supabase
            .from('clasificacion_disciplina')
            .select('*, disciplinas(id, name), carreras(id, nombre, escudo_url)')
            .eq('disciplina_id', discId)
            .eq('genero', genero)
            .order('posicion');
        query = categoria ? query.eq('categoria', categoria) : query.is('categoria', null);

        const { data } = await query;
        if (data) {
            setExisting(data);
            // Deduplicate by position: for each carrera_id, reverse-map to equipo_nombre
            const pos: Record<number, string | null> = {};
            data.forEach((e: ClasificacionDisciplina) => {
                if (pos[e.posicion]) return; // already set (first carrera of same combined team)
                const team = teams.find(t => t.carrera_ids.includes(e.carrera_id));
                pos[e.posicion] = team?.equipo_nombre ?? (e.carreras as any)?.nombre ?? null;
            });
            setPositions(pos);
        } else {
            setExisting([]);
            setPositions({});
        }
    }, []);

    useEffect(() => {
        if (selectedDisc) fetchData(selectedDisc, selectedGenero, selectedCategoria);
    }, [selectedDisc, selectedGenero, selectedCategoria, fetchData]);

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

    // Dropdown options: use enrolled teams when available, fallback to all carreras
    const dropdownOptions: { value: string; label: string }[] =
        enrolledTeams.length > 0
            ? enrolledTeams.map(t => ({
                value: t.equipo_nombre,
                label: t.equipo_nombre + (t.carrera_ids.length > 1 ? ` · ${t.carrera_ids.length} carreras` : ''),
            }))
            : carreras.map(c => ({ value: c.nombre, label: c.nombre }));

    const handleSave = async () => {
        if (!selectedDisc || !profile) return;
        setSaving(true);
        try {
            const entries: any[] = [];

            for (const [posicionStr, equipoNombre] of Object.entries(positions)) {
                if (!equipoNombre) continue;
                const posicion = Number(posicionStr);
                const team = enrolledTeams.find(t => t.equipo_nombre === equipoNombre);

                if (team && team.carrera_ids.length > 0) {
                    // Expand combined team → one entry per carrera (all get full points)
                    for (const carreraId of team.carrera_ids) {
                        entries.push({
                            disciplina_id: selectedDisc,
                            carrera_id: carreraId,
                            genero: selectedGenero,
                            categoria: selectedCategoria,
                            posicion,
                            puntos_obtenidos: getPuntos(posicion),
                            created_by: profile.id,
                            updated_at: new Date().toISOString(),
                        });
                    }
                } else {
                    // Fallback: find carrera by nombre from the full list
                    const found = carreras.find(c => c.nombre === equipoNombre);
                    if (found) {
                        entries.push({
                            disciplina_id: selectedDisc,
                            carrera_id: found.id,
                            genero: selectedGenero,
                            categoria: selectedCategoria,
                            posicion,
                            puntos_obtenidos: getPuntos(posicion),
                            created_by: profile.id,
                            updated_at: new Date().toISOString(),
                        });
                    }
                }
            }

            if (entries.length === 0) { toast.info('Nada que guardar'); return; }

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

            toast.success(`Clasificación guardada (${entries.length} entradas)`);
            fetchData(selectedDisc, selectedGenero, selectedCategoria);
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
            fetchData(selectedDisc, selectedGenero, selectedCategoria);
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
        if (selectedDisc) fetchData(selectedDisc, selectedGenero, selectedCategoria);
    };

    return (
        <div className="space-y-6">
            {/* Selectors */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={selectedDisc ?? ''}
                    onChange={e => setSelectedDisc(Number(e.target.value) || null)}
                    className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                    <option value="" className="bg-[#1a1730] text-white">Selecciona disciplina...</option>
                    {disciplinas.map(d => (
                        <option key={d.id} value={d.id} className="bg-[#1a1730] text-white">{d.name}</option>
                    ))}
                </select>
                <select
                    value={selectedGenero}
                    onChange={e => setSelectedGenero(e.target.value as typeof selectedGenero)}
                    className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                    {GENEROS.map(g => <option key={g} value={g} className="bg-[#1a1730] text-white">{g}</option>)}
                </select>
                {hasCategoria && (
                    <select
                        value={selectedCategoria ?? ''}
                        onChange={e => setSelectedCategoria(e.target.value as Categoria || null)}
                        className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                    >
                        {CATEGORIAS.map(cat => (
                            <option key={cat} value={cat} className="bg-[#1a1730] text-white">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
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
                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-widest text-white/40">
                                    Posiciones — {selectedDiscName} {selectedGenero}
                                    {selectedCategoria ? ` · ${selectedCategoria}` : ''}
                                </span>
                                {enrolledTeams.length > 0 ? (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                        {enrolledTeams.length} equipos inscritos
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/30 text-[10px] font-bold">
                                        sin datos de inscripción
                                    </span>
                                )}
                            </div>
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
                                        onChange={e => setPositions(prev => ({ ...prev, [pos]: e.target.value || null }))}
                                        className="flex-1 bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                                    >
                                        <option value="" className="bg-[#1a1730] text-white">Sin asignar</option>
                                        {dropdownOptions.map(opt => (
                                            <option key={opt.value} value={opt.value} className="bg-[#1a1730] text-white">{opt.label}</option>
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

            {/* Existing entries — grouped by equipo when combined teams are present */}
            {existing.length > 0 && (
                <div>
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Entradas guardadas</p>
                    <div className="space-y-2">
                        {existing.map(e => {
                            const team = enrolledTeams.find(t => t.carrera_ids.includes(e.carrera_id));
                            const isCombined = team && team.carrera_ids.length > 1;
                            const displayName = (e.carreras as any)?.nombre ?? `Carrera ${e.carrera_id}`;
                            return (
                                <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02]">
                                    <span className="text-amber-400 font-black text-sm w-8">{e.posicion}°</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white/80 text-sm">{displayName}</span>
                                        {isCombined && (
                                            <span className="ml-2 text-[10px] text-violet-400/60 font-bold">
                                                {team.equipo_nombre}
                                            </span>
                                        )}
                                    </div>
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
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Configuración General
// ─────────────────────────────────────────────────────────────────────────────
function ConfigGeneralTab() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-violet-400">Visibilidad de Brackets</span>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="flex-1">
                            <p className="text-sm font-bold text-white mb-1">Ocultar Brackets en Deportes de Equipo</p>
                            <p className="text-xs text-white/30 italic">Aplica para Fútbol, Voleibol y Baloncesto. Tenis siempre es visible.</p>
                        </div>
                        <BracketVisibilityToggle />
                    </div>
                </div>
            </div>
        </div>
    );
}

function BracketVisibilityToggle() {
    const [hidden, setHidden] = useState<boolean>(false);
    const [updating, setUpdating] = useState(true);

    useEffect(() => {
        supabase.from('site_config').select('value').eq('key', 'hide_team_brackets').maybeSingle()
            .then(({ data, error }) => {
                if (error) console.error('site_config fetch error:', error);
                if (data) setHidden(data.value === true);
                setUpdating(false);
            });
    }, []);

    const toggle = async () => {
        setUpdating(true);
        const newValue = !hidden;
        const { error } = await supabase
            .from('site_config')
            .update({ value: newValue, updated_at: new Date().toISOString() })
            .eq('key', 'hide_team_brackets');
        if (error) {
            toast.error('Error al actualizar configuración');
        } else {
            setHidden(newValue);
            toast.success(newValue ? 'Brackets ahora están ocultos' : 'Brackets ahora son visibles');
        }
        setUpdating(false);
    };

    if (updating) return <div className="w-8 h-8 rounded-full border border-white/10 border-t-violet-500 animate-spin" />;

    return (
        <button
            onClick={toggle}
            className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-300",
                hidden ? "bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "bg-white/10"
            )}
        >
            <div className={cn(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm",
                hidden ? "translate-x-6" : "translate-x-0"
            )} />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4: Fair Play admin adjustments
// ─────────────────────────────────────────────────────────────────────────────
interface FairPlayEntry { id: number; equipo: string; descripcion: string; partido_id: number }
interface TeamFP { team: string; score: number; amarillas: number; rojas: number; otros: number }

function FairPlayAdminTab() {
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [selectedDisc, setSelectedDisc] = useState<number | null>(null);
    const [selectedGenero, setSelectedGenero] = useState<'masculino' | 'femenino' | 'mixto'>('masculino');
    const [teamData, setTeamData] = useState<TeamFP[]>([]);
    const [ajustes, setAjustes] = useState<FairPlayEntry[]>([]);
    const [partidos, setPartidos] = useState<{ id: number; equipo_a: string; equipo_b: string }[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [form, setForm] = useState<{ team: string; valor: number; partido_id: number | '' } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.from('disciplinas').select('id, name').order('name')
            .then(({ data }) => {
                if (data) setDisciplinas((data as Disciplina[]).filter(d => !DEPORTES_INDIVIDUALES.includes(d.name)));
            });
    }, []);

    const loadData = useCallback(async (discId: number, genero: string) => {
        setLoadingData(true);
        const { data: pts } = await supabase
            .from('partidos')
            .select('id, equipo_a, equipo_b, delegacion_a, delegacion_b')
            .eq('disciplina_id', discId)
            .eq('genero', genero);

        setPartidos((pts ?? []) as any);
        const matchIds = (pts ?? []).map((p: any) => p.id);
        if (matchIds.length === 0) { setTeamData([]); setAjustes([]); setLoadingData(false); return; }

        const scores: Record<string, number> = {};
        const amarillas: Record<string, number> = {};
        const rojas: Record<string, number> = {};
        const otros: Record<string, number> = {};
        (pts ?? []).forEach((p: any) => {
            [p.delegacion_a || p.equipo_a, p.delegacion_b || p.equipo_b].forEach((t: string) => {
                if (t && !(t in scores)) { scores[t] = 2000; amarillas[t] = 0; rojas[t] = 0; otros[t] = 0; }
            });
        });

        const { data: eventos } = await supabase
            .from('olympics_eventos')
            .select('id, tipo_evento, equipo, descripcion, partido_id')
            .in('partido_id', matchIds)
            .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento', 'ajuste_fair_play']);

        const adjList: FairPlayEntry[] = [];
        (eventos ?? []).forEach((e: any) => {
            const t = e.equipo;
            if (!t) return;
            if (!(t in scores)) { scores[t] = 2000; amarillas[t] = 0; rojas[t] = 0; otros[t] = 0; }
            if (e.tipo_evento === 'tarjeta_amarilla') { scores[t] -= 50; amarillas[t]++; }
            else if (e.tipo_evento === 'tarjeta_roja') { scores[t] -= 100; rojas[t]++; }
            else if (e.tipo_evento === 'expulsion_delegado') { scores[t] -= 100; otros[t]++; }
            else if (e.tipo_evento === 'mal_comportamiento') { scores[t] -= 100; otros[t]++; }
            else if (e.tipo_evento === 'ajuste_fair_play') {
                scores[t] += Number(e.descripcion ?? 0);
                adjList.push({ id: e.id, equipo: t, descripcion: e.descripcion, partido_id: e.partido_id });
            }
        });

        setTeamData(Object.keys(scores).map(t => ({ team: t, score: scores[t], amarillas: amarillas[t], rojas: rojas[t], otros: otros[t] })).sort((a, b) => b.score - a.score));
        setAjustes(adjList);
        setLoadingData(false);
    }, []);

    useEffect(() => {
        if (selectedDisc) loadData(selectedDisc, selectedGenero);
    }, [selectedDisc, selectedGenero, loadData]);

    const handleSave = async () => {
        if (!form || !form.team || form.valor === 0 || form.partido_id === '') return;
        setSaving(true);
        const res = await fetch('/api/admin/fair-play-adjustment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partido_id: form.partido_id, equipo: form.team, valor: form.valor }),
        });
        if (res.ok) {
            toast.success('Ajuste guardado');
            setForm(null);
            if (selectedDisc) loadData(selectedDisc, selectedGenero);
        } else {
            const err = await res.json();
            toast.error(err.error ?? 'Error al guardar');
        }
        setSaving(false);
    };

    const handleDelete = async (eventoId: number) => {
        const res = await fetch('/api/admin/fair-play-adjustment', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evento_id: eventoId }),
        });
        if (res.ok) {
            toast.success('Ajuste eliminado');
            if (selectedDisc) loadData(selectedDisc, selectedGenero);
        } else {
            toast.error('Error al eliminar');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
                <select value={selectedDisc ?? ''} onChange={e => setSelectedDisc(Number(e.target.value) || null)}
                    className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                    <option value="" className="bg-[#1a1730] text-white">Selecciona disciplina...</option>
                    {disciplinas.map(d => <option key={d.id} value={d.id} className="bg-[#1a1730] text-white">{d.name}</option>)}
                </select>
                <select value={selectedGenero} onChange={e => setSelectedGenero(e.target.value as any)}
                    className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                    {GENEROS.map(g => <option key={g} value={g} className="bg-[#1a1730] text-white">{g}</option>)}
                </select>
            </div>

            {selectedDisc && (
                <>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                            <Shield size={14} className="text-emerald-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400/80">Scores actuales</span>
                        </div>
                        {loadingData ? (
                            <div className="py-6 text-center text-white/30 text-xs animate-pulse">Cargando...</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {teamData.map((row, idx) => (
                                    <div key={row.team} className="flex items-center gap-4 px-4 py-3">
                                        <span className="text-white/30 text-xs w-5">{idx + 1}</span>
                                        <span className="text-white/80 text-sm flex-1">{row.team}</span>
                                        <span className={cn("text-sm font-black tabular-nums", row.score === 2000 ? "text-emerald-400" : row.score >= 1900 ? "text-white/60" : "text-rose-400")}>
                                            {row.score}
                                        </span>
                                        <button
                                            onClick={() => setForm({ team: row.team, valor: -50, partido_id: partidos[0]?.id ?? '' })}
                                            className="text-xs text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={10} /> Ajuste
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {form && (
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                            <p className="text-xs font-black uppercase text-violet-400 tracking-widest">Nuevo ajuste — {form.team}</p>
                            <div className="flex flex-wrap gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-white/40 font-bold uppercase">Valor (neg = penalización)</label>
                                    <input
                                        type="number"
                                        value={form.valor}
                                        onChange={e => setForm(f => f ? { ...f, valor: Number(e.target.value) } : f)}
                                        className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-white/40 font-bold uppercase">Partido</label>
                                    <select
                                        value={form.partido_id}
                                        onChange={e => setForm(f => f ? { ...f, partido_id: Number(e.target.value) } : f)}
                                        className="bg-[#1a1730] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500/50"
                                    >
                                        <option value="" className="bg-[#1a1730] text-white">Selecciona partido...</option>
                                        {partidos.map(p => (
                                            <option key={p.id} value={p.id} className="bg-[#1a1730] text-white">{p.equipo_a} vs {p.equipo_b}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} disabled={saving || form.partido_id === ''} className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/30 transition-colors disabled:opacity-40">
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:bg-white/10 transition-colors">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {ajustes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-white/30 uppercase font-black">Ajustes manuales guardados</p>
                            {ajustes.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center gap-3">
                                        {Number(a.descripcion) < 0
                                            ? <Minus size={12} className="text-rose-400" />
                                            : <Plus size={12} className="text-emerald-400" />
                                        }
                                        <span className="text-white/60 text-sm">{a.equipo}</span>
                                        <span className={cn("text-sm font-black tabular-nums", Number(a.descripcion) < 0 ? "text-rose-400" : "text-emerald-400")}>
                                            {Number(a.descripcion) > 0 ? '+' : ''}{a.descripcion}
                                        </span>
                                    </div>
                                    <button onClick={() => handleDelete(a.id)} className="text-white/20 hover:text-rose-400 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PuntosAdminPage() {
    const { isAdmin } = useAuth();
    const [tab, setTab] = useState<'clasificacion' | 'config' | 'general' | 'fairplay'>('clasificacion');

    const tabs = [
        { id: 'clasificacion', label: 'Clasificación', icon: Trophy },
        ...(isAdmin ? [
            { id: 'config', label: 'Configurar Puntos', icon: Settings },
            { id: 'general', label: 'Ajustes Generales', icon: LayoutDashboard },
            { id: 'fairplay', label: 'Fair Play', icon: Shield },
        ] : []),
    ] as const;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Trophy size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-xl">Sistema de Puntos</h1>
                        <p className="text-white/30 text-xs">Administra las posiciones y ajustes globales</p>
                    </div>
                </div>

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

                {tab === 'clasificacion' && <ClasificacionTab />}
                {tab === 'config' && <PuntosConfigTab isAdmin={isAdmin} />}
                {tab === 'general' && <ConfigGeneralTab />}
                {tab === 'fairplay' && <FairPlayAdminTab />}
            </div>
        </div>
    );
}
