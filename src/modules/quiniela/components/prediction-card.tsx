import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui-primitives";
import { Trophy, Target, Award, Zap, History, Lock, Clock, Users } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { getCurrentScore } from "@/lib/sport-scoring";
import { VotePercentageBar } from "./vote-percentage-bar";
import { getMatchResult } from "../helpers";
import { SPORT_ACCENT } from "@/lib/constants";

interface PredictionCardProps {
  match: any;
  prediction: any;
  onPredict: (matchId: any, data: any) => void;
  locked: boolean;
  allPredictions: any[];
}

export const PredictionCard = ({
  match, prediction, onPredict, locked, allPredictions
}: PredictionCardProps) => {
  const [winnerPick, setWinnerPick] = useState(prediction?.winner_pick ?? null);

  useEffect(() => {
    setWinnerPick(prediction?.winner_pick ?? null);
  }, [prediction]);

  const handleSave = () => {
    if (!winnerPick) return;
    onPredict(match.id, {
      prediction_type: 'winner',
      goles_a: null,
      goles_b: null,
      winner_pick: winnerPick
    });
  };

  const isPredicted = prediction !== undefined && prediction !== null;
  const isLocked = locked || match.estado !== 'programado';
  const isFinished = match.estado === 'finalizado';
  const isLive = match.estado === 'en_curso';

  const matchResult = getMatchResult(match);
  let predictionCorrect: boolean | null = null;
  if (isFinished && isPredicted && matchResult) {
    predictionCorrect = prediction.winner_pick === matchResult;
  }

  const scoreInfo = getCurrentScore(match.disciplinas?.name, match.marcador_detalle || {});

  const isTenis = match.disciplinas?.name === 'Tenis';
  const rosterA = match.roster_partido?.find((r: any) => r.equipo_a_or_b === 'equipo_a');
  const rosterB = match.roster_partido?.find((r: any) => r.equipo_a_or_b === 'equipo_b');
  const nameA = isTenis && rosterA?.jugador?.nombre ? rosterA.jugador.nombre : (match.carrera_a?.nombre || match.equipo_a);
  const nameB = isTenis && rosterB?.jugador?.nombre ? rosterB.jugador.nombre : (match.carrera_b?.nombre || match.equipo_b);

  const getCardStyle = () => {
    if (isFinished && predictionCorrect === true) {
      return "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/10 backdrop-blur-3xl";
    }
    if (isFinished && predictionCorrect === false) {
      return "bg-rose-500/5 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.08)] ring-1 ring-rose-500/10 backdrop-blur-3xl";
    }
    if (isLive) {
      return "bg-black/40 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] backdrop-blur-3xl";
    }
    if (isPredicted) {
      return "bg-white/[0.04] border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-3xl";
    }
    return "bg-black/20 backdrop-blur-xl border-white/5 hover:bg-white/[0.04] hover:border-white/10";
  };

  return (
    <div className={cn(
      "relative p-6 rounded-[2.5rem] border transition-all duration-500 overflow-hidden group shadow-2xl",
      getCardStyle()
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <SportIcon sport={match.disciplinas?.name} size={14} className="opacity-80" />
          </div>
          <div>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest leading-none mb-1.5",
              match.disciplinas?.name ? (SPORT_ACCENT[match.disciplinas.name] || "text-slate-500") : "text-slate-500"
            )}>
              {match.disciplinas?.name} • <span className="opacity-60">{match.genero || 'Masculino'}</span>
            </p>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-tight leading-none tabular-nums flex items-center gap-1.5">
              <Clock size={10} className="text-violet-400/40" />
              {new Date(match.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • {new Date(match.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">En Curso</span>
            </div>
          ) : isFinished ? (
            <Badge variant={predictionCorrect ? "success" : "destructive"} className="text-[9px] font-black shadow-lg">
              {predictionCorrect ? "Acertado" : "Fallado"}
            </Badge>
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Próximo</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-between mb-8 px-2">
        {match.marcador_detalle?.tipo === 'carrera' ? (
          <div className="flex flex-col items-center justify-center w-full py-2">
            <span className="text-3xl font-black text-white text-center tracking-tighter">
              {match.marcador_detalle?.distancia} {match.marcador_detalle?.estilo}
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 block shadow-sm">
              Prueba de Velocidad
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center flex-1 max-w-[120px] relative z-10">
              <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl font-display font-black mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)] text-white/90 group-hover:scale-110 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/40 transition-all duration-500">
                {match.disciplinas?.name === 'Ajedrez' ? '♟' : (nameA).substring(0, 1).toUpperCase()}
              </div>
              <p className="text-xs font-display font-black text-white/80 text-center leading-tight tracking-wide line-clamp-2 px-1">
                {nameA}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[80px]">
              {(isLive || isFinished) ? (
                <div className="space-y-1">
                  <div className="text-3xl font-black tabular-nums font-mono tracking-tighter text-white flex items-center gap-2 justify-center">
                    {match.disciplinas?.name === 'Ajedrez' ? (
                      <span className="text-2xl">{isFinished ? 'FIN' : 'VS'}</span>
                    ) : (
                      <>
                        <span>{scoreInfo.scoreA}</span>
                        <span className="opacity-20">:</span>
                        <span>{scoreInfo.scoreB}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[8px] font-black text-center text-slate-500 uppercase tracking-[0.2em]">{match.disciplinas?.name === 'Ajedrez' ? 'Estado' : 'Marcador'}</p>
                </div>
              ) : (
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
                  <div className="w-12 h-12 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl transform rotate-45 group-hover:border-violet-500/50 transition-colors">
                    <span className="text-xs font-display font-black text-white/50 italic -rotate-45">VS</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center flex-1 max-w-[120px] relative z-10">
              <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl font-display font-black mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)] text-white/90 group-hover:scale-110 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/40 transition-all duration-500">
                {match.disciplinas?.name === 'Ajedrez' ? '♞' : (nameB).substring(0, 1).toUpperCase()}
              </div>
              <p className="text-xs font-display font-black text-white/80 text-center leading-tight tracking-wide line-clamp-2 px-1">
                {nameB}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] border border-white/10 p-5 mt-4 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {isFinished || isLive ? (
          <div className="text-center">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 font-display">Tu Predicción</p>
            <div className="flex items-center justify-center gap-3">
              {prediction?.prediction_type === 'score' ? (
                <p className={cn(
                  "text-3xl font-black tabular-nums font-mono tracking-tighter",
                  isFinished ? (predictionCorrect ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]") : "text-white"
                )}>
                  {prediction.goles_a} <span className="opacity-20">-</span> {prediction.goles_b}
                </p>
              ) : (
                <div className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-2xl border",
                  isFinished 
                    ? (predictionCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]") 
                    : "bg-white/5 border-white/10 text-white shadow-inner"
                )}>
                  <Trophy size={16} className="fill-current" />
                  <span className="text-sm font-display font-black tracking-wide">
                    {prediction?.winner_pick === 'A' ? nameA :
                      prediction?.winner_pick === 'B' ? nameB : 'Empate'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : !isLocked ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black font-display text-white/30 tracking-[0.2em] uppercase">¿Cuál será el resultado?</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { key: 'A', name: (nameA) },
                { key: 'DRAW', name: 'Empate' },
                { key: 'B', name: (nameB) }
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setWinnerPick(opt.key)}
                  className={cn(
                    "relative group/btn py-4 px-2 rounded-2xl text-[10px] sm:text-xs font-display font-black tracking-wide transition-all border-2 flex flex-col items-center justify-center gap-2 min-h-[80px]",
                    winnerPick === opt.key
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] scale-[1.02] z-10"
                      : "bg-black/40 border-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 hover:border-white/20"
                  )}
                >
                  <div className="truncate w-full text-center px-1 font-black uppercase tracking-tighter">{opt.name.split(' ')[0]}</div>
                  {opt.key === 'DRAW' ? <Users size={14} className="opacity-40" /> : <Trophy size={14} className={cn("transition-transform duration-500", winnerPick === opt.key ? "scale-110" : "opacity-40")} />}
                  {winnerPick === opt.key && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-zinc-950 shadow-xl flex items-center justify-center animate-in zoom-in duration-300">
                      <span className="text-black font-black text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <Button
              className={cn(
                "w-full rounded-2xl h-14 text-sm font-display font-black tracking-[0.1em] transition-all border uppercase",
                isPredicted
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] border-transparent"
                  : "bg-white/10 hover:bg-white text-white hover:text-black border-white/10 shadow-xl"
              )}
              onClick={handleSave}
              disabled={!winnerPick}
            >
              {isPredicted ? (
                <><History size={16} className="mr-3" /> Actualizar Acierto</>
              ) : (
                <><Zap size={16} className="mr-3" /> Confirmar Acierto</>
              )}
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center opacity-30 grayscale flex flex-col items-center gap-3 bg-black/20 rounded-3xl border border-dashed border-white/10">
            <Lock size={24} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Predicciones Cerradas</p>
          </div>
        )}
      </div>

      {!isFinished && (
        <div className="mt-4 px-1">
          <VotePercentageBar
            matchId={match.id}
            allPredictions={allPredictions}
            teamA={nameA}
            teamB={nameB}
            sportName={match.disciplinas?.name}
          />
        </div>
      )}
    </div>
  );
};
