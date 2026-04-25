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
    GitBranch, Zap, ArrowRight, Check, Loader2, Trophy,
    AlertTriangle, ChevronRight, Circle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type PhaseStatus = {
    fase: string;
    label: string;
    total: number;
    done: number;
    complete: boolean;
};

type BracketOverview = {
    phases: PhaseStatus[];
    canResolve: boolean;    // all grupos done, eliminatoria needs resolver
    canAdvance: boolean;    // some elim phase complete, ready to push forward
    advanceFase: string | null;
};

// ─── Phase config ────────────────────────────────────────────────────────────

const PHASE_ORDER = ['grupos', 'octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'];
const PHASE_LABELS: Record<string, string> = {
    grupos: 'Grupos',
    octavos: 'Octavos',
    cuartos: 'Cuartos de Final',
    semifinal: 'Semifinales',
    tercer_puesto: 'Tercer Puesto',
    final: 'Final',
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function BracketsPage() {
    const { isPeriodista } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isPeriodista) router.push('/admin/noticias');
    }, [isPeriodista, router]);

    const [disciplinas, setDisciplinas] = useState<{ id: number; name: string }[]>([]);
    const [selectedSport, setSelectedSport] = useState<string>(SORTEO_SPORTS[0]);
    const [selectedGender, setSelectedGender] = useState<string>('masculino');
    const [overview, setOverview] = useState<BracketOverview | null>(null);
    const [loading, setLoading] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [advancing, setAdvancing] = useState(false);

    useEffect(() => {
        supabase.from('disciplinas').select('id, name').then(({ data }) => {
            if (data) setDisciplinas(data);
        });
    }, []);

    const disciplinaId = useMemo(
        () => disciplinas.find(d => d.name === selectedSport)?.id,
        [disciplinas, selectedSport]
    );

    const fetchOverview = useCallback(async () => {
        if (!disciplinaId) return;
        setLoading(true);
        try {
            const { data: partidos } = await supabase
                .from('partidos')
                .select('id, fase, estado')
                .eq('disciplina_id', disciplinaId)
                .ilike('genero', selectedGender.trim());

            if (!partidos) { setOverview(null); return; }

            const byPhase: Record<string, { total: number; done: number }> = {};
            for (const p of partidos) {
                if (!byPhase[p.fase]) byPhase[p.fase] = { total: 0, done: 0 };
                byPhase[p.fase].total++;
                if (p.estado === 'finalizado') byPhase[p.fase].done++;
            }

            const phases: PhaseStatus[] = PHASE_ORDER
                .filter(f => byPhase[f])
                .map(f => ({
                    fase: f,
                    label: PHASE_LABELS[f] || f,
                    total: byPhase[f].total,
                    done: byPhase[f].done,
                    complete: byPhase[f].done === byPhase[f].total,
                }));

            const gruposPhase = phases.find(p => p.fase === 'grupos');
            const canResolve = !!gruposPhase?.complete;

            // Find the most advanced complete elim phase to advance
            const elimPriority = ['semifinal', 'cuartos', 'octavos'];
            let advanceFase: string | null = null;
            for (const f of elimPriority) {
                const ph = phases.find(p => p.fase === f);
                if (ph?.complete) { advanceFase = f; break; }
            }

            setOverview({ phases, canResolve, canAdvance: !!advanceFase, advanceFase });
        } finally {
            setLoading(false);
        }
    }, [disciplinaId, selectedGender]);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    // ── Handlers ────────────────────────────────────────────────────────────

    async function handleResolve() {
        if (!disciplinaId) return;
        setResolving(true);
        try {
            const res = await fetch('/api/admin/sorteo/resolver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disciplina_id: disciplinaId, genero: selectedGender }),
            });
            const json = await res.json();
            if (!res.ok) { toast.error(json.error || 'Error al resolver bracket'); return; }
            toast.success(`Bracket resuelto: ${json.resolved_matches?.length ?? 0} cruces asignados`);
            fetchOverview();
        } catch { toast.error('Error de conexión'); }
        finally { setResolving(false); }
    }

    async function handleAdvance() {
        if (!disciplinaId) return;
        setAdvancing(true);
        try {
            const res = await fetch('/api/admin/auto-advance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disciplina_id: disciplinaId, genero: selectedGender }),
            });
            const json = await res.json();
            if (!res.ok) { toast.error(json.error || 'Error al avanzar bracket'); return; }

            if (json.advanced) {
                toast.success(json.message || `Ganadores avanzados a ${json.next_fase}`);
                fetchOverview();
            } else {
                toast.info(json.reason || 'No hay fase completa para avanzar');
            }
        } catch { toast.error('Error de conexión'); }
        finally { setAdvancing(false); }
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/20">
                    <GitBranch className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">Gestión de Brackets</h1>
                    <p className="text-sm text-white/40">Resolver grupos, avanzar ganadores y ver estado de cada fase</p>
                </div>
            </div>

            {/* Sport + Gender selector */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                    {SORTEO_SPORTS.map(sport => (
                        <button
                            key={sport}
                            onClick={() => setSelectedSport(sport)}
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
                        { label: 'Masculino', value: 'masculino', active: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                        { label: 'Femenino', value: 'femenino', active: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
                    ].map(g => (
                        <button
                            key={g.value}
                            onClick={() => setSelectedGender(g.value)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                                selectedGender === g.value
                                    ? g.active
                                    : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5"
                            )}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-white/30" />
                </div>
            )}

            {!loading && overview && (
                <>
                    {/* ── Phase Status Grid ── */}
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-wider text-white/40 mb-4">Estado por Fase</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {overview.phases.map((phase, idx) => (
                                <div
                                    key={phase.fase}
                                    className={cn(
                                        "rounded-2xl border p-4 transition-all",
                                        phase.complete
                                            ? "bg-emerald-500/5 border-emerald-500/20"
                                            : phase.done > 0
                                                ? "bg-amber-500/5 border-amber-500/20"
                                                : "bg-white/[0.02] border-white/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-black uppercase tracking-wider text-white/60">
                                            {phase.label}
                                        </span>
                                        {phase.complete ? (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase">
                                                <Check size={10} /> Completo
                                            </span>
                                        ) : phase.done > 0 ? (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 uppercase">
                                                <AlertTriangle size={10} /> En curso
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-black text-white/20 uppercase">
                                                <Circle size={10} /> Pendiente
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-end justify-between mb-2">
                                        <span className="text-2xl font-black text-white">
                                            {phase.done}
                                            <span className="text-sm text-white/30 ml-1">/ {phase.total}</span>
                                        </span>
                                        <span className="text-xs text-white/30">partidos</span>
                                    </div>

                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                phase.complete
                                                    ? "bg-emerald-500"
                                                    : phase.done > 0
                                                        ? "bg-amber-500"
                                                        : "bg-white/10"
                                            )}
                                            style={{ width: phase.total > 0 ? `${(phase.done / phase.total) * 100}%` : '0%' }}
                                        />
                                    </div>

                                    {/* Arrow to next phase */}
                                    {idx < overview.phases.length - 1 && (
                                        <div className="flex items-center justify-center mt-2">
                                            <ChevronRight size={12} className={cn(phase.complete ? "text-emerald-400/50" : "text-white/10")} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── Actions ── */}
                    <section className="border-t border-white/5 pt-6">
                        <h2 className="text-xs font-black uppercase tracking-wider text-white/40 mb-4">Acciones</h2>

                        <div className="flex flex-wrap gap-3">
                            {/* Resolver bracket (grupos → eliminatoria) */}
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={handleResolve}
                                    disabled={resolving || !overview.canResolve}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                        overview.canResolve
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                                            : "bg-white/5 text-white/30 cursor-not-allowed"
                                    )}
                                >
                                    {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap size={16} />}
                                    {resolving ? 'Resolviendo...' : 'Resolver Bracket (Grupos → Fase Eliminatoria)'}
                                </button>
                                {!overview.canResolve && (
                                    <p className="text-[11px] text-white/25 px-1">Requiere que todos los partidos de grupo estén finalizados</p>
                                )}
                            </div>

                            {/* Avanzar ganadores (elim → siguiente fase) */}
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={handleAdvance}
                                    disabled={advancing || !overview.canAdvance}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all border",
                                        overview.canAdvance
                                            ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25"
                                            : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                                    )}
                                >
                                    {advancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
                                    {advancing ? 'Avanzando...' : `Avanzar Ganadores${overview.advanceFase ? ` (${PHASE_LABELS[overview.advanceFase] ?? overview.advanceFase} → siguiente)` : ''}`}
                                </button>
                                {!overview.canAdvance && (
                                    <p className="text-[11px] text-white/25 px-1">Requiere una fase eliminatoria completamente finalizada</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ── Empty state ── */}
                    {overview.phases.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Trophy size={48} className="text-white/10 mb-4" />
                            <h3 className="text-lg font-bold text-white/30 mb-2">Sin fixture cargado</h3>
                            <p className="text-white/20 text-sm">
                                No hay partidos para {SPORT_EMOJI[selectedSport]} {selectedSport} ({selectedGender}).
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
