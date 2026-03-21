"use client";

import { motion } from "framer-motion";
import { SPORT_COLORS, SPORT_ACCENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { cn } from "@/lib/utils";
import { Trophy, Users } from "lucide-react";

export interface SportStat {
  name: string;
  totalMatches: number;
  finalizedMatches: number;
  totalPoints: number;
  avgPerMatch: number;
  metricLabel: string; // "Goles", "Puntos", "Sets", etc.
  avgLabel: string;    // "Goles/Partido", "Pts/Partido", etc.
  topScorer: {
    nombre: string;
    puntos: number;
  } | null;
}

interface SportBreakdownProps {
  sports: SportStat[];
}

export function SportBreakdown({ sports }: SportBreakdownProps) {
  if (sports.length === 0) return null;

  return (
    <div className="relative">
      {/* Fade edges for scroll hint */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0a0816] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0a0816] to-transparent z-10 pointer-events-none" />

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {sports.map((sport, idx) => {
          const color = SPORT_COLORS[sport.name] || "#818cf8";
          const accentClass = SPORT_ACCENT[sport.name] || "text-indigo-400";
          const progress = sport.totalMatches > 0
            ? (sport.finalizedMatches / sport.totalMatches) * 100
            : 0;

          return (
            <motion.div
              key={sport.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              className="snap-start shrink-0 w-[220px] sm:w-[250px] rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 relative overflow-hidden group hover:border-white/10 transition-colors"
              style={{ borderTopColor: `${color}30` }}
            >
              {/* Subtle sport glow */}
              <div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-10 pointer-events-none"
                style={{ backgroundColor: color }}
              />

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <SportIcon sport={sport.name} size={16} className={accentClass} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">{sport.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users size={10} className="text-white/30" />
                    <span className="text-[9px] font-bold text-white/30 tabular-nums">
                      {sport.finalizedMatches}/{sport.totalMatches} partidos
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-white/5 mb-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + idx * 0.06 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <span className="text-xl font-black tabular-nums text-white font-outfit">
                    {sport.totalPoints}
                  </span>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{sport.metricLabel}</p>
                </div>
                <div>
                  <span className={cn("text-xl font-black tabular-nums font-outfit", accentClass)}>
                    {sport.avgPerMatch.toFixed(1)}
                  </span>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{sport.avgLabel}</p>
                </div>
              </div>

              {/* Top scorer */}
              {sport.topScorer && (
                <div className="pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Trophy size={12} className={accentClass} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                      Líder
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-white/70 truncate max-w-[140px]">
                      {sport.topScorer.nombre}
                    </span>
                    <span className={cn("text-sm font-black tabular-nums", accentClass)}>
                      {sport.topScorer.puntos}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
