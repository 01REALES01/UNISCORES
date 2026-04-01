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
      <div className="flex flex-col gap-1 mb-8 px-1">
        <p className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-[0.3em]">
          Live action
        </p>
        <div className="flex items-center gap-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
            Partidos
          </h2>
          <span className="flex items-center gap-1.5 text-[9px] font-black text-white bg-emerald-500 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse uppercase tracking-widest h-fit">
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map(partido => (
          <LiveMatchCard key={partido.id} partido={partido} />
        ))}
      </div>
    </section>
  );
}
