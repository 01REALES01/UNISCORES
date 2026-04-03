import { Avatar } from "@/components/ui-primitives";
import { Edit2, Play, Square } from "lucide-react";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { SPORT_COLORS } from "@/lib/constants";
import Link from "next/link";

interface AdminScoreboardProps {
  match: any;
  scoreA: any;
  scoreB: any;
  labelA?: string;
  labelB?: string;
  scoreExtra?: string;
  onEditScore: () => void;
  onToggleCronometro: () => void;
  onFinalizar: () => void;
  onOpenFullEditor: () => void;
  onCambiarPeriodo?: () => void;
  cronometroActivo: boolean;
}

export const AdminScoreboard = ({
  match,
  scoreA,
  scoreB,
  labelA,
  labelB,
  scoreExtra,
  onEditScore,
  onToggleCronometro,
  onFinalizar,
  onOpenFullEditor,
  onCambiarPeriodo,
  cronometroActivo
}: AdminScoreboardProps) => {
  const isLive = match.estado === 'en_curso';
  const isFinal = match.estado === 'finalizado';
  const disciplinaName = match.disciplinas?.name || 'Fútbol';
  const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';

  const detalle = match.marcador_detalle || {};
  const tenisSet = detalle.set_actual || 1;

  const canAdvancePeriod = isLive && !!onCambiarPeriodo && (
    (disciplinaName === 'Fútbol' && (detalle.tiempo_actual || 1) < 2) ||
    disciplinaName === 'Baloncesto' ||
    (disciplinaName === 'Voleibol' && (detalle.set_actual || 1) < 5)
  );
  const nextPeriodLabel = disciplinaName === 'Fútbol' ? '2º Tiempo'
    : disciplinaName === 'Baloncesto'
      ? ((detalle.cuarto_actual || 1) >= 4 ? 'Prórroga' : `Q${(detalle.cuarto_actual || 1) + 1}`)
      : disciplinaName === 'Voleibol' ? `Set ${(detalle.set_actual || 1) + 1}`
      : '';

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="relative rounded-[2.5rem] border overflow-hidden backdrop-blur-sm"
        style={{ borderColor: `${sportColor}12`, background: `linear-gradient(to bottom, ${sportColor}08, transparent)` }}>
        {/* Ambient Glow */}
        {isLive && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[300px] h-[200px] blur-[100px] rounded-full" style={{ background: `${sportColor}15` }} />
            <div className="absolute bottom-0 right-1/4 w-[200px] h-[150px] blur-[80px] rounded-full" style={{ background: `${sportColor}10` }} />
          </div>
        )}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10">
            {/* Team A */}
            <div className="flex flex-col items-center gap-4 group">
              <div className="relative">
                <div className="absolute -inset-2 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${sportColor}15` }} />
                <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-[2rem] bg-zinc-950/80 border p-1.5 shadow-2xl" style={{ borderColor: `${sportColor}20` }}>
                  <Avatar src={match.atleta_a?.avatar_url || match.carrera_a?.escudo_url} name={getDisplayName(match, 'a')} size="lg" className="h-full w-full rounded-[1.5rem]" />
                </div>
              </div>
              <h2 className="text-sm md:text-lg font-black text-white/90 uppercase tracking-wider text-center">
                {match.athlete_a_id ? (
                  <Link href={`/perfil/${match.athlete_a_id}`} className="hover:text-emerald-400 transition-colors">{getDisplayName(match, 'a')}</Link>
                ) : getDisplayName(match, 'a')}
              </h2>
              {getCarreraSubtitle(match, 'a') && (
                match.carrera_a_id ? (
                  <Link href={`/carrera/${match.carrera_a_id}`} className="text-[10px] text-white/30 font-medium hover:text-white/60 transition-colors">{getCarreraSubtitle(match, 'a')}</Link>
                ) : (
                  <span className="text-[10px] text-white/30 font-medium">{getCarreraSubtitle(match, 'a')}</span>
                )
              )}
            </div>

            {/* Center */}
            <div className="flex flex-col items-center gap-5 min-w-[240px] sm:min-w-[300px]">
              <div className="relative group/score">
                {isLive && (
                  <button onClick={onEditScore}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 p-2.5 rounded-xl border text-white/40 opacity-0 group-hover/score:opacity-100 hover:text-white transition-all z-20 shadow-xl backdrop-blur-sm"
                    style={{ borderColor: `${sportColor}30`, background: `${sportColor}15` }}
                  >
                    <Edit2 size={14} strokeWidth={3} />
                  </button>
                )}
                <div className="flex items-center justify-center gap-4 sm:gap-6 px-8 sm:px-12 py-6 sm:py-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden"
                  style={{ borderColor: `${sportColor}12`, background: `linear-gradient(to bottom, ${sportColor}06, ${sportColor}02)` }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                  <span className={cn(
                    "font-black tabular-nums relative z-10 text-white drop-shadow-xl",
                    (labelA === 'DEUCE' || labelB === 'DEUCE' || labelA === 'AD' || labelB === 'AD')
                      ? "text-3xl sm:text-5xl" : "text-5xl sm:text-7xl md:text-8xl"
                  )}>{labelA ?? scoreA}</span>
                  <div className="flex flex-col items-center gap-1 relative z-10">
                    <span className="text-xl sm:text-3xl font-black text-white/10">:</span>
                    {isLive && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sportColor }} />}
                  </div>
                  <span className={cn(
                    "font-black tabular-nums relative z-10 text-white drop-shadow-xl",
                    (labelA === 'DEUCE' || labelB === 'DEUCE' || labelA === 'AD' || labelB === 'AD')
                      ? "text-3xl sm:text-5xl" : "text-5xl sm:text-7xl md:text-8xl"
                  )}>{labelB ?? scoreB}</span>
                </div>
                {scoreExtra && isLive && (
                  <div className="flex items-center justify-center gap-3 mt-2 text-xs font-black tabular-nums text-white/40">
                    {scoreExtra}
                  </div>
                )}
              </div>

              {(disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && match.categoria && (
                <span className="px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest text-lime-400"
                  style={{ borderColor: `${sportColor}20`, background: `${sportColor}08` }}>
                  {match.categoria === 'intermedio' ? 'Intermedio' : 'Avanzado'}
                </span>
              )}

              {isLive ? (
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: sportColor }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 shadow-[0_0_12px_currentColor]" style={{ background: sportColor }} />
                  </span>
                  <span className="font-black text-sm uppercase tracking-[0.2em] drop-shadow-[0_0_10px_currentColor]" style={{ color: sportColor }}>
                    EN CURSO
                  </span>
                </div>
              ) : match.estado === 'programado' ? (
                <span className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Programado</span>
              ) : null}

              <div className="flex flex-col gap-2 w-full">
                {!isFinal && (
                  <div className="flex items-center gap-2 p-1.5 rounded-2xl border w-full" style={{ borderColor: `${sportColor}10`, background: `${sportColor}04` }}>
                    {match.estado === 'programado' ? (
                      <button onClick={onToggleCronometro}
                        className="flex-1 h-12 rounded-[0.875rem] flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-white shadow-lg"
                        style={{ background: sportColor, boxShadow: `0 4px 15px ${sportColor}40` }}
                      >
                        <Play size={16} />
                        Iniciar
                      </button>
                    ) : (
                      <div className="flex-1 h-12 rounded-[0.875rem] flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest border"
                        style={{ background: `${sportColor}10`, color: sportColor, borderColor: `${sportColor}25` }}
                      >
                        EN CURSO
                      </div>
                    )}
                    <button onClick={onFinalizar}
                      className="w-12 h-12 rounded-[0.875rem] border flex items-center justify-center text-white/25 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all active:scale-95"
                      style={{ borderColor: `${sportColor}10`, background: `${sportColor}04` }}
                      title="Finalizar"
                    >
                      <Square size={16} />
                    </button>
                  </div>
                )}
                {!isFinal && (
                  <button onClick={onOpenFullEditor}
                    className="w-full h-10 rounded-2xl border text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-white/5 text-white/50 hover:text-white"
                    style={{ borderColor: `${sportColor}15` }}>
                    <Edit2 size={12} /> Edición Total
                  </button>
                )}
              </div>
              
              {isFinal && (
                <div className="px-5 py-2 rounded-full border text-[10px] font-black text-white/40 uppercase tracking-[0.3em]" style={{ borderColor: `${sportColor}15`, background: `${sportColor}06` }}>
                  Finalizado
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-4 group">
              <div className="relative">
                <div className="absolute -inset-2 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${sportColor}15` }} />
                <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-[2rem] bg-zinc-950/80 border p-1.5 shadow-2xl" style={{ borderColor: `${sportColor}20` }}>
                  <Avatar src={match.atleta_b?.avatar_url || match.carrera_b?.escudo_url} name={getDisplayName(match, 'b')} size="lg" className="h-full w-full rounded-[1.5rem]" />
                </div>
              </div>
              <h2 className="text-sm md:text-lg font-black text-white/90 uppercase tracking-wider text-center">
                {match.athlete_b_id ? (
                  <Link href={`/perfil/${match.athlete_b_id}`} className="hover:text-emerald-400 transition-colors">{getDisplayName(match, 'b')}</Link>
                ) : getDisplayName(match, 'b')}
              </h2>
              {getCarreraSubtitle(match, 'b') && (
                match.carrera_b_id ? (
                  <Link href={`/carrera/${match.carrera_b_id}`} className="text-[10px] text-white/30 font-medium hover:text-white/60 transition-colors">{getCarreraSubtitle(match, 'b')}</Link>
                ) : (
                  <span className="text-[10px] text-white/30 font-medium">{getCarreraSubtitle(match, 'b')}</span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
