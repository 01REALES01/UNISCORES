import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui-primitives";
import { Trophy, Target, Award, Zap, History, Lock } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { getCurrentScore } from "@/lib/sport-scoring";
import { VotePercentageBar } from "./vote-percentage-bar";
import { getMatchResult } from "../helpers";

interface PredictionCardProps {
  match: any;
  prediction: any;
  onPredict: (matchId: any, data: any) => void;
  locked: boolean;
  mode: 'score' | 'winner';
  allPredictions: any[];
}

export const PredictionCard = ({
  match, prediction, onPredict, locked, mode, allPredictions
}: PredictionCardProps) => {
  const [scoreA, setScoreA] = useState(prediction?.goles_a ?? "");
  const [scoreB, setScoreB] = useState(prediction?.goles_b ?? "");
  const [winnerPick, setWinnerPick] = useState(prediction?.winner_pick ?? null);

  useEffect(() => {
    if (mode === 'score') {
      setScoreA(prediction?.goles_a ?? "");
      setScoreB(prediction?.goles_b ?? "");
    } else {
      setWinnerPick(prediction?.winner_pick ?? null);
    }
  }, [prediction, mode]);

  const handleSave = () => {
    if (mode === 'score') {
      if (scoreA === "" || scoreB === "") return;
      onPredict(match.id, {
        prediction_type: 'score',
        goles_a: parseInt(scoreA),
        goles_b: parseInt(scoreB),
        winner_pick: null
      });
    } else {
      if (!winnerPick) return;
      onPredict(match.id, {
        prediction_type: 'winner',
        goles_a: null,
        goles_b: null,
        winner_pick: winnerPick
      });
    }
  };

  const isPredicted = prediction !== undefined && prediction !== null;
  const isLocked = locked || match.estado !== 'programado';
  const isFinished = match.estado === 'finalizado';
  const isLive = match.estado === 'en_vivo';

  const matchResult = getMatchResult(match);
  let predictionCorrect: boolean | null = null;
  if (isFinished && isPredicted && matchResult) {
    if (prediction.prediction_type === 'winner' || prediction.winner_pick) {
      predictionCorrect = prediction.winner_pick === matchResult;
    } else if (prediction.prediction_type === 'score') {
      const md = match.marcador_detalle || {};
      const actualA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
      const actualB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
      predictionCorrect = prediction.goles_a === actualA && prediction.goles_b === actualB;
    }
  }

  const scoreInfo = getCurrentScore(match.disciplinas?.name, match.marcador_detalle || {});

  const getCardStyle = () => {
    if (isFinished && predictionCorrect === true) {
      return "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/10";
    }
    if (isFinished && predictionCorrect === false) {
      return "bg-rose-500/5 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.08)] ring-1 ring-rose-500/10";
    }
    if (isLive) {
      return "bg-rose-500/5 border-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.1)]";
    }
    if (isPredicted) {
      return "bg-red-900/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]";
    }
    return "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10";
  };

  return (
    <div className={cn(
      "relative p-6 rounded-[2.5rem] border transition-all duration-500 overflow-hidden group",
      getCardStyle()
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <SportIcon sport={match.disciplinas?.name} size={14} className="opacity-80" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">
              {match.disciplinas?.name}
            </p>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-tight leading-none tabular-nums">
              {new Date(match.fecha).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {new Date(match.fecha).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider">En Vivo</span>
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
            <div className="flex flex-col items-center flex-1 max-w-[100px]">
              <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-xl font-black mb-3 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                {(match.carrera_a?.nombre || match.equipo_a).substring(0, 2).toUpperCase()}
              </div>
              <p className="text-[11px] font-black text-white text-center leading-tight uppercase tracking-tight">
                {match.carrera_a?.nombre || match.equipo_a}
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
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shadow-inner mb-4">
                  <span className="text-xs font-black text-white/20 italic">VS</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center flex-1 max-w-[100px]">
              <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-xl font-black mb-3 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                {(match.carrera_b?.nombre || match.equipo_b).substring(0, 2).toUpperCase()}
              </div>
              <p className="text-[11px] font-black text-white text-center leading-tight uppercase tracking-tight">
                {match.carrera_b?.nombre || match.equipo_b}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-zinc-900/60 backdrop-blur-md rounded-[2rem] border border-white/5 p-4 shadow-inner relative overflow-hidden">
        {isFinished || isLive ? (
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Tu Predicción</p>
            <div className="flex items-center justify-center gap-3">
              {prediction?.prediction_type === 'score' ? (
                <p className={cn(
                  "text-2xl font-black tabular-nums font-mono tracking-tight",
                  isFinished ? (predictionCorrect ? "text-emerald-400" : "text-rose-400") : "text-white"
                )}>
                  {prediction.goles_a} <span className="opacity-20">-</span> {prediction.goles_b}
                </p>
              ) : (
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border",
                  isFinished ? (predictionCorrect ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400") : "bg-white/5 border-white/10 text-white"
                )}>
                  <Trophy size={14} className="fill-current" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {prediction?.winner_pick === 'A' ? match.carrera_a?.nombre || match.equipo_a :
                      prediction?.winner_pick === 'B' ? match.carrera_b?.nombre || match.equipo_b : 'Empate'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : !isLocked ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">¿Cuál será el resultado?</p>
              <div className="flex gap-1">
                <button
                  onClick={() => onPredict(match.id, { ...prediction, mode: 'score' })}
                  className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-all", mode === 'score' ? "bg-red-500 text-white" : "bg-white/5 text-slate-500")}
                >
                  <Target size={12} />
                </button>
                <button
                  onClick={() => onPredict(match.id, { ...prediction, mode: 'winner' })}
                  className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-all", mode === 'winner' ? "bg-red-500 text-white" : "bg-white/5 text-slate-500")}
                >
                  <Award size={12} />
                </button>
              </div>
            </div>

            {mode === 'score' ? (
              <div className="flex items-center justify-center gap-4 py-2">
                <input
                  type="number"
                  className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl text-center font-mono text-3xl font-black focus:border-red-500 focus:bg-red-500/5 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-white/5 shadow-inner"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  placeholder="0"
                />
                <div className="w-4 h-1 bg-white/10 rounded-full" />
                <input
                  type="number"
                  className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl text-center font-mono text-3xl font-black focus:border-red-500 focus:bg-red-500/5 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-white/5 shadow-inner"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  placeholder="0"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'A', name: (match.carrera_a?.nombre || match.equipo_a) },
                  { key: 'DRAW', name: 'Empate' },
                  { key: 'B', name: (match.carrera_b?.nombre || match.equipo_b) }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setWinnerPick(opt.key)}
                    className={cn(
                      "relative group/btn py-4 px-2 rounded-2xl text-[9px] font-black tracking-widest transition-all border-2 uppercase",
                      winnerPick === opt.key
                        ? "bg-red-500/10 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                        : "bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="truncate">{opt.name.substring(0, 10)}</div>
                    {winnerPick === opt.key && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900" />}
                  </button>
                ))}
              </div>
            )}

            <Button
              className={cn(
                "w-full rounded-2xl h-12 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                isPredicted
                  ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-xl shadow-red-600/20"
                  : "bg-white text-black hover:bg-slate-200"
              )}
              onClick={handleSave}
              disabled={mode === 'score' ? (scoreA === "" || scoreB === "") : (!winnerPick)}
            >
              {isPredicted ? <><History size={14} className="mr-2" /> Actualizar Predicción</> : <><Zap size={14} className="mr-2" /> Guardar Acierto</>}
            </Button>
          </div>
        ) : (
          <div className="py-4 text-center opacity-40 grayscale flex flex-col items-center gap-2">
            <Lock size={20} />
            <p className="text-[10px] font-black uppercase tracking-widest">Predicciones Cerradas</p>
          </div>
        )}
      </div>

      {!isFinished && (
        <div className="mt-4 px-1">
          <VotePercentageBar
            matchId={match.id}
            allPredictions={allPredictions}
            teamA={match.carrera_a?.nombre || match.equipo_a}
            teamB={match.carrera_b?.nombre || match.equipo_b}
            sportName={match.disciplinas?.name}
          />
        </div>
      )}
    </div>
  );
};
