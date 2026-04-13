"use client";

import { useState, useMemo } from "react";
import { Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { PlayerSearchForm } from "./player-search-form";

interface FutbolEditorProps {
  match: any;
  eventos: any[];
  jugadoresA: any[];
  jugadoresB: any[];
  onAddEvent: (tipo: string, equipo: string, jugadorId: number | null, bypass: boolean, overrides: { minuto: number; periodo: number }) => void;
  onDeleteEvent: (evento: any) => void;
  onAddPlayer?: (team: string, data: any) => Promise<number | null>;
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
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all active:scale-95",
        active
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
      )}
    >
      <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", active ? "text-emerald-400" : "text-white/30")}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-black text-white tabular-nums">{golesA}</span>
        <span className="text-white/20 font-black">:</span>
        <span className="text-2xl font-black text-white tabular-nums">{golesB}</span>
      </div>
      <div className="flex items-center gap-2 text-[8px] text-white/30 font-bold uppercase tracking-wider">
        <span className="truncate max-w-[60px]">{nameA}</span>
        <span>vs</span>
        <span className="truncate max-w-[60px]">{nameB}</span>
      </div>
    </button>
  );
}

export function FutbolEditor({ match, eventos, jugadoresA, jugadoresB, onAddEvent, onDeleteEvent, onAddPlayer }: FutbolEditorProps) {
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

  return (
    <div className="space-y-5">
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
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            Eventos — {selectedTiempo === 1 ? '1º Tiempo' : '2º Tiempo'}
          </span>
          <span className="text-[9px] font-black text-white/20 tabular-nums">{currentEvents.length}</span>
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
                    onClick={() => onDeleteEvent(e)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0"
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
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          Agregar evento · {selectedTiempo === 1 ? '1º Tiempo' : '2º Tiempo'}
        </p>

        {/* Tipo */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {TIPOS_FUTBOL.map(t => (
            <button
              key={t.value}
              onClick={() => setNewTipo(t.value)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all active:scale-95 text-center"
              style={newTipo === t.value
                ? { background: `${SPORT_COLOR}20`, borderColor: `${SPORT_COLOR}50`, boxShadow: `0 0 12px ${SPORT_COLOR}20` }
                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }
              }
            >
              <span className="text-xl">{t.icon}</span>
              <span className={cn("text-[8px] font-black uppercase tracking-wider leading-tight",
                newTipo === t.value ? "text-emerald-400" : "text-white/30"
              )}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Equipo */}
        <div className="flex gap-2">
          {(['equipo_a', 'equipo_b'] as const).map(eq => (
            <button
              key={eq}
              onClick={() => { setNewEquipo(eq); setNewJugadorId(null); }}
              className="flex-1 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
              style={newEquipo === eq
                ? { background: `${SPORT_COLOR}15`, borderColor: `${SPORT_COLOR}40`, color: SPORT_COLOR }
                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
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
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Jugador</p>
              {onAddPlayer && (
                <button
                  onClick={() => setAddingPlayer(!addingPlayer)}
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border transition-all"
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
                        "text-[10px] font-bold truncate",
                        newJugadorId === j.id ? "text-emerald-400" : "text-white/70"
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
        <div className="flex items-center gap-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 shrink-0">Minuto</p>
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl border border-white/[0.06] p-1">
            <button
              onClick={() => setNewMinuto(v => Math.max(0, v - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold"
            >−</button>
            <input
              type="number"
              value={newMinuto}
              onChange={e => setNewMinuto(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 bg-transparent text-center text-xl font-black text-white tabular-nums outline-none"
            />
            <button
              onClick={() => setNewMinuto(v => v + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 font-bold"
              style={{ color: SPORT_COLOR, background: `${SPORT_COLOR}20` }}
            >+</button>
          </div>
          <span className="text-[9px] text-white/20 font-bold">&apos;</span>
        </div>

        {/* Confirm */}
        <button
          onClick={handleAdd}
          disabled={!canAdd || saving}
          className="w-full h-11 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={canAdd && !saving
            ? { background: SPORT_COLOR, color: '#000', boxShadow: `0 4px 20px ${SPORT_COLOR}40` }
            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }
          }
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {saving ? 'Guardando...' : 'Agregar Evento'}
        </button>
      </div>
    </div>
  );
}
