"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Trophy, Settings, Save, Trash2, LayoutDashboard, Shield, Plus, Minus, RefreshCw, CheckCircle, AlertTriangle, Database } from "lucide-react";
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

type EnrolledTeam = { equipo_nombre: string; carrera_ids: number[] };

function ClasificacionTab() {
    const { profile } = useAuth();
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [configs, setConfigs] = useState<PuntosConfig[]>([]);
    const [enrolledTeams, setEnrolledTeams] = useState<EnrolledTeam[]>([]);
    const [selectedDisc, setSelectedDisc] = useState<number | null>(null);
    const [selectedGenero, setSelectedGenero] = useState<'todos' | 'masculino' | 'femenino' | 'mixto'>('todos');
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
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

    const fetchData = useCallback(async (discId: number, genero: string, categoria: Categoria | null) => {
        let queryCd = supabase
            .from('carrera_disciplina')
            .select('equipo_nombre, carrera_id')
            .eq('disciplina_id', discId);
        
        if (genero !== 'todos') {
            queryCd = queryCd.eq('genero', genero);
        }
        
        const { data: cdData } = await queryCd;
        (cdData ?? []).forEach((r: any) => {
            if (!teamMap[r.equipo_nombre]) teamMap[r.equipo_nombre] = [];
            teamMap[r.equipo_nombre].push(r.carrera_id);
        });
        const teams: EnrolledTeam[] = Object.entries(teamMap).map(([equipo_nombre, carrera_ids]) => ({ equipo_nombre, carrera_ids }));
        setEnrolledTeams(teams);

        let query = supabase.from('clasificacion_disciplina').select('*, carreras(id, nombre)').eq('disciplina_id', discId).order('posicion');
        if (genero !== 'todos') query = query.eq('genero', genero);
        query = categoria ? query.eq('categoria', categoria) : query.is('categoria', null);

        const { data } = await query;
        if (data) {
            const pos: Record<number, string | null> = {};
            data.forEach((e: any) => {
                if (pos[e.posicion]) return;
                const team = teams.find(t => t.carrera_ids.includes(e.carrera_id));
                pos[e.posicion] = team?.equipo_nombre || e.carreras?.nombre || null;
            });
            setPositions(pos);
        } else setPositions({});
    }, []);

    useEffect(() => { if (selectedDisc) fetchData(selectedDisc, selectedGenero, selectedCategoria); }, [selectedDisc, selectedGenero, selectedCategoria, fetchData]);

    const selectedDiscName = disciplinas.find(d => d.id === selectedDisc)?.name ?? '';
    const tipoDeporte = selectedDiscName ? getTipoDeporte(selectedDiscName) : 'equipo';
    const hasCategoria = DEPORTES_CON_CATEGORIA.includes(selectedDiscName);
    const hasBracket = DEPORTES_CON_BRACKET.includes(selectedDiscName);
    const configForType = configs.filter(c => c.tipo_deporte === tipoDeporte);
    const maxPositions = configForType.length || 8;

    const dropdownOptions = enrolledTeams.length > 0
        ? enrolledTeams.map(t => ({ value: t.equipo_nombre, label: t.equipo_nombre }))
        : carreras.map(c => ({ value: c.nombre, label: c.nombre }));

    const handleSave = async () => {
        if (!selectedDisc || !profile) return;
        setSaving(true);
        try {
            const entries: any[] = [];
            for (const [posStr, eqName] of Object.entries(positions)) {
                if (!eqName) continue;
                const pos = Number(posStr);
                const team = enrolledTeams.find(t => t.equipo_nombre === eqName);
                const ids = team ? team.carrera_ids : [carreras.find(c => c.nombre === eqName)?.id].filter(Boolean);
                ids.forEach(cid => entries.push({
                    disciplina_id: selectedDisc, carrera_id: cid, genero: selectedGenero, categoria: selectedCategoria,
                    posicion: pos, puntos_obtenidos: configForType.find(c => c.posicion === pos)?.puntos ?? 0,
                    created_by: profile.id, updated_at: new Date().toISOString()
                }));
            }
            await supabase.from('clasificacion_disciplina').upsert(entries, { onConflict: 'disciplina_id,carrera_id,genero,categoria' });
            toast.success('Guardado');
            fetchData(selectedDisc, selectedGenero, selectedCategoria);
        } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
                <select value={selectedDisc ?? ''} onChange={e => setSelectedDisc(Number(e.target.value) || null)} className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50">
                    <option value="" className="bg-[#1a1730]">Selecciona disciplina...</option>
                    {disciplinas.map(d => <option key={d.id} value={d.id} className="bg-[#1a1730]">{d.name}</option>)}
                </select>
                <select value={selectedGenero} onChange={e => setSelectedGenero(e.target.value as any)} className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50">
                    <option value="todos" className="bg-[#1a1730]">Todos</option>
                    {GENEROS.map(g => <option key={g} value={g} className="bg-[#1a1730]">{g}</option>)}
                </select>
                {hasCategoria && (
                    <select value={selectedCategoria ?? ''} onChange={e => setSelectedCategoria(e.target.value as any)} className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50">
                        {CATEGORIAS.map(cat => <option key={cat} value={cat} className="bg-[#1a1730]">{cat}</option>)}
                    </select>
                )}
            </div>

            {selectedDisc && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-white/40">Posiciones</span>
                        {hasBracket && (
                            <button onClick={() => {}} className="text-xs text-violet-400 bg-violet-500/10 px-3 py-1 rounded-lg">Calcular desde brackets</button>
                        )}
                    </div>
                    <div className="divide-y divide-white/5">
                        {Array.from({ length: maxPositions }, (_, i) => i + 1).map(pos => (
                            <div key={pos} className="flex items-center gap-4 px-4 py-3">
                                <div className="w-12 text-center">
                                    <span className={cn("text-xs font-black", pos === 1 ? "text-amber-400" : pos === 2 ? "text-slate-300" : pos === 3 ? "text-amber-700" : "text-white/30")}>{pos}°</span>
                                </div>
                                <select value={positions[pos] ?? ''} onChange={e => setPositions(prev => ({ ...prev, [pos]: e.target.value || null }))} className="flex-1 bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50">
                                    <option value="" className="bg-[#1a1730] text-white">Sin asignar</option>
                                    {dropdownOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-[#1a1730]">{opt.label}</option>)}
                                </select>
                                <span className="text-amber-400/70 text-xs font-bold w-12 text-right">{configForType.find(c => c.posicion === pos)?.puntos ?? 0} pts</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleSave} disabled={saving} className="w-full py-4 mt-1 font-black uppercase text-xs tracking-widest text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 transition-colors border-t border-white/5">
                        {saving ? 'Guardando...' : 'Guardar Clasificación'}
                    </button>
                </div>
            )}
        </div>
    );
}

function SyncDataTab({ isAdmin }: { isAdmin: boolean }) {
    const [status, setStatus] = useState<{
        total_finished: number;
        with_arrays: number;
        coverage_pct: number;
        missing: number;
    } | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [lastResult, setLastResult] = useState<any>(null);

    const loadStatus = async () => {
        setLoadingStatus(true);
        try {
            const res = await fetch('/api/admin/sync-carrera-ids');
            const data = await res.json();
            if (res.ok) setStatus(data);
        } catch {
            toast.error('Error al cargar estado');
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => { loadStatus(); }, []);

    const handleSync = async () => {
        if (!window.confirm('¿Ejecutar sincronización de carreras en todos los partidos? Esta operación puede tomar unos segundos.')) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/sync-carrera-ids', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLastResult(data);
            toast.success(`✅ ${data.message}`);
            await loadStatus();
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        } finally {
            setSyncing(false);
        }
    };

    if (!isAdmin) return <div className="text-white/40 text-sm py-8 text-center">Solo admins pueden ejecutar sincronizaciones.</div>;

    return (
        <div className="space-y-5">
            {/* Coverage card */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                    <Database size={14} className="text-cyan-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-cyan-400/80">Estado de Datos — Partidos Finalizados</span>
                </div>
                <div className="p-6">
                    {loadingStatus ? (
                        <div className="text-white/30 text-sm">Analizando datos...</div>
                    ) : status ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                <p className="text-3xl font-black text-white tabular-nums">{status.total_finished}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Total partidos</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                <p className="text-3xl font-black text-emerald-400 tabular-nums">{status.with_arrays}</p>
                                <p className="text-[10px] uppercase tracking-widest text-emerald-400/50 mt-1">Con carreras ID</p>
                            </div>
                            <div className={`p-4 rounded-xl border text-center ${
                                status.missing > 0 ? 'bg-amber-500/5 border-amber-500/10' : 'bg-white/[0.03] border-white/5'
                            }`}>
                                <p className={`text-3xl font-black tabular-nums ${
                                    status.missing > 0 ? 'text-amber-400' : 'text-white/30'
                                }`}>{status.missing}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Sin carreras ID</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                                <p className={`text-3xl font-black tabular-nums ${
                                    status.coverage_pct >= 90 ? 'text-emerald-400' :
                                    status.coverage_pct >= 60 ? 'text-amber-400' : 'text-rose-400'
                                }`}>{status.coverage_pct}%</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">Cobertura</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Diagnosis message */}
            {status && status.missing > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-amber-200 text-xs">
                    <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
                    <div>
                        <p className="font-black mb-1">Se detectaron {status.missing} partidos sin carreras asignadas.</p>
                        <p className="text-amber-200/60">Esto causa que las victorias no se contabilicen correctamente en el medallero y perfil de carreras. Ejecuta la sincronización para corregirlo.</p>
                    </div>
                </div>
            )}
            {status && status.missing === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-200 text-xs">
                    <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                    <p className="font-bold">Todos los partidos finalizados tienen carreras asignadas correctamente. El medallero está siendo calculado con datos completos.</p>
                </div>
            )}

            {/* Last result detail */}
            {lastResult && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-white/40">Resultado de última sincronización</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-white/40">Actualizados</span>
                            <span className="font-black text-white">{lastResult.stats?.updated ?? 0}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-white/40">Desde FK singular</span>
                            <span className="font-black text-white">{lastResult.stats?.pass1_from_singular_fk ?? 0}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-white/40">Desde delegación</span>
                            <span className="font-black text-white">{lastResult.stats?.pass2_from_delegacion ?? 0}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded-lg bg-white/5">
                            <span className="text-white/40">Sin ID aún</span>
                            <span className={`font-black ${ (lastResult.stats?.finished_missing_arrays ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {lastResult.stats?.finished_missing_arrays ?? 0}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync button */}
            <button
                onClick={handleSync}
                disabled={syncing || loadingStatus}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-black text-sm uppercase tracking-widest hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Carreras en Partidos'}
            </button>

            <div className="text-xs text-white/20 px-2">
                Esta operación actualiza el campo <code className="text-white/40 bg-white/5 px-1 rounded">carrera_a_ids</code> / <code className="text-white/40 bg-white/5 px-1 rounded">carrera_b_ids</code> en todos los partidos históricos. Es necesario ejecutarla al menos una vez para que el medallero y las estadísticas de victorias por carrera sean precisos.
            </div>
        </div>
    );
}


function BracketVisibilityToggle() {
    const [hidden, setHidden] = useState<boolean>(false);
    const [updating, setUpdating] = useState(true);

    useEffect(() => {
        supabase.from('site_config').select('value').eq('key', 'hide_team_brackets').maybeSingle()
            .then(({ data }) => { if (data) setHidden(data.value === true); setUpdating(false); });

    }, []);

    const toggle = async () => {
        setUpdating(true);
        const newValue = !hidden;
        const { error } = await supabase.from('site_config').update({ value: newValue, updated_at: new Date().toISOString() }).eq('key', 'hide_team_brackets');
        if (!error) { setHidden(newValue); toast.success(newValue ? 'Brackets ocultos' : 'Brackets visibles'); }
        setUpdating(false);
    };

    if (updating) return <div className="w-8 h-8 rounded-full border border-white/10 border-t-violet-500 animate-spin" />;
    return (
        <button onClick={toggle} className={cn("relative w-12 h-6 rounded-full transition-all duration-300", hidden ? "bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "bg-white/10")}>
            <div className={cn("absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm", hidden ? "translate-x-6" : "translate-x-0")} />
        </button>
    );
}

function FairPlayAdminTab() {
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [selectedDisc, setSelectedDisc] = useState<number | null>(null);
    const [selectedGenero, setSelectedGenero] = useState<'todos' | 'masculino' | 'femenino' | 'mixto'>('todos');
    const [teamData, setTeamData] = useState<any[]>([]);

    useEffect(() => {
        supabase.from('disciplinas').select('id, name').order('name')
            .then(({ data }) => { if (data) setDisciplinas((data as any[]).filter(d => !DEPORTES_INDIVIDUALES.includes(d.name))); });
    }, []);

    const loadData = useCallback(async (discId: number, genero: string) => {
        let query = supabase.from('partidos').select('id, equipo_a, equipo_b, delegacion_a, delegacion_b').eq('disciplina_id', discId);
        if (genero !== 'todos') query = query.eq('genero', genero);
        const { data: pts } = await query;
        const matchIds = (pts ?? []).map((p: any) => p.id);
        if (matchIds.length === 0) { setTeamData([]); return; }
        const scores: Record<string, number> = {};
        (pts ?? []).forEach((p: any) => { [p.delegacion_a || p.equipo_a, p.delegacion_b || p.equipo_b].forEach(t => { if (t && !(t in scores)) scores[t] = 2000; }); });
        setTeamData(Object.keys(scores).map(t => ({ team: t, score: scores[t] })));
    }, []);

    useEffect(() => { if (selectedDisc) loadData(selectedDisc, selectedGenero); }, [selectedDisc, selectedGenero, loadData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
                <select value={selectedDisc ?? ''} onChange={e => setSelectedDisc(Number(e.target.value) || null)} className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                    <option value="" className="bg-[#1a1730]">Selecciona disciplina...</option>
                    {disciplinas.map(d => <option key={d.id} value={d.id} className="bg-[#1a1730]">{d.name}</option>)}
                </select>
                <select value={selectedGenero} onChange={e => setSelectedGenero(e.target.value as any)} className="bg-[#1a1730] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                    <option value="todos" className="bg-[#1a1730]">Todos</option>
                    {GENEROS.map(g => <option key={g} value={g} className="bg-[#1a1730]">{g}</option>)}
                </select>
            </div>
            {selectedDisc && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2"><Shield size={14} className="text-emerald-400" /><span className="text-xs font-black uppercase tracking-widest text-emerald-400/80">Scores actuales</span></div>
                    <div className="divide-y divide-white/5">
                        {teamData.map((row, idx) => (
                            <div key={row.team} className="flex items-center gap-4 px-4 py-3">
                                <span className="text-white/30 text-xs w-5">{idx + 1}</span>
                                <span className="text-white/80 text-sm flex-1">{row.team}</span>
                                <span className="text-sm font-black tabular-nums text-emerald-400">{row.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PuntosAdminPage() {
    const { isAdmin } = useAuth();
    const [tab, setTab] = useState<'clasificacion' | 'sync' | 'config' | 'general' | 'fairplay'>('clasificacion');
    const tabs = [
        { id: 'clasificacion', label: 'Clasificación', icon: Trophy },
        ...(isAdmin ? [
            { id: 'sync', label: 'Integridad de Datos', icon: Database },
            { id: 'config', label: 'Configurar Puntos', icon: Settings },
            { id: 'general', label: 'Ajustes Generales', icon: LayoutDashboard },
            { id: 'fairplay', label: 'Fair Play', icon: Shield },
        ] : []),
    ] as const;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center"><Trophy size={18} className="text-amber-400" /></div>
                    <div><h1 className="text-white font-black text-xl">Sistema de Puntos</h1><p className="text-white/30 text-xs">Administra las posiciones y ajustes globales</p></div>
                </div>
                <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all", tab === t.id ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-white/30 hover:text-white/60")}>
                            <t.icon size={14} />{t.label}
                        </button>
                    ))}
                </div>
                {tab === 'clasificacion' && <ClasificacionTab />}
                {tab === 'sync' && <SyncDataTab isAdmin={isAdmin} />}
                {tab === 'config' && <PuntosConfigTab isAdmin={isAdmin} />}
                {tab === 'general' && (
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
                )}
                {tab === 'fairplay' && <FairPlayAdminTab />}
            </div>
        </div>
    );
}
