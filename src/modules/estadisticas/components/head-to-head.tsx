"use client";

import { motion } from "framer-motion";
import { Avatar } from "@/components/ui-primitives";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Rivalry {
  carrera_a: { id: number; nombre: string; escudo_url: string | null };
  carrera_b: { id: number; nombre: string; escudo_url: string | null };
  wins_a: number;
  wins_b: number;
  draws: number;
  totalMatches: number;
}

interface HeadToHeadProps {
  rivalries: Rivalry[];
}

export function HeadToHead({ rivalries }: HeadToHeadProps) {
  if (rivalries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rivalries.map((rivalry, idx) => {
        const total = rivalry.wins_a + rivalry.wins_b + rivalry.draws;
        const pctA = total > 0 ? (rivalry.wins_a / total) * 100 : 50;
        const pctB = total > 0 ? (rivalry.wins_b / total) * 100 : 50;
        const aLeads = rivalry.wins_a > rivalry.wins_b;
        const bLeads = rivalry.wins_b > rivalry.wins_a;
        const tied = rivalry.wins_a === rivalry.wins_b;

        return (
          <motion.div
            key={`${rivalry.carrera_a.id}-${rivalry.carrera_b.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.06 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 overflow-hidden hover:border-white/10 transition-colors"
          >
            {/* Teams row */}
            <div className="flex items-center justify-between mb-3">
              {/* Team A */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar
                  name={rivalry.carrera_a.nombre}
                  src={rivalry.carrera_a.escudo_url}
                  className="w-8 h-8 shrink-0"
                />
                <span className={cn(
                  "text-xs font-bold truncate",
                  aLeads ? "text-white" : "text-white/40"
                )}>
                  {rivalry.carrera_a.nombre}
                </span>
              </div>

              {/* VS badge */}
              <div className="shrink-0 mx-2 flex flex-col items-center">
                <Swords size={12} className="text-white/15 mb-0.5" />
                <span className="text-[8px] font-black text-white/15 tabular-nums">
                  {rivalry.totalMatches}
                </span>
              </div>

              {/* Team B */}
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className={cn(
                  "text-xs font-bold truncate text-right",
                  bLeads ? "text-white" : "text-white/40"
                )}>
                  {rivalry.carrera_b.nombre}
                </span>
                <Avatar
                  name={rivalry.carrera_b.nombre}
                  src={rivalry.carrera_b.escudo_url}
                  className="w-8 h-8 shrink-0"
                />
              </div>
            </div>

            {/* Score line */}
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-lg font-black tabular-nums font-outfit",
                aLeads ? "text-emerald-400" : tied ? "text-white/60" : "text-white/30"
              )}>
                {rivalry.wins_a}
              </span>
              {rivalry.draws > 0 && (
                <span className="text-[9px] font-bold text-white/20">{rivalry.draws} empates</span>
              )}
              <span className={cn(
                "text-lg font-black tabular-nums font-outfit",
                bLeads ? "text-emerald-400" : tied ? "text-white/60" : "text-white/30"
              )}>
                {rivalry.wins_b}
              </span>
            </div>

            {/* Dominance bar */}
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${pctA}%` }}
                transition={{ duration: 0.6, delay: 0.3 + idx * 0.06 }}
                className={cn(
                  "rounded-l-full",
                  aLeads ? "bg-emerald-500" : "bg-white/20"
                )}
              />
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${pctB}%` }}
                transition={{ duration: 0.6, delay: 0.3 + idx * 0.06 }}
                className={cn(
                  "rounded-r-full",
                  bLeads ? "bg-indigo-500" : "bg-white/10"
                )}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
