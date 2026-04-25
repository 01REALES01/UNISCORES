"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/components/sport-icons";
import { Avatar } from "@/components/ui-primitives";
import { getCurrentScore } from "@/lib/sport-scoring";
import { isAsyncMatch } from "@/lib/is-async-match";
import { getDisplayName } from "@/lib/sport-helpers";
import { ChevronLeft, ChevronRight, Timer } from "lucide-react";
import {
  SPORT_COLORS,
  SPORT_BORDER,
  SPORT_ACCENT,
  SPORT_LIVE_BAR,
} from "@/lib/constants";
import type { PartidoWithRelations as Partido } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isToday(fecha: string) {
  const d = new Date(fecha);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function parseMatchTime(fecha: string) {
  const d = new Date(fecha);
  // Using es-CO and making sure we get AM/PM clearly
  const timeStr = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  // Split format like "08:00 a. m."
  const parts = timeStr.split(/\s+/);
  const time = parts[0];
  const meridiem = (parts[1] || parts[2] || "").replace(/\./g, "").toUpperCase();
  return { time, meridiem };
}

function getMatchDayLabel(fecha: string) {
  if (isToday(fecha)) return "Hoy";
  if (isTomorrow(fecha)) return "Mañana";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric" }).toUpperCase();
}

function getShieldUrl(partido: Partido, side: "a" | "b") {
  if (side === "a") {
    return (
      partido.atleta_a?.avatar_url ||
      partido.carrera_a?.escudo_url ||
      partido.delegacion_a_info?.escudo_url
    );
  }
  return (
    partido.atleta_b?.avatar_url ||
    partido.carrera_b?.escudo_url ||
    partido.delegacion_b_info?.escudo_url
  );
}

// ── Single match row ─────────────────────────────────────────────────────────

export function MatchRow({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || "Deporte";
  const isLive = partido.estado === "en_curso";
  const isFinished = partido.estado === "finalizado";
  const isAsync = isAsyncMatch(partido);

  const { scoreA, scoreB, labelA, labelB, subScoreA, subScoreB } =
    getCurrentScore(sportName, partido.marcador_detalle || {});

  const nameA = getDisplayName(partido, "a");
  const nameB = getDisplayName(partido, "b");
  const shieldA = getShieldUrl(partido, "a");
  const shieldB = getShieldUrl(partido, "b");

  // Set-based sports detection
  const isSetSport = ["Voleibol", "Tenis", "Tenis de Mesa", "Bádminton"].includes(sportName);
  const det = partido.marcador_detalle || {};
  const setActual = det.set_actual;

  const isVolley = sportName === "Voleibol";
  const isTenisCampo = sportName === "Tenis";
  const isTenisMesa = sportName === "Tenis de Mesa";
  // Sets ganados: scoreA/B (voleibol, tenis campo, tenis de mesa — mismo contrato que getCurrentScore)
  const matchSetsA = isVolley || isTenisCampo || isTenisMesa ? scoreA : null;
  const matchSetsB = isVolley || isTenisCampo || isTenisMesa ? scoreB : null;
  // En vivo, marcador grande: puntos/juegos del período actual (subScore)
  const livePrimaryA = isVolley || isTenisMesa ? subScoreA : isTenisCampo ? subScoreA : null;
  const livePrimaryB = isVolley || isTenisMesa ? subScoreB : isTenisCampo ? subScoreB : null;

  const finalScoreA = scoreA ?? 0;
  const finalScoreB = scoreB ?? 0;

  const hasPenales = det.penales_a != null && det.penales_b != null;
  const winnerSide =
    isFinished && (finalScoreA !== finalScoreB || hasPenales)
      ? (finalScoreA > finalScoreB || (finalScoreA === finalScoreB && hasPenales && det.penales_a > det.penales_b))
        ? "a"
        : "b"
      : null;

  const genero = (partido.genero || "").toLowerCase();
  const grupo = partido.grupo;

  const { time, meridiem } = parseMatchTime(partido.fecha);

  return (
    <Link
      href={`/partido/${partido.id}`}
      className="group block"
    >
      <div
        className={cn(
          "relative flex items-center gap-2 px-3 py-3 sm:px-4 sm:py-3.5 transition-all duration-300",
          isLive
            ? "bg-white/[0.04] hover:bg-white/[0.08]"
            : "hover:bg-white/[0.02] cursor-pointer",
          "border-b border-white/[0.04] last:border-b-0 overflow-hidden"
        )}
      >
        {/* Live bar indicator */}
        {isLive && (
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full shadow-[2px_0_8px_currentColor] z-10",
              SPORT_LIVE_BAR[sportName] || "bg-emerald-500"
            )}
          />
        )}

        {/* Team A */}
        <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0 z-10">
          <div className="flex flex-col items-end min-w-0">
            <span
              className={cn(
                "text-[11px] sm:text-[13px] font-bold text-right truncate leading-tight max-w-full transition-all duration-500",
                winnerSide === "a"
                  ? "text-white font-black"
                  : winnerSide === "b"
                  ? "text-white/50"
                  : isLive
                  ? "text-white/90"
                  : "text-white/70"
              )}
            >
              {nameA}
            </span>
            {(genero || grupo) && (
              <span className="sm:hidden text-[8px] font-bold text-white/20 uppercase tracking-wider truncate max-w-full">
                {[grupo ? `Grupo ${grupo}` : null, genero === "femenino" ? "Fem" : genero === "mixto" ? "Mix" : ""].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {shieldA ? (
            <div className="relative shrink-0">
              <Avatar
                name={nameA}
                src={shieldA}
                size="sm"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 transition-all duration-500",
                  "border border-white/10 bg-black/40"
                )}
              />
            </div>
          ) : (
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
              "bg-white/8 border border-white/10"
            )}>
              <span className={cn(
                "text-[8px] sm:text-[9px] font-black text-white/60"
              )}>
                {nameA?.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Score / Time center */}
        <div className="flex flex-col items-center justify-center w-[74px] sm:w-[96px] shrink-0 z-10 px-1">
          {isAsync ? (
            /* Async: hide score, show indicator */
            <div className="flex flex-col items-center gap-0.5 px-1">
              <span className="text-xs sm:text-sm font-black text-white/20">VS</span>
              <span className="text-[7px] font-black text-amber-400/50 uppercase tracking-widest">Sin cobertura</span>
            </div>
          ) : isLive ? (
            isSetSport ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 font-black text-white tabular-nums text-sm sm:text-lg tracking-tight">
                    <span>{livePrimaryA ?? 0}</span>
                    <span className="text-white/25 text-xs">·</span>
                    <span>{livePrimaryB ?? 0}</span>
                  </div>
                  {isTenisCampo && (labelA != null || labelB != null) && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-white/40 tabular-nums tracking-tight">
                      <span>{labelA ?? "0"}</span>
                      <span className="text-white/15">·</span>
                      <span>{labelB ?? "0"}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-white/35 tabular-nums">
                  <span>{matchSetsA ?? 0}</span>
                  <span className="text-white/15">-</span>
                  <span>{matchSetsB ?? 0}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                    {setActual ? `S${setActual}` : "Live"}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 font-black text-white tabular-nums text-sm sm:text-lg tracking-tight">
                  <span>{labelA ?? scoreA}</span>
                  <span className="text-white/25 text-xs">·</span>
                  <span>{labelB ?? scoreB}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                </div>
              </>
            )
          ) : isFinished ? (
            <div className="flex flex-col items-center gap-0.5">
              {isSetSport ? (
                <div className="flex items-center gap-1 font-black tabular-nums text-sm sm:text-base tracking-tight">
                  <span className={cn(winnerSide === "a" ? "text-white font-black" : "text-white/35")}>{finalScoreA}</span>
                  <span className="text-white/10 text-xs">-</span>
                  <span className={cn(winnerSide === "b" ? "text-white font-black" : "text-white/35")}>{finalScoreB}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 font-black tabular-nums text-sm sm:text-base tracking-tight">
                  <span className={cn(winnerSide === "a" ? "text-white font-black" : "text-white/35")}>{scoreA}</span>
                  <span className="text-white/10 text-xs">-</span>
                  <span className={cn(winnerSide === "b" ? "text-white font-black" : "text-white/35")}>{scoreB}</span>
                </div>
              )}
              <span className="text-[8px] font-bold text-white/15 uppercase tracking-widest">Final</span>
              {hasPenales && (
                <span className="text-[8px] font-bold text-violet-400 tabular-nums">
                  Pen. {det.penales_a}–{det.penales_b}
                </span>
              )}
            </div>
          ) : (
            <div className={cn(
              "flex flex-col items-center px-2 py-1.5 sm:px-3 rounded-xl transition-all duration-300 w-full",
              "bg-white/[0.05] border border-white/10 backdrop-blur-md shadow-lg",
              "group-hover:bg-white/[0.08] group-hover:border-white/20"
            )}>
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-xs sm:text-[15px] font-black text-white tabular-nums tracking-tighter">
                  {time}
                </span>
                <span className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase">
                  {meridiem}
                </span>
              </div>
              <span className="text-[6px] sm:text-[7px] font-black text-white/25 uppercase tracking-[0.2em] mt-0.5">
                {getMatchDayLabel(partido.fecha)}
              </span>
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="flex-1 flex items-center gap-1.5 sm:gap-2.5 min-w-0 z-10">
          {shieldB ? (
            <div className="relative shrink-0">
              <Avatar
                name={nameB}
                src={shieldB}
                size="sm"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 transition-all duration-500",
                  "border border-white/10 bg-black/40"
                )}
              />
            </div>
          ) : (
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
              "bg-white/8 border border-white/10"
            )}>
              <span className={cn(
                "text-[8px] sm:text-[9px] font-black text-white/60"
              )}>
                {nameB?.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span
            className={cn(
              "text-[11px] sm:text-[13px] font-bold text-left truncate leading-tight transition-all duration-500",
              winnerSide === "b"
                ? "text-white font-black"
                : winnerSide === "a"
                ? "text-white/50"
                : isLive
                ? "text-white/90"
                : "text-white/70"
            )}
          >
            {nameB}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Natación collapsible jornada group ───────────────────────────────────────

function NatacionGenderGroup({ label, matches }: { label: string; matches: Partido[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasLive = matches.some(m => m.estado === "en_curso");
  const finishedCount = matches.filter(m => m.estado === "finalizado").length;

  return (
    <div className="relative z-10">
      <button
        onClick={() => setExpanded(v => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 transition-all border-b border-white/[0.04]",
          expanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
        )}
      >
        <ChevronRight size={13} className={cn("text-white/30 transition-transform shrink-0", expanded && "rotate-90")} />
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
          label === "Femenino"
            ? "bg-pink-500/10 border-pink-500/20 text-pink-400"
            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
        )}>
          {label}
        </span>
        <span className="text-[10px] font-bold text-white/25 ml-auto">
          {matches.length} carrera{matches.length !== 1 ? "s" : ""}
        </span>
        {hasLive && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-500/20 border border-sky-500/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[8px] font-black text-sky-300 uppercase tracking-widest">Live</span>
          </div>
        )}
        {!hasLive && finishedCount > 0 && (
          <span className="text-[9px] font-bold text-emerald-400/50">{finishedCount}/{matches.length}</span>
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 flex flex-col gap-1.5 border-b border-white/[0.04]">
          {matches.map(p => {
            const det = (p as any).marcador_detalle || {};
            const participantes = Array.isArray(det.participantes) ? det.participantes : [];
            const isFinished = p.estado === "finalizado";
            const isLive = p.estado === "en_curso";
            const top3 = isFinished
              ? [...participantes].sort((a: any, b: any) => (a.posicion ?? 99) - (b.posicion ?? 99)).slice(0, 3)
              : [];
            return (
              <Link key={p.id} href={`/partido/${p.id}`} className="group/race block">
                <div className={cn(
                  "rounded-xl border px-3 py-2 transition-all",
                  isLive
                    ? "border-sky-500/30 bg-sky-500/[0.04]"
                    : "border-white/[0.05] bg-white/[0.01] hover:border-sky-500/15 hover:bg-white/[0.03]"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer size={12} className="text-sky-400/50" />
                      <span className="text-[12px] font-black text-white/80">{det.distancia} {det.estilo}</span>
                    </div>
                    {isLive ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-500/20 border border-sky-500/30 rounded-full">
                        <div className="w-1 h-1 rounded-full bg-sky-400 animate-pulse" />
                        <span className="text-[7px] font-black text-sky-300 uppercase tracking-widest">En Curso</span>
                      </div>
                    ) : isFinished ? (
                      <span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-widest">Final</span>
                    ) : (
                      <span className="text-[8px] font-bold text-white/15">{participantes.length} atletas</span>
                    )}
                  </div>
                  {isFinished && top3.length > 0 && (
                    <div className="flex items-center gap-3 mt-1.5 pl-5">
                      {top3.map((a: any, i: number) => (
                        <span key={i} className="text-[10px] text-white/50 truncate">
                          {["🥇", "🥈", "🥉"][i]} <span className="font-bold">{a.nombre?.split(" ")[0]}</span>
                          {a.tiempo && <span className="text-sky-400/70 font-mono ml-0.5">{a.tiempo}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Phase importance (lower = more important) ───────────────────────────────

const FASE_PRIORITY: Record<string, number> = {
  final: 0,
  tercer_puesto: 1,
  semifinal: 2,
  cuartos: 3,
  octavos: 4,
  dieciseisavos: 5,
  primera_ronda: 6,
  grupos: 7,
};

const FASE_LABEL: Record<string, string> = {
  final: "Final",
  tercer_puesto: "Tercer Puesto",
  semifinal: "Semifinal",
  cuartos: "Cuartos de Final",
  octavos: "Octavos de Final",
  dieciseisavos: "Dieciseisavos",
  primera_ronda: "Primera Ronda",
  grupos: "Fase de Grupos",
};

function getFasePriority(fase?: string | null) {
  if (!fase) return 99;
  return FASE_PRIORITY[fase] ?? 50;
}

function getFaseLabel(fase?: string | null) {
  if (!fase) return null;
  return FASE_LABEL[fase] ?? fase;
}

// ── Sport group card ─────────────────────────────────────────────────────────

function SportGroup({
  sportName,
  matches: rawMatches,
}: {
  sportName: string;
  matches: Partido[];
}) {
  const matches = useMemo(() =>
    [...rawMatches].sort((a, b) => {
      // Live always first
      if (a.estado === "en_curso" && b.estado !== "en_curso") return -1;
      if (b.estado === "en_curso" && a.estado !== "en_curso") return 1;
      // Then by phase importance
      const faseDiff = getFasePriority(a.fase) - getFasePriority(b.fase);
      if (faseDiff !== 0) return faseDiff;
      // Then by time
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    }),
    [rawMatches]
  );

  const faseGroups = useMemo(() => {
    const groups: { fase: string | null; label: string | null; matches: Partido[] }[] = [];
    let currentFase: string | undefined;
    for (const m of matches) {
      const f = m.fase || null;
      if (f !== currentFase || groups.length === 0) {
        currentFase = f ?? undefined;
        groups.push({ fase: f, label: getFaseLabel(f), matches: [] });
      }
      groups[groups.length - 1].matches.push(m);
    }
    return groups;
  }, [matches]);

  const hasMultipleFases = faseGroups.length > 1 || (faseGroups.length === 1 && faseGroups[0].label != null);

  const hasLive = matches.some((m) => m.estado === "en_curso");
  const accentColor = SPORT_COLORS[sportName] || "#a78bfa";
  const isNatacion = sportName === "Natación";

  // Map sport names to public image icons
  const customIconMap: Record<string, string> = {
    "Fútbol": "/FutbolIcono.png",
    "Baloncesto": "/BasketIcono.png",
    "Voleibol": "/VolleyIcono.png",
    "Tenis": "/TenisIcono.png",
    "Tenis de Mesa": "/TenisDMIcono.png",
    "Ajedrez": "/AjedrezIcono.png",
    "Natación": "/NatacionIcono.png",
  };

  const customIcon = customIconMap[sportName];

  const natacionGroups = useMemo(() => {
    if (!isNatacion) return [];
    const fem = matches.filter(m => (m.genero || "").toLowerCase() === "femenino");
    const masc = matches.filter(m => (m.genero || "").toLowerCase() !== "femenino");
    const groups: { label: string; matches: Partido[] }[] = [];
    if (fem.length > 0) groups.push({ label: "Femenino", matches: fem });
    if (masc.length > 0) groups.push({ label: "Masculino", matches: masc });
    return groups;
  }, [matches, isNatacion]);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border transition-all duration-300 relative group/sport",
        hasLive
          ? SPORT_BORDER[sportName] || "border-white/15"
          : "border-white/[0.08]"
      )}
      style={{
        backgroundColor: "rgba(10, 10, 10, 0.4)",
        background: `radial-gradient(circle at 0% 0%, ${accentColor}${hasLive ? '15' : '08'} 0%, transparent 50%), radial-gradient(circle at 100% 100%, ${accentColor}${hasLive ? '10' : '05'} 0%, transparent 50%)`,
        boxShadow: hasLive ? `0 0 30px ${accentColor}25` : 'none',
      }}
    >
      {/* Large sport watermark icon */}
      <div
        className="absolute -right-2 -bottom-2 pointer-events-none select-none z-0 transition-all duration-1000 group-hover/sport:scale-110 group-hover/sport:opacity-[0.12]"
        style={{ opacity: 0.1 }}
        aria-hidden="true"
      >
        {customIcon ? (
          <img
            src={customIcon}
            alt=""
            className="w-40 h-40 object-contain"
          />
        ) : (
          <SportIcon
            sport={sportName}
            size={160}
            variant="react"
            className="text-white"
          />
        )}
      </div>

      {/* Enhanced radial glow behind icon */}
      <div
        className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none z-0 opacity-30"
        style={{ backgroundColor: accentColor }}
      />

      {/* Sport header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] backdrop-blur-sm"
        style={{
          background: `linear-gradient(90deg, ${accentColor}20 0%, transparent 80%)`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}30` }}
        >
          <SportIcon
            sport={sportName}
            size={15}
            variant="react"
            className={cn(SPORT_ACCENT[sportName] || "text-white/70")}
          />
        </div>
        <span
          className="text-[13px] font-black uppercase tracking-wider"
          style={{ color: accentColor }}
        >
          {sportName}
        </span>
        <div className="flex items-center gap-3 ml-auto">
          {hasLive && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}25` }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Live</span>
            </div>
          )}
          <span className="text-[10px] font-bold text-white/25 tracking-wider">
            {matches.length} {isNatacion ? "carreras" : matches.length === 1 ? "partido" : "partidos"}
          </span>
        </div>
      </div>

      {/* Match rows or Natación jornada groups */}
      <div className="relative z-10">
        {isNatacion ? (
          natacionGroups.map(g => (
            <NatacionGenderGroup key={g.label} label={g.label} matches={g.matches} />
          ))
        ) : hasMultipleFases ? (
          faseGroups.map((g, i) => (
            <div key={g.fase ?? i}>
              {g.label && (
                <div className="flex items-center gap-2 px-4 py-1.5" style={{
                  background: i === 0 ? undefined : `linear-gradient(90deg, ${accentColor}10 0%, transparent 60%)`,
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                }}>
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.2em]"
                    style={{ color: `${accentColor}90` }}
                  >
                    {g.label}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: `${accentColor}15` }} />
                </div>
              )}
              {g.matches.map((match) => (
                <MatchRow key={match.id} partido={match} />
              ))}
            </div>
          ))
        ) : (
          matches.map((match) => (
            <MatchRow key={match.id} partido={match} />
          ))
        )}
      </div>
    </div>
  );
}

function isTomorrow(fecha: string) {
  const d = new Date(fecha);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

/** Día calendario en hora Colombia (Bogotá) para un instante ISO. */
function bogotaYmdFromIso(fecha: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(fecha));
}

function parseYmd(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

/** Suma días a un YYYY-MM-DD (calendario civil) y devuelve YYYY-MM-DD en Bogotá. */
function bogotaYmdAddDays(ymd: string, delta: number): string {
  const { y, m, d } = parseYmd(ymd);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + delta);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function dayChipLabel(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return "Hoy";
  if (ymd === bogotaYmdAddDays(todayYmd, 1)) return "Mañana";
  if (ymd === bogotaYmdAddDays(todayYmd, -1)) return "Ayer";
  const { y, m, d } = parseYmd(ymd);
  const inst = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(inst)
    .replace(/\.$/, "");
}

type DayBucket = {
  ymd: string;
  label: string;
};

function buildDayBuckets(rows: Partido[], todayYmd: string): DayBucket[] {
  const set = new Set<string>();
  for (const p of rows) {
    if (p.estado === "cancelado") continue;
    set.add(bogotaYmdFromIso(p.fecha));
  }
  const ymds = [...set].sort((a, b) => a.localeCompare(b));
  return ymds.map((ymd) => ({
    ymd,
    label: dayChipLabel(ymd, todayYmd),
  }));
}

// ── Main section ─────────────────────────────────────────────────────────────

interface MatchesTodaySectionProps {
  matches: Partido[];
}

/** Fingerprint estable: el padre suele pasar un `matches` nuevo en cada render (misma data). */
function matchesCalFingerprint(rows: Partido[]) {
  let h = 0;
  for (const m of rows) {
    h = (h * 33 + m.id) | 0;
    const f = m.fecha || "";
    for (let i = 0; i < f.length; i++) h = (h * 33 + f.charCodeAt(i)) | 0;
    h = (h * 33 + (m.estado === "cancelado" ? 1 : 0)) | 0;
  }
  return `${h}:${rows.length}`;
}

export function MatchesTodaySection({ matches }: MatchesTodaySectionProps) {
  const todayYmd = bogotaYmdFromIso(new Date().toISOString());
  const calFp = matchesCalFingerprint(matches);
  const dayBuckets = useMemo(() => {
    return buildDayBuckets(matches, todayYmd);
    // `calFp` condensa el calendario; sin esto, `matches` (nueva ref. cada render en Home) rehacía `dayBuckets` y re-ejecutaba efectos que reseteaban el día.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calFp, todayYmd]);
  const [dayIdx, setDayIdx] = useState(0);
  const didInitDay = useRef(false);
  const dayScrollRef = useRef<HTMLDivElement | null>(null);
  const lastCalFp = useRef<string | null>(null);

  // Init / clamp al cambiar el calendario. `dayBuckets` debe ser estable (misma ref.) si `calFp` no cambia,
  // o este efecto se re-ejecuta en cada flecha y puede pelearse con setDayIdx.
  useEffect(() => {
    if (dayBuckets.length === 0) {
      setDayIdx(0);
      return;
    }
    setDayIdx((prev) => {
      const safe = Math.min(Math.max(0, prev), dayBuckets.length - 1);
      if (lastCalFp.current !== calFp) {
        lastCalFp.current = calFp;
        if (!didInitDay.current) {
          didInitDay.current = true;
          let i = dayBuckets.findIndex((d) => d.ymd === todayYmd);
          if (i < 0) {
            i = dayBuckets.findIndex((d) => d.ymd >= todayYmd);
            if (i < 0) i = dayBuckets.length - 1;
          }
          return i;
        }
      }
      return safe;
    });
  }, [calFp, dayBuckets, todayYmd]);

  const activeDay = dayBuckets[dayIdx];

  const scopeMatches = useMemo(() => {
    if (!activeDay) return [];
    return matches.filter((m) => {
      if (m.estado === "cancelado") return false;
      return bogotaYmdFromIso(m.fecha) === activeDay.ymd;
    });
  }, [matches, activeDay]);

  const todayMatches = scopeMatches;

  const groupedBySport = useMemo(() => {
    const groups = new Map<string, Partido[]>();
    const sorted = [...todayMatches].sort((a, b) => {
      if (a.estado === "en_curso" && b.estado !== "en_curso") return -1;
      if (b.estado === "en_curso" && a.estado !== "en_curso") return 1;
      if (a.estado === "programado" && b.estado === "finalizado") return -1;
      if (b.estado === "programado" && a.estado === "finalizado") return 1;
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });

    for (const match of sorted) {
      const sport = match.disciplinas?.name || "Otro";
      if (!groups.has(sport)) groups.set(sport, []);
      groups.get(sport)!.push(match);
    }

    const entries = [...groups.entries()].sort(([, a], [, b]) => {
      const aLive = a.some((m) => m.estado === "en_curso");
      const bLive = b.some((m) => m.estado === "en_curso");
      if (aLive && !bLive) return -1;
      if (bLive && !aLive) return 1;
      return 0;
    });

    return entries;
  }, [todayMatches]);

  const hasAnyLive = todayMatches.some((m) => m.estado === "en_curso");

  const isSelectedToday = activeDay?.ymd === todayYmd;

  const sectionLabel = hasAnyLive
    ? "Acción en vivo"
    : isSelectedToday
    ? "Jornada del día"
    : "Calendario";

  const goDayPrev = useCallback(() => setDayIdx((i) => Math.max(0, i - 1)), []);
  const goDayNext = useCallback(() => {
    setDayIdx((i) => (dayBuckets.length ? Math.min(dayBuckets.length - 1, i + 1) : 0));
  }, [dayBuckets.length]);

  // Scroll al chip activo vía `data-ymd` (sin ref por índice: menos churn en el DOM con flechas).
  const activeYmd = dayBuckets[dayIdx]?.ymd;
  useLayoutEffect(() => {
    if (!activeYmd) return;
    const id = requestAnimationFrame(() => {
      const scroller = dayScrollRef.current;
      if (!scroller) return;
      const el = scroller.querySelector<HTMLElement>(`[data-ymd="${activeYmd}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [activeYmd, dayIdx]);

  return (
    <section className="animate-in slide-in-from-bottom-6 fade-in duration-700">
      <div className="flex flex-col gap-1 mb-4 px-1">
        <p
          className={cn(
            "font-display text-xs font-bold bg-clip-text text-transparent tracking-[0.3em]",
            hasAnyLive
              ? "bg-gradient-to-r from-red-400 to-red-600"
              : "bg-gradient-to-r from-emerald-400 to-emerald-600"
          )}
        >
          {sectionLabel}
        </p>
        <div className="flex items-center gap-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
            Partidos
          </h2>
          {hasAnyLive && (
            <span className="flex items-center gap-1.5 text-[9px] font-black text-white bg-red-500 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse uppercase tracking-widest h-fit">
              Live
            </span>
          )}
        </div>
      </div>

      {dayBuckets.length > 0 && (
        <div className="mb-6 space-y-2 px-0.5">
          <p className="text-[10px] font-medium text-white/45 sm:text-[11px]">
            Navegá por <strong className="text-white/60">día</strong> (partidos en calendario, hora Colombia). Flechas: días
            con partido previo/siguiente; o elige un día.
          </p>
          <div className="relative -mx-1 sm:mx-0">
            <div className="flex items-stretch justify-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={goDayPrev}
                disabled={dayIdx <= 0}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/80 transition-colors active:scale-[0.98] sm:h-[52px] sm:w-11 disabled:pointer-events-none disabled:opacity-25"
                aria-label="Día con partidos, anterior en el calendario"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div
                ref={dayScrollRef}
                className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Elegir día con partidos"
              >
                {dayBuckets.map((d, idx) => {
                  const isActive = idx === dayIdx;
                  return (
                    <button
                      key={d.ymd}
                      type="button"
                      data-ymd={d.ymd}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setDayIdx(idx)}
                      className={cn(
                        "snap-center min-h-[48px] w-[min(9.5rem,44vw)] shrink-0 touch-manipulation rounded-2xl border-2 px-2.5 py-2 text-center transition-all active:scale-[0.99] sm:min-h-[52px] sm:w-auto sm:min-w-[6.5rem] sm:px-4",
                        isActive
                          ? "border-amber-400/90 bg-amber-500/15 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                          : "border-white/12 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white/85"
                      )}
                    >
                      <span className="block text-[7px] font-black uppercase tracking-widest text-white/40 sm:text-[8px]">
                        Día
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-[11px] font-bold leading-tight text-white/95 sm:text-sm">
                        {d.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={goDayNext}
                disabled={dayIdx >= dayBuckets.length - 1}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/80 transition-colors active:scale-[0.98] sm:h-[52px] sm:w-11 disabled:pointer-events-none disabled:opacity-25"
                aria-label="Día con partidos, siguiente en el calendario"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1.5 text-right text-[9px] font-bold tabular-nums text-white/35" aria-live="polite">
              {dayBuckets.length > 0 ? dayIdx + 1 : 0} / {dayBuckets.length} días con partidos
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {groupedBySport.length > 0 ? (
          groupedBySport.map(([sport, sportMatches]) => (
            <SportGroup key={sport} sportName={sport} matches={sportMatches} />
          ))
        ) : dayBuckets.length === 0 ? (
          <p className="px-1 text-sm text-white/30">No hay partidos publicados aún.</p>
        ) : (
          <p className="px-1 text-sm text-white/30">No hay partidos en el día seleccionado.</p>
        )}
      </div>
    </section>
  );
}
