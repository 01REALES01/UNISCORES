"use client";

import { motion } from "framer-motion";
import { Zap, Target, Shield, Activity, LayoutGrid, Crosshair, Award, Timer } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { SPORT_COLORS, SPORT_ACCENT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";
import { StatRing } from "./stat-ring";

export interface SportPulseData {
  sport: string;
  totalMatches: number;
  finalizedMatches: number;
  metric1: { value: number; label: string; sublabel: string };
  metric2: { value: number; label: string; sublabel: string };
  metric3: { value: number; label: string; sublabel: string };
}

interface PulseHeaderProps {
  activeSport: string;
  onSportChange: (sport: string) => void;
  availableSports: string[];
  data: SportPulseData;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function PulseHeader({ activeSport, onSportChange, availableSports, data }: PulseHeaderProps) {
  const completionPct = data.totalMatches > 0 ? Math.round((data.finalizedMatches / data.totalMatches) * 100) : 0;
  const accentColor = activeSport === 'Todos' ? '#818cf8' : (SPORT_COLORS[activeSport] || '#818cf8');

  const cards = [
    {
      label: "PARTIDOS",
      accentLine: activeSport === 'Todos' ? "from-indigo-500 to-purple-500" : undefined,
      ring: true,
      ringValue: completionPct,
      mainValue: data.finalizedMatches,
      suffix: `/${data.totalMatches}`,
      sublabel: "Finalizados",
      icon: <Activity size={14} style={{ color: accentColor }} />,
    },
    {
      label: data.metric1.label,
      mainValue: data.metric1.value,
      sublabel: data.metric1.sublabel,
      icon: <Zap size={14} style={{ color: accentColor }} />,
    },
    {
      label: data.metric2.label,
      mainValue: data.metric2.value,
      sublabel: data.metric2.sublabel,
      icon: <Shield size={14} style={{ color: accentColor }} />,
    },
    {
      label: data.metric3.label,
      mainValue: data.metric3.value,
      sublabel: data.metric3.sublabel,
      icon: <Crosshair size={14} style={{ color: accentColor }} />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Sport filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSportChange('Todos')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
            activeSport === 'Todos'
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
              : "bg-white/[0.02] border-white/5 text-white/35 hover:border-white/10 hover:text-white/60"
          )}
        >
          <LayoutGrid size={12} />
          Todos
        </button>
        {availableSports.map(sport => {
          const isActive = activeSport === sport;
          const color = SPORT_COLORS[sport] || '#818cf8';
          return (
            <button
              key={sport}
              onClick={() => onSportChange(sport)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                isActive
                  ? "border-white/20 text-white"
                  : "bg-white/[0.02] border-white/5 text-white/35 hover:border-white/10 hover:text-white/60"
              )}
              style={isActive ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color } : undefined}
            >
              <SportIcon sport={sport} size={12} />
              {sport}
            </button>
          );
        })}
      </div>

      {/* Stat cards */}
      <motion.div
        key={activeSport}
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            variants={item}
            className="relative rounded-2xl bg-white/[0.02] border border-white/5 p-4 sm:p-5 overflow-hidden group hover:border-white/10 transition-colors"
          >
            {/* Accent top line */}
            <div
              className={cn("absolute top-0 left-0 right-0 h-[2px] opacity-60", card.accentLine && `bg-gradient-to-r ${card.accentLine}`)}
              style={!card.accentLine ? { background: `linear-gradient(to right, ${accentColor}, ${accentColor}80)` } : undefined}
            />

            {/* Label */}
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              {card.icon}
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                {card.label}
              </span>
            </div>

            {/* Main content */}
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounter
                    value={card.mainValue}
                    className="text-3xl sm:text-4xl font-black tabular-nums text-white font-outfit"
                  />
                  {card.suffix && (
                    <span className="text-sm sm:text-base font-bold text-white/20 tabular-nums">{card.suffix}</span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/30 font-medium mt-1">{card.sublabel}</p>
              </div>

              {card.ring && (
                <StatRing value={card.ringValue!} size={52} strokeWidth={4} color={accentColor}>
                  <span className="text-[10px] font-black text-white/60 tabular-nums">{card.ringValue}%</span>
                </StatRing>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
