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
  activeGender: string;
  onGenderChange: (gender: string) => void;
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

export function PulseHeader({ activeSport, onSportChange, activeGender, onGenderChange, availableSports, data }: PulseHeaderProps) {
  const completionPct = data.totalMatches > 0 ? Math.round((data.finalizedMatches / data.totalMatches) * 100) : 0;
  const accentColor = activeSport === 'Todos' ? '#818cf8' : (SPORT_COLORS[activeSport] || '#818cf8');

  const cards = [
    {
      label: "Partidos",
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
    <div className="space-y-8">
      {/* Gender filter - Centered and Premium */}
      <div className="flex justify-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex gap-1.5 p-1.5 bg-black/40 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl w-full max-w-md">
          {[
            { label: 'Todos', value: 'Todos', icon: Activity },
            { label: 'Masculino', value: 'Masculino', icon: Zap },
            { label: 'Femenino', value: 'Femenino', icon: Award },
          ].map((g) => {
            const isSelected = activeGender === g.value;
            return (
              <button
                key={g.value}
                onClick={() => onGenderChange(g.value)}
                className={cn(
                  "relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-display font-black tracking-widest transition-all border whitespace-nowrap",
                  isSelected
                    ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-xl scale-105"
                    : "bg-transparent border-transparent text-white/50 hover:text-white/80"
                )}
              >
                <g.icon size={12} className={cn(isSelected ? "text-[#7C3AED]" : "text-violet-400")} />
                <span className="uppercase">{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sport filter pills - Cleaner list */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-2">
        {availableSports.map(sport => {
          const isActive = activeSport === sport;
          const color = SPORT_COLORS[sport] || '#818cf8';
          return (
            <button
              key={sport}
              onClick={() => onSportChange(isActive ? 'Todos' : sport)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-display font-black tracking-wide transition-all border",
                isActive
                  ? "border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  : "bg-black/20 backdrop-blur-md border-white/5 text-white/40 hover:border-white/20 hover:text-white/80"
              )}
              style={isActive ? { backgroundColor: `${color}15`, borderColor: `${color}40`, color, boxShadow: `0 0 15px ${color}20` } : undefined}
            >
              <SportIcon sport={sport} size={12} />
              <span className="uppercase">{sport}</span>
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
            className="relative rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-white/10 p-5 sm:p-6 overflow-hidden group hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all duration-500"
          >
            {/* Accent top line */}
            <div
              className={cn("absolute top-0 left-0 right-0 h-[2px] opacity-60", card.accentLine && `bg-gradient-to-r ${card.accentLine}`)}
              style={!card.accentLine ? { background: `linear-gradient(to right, ${accentColor}, ${accentColor}80)` } : undefined}
            />

            {/* Label */}
            <div className="flex items-center gap-2.5 mb-5">
              {card.icon}
              <span className="text-[11px] font-bold tracking-wide font-display text-white/40">
                {card.label}
              </span>
            </div>

            {/* Main content */}
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <AnimatedCounter
                    value={card.mainValue}
                    className="text-4xl sm:text-5xl font-black tabular-nums text-white font-mono tracking-tighter"
                  />
                  {card.suffix && (
                    <span className="text-sm sm:text-base font-bold text-white/20 font-mono tracking-tighter">{card.suffix}</span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-white/40 font-display tracking-wide mt-1.5">{card.sublabel}</p>
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
