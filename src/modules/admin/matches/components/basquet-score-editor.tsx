"use client";

import { useState, useMemo } from "react";
import { Trash2, Loader2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { PlayerSearchForm } from "./player-search-form";
import { supabase } from "@/lib/supabase";
import { stampAudit } from "@/lib/audit-helpers";
import { recalculateTotals } from "@/lib/sport-scoring";
import { toast } from "sonner";

interface BasquetEditorProps {
  match: any;
  eventos: any[];
  jugadoresA: any[];
  jugadoresB: any[];
  onAddEvent: (
    tipo: string,
    equipo: string,
    jugadorId: number | null,
    bypass: boolean,
    overrides: { minuto: number; periodo: number }
  ) => void;
  onDeleteEvent: (evento: any) => void;
  onAddPlayer?: (team: string, data: any) => Promise<number | null>;
  profile?: any;
  onSaved?: () => void | Promise<void>;
}

const SPORT_COLOR = '#f97316';
function getCuarto(e: any): number {
  const p = e.periodo;
  if (p >= 1) return p as number;
  const m = e.minuto ?? 0;
  if (m <= 12) return 1;
  if (m <= 24) return 2;
  if (m <= 36) return 3;
  if (m <= 48) return 4;
  return 5; // Fallback to OT1 if unknown but past Q4
}

function ptsOf(tipo: string) {
  return tipo === 'punto_1' ? 1 : tipo === 'punto_2' ? 2 : tipo === 'punto_3' ? 3 : 0;
}

function PtButton({
  label, pts, color, loading, onClick,
}: { label: string; pts: number; color: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "touch-manipulation inline-flex flex-col items-center justify-center gap-0.5 rounded-xl border-2",
        "min-h-[48px] min-w-[52px] flex-1 px-1.5 py-2 sm:min-h-[52px] sm:min-w-[56px] sm:flex-none sm:px-2",
        "bg-[#101014] text-white shadow-inner transition-[transform,colors] active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400/50"
      )}
      style={{
        borderColor: color,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px ${color}33`,
      }}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin text-white/80" />
      ) : (
        <>
          <span className="text-base sm:text-lg font-black tabular-nums leading-none" style={{ color }}>
            {label}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-white/85">
            {pts} pt{pts > 1 ? 's' : ''}
          </span>
        </>
      )}
    </button>
  );
}

export function BasquetEditor({
  match,
  eventos,
  jugadoresA,
  jugadoresB,
  onAddEvent,
  onDeleteEvent,
  onAddPlayer,
  profile,
  onSaved,
}: BasquetEditorProps) {
  const detalleCuartos = match.marcador_detalle?.cuartos || {};
  const currentPeriodInMatch = match.marcador_detalle?.cuarto_actual || 1;
  
  // Dynamic list of quarters/periods
  const CUARTOS = useMemo(() => {
    const base = [1, 2, 3, 4];
    const fromEvents = eventos.map(e => e.periodo).filter(p => p > 4);
    const fromDetalle = Object.keys(detalleCuartos).map(Number).filter(p => p > 4);
    return Array.from(new Set([...base, ...fromEvents, ...fromDetalle, currentPeriodInMatch])).sort((a,b) => a-b);
  }, [eventos, detalleCuartos, currentPeriodInMatch]);

  const [selectedCuarto, setSelectedCuarto] = useState<number>(currentPeriodInMatch);
  const [loadingKey, setLoadingKey] = useState<string | null>(null); // "jugadorId-tipo"
  const [showEvents, setShowEvents] = useState(false);
  const [addingPlayerTeam, setAddingPlayerTeam] = useState<string | null>(null);

  const nameA = getDisplayName(match, 'a');
  const nameB = getDisplayName(match, 'b');

  const gameEvents = useMemo(
    () => eventos.filter(e => e.equipo !== 'sistema'),
    [eventos]
  );

  const byCuarto = useMemo(() => {
    const map: Record<number, any[]> = {};
    CUARTOS.forEach(q => { map[q] = []; });
    gameEvents.forEach(e => { 
      const q = getCuarto(e);
      if (!map[q]) map[q] = [];
      map[q].push(e); 
    });
    return map;
  }, [gameEvents, CUARTOS]);

  // Points per player per cuarto (from events)
  const playerPts = useMemo(() => {
    const map: Record<string, number> = {};
    byCuarto[selectedCuarto]?.forEach(e => {
      const pts = ptsOf(e.tipo_evento);
      if (pts === 0) return;
      const key = e.jugador_id_normalized != null ? `j${e.jugador_id_normalized}` : `eq${e.equipo}`;
      map[key] = (map[key] || 0) + pts;
    });
    return map;
  }, [byCuarto, selectedCuarto]);

  // Quarter aggregate from marcador_detalle (source of truth for totals)
  // Quarter aggregate from marcador_detalle (source of truth for totals)
  const qA = (q: number) => detalleCuartos[q]?.puntos_a ?? 0;
  const qB = (q: number) => detalleCuartos[q]?.puntos_b ?? 0;
  const totalA = CUARTOS.reduce((s, q) => s + qA(q), 0);
  const totalB = CUARTOS.reduce((s, q) => s + qB(q), 0);

  const addPoint = async (tipo: string, equipo: 'equipo_a' | 'equipo_b', jugadorId: number | null) => {
    const key = `${jugadorId ?? 'none'}-${tipo}-${equipo}`;
    setLoadingKey(key);
    const midMinute = selectedCuarto * 12 - 6;
    try {
      await onAddEvent(tipo, equipo, jugadorId, true, { minuto: midMinute, periodo: selectedCuarto });
    } finally {
      setLoadingKey(null);
    }
  };

  const pointEvents = byCuarto[selectedCuarto]?.filter(e => ptsOf(e.tipo_evento) > 0) ?? [];

  const renderTeam = (
    jugadores: any[],
    equipo: 'equipo_a' | 'equipo_b',
    teamName: string,
    accentColor: string
  ) => (
    <div className="space-y-1">
      {/* Team header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
          <span className="text-xs sm:text-sm font-black uppercase tracking-wide truncate" style={{ color: accentColor }}>
            {teamName}
          </span>
          <span className="text-xs font-black text-white/70 tabular-nums shrink-0">
            {equipo === 'equipo_a' ? qA(selectedCuarto) : qB(selectedCuarto)} pts
          </span>
        </div>
        {onAddPlayer && (
          <button
            type="button"
            onClick={() => setAddingPlayerTeam(addingPlayerTeam === equipo ? null : equipo)}
            className="min-h-[40px] px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wide transition-all touch-manipulation"
            style={addingPlayerTeam === equipo 
              ? { background: `${accentColor}25`, color: accentColor, borderColor: `${accentColor}50` }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.88)', borderColor: 'rgba(255,255,255,0.18)' }
            }
          >
            + Jugador
          </button>
        )}
      </div>

      {addingPlayerTeam === equipo && (
        <PlayerSearchForm
          match={match}
          team={equipo}
          sportColor={accentColor}
          onSelect={async (data) => {
            await onAddPlayer?.(equipo, data);
            setAddingPlayerTeam(null);
          }}
          onCancel={() => setAddingPlayerTeam(null)}
        />
      )}

      {/* Players */}
      {jugadores.length === 0 ? (
        <div className="px-3 py-3 rounded-xl border border-white/10 bg-white/[0.04]">
          <p className="text-sm text-white/60 font-bold">Sin roster cargado</p>
        </div>
      ) : (
        jugadores.map((j: any) => {
          const jPts = playerPts[`j${j.id}`] ?? 0;
          return (
            <div
              key={j.id}
              className="flex flex-col gap-2.5 px-3 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] sm:flex-row sm:items-center sm:gap-2 sm:py-2"
            >
              {/* Number + name */}
              <div className="flex flex-1 min-w-0 items-center gap-2">
                {j.numero != null && (
                  <span className="text-xs font-black text-white/50 tabular-nums w-6 shrink-0 text-center">
                    {j.numero}
                  </span>
                )}
                <span className="text-sm font-bold text-white/95 [overflow-wrap:anywhere] leading-snug sm:truncate">{j.nombre}</span>
                {jPts > 0 && (
                  <span className="text-sm font-black tabular-nums shrink-0 sm:ml-auto" style={{ color: accentColor }}>
                    +{jPts}
                  </span>
                )}
              </div>

              {/* +1 / +2 / +3 buttons — full width row on mobile for 44px+ targets */}
              <div className="flex w-full gap-2 sm:w-auto sm:shrink-0 sm:gap-1.5">
                {[
                  { tipo: 'punto_1', label: '+1', pts: 1, color: '#f59e0b' },
                  { tipo: 'punto_2', label: '+2', pts: 2, color: '#f97316' },
                  { tipo: 'punto_3', label: '+3', pts: 3, color: '#ef4444' },
                ].map(btn => {
                  const key = `${j.id}-${btn.tipo}-${equipo}`;
                  return (
                    <PtButton
                      key={btn.tipo}
                      label={btn.label}
                      pts={btn.pts}
                      color={btn.color}
                      loading={loadingKey === key}
                      onClick={() => addPoint(btn.tipo, equipo, j.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* "Sin jugador" row */}
      <div className="flex flex-col gap-2.5 px-3 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] sm:flex-row sm:items-center sm:py-2">
        <span className="flex-1 text-sm text-white/70 font-bold">Sin jugador específico</span>
        <div className="flex w-full gap-2 sm:w-auto sm:shrink-0 sm:gap-1.5">
          {[
            { tipo: 'punto_1', label: '+1', pts: 1, color: '#6b7280' },
            { tipo: 'punto_2', label: '+2', pts: 2, color: '#6b7280' },
            { tipo: 'punto_3', label: '+3', pts: 3, color: '#6b7280' },
          ].map(btn => {
            const key = `none-${btn.tipo}-${equipo}`;
            return (
              <PtButton
                key={btn.tipo}
                label={btn.label}
                pts={btn.pts}
                color={btn.color}
                loading={loadingKey === key}
                onClick={() => addPoint(btn.tipo, equipo, null)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  const [manualMode, setManualMode] = useState(false);
  const [manualQuarters, setManualQuarters] = useState<Record<number, { puntos_a: number; puntos_b: number }>>({});
  const [savingManual, setSavingManual] = useState(false);

  const initManualMode = () => {
    const init: Record<number, { puntos_a: number; puntos_b: number }> = {};
    CUARTOS.forEach(q => {
      init[q] = { puntos_a: qA(q), puntos_b: qB(q) };
    });
    setManualQuarters(init);
    setManualMode(true);
  };

  const saveManualScores = async () => {
    setSavingManual(true);
    try {
      const { data: fresh } = await supabase
        .from('partidos').select('marcador_detalle').eq('id', match.id).single();
      let newDetalle = { ...(fresh?.marcador_detalle || match.marcador_detalle || {}) };
      newDetalle.cuartos = manualQuarters;
      newDetalle.cuarto_actual = Math.max(...Object.keys(manualQuarters).map(Number));
      newDetalle = recalculateTotals('Baloncesto', newDetalle);
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

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="grid grid-cols-3 items-center gap-2 py-4 px-3 sm:px-4 rounded-2xl border border-white/10 bg-white/[0.05]">
        <div className="text-left min-w-0">
          <p className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-wide truncate">{nameA}</p>
          <span className="text-3xl font-black text-white tabular-nums">{totalA}</span>
        </div>
        <span className="text-white/25 font-black text-lg text-center shrink-0">vs</span>
        <div className="text-right min-w-0">
          <p className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-wide truncate">{nameB}</p>
          <span className="text-3xl font-black text-white tabular-nums">{totalB}</span>
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

      {/* Manual score editor */}
      {manualMode && (
        <div className="space-y-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-xs font-black text-amber-100 uppercase tracking-wide">Marcador manual por cuarto</p>
          <div className="grid grid-cols-[44px_1fr_1fr] gap-2 items-center px-1 mb-1">
            <span />
            <p className="text-[11px] sm:text-xs font-black text-white/75 uppercase tracking-wide text-center truncate">{nameA}</p>
            <p className="text-[11px] sm:text-xs font-black text-white/75 uppercase tracking-wide text-center truncate">{nameB}</p>
          </div>
          {Object.keys(manualQuarters).map(Number).sort((a, b) => a - b).map(q => (
            <div key={q} className="grid grid-cols-[44px_1fr_1fr] gap-2 items-center">
              <span className="text-[10px] font-black text-center" style={{ color: `${SPORT_COLOR}90` }}>
                {q <= 4 ? `Q${q}` : `OT${q-4}`}
              </span>
              <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded-xl border border-white/[0.06] p-1">
                <button type="button" onClick={() => setManualQuarters(prev => ({ ...prev, [q]: { ...prev[q], puntos_a: Math.max(0, prev[q].puntos_a - 1) } }))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/80 active:scale-95 text-lg font-bold touch-manipulation">−</button>
                <input type="number" inputMode="numeric" min={0}
                  value={manualQuarters[q]?.puntos_a ?? 0}
                  onChange={(e) => setManualQuarters(prev => ({ ...prev, [q]: { ...prev[q], puntos_a: Math.max(0, parseInt(e.target.value) || 0) } }))}
                  className="w-12 text-xl font-black text-white tabular-nums text-center bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => setManualQuarters(prev => ({ ...prev, [q]: { ...prev[q], puntos_a: prev[q].puntos_a + 1 } }))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 font-bold touch-manipulation"
                  style={{ color: '#fff', background: `${SPORT_COLOR}35`, border: `1px solid ${SPORT_COLOR}55` }}>+</button>
              </div>
              <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded-xl border border-white/[0.06] p-1">
                <button type="button" onClick={() => setManualQuarters(prev => ({ ...prev, [q]: { ...prev[q], puntos_b: Math.max(0, prev[q].puntos_b - 1) } }))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/80 active:scale-95 text-lg font-bold touch-manipulation">−</button>
                <input type="number" inputMode="numeric" min={0}
                  value={manualQuarters[q]?.puntos_b ?? 0}
                  onChange={(e) => setManualQuarters(prev => ({ ...prev, [q]: { ...prev[q], puntos_b: Math.max(0, parseInt(e.target.value) || 0) } }))}
                  className="w-12 text-xl font-black text-white tabular-nums text-center bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="button" onClick={() => setManualQuarters(prev => ({ ...prev, [q]: { ...prev[q], puntos_b: prev[q].puntos_b + 1 } }))}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg active:scale-95 font-bold touch-manipulation text-white"
                  style={{ background: 'rgba(59,130,246,0.45)', border: '1px solid rgba(96,165,250,0.55)' }}>+</button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[44px_1fr_1fr] gap-2 items-center border-t border-white/10 pt-3">
            <span className="text-[8px] font-black text-white/20 uppercase text-center">Tot</span>
            <span className="text-2xl font-black text-white tabular-nums text-center">{Object.values(manualQuarters).reduce((s, q) => s + q.puntos_a, 0)}</span>
            <span className="text-2xl font-black text-white tabular-nums text-center">{Object.values(manualQuarters).reduce((s, q) => s + q.puntos_b, 0)}</span>
          </div>
          <button type="button" onClick={saveManualScores} disabled={savingManual}
            className="w-full min-h-[52px] rounded-2xl font-black text-sm uppercase tracking-wide text-zinc-950 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
            style={{ background: SPORT_COLOR, boxShadow: `0 4px 20px ${SPORT_COLOR}40` }}>
            {savingManual ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {savingManual ? 'Guardando...' : 'Confirmar Marcador'}
          </button>
        </div>
      )}

      {/* Quarter selector */}
      <div className="grid grid-cols-4 gap-2">
        {CUARTOS.map(q => {
          const active = selectedCuarto === q;
          return (
            <button
              type="button"
              key={q}
              onClick={() => setSelectedCuarto(q)}
              className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2 transition-colors active:scale-[0.98] touch-manipulation"
              style={active
                ? { background: `${SPORT_COLOR}28`, borderColor: `${SPORT_COLOR}`, color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.82)' }
              }
            >
              <span className="text-sm font-black">{q <= 4 ? `Q${q}` : `OT${q-4}`}</span>
              <span className="text-[11px] tabular-nums font-bold text-white/70">{qA(q)}–{qB(q)}</span>
            </button>
          );
        })}
      </div>

      {/* Team A players */}
      {renderTeam(jugadoresA, 'equipo_a', nameA, '#f97316')}

      <div className="border-t border-white/5" />

      {/* Team B players */}
      {renderTeam(jugadoresB, 'equipo_b', nameB, '#3b82f6')}

      {/* Events log toggle */}
      <button
        type="button"
        onClick={() => setShowEvents(v => !v)}
        className="w-full min-h-[48px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/[0.06] text-sm font-black uppercase tracking-wide text-white/80 touch-manipulation"
      >
        <span>Historial Q{selectedCuarto} · {pointEvents.length} eventos</span>
        {showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showEvents && pointEvents.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden divide-y divide-white/[0.03]">
          {pointEvents.map(e => {
            const isA = e.equipo === 'equipo_a';
            const pts = ptsOf(e.tipo_evento);
            const player = e.jugadores?.nombre || null;
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 group">
                <div className={cn("w-1 h-6 rounded-full shrink-0", isA ? "bg-orange-500/50" : "bg-blue-500/50")} />
                <span className="text-[11px] font-black tabular-nums w-7 shrink-0"
                  style={{ color: pts === 3 ? '#ef4444' : pts === 2 ? '#f97316' : '#f59e0b' }}>
                  +{pts}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">
                    {player ?? <span className="text-white/30 italic">Sin jugador</span>}
                  </p>
                  <p className="text-[9px] text-white/30">{isA ? nameA : nameB} · {e.minuto}'</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteEvent(e)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/15 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all active:scale-95 shrink-0 touch-manipulation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
