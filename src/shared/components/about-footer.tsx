"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Heart, Sparkles } from "lucide-react";

const TEAM = [
  {
    name: "Jean Reales",
    role: "Desarrollador Full Stack",
    semester: "9no Semestre",
    initials: "JR",
    accentColor: "indigo",
    gradient: "from-indigo-500 to-purple-600",
    bgGradient: "from-indigo-500/10 to-purple-600/10",
    border: "border-indigo-500/20",
    shadow: "shadow-indigo-500/20",
  },
  {
    name: "Donald Pimienta",
    role: "Desarrollador Full Stack",
    semester: "7mo Semestre",
    initials: "DP",
    accentColor: "emerald",
    gradient: "from-emerald-500 to-teal-600",
    bgGradient: "from-emerald-500/10 to-teal-600/10",
    border: "border-emerald-500/20",
    shadow: "shadow-emerald-500/20",
  },
  {
    name: "Orlando Palma",
    role: "Desarrollador Full Stack",
    semester: "7mo Semestre",
    initials: "OP",
    accentColor: "amber",
    gradient: "from-amber-500 to-orange-600",
    bgGradient: "from-amber-500/10 to-orange-600/10",
    border: "border-amber-500/20",
    shadow: "shadow-amber-500/20",
  },
  {
    name: "Luis Daniel Silva",
    role: "Desarrollador Full Stack",
    semester: "7mo Semestre",
    initials: "LS",
    accentColor: "cyan",
    gradient: "from-cyan-500 to-blue-600",
    bgGradient: "from-cyan-500/10 to-blue-600/10",
    border: "border-cyan-500/20",
    shadow: "shadow-cyan-500/20",
  },
];

export function AboutFooter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Pill */}
      <div className="flex justify-center mt-12 mb-4 w-full animate-in fade-in duration-1000">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.06] transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Heart size={14} className="text-rose-500/80 group-hover:text-rose-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-300" />
          <span className="text-xs font-medium text-white/40 group-hover:text-white/80 transition-colors tracking-wide">
            Un proyecto del <strong className="text-white/60 group-hover:text-white font-black">Uniscores Team</strong>
          </span>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full sm:max-w-md bg-[#0a0816] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5 animate-in slide-in-from-bottom-8 duration-400 max-h-[85vh] sm:max-h-[90vh] flex flex-col">
            {/* Ambient glow */}
            <div className="absolute -top-32 -right-32 w-72 h-72 bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-purple-500/15 rounded-full blur-[80px] pointer-events-none" />

            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>

            {/* Scrollable content */}
            <div className="relative overflow-y-auto flex-1 p-5 sm:p-8">
              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/10 mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20" />
                  <Sparkles className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] relative z-10" size={22} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-2">
                  Uniscores Team
                </h3>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed max-w-[300px]">
                  Diseñado y desarrollado con pasión por estudiantes de Ingeniería de Sistemas de la Universidad del Norte.
                </p>
              </div>

              {/* Team grid — 2 cols on mobile, stacked cards on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 sm:gap-3">
                {TEAM.map((member, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative group rounded-2xl border transition-all hover:scale-[1.02] cursor-default overflow-hidden",
                      // Mobile: compact card layout
                      "p-3 sm:p-4",
                      // Desktop: horizontal layout
                      "flex flex-col sm:flex-row sm:items-center sm:gap-4",
                      member.border,
                      `bg-gradient-to-br ${member.bgGradient}`
                    )}
                  >
                    {/* Avatar circle with initials */}
                    <div className={cn(
                      "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0 font-black text-sm text-white",
                      `bg-gradient-to-br ${member.gradient}`,
                      `shadow-lg ${member.shadow}`
                    )}>
                      {member.initials}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-white font-bold text-sm sm:text-base leading-tight mb-0.5 truncate">
                        {member.name}
                      </h4>
                      <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-white/50 truncate">
                        {member.role}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-white/30 font-medium tracking-wide hidden sm:block">
                        Ingeniería de Sistemas · {member.semester}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 text-center">
                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-white/20">
                  © 2026 GIGA OLYMPICS
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
