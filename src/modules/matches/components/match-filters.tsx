import { cn } from "@/lib/utils";
import { LayoutGrid, Star } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_GLOW, SPORT_GRADIENT } from "@/lib/constants";
import type { PartidoWithRelations as Partido } from '../types';

function SportLabel({ name }: { name: string }) {
  const display = name === 'Tenis de Mesa' ? 'T. Mesa' : name;
  const firstWord = display.split(' ')[0];
  const rest = display.slice(firstWord.length);
  const bold = firstWord.slice(0, 2);
  const normal = firstWord.slice(2);
  return (
    <span className="font-display text-[14px] z-10 leading-none text-center px-1 capitalize text-[#F9AF22]">
      <span className="font-black">{bold}</span>{normal}{rest}
    </span>
  );
}

interface MatchFiltersProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  matches: Partido[];
}

export function MatchFilters({ activeFilter, setActiveFilter, matches }: MatchFiltersProps) {
  const allSports = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 md:justify-center px-2">
      <button
        onClick={() => setActiveFilter('todos')}
        className={cn(
          "group relative min-w-[90px] h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all duration-300 overflow-hidden shrink-0",
          activeFilter === 'todos'
            ? "bg-red-600 text-white border-red-600 shadow-lg scale-105"
            : "bg-black/30 border-white/10 text-slate-400 hover:bg-black/40 hover:text-white"
        )}
      >
        <LayoutGrid size={20} className={cn("transition-all z-10 drop-shadow-md", activeFilter === 'todos' ? 'text-white' : 'text-slate-500 group-hover:text-white')} />
        <span className="text-[10px] font-black uppercase tracking-widest z-10 leading-none text-center px-1">Todos</span>
        {activeFilter === 'todos' && (
          <LayoutGrid size={60} className="absolute -bottom-4 -right-4 text-white/10" />
        )}
      </button>

      <button
        onClick={() => setActiveFilter('favoritos')}
        className={cn(
          "group relative min-w-[90px] h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all duration-300 overflow-hidden shrink-0",
          activeFilter === 'favoritos'
            ? "bg-black/20 border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-105"
            : "bg-black/30 border-white/10 text-slate-400 hover:bg-black/40 hover:text-amber-400"
        )}
      >
        <Star size={20} className={cn("transition-all z-10", activeFilter === 'favoritos' ? 'text-amber-500 drop-shadow-[0_0_8px_currentColor]' : 'text-slate-500 group-hover:text-amber-400')} />
        <span className="text-[10px] font-black uppercase tracking-widest z-10 leading-none text-center px-1">Favoritos</span>
        {activeFilter === 'favoritos' && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-50" />
            <div className="absolute -bottom-2 -right-2 pointer-events-none select-none">
              <Star size={60} className="text-amber-500/20 opacity-20" />
            </div>
          </>
        )}
      </button>

      {allSports.map(sport => {
        const isActive = activeFilter === sport;
        const hasLive = matches.some(p => p.disciplinas?.name === sport && p.estado === 'en_curso');

        return (
          <button
            key={sport}
            onClick={() => setActiveFilter(isActive ? 'todos' : sport)}
            className={cn(
              "group relative min-w-[90px] h-20 rounded-2xl flex flex-col items-center border transition-all duration-300 overflow-hidden shrink-0",
              isActive
                ? `bg-black/20 ${SPORT_BORDER[sport]} text-white scale-105 ${SPORT_GLOW[sport].replace('hover:', '')} shadow-xl`
                : "bg-black/30 border-white/10 text-slate-400 hover:bg-black/40 hover:text-white"
            )}
          >
            {isActive && (
              <>
                <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sport]} opacity-50`} />
                <div className="absolute -bottom-2 -right-2 pointer-events-none select-none">
                  <SportIcon sport={sport} size={60} className={cn("opacity-20", SPORT_ACCENT[sport])} />
                </div>
              </>
            )}

            <div className="h-10 flex items-center justify-center z-10 mt-2">
              <SportIcon
                sport={sport}
                size={22}
                className={cn(
                  "transition-all",
                  isActive ? `${SPORT_ACCENT[sport]} drop-shadow-[0_0_8px_currentColor]` : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
            </div>
            <div className="z-10 mb-1.5">
              <SportLabel name={sport} />
            </div>

            {hasLive && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-rose-500 shadow-sm" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
