"use client";

import { useRef, useState, useCallback } from "react";
import { X, Upload, Swords, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SampleRow {
    slot_a: string;
    slot_b: string;
    fecha: string;
    lugar: string;
    resultado_excel: string | null;
}

interface PreviewData {
    matches_found: number;
    numero_ronda: number;
    genero: string;
    fase: string;
    sample: SampleRow[];
    parse_errors: { sheet: string; row: number; message: string }[];
}

interface CommitResult {
    partidos_creados: number;
    partidos_skipped: number;
    roster_rows: number;
    perfiles_vinculados: number;
    roster_unlinked: string[];
    parse_errors: { sheet: string; row: number; message: string }[];
    commit_errors: string[];
}

type Step = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

const RESULT_LABEL: Record<string, string> = {
    victoria_a: '1 - 0',
    victoria_b: '0 - 1',
    empate: '½ - ½',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export function AjedrezImportModal({ onClose, onSuccess }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>('idle');
    const [dragOver, setDragOver] = useState(false);

    // Form fields
    const [genero, setGenero] = useState<'masculino' | 'femenino'>('masculino');
    const [ronda, setRonda] = useState(1);

    // State
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [result, setResult] = useState<CommitResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // ── Helpers ──────────────────────────────────────────────────────────────

    const reset = () => {
        setStep('idle');
        setPendingFile(null);
        setPreview(null);
        setResult(null);
        setErrorMsg('');
    };

    const parseFile = useCallback(async (file: File, generoVal: 'masculino' | 'femenino', rondaVal: number) => {
        setStep('parsing');
        setErrorMsg('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('numero_ronda', String(rondaVal));
            fd.append('genero', generoVal);
            fd.append('dry_run', 'true');

            const res = await fetch('/api/admin/import-ajedrez-ronda', { method: 'POST', body: fd });
            const json = await res.json();

            if (!res.ok) {
                setErrorMsg(json.error || 'Error al analizar el archivo');
                setStep('error');
                return;
            }
            setPreview(json as PreviewData);
            setStep('preview');
        } catch (e: unknown) {
            setErrorMsg((e as Error).message || 'Error de red');
            setStep('error');
        }
    }, []);

    const handleFile = useCallback((file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setErrorMsg('Solo se aceptan archivos .xlsx o .xls');
            setStep('error');
            return;
        }
        setPendingFile(file);
        parseFile(file, genero, ronda);
    }, [genero, ronda, parseFile]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleCommit = async () => {
        if (!pendingFile) return;
        setStep('importing');
        try {
            const fd = new FormData();
            fd.append('file', pendingFile);
            fd.append('numero_ronda', String(ronda));
            fd.append('genero', genero);

            const res = await fetch('/api/admin/import-ajedrez-ronda', { method: 'POST', body: fd });
            const json = await res.json();

            if (!res.ok) {
                setErrorMsg(json.error || 'Error al importar');
                setStep('error');
                return;
            }
            setResult(json as CommitResult);
            setStep('done');
            onSuccess();
        } catch (e: unknown) {
            setErrorMsg((e as Error).message || 'Error de red');
            setStep('error');
        }
    };

    // ── Re-parse when gender/round changes in preview step ───────────────────

    const handleGeneroChange = (val: 'masculino' | 'femenino') => {
        setGenero(val);
        if (pendingFile && step === 'preview') parseFile(pendingFile, val, ronda);
    };

    const handleRondaChange = (val: number) => {
        setRonda(val);
        if (pendingFile && step === 'preview') parseFile(pendingFile, genero, val);
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-xl bg-[#1a0f2e] border border-violet-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Swords size={16} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-sm">Importar Resultados de Ajedrez</h2>
                            <p className="text-white/30 text-xs">Excel de Chess-Results / SwissManager</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5">

                    {/* ── STEP: idle / drop zone ── */}
                    {(step === 'idle' || step === 'error') && (
                        <>
                            {/* Gender + Round selectors (shown before file pick) */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Rama</span>
                                    <select
                                        value={genero}
                                        onChange={e => setGenero(e.target.value as 'masculino' | 'femenino')}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                                    >
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ronda</span>
                                    <input
                                        type="number" min={1} max={10}
                                        value={ronda}
                                        onChange={e => setRonda(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                                    />
                                </label>
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all",
                                    dragOver
                                        ? "border-violet-400/60 bg-violet-500/10"
                                        : "border-white/10 hover:border-violet-500/30 hover:bg-white/[0.02]"
                                )}
                            >
                                <Upload size={28} className="text-white/20" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white/50">Arrastra el Excel aquí o haz clic</p>
                                    <p className="text-xs text-white/20 mt-1">Formato Chess-Results: columnas M. · White · Resultado · Black</p>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file" accept=".xlsx,.xls"
                                className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                            />

                            {step === 'error' && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    {errorMsg}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── STEP: parsing ── */}
                    {step === 'parsing' && (
                        <div className="flex flex-col items-center gap-4 py-12">
                            <Loader2 size={32} className="text-violet-400 animate-spin" />
                            <p className="text-sm text-white/40 font-bold">Analizando Excel…</p>
                        </div>
                    )}

                    {/* ── STEP: preview ── */}
                    {step === 'preview' && preview && (
                        <>
                            {/* Gender + Round selectors (editable to re-parse) */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Rama</span>
                                    <select
                                        value={genero}
                                        onChange={e => handleGeneroChange(e.target.value as 'masculino' | 'femenino')}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                                    >
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Ronda</span>
                                    <input
                                        type="number" min={1} max={10}
                                        value={ronda}
                                        onChange={e => handleRondaChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                                    />
                                </label>
                            </div>

                            {/* Summary */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/5 border border-violet-500/15">
                                <div className="text-xs text-white/50">
                                    <span className="font-black text-violet-300 text-base">{preview.matches_found}</span> partidos encontrados
                                    <span className="mx-2 text-white/20">·</span>
                                    <span className="text-white/30">{preview.fase}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase text-white/20 capitalize">{genero}</span>
                            </div>

                            {/* Sample matches */}
                            {preview.sample.length > 0 && (
                                <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 px-3 pt-2.5 pb-1.5 border-b border-white/5">
                                        Muestra ({Math.min(preview.sample.length, preview.matches_found)} de {preview.matches_found})
                                    </p>
                                    <div className="divide-y divide-white/5">
                                        {preview.sample.map((row, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                                                <span className="text-white/50 truncate flex-1">{row.slot_a}</span>
                                                <span className="text-white/20 shrink-0">vs</span>
                                                <span className="text-white/50 truncate flex-1 text-right">{row.slot_b}</span>
                                                <span className={cn(
                                                    "shrink-0 font-black ml-1 min-w-[42px] text-center",
                                                    row.resultado_excel ? "text-emerald-400/80" : "text-white/15"
                                                )}>
                                                    {row.resultado_excel ? RESULT_LABEL[row.resultado_excel] ?? row.resultado_excel : '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Parse errors/warnings */}
                            {preview.parse_errors.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60 mb-1.5">Avisos del parseo</p>
                                    {preview.parse_errors.slice(0, 5).map((e, i) => (
                                        <p key={i} className="text-xs text-amber-300/60">Fila {e.row}: {e.message}</p>
                                    ))}
                                </div>
                            )}

                            {/* Change file link */}
                            <button
                                onClick={reset}
                                className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2"
                            >
                                Cambiar archivo
                            </button>
                        </>
                    )}

                    {/* ── STEP: importing ── */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center gap-4 py-12">
                            <Loader2 size={32} className="text-emerald-400 animate-spin" />
                            <p className="text-sm text-white/40 font-bold">Creando partidos…</p>
                        </div>
                    )}

                    {/* ── STEP: done ── */}
                    {step === 'done' && result && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center gap-3 py-6">
                                <CheckCircle size={40} className="text-emerald-400" />
                                <p className="text-white font-black text-lg">¡Importación completada!</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3 text-center">
                                    <p className="text-2xl font-black text-emerald-300">{result.partidos_creados}</p>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-wide mt-0.5">Partidos creados</p>
                                </div>
                                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
                                    <p className="text-2xl font-black text-white/40">{result.partidos_skipped}</p>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-wide mt-0.5">Duplicados omitidos</p>
                                </div>
                            </div>

                            <p className="text-xs text-white/30 text-center">
                                Perfiles vinculados: <span className="text-white/50 font-bold">{result.perfiles_vinculados}</span>
                                <span className="mx-2">·</span>
                                Roster: <span className="text-white/50 font-bold">{result.roster_rows}</span>
                            </p>

                            {result.roster_unlinked.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60 mb-1.5">
                                        Jugadores no vinculados ({result.roster_unlinked.length})
                                    </p>
                                    <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                                        {result.roster_unlinked.slice(0, 10).map((line, i) => (
                                            <li key={i} className="text-xs text-amber-300/50">{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.commit_errors.length > 0 && (
                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-red-400/60 mb-1.5">Errores de inserción</p>
                                    {result.commit_errors.slice(0, 5).map((e, i) => (
                                        <p key={i} className="text-xs text-red-300/60">{e}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {(step === 'preview' || step === 'done') && (
                    <div className="px-6 py-4 border-t border-white/5 flex gap-3 shrink-0">
                        {step === 'preview' && (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm font-bold hover:text-white/60 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCommit}
                                    disabled={!preview || preview.matches_found === 0}
                                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Crear {preview?.matches_found ?? 0} Partidos
                                </button>
                            </>
                        )}
                        {step === 'done' && (
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black transition-colors"
                            >
                                Cerrar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
