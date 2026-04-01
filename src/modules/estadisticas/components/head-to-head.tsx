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
            className="rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-md p-6 overflow-hidden group hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.02)]"
          >
            {/* Teams row */}
            <div className="flex items-center justify-between mb-3">
              {/* Team A */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                  name={rivalry.carrera_a.nombre}
                  src={rivalry.carrera_a.escudo_url}
                  className="w-10 h-10 shrink-0 border border-white/10"
                />
                <span className={cn(
                  "text-sm font-black truncate font-display tracking-tight",
                  aLeads ? "text-white" : "text-white/40"
                )}>
                  {rivalry.carrera_a.nombre}
                </span>
              </div>

              {/* VS badge */}
              <div className="shrink-0 mx-4 flex flex-col items-center relative">
                <div className="w-8 h-8 rotate-45 border border-white/10 bg-white/5 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                  <Swords size={14} className="text-white/40 -rotate-45" />
                </div>
                <span className="absolute -bottom-5 text-[10px] font-black font-display text-white/20 tabular-nums">
                  {rivalry.totalMatches}
                </span>
              </div>

              {/* Team B */}
              <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                <span className={cn(
                  "text-sm font-black truncate text-right font-display tracking-tight",
                  bLeads ? "text-white" : "text-white/40"
                )}>
                  {rivalry.carrera_b.nombre}
                </span>
                <Avatar
                  name={rivalry.carrera_b.nombre}
                  src={rivalry.carrera_b.escudo_url}
                  className="w-10 h-10 shrink-0 border border-white/10"
                />
              </div>
            </div>

            {/* Score line */}
            <div className="flex items-center justify-between mb-3 mt-4">
              <span className={cn(
                "text-2xl font-black tabular-nums font-mono tracking-tighter drop-shadow-md",
                aLeads ? "text-emerald-400" : tied ? "text-white/60" : "text-white/30"
              )}>
                {rivalry.wins_a}
              </span>
              {rivalry.draws > 0 && (
                <span className="text-[10px] font-black font-display text-white/20 uppercase tracking-widest">{rivalry.draws} empates</span>
              )}
              <span className={cn(
                "text-2xl font-black tabular-nums font-mono tracking-tighter drop-shadow-md",
                bLeads ? "text-violet-400" : tied ? "text-white/60" : "text-white/30"
              )}>
                {rivalry.wins_b}
              </span>
            </div>

            {/* Dominance bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-white/5 ring-1 ring-inset ring-white/5">
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${pctA}%` }}
                transition={{ duration: 0.6, delay: 0.3 + idx * 0.06 }}
                className={cn(
                  "rounded-l-full",
                  aLeads ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-white/10"
                )}
              />
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${pctB}%` }}
                transition={{ duration: 0.6, delay: 0.3 + idx * 0.06 }}
                className={cn(
                  "rounded-r-full",
                  bLeads ? "bg-gradient-to-l from-violet-600 to-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.3)]" : "bg-white/5"
                )}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
