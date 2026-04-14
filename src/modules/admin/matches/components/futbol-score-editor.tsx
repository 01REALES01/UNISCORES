"use client";

import { useState, useMemo } from "react";
import { Trash2, Plus, Loader2, AlertCircle, Save } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { PlayerSearchForm } from "./player-search-form";
import { supabase } from "@/lib/supabase";
import { stampAudit } from "@/lib/audit-helpers";
import { toast } from "sonner";

interface FutbolEditorProps {
  match: any;
  eventos: any[];
  jugadoresA: any[];
  jugadoresB: any[];
  onAddEvent: (tipo: string, equipo: string, jugadorId: number | null, bypass: boolean, overrides: { minuto: number; periodo: number }) => void;
  onDeleteEvent: (evento: any) => void;
  onAddPlayer?: (team: string, data: any) => Promise<number | null>;
  /** Admin profile for audit stamp on manual saves */
  profile?: any;
  /** Refetch partido so the scoreboard above matches DB (manual save bypasses event pipeline). */
  onSaved?: () => void | Promise<void>;
}

const TIPOS_FUTBOL = [
  { value: 'gol',             label: 'Gol',             icon: '⚽', afectaScore: true },
  { value: 'tarjeta_amarilla',label: 'Tarjeta Amarilla', icon: '🟨', afectaScore: false },
  { value: 'tarjeta_roja',    label: 'Tarjeta Roja',    icon: '🟥', afectaScore: false },
  { value: 'cambio',          label: 'Cambio',          icon: '🔄', afectaScore: false },
  { value: 'falta',           label: 'Falta',           icon: '⛔', afectaScore: false },
];

const EVENT_ICON: Record<string, string> = {
  gol: '⚽', tarjeta_amarilla: '🟨', tarjeta_roja: '🟥', cambio: '🔄', falta: '⛔',
};

const SPORT_COLOR = '#10B981';

function getTiempo(e: any): 1 | 2 {
  if (e.periodo === 1 || e.periodo === 2) return e.periodo;
  return (e.minuto ?? 0) <= 45 ? 1 : 2;
}

function MiniScore({ label, golesA, golesB, nameA, nameB, active, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex min-h-[88px] flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all active:scale-[0.98] touch-manipulation",
        active
          ? "border-emerald-400/60 bg-emerald-500/15"
          : "border-white/12 bg-white/[0.05] hover:bg-white/[0.08]"
      )}
    >
      <span className={cn("text-xs font-black uppercase tracking-wide", active ? "text-emerald-300" : "text-white/70")}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-black text-white tabular-nums">{golesA}</span>
        <span className="text-white/35 font-black">:</span>
        <span className="text-2xl font-black text-white tabular-nums">{golesB}</span>
      </div>
      <div className="flex w-full items-center justify-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-white/65">
        <span className="truncate min-w-0 max-w-[42%]">{nameA}</span>
        <span className="shrink-0 text-white/40">vs</span>
        <span className="truncate min-w-0 max-w-[42%]">{nameB}</span>
      </div>
    </button>
  );
}

