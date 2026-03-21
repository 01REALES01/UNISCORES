"use client";

import { motion } from "framer-motion";
import { SPORT_ACCENT } from "@/lib/constants";
import { SportIcon } from "@/components/sport-icons";
import { cn } from "@/lib/utils";
import { Flame, Zap, Swords, Target } from "lucide-react";

export interface RecordEntry {
  label: string;
  value: number;
  playerName: string;
  sportName: string;
  context?: string; // e.g. "vs Derecho"
  icon: "flame" | "zap" | "swords" | "target";
}

interface RecordBookProps {
  records: RecordEntry[];
}

const ICONS = {
  flame: Flame,
  zap: Zap,
  swords: Swords,
  target: Target,
};

export function RecordBook({ records }: RecordBookProps) {
  if (records.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {records.map((record, idx) => {
        const Icon = ICONS[record.icon];
        const accent = SPORT_ACCENT[record.sportName] || "text-indigo-400";

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 overflow-hidden group hover:border-white/10 transition-colors"
          >
            {/* Radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-[40px] opacity-[0.06] pointer-events-none bg-white" />

            {/* Icon */}
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} className={accent} />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25 leading-none">
                {record.label}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-center gap-2.5 mb-2">
              <span className={cn("text-3xl sm:text-4xl font-black tabular-nums font-outfit", accent)}>
                {record.value}
              </span>
              <SportIcon sport={record.sportName} size={18} className={cn("opacity-40", accent)} />
            </div>

            {/* Player info */}
            <p className="text-xs font-bold text-white/70 truncate">{record.playerName}</p>
            {record.context && (
              <p className="text-[10px] text-white/25 font-medium mt-0.5">{record.context}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
