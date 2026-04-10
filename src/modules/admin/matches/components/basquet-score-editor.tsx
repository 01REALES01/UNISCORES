"use client";

import { useState, useMemo } from "react";
import { Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";

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
}

const SPORT_COLOR = '#f97316';
const CUARTOS = [1, 2, 3, 4] as const;
type Cuarto = 1 | 2 | 3 | 4;

function getCuarto(e: any): Cuarto {
  const p = e.periodo;
  if (p >= 1 && p <= 4) return p as Cuarto;
  const m = e.minuto ?? 0;
  if (m <= 12) return 1;
  if (m <= 24) return 2;
  if (m <= 36) return 3;
  return 4;
}

function ptsOf(tipo: string) {
  return tipo === 'punto_1' ? 1 : tipo === 'punto_2' ? 2 : tipo === 'punto_3' ? 3 : 0;
}

function PtButton({
  label, pts, color, loading, onClick,
}: { label: string; pts: number; color: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center justify-center rounded-xl border active:scale-90 transition-colors disabled:opacity-40 py-2 px-1 min-w-[48px]"
      style={{ background: `${color}18`, borderColor: `${color}40`, color }}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <span className="text-sm font-black">{label}</span>}
      <span className="text-[7px] font-bold opacity-60 uppercase tracking-wider mt-0.5">{pts}pt{pts > 1 ? 's' : ''}</span>
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
}: BasquetEditorProps) {
  const [selectedCuarto, setSelectedCuarto] = useState<Cuarto>(1);
  const [loadingKey, setLoadingKey] = useState<string | null>(null); // "jugadorId-tipo"
  const [showEvents, setShowEvents] = useState(false);

  const nameA = getDisplayName(match, 'a');
  const nameB = getDisplayName(match, 'b');

  const gameEvents = useMemo(
    () => eventos.filter(e => e.equipo !== 'sistema'),
    [eventos]
  );

  const byCuarto = useMemo(() => {
    const map: Record<Cuarto, any[]> = { 1: [], 2: [], 3: [], 4: [] };
    gameEvents.forEach(e => { map[getCuarto(e)]?.push(e); });
    return map;
  }, [gameEvents]);

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
  const detalleCuartos = match.marcador_detalle?.cuartos || {};
  const qA = (q: Cuarto) => detalleCuartos[q]?.puntos_a ?? 0;
  const qB = (q: Cuarto) => detalleCuartos[q]?.puntos_b ?? 0;
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
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] truncate" style={{ color: accentColor }}>
          {teamName}
        </span>
        <span className="text-[10px] font-black text-white/50 ml-auto tabular-nums">
          {equipo === 'equipo_a' ? qA(selectedCuarto) : qB(selectedCuarto)} pts
        </span>
      </div>

      {/* Players */}
      {jugadores.length === 0 ? (
        <div className="px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
          <p className="text-[9px] text-white/25 font-bold">Sin roster cargado</p>
        </div>
      ) : (
        jugadores.map((j: any) => {
          const jPts = playerPts[`j${j.id}`] ?? 0;
          return (
            <div
              key={j.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02]"
            >
              {/* Number + name */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {j.numero != null && (
                  <span className="text-[9px] font-black text-white/25 tabular-nums w-5 shrink-0 text-center">
                    {j.numero}
                  </span>
                )}
                <span className="text-[11px] font-bold text-white truncate">{j.nombre}</span>
              </div>

              {/* Points scored this quarter */}
              {jPts > 0 && (
                <span className="text-[10px] font-black tabular-nums shrink-0" style={{ color: accentColor }}>
                  {jPts}
                </span>
              )}

              {/* +1 / +2 / +3 buttons */}
              <div className="flex gap-1 shrink-0">
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
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.04] bg-transparent">
        <span className="flex-1 text-[10px] text-white/20 font-bold italic">Sin jugador específico</span>
        <div className="flex gap-1 shrink-0">
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

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="grid grid-cols-3 items-center py-3 px-4 rounded-2xl border border-white/5 bg-white/[0.03]">
        <div className="text-left">
          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{nameA}</p>
          <span className="text-3xl font-black text-white tabular-nums">{totalA}</span>
        </div>
        <span className="text-white/10 font-black text-xl text-center">vs</span>
        <div className="text-right">
          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{nameB}</p>
          <span className="text-3xl font-black text-white tabular-nums">{totalB}</span>
        </div>
      </div>

      {/* Quarter selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {CUARTOS.map(q => {
          const active = selectedCuarto === q;
          return (
            <button
              key={q}
              onClick={() => setSelectedCuarto(q)}
              className="flex flex-col items-center py-2 rounded-xl border transition-colors active:scale-95"
              style={active
                ? { background: `${SPORT_COLOR}20`, borderColor: `${SPORT_COLOR}50`, color: SPORT_COLOR }
                : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }
              }
            >
              <span className="text-[11px] font-black">Q{q}</span>
              <span className="text-[9px] tabular-nums font-bold opacity-70">{qA(q)}–{qB(q)}</span>
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
        onClick={() => setShowEvents(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-white/30"
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
                  onClick={() => onDeleteEvent(e)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0"
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
