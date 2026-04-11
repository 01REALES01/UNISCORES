"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/components/sport-icons";
import { Avatar } from "@/components/ui-primitives";
import { Trophy } from "lucide-react";
import { getCurrentScore } from "@/lib/sport-scoring";
import { getDisplayName } from "@/lib/sport-helpers";
import {
  SPORT_COLORS,
  SPORT_BORDER,
  SPORT_ACCENT,
  SPORT_LIVE_BAR,
} from "@/lib/constants";
import type { PartidoWithRelations as Partido } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatMatchTime(fecha: string) {
  const d = new Date(fecha);
  return d.toLocaleString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function isToday(fecha: string) {
  const d = new Date(fecha);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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

function MatchRow({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || "Deporte";
  const isLive = partido.estado === "en_curso";
  const isFinished = partido.estado === "finalizado";

  const { scoreA, scoreB, labelA, labelB, subScoreA, subScoreB, extra } =
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
  const isTenis = ["Tenis", "Tenis de Mesa"].includes(sportName);

  const setsWonA = isVolley ? scoreA : isTenis ? subScoreA : null;
  const setsWonB = isVolley ? scoreB : isTenis ? subScoreB : null;
  const currentSetScoreA = isVolley ? subScoreA : isTenis ? scoreA : null;
  const currentSetScoreB = isVolley ? subScoreB : isTenis ? scoreB : null;

  const finalScoreA = isSetSport && isFinished ? (setsWonA ?? scoreA ?? 0) : (scoreA ?? 0);
  const finalScoreB = isSetSport && isFinished ? (setsWonB ?? scoreB ?? 0) : (scoreB ?? 0);

  const winnerSide =
    isFinished && finalScoreA !== finalScoreB
      ? finalScoreA > finalScoreB
        ? "a"
        : "b"
      : null;

  const genero = (partido.genero || "").toLowerCase();
  const grupo = partido.grupo;

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
        {/* Subtle highlight background for winner side */}
        {winnerSide === "a" && (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.03] to-transparent pointer-events-none" />
        )}
        {winnerSide === "b" && (
          <div className="absolute inset-0 bg-gradient-to-l from-amber-500/[0.03] to-transparent pointer-events-none" />
        )}

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
                  winnerSide === "a"
                    ? "border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-110"
                    : "border border-white/10 bg-black/40"
                )}
              />
              {winnerSide === "a" && (
                <div className="absolute -top-1.5 -right-1.5 z-20 bg-amber-500 rounded-full p-0.5 shadow-lg animate-in zoom-in duration-500">
                  <Trophy size={8} className="text-black" />
                </div>
              )}
            </div>
          ) : (
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
              winnerSide === "a"
                ? "bg-amber-500/30 border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)] scale-110"
                : "bg-white/8 border border-white/10"
            )}>
              <span className={cn(
                "text-[8px] sm:text-[9px] font-black",
                winnerSide === "a" ? "text-amber-200" : "text-white/60"
              )}>
                {nameA?.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Score / Time center */}
        <div className="flex flex-col items-center justify-center w-[64px] sm:w-[90px] shrink-0 z-10">
          {isLive ? (
            isSetSport ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 font-black text-white tabular-nums text-sm sm:text-lg tracking-tight">
                  {isTenis && labelA ? (
                    <>
                      <span>{labelA}</span>
                      <span className="text-white/25 text-xs">·</span>
                      <span>{labelB}</span>
                    </>
                  ) : (
                    <>
                      <span>{currentSetScoreA ?? 0}</span>
                      <span className="text-white/25 text-xs">·</span>
                      <span>{currentSetScoreB ?? 0}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-white/35 tabular-nums">
                  <span>{setsWonA ?? 0}</span>
                  <span className="text-white/15">-</span>
                  <span>{setsWonB ?? 0}</span>
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
                  <span className={cn(winnerSide === "a" ? "text-white font-black" : "text-white/35")}>{setsWonA ?? scoreA}</span>
                  <span className="text-white/10 text-xs">-</span>
                  <span className={cn(winnerSide === "b" ? "text-white font-black" : "text-white/35")}>{setsWonB ?? scoreB}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 font-black tabular-nums text-sm sm:text-base tracking-tight">
                  <span className={cn(winnerSide === "a" ? "text-white font-black" : "text-white/35")}>{scoreA}</span>
                  <span className="text-white/10 text-xs">-</span>
                  <span className={cn(winnerSide === "b" ? "text-white font-black" : "text-white/35")}>{scoreB}</span>
                </div>
              )}
              <span className="text-[8px] font-bold text-white/15 uppercase tracking-widest">Final</span>
            </div>
          ) : (
            <div className="flex flex-col items-center px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <span className="text-xs sm:text-sm font-black text-white/80 tabular-nums">
                {formatMatchTime(partido.fecha)}
              </span>
              <span className="text-[7px] font-black text-white/25 uppercase tracking-[0.2em]">Hoy</span>
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
                  winnerSide === "b"
                    ? "border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-110"
                    : "border border-white/10 bg-black/40"
                )}
              />
              {winnerSide === "b" && (
                <div className="absolute -top-1.5 -left-1.5 z-20 bg-amber-500 rounded-full p-0.5 shadow-lg animate-in zoom-in duration-500">
                  <Trophy size={8} className="text-black" />
                </div>
              )}
            </div>
          ) : (
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
              winnerSide === "b"
                ? "bg-amber-500/30 border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)] scale-110"
                : "bg-white/8 border border-white/10"
            )}>
              <span className={cn(
                "text-[8px] sm:text-[9px] font-black",
                winnerSide === "b" ? "text-amber-200" : "text-white/60"
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

// ── Sport group card ─────────────────────────────────────────────────────────

function SportGroup({
  sportName,
  matches,
}: {
  sportName: string;
  matches: Partido[];
}) {
  const hasLive = matches.some((m) => m.estado === "en_curso");
  const accentColor = SPORT_COLORS[sportName] || "#a78bfa";

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border transition-all duration-300 relative group/sport",
        hasLive
          ? SPORT_BORDER[sportName] || "border-white/15"
          : "border-white/[0.06]"
      )}
      style={{
        background: `linear-gradient(135deg, ${accentColor}${hasLive ? '12' : '07'} 0%, transparent 60%)`,
        boxShadow: hasLive ? `0 0 30px ${accentColor}20` : 'none',
      }}
    >
      {/* Large sport watermark icon */}
      <div
        className="absolute -right-4 -bottom-4 pointer-events-none select-none z-0 transition-all duration-1000 group-hover/sport:scale-110 group-hover/sport:opacity-[0.07]"
        style={{ opacity: 0.045 }}
        aria-hidden="true"
      >
        <SportIcon
          sport={sportName}
          size={140}
          variant="react"
          className="text-white"
        />
      </div>

      {/* Subtle radial glow behind icon */}
      <div
        className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full blur-3xl pointer-events-none z-0 opacity-20"
        style={{ backgroundColor: accentColor }}
      />

      {/* Sport header */}
      <div
        className="relative z-10 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]"
        style={{
          background: `linear-gradient(90deg, ${accentColor}15 0%, transparent 80%)`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}25` }}
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
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}20` }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Live</span>
            </div>
          )}
          <span className="text-[10px] font-bold text-white/25 tracking-wider">
            {matches.length} {matches.length === 1 ? "partido" : "partidos"}
          </span>
        </div>
      </div>

      {/* Match rows */}
      <div className="relative z-10">
        {matches.map((match) => (
          <MatchRow key={match.id} partido={match} />
        ))}
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────

