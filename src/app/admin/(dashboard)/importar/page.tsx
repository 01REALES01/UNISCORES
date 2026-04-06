"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Upload, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ExcelImport, ExcelImportRow, RowType, ValidationStatus } from "@/modules/puntos/types";

type Step = 'upload' | 'review' | 'done';

interface ReviewData {
    import_id: string;
    total_rows: number;
    rows_ok: number;
    rows_warning: number;
    rows_error: number;
    rows: ExcelImportRow[];
}

interface CommitResult {
    committed_partidos: number;
    committed_eventos: number;
    committed_roster: number;
}

const STATUS_CONFIG: Record<ValidationStatus, { color: string; icon: React.FC<any>; label: string }> = {
    ok:      { color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/05', icon: CheckCircle, label: 'OK' },
    warning: { color: 'text-amber-400 border-amber-500/20 bg-amber-500/05', icon: AlertTriangle, label: 'Aviso' },
    error:   { color: 'text-rose-400 border-rose-500/20 bg-rose-500/05', icon: XCircle, label: 'Error' },
    pending: { color: 'text-white/30 border-white/10 bg-white/05', icon: ChevronRight, label: '...' },
};

const ROW_TYPE_LABELS: Record<RowType, string> = {
    partido: 'Partido',
    evento:  'Evento',
    roster:  'Roster',
};

// ─────────────────────────────────────────────────────────────────────────────
// Row detail accordion
// ─────────────────────────────────────────────────────────────────────────────
function RowDetail({ row }: { row: ExcelImportRow }) {
    const [open, setOpen] = useState(false);
    const cfg = STATUS_CONFIG[row.validation_status];
    const Icon = cfg.icon;

    return (
        <div className={cn("rounded-xl border overflow-hidden transition-all", cfg.color)}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
                <Icon size={14} className="shrink-0" />
                <span className="text-xs font-mono text-white/30 w-16 shrink-0">{row.sheet_name}:{row.row_number}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-white/40 w-16 shrink-0">
                    {ROW_TYPE_LABELS[row.row_type]}
                </span>
                <span className="text-sm text-white/70 flex-1 truncate">
                    {row.row_type === 'partido' && (
                        `${(row.matched_data as any).equipo_a ?? '?'} vs ${(row.matched_data as any).equipo_b ?? '?'}`
                    )}
                    {row.row_type === 'evento' && (
                        `${(row.matched_data as any).tipo_evento ?? '?'} — partido ${(row.matched_data as any).partido_id ?? '?'}`
                    )}
                    {row.row_type === 'roster' && (
                        `${(row.raw_data as any).nombre ?? (row.raw_data as any).jugador ?? '?'}`
                    )}
                </span>
                {row.validation_messages.length > 0 && (
                    <span className="text-xs text-white/30">{row.validation_messages.length} aviso(s)</span>
                )}
                {open ? <ChevronDown size={12} className="text-white/30 shrink-0" /> : <ChevronRight size={12} className="text-white/30 shrink-0" />}
            </button>

            {open && (
                <div className="px-4 pb-3 space-y-2 border-t border-white/5">
                    {row.validation_messages.map((m, i) => (
                        <div key={i} className={cn("text-xs px-3 py-2 rounded-lg", m.level === 'error' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300')}>
                            <span className="font-bold">{m.field}:</span> {m.message}
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <p className="text-xs text-white/20 mb-1">Raw data</p>
                            <pre className="text-[10px] text-white/40 bg-white/5 rounded p-2 overflow-auto max-h-32">
                                {JSON.stringify(row.raw_data, null, 2)}
                            </pre>
                        </div>
                        <div>
                            <p className="text-xs text-white/20 mb-1">Matched</p>
                            <pre className="text-[10px] text-white/40 bg-white/5 rounded p-2 overflow-auto max-h-32">
                                {JSON.stringify(row.matched_data, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function ImportarPage() {
    const [step, setStep] = useState<Step>('upload');
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [review, setReview] = useState<ReviewData | null>(null);
    const [filterType, setFilterType] = useState<RowType | 'all' | 'errors' | 'warnings'>('all');
    const [committing, setCommitting] = useState(false);
    const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Solo se aceptan archivos .xlsx o .xls');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/import-excel', { method: 'POST', body: formData });
            const json = await res.json();
            if (!res.ok) { toast.error(json.error ?? 'Error al procesar el archivo'); return; }

            // Load the staged rows
            const { data: rows } = await supabase
                .from('excel_import_rows')
                .select('*')
                .eq('import_id', json.import_id)
                .order('row_number');

            setReview({ ...json, rows: rows ?? [] });
            setStep('review');
        } catch (e: any) {
            toast.error('Error de red: ' + e.message);
        } finally {
            setUploading(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    }, [uploadFile]);

    const handleCommit = async () => {
        if (!review) return;
        setCommitting(true);
        try {
            const res = await fetch('/api/admin/import-excel/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ import_id: review.import_id }),
            });
            const json = await res.json();
            if (!res.ok) { toast.error(json.error ?? 'Error al confirmar'); return; }
            setCommitResult(json);
            setStep('done');
            toast.success('Importación confirmada');
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        } finally {
            setCommitting(false);
        }
    };

    const handleCancel = async () => {
        if (!review) return;
        await supabase.from('excel_imports').update({ status: 'cancelled' }).eq('id', review.import_id);
        setReview(null);
        setStep('upload');
    };

    const filteredRows = review?.rows.filter(r => {
        if (filterType === 'all') return true;
        if (filterType === 'errors') return r.validation_status === 'error';
        if (filterType === 'warnings') return r.validation_status === 'warning';
        return r.row_type === filterType;
    }) ?? [];

    // ── Upload step ──────────────────────────────────────────────────────────
    if (step === 'upload') return (
        <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Upload size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-xl">Importar Excel</h1>
                        <p className="text-white/30 text-xs">Fixture, resultados y eventos de partidos</p>
                    </div>
                </div>

                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "rounded-3xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-all",
                        dragging
                            ? "border-blue-400/50 bg-blue-500/10"
                            : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                    )}
                >
                    <FileSpreadsheet size={40} className={cn("transition-colors", dragging ? "text-blue-400" : "text-white/20")} />
                    <div className="text-center">
                        <p className="text-white/60 text-sm font-medium">
                            {uploading ? 'Procesando...' : 'Arrastra tu archivo aquí'}
                        </p>
                        <p className="text-white/20 text-xs mt-1">o haz clic para seleccionar</p>
                        <p className="text-white/15 text-xs mt-2">.xlsx / .xls</p>
                    </div>
                    {uploading && (
                        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    )}
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                />
            </div>
        </div>
    );

    // ── Review step ──────────────────────────────────────────────────────────
    if (step === 'review' && review) return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-white font-black text-xl">Revisar importación</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:border-rose-500/30 hover:text-rose-400 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCommit}
                            disabled={committing || review.rows_error > 0}
                            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-bold transition-colors disabled:opacity-40"
                        >
                            {committing ? 'Confirmando...' : 'Confirmar Importación'}
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Total', value: review.total_rows, color: 'text-white/60' },
                        { label: 'OK', value: review.rows_ok, color: 'text-emerald-400' },
                        { label: 'Avisos', value: review.rows_warning, color: 'text-amber-400' },
                        { label: 'Errores', value: review.rows_error, color: 'text-rose-400' },
                    ].map(s => (
                        <div key={s.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                            <div className={cn("text-2xl font-black", s.color)}>{s.value}</div>
                            <div className="text-xs text-white/30 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                {review.rows_error > 0 && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/05 px-4 py-3 text-rose-400 text-sm">
                        Hay {review.rows_error} error(es). Corrige el archivo y sube de nuevo para poder confirmar.
                    </div>
                )}

                {/* Filter chips */}
                <div className="flex flex-wrap gap-2">
                    {(['all', 'errors', 'warnings', 'partido', 'evento', 'roster'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterType(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                filterType === f
                                    ? "bg-white/10 text-white border border-white/20"
                                    : "text-white/30 hover:text-white/60 border border-transparent"
                            )}
                        >
                            {{
                                all: 'Todos',
                                errors: `Errores (${review.rows_error})`,
                                warnings: `Avisos (${review.rows_warning})`,
                                partido: 'Partidos',
                                evento: 'Eventos',
                                roster: 'Roster',
                            }[f]}
                        </button>
                    ))}
                </div>

                {/* Rows */}
                <div className="space-y-2">
                    {filteredRows.map(row => (
                        <RowDetail key={row.id} row={row} />
                    ))}
                    {filteredRows.length === 0 && (
                        <div className="text-white/20 text-sm text-center py-8">Sin filas para este filtro</div>
                    )}
                </div>
            </div>
        </div>
    );

    // ── Done step ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <div className="max-w-sm w-full text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-white font-black text-xl">Importación completada</h2>
                    <p className="text-white/30 text-sm mt-1">Los datos han sido guardados</p>
                </div>
                {commitResult && (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2 text-sm">
                        <div className="flex justify-between text-white/60">
                            <span>Partidos creados</span>
                            <span className="font-bold text-white">{commitResult.committed_partidos}</span>
                        </div>
                        <div className="flex justify-between text-white/60">
                            <span>Eventos importados</span>
                            <span className="font-bold text-white">{commitResult.committed_eventos}</span>
                        </div>
                        <div className="flex justify-between text-white/60">
                            <span>Jugadores en roster</span>
                            <span className="font-bold text-white">{commitResult.committed_roster}</span>
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <Link
                        href="/admin/partidos"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm transition-colors"
                    >
                        <ExternalLink size={14} />
                        Ver partidos
                    </Link>
                    <button
                        onClick={() => { setStep('upload'); setReview(null); setCommitResult(null); }}
                        className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-bold transition-colors"
                    >
                        Importar otro archivo
                    </button>
                </div>
            </div>
        </div>
    );
}
