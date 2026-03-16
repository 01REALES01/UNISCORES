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
    <div className="flex items-center gap-2 text-[10px] text-slate-600 justify-center py-1">
      <Users size={10} />
      <span>Sin aciertos aún</span>
    </div>
  );

  const countA = matchPreds.filter(p => p.winner_pick === 'A').length;
  const countDraw = matchPreds.filter(p => p.winner_pick === 'DRAW').length;
  const countB = matchPreds.filter(p => p.winner_pick === 'B').length;
  const pctA = Math.round((countA / total) * 100);
  const pctDraw = Math.round((countDraw / total) * 100);
  const pctB = 100 - pctA - pctDraw;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] px-0.5">
        <span className="flex items-center gap-1"><Users size={10} /> {total} aciertos</span>
      </div>
      <div className="flex gap-[2px] h-2.5 rounded-full overflow-hidden bg-white/5 shadow-inner">
        {pctA > 0 && (
          <div
            className={cn("transition-all duration-700 relative group", SPORT_ACCENT[sportName] || "bg-white/20")}
            style={{ width: `${pctA}%`, backgroundColor: 'currentColor', filter: 'brightness(0.3)' }}
          />
        )}
        {pctDraw > 0 && (
          <div
            className="bg-slate-700/50 transition-all duration-700"
            style={{ width: `${pctDraw}%` }}
          />
        )}
        {pctB > 0 && (
          <div
            className={cn("transition-all duration-700", SPORT_ACCENT[sportName] || "bg-white/20")}
            style={{ width: `${pctB}%`, backgroundColor: 'currentColor', filter: 'brightness(1.7)' }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px] font-black tabular-nums tracking-wide">
        <span className={cn(SPORT_ACCENT[sportName] || "text-white/60")}>{teamA.substring(0, 8).toUpperCase()} {pctA}%</span>
        <span className="text-slate-500">Empate {pctDraw}%</span>
        <span className={cn(SPORT_ACCENT[sportName] || "text-white/60")}>{teamB.substring(0, 8).toUpperCase()} {pctB}%</span>
      </div>
    </div>
  );
};
