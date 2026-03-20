import { Avatar } from "@/components/ui-primitives";
import { Edit2, Play, Pause, Square } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { cn } from "@/lib/utils";

interface AdminScoreboardProps {
  match: any;
  scoreA: any;
  scoreB: any;
  onEditScore: () => void;
  onToggleCronometro: () => void;
  onFinalizar: () => void;
  cronometroActivo: boolean;
}

export const AdminScoreboard = ({
  match,
  scoreA,
  scoreB,
  onEditScore,
  onToggleCronometro,
  onFinalizar,
  cronometroActivo
}: AdminScoreboardProps) => {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-12">
        {/* Team A */}
        <div className="flex flex-col items-center gap-6 group">
          <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-[2.5rem] bg-zinc-950/60 border-2 border-white/10 p-1">
            <Avatar src={match.atleta_a?.avatar_url || match.carrera_a?.escudo_url} name={getDisplayName(match, 'a')} size="lg" className="h-full w-full rounded-[2.25rem]" />
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white">{getDisplayName(match, 'a')}</h2>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-8 min-w-[300px]">
          <div className="relative group/score">
            {match.estado === 'en_curso' && (
              <button 
                onClick={onEditScore} 
                className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-primary text-white opacity-0 group-hover/score:opacity-100 transition-all z-20 shadow-xl"
              >
                <Edit2 size={16} strokeWidth={3} />
              </button>
            )}
            <div className="flex items-center justify-center gap-8 px-12 py-8 rounded-[3.5rem] bg-zinc-950/60 border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-primary/5 blur-3xl" />
                
                <span className="text-5xl md:text-9xl font-black tabular-nums relative z-10">{scoreA}</span>
                <span className="text-2xl md:text-6xl font-black text-white/10 relative z-10">:</span>
                <span className="text-5xl md:text-9xl font-black tabular-nums relative z-10">{scoreB}</span>
            </div>
          </div>
          
          <div className="w-full flex flex-col items-center gap-6">
            <PublicLiveTimer detalle={match.marcador_detalle} deporte={match.disciplinas?.name} />
            <div className="flex items-center gap-4 bg-zinc-900/40 p-2 rounded-[1.75rem] border border-white/10 shadow-inner">
              <button 
                onClick={onToggleCronometro} 
                className={cn(
                    "flex-1 h-14 min-w-[140px] rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all", 
                    cronometroActivo 
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                        : "bg-emerald-500 text-white shadow-lg hover:bg-emerald-400 active:scale-95"
                )}
              >
                {cronometroActivo ? <Pause size={18} /> : <Play size={18} />} 
                {cronometroActivo ? 'Pause' : 'Start Match'}
              </button>
              {match.estado !== 'finalizado' && (
                <button 
                    onClick={onFinalizar} 
                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-rose-500 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all shadow-xl active:scale-95"
                    title="End Match"
                >
                  <Square size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center gap-6 group">
          <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-[2.5rem] bg-zinc-950/60 border-2 border-white/10 p-1">
            <Avatar src={match.atleta_b?.avatar_url || match.carrera_b?.escudo_url} name={getDisplayName(match, 'b')} size="lg" className="h-full w-full rounded-[2.25rem]" />
          </div>
          <h2 className="text-xl md:text-3xl font-black text-white">{getDisplayName(match, 'b')}</h2>
        </div>
      </div>
    </div>
  );
};
