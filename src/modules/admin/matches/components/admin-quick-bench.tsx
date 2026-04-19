"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Ban,
  Check,
  CircleDot,
  Flag,
  Pencil,
  Square,
  Trash2,
  UserPlus,
  Volleyball,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import { SPORT_COLORS } from "@/lib/constants";
import { PlayerSearchForm } from "./player-search-form";
import type { Evento } from "@/modules/matches/types";

export type QuickBenchAction = {
  value: string;
  label: string;
  icon: string;
  style?: string;
};

type TeamId = "equipo_a" | "equipo_b";

type Props = {
  match: any;
  jugadoresA: any[];
  jugadoresB: any[];
  eventos: Evento[];
  actions: QuickBenchAction[];
  disciplinaName: string;
  onAddEvent: (data: {
    tipo: string;
    equipo: string;
    jugador_id: number | null;
  }) => void | Promise<void>;
  onAddPlayer: (team: string, data: { nombre: string; numero: string; profile_id: string }) => Promise<number | null>;
  /** Dorsal en `jugadores` (próximos partidos). */
  onUpdatePlayerNumero?: (jugadorId: number, raw: string) => void | Promise<void>;
  /** Quitar fila de `roster_partido` de este partido. */
  onRemovePlayerFromRoster?: (rosterId: number) => void | Promise<void>;
};

function isCardTipo(t: string) {
  return t === "tarjeta_amarilla" || t === "tarjeta_roja";
}

function actionNeedsPlayer(disciplinaName: string, tipo: string): boolean {
  if (disciplinaName === "Voleibol" && tipo === "punto") return false;
  return true;
}

function QuickBenchActionIcon({
  actionValue,
  className,
  dimmed,
}: {
  actionValue: string;
  className?: string;
  dimmed?: boolean;
}) {
  const base = cn("shrink-0", dimmed && "opacity-35", className);

  switch (actionValue) {
    case "gol":
      return <CircleDot className={cn(base, "h-6 w-6")} strokeWidth={2.25} />;
    case "tarjeta_amarilla":
      return (
        <Square
          className={cn(base, "h-6 w-6 fill-amber-400/85 text-amber-200")}
          strokeWidth={2}
        />
      );
    case "tarjeta_roja":
      return (
        <Square className={cn(base, "h-6 w-6 fill-red-600/90 text-red-400")} strokeWidth={2} />
      );
    case "cambio":
      return <ArrowLeftRight className={cn(base, "h-6 w-6")} strokeWidth={2.25} />;
    case "falta":
      return <Ban className={cn(base, "h-6 w-6 text-rose-400")} strokeWidth={2.25} />;
    case "punto":
      return <Volleyball className={cn(base, "h-6 w-6")} strokeWidth={2} />;
    case "punto_1":
    case "punto_2":
    case "punto_3": {
      const n = actionValue === "punto_1" ? "1" : actionValue === "punto_2" ? "2" : "3";
      return (
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border-2 border-current text-[12px] font-black leading-none",
            base
          )}
        >
          {n}
        </span>
      );
    }
    default:
      return <Flag className={cn(base, "h-6 w-6 opacity-70")} strokeWidth={2} />;
  }
}