export function FutbolEditor({ match, eventos, jugadoresA, jugadoresB, onAddEvent, onDeleteEvent, onAddPlayer, profile, onSaved }: FutbolEditorProps) {
  const [manualMode, setManualMode] = useState(false);
  const [manualGolesA, setManualGolesA] = useState(0);
  const [manualGolesB, setManualGolesB] = useState(0);
  const [savingManual, setSavingManual] = useState(false);

  const initManualMode = () => {
    const d = match.marcador_detalle || {};
    setManualGolesA(d.goles_a ?? d.total_a ?? 0);
    setManualGolesB(d.goles_b ?? d.total_b ?? 0);
    setManualMode(true);
  };

  const saveManualScore = async () => {
    setSavingManual(true);
    try {
      const { data: fresh } = await supabase
        .from('partidos').select('marcador_detalle').eq('id', match.id).single();
      const newDetalle = { ...(fresh?.marcador_detalle || match.marcador_detalle || {}) };
      newDetalle.goles_a = manualGolesA;
      newDetalle.goles_b = manualGolesB;
      newDetalle.total_a = manualGolesA;
      newDetalle.total_b = manualGolesB;
      newDetalle.ultimo_update = new Date().toISOString();
      const auditProfile = profile ?? match?.profile;
      const { error } = await supabase
        .from('partidos')
        .update({ marcador_detalle: stampAudit(newDetalle, auditProfile) })
        .eq('id', match.id);
      if (error) throw error;
      toast.success('Marcador actualizado');
      setManualMode(false);
      await onSaved?.();
    } catch (err: any) {
      toast.error('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setSavingManual(false);
    }
  };

  const [selectedTiempo, setSelectedTiempo] = useState<1 | 2>(1);
  const [newTipo, setNewTipo] = useState('');
  const [newEquipo, setNewEquipo] = useState<'equipo_a' | 'equipo_b' | ''>('');
  const [newJugadorId, setNewJugadorId] = useState<number | null>(null);
  const [newMinuto, setNewMinuto] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);

  const nameA = getDisplayName(match, 'a');
  const nameB = getDisplayName(match, 'b');

  // Filter out system events, group the rest by tiempo
  const gameEvents = useMemo(
    () => eventos.filter(e => e.equipo !== 'sistema'),
    [eventos]
  );

  const byTiempo = useMemo(() => ({
    1: gameEvents.filter(e => getTiempo(e) === 1).sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0)),
    2: gameEvents.filter(e => getTiempo(e) === 2).sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0)),
  }), [gameEvents]);

  const countGoles = (t: 1 | 2, equipo: string) =>
    byTiempo[t].filter(e => e.tipo_evento === 'gol' && e.equipo === equipo).length;

  // Jugadores available for selected equipo
  const jugadoresEquipo = newEquipo === 'equipo_a' ? jugadoresA : newEquipo === 'equipo_b' ? jugadoresB : [];

  // Expelled (roja) — cannot receive more events
  const expulsados = new Set(
    gameEvents.filter(e => e.tipo_evento === 'tarjeta_roja').map(e => e.jugador_id_normalized).filter(Boolean)
  );

  const canAdd = newTipo && newEquipo && newJugadorId !== null && newMinuto >= 0;

  const handleAdd = async () => {
    if (!canAdd) return;
    setSaving(true);
    try {
      await onAddEvent(newTipo, newEquipo, newJugadorId, true, {
        minuto: newMinuto,
        periodo: selectedTiempo,
      });
      // reset form but keep tiempo and equipo for quick consecutive events
      setNewTipo('');
      setNewJugadorId(null);
    } finally {
      setSaving(false);
    }
  };

  // Default minuto when tiempo changes
  const handleTiempoChange = (t: 1 | 2) => {
    setSelectedTiempo(t);
    setNewMinuto(t === 1 ? 22 : 67);
    setNewJugadorId(null);
  };

  const currentEvents = byTiempo[selectedTiempo];

  const totalGolesA = countGoles(1, 'equipo_a') + countGoles(2, 'equipo_a');
  const totalGolesB = countGoles(1, 'equipo_b') + countGoles(2, 'equipo_b');

  return (
    <div className="space-y-5">
      {/* Total score */}
      <div className="grid grid-cols-3 items-center gap-2 py-4 px-3 sm:px-4 rounded-2xl border border-white/10 bg-white/[0.05]">
        <div className="text-left min-w-0">
          <p className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-wide truncate">{nameA}</p>
          <span className="text-3xl font-black text-white tabular-nums">{match.marcador_detalle?.goles_a ?? totalGolesA}</span>
        </div>
        <span className="text-white/25 font-black text-lg text-center shrink-0">vs</span>
        <div className="text-right min-w-0">
          <p className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-wide truncate">{nameB}</p>
          <span className="text-3xl font-black text-white tabular-nums">{match.marcador_detalle?.goles_b ?? totalGolesB}</span>
        </div>
      </div>

      {/* Manual score toggle */}
      <button
        type="button"
        onClick={() => manualMode ? setManualMode(false) : initManualMode()}
        className={cn(
          "w-full min-h-[48px] rounded-xl px-4 text-sm font-black uppercase tracking-wide transition-all active:scale-[0.99] border touch-manipulation",
          manualMode
            ? "bg-amber-500/20 border-amber-400/40 text-amber-100"
            : "bg-white/[0.08] border-white/20 text-white/90 hover:bg-white/[0.12]"
        )}
      >
        {manualMode ? 'Cerrar edición manual' : 'Editar marcador manualmente'}
      </button>

      {manualMode && (
        <div className="space-y-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-xs font-black text-amber-100 uppercase tracking-wide">Marcador manual</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-bold text-white/75 text-center truncate">{nameA}</p>
              <div className="flex items-center justify-center gap-1 bg-white/[0.06] rounded-xl border border-white/10 p-1">
                <button type="button" onClick={() => setManualGolesA(Math.max(0, manualGolesA - 1))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/80 active:scale-95 text-lg font-bold touch-manipulation">−</button>
                <input type="number" inputMode="numeric" min={0} value={manualGolesA}
                  onChange={(e) => setManualGolesA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-3xl font-black text-white tabular-nums text-center bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => setManualGolesA(manualGolesA + 1)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 font-bold text-white touch-manipulation"
                  style={{ background: `${SPORT_COLOR}45`, border: `1px solid ${SPORT_COLOR}70` }}>+</button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-white/75 text-center truncate">{nameB}</p>
              <div className="flex items-center justify-center gap-1 bg-white/[0.06] rounded-xl border border-white/10 p-1">
                <button type="button" onClick={() => setManualGolesB(Math.max(0, manualGolesB - 1))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/80 active:scale-95 text-lg font-bold touch-manipulation">−</button>
                <input type="number" inputMode="numeric" min={0} value={manualGolesB}
                  onChange={(e) => setManualGolesB(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-3xl font-black text-white tabular-nums text-center bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => setManualGolesB(manualGolesB + 1)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 font-bold text-white touch-manipulation"
                  style={{ background: 'rgba(59,130,246,0.45)', border: '1px solid rgba(96,165,250,0.55)' }}>+</button>
              </div>
            </div>
          </div>
          <button type="button" onClick={saveManualScore} disabled={savingManual}
            className="w-full min-h-[52px] rounded-2xl font-black text-sm uppercase tracking-wide text-zinc-950 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
            style={{ background: SPORT_COLOR, boxShadow: `0 4px 20px ${SPORT_COLOR}40` }}>
            {savingManual ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {savingManual ? 'Guardando...' : 'Confirmar Marcador'}
          </button>
        </div>
      )}

      {/* Mini scoreboards per tiempo */}
      <div className="flex gap-2">
        <MiniScore
          label="1º Tiempo"
          golesA={countGoles(1, 'equipo_a')}
          golesB={countGoles(1, 'equipo_b')}
          nameA={nameA}
          nameB={nameB}
          active={selectedTiempo === 1}
          onClick={() => handleTiempoChange(1)}
        />
        <MiniScore
          label="2º Tiempo"
          golesA={countGoles(2, 'equipo_a')}
          golesB={countGoles(2, 'equipo_b')}
          nameA={nameA}
          nameB={nameB}
          active={selectedTiempo === 2}
          onClick={() => handleTiempoChange(2)}
        />
      </div>

      {/* Events list for selected tiempo */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-white/75">
            Eventos — {selectedTiempo === 1 ? '1º Tiempo' : '2º Tiempo'}
          </span>
          <span className="text-xs font-black text-white/50 tabular-nums shrink-0">{currentEvents.length}</span>
        </div>

        {currentEvents.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Sin eventos en este tiempo</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {currentEvents.map((e) => {
              const isA = e.equipo === 'equipo_a';
              const playerName = e.jugadores?.nombre || (isA ? nameA : nameB);
              const icon = EVENT_ICON[e.tipo_evento] || '📌';
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group">
                  {/* Equipo side indicator */}
                  <div className={cn(
                    "w-1 h-8 rounded-full shrink-0",
                    isA ? "bg-emerald-500/60" : "bg-blue-500/60"
                  )} />

                  <span className="text-lg shrink-0">{icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white truncate">{playerName}</p>
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">
                      {isA ? nameA : nameB} · {e.minuto ?? '?'}'
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteEvent(e)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/15 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all active:scale-95 shrink-0 touch-manipulation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add event form */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-4">
        <p className="text-xs font-black uppercase tracking-wide text-white/70">
          Agregar evento · {selectedTiempo === 1 ? '1º Tiempo' : '2º Tiempo'}
        </p>

        {/* Tipo */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {TIPOS_FUTBOL.map(t => (
            <button
              type="button"
              key={t.value}
              onClick={() => setNewTipo(t.value)}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 transition-all active:scale-[0.98] text-center touch-manipulation"
              style={newTipo === t.value
                ? { background: `${SPORT_COLOR}22`, borderColor: `${SPORT_COLOR}`, boxShadow: `0 0 14px ${SPORT_COLOR}30` }
                : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' }
              }
            >
              <span className="text-2xl leading-none">{t.icon}</span>
              <span className={cn("text-[11px] sm:text-xs font-black uppercase tracking-wide leading-tight px-0.5",
                newTipo === t.value ? "text-emerald-200" : "text-white/80"
              )}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Equipo */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {(['equipo_a', 'equipo_b'] as const).map(eq => (
            <button
              type="button"
              key={eq}
              onClick={() => { setNewEquipo(eq); setNewJugadorId(null); }}
              className="flex-1 min-h-[48px] rounded-xl border-2 px-2 py-2.5 text-sm font-black uppercase tracking-wide transition-all active:scale-[0.98] touch-manipulation [overflow-wrap:anywhere] leading-snug"
              style={newEquipo === eq
                ? { background: `${SPORT_COLOR}18`, borderColor: `${SPORT_COLOR}55`, color: '#ecfdf5' }
                : { background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.88)' }
              }
            >
              {eq === 'equipo_a' ? nameA : nameB}
            </button>
          ))}
        </div>

        {/* Jugador */}
        {newEquipo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-white/65">Jugador</p>
              {onAddPlayer && (
                <button
                  type="button"
                  onClick={() => setAddingPlayer(!addingPlayer)}
                  className="min-h-[40px] px-3 text-xs font-black uppercase tracking-wide rounded-lg border transition-all touch-manipulation"
                  style={addingPlayer 
                    ? { background: `${SPORT_COLOR}25`, color: SPORT_COLOR, borderColor: `${SPORT_COLOR}40` }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  {addingPlayer ? '✕ Cancelar' : '+ Nuevo'}
                </button>
              )}
            </div>

            {addingPlayer && (
              <PlayerSearchForm
                match={match}
                team={newEquipo}
                sportColor={SPORT_COLOR}
                onSelect={async (data) => {
                  const id = await onAddPlayer?.(newEquipo, data);
                  if (id) setNewJugadorId(id);
                  setAddingPlayer(false);
                }}
                onCancel={() => setAddingPlayer(false)}
              />
            )}

            {jugadoresEquipo.length === 0 && !addingPlayer ? (
              <div className="flex items-center gap-2 py-2 text-amber-400/70">
                <AlertCircle size={12} />
                <span className="text-[9px] font-bold">No hay jugadores en el roster de este equipo</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {jugadoresEquipo.map((j: any) => {
                  const isExpelled = expulsados.has(j.id);
                  return (
                    <button
                      key={j.id}
                      disabled={isExpelled}
                      onClick={() => setNewJugadorId(j.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all active:scale-95",
                        isExpelled ? "opacity-30 cursor-not-allowed" : "hover:bg-white/5"
                      )}
                      style={newJugadorId === j.id
                        ? { background: `${SPORT_COLOR}15`, borderColor: `${SPORT_COLOR}40` }
                        : { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }
                      }
                    >
                      {j.numero && (
                        <span className="text-[9px] font-black text-white/30 tabular-nums w-5 text-center shrink-0">
                          {j.numero}
                        </span>
                      )}
                      <span className={cn(
                        "text-sm font-bold truncate",
                        newJugadorId === j.id ? "text-emerald-300" : "text-white/85"
                      )}>
                        {j.nombre}
                      </span>
                      {isExpelled && <span className="text-[8px] ml-auto shrink-0">🟥</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Minuto */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-white/65 shrink-0">Minuto</p>
          <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl border border-white/12 p-1">
            <button
              type="button"
              onClick={() => setNewMinuto(v => Math.max(0, v - 1))}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/80 active:scale-95 text-lg font-bold touch-manipulation"
            >−</button>
            <input
              type="number"
              value={newMinuto}
              onChange={e => setNewMinuto(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 bg-transparent text-center text-xl font-black text-white tabular-nums outline-none"
            />
            <button
              type="button"
              onClick={() => setNewMinuto(v => v + 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 font-bold text-white touch-manipulation"
              style={{ background: `${SPORT_COLOR}40`, border: `1px solid ${SPORT_COLOR}65` }}
            >+</button>
          </div>
          <span className="text-sm text-white/50 font-bold">&apos;</span>
        </div>

        {/* Confirm */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd || saving}
          className="w-full min-h-[52px] rounded-2xl font-black text-sm uppercase tracking-wide transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation border-2"
          style={canAdd && !saving
            ? { background: SPORT_COLOR, color: '#052e16', borderColor: 'transparent', boxShadow: `0 4px 20px ${SPORT_COLOR}40` }
            : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.12)' }
          }
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? 'Guardando...' : 'Agregar Evento'}
        </button>
      </div>
    </div>
  );
}
