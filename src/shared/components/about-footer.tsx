"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { X, Heart, Code2, Sparkles } from "lucide-react";

const TEAM = [
  {
    name: "Jean Reales",
    role: "Ingeniero de Software (9no Semestre)",
    carreer: "Ingeniería de Sistemas",
    icon: <Code2 size={16} className="text-indigo-400" />,
    gradient: "from-indigo-500/10 to-purple-600/10",
    border: "border-indigo-500/20"
  },
  {
    name: "Donald Pimienta",
    role: "Ingeniero de Software (7mo Semestre)",
    carreer: "Ingeniería de Sistemas",
    icon: <Code2 size={16} className="text-emerald-400" />,
    gradient: "from-emerald-500/10 to-teal-600/10",
    border: "border-emerald-500/20"
  },
  {
    name: "Orlando Palma",
    role: "Ingeniero de Software (7mo Semestre)",
    carreer: "Ingeniería de Sistemas",
    icon: <Code2 size={16} className="text-amber-400" />,
    gradient: "from-amber-500/10 to-orange-600/10",
    border: "border-amber-500/20"
  },
  {
    name: "Luis Daniel Silva",
    role: "Ingeniero de Software (7mo Semestre)",
    carreer: "Ingeniería de Sistemas",
    icon: <Code2 size={16} className="text-cyan-400" />,
    gradient: "from-cyan-500/10 to-blue-600/10",
    border: "border-cyan-500/20"
  }
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative w-full max-w-lg bg-[#0a0816] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5 animate-in slide-in-from-bottom-8 zoom-in-95 duration-500">
            {/* Grainy Ambient Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative p-6 sm:p-8">
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-10">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20" />
                  <Sparkles className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] relative z-10" size={24} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight leading-none mb-3">
                  Creadores
                </h3>
                <p className="text-white/40 text-sm leading-relaxed max-w-[280px]">
                  Diseñado y desarrollado con pasión extrema por estudiantes de la Universidad del Norte para toda la comunidad.
                </p>
              </div>

              <div className="space-y-4">
                {TEAM.map((member, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r border transition-all hover:scale-[1.02] cursor-default",
                      member.gradient,
                      member.border
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#0a0816] border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                      {member.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-bold leading-none mb-1.5">{member.name}</h4>
                      <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white/50 mb-0.5">
                        {member.role}
                      </p>
                      <p className="text-[10px] text-white/30 font-medium tracking-wide">
                        {member.carreer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 text-center">
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
