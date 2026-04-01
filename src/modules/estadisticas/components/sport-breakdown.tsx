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
              className="snap-start shrink-0 w-[240px] sm:w-[280px] rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-2xl p-5 sm:p-6 relative overflow-hidden group hover:border-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.02)] hover:bg-black/60 transition-all duration-500 flex flex-col"
              style={{ borderTopColor: `${color}40` }}
            >
              {/* Subtle sport glow */}
              <div
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-[0.15] pointer-events-none transition-opacity duration-500 group-hover:opacity-30"
                style={{ backgroundColor: color }}
              />

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/5 bg-white/5 backdrop-blur-sm" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                  <SportIcon sport={sport.name} size={18} className={accentClass} />
                </div>
                <div>
                  <h4 className="text-base font-black font-sans text-white leading-tight">{sport.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Users size={12} className="text-white/30" />
                    <span className="text-[10px] font-display text-white/40 tabular-nums tracking-wiide">
                      {sport.finalizedMatches}/{sport.totalMatches} partidos
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/5 mb-5 overflow-hidden ring-1 ring-inset ring-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + idx * 0.06 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-3xl font-black tabular-nums text-white font-mono tracking-tighter drop-shadow-md">
                    {sport.totalPoints}
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-white/40 font-display tracking-wide mt-1">{sport.metricLabel}</p>
                </div>
                <div>
                  <span className={cn("text-3xl font-black tabular-nums font-mono tracking-tighter drop-shadow-md", accentClass)}>
                    {sport.avgPerMatch.toFixed(1)}
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-white/40 font-display tracking-wide mt-1">{sport.avgLabel}</p>
                </div>
              </div>

              {/* Top scorer */}
              {sport.topScorer && (
                <div className="pt-4 mt-auto border-t border-white/5">
                  <div className="flex items-center gap-2.5">
                    <Trophy size={14} className={accentClass} />
                    <span className="text-[10px] font-black uppercase font-display tracking-widest text-white/40">
                      Top Scorer
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-sm font-display font-medium text-white/80 truncate max-w-[140px] drop-shadow-sm">
                      {sport.topScorer.nombre}
                    </span>
                    <span className={cn("text-base font-black tabular-nums font-mono drop-shadow-sm", accentClass)}>
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
