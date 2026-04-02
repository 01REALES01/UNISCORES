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
            className="relative rounded-[2rem] border border-white/10 bg-black/20 backdrop-blur-md p-5 sm:p-6 overflow-hidden group hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.02)]"
          >
            {/* Radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-[40px] opacity-[0.06] pointer-events-none bg-white" />

            {/* Icon */}
            <div className="flex items-center gap-2.5 mb-4">
              <Icon size={16} className={cn("drop-shadow-sm", accent)} />
              <span className="text-[10px] font-display font-black tracking-widest text-white/40 leading-none">
                {record.label}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-center gap-3 mb-3">
              <span className={cn("text-3xl sm:text-5xl font-black tabular-nums font-mono tracking-tighter drop-shadow-md", accent)}>
                {record.value}
              </span>
              <SportIcon sport={record.sportName} size={22} className={cn("opacity-30", accent)} />
            </div>

            {/* Player info */}
            <p className="text-sm font-bold text-white/80 truncate font-display">{record.playerName}</p>
            {record.context && (
              <p className="text-[11px] text-white/40 font-display tracking-wide mt-1">{record.context}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
