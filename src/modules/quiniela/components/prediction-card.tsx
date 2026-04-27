import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Avatar } from "@/components/ui-primitives";
import { Trophy, Target, Award, Zap, History, Lock, Clock, Users, ExternalLink, Minus, Plus } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { getCurrentScore } from "@/lib/sport-scoring";
import { VotePercentageBar } from "./vote-percentage-bar";
import { getMatchResult } from "../helpers";
import { SPORT_ACCENT, SPORT_COLORS } from "@/lib/constants";
import { getDisplayName, getCarreraSubtitle, isIndividualSport } from "@/lib/sport-helpers";

const SPORTS_WITH_DRAW = ['Fútbol', 'Ajedrez'];
const SPORTS_WITH_BONUS = ['Fútbol', 'Voleibol', 'Baloncesto'];

interface PredictionCardProps {
  match: any;
  prediction: any;
  onPredict: (matchId: any, data: any) => void;
  locked: boolean;
  allPredictions: any[];
  /** Query string (without leading ?) appended when opening the match from Quiniela so "Volver" restores tab/filters. */
  quinielaReturnQuery?: string;
}

export const PredictionCard = ({
  match, prediction, onPredict, locked, allPredictions, quinielaReturnQuery
}: PredictionCardProps) => {
  const router = useRouter();
  const sportName = match.disciplinas?.name;
  const supportsDraws = SPORTS_WITH_DRAW.includes(sportName);
  const hasBonus = SPORTS_WITH_BONUS.includes(sportName);

  const [winnerPick, setWinnerPick] = useState(prediction?.winner_pick ?? null);
  const [showBonus, setShowBonus] = useState(prediction?.prediction_type === 'score');
  const [bonusGolesA, setBonusGolesA] = useState<number | null>(prediction?.goles_a ?? null);
  const [bonusGolesB, setBonusGolesB] = useState<number | null>(prediction?.goles_b ?? null);
  const [marginPick, setMarginPick] = useState<'CLOSE' | 'WIDE' | null>(
    prediction?.prediction_type === 'score' && sportName === 'Baloncesto'
      ? (prediction.goles_a === 0 ? 'CLOSE' : 'WIDE')
      : null
  );

  useEffect(() => {
    setWinnerPick(prediction?.winner_pick ?? null);
    if (prediction?.prediction_type === 'score') {
      setShowBonus(true);
      if (sportName === 'Baloncesto') {
        setMarginPick(prediction.goles_a === 0 ? 'CLOSE' : 'WIDE');
      } else {
        setBonusGolesA(prediction.goles_a ?? null);
        setBonusGolesB(prediction.goles_b ?? null);
      }
    }
  }, [prediction, sportName]);

  // Reset volley bonus when winner changes, auto-open bonus
  const handleWinnerChange = (key: string) => {
    setWinnerPick(key);
    if (hasBonus && (key !== 'DRAW' || sportName === 'Fútbol')) {
      setShowBonus(true);
    }
    if (sportName === 'Voleibol') {
      setBonusGolesA(null);
      setBonusGolesB(null);
    }
  };

  const handleSave = () => {
    if (!winnerPick) return;

    const hasBonusBet = showBonus && hasBonus && (winnerPick !== 'DRAW' || sportName === 'Fútbol') && (
      sportName === 'Fútbol' ||
      (sportName === 'Voleibol' && bonusGolesA !== null && bonusGolesB !== null) ||
      (sportName === 'Baloncesto' && marginPick !== null)
    );

    onPredict(match.id, {
      prediction_type: hasBonusBet ? 'score' : 'winner',
      winner_pick: winnerPick,
      goles_a: hasBonusBet
        ? (sportName === 'Baloncesto' ? (marginPick === 'CLOSE' ? 0 : 1) : (bonusGolesA ?? 0))
        : null,
      goles_b: hasBonusBet
        ? (sportName === 'Baloncesto' ? null : (bonusGolesB ?? 0))
        : null,
    });
  };

  const isPredicted = prediction !== undefined && prediction !== null;
  const isPast = new Date(match.fecha) < new Date();
  const isLocked = locked || match.estado !== 'programado' || isPast;
  const isFinished = match.estado === 'finalizado';
  const isLive = match.estado === 'en_curso';

  const matchResult = getMatchResult(match);
  let predictionCorrect: boolean | null = null;
  if (isFinished && isPredicted && matchResult) {
    predictionCorrect = prediction.winner_pick === matchResult;
  }

  const scoreInfo = getCurrentScore(match.disciplinas?.name, match.marcador_detalle || {});

  const nameA = getDisplayName(match, 'a');
  const nameB = getDisplayName(match, 'b');
  const subtitleA = getCarreraSubtitle(match, 'a');
  const subtitleB = getCarreraSubtitle(match, 'b');

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

  // Winner options based on sport
  const winnerOptions = supportsDraws
    ? [
      { key: 'A', name: nameA },
      { key: 'DRAW', name: 'Empate' },
      { key: 'B', name: nameB }
    ]
    : [
      { key: 'A', name: nameA },
      { key: 'B', name: nameB }
    ];

  // Volley set options filtered by winner pick
  const getVolleyOptions = () => {
    if (winnerPick === 'A') return [{ a: 2, b: 0 }, { a: 2, b: 1 }];
    if (winnerPick === 'B') return [{ a: 0, b: 2 }, { a: 1, b: 2 }];
    return [];
  };

  // Bonus prediction label for finished/live display
  const getBonusPredictionLabel = () => {
    if (!prediction || prediction.prediction_type !== 'score') return null;
    if (sportName === 'Baloncesto') {
      return prediction.goles_a === 0 ? 'Cerrado (≤10)' : 'Amplio (>10)';
    }
    if (sportName === 'Voleibol') {
      return `Sets: ${prediction.goles_a} - ${prediction.goles_b}`;
    }
    if (sportName === 'Fútbol') {
      return `Marcador: ${prediction.goles_a} - ${prediction.goles_b}`;
    }
    return null;
  };

  // Check if bonus prediction was correct (for display)
  const isBonusCorrect = () => {
    if (!prediction || prediction.prediction_type !== 'score' || !isFinished) return null;
    const md = match.marcador_detalle || {};
    if (sportName === 'Fútbol') {
      const realA = md.goles_a ?? 0;
      const realB = md.goles_b ?? 0;
      return prediction.goles_a === realA && prediction.goles_b === realB;
    }
    if (sportName === 'Voleibol') {
      const realA = md.sets_a ?? 0;
      const realB = md.sets_b ?? 0;
      return prediction.goles_a === realA && prediction.goles_b === realB;
    }
    if (sportName === 'Baloncesto') {
      const totalA = md.total_a ?? md.puntos_a ?? 0;
      const totalB = md.total_b ?? md.puntos_b ?? 0;
      const margin = Math.abs(totalA - totalB);
      const predictedClose = prediction.goles_a === 0;
      const actualClose = margin <= 10;
      return predictedClose === actualClose;
    }
    return null;
  };

  const partidoHref = quinielaReturnQuery
    ? `/partido/${match.id}?${quinielaReturnQuery}`
    : `/partido/${match.id}`;

  return (
    <div
      id={`quiniela-match-${match.id}`}
      onClick={() => router.push(partidoHref)}
      className={cn(
        "relative p-6 rounded-[2.5rem] border transition-all duration-500 overflow-hidden group shadow-2xl cursor-pointer active:scale-[0.99]",
        getCardStyle()
      )}
    >
      {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
      <div className="absolute -right-[12%] -bottom-[12%] flex items-center justify-center pointer-events-none select-none opacity-[0.08] group-hover:opacity-[0.12] transition-all duration-1000 rotate-[-20deg] z-0 text-white">
        <SportIcon sport={sportName} size={180} className="transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]" />
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <SportIcon sport={match.disciplinas?.name} size={14} className="opacity-80" />
          </div>
          <div>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-2",
              match.disciplinas?.name ? (SPORT_ACCENT[match.disciplinas.name] || "text-slate-400") : "text-slate-400"
            )}>
              {match.disciplinas?.name} • <span className="text-white/40">{match.genero || 'Masculino'}</span>
            </p>
            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest leading-none tabular-nums flex items-center gap-1.5 shadow-sm">
              <Clock size={10} className="text-violet-400" />
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
            <div className="flex flex-col items-center flex-1 max-w-[120px] relative z-10 group/team">
              <Link
                href={match.athlete_a_id ? `/perfil/${match.athlete_a_id}` : match.carrera_a_id ? `/carrera/${match.carrera_a_id}?sport=${encodeURIComponent(sportName)}` : '#'}
                onClick={(e) => {
                  if (!match.athlete_a_id && !match.carrera_a_id) e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-20 h-20 rounded-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 flex items-center justify-center text-3xl font-display font-black mb-1 shadow-[0_0_40px_rgba(0,0,0,0.5)] text-white group-hover/team:scale-110 group-hover:bg-white/[0.08] group-hover:border-white/30 transition-all duration-500 overflow-hidden relative"
              >
                <Avatar
                  name={nameA}
                  src={match.atleta_a?.avatar_url || match.carrera_a?.escudo_url || match.delegacion_a_info?.escudo_url}
                  size="lg"
                  className="w-full h-full text-2xl border-none p-0 bg-transparent"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover/team:opacity-100 transition-opacity" />
                <div className="absolute -bottom-1 inset-x-0 flex justify-center opacity-0 group-hover/team:opacity-100 transition-all translate-y-2 group-hover/team:translate-y-0 translate-x-0 z-20">
                  <div className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[6px] font-black uppercase tracking-tighter shadow-lg">PERFIL</div>
                </div>
              </Link>
              <div className="flex flex-col items-center gap-0.5 min-h-[40px] justify-start pt-2">
                <p className="text-xs font-display font-black text-white text-center leading-tight tracking-wide line-clamp-2 px-1 drop-shadow-sm group-hover/team:text-violet-400 transition-colors flex items-center gap-1">
                  {nameA}
                  {match.athlete_a_id && <ExternalLink size={10} className="opacity-30" />}
                </p>
                {subtitleA && (
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter truncate w-full px-2 text-center">
                    {subtitleA}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center min-w-[80px]">
              {(isLive || isFinished) ? (
                <div className="space-y-2">
                  <div className="text-4xl font-black tabular-nums font-mono tracking-tighter text-white flex items-center gap-2 justify-center drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    {match.disciplinas?.name === 'Ajedrez' ? (
                      <span className="text-2xl">{isFinished ? 'FIN' : 'VS'}</span>
                    ) : (
                      <>
                        <span>{match.disciplinas?.name === 'Tenis de Mesa' ? (scoreInfo.subScoreA ?? 0) : scoreInfo.scoreA}</span>
                        <span className="text-white/20">:</span>
                        <span>{match.disciplinas?.name === 'Tenis de Mesa' ? (scoreInfo.subScoreB ?? 0) : scoreInfo.scoreB}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[8px] font-black text-center text-white/40 uppercase tracking-[0.3em] font-display">{match.disciplinas?.name === 'Ajedrez' ? 'Estado' : 'Marcador'}</p>
                </div>
              ) : (
                <div className="relative mb-6 group/vs">
                  <div className="absolute inset-0 bg-violet-500/30 blur-2xl rounded-full opacity-0 group-hover/vs:opacity-100 transition-opacity duration-500" />
                  <div className="relative w-12 h-12 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl transform rotate-45 group-hover:border-violet-500/50 group-hover:bg-violet-500/10 transition-all duration-500">
                    <span className="text-xs font-display font-black text-white/70 italic -rotate-45 group-hover:text-white transition-colors tracking-tighter">VS</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center flex-1 max-w-[120px] relative z-10 group/team">
              <Link
                href={match.athlete_b_id ? `/perfil/${match.athlete_b_id}` : match.carrera_b_id ? `/carrera/${match.carrera_b_id}?sport=${encodeURIComponent(sportName)}` : '#'}
                onClick={(e) => {
                  if (!match.athlete_b_id && !match.carrera_b_id) e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-20 h-20 rounded-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 flex items-center justify-center text-3xl font-display font-black mb-1 shadow-[0_0_40px_rgba(0,0,0,0.5)] text-white group-hover/team:scale-110 group-hover:bg-white/[0.08] group-hover:border-white/30 transition-all duration-500 overflow-hidden relative"
              >
                <Avatar
                  name={nameB}
                  src={match.atleta_b?.avatar_url || match.carrera_b?.escudo_url || match.delegacion_b_info?.escudo_url}
                  size="lg"
                  className="w-full h-full text-2xl border-none p-0 bg-transparent"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover/team:opacity-100 transition-opacity" />
                <div className="absolute -bottom-1 inset-x-0 flex justify-center opacity-0 group-hover/team:opacity-100 transition-all translate-y-2 group-hover/team:translate-y-0 translate-x-0 z-20">
                  <div className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[6px] font-black uppercase tracking-tighter shadow-lg">PERFIL</div>
                </div>
              </Link>
              <div className="flex flex-col items-center gap-0.5 min-h-[40px] justify-start pt-2">
                <p className="text-xs font-display font-black text-white text-center leading-tight tracking-wide line-clamp-2 px-1 drop-shadow-sm group-hover/team:text-violet-400 transition-colors flex items-center gap-1">
                  {nameB}
                  {match.athlete_b_id && <ExternalLink size={10} className="opacity-30" />}
                </p>
                {subtitleB && (
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter truncate w-full px-2 text-center">
                    {subtitleB}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white/[0.02] backdrop-blur-2xl rounded-[2rem] border border-white/10 p-5 mt-4 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {isFinished || isLive ? (
          <div className="text-center space-y-3">
            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em] mb-3 font-display shadow-sm">Tu Predicción</p>
            <div className="flex items-center justify-center gap-3">
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
            </div>
            {/* Show bonus prediction if exists */}
            {getBonusPredictionLabel() && (
              <div className="flex items-center justify-center mt-2">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-display font-black",
                  isFinished
                    ? (isBonusCorrect()
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400")
                    : "bg-white/5 border-white/10 text-white/70"
                )}>
                  <Target size={14} />
                  <span>{getBonusPredictionLabel()}</span>
                  {isFinished && (
                    <span className="text-[10px]">{isBonusCorrect() ? '+bonus' : ''}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : !isLocked ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black font-display text-white/50 tracking-[0.2em] uppercase drop-shadow-sm">¿Quién ganará?</p>
            </div>

            <div className={cn("grid gap-2.5", supportsDraws ? "grid-cols-3" : "grid-cols-2")}>
              {winnerOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWinnerChange(opt.key);
                  }}
                  className={cn(
                    "relative group/btn py-4 px-2 rounded-2xl text-[10px] sm:text-xs font-display font-black tracking-wide transition-all border-2 flex flex-col items-center justify-center gap-2 min-h-[80px]",
                    winnerPick === opt.key
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] scale-[1.02] z-10"
                      : "bg-black/40 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/30"
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

            {/* ── Bonus Section ── */}
            {hasBonus && winnerPick && (winnerPick !== 'DRAW' || sportName === 'Fútbol') && showBonus && (
              <div className="bg-black/30 rounded-2xl border border-white/5 p-4 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    {/* Fútbol: Exact Score */}
                    {sportName === 'Fútbol' && (
                      <>
                        <p className="text-[10px] font-display font-black text-white/50 uppercase tracking-widest text-center">Marcador exacto</p>
                        <div className="flex items-center justify-center gap-6">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{nameA.split(' ')[0]}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setBonusGolesA(Math.max(0, (bonusGolesA ?? 0) - 1)); }}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-2xl font-black font-mono tabular-nums text-white w-8 text-center">{bonusGolesA ?? 0}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setBonusGolesA((bonusGolesA ?? 0) + 1); }}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                          <span className="text-white/20 text-xl font-black">-</span>
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{nameB.split(' ')[0]}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setBonusGolesB(Math.max(0, (bonusGolesB ?? 0) - 1)); }}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-2xl font-black font-mono tabular-nums text-white w-8 text-center">{bonusGolesB ?? 0}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setBonusGolesB((bonusGolesB ?? 0) + 1); }}
                                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Voleibol: Set Result */}
                    {sportName === 'Voleibol' && (
                      <>
                        <p className="text-[10px] font-display font-black text-white/50 uppercase tracking-widest text-center">Resultado en sets</p>
                        <div className="grid grid-cols-2 gap-2">
                          {getVolleyOptions().map((opt) => (
                            <button
                              key={`${opt.a}-${opt.b}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setBonusGolesA(opt.a);
                                setBonusGolesB(opt.b);
                              }}
                              className={cn(
                                "py-3 px-4 rounded-xl font-display font-black text-lg border-2 transition-all",
                                bonusGolesA === opt.a && bonusGolesB === opt.b
                                  ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                  : "bg-black/30 border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              {opt.a} - {opt.b}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Baloncesto: Margin */}
                    {sportName === 'Baloncesto' && (
                      <>
                        <p className="text-[10px] font-display font-black text-white/50 uppercase tracking-widest text-center">¿Cómo será el partido?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMarginPick('CLOSE'); }}
                            className={cn(
                              "py-4 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                              marginPick === 'CLOSE'
                                ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                : "bg-black/30 border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span className="text-lg">🤝</span>
                            <span className="text-xs font-display font-black uppercase tracking-wider">Cerrado</span>
                            <span className="text-[9px] text-white/30 font-bold">≤10 pts</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMarginPick('WIDE'); }}
                            className={cn(
                              "py-4 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                              marginPick === 'WIDE'
                                ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                : "bg-black/30 border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span className="text-lg">💥</span>
                            <span className="text-xs font-display font-black uppercase tracking-wider">Amplio</span>
                            <span className="text-[9px] text-white/30 font-bold">&gt;10 pts</span>
                          </button>
                        </div>
                      </>
                    )}
              </div>
            )}

            <Button
              className={cn(
                "w-full rounded-2xl h-14 text-sm font-display font-black tracking-[0.1em] transition-all border uppercase",
                isPredicted
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_10px_30px_rgba(16,185,129,0.3)] border-transparent"
                  : "bg-white/10 hover:bg-white text-white hover:text-black border-white/10 shadow-xl"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
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
