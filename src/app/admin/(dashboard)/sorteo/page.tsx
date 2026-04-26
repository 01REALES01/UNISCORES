"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";
import { SORTEO_SPORTS } from "@/lib/bracket-config";
import {
    Shuffle, Check, Circle, AlertTriangle, Loader2, Trophy,
    ChevronDown, RotateCcw, Zap, Users, ArrowRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type SlotInfo = {
    label: string;
    grupo: string;
    assigned_delegacion: string | null;
    assigned_delegacion_id: number | null;
};

type DelegacionInfo = {
    id: number;
    nombre: string;
    carrera_ids: number[];
    slot_label: string | null;
};

type SorteoData = {
    slots: SlotInfo[];
    delegaciones: DelegacionInfo[];
    group_matches_total: number;
    group_matches_finished: number;
    group_complete: boolean;
    eliminatory_pending: number;
};

type QualifiedTeam = {
    team: string;
    points: number;
    won: number;
    lost: number;
    drawn: number;
    diff: number;
    grupo?: string;
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SorteoPage() {
    const { isPeriodista } = useAuth();
    const router = useRouter();

    // Redirect periodistas
    useEffect(() => {
        if (isPeriodista) router.push('/admin/noticias');
    }, [isPeriodista, router]);

    const [disciplinas, setDisciplinas] = useState<{ id: number; name: string }[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>(SORTEO_SPORTS[0]);
    const [selectedGender, setSelectedGender] = useState<string>('masculino');
    const [data, setData] = useState<SorteoData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resettingPlaceholders, setResettingPlaceholders] = useState(false);
    const [forcingAdvance, setForcingAdvance] = useState(false);
    const [forceAdvanceFase, setForceAdvanceFase] = useState<string>('cuartos');
    const [forceAdvanceResult, setForceAdvanceResult] = useState<{ next_fase: string } | null>(null);

    // Local assignment state: slot_label → delegacion_id
    const [assignments, setAssignments] = useState<Record<string, number>>({});

    // Fetch disciplinas on mount
    useEffect(() => {
        supabase.from('disciplinas').select('id, name').then(({ data }) => {
            if (data) setDisciplinas(data);
        });
    }, []);

    const disciplinaId = useMemo(() => {
        return disciplinas.find(d => d.name === selectedSport)?.id;
    }, [disciplinas, selectedSport]);

    // Fetch sorteo data when sport/gender changes
    const fetchData = useCallback(async () => {
        if (!disciplinaId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/sorteo?disciplina_id=${disciplinaId}&genero=${selectedGender}`
            );
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || 'Error al cargar datos');
                setData(null);
                return;
            }
            setData(json as SorteoData);

            // Initialize local assignments from existing data
            const existing: Record<string, number> = {};
            for (const slot of json.slots) {
                if (slot.assigned_delegacion_id) {
                    existing[slot.label] = slot.assigned_delegacion_id;
                }
            }
            setAssignments(existing);
        } catch {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    }, [disciplinaId, selectedGender]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Group slots by grupo
    const slotsByGroup = useMemo(() => {
        if (!data) return {};
        const map: Record<string, SlotInfo[]> = {};
        for (const slot of data.slots) {
            if (!map[slot.grupo]) map[slot.grupo] = [];
            map[slot.grupo].push(slot);
        }
        return map;
    }, [data]);

    const groups = useMemo(() => Object.keys(slotsByGroup).sort(), [slotsByGroup]);

    // Which delegaciones are already used in current assignments
    const usedDelegacionIds = useMemo(() => new Set(Object.values(assignments)), [assignments]);

    // All slots assigned?
    const allAssigned = useMemo(() => {
        if (!data) return false;
        return data.slots.length > 0 && data.slots.every(s => assignments[s.label]);
    }, [data, assignments]);

    // Has changes vs server state?
    const hasChanges = useMemo(() => {
        if (!data) return false;
        for (const slot of data.slots) {
            const current = assignments[slot.label];
            const server = slot.assigned_delegacion_id;
            if ((current || null) !== (server || null)) return true;
        }
        return false;
    }, [data, assignments]);

    // ── Handlers ────────────────────────────────────────────────────────────

    function handleAssign(slotLabel: string, delegacionId: number | null) {
        setAssignments(prev => {
            const next = { ...prev };
            if (delegacionId === null) {
                delete next[slotLabel];
            } else {
                next[slotLabel] = delegacionId;
            }
            return next;
        });
    }

    async function handleSave() {
        if (!disciplinaId || !data) return;
        setSaving(true);
        try {
            const assignmentList = Object.entries(assignments).map(([slot, delegacion_id]) => ({
                slot,
                delegacion_id,
            }));

            const res = await fetch('/api/admin/sorteo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    disciplina_id: disciplinaId,
                    genero: selectedGender,
                    assignments: assignmentList,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || 'Error al guardar');
                return;
            }

            toast.success(`Sorteo guardado: ${json.assigned} asignaciones, ${json.matches_updated} partidos actualizados`);
            fetchData(); // Refresh
        } catch {
            toast.error('Error de conexión');
        } finally {
            setSaving(false);
        }
    }

    async function handleReset() {
        if (!disciplinaId || !data) return;
        
        // Confirmation before proceeding
        if (!window.confirm("¿Estás 100% seguro de que quieres deshacer el sorteo? Esto regresará todos los partidos de la fase de grupos a su estado original (Ej: '1A', '2B') y quitará todos los equipos asignados.")) {
            return;
        }

        setResetting(true);
        try {
            const res = await fetch('/api/admin/sorteo/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    disciplina_id: disciplinaId,
                    genero: selectedGender,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || 'Error al deshacer sorteo');
                return;
            }

            toast.success(`Sorteo deshecho. ${json.matches_reset} partidos restaurados.`);
            setAssignments({}); // Clear local assignments
            fetchData(); // Refresh data
        } catch {
            toast.error('Error de conexión');
        } finally {
            setResetting(false);
        }
    }

    async function handleResetPlaceholders() {
        if (!disciplinaId) return;
        if (!window.confirm('¿Restaurar los placeholders del bracket (ej. "1ro. GRUPO A")? Esto permite volver a correr el resolver.')) return;

        setResettingPlaceholders(true);
        try {
            const res = await fetch('/api/admin/sorteo/resolver/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disciplina_id: disciplinaId, genero: selectedGender }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || 'Error al restaurar placeholders');
                return;
            }
            toast.success(`Placeholders restaurados en ${json.reset_matches.length} partido(s). Ya puedes correr el resolver.`);
            setResolveResult(null);
            fetchData();
        } catch {
            toast.error('Error de conexión');
        } finally {
            setResettingPlaceholders(false);
        }
    }

    async function handleResolve() {
        if (!disciplinaId) return;
        setResolving(true);
        try {
            const res = await fetch('/api/admin/sorteo/resolver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    disciplina_id: disciplinaId,
                    genero: selectedGender,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                toast.error(json.error || 'Error al resolver bracket');
                return;
            }

            toast.success(`Bracket resuelto: ${json.resolved_matches.length} partidos asignados`);
            setResolveResult(json);
            fetchData();
        } catch {
            toast.error('Error de conexión');
        } finally {
            setResolving(false);
        }
    }

    const [resolveResult, setResolveResult] = useState<{
        qualified_teams: QualifiedTeam[];
        resolved_matches: { match_id: number; team_a: string; team_b: string }[];
    } | null>(null);

    async function handleForceAdvance() {
        if (!disciplinaId) return;
        if (!window.confirm(`¿Forzar avance desde "${forceAdvanceFase}"? Esto leerá los ganadores de los partidos finalizados en esa fase y los asignará a la siguiente ronda.`)) return;

        setForcingAdvance(true);
        setForceAdvanceResult(null);
        try {
            const res = await fetch('/api/admin/auto-advance/force', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disciplina_id: disciplinaId, genero: selectedGender, fase: forceAdvanceFase }),
            });
            const json = await res.json();
            console.log('[force-advance] response:', JSON.stringify(json, null, 2));
            if (!res.ok) {
                toast.error(json.error || json.message || 'Error al forzar avance');
                return;
            }
            toast.success(`✅ ${json.message}`);
            setForceAdvanceResult(json);
            fetchData();
        } catch {
            toast.error('Error de conexión');
        } finally {
            setForcingAdvance(false);
        }
    }

    // Reset resolve result when sport/gender changes
    useEffect(() => {
        setResolveResult(null);
        setForceAdvanceResult(null);
    }, [selectedSport, selectedGender]);

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
                        <Shuffle className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Sorteo & Brackets</h1>
                        <p className="text-sm text-white/40">Asignar equipos a los slots del fixture y resolver brackets</p>
                    </div>
                </div>
            </div>

            {/* Sport + Gender Selector */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                    {SORTEO_SPORTS.map(sport => (
                        <button
                            key={sport}
                            onClick={() => { setSelectedSport(sport); setResolveResult(null); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
                                selectedSport === sport
                                    ? "bg-white/10 border-white/20 text-white shadow-lg"
                                    : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white/80"
                            )}
                        >
                            <span>{SPORT_EMOJI[sport]}</span>
                            <span>{sport}</span>
                        </button>
                    ))}
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex gap-2">
                    {[
                        { label: 'Masculino', value: 'masculino', icon: '♂', active: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                        { label: 'Femenino', value: 'femenino', icon: '♀', active: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
                    ].map(g => (
                        <button
                            key={g.value}
                            onClick={() => { setSelectedGender(g.value); setResolveResult(null); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                                selectedGender === g.value
                                    ? g.active
                                    : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5"
                            )}
                        >
                            <span className="text-sm">{g.icon}</span>
                            <span>{g.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                </div>
            )}

            {/* No data */}
            {!loading && data && data.slots.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users size={48} className="text-white/10 mb-4" />
                    <h3 className="text-lg font-bold text-white/30 mb-2">Sin fixture cargado</h3>
                    <p className="text-white/20 text-sm max-w-md">
                        No hay partidos de grupo para {SPORT_EMOJI[selectedSport]} {selectedSport} ({selectedGender}).
                        Importa el calendario desde la pestaña Fixture.
                    </p>
                </div>
            )}

            {/* Main content */}
            {!loading && data && data.slots.length > 0 && (
                <>
                    {/* ── Section 1: Slot Assignment Grid ── */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Shuffle size={16} className="text-amber-400" />
                                <h2 className="text-lg font-black uppercase tracking-wider text-white/80">
                                    Sorteo de Grupos
                                </h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-3" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <span className="flex items-center gap-1">
                                    <Check size={12} className="text-emerald-400" />
                                    {Object.keys(assignments).length}/{data.slots.length}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(grupo => (
                                <div key={grupo} className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                                    {/* Group Header */}
                                    <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-white/60">
                                            Grupo {grupo}
                                        </h3>
                                    </div>

                                    {/* Slot Rows */}
                                    <div className="divide-y divide-white/5">
                                        {(slotsByGroup[grupo] || []).map(slot => {
                                            const assignedId = assignments[slot.label];
                                            const isAssigned = !!assignedId;
                                            const assignedDel = data.delegaciones.find(d => d.id === assignedId);

                                            return (
                                                <div key={slot.label} className="flex items-center gap-3 px-4 py-3">
                                                    {/* Status indicator */}
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black",
                                                        isAssigned
                                                            ? "bg-emerald-500/20 text-emerald-400"
                                                            : "bg-white/5 text-white/30"
                                                    )}>
                                                        {isAssigned ? <Check size={14} /> : <Circle size={14} />}
                                                    </div>

                                                    {/* Slot label */}
                                                    <span className="text-xs font-mono font-bold text-white/40 w-8 flex-shrink-0">
                                                        {slot.label}
                                                    </span>

                                                    {/* Arrow */}
                                                    <ArrowRight size={12} className="text-white/20 flex-shrink-0" />

                                                    {/* Delegacion Dropdown */}
                                                    <div className="flex-1 relative">
                                                        <select
                                                            value={assignedId ?? ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                handleAssign(slot.label, val ? parseInt(val) : null);
                                                            }}
                                                            className={cn(
                                                                "w-full appearance-none border rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer pr-8",
                                                                "bg-[#1a1510] text-white",
                                                                "focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30",
                                                                isAssigned
                                                                    ? "border-emerald-500/20"
                                                                    : "border-white/10"
                                                            )}
                                                        >
                                                            <option value="" className="bg-[#1a1510] text-white/40">Seleccionar equipo...</option>
                                                            {data.delegaciones.map(d => (
                                                                <option
                                                                    key={d.id}
                                                                    value={d.id}
                                                                    className={cn(
                                                                        "bg-[#1a1510]",
                                                                        usedDelegacionIds.has(d.id) && assignments[slot.label] !== d.id
                                                                            ? "text-white/30"
                                                                            : "text-white"
                                                                    )}
                                                                    disabled={usedDelegacionIds.has(d.id) && assignments[slot.label] !== d.id}
                                                                >
                                                                    {d.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center gap-4 mt-6">
                            <button
                                onClick={handleSave}
                                disabled={saving || Object.keys(assignments).length === 0}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                    Object.keys(assignments).length > 0
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
                                        : "bg-white/5 text-white/30 cursor-not-allowed"
                                )}
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Shuffle size={16} />
                                )}
                                {saving ? 'Guardando...' : 'Guardar Sorteo'}
                            </button>

                            <button
                                onClick={handleReset}
                                disabled={saving || resetting || Object.keys(assignments).length === 0}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all border",
                                    Object.keys(assignments).length > 0
                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20"
                                        : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                                )}
                            >
                                {resetting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RotateCcw size={16} />
                                )}
                                Deshacer Sorteo
                            </button>

                            {hasChanges && (
                                <span className="text-xs text-amber-400/60 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Hay cambios sin guardar
                                </span>
                            )}

                            {!allAssigned && Object.keys(assignments).length > 0 && (
                                <span className="text-xs text-white/30">
                                    {Object.keys(assignments).length} de {data.slots.length} slots asignados
                                </span>
                            )}
                        </div>
                    </section>

                    {/* ── Section 2: Bracket Resolution ── */}
                    <section className="border-t border-white/5 pt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Trophy size={16} className="text-amber-400" />
                            <h2 className="text-lg font-black uppercase tracking-wider text-white/80">
                                Resolución de Bracket
                            </h2>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-3" />
                        </div>

                        {/* Group Progress */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-white/60">Progreso Fase de Grupos</span>
                                <span className="text-sm font-mono font-bold text-white/80">
                                    {data.group_matches_finished}/{data.group_matches_total}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        data.group_complete
                                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            : "bg-gradient-to-r from-amber-500 to-orange-500"
                                    )}
                                    style={{
                                        width: data.group_matches_total > 0
                                            ? `${(data.group_matches_finished / data.group_matches_total) * 100}%`
                                            : '0%',
                                    }}
                                />
                            </div>
                            {data.group_complete ? (
                                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                    <Check size={12} /> Todos los partidos de grupo finalizados
                                </p>
                            ) : (
                                <p className="text-xs text-white/30 mt-2">
                                    Faltan {data.group_matches_total - data.group_matches_finished} partido(s) por finalizar
                                </p>
                            )}
                        </div>

                        {/* Resolve + Reset Placeholder Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleResolve}
                                disabled={resolving || !data.group_complete}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                    data.group_complete
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                                        : "bg-white/5 text-white/30 cursor-not-allowed"
                                )}
                            >
                                {resolving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap size={16} />
                                )}
                                {resolving ? 'Resolviendo...' : 'Resolver Bracket Automáticamente'}
                            </button>

                            <button
                                onClick={handleResetPlaceholders}
                                disabled={resettingPlaceholders || resolving}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {resettingPlaceholders ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RotateCcw size={16} />
                                )}
                                {resettingPlaceholders ? 'Restaurando...' : 'Restaurar Placeholders'}
                            </button>
                        </div>

                        {!data.group_complete && (
                            <p className="text-xs text-white/20 mt-2">
                                El bracket se puede resolver cuando todos los partidos de grupo estén finalizados.
                            </p>
                        )}

                        {/* Resolution Result */}
                        {resolveResult && (
                            <div className="mt-6 space-y-4">
                                {/* Qualified Teams Table */}
                                <div className="bg-white/[0.03] border border-emerald-500/20 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/5 bg-emerald-500/5">
                                        <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                                            Tabla Unificada de Clasificados
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-white/5 text-white/40 uppercase tracking-wider">
                                                    <th className="text-left py-2.5 px-4 font-bold">#</th>
                                                    <th className="text-left py-2.5 px-4 font-bold">Equipo</th>
                                                    <th className="text-center py-2.5 px-2 font-bold">Grupo</th>
                                                    <th className="text-center py-2.5 px-2 font-bold">PTS</th>
                                                    <th className="text-center py-2.5 px-2 font-bold">G</th>
                                                    <th className="text-center py-2.5 px-2 font-bold">E</th>
                                                    <th className="text-center py-2.5 px-2 font-bold">P</th>
                                                    <th className="text-center py-2.5 px-2 font-bold">DIF</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {resolveResult.qualified_teams.map((team, idx) => (
                                                    <tr key={team.team} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-2.5 px-4">
                                                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center">
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-4 font-bold text-white">{team.team}</td>
                                                        <td className="text-center py-2.5 px-2 text-white/40">{team.grupo || '-'}</td>
                                                        <td className="text-center py-2.5 px-2 text-amber-400 font-black">{team.points}</td>
                                                        <td className="text-center py-2.5 px-2 text-white/60">{team.won}</td>
                                                        <td className="text-center py-2.5 px-2 text-white/60">{team.drawn}</td>
                                                        <td className="text-center py-2.5 px-2 text-white/60">{team.lost}</td>
                                                        <td className="text-center py-2.5 px-2 font-mono">
                                                            {team.diff > 0 ? `+${team.diff}` : team.diff}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Resolved Matches */}
                                <div className="bg-white/[0.03] border border-emerald-500/20 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/5 bg-emerald-500/5">
                                        <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                                            Cruces Asignados
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {resolveResult.resolved_matches.map((rm, idx) => (
                                            <div key={rm.match_id} className="flex items-center justify-between px-4 py-3">
                                                <span className="text-xs font-mono text-white/30 w-8">#{idx + 1}</span>
                                                <span className="text-sm font-bold text-white flex-1 text-right">{rm.team_a}</span>
                                                <span className="text-xs font-black text-amber-400 mx-4">VS</span>
                                                <span className="text-sm font-bold text-white flex-1">{rm.team_b}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ── Section 3: Force Bracket Advance ── */}
                    <section className="border-t border-white/5 pt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Zap size={16} className="text-violet-400" />
                            <h2 className="text-lg font-black uppercase tracking-wider text-white/80">
                                Forzar Avance de Bracket
                            </h2>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-3" />
                        </div>

                        <p className="text-xs text-white/30 mb-4">
                            Usa esto si los partidos de una fase eliminatoria ya están finalizados pero la siguiente ronda aún muestra "GANADOR LLAVE X". Lee los ganadores de la fase seleccionada y los asigna automáticamente.
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <select
                                    value={forceAdvanceFase}
                                    onChange={e => setForceAdvanceFase(e.target.value)}
                                    className="appearance-none bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 pr-8"
                                >
                                    <option value="cuartos">Cuartos de Final → Semifinal</option>
                                    <option value="semifinal">Semifinal → Final</option>
                                    <option value="octavos">Octavos → Cuartos</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                            </div>

                            <button
                                onClick={handleForceAdvance}
                                disabled={forcingAdvance}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {forcingAdvance ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap size={16} />
                                )}
                                {forcingAdvance ? 'Avanzando...' : 'Forzar Avance'}
                            </button>
                        </div>

                        {forceAdvanceResult && (
                            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <Check size={14} className="text-violet-400 flex-shrink-0" />
                                <span className="text-sm text-violet-300">
                                    Avance completado: <strong>{forceAdvanceFase}</strong> → <strong>{forceAdvanceResult.next_fase}</strong>
                                </span>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
