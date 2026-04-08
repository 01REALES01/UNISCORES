"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, CheckCircle, XCircle, AlertTriangle, Users, ChevronDown, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui-primitives";
import Link from "next/link";
import type { ParsedJugador } from "@/app/api/admin/import-jugadores/route";

type Tab = 'directorio' | 'importar';
type ImportStep = 'upload' | 'review' | 'done';

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Directorio
// ─────────────────────────────────────────────────────────────────────────────

function DirectorioTab() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarrera, setFilterCarrera] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [jugRes, carRes] = await Promise.all([
        supabase.from('jugadores').select('*, carrera:carrera_id(nombre), disciplina:disciplina_id(name)'),
        supabase.from('carreras').select('id, nombre'),
      ]);
      if (jugRes.data) setJugadores(jugRes.data);
      if (carRes.data) setCarreras(carRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  let filtered = jugadores;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(j => j.nombre.toLowerCase().includes(term));
  }
  if (filterCarrera) {
    filtered = filtered.filter(j => j.carrera_id === filterCarrera);
  }

  if (loading) {
    return <div className="text-white/40 py-12 text-center">Cargando...</div>;
  }

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ Esto eliminará los jugadores importados desde Excel que aún NO tienen cuenta registrada.\n\nLos que ya se registraron (perfil vinculado) NO se eliminarán.\n\n¿Estás seguro?')) return;
    if (!confirm('Esta acción es irreversible. ¿CONFIRMAR?')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/import-jugadores/delete-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${data.deleted} jugadores eliminados`);
      // Refresh the list
      const jugRes = await supabase.from('jugadores').select('*, carrera:carrera_id(nombre), disciplina:disciplina_id(name)');
      if (jugRes.data) setJugadores(jugRes.data);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap items-end justify-between">
        <div className="flex gap-4 flex-wrap items-end flex-1">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-black uppercase tracking-widest text-white/40 block mb-2">Buscar</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              placeholder="Nombre del jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.12] border border-white/30 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:bg-white/[0.18] focus:border-white/50 transition-all font-bold"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-widest text-white/40 block mb-2">Programa</label>
          <select
            value={filterCarrera || ''}
            onChange={(e) => setFilterCarrera(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-white/20"
          >
            <option value="">Todas</option>
            {carreras.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleDeleteAll}
          disabled={loading || jugadores.length === 0}
          className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🗑️ Limpiar todos
        </Button>
        </div>
      </div>

      <div className="border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-white/40">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-white/40">Programa</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-white/40">Deporte</th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-white/40">Rama</th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white/40">Sexo</th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white/40">#</th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white/40">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j, idx) => (
              <tr key={j.id} className={cn("border-b border-white/5", idx % 2 === 0 ? "bg-white/2" : "")}>
                <td className="px-4 py-3 text-sm font-medium">
                  <Link
                    href={j.profile_id ? `/perfil/${j.profile_id}` : `/jugador/${j.id}`}
                    className="text-white hover:text-white/70 transition-colors"
                    target="_blank"
                  >
                    {j.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-white/70">{j.carrera?.nombre || '—'}</td>
                <td className="px-4 py-3 text-sm text-white/70">{j.disciplina?.name || '—'}</td>
                <td className="px-4 py-3 text-sm text-white/70 capitalize">{j.genero || '—'}</td>
                <td className="px-4 py-3 text-sm text-white/70 text-center">{j.sexo || '—'}</td>
                <td className="px-4 py-3 text-sm text-white/70 text-center">{j.numero || '—'}</td>
                <td className="px-4 py-3 text-center">
                  {j.profile_id ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400">
                      <CheckCircle size={12} /> Vinculado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40">
                      Sin cuenta
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-white/40">No hay jugadores</div>
        )}
      </div>

      <div className="text-xs text-white/30 font-mono">
        {filtered.length} jugador{filtered.length !== 1 ? 'es' : ''} mostrados
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Importar
// ─────────────────────────────────────────────────────────────────────────────

function ImportarTab() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedJugador[]>([]);
  const [sheetUsed, setSheetUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (f: File) => {
    setFile(f);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', f);

    try {
      const res = await fetch('/api/admin/import-jugadores', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRows(data.rows);
      setSheetUsed(data.sheet_used || null);
      setStep('review');
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/import-jugadores/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
      setStep('done');
      toast.success(`${data.created} creados, ${data.updated} actualizados`);
    } catch (err: any) {
      toast.error(err.message || 'Error al confirmar');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setResult(null);
  };

  // PASO 1: Upload
  if (step === 'upload') {
    return (
      <div className="space-y-6">
        <div
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer hover:border-white/30",
            "border-white/10 bg-white/2"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-white/30', 'bg-white/5');
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('border-white/30', 'bg-white/5');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-white/30', 'bg-white/5');
            const f = e.dataTransfer.files[0];
            if (f) handleUpload(f);
          }}
        >
          <Upload size={32} className="mx-auto mb-3 text-white/30" />
          <p className="text-sm font-black text-white mb-1">Arrastra tu archivo Excel</p>
          <p className="text-xs text-white/40">o haz clic para seleccionar</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
          className="hidden"
        />

        <div className="text-xs text-white/40 space-y-1">
          <p><strong>Formato esperado:</strong></p>
          <p>• Columnas: nombre, carrera, número (opcional), email (opcional)</p>
          <p>• Los nombres de columna son flexibles (se acepta "num", "camiseta", "correo", etc.)</p>
        </div>
      </div>
    );
  }

  // PASO 2: Preview
  if (step === 'review') {
    const okCount = rows.filter(r => r.validation_status === 'ok').length;
    const warningCount = rows.filter(r => r.validation_status === 'warning').length;
    const errorCount = rows.filter(r => r.validation_status === 'error').length;

    return (
      <div className="space-y-6">
        {sheetUsed && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 font-mono">
            <span className="text-white/30">Hoja detectada:</span>
            <span className="text-white/70 font-bold">"{sheetUsed}"</span>
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-xs font-black text-emerald-400">{okCount} OK</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-xs font-black text-amber-400">{warningCount} Aviso</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <XCircle size={14} className="text-rose-400" />
            <span className="text-xs font-black text-rose-400">{errorCount} Error</span>
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Nombre</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Programa</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Deporte</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Rama</th>
                <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white/40">Sexo</th>
                <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white/40">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-white/40">Email</th>
                <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-white/40">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} className={cn("border-b border-white/5", idx % 2 === 0 ? "bg-white/2" : "")}>
                  <td className="px-3 py-2 text-xs text-white font-medium">{r.nombre}</td>
                  <td className="px-3 py-2 text-xs text-white/70">
                    {r.carrera_matched || r.carrera_input}
                    {r.carrera_matched && r.carrera_matched !== r.carrera_input && (
                      <span className="ml-1 text-white/30 text-[10px]">({Math.round(r.carrera_confidence * 100)}%)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-white/70">
                    {r.disciplina_matched || r.disciplina_input || '—'}
                    {r.disciplina_matched && r.disciplina_input && r.disciplina_matched !== r.disciplina_input && (
                      <span className="ml-1 text-white/30 text-[10px]">({Math.round(r.disciplina_confidence * 100)}%)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-white/70 capitalize">{r.genero || '—'}</td>
                  <td className="px-3 py-2 text-xs text-white/70 text-center">{r.sexo || '—'}</td>
                  <td className="px-3 py-2 text-xs text-white/70 text-center">{r.numero || '—'}</td>
                  <td className="px-3 py-2 text-xs text-white/70">{r.email || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {r.validation_status === 'ok' && (
                      <CheckCircle size={14} className="text-emerald-400 mx-auto" />
                    )}
                    {r.validation_status === 'warning' && (
                      <AlertTriangle size={14} className="text-amber-400 mx-auto" />
                    )}
                    {r.validation_status === 'error' && (
                      <XCircle size={14} className="text-rose-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.some(r => r.validation_messages.length > 0) && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-black text-white/40 uppercase tracking-widest">
              Mensajes de validación ({rows.filter(r => r.validation_messages.length > 0).length})
            </summary>
            <div className="mt-3 space-y-2">
              {rows.map((r, idx) => r.validation_messages.length > 0 && (
                <div key={idx} className="text-xs text-white/40 pl-4 border-l border-white/10">
                  <span className="font-mono font-bold text-white/60">{r.nombre}</span>: {r.validation_messages.join('; ')}
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => setStep('upload')}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            Atrás
          </Button>
          <Button
            onClick={handleCommit}
            disabled={loading || errorCount === rows.length}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {loading ? 'Confirmando...' : `Confirmar (${rows.length - errorCount} filas válidas)`}
          </Button>
        </div>
      </div>
    );
  }

  // PASO 3: Done
  if (step === 'done') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-start gap-4">
            <CheckCircle size={24} className="text-emerald-400 shrink-0 mt-1" />
            <div>
              <p className="text-sm font-black text-emerald-300 mb-2">Importación completada</p>
              <p className="text-xs text-emerald-400/70">
                <strong>{result?.created}</strong> jugadores creados, <strong>{result?.updated}</strong> actualizados
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleReset} className="w-full bg-white/10 hover:bg-white/20 text-white">
          Importar otro archivo
        </Button>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function JugadoresPage() {
  const [tab, setTab] = useState<Tab>('directorio');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-violet-400" />
            <h1 className="text-3xl font-black text-white">Jugadores</h1>
          </div>
          <p className="text-white/40 text-sm">Gestiona el directorio de deportistas</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10">
          {(['directorio', 'importar'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-3 font-black text-sm uppercase tracking-widest transition-colors border-b-2 -mb-[2px]",
                tab === t
                  ? "text-white border-b-white"
                  : "text-white/40 border-b-transparent hover:text-white/60"
              )}
            >
              {t === 'directorio' ? 'Directorio' : 'Importar Excel'}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'directorio' && <DirectorioTab />}
        {tab === 'importar' && <ImportarTab />}
      </div>
    </div>
  );
}
