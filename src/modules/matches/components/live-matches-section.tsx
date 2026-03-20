import { Zap } from "lucide-react";
import { LiveMatchCard } from "./match-card";
import type { PartidoWithRelations as Partido } from '../types';

interface LiveMatchesSectionProps {
  matches: Partido[];
}

export function LiveMatchesSection({ matches }: LiveMatchesSectionProps) {
  if (matches.length === 0) return null;

  return (
    <section className="animate-in slide-in-from-bottom-6 fade-in duration-700">
      <div className="flex items-center gap-3 mb-5 px-1">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500 blur-lg opacity-20" />
          <div className="relative p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
            <Zap size={18} fill="currentColor" />
          </div>
        </div>
        <h2 className="text-xl font-black text-white tracking-widest uppercase">EN CURSO AHORA</h2>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-black text-white bg-red-600 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)] animate-pulse uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map(partido => (
          <LiveMatchCard key={partido.id} partido={partido} />
        ))}
      </div>
    </section>
  );
}