export function AdminQuickBench({
  match,
  jugadoresA,
  jugadoresB,
  eventos,
  actions,
  disciplinaName,
  onAddEvent,
  onAddPlayer,
  onUpdatePlayerNumero,
  onRemovePlayerFromRoster,
}: Props) {
  const sportColor = SPORT_COLORS[disciplinaName] || "#6366f1";
  const isVolleyball = disciplinaName === "Voleibol";
  const isFutbol = disciplinaName === "Fútbol";

  const expelledIds = useMemo(() => {
    if (!isFutbol && !isVolleyball) return new Set<number>();
    return new Set(
      eventos
        .filter((e) => e.tipo_evento === "tarjeta_roja")
        .map((e) => e.jugador_id_normalized)
        .filter((id): id is number => id != null)
    );
  }, [eventos, isFutbol, isVolleyball]);

  const [selected, setSelected] = useState<{ team: TeamId; jugadorId: number } | null>(null);
  const [addingTeam, setAddingTeam] = useState<TeamId | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [draftNumero, setDraftNumero] = useState("");
  const [savingNumero, setSavingNumero] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);

  useEffect(() => {
    if (!selected) return;
    const all = [...jugadoresA, ...jugadoresB];
    if (!all.some((j) => j.id === selected.jugadorId)) {
      setSelected(null);
    }
  }, [jugadoresA, jugadoresB, selected]);

  useEffect(() => {
    if (editingPlayerId == null) return;
    const all = [...jugadoresA, ...jugadoresB];
    if (!all.some((j) => j.id === editingPlayerId)) {
      setEditingPlayerId(null);
      setDraftNumero("");
    }
  }, [jugadoresA, jugadoresB, editingPlayerId]);

  const displayActions = useMemo(
    () =>
      isVolleyball ? actions.filter((a) => a.value !== "punto") : actions,
    [actions, isVolleyball]
  );

  const fireEvent = useCallback(
    async (tipo: string, equipo: TeamId, jugador_id: number | null) => {
      if (savingLock.current) return;
      savingLock.current = true;
      setSaving(true);
      try {
        await Promise.resolve(onAddEvent({ tipo, equipo, jugador_id }));
      } finally {
        savingLock.current = false;
        window.setTimeout(() => setSaving(false), 400);
      }
    },
    [onAddEvent]
  );

  const handleAction = useCallback(
    (tipo: string, equipo: TeamId) => {
      const needsPlayer = actionNeedsPlayer(disciplinaName, tipo);
      if (needsPlayer) {
        if (!selected || selected.team !== equipo) return;
        if (isCardTipo(tipo) && expelledIds.has(selected.jugadorId)) return;
        void fireEvent(tipo, equipo, selected.jugadorId);
        return;
      }
      void fireEvent(tipo, equipo, null);
    },
    [disciplinaName, selected, expelledIds, fireEvent]
  );

  const handleAddLocal = async (
    team: TeamId,
    data: { nombre: string; numero: string; profile_id: string }
  ) => {
    const id = await onAddPlayer(team, data);
    setAddingTeam(null);
    if (id) setSelected({ team, jugadorId: id });
  };

  const openNumeroEditor = (j: any) => {
    setEditingPlayerId(j.id);
    setDraftNumero(j.numero != null ? String(j.numero) : "");
  };

  const cancelNumeroEditor = () => {
    setEditingPlayerId(null);
    setDraftNumero("");
  };

  const saveNumero = async (jugadorId: number) => {
    if (!onUpdatePlayerNumero) return;
    setSavingNumero(true);
    try {
      await onUpdatePlayerNumero(jugadorId, draftNumero);
      cancelNumeroEditor();
    } finally {
      setSavingNumero(false);
    }
  };

  const requestRemoveSelected = async (team: TeamId, jugadores: any[]) => {
    if (!onRemovePlayerFromRoster || !selected || selected.team !== team) return;
    const j = jugadores.find((x) => x.id === selected.jugadorId);
    if (!j?.roster_id) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("¿Quitar a este jugador del partido? (sigue en la base de jugadores)")
    ) {
      return;
    }
    await onRemovePlayerFromRoster(j.roster_id);
    setSelected(null);
  };

  const renderEditionActions = (team: TeamId) => {
    const hasSelection = selected?.team === team;

    return (
      <section
        className="rounded-xl border border-white/10 bg-black/25 px-3 py-4 sm:px-5 sm:py-5"
        style={{ borderColor: `${sportColor}28` }}
        aria-label="Edición — acciones de partido"
      >
        <p className="mb-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
          Edición
        </p>
        <div className="flex min-h-[9.5rem] w-full flex-col justify-center sm:min-h-[8rem]">
          <div className="mx-auto flex w-full max-w-md flex-wrap content-center items-center justify-center gap-2 sm:gap-2.5">
            {isVolleyball && (
              <>
                <button
                  type="button"
                  onClick={() => void fireEvent("punto", team, null)}
                  disabled={saving}
                  className="order-first flex min-h-[52px] w-full max-w-[11rem] flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 font-black text-[9px] uppercase leading-tight tracking-wide transition-all active:scale-[0.99] touch-manipulation sm:order-none sm:max-w-none sm:flex-1 sm:basis-[calc(50%-0.25rem)]"
                  style={{
                    borderColor: `${sportColor}55`,
                    background: `${sportColor}18`,
                    color: "#fff",
                  }}
                >
                  <Volleyball className="h-5 w-5" strokeWidth={2} />
                  Punto rally
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasSelection || selected?.team !== team) return;
                    if (expelledIds.has(selected.jugadorId)) return;
                    void fireEvent("punto", team, selected.jugadorId);
                  }}
                  disabled={
                    saving ||
                    !hasSelection ||
                    selected?.team !== team ||
                    expelledIds.has(selected?.jugadorId ?? -1)
                  }
                  className="flex min-h-[52px] w-full max-w-[11rem] flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-2 font-black text-[9px] uppercase leading-tight tracking-wide transition-all active:scale-[0.99] touch-manipulation sm:max-w-none sm:flex-1 sm:basis-[calc(50%-0.25rem)] disabled:pointer-events-none disabled:opacity-35"
                  style={{
                    borderColor: `${sportColor}40`,
                    background: `${sportColor}12`,
                    color: "#fff",
                  }}
                  title={
                    !hasSelection || selected?.team !== team
                      ? "Seleccioná un jugador en la plantilla"
                      : expelledIds.has(selected!.jugadorId)
                        ? "Jugador expulsado"
                        : "Punto atribuido al jugador (bitácora con minuto)"
                  }
                >
                  <Volleyball className="h-5 w-5" strokeWidth={2} />
                  Punto a jugador
                </button>
              </>
            )}

            {displayActions.map((action) => {
              const needsPlayer = actionNeedsPlayer(disciplinaName, action.value);
              const card = isCardTipo(action.value);
              const canUse =
                !needsPlayer ||
                (hasSelection && (!card || !expelledIds.has(selected!.jugadorId)));
              const dim =
                needsPlayer &&
                (!hasSelection || (card && expelledIds.has(selected!.jugadorId)));

              return (
                <button
                  key={`${team}-${action.value}`}
                  type="button"
                  disabled={!canUse || saving}
                  onClick={() => handleAction(action.value, team)}
                  className={cn(
                    "flex min-h-[52px] min-w-[4.25rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition-all touch-manipulation sm:min-w-[4.75rem] sm:max-w-[5.5rem]",
                    dim && "pointer-events-none opacity-35",
                    !dim && "active:scale-[0.97] hover:border-white/25"
                  )}
                  style={{
                    borderColor: `${sportColor}22`,
                    background: `${sportColor}0c`,
                  }}
                >
                  <QuickBenchActionIcon actionValue={action.value} dimmed={dim} />
                  <span
                    className="max-w-[5rem] text-center text-[7px] font-black uppercase leading-tight tracking-tight text-white/90 sm:text-[8px]"
                    style={{ color: canUse ? sportColor : "rgba(255,255,255,0.25)" }}
                  >
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const renderTeamPanel = (team: TeamId, jugadores: any[]) => {
    const side = team === "equipo_a" ? "a" : "b";
    const carreraLabel = getDisplayName(match, side);
    const escudo =
      team === "equipo_a" ? match.carrera_a?.escudo_url : match.carrera_b?.escudo_url;
    const hasSelection = selected?.team === team;
    const selectedJugador =
      selected?.team === team
        ? jugadores.find((x) => x.id === selected.jugadorId)
        : undefined;
    const canQuitarBar = Boolean(selectedJugador?.roster_id);

    const plantillaBlock = (
      <section aria-label="Plantilla">
        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
          Plantilla
        </p>
        {addingTeam === team ? (
          <PlayerSearchForm
            match={match}
            team={team}
            sportColor={sportColor}
            onSelect={(d) => handleAddLocal(team, d)}
            onCancel={() => setAddingTeam(null)}
            title="Nuevo jugador"
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2" role="list">
            {jugadores.map((j) => {
              const expelled = expelledIds.has(j.id);
              const active = hasSelection && selected?.jugadorId === j.id;
              const isEditing = editingPlayerId === j.id;

              return (
                <li
                  key={j.id}
                  className={cn("min-w-0", isEditing && "col-span-2 w-full")}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border px-2 py-2 transition-all",
                      expelled && "opacity-40",
                      active
                        ? "ring-2 ring-offset-2 ring-offset-zinc-950"
                        : "hover:border-white/20"
                    )}
                    style={{
                      borderColor: active ? sportColor : `${sportColor}14`,
                      background: active ? `${sportColor}22` : `${sportColor}06`,
                      ...(active ? { boxShadow: `0 4px 16px ${sportColor}33` } : {}),
                    }}
                  >
                    <button
                      type="button"
                      disabled={expelled}
                      onClick={() =>
                        setSelected(expelled ? null : { team, jugadorId: j.id })
                      }
                      aria-pressed={active}
                      className={cn(
                        "flex min-h-0 w-full min-w-0 flex-col items-stretch gap-1.5 rounded-lg px-1 py-1 text-left touch-manipulation",
                        expelled && "cursor-not-allowed"
                      )}
                    >
                      <span
                        className="flex h-6 w-full shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-black leading-none"
                        style={{
                          background: active ? "rgba(0,0,0,0.25)" : `${sportColor}14`,
                          color: active ? "#fff" : `${sportColor}ee`,
                        }}
                      >
                        {expelled ? "×" : j.numero ?? "–"}
                      </span>
                      <span
                        className={cn(
                          "w-full text-left text-[11px] font-semibold leading-snug",
                          "normal-case [overflow-wrap:anywhere] [hyphens:none]",
                          active ? "text-white" : "text-white/95"
                        )}
                        title={j.nombre}
                      >
                        {j.nombre}
                      </span>
                      {expelled && (
                        <span className="text-[7px] font-black uppercase text-rose-400">
                          Expulsado
                        </span>
                      )}
                    </button>

                    {onUpdatePlayerNumero && (
                      <div className="border-t border-white/10 pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openNumeroEditor(j);
                          }}
                          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-white/20 bg-white/[0.08] px-2 text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition-colors active:scale-[0.98] touch-manipulation"
                          aria-label="Cambiar dorsal"
                        >
                          <Pencil size={17} strokeWidth={2.5} className="shrink-0 text-white" />
                          <span className="truncate">Dorsal</span>
                        </button>
                      </div>
                    )}

                    {isEditing && onUpdatePlayerNumero && (
                      <div
                        className="mt-1 w-full min-w-0 rounded-xl border-2 border-white/20 bg-zinc-950/95 p-3 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <p className="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-white/50">
                          Cambiar dorsal
                        </p>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="Vacío = sin número"
                          value={draftNumero}
                          onChange={(e) =>
                            setDraftNumero(e.target.value.replace(/\D/g, ""))
                          }
                          className="min-h-[52px] w-full rounded-xl border-2 border-white/20 bg-black/50 px-4 text-center text-lg font-black tracking-wide text-white outline-none focus:border-cyan-400/70"
                        />
                        <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            disabled={savingNumero}
                            onClick={() => void saveNumero(j.id)}
                            className="flex min-h-[52px] w-full flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black uppercase text-white shadow-md transition-colors hover:bg-emerald-500 disabled:opacity-50 sm:min-w-0"
                          >
                            <Check size={18} strokeWidth={2.5} />
                            Guardar
                          </button>
                          <button
                            type="button"
                            disabled={savingNumero}
                            onClick={cancelNumeroEditor}
                            className="flex min-h-[52px] w-full flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/25 bg-white/[0.06] text-sm font-black uppercase text-white/90 transition-colors hover:bg-white/10 sm:min-w-0"
                          >
                            <X size={18} strokeWidth={2.5} />
                            Cancelar
                          </button>
                        </div>
                        <p className="mt-2 text-center text-[8px] font-bold uppercase tracking-wide text-white/40">
                          Se guarda en jugadores (próximos partidos)
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            {jugadores.length === 0 && (
              <li className="col-span-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/25">
                  Sin jugadores en plantilla
                </p>
              </li>
            )}
          </ul>
        )}
      </section>
    );

    return (
      <div
        key={team}
        className="w-full min-w-0 overflow-hidden rounded-2xl border backdrop-blur-sm"
        style={{
          borderColor: `${sportColor}18`,
          background: `linear-gradient(145deg, ${sportColor}08, rgba(0,0,0,0.35))`,
        }}
      >
        <div className="flex min-w-0 flex-col gap-4 p-3 sm:gap-5 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Avatar
                name={carreraLabel}
                src={escudo}
                className="h-10 w-10 shrink-0 rounded-lg border border-white/15 sm:h-11 sm:w-11"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/35 sm:text-[9px]">
                  Cancha rápida
                </p>
                <p className="text-xs font-black leading-snug text-white sm:text-sm break-words">
                  {carreraLabel}
                </p>
                {!hasSelection && !isVolleyball && (
                  <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-400/85">
                    Tocá un jugador → acciones · Dorsal en la ficha · Quitar debajo de edición
                  </p>
                )}
                {isVolleyball && (
                  <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-cyan-400/90 leading-snug">
                    Punto rally sin elegir jugador · Elegí uno en plantilla y usá Punto a jugador · Tarjetas: jugador
                    seleccionado
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddingTeam(team)}
              className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-[8px] font-black uppercase tracking-wide transition-colors active:scale-[0.98] touch-manipulation sm:w-auto sm:text-[9px]"
              style={{
                borderColor: `${sportColor}35`,
                color: sportColor,
                background: `${sportColor}12`,
              }}
            >
              <UserPlus size={14} strokeWidth={2.25} />
              Agregar jugador
            </button>
          </div>

          {isVolleyball && plantillaBlock}

          {renderEditionActions(team)}

          {onRemovePlayerFromRoster && (
            <div
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
              style={{ borderColor: `${sportColor}22` }}
            >
              <button
                type="button"
                disabled={!selected || selected.team !== team || !canQuitarBar}
                title={
                  !selected || selected.team !== team
                    ? isVolleyball
                      ? "Seleccioná un jugador en la plantilla"
                      : "Seleccioná un jugador en la plantilla de abajo"
                    : !canQuitarBar
                      ? "Solo plantel: cargá al jugador al partido en Modo clásico"
                      : "Quitar del partido (sigue en jugadores)"
                }
                onClick={() => void requestRemoveSelected(team, jugadores)}
                className={cn(
                  "flex w-full min-h-[48px] items-center justify-center gap-2 rounded-lg border-2 px-3 text-[10px] font-black uppercase tracking-wide transition-all touch-manipulation",
                  canQuitarBar && selected?.team === team
                    ? "border-rose-200/80 bg-rose-600 text-white shadow-md shadow-rose-900/35 hover:bg-rose-500 active:scale-[0.99]"
                    : "cursor-not-allowed border-white/10 bg-white/[0.04] text-white/35"
                )}
              >
                <Trash2 size={18} strokeWidth={2.5} className="shrink-0" />
                Quitar del partido
              </button>
              <p className="mt-1.5 text-center text-[7px] font-medium leading-tight text-white/35 normal-case">
                {!selected || selected.team !== team
                  ? isVolleyball
                    ? "Seleccioná un jugador en la plantilla para activar."
                    : "Seleccioná un jugador abajo para activar."
                  : !selectedJugador
                    ? ""
                    : !canQuitarBar
                      ? "Sin roster en este partido — usá Modo clásico para agregarlo y luego podés quitarlo."
                      : "Listo para quitar del roster de este partido."}
              </p>
            </div>
          )}

          {!isVolleyball && plantillaBlock}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full space-y-5">
      <p className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-white/35">
        {isVolleyball
          ? "Vóley: plantilla arriba en cada equipo; punto rally o punto a jugador; bitácora con minuto solo si registrás puntos a jugador."
          : "Todo en este bloque: partido, dorsal, alta y baja del partido. Bitácora abajo."}
      </p>

      <div className="flex w-full flex-col gap-5">
        {renderTeamPanel("equipo_a", jugadoresA)}
        {renderTeamPanel("equipo_b", jugadoresB)}
      </div>
    </div>
  );
}
