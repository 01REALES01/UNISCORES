"use client";

import { useState, useMemo } from "react";
import { Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BASELINE,
  DI_MANUAL_TYPES,
  getDIRows,
  calcularDI,
  type DIRow,
} from "@/modules/matches/utils/deporte-integral";

interface Jugador {
  id: number;
  nombre: string;
  numero?: number | null;
}

interface Evento {
  id: number;
  tipo_evento: string;
  equipo: string;
  jugador_id?: number | null;
  jugadores?: { nombre: string } | null;
}

interface Props {
  partidoId: number;
  equipoA: string;
  equipoB: string;
  rosterA: Jugador[];
  rosterB: Jugador[];
  eventos: Evento[];
  onRefresh: () => void;
}

type TeamSide = "equipo_a" | "equipo_b";

function diEventLabel(tipo: string, rows: DIRow[]): string {
  return rows.find((r) => r.id === tipo)?.label ?? tipo;
}

export function BasquetDeporteIntegral({
  partidoId,
  equipoA,
  equipoB,
  rosterA,
  rosterB,
  eventos,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  // Player picker state: { tipo, equipo } or null
  const [picking, setPicking] = useState<{ tipo: string; equipo: TeamSide } | null>(null);

  const rows = useMemo(() => getDIRows("baloncesto"), []);

  const diEventos = useMemo(
    () => eventos.filter((e) => e.tipo_evento in (
      Object.fromEntries(rows.map((r) => [r.id, true]))
    )),
    [eventos, rows]
  );

  const { a: scoreA, b: scoreB } = useMemo(() => calcularDI(diEventos, "baloncesto"), [diEventos]);

  const countFor = (tipo: string, equipo: TeamSide) =>
    diEventos.filter((e) => e.tipo_evento === tipo && e.equipo === equipo).length;

  const manualEventos = useMemo(
    () => diEventos.filter((e) => DI_MANUAL_TYPES.has(e.tipo_evento)),
    [diEventos]
  );

  const addEvent = async (tipo: string, equipo: TeamSide, jugadorId?: number | null) => {
    const key = `${tipo}-${equipo}`;
    setLoading(key);
    try {
      const res = await fetch("/api/admin/deporte-integral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partido_id: partidoId, equipo, tipo_evento: tipo, jugador_id: jugadorId ?? null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error desconocido");
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
      setPicking(null);
    }
  };

  const deleteEvent = async (eventoId: number) => {
    setLoading(`del-${eventoId}`);
    try {
      const res = await fetch("/api/admin/deporte-integral", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento_id: eventoId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error desconocido");
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAddClick = (row: DIRow, equipo: TeamSide) => {
    if (row.requiresPlayer) {
      setPicking({ tipo: row.id, equipo });
    } else {
      addEvent(row.id, equipo);
    }
  };

  const scoreColor = (score: number) =>
    score === BASELINE
      ? "text-white/70"
      : score >= 1900
      ? "text-sky-400"
      : score >= 1800
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full min-h-[48px] rounded-xl px-4 text-sm font-black uppercase tracking-wide transition-all active:scale-[0.99] border touch-manipulation",
          open
            ? "bg-slate-700/60 border-slate-400/40 text-slate-100"
            : "bg-white/[0.08] border-white/20 text-white/90 hover:bg-white/[0.12]"
        )}
      >
        {open ? "Cerrar Deporte Integral" : "Deporte Integral"}
      </button>

      {open && (
        <div className="space-y-4 p-4 rounded-2xl border border-slate-500/30 bg-slate-800/30">
          {/* Scoreboard */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { name: equipoA, score: scoreA },
                { name: equipoB, score: scoreB },
              ] as const
            ).map(({ name, score }) => (
              <div
                key={name}
                className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] py-3 px-2"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate max-w-full text-center">
                  {name}
                </span>
                <span className={cn("text-2xl font-black tabular-nums mt-1", scoreColor(score))}>
                  {score}
                </span>
                <span className="text-[9px] text-white/20 font-bold uppercase mt-0.5">pts</span>
              </div>
            ))}
          </div>

          {/* Player picker overlay */}
          {picking && (
            <div className="rounded-xl border border-white/15 bg-black/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-white/70">
                  Seleccionar jugador
                </p>
                <button
                  type="button"
                  onClick={() => setPicking(null)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(picking.equipo === "equipo_a" ? rosterA : rosterB).map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    disabled={!!loading}
                    onClick={() => addEvent(picking.tipo, picking.equipo, j.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-left transition-all touch-manipulation disabled:opacity-50"
                  >
                    {j.numero != null && (
                      <span className="text-xs font-black tabular-nums text-white/40 w-5 text-center shrink-0">
                        {j.numero}
                      </span>
                    )}
                    <span className="text-sm font-bold text-white/90 truncate">{j.nombre}</span>
                    {loading === `${picking.tipo}-${picking.equipo}` && (
                      <Loader2 size={12} className="animate-spin text-white/50 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
                {(picking.equipo === "equipo_a" ? rosterA : rosterB).length === 0 && (
                  <p className="text-xs text-white/30 font-bold text-center py-2">Sin roster cargado</p>
                )}
              </div>
            </div>
          )}

          {/* Infractions table */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_56px_56px] gap-2 px-3 py-2 border-b border-white/10 bg-white/[0.03]">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Infracción</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 text-center truncate">{equipoA}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 text-center truncate">{equipoB}</span>
            </div>

            {rows.map((row, idx) => {
              const isLast = idx === rows.length - 1;
              const cntA = countFor(row.id, "equipo_a");
              const cntB = countFor(row.id, "equipo_b");
              const isAutoRow = !row.manual;

              return (
                <div
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[1fr_56px_56px] gap-2 px-3 py-2.5 items-center",
                    !isLast && "border-b border-white/[0.05]",
                    isAutoRow ? "bg-white/[0.01]" : ""
                  )}
                >
                  {/* Label */}
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white/80 leading-snug">{row.label}</p>
                    <p className="text-[9px] font-black text-rose-400/70 mt-0.5">
                      {row.penalty} pts{isAutoRow && <span className="text-white/25 font-bold ml-1">· auto</span>}
                    </p>
                  </div>

                  {/* Equipo A cell */}
                  <div className="flex items-center justify-center">
                    {isAutoRow ? (
                      <AutoBadge count={cntA} />
                    ) : (
                      <AddButton
                        count={cntA}
                        loading={loading === `${row.id}-equipo_a`}
                        onClick={() => handleAddClick(row, "equipo_a")}
                      />
                    )}
                  </div>

                  {/* Equipo B cell */}
                  <div className="flex items-center justify-center">
                    {isAutoRow ? (
                      <AutoBadge count={cntB} />
                    ) : (
                      <AddButton
                        count={cntB}
                        loading={loading === `${row.id}-equipo_b`}
                        onClick={() => handleAddClick(row, "equipo_b")}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manual events log */}
          {manualEventos.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowLog((v) => !v)}
                className="w-full min-h-[40px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-wide text-white/50 touch-manipulation"
              >
                <span>Registro manual · {manualEventos.length} entrada{manualEventos.length !== 1 ? "s" : ""}</span>
                {showLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showLog && (
                <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/[0.04]">
                  {manualEventos.map((e) => {
                    const isA = e.equipo === "equipo_a";
                    const delKey = `del-${e.id}`;
                    return (
                      <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 group">
                        <div className={cn("w-1 h-5 rounded-full shrink-0", isA ? "bg-orange-500/50" : "bg-blue-500/50")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-white/80 truncate">
                            {diEventLabel(e.tipo_evento, rows)}
                          </p>
                          <p className="text-[9px] text-white/30">
                            {isA ? equipoA : equipoB}
                            {e.jugadores?.nombre && ` · ${e.jugadores.nombre}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteEvent(e.id)}
                          disabled={!!loading}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/15 transition-all active:scale-95 shrink-0 touch-manipulation disabled:opacity-40 opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          {loading === delKey ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AutoBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-[11px] font-bold text-white/15">—</span>;
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md bg-white/10 border border-white/15 text-[11px] font-black tabular-nums text-white/70">
      {count}
    </span>
  );
}

function AddButton({
  count,
  loading,
  onClick,
}: {
  count: number;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center justify-center gap-1 min-h-[32px] min-w-[44px] px-2 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white active:scale-95 transition-all touch-manipulation disabled:opacity-40 text-[11px] font-black"
    >
      {loading ? (
        <Loader2 size={11} className="animate-spin" />
      ) : (
        <>
          <span className="text-white/40">+</span>
          {count > 0 && <span className="tabular-nums">{count}</span>}
          {count === 0 && <span className="text-white/30">0</span>}
        </>
      )}
    </button>
  );
}
