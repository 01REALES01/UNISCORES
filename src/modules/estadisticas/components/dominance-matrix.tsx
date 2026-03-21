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
                "group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all relative overflow-hidden",
                idx < 3 && `border-l-2 ${PODIUM_BORDERS[idx]}`
              )}
            >
              {/* Rank */}
              <div className="w-6 sm:w-8 text-center shrink-0">
                {idx === 0 ? (
                  <Crown size={18} className="text-[#FFD700] mx-auto" />
                ) : (
                  <span className="text-sm sm:text-base font-black text-white/20 tabular-nums font-outfit">
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
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {career.nombre}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                    <span className="text-[10px] sm:text-xs tabular-nums font-bold">
                      <span className="text-emerald-400">{career.victorias}V</span>
                      <span className="text-white/20 mx-0.5">·</span>
                      <span className="text-red-400">{career.derrotas}D</span>
                      {career.empates > 0 && (
                        <>
                          <span className="text-white/20 mx-0.5">·</span>
                          <span className="text-white/40">{career.empates}E</span>
                        </>
                      )}
                    </span>
                    <span className={cn(
                      "text-[10px] sm:text-xs font-black tabular-nums",
                      diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-white/30"
                    )}>
                      {diff > 0 ? "+" : ""}{diff}
                    </span>
                  </div>
                </div>

                {/* Win rate bar */}
                <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      idx === 0
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                        : idx === 1
                          ? "bg-gradient-to-r from-slate-400 to-slate-300"
                          : idx === 2
                            ? "bg-gradient-to-r from-amber-700 to-amber-600"
                            : "bg-gradient-to-r from-indigo-500 to-purple-500"
                    )}
                  />
                </div>
              </div>

              {/* Win rate pct */}
              <div className="shrink-0 text-right">
                <span className="text-base sm:text-lg font-black tabular-nums text-white/80 font-outfit">
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
          className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
        >
          {expanded ? "Ver menos" : `Ver todas (${rankings.length})`}
          <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
