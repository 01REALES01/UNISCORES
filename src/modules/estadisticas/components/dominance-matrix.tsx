"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Avatar } from "@/components/ui-primitives";
import { ChevronDown, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface CareerRanking {
  carrera_id: number;
  nombre: string;
  escudo_url: string | null;
  victorias: number;
  derrotas: number;
  empates: number;
  total_partidos: number;
  win_rate: number;
  puntos_favor: number;
  puntos_contra: number;
}

interface DominanceMatrixProps {
  rankings: CareerRanking[];
}

const PODIUM_BORDERS = [
  "border-l-[#FFD700]", // gold
  "border-l-[#C0C0C0]", // silver
  "border-l-[#CD7F32]", // bronze
];

export function DominanceMatrix({ rankings }: DominanceMatrixProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rankings : rankings.slice(0, 8);
  const maxWins = Math.max(...rankings.map(r => r.victorias), 1);

  if (rankings.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map((career, idx) => {
        const barWidth = (career.victorias / maxWins) * 100;
        const diff = career.puntos_favor - career.puntos_contra;

        return (
          <motion.div
            key={career.carrera_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={`/carrera/${career.carrera_id}`}
              className={cn(
                "group flex items-center gap-3 sm:gap-4 p-3 sm:p-5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 hover:border-white/20 transition-all duration-300 relative overflow-hidden",
                idx < 3 && `border-l-[3px] ${PODIUM_BORDERS[idx]}`
              )}
            >
              {/* Rank */}
              <div className="w-6 sm:w-10 text-center shrink-0">
                {idx === 0 ? (
                  <Crown size={20} className="text-[#FFD700] mx-auto drop-shadow-md" />
                ) : (
                  <span className="text-sm sm:text-lg font-black font-display text-white/30 tabular-nums drop-shadow-sm">
                    {idx + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar
                name={career.nombre}
                src={career.escudo_url}
                className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
              />

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm sm:text-base font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                    {career.nombre}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                    <span className="text-[10px] sm:text-xs tabular-nums font-display font-bold tracking-wider">
                      <span className="text-emerald-400">{career.victorias}V</span>
                      <span className="text-white/20 mx-0.5">·</span>
                      <span className="text-rose-400">{career.derrotas}D</span>
                      {career.empates > 0 && (
                        <>
                          <span className="text-white/20 mx-0.5">·</span>
                          <span className="text-white/50">{career.empates}E</span>
                        </>
                      )}
                    </span>
                    <span className={cn(
                      "text-xs sm:text-sm font-black tabular-nums font-mono",
                      diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-white/30"
                    )}>
                      {diff > 0 ? "+" : ""}{diff}
                    </span>
                  </div>
                </div>

                {/* Win rate bar */}
                <div className="relative h-2 rounded-full bg-white/5 overflow-hidden ring-1 ring-inset ring-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]",
                      idx === 0
                        ? "bg-gradient-to-r from-amber-600 to-amber-400"
                        : idx === 1
                          ? "bg-gradient-to-r from-slate-400 to-slate-200"
                          : idx === 2
                            ? "bg-gradient-to-r from-orange-600 to-orange-400"
                            : "bg-gradient-to-r from-violet-600 to-violet-400"
                    )}
                  />
                </div>
              </div>

              {/* Win rate pct */}
              <div className="shrink-0 text-right w-12 sm:w-16">
                <span className="text-lg sm:text-xl font-black tabular-nums text-white/90 font-mono tracking-tighter drop-shadow-md">
                  {Math.round(career.win_rate)}%
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}

      {rankings.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-4 mt-2 text-xs font-display font-black tracking-widest text-white/40 hover:text-white/80 transition-colors border border-dashed border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/5"
        >
          {expanded ? "Ver menos" : `Ver todas (${rankings.length})`}
          <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
