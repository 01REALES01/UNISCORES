"use client";

import { cn } from "@/lib/utils";
import type { PartidoWithRelations as Partido } from "@/modules/matches/types";

interface BasketballScoreboardProps {
  match: Partido;
  sportColor: string;
}

export function BasketballScoreboard({ match, sportColor }: BasketballScoreboardProps) {
  const detalle = match.marcador_detalle as {
    total_a?: number;
    total_b?: number;
    cuarto_actual?: number;
    cuartos?: Record<number, { puntos_a: number; puntos_b: number }>;
  } | null | undefined;

  const totalA = detalle?.total_a ?? 0;
  const totalB = detalle?.total_b ?? 0;
  const cuartoActual = detalle?.cuarto_actual ?? 0;
  const cuartos = detalle?.cuartos ?? {};

  const isLive = match.estado === 'en_curso';
  const isFinished = match.estado === 'finalizado';

  // Always show Q1–Q4; add overtime columns only if they exist
  const maxPeriod = Math.max(4, ...Object.keys(cuartos).map(Number));
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const getPeriodLabel = (p: number) => {
    if (p <= 4) return `${p}C`;
    return `PT${p - 4}`;
  };

  const getPeriodScore = (p: number, team: 'a' | 'b'): string => {
    const entry = cuartos[p];
    if (!entry) return '—';
    return String(team === 'a' ? entry.puntos_a : entry.puntos_b);
  };

  const isActiveQuarter = (p: number) => isLive && p === cuartoActual;
  const teamAWins = isFinished && totalA > totalB;
  const teamBWins = isFinished && totalB > totalA;

  return (
    <div
      className="rounded-[2.5rem] backdrop-blur-2xl border border-white/5 p-6 sm:p-8 shadow-2xl shadow-black/40"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-5 px-1">
        Marcador
      </p>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[280px] border-collapse">
          <thead>
            <tr>
              <th className="text-left pb-3 pr-4 w-1/3" />
              {periods.map((p) => (
                <th
                  key={p}
                  className={cn(
                    "text-center pb-3 px-2 text-[11px] font-black uppercase tracking-widest transition-colors min-w-[36px]",
                    isActiveQuarter(p) ? "text-white" : "text-white/30"
                  )}
                  style={isActiveQuarter(p) ? { color: sportColor } : undefined}
                >
                  {getPeriodLabel(p)}
                </th>
              ))}
              <th className="text-center pb-3 pl-3 text-[11px] font-black uppercase tracking-widest text-white/30 min-w-[48px]">
                Resul.
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Team A */}
            <tr className="border-t border-white/[0.06]">
              <td className="py-4 pr-4 text-sm font-bold text-white/80 truncate max-w-[100px]">
                {match.equipo_a}
              </td>
              {periods.map((p) => {
                const score = getPeriodScore(p, 'a');
                const isActive = isActiveQuarter(p);
                const played = cuartos[p] !== undefined;
                return (
                  <td
                    key={p}
                    className={cn(
                      "text-center py-4 px-2 text-sm font-black tabular-nums transition-all",
                      isActive ? "text-white" : played ? "text-white/70" : "text-white/20"
                    )}
                    style={isActive ? { color: sportColor } : undefined}
                  >
                    {score}
                  </td>
                );
              })}
              <td className="py-2 pl-3">
                <div
                  className={cn(
                    "text-center rounded-xl px-2 py-1.5 text-base font-black tabular-nums transition-all",
                    teamAWins
                      ? "text-white shadow-lg"
                      : isLive
                        ? "text-white/80"
                        : "text-white/50 bg-white/[0.04]"
                  )}
                  style={teamAWins ? { backgroundColor: sportColor + '33', color: sportColor } : undefined}
                >
                  {totalA}
                </div>
              </td>
            </tr>

            {/* Team B */}
            <tr className="border-t border-white/[0.06]">
              <td className="py-4 pr-4 text-sm font-bold text-white/80 truncate max-w-[100px]">
                {match.equipo_b}
              </td>
              {periods.map((p) => {
                const score = getPeriodScore(p, 'b');
                const isActive = isActiveQuarter(p);
                const played = cuartos[p] !== undefined;
                return (
                  <td
                    key={p}
                    className={cn(
                      "text-center py-4 px-2 text-sm font-black tabular-nums transition-all",
                      isActive ? "text-white" : played ? "text-white/70" : "text-white/20"
                    )}
                    style={isActive ? { color: sportColor } : undefined}
                  >
                    {score}
                  </td>
                );
              })}
              <td className="py-2 pl-3">
                <div
                  className={cn(
                    "text-center rounded-xl px-2 py-1.5 text-base font-black tabular-nums transition-all",
                    teamBWins
                      ? "text-white shadow-lg"
                      : isLive
                        ? "text-white/80"
                        : "text-white/50 bg-white/[0.04]"
                  )}
                  style={teamBWins ? { backgroundColor: sportColor + '33', color: sportColor } : undefined}
                >
                  {totalB}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
