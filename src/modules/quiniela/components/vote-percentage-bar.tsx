import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { SPORT_ACCENT } from "@/lib/constants";

interface VotePercentageBarProps {
  matchId: number;
  allPredictions: any[];
  teamA: string;
  teamB: string;
  sportName: string;
}

export const VotePercentageBar = ({ matchId, allPredictions, teamA, teamB, sportName }: VotePercentageBarProps) => {
  const matchPreds = allPredictions.filter(p => p.match_id === matchId && p.winner_pick);
  const total = matchPreds.length;
  
  if (total === 0) return (
    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500/50 justify-center py-3 bg-black/10 rounded-2xl border border-white/5 border-dashed">
      <Users size={12} className="opacity-30" />
      <span className="uppercase tracking-widest text-[9px]">Se el primero en predecir</span>
    </div>
  );

  const countA = matchPreds.filter(p => p.winner_pick === 'A').length;
  const countDraw = matchPreds.filter(p => p.winner_pick === 'DRAW').length;
  const countB = matchPreds.filter(p => p.winner_pick === 'B').length;
  const pctA = Math.round((countA / total) * 100);
  const pctDraw = Math.round((countDraw / total) * 100);
  const pctB = 100 - pctA - pctDraw;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 shadow-inner">
          <Users size={12} className="text-violet-400" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">{total} {total === 1 ? 'Acierto' : 'Aciertos'}</span>
        </div>
        <div className="text-[9px] font-black text-white/50 uppercase tracking-[0.25em] drop-shadow-sm">Tendencia</div>
      </div>

      <div className="relative group/bar px-0.5">
        <div className="flex gap-[2px] h-3.5 rounded-full overflow-hidden bg-white/[0.02] border border-white/10 p-[1.5px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] relative backdrop-blur-sm">
          {pctA > 0 && (
            <div
              className={cn("transition-all duration-1000 rounded-l-full relative shadow-lg", SPORT_ACCENT[sportName] || "bg-violet-500")}
              style={{ width: `${pctA}%`, backgroundColor: 'currentColor' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-40 hover:opacity-60 transition-opacity" />
            </div>
          )}
          {pctDraw > 0 && (
            <div
              className="bg-slate-700/60 transition-all duration-1000 relative"
              style={{ width: `${pctDraw}%` }}
            >
              <div className="absolute inset-0 bg-white/5" />
            </div>
          )}
          {pctB > 0 && (
            <div
              className={cn("transition-all duration-1000 rounded-r-full relative shadow-lg", SPORT_ACCENT[sportName] || "bg-emerald-500")}
              style={{ width: `${pctB}%`, backgroundColor: 'currentColor', filter: 'brightness(1.4)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-l from-white/20 to-transparent opacity-40 hover:opacity-60 transition-opacity" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-1">
        <div className="flex flex-col items-start gap-1">
          <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.15em] truncate w-full drop-shadow-sm">{teamA.split(' ')[0]}</span>
          <span className={cn("text-base font-black tabular-nums font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]", SPORT_ACCENT[sportName] || "text-white")}>{pctA}%</span>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.15em] drop-shadow-sm">EMPATE</span>
          <span className="text-base font-black tabular-nums font-mono tracking-tighter text-white/40">{pctDraw}%</span>
        </div>
 
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.15em] truncate w-full text-right drop-shadow-sm">{teamB.split(' ')[0]}</span>
          <span className={cn("text-base font-black tabular-nums font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]", SPORT_ACCENT[sportName] || "text-white")} style={{ filter: 'brightness(1.4)' }}>{pctB}%</span>
        </div>
      </div>
    </div>
  );
};
