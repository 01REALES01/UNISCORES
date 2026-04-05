"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
    Upload, CheckCircle, XCircle, AlertTriangle,
    FileSpreadsheet, Calendar, Users, ChevronDown, ChevronRight,
    Play, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DryRunResult {
    dry_run: true;
    matches_found: number;
    teams_found: number;
    parse_errors: ParseError[];
    match_issues: string[];
    team_issues: string[];
    summary: Record<string, number>;
}

interface CommitResult {
    success: true;
    partidos_creados: number;
    delegaciones_reg: number;
    partidos_skipped: number;
    parse_errors: ParseError[];
    commit_errors: string[];
}

interface ParseError {
    sheet: string;
    row: number;
    message: string;
}

type Step = 'upload' | 'preview' | 'done';

// ─────────────────────────────────────────────────────────────────────────────
// Summary card
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
            <div className={cn("text-3xl font-black", color)}>{value}</div>
            <div className="text-xs text-white/30 mt-1">{label}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Issues accordion section
// ─────────────────────────────────────────────────────────────────────────────
function IssueList({ title, items, icon: Icon, color }: {
    title: string;
    items: string[];
    icon: React.FC<any>;
    color: string;
}) {
    const [open, setOpen] = useState(items.length > 0 && items.length <= 5);
    if (items.length === 0) return null;

    return (
        <div className={cn("rounded-2xl border overflow-hidden", color)}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
                <Icon size={14} className="shrink-0" />
                <span className="text-sm font-semibold flex-1">{title}</span>
                <span className="text-xs text-white/40">{items.length}</span>
                {open
                    ? <ChevronDown size={12} className="text-white/30 shrink-0" />
                    : <ChevronRight size={12} className="text-white/30 shrink-0" />
                }
            </button>
            {open && (
                <div className="px-4 pb-3 space-y-1 border-t border-white/5">
                    {items.map((msg, i) => (
                        <p key={i} className="text-xs text-white/50 py-1 border-b border-white/5 last:border-0">
                            {msg}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function FixturePage() {
    const [step, setStep] = useState<Step>('upload');
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<DryRunResult | null>(null);
    const [result, setResult] = useState<CommitResult | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal state for purging
    const [showPurgeModal, setShowPurgeModal] = useState(false);
    const [purgeKeyword, setPurgeKeyword] = useState('');
    const [purging, setPurging] = useState(false);

    // ── Step 1: dry-run ──────────────────────────────────────────────────────
    const runDryRun = useCallback(async (file: File) => {
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('dry_run', 'true');

            const res = await fetch('/api/admin/schedule', { method: 'POST', body: fd });
            const json = await res.json();

            if (!res.ok) {
                toast.error(json.error ?? 'Error al procesar el archivo');
                return;
            }

            setPendingFile(file);
            setPreview(json as DryRunResult);
            setStep('preview');
        } catch (e: any) {
            toast.error('Error de red: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Step 2: commit ───────────────────────────────────────────────────────
    const commit = async () => {
        if (!pendingFile) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('file', pendingFile);

            const res = await fetch('/api/admin/schedule', { method: 'POST', body: fd });
            const json = await res.json();

            if (!res.ok) {
                toast.error(json.error ?? 'Error al crear el fixture');
                return;
            }

            setResult(json as CommitResult);
            setStep('done');
            toast.success(`${json.partidos_creados} partidos creados correctamente`);
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) runDryRun(file);
    }, [runDryRun]);

    const reset = () => {
        setStep('upload');
        setPreview(null);
        setResult(null);
        setPendingFile(null);
    };

    const hasBlockers = (preview?.match_issues.length ?? 0) > 0;

    const handlePurge = async () => {
        if (purgeKeyword !== 'BORRAR') return;
        setPurging(true);
        try {
            const res = await fetch('/api/admin/schedule', { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Error al purgar el fixture');
            toast.success('Fixture purgado enteramente de la base de datos');
            setShowPurgeModal(false);
            setPurgeKeyword('');
            reset(); // resets state to initial
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setPurging(false);
        }
    };

    // ── UPLOAD ───────────────────────────────────────────────────────────────
    if (step === 'upload') return (
        <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Calendar size={18} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-xl">Cargar Fixture</h1>
                        <p className="text-white/30 text-xs">Calendario General 2026 — crea todos los partidos programados</p>
                    </div>
                </div>

                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "rounded-3xl border-2 border-dashed p-14 flex flex-col items-center gap-4 cursor-pointer transition-all",
                        dragging
                            ? "border-primary/50 bg-primary/10"
                            : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                    )}
                >
                    <FileSpreadsheet size={44} className={cn("transition-colors", dragging ? "text-primary" : "text-white/20")} />
                    <div className="text-center">
                        <p className="text-white/60 text-sm font-medium">
                            {loading ? 'Analizando...' : 'Arrastra el Excel aquí'}
                        </p>
                        <p className="text-white/20 text-xs mt-1">o haz clic para seleccionar</p>
                        <p className="text-white/15 text-xs mt-3 font-mono">Calendario General 2026.xlsx</p>
                    </div>
                    {loading && (
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) runDryRun(f); }}
                />

                {/* Info box */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Qué hace este paso</p>
                    <ul className="space-y-1.5">
                        {[
                            'Lee la hoja "POR DIA GENERAL" con todos los partidos',
                            'Lee las hojas por deporte para registrar las delegaciones',
                            'Muestra una vista previa antes de escribir nada a la BD',
                        ].map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-white/30">
                                <span className="text-primary/60 mt-0.5">•</span>
                                {t}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Danger box */}
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3 mt-4">
                    <p className="text-xs font-bold text-red-500/80 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={14} />
                        Zona de Peligro
                    </p>
                    <p className="text-xs text-white/50">
                        Si el calendario contiene errores estructurales en rondas eliminatorias o subiste un excel sucio, puedes borrar absolutamente todos los partidos para empezar de cero.
                    </p>
                    <button
                        onClick={() => setShowPurgeModal(true)}
                        className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-bold transition-colors w-full"
                    >
                        Purgar Fixture Completo
                    </button>
                </div>
            </div>

            {/* Purge Modal */}
            {showPurgeModal && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#120f1c] border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-red-500 font-black text-xl flex items-center gap-2">
                            <AlertTriangle size={24} />
                            Confirmar Destrucción Total
                        </h2>
                        <p className="text-white/70 text-sm">
                            Estás a punto de borrar <strong>absolutamente todos los partidos</strong> de forma permanente de la base de datos. Esto no se puede deshacer. Escribe <span className="text-red-400 font-mono font-bold select-all">BORRAR</span> para confirmar su ejecución.
                        </p>
                        <input
                            type="text"
                            placeholder="BORRAR"
                            value={purgeKeyword}
                            onChange={e => setPurgeKeyword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 font-mono text-center uppercase transition-colors"
                        />
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => { setShowPurgeModal(false); setPurgeKeyword(''); }}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm text-white/70 transition-colors"
                                disabled={purging}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePurge}
                                disabled={purgeKeyword !== 'BORRAR' || purging}
                                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-black text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {purging ? 'Destruyendo...' : 'Sí, Purgar TODO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ── PREVIEW ──────────────────────────────────────────────────────────────
    if (step === 'preview' && preview) return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-white font-black text-xl">Vista previa del fixture</h1>
                        <p className="text-white/30 text-xs mt-0.5">
                            {pendingFile?.name} — nada se ha guardado aún
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={reset}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:border-white/20 hover:text-white/60 transition-colors"
                        >
                            <RotateCcw size={13} />
                            Cambiar archivo
                        </button>
                        <button
                            onClick={commit}
                            disabled={loading || hasBlockers}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-sm font-bold transition-colors disabled:opacity-40"
                        >
                            {loading
                                ? <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                : <Play size={13} />
                            }
                            {loading ? 'Creando...' : 'Crear fixture'}
                        </button>
                    </div>
                </div>

                {/* Summary numbers */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Partidos" value={preview.matches_found} color="text-white" />
                    <StatCard label="Delegaciones" value={preview.teams_found} color="text-primary" />
                    <StatCard
                        label="Problemas"
                        value={preview.match_issues.length + preview.team_issues.length + preview.parse_errors.length}
                        color={hasBlockers ? "text-rose-400" : "text-amber-400"}
                    />
                </div>

                {hasBlockers && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/05 px-4 py-3 text-rose-400 text-sm">
                        Hay problemas bloqueantes en los partidos. Corrígelos antes de confirmar.
                    </div>
                )}

                {/* Breakdown by sport */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Partidos por deporte</p>
                    <div className="space-y-2">
                        {Object.entries(preview.summary)
                            .sort((a, b) => b[1] - a[1])
                            .map(([sport, count]) => (
                                <div key={sport} className="flex items-center gap-3">
                                    <span className="text-sm text-white/60 flex-1">{sport}</span>
                                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-primary/60 rounded-full"
                                            style={{ width: `${(count / preview.matches_found) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-white/80 w-8 text-right">{count}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Issues */}
                <div className="space-y-3">
                    <IssueList
                        title="Problemas con partidos (bloqueante)"
                        items={preview.match_issues}
                        icon={XCircle}
                        color="text-rose-400 border-rose-500/20 bg-rose-500/05"
                    />
                    <IssueList
                        title="Avisos en delegaciones (no bloquea)"
                        items={preview.team_issues}
                        icon={AlertTriangle}
                        color="text-amber-400 border-amber-500/20 bg-amber-500/05"
                    />
                    <IssueList
                        title="Errores de parseo"
                        items={preview.parse_errors.map(e => `Fila ${e.row}: ${e.message}`)}
                        icon={AlertTriangle}
                        color="text-white/40 border-white/10 bg-white/[0.02]"
                    />
                </div>
            </div>
        </div>
    );

    // ── DONE ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <div className="max-w-sm w-full text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-white font-black text-xl">Fixture creado</h2>
                    <p className="text-white/30 text-sm mt-1">Los partidos están en la base de datos</p>
                </div>

                {result && (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2 text-sm text-left">
                        {[
                            { label: 'Partidos creados',      value: result.partidos_creados,  color: 'text-emerald-400' },
                            { label: 'Delegaciones registradas', value: result.delegaciones_reg, color: 'text-primary' },
                            { label: 'Partidos ya existían',  value: result.partidos_skipped,  color: 'text-white/40' },
                        ].map(row => (
                            <div key={row.label} className="flex justify-between">
                                <span className="text-white/50">{row.label}</span>
                                <span className={cn("font-bold", row.color)}>{row.value}</span>
                            </div>
                        ))}
                        {result.commit_errors.length > 0 && (
                            <div className="pt-2 mt-2 border-t border-white/5">
                                <p className="text-xs text-amber-400 font-bold mb-1">{result.commit_errors.length} advertencia(s):</p>
                                {result.commit_errors.slice(0, 3).map((e, i) => (
                                    <p key={i} className="text-xs text-white/30">{e}</p>
                                ))}
                                {result.commit_errors.length > 3 && (
                                    <p className="text-xs text-white/20">+{result.commit_errors.length - 3} más</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Link
                        href="/admin/partidos"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-sm font-bold transition-colors"
                    >
                        <Calendar size={14} />
                        Ver partidos creados
                    </Link>
                    <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 text-sm transition-colors"
                    >
                        <RotateCcw size={14} />
                        Cargar otro archivo
                    </button>
                </div>
            </div>
        </div>
    );
}