interface MatchesTodaySectionProps {
  matches: Partido[];
}

export function MatchesTodaySection({ matches }: MatchesTodaySectionProps) {
  // Get today's matches, or if none, show all non-finished
  const todayMatches = useMemo(() => {
    const today = matches.filter(
      (m) => isToday(m.fecha) && m.estado !== "cancelado"
    );
    if (today.length > 0) return today;
    // Fallback: show upcoming + live matches
    return matches.filter(
      (m) => m.estado === "en_curso" || m.estado === "programado"
    );
  }, [matches]);

  // Group by sport, sorted: sports with live matches first
  const groupedBySport = useMemo(() => {
    const groups = new Map<string, Partido[]>();

    // Sort: live first, then upcoming by time, then finished
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

    // Sort groups: sports with live matches first
    const entries = [...groups.entries()].sort(([, a], [, b]) => {
      const aLive = a.some((m) => m.estado === "en_curso");
      const bLive = b.some((m) => m.estado === "en_curso");
      if (aLive && !bLive) return -1;
      if (bLive && !aLive) return 1;
      return 0;
    });

    return entries;
  }, [todayMatches]);

  if (todayMatches.length === 0) return null;

  const hasAnyLive = todayMatches.some((m) => m.estado === "en_curso");

  return (
    <section className="animate-in slide-in-from-bottom-6 fade-in duration-700">
      <div className="flex flex-col gap-1 mb-6 px-1">
        <p className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-[0.3em]">
          {hasAnyLive ? "Acción en vivo" : "Jornada del día"}
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

      <div className="flex flex-col gap-4">
        {groupedBySport.map(([sport, sportMatches]) => (
          <SportGroup key={sport} sportName={sport} matches={sportMatches} />
        ))}
      </div>
    </section>
  );
}
