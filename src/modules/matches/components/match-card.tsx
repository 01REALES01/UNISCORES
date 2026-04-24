import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui-primitives";
import { MoveRight, Zap, Star, Trophy, Calendar, Users } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { SPORT_GRADIENT, SPORT_ACCENT, SPORT_BORDER, SPORT_GLOW } from "@/lib/constants";
import { getCurrentScore } from "@/lib/sport-scoring";
import { isAsyncMatch } from "@/lib/is-async-match";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { getMatchResult } from "@/modules/quiniela/helpers";
import { formatVolleyballSetsLine } from "@/lib/volleyball-card";
import type { PartidoWithRelations as Partido } from '../types';
import type { JornadaWithResults } from '@/hooks/use-jornadas';

// Helper: relative date label
export function getRelativeDate(fecha: string, includeTime = true) {
  const date = new Date(fecha);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  const time = date.toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' });

  if (diff === 0) return includeTime ? `Hoy, ${time}` : 'Hoy';
  if (diff === -1) return includeTime ? `Ayer, ${time}` : 'Ayer';
  if (diff === 1) return includeTime ? `Mañana, ${time}` : 'Mañana';
  return includeTime
    ? date.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString('es-CO', { day: 'numeric', month: 'short' });
}
export function LiveMatchCard({ partido }: { partido: Partido }) {
  const router = useRouter();
  const sportName = partido.disciplinas?.name || 'Deporte';
  const { scoreA, scoreB, extra, subScoreA, subScoreB, labelA, labelB } = getCurrentScore(sportName, partido.marcador_detalle || {});
  const genero = (partido.genero || 'masculino').toLowerCase();
  const categoria = partido.categoria;
  const isSetSport = ['Tenis', 'Tenis de Mesa', 'Vóleibol', 'Voleibol', 'Bádminton', 'Badminton'].includes(sportName);
  const isTenisCampo = sportName === 'Tenis';
  const isVolley = sportName === 'Voleibol';
  const isAsync = isAsyncMatch(partido);
  const matchResult = getMatchResult(partido);

  return (
    <Link href={`/partido/${partido.id}`} className="group block h-full relative z-10">
      <div 
        onClick={() => router.push(`/partido/${partido.id}`)}
        className={cn(
          "relative h-full overflow-hidden rounded-[2rem] border bg-black/20 backdrop-blur-xl transition-all duration-500 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-2xl hover:-translate-y-1 cursor-pointer",
          SPORT_BORDER[sportName] || 'border-white/10',
          SPORT_GLOW[sportName] || 'hover:shadow-indigo-500/10'
        )}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-50 group-hover:opacity-70 transition-opacity`} />
        {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
        <div className="absolute -right-[10%] -bottom-[10%] flex items-center justify-center pointer-events-none select-none opacity-[0.15] group-hover:opacity-[0.25] transition-all duration-1000 rotate-[-12deg] z-0">
          <SportIcon sport={sportName} size={220} className={cn("transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        <div className="relative p-5 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 backdrop-blur-md shadow-sm group-hover:border-white/20 transition-colors">
                <SportIcon sport={sportName} size={15} variant="react" className="text-white/80 transition-opacity group-hover:opacity-100 placeholder:grayscale" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-[11px] font-black font-display text-white/50 uppercase tracking-[0.2em] leading-tight truncate drop-shadow-sm">{sportName}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] md:text-[11px] font-bold text-white/30 leading-tight truncate uppercase tracking-wider">{partido.lugar || 'Coliseo Central'}</span>
                </div>
                {/* Categoria badge — Intermedio / Avanzado */}
                {categoria && (
                  <span className={cn(
                    "mt-1 inline-block self-start text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                    categoria.toLowerCase() === 'avanzado'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : categoria.toLowerCase() === 'intermedio'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-white/10 text-white/50 border border-white/10'
                  )}>
                    {categoria}
                  </span>
                )}
              </div>
            </div>
            <div className="z-10">
              {!isAsync && <PublicLiveTimer detalle={partido.marcador_detalle || {}} deporte={partido.disciplinas?.name} />}
              {isAsync && <span className="text-[8px] font-black text-amber-400/60 uppercase tracking-widest">Sin cobertura</span>}
            </div>
          </div>

          {partido.marcador_detalle?.tipo === 'carrera' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              {/* Logos for careers if they exist */}
              <div className="flex -space-x-3 mb-1">
                {partido.carrera_a?.escudo_url && (
                  <Avatar name={getDisplayName(partido, 'a')} src={partido.carrera_a.escudo_url} size="sm" className="w-10 h-10 border-2 border-white/10 shadow-lg bg-black/40" />
                )}
                {partido.carrera_b?.escudo_url && (
                  <Avatar name={getDisplayName(partido, 'b')} src={partido.carrera_b.escudo_url} size="sm" className="w-10 h-10 border-2 border-white/10 shadow-lg bg-black/40" />
                )}
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight text-center leading-tight">
                {partido.marcador_detalle?.distancia && partido.marcador_detalle?.estilo
                  ? `${partido.marcador_detalle.distancia} ${partido.marcador_detalle.estilo}`
                  : partido.equipo_a}
              </h3>
              {partido.marcador_detalle?.serie && (
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Serie {partido.marcador_detalle.serie}</span>
              )}
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,1)]" />
                </span>
                <span className="text-sm font-black text-cyan-400 uppercase tracking-widest">PRUEBA EN CURSO</span>
              </div>
              <span className="text-[11px] text-slate-500 font-bold">{(partido.marcador_detalle?.participantes || []).length} nadadores</span>
              <div className={cn(
                "text-[10px] font-bold tracking-[0.2em] uppercase",
                genero === 'femenino' ? "text-pink-400" : genero === 'mixto' ? "text-purple-400" : "text-blue-400"
              )}>{genero}</div>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex flex-col items-center gap-1.5 md:gap-2 text-center min-w-0">
                <Avatar 
                  name={getDisplayName(partido, 'a')} 
                  src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url || partido.delegacion_a_info?.escudo_url} 
                  size="lg" 
                  className={cn(
                    "w-10 h-10 md:w-14 md:h-14 text-lg md:text-xl border-2 border-white/10 shadow-lg bg-black/40 shrink-0 transition-all",
                    matchResult === 'A' && "shadow-[0_0_30px_rgba(234,179,8,0.5)] border-yellow-500/50 scale-110"
                  )} 
                />
                <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
                  <span className={cn(
                    "text-sm md:text-lg font-bold leading-tight line-clamp-2 px-1 break-words",
                    matchResult === 'A' ? "text-white" : "text-white/80"
                  )}>{getDisplayName(partido, 'a')}</span>
                  {getCarreraSubtitle(partido, 'a') && (
                    <span className="hidden md:block text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[120px]">{getCarreraSubtitle(partido, 'a')}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                {isAsync ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl md:text-4xl font-black text-white/20 tracking-widest">VS</span>
                    <span className="text-[8px] font-black text-amber-400/50 uppercase tracking-widest">En curso</span>
                  </div>
                ) : sportName === 'Ajedrez' ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" />
                    </span>
                    <span className="text-sm font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                      EN CURSO
                    </span>
                  </div>
                ) : isVolley && !isAsync ? (
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex items-center justify-center gap-1 md:gap-2 font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] text-white text-3xl md:text-6xl"
                      )}
                    >
                      <span>{subScoreA ?? 0}</span>
                      <span className="text-slate-300/40 text-2xl md:text-4xl -mt-1 md:-mt-2">:</span>
                      <span>{subScoreB ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 font-black tabular-nums text-white/45 text-[10px] md:text-xs tracking-tight">
                      <span>Sets</span>
                      <span className="text-white/25">·</span>
                      <span>{`${scoreA ?? 0}\u2013${scoreB ?? 0}`}</span>
                    </div>
                  </div>
                ) : isTenisCampo ? (
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'flex items-center justify-center gap-1 md:gap-2 font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] text-white text-3xl md:text-6xl'
                      )}
                    >
                      <span>{subScoreA ?? 0}</span>
                      <span className="text-slate-300/40 text-2xl md:text-4xl -mt-1 md:-mt-2">:</span>
                      <span>{subScoreB ?? 0}</span>
                    </div>
                    <div
                      className={cn(
                        'flex items-center justify-center gap-1 font-black tabular-nums text-white/45 text-[10px] md:text-xs tracking-tight',
                        (labelA === 'DEUCE' || labelB === 'DEUCE' || labelA === 'AD' || labelB === 'AD') &&
                          'text-white/70 text-xs md:text-sm'
                      )}
                    >
                      <span>{labelA ?? '0'}</span>
                      <span className="text-white/20">·</span>
                      <span>{labelB ?? '0'}</span>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "flex items-center justify-center gap-1 md:gap-2 font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] text-white",
                    (labelA === 'DEUCE' || labelB === 'DEUCE' || labelA === 'AD' || labelB === 'AD')
                      ? "text-xl md:text-4xl" : "text-3xl md:text-6xl"
                  )}>
                    <span>{labelA ?? scoreA}</span>
                    <span className="text-slate-300/40 text-2xl md:text-4xl -mt-1 md:-mt-2">:</span>
                    <span>{labelB ?? scoreB}</span>
                  </div>
                )}

                <div className="flex flex-col items-center gap-1 mt-3">
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-1000",
                    genero === 'femenino' ? "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" :
                      genero === 'mixto' ? "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" :
                        "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                  )}>
                    {genero}
                  </div>

                  {/* Voleibol: solo mostrar el set actual */}
                  {sportName === 'Voleibol' && extra ? (
                    <div className={cn(
                      "text-[13px] font-black tracking-[0.25em] uppercase mt-1",
                      SPORT_ACCENT[sportName] || 'text-white/60',
                      "drop-shadow-[0_0_8px_currentColor] brightness-125"
                    )}>
                      {extra?.includes('Set') ? `SET ${extra.split('Set').pop()?.trim()}` : extra}
                    </div>
                  ) : extra && isSetSport ? (
                    isTenisCampo ? (
                      <div className="flex items-center justify-between w-full min-w-[160px] px-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.max(scoreA ?? 0, 0) }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                          ))}
                          {(scoreA ?? 0) === 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/15 border border-white/20" />
                          )}
                        </div>
                        <div
                          className={cn(
                            'text-[9px] font-black tracking-[0.25em] uppercase',
                            SPORT_ACCENT[sportName] || 'text-white/60',
                            'drop-shadow-[0_0_8px_currentColor] brightness-125'
                          )}
                        >
                          {extra?.includes('Set') ? `SET ${extra.split('Set').pop()?.trim()}` : extra}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.max(scoreB ?? 0, 0) }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                          ))}
                          {(scoreB ?? 0) === 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/15 border border-white/20" />
                          )}
                        </div>
                      </div>
                    ) : (
                    <div className="flex items-center justify-between w-full min-w-[160px] px-1">
                      {/* Team A: número de juegos + dots de sets */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black tabular-nums text-white/70">{subScoreA ?? 0}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.max(scoreA ?? 0, 0) }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                          ))}
                          {(scoreA ?? 0) === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white/15 border border-white/20" />}
                        </div>
                      </div>

                      {/* SET N label */}
                      <div className={cn(
                        "text-[9px] font-black tracking-[0.25em] uppercase",
                        SPORT_ACCENT[sportName] || 'text-white/60',
                        "drop-shadow-[0_0_8px_currentColor] brightness-125"
                      )}>
                        {extra?.includes('Set') ? `SET ${extra.split('Set').pop()?.trim()}` : extra}
                      </div>

                      {/* Team B: dots de sets + número de juegos */}
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.max(scoreB ?? 0, 0) }).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                          ))}
                          {(scoreB ?? 0) === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white/15 border border-white/20" />}
                        </div>
                        <span className="text-xs font-black tabular-nums text-white/70">{subScoreB ?? 0}</span>
                      </div>
                    </div>
                    )
                  ) : extra ? (
                    <div className={cn(
                      "text-[10px] font-black tracking-[0.25em] uppercase transition-all duration-300",
                      SPORT_ACCENT[sportName] || 'text-white/60',
                      "drop-shadow-[0_0_8px_currentColor] brightness-125"
                    )}>
                      {extra}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 md:gap-2 text-center min-w-0">
                <Avatar 
                  name={getDisplayName(partido, 'b')} 
                  src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url || partido.delegacion_b_info?.escudo_url} 
                  size="lg" 
                  className={cn(
                    "w-10 h-10 md:w-14 md:h-14 text-lg md:text-xl border-2 border-white/10 shadow-lg bg-black/40 shrink-0 transition-all",
                    matchResult === 'B' && "shadow-[0_0_30px_rgba(234,179,8,0.5)] border-yellow-500/50 scale-110"
                  )} 
                />
                <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
                  <span className={cn(
                    "text-sm md:text-lg font-bold leading-tight line-clamp-2 px-1 break-words",
                    matchResult === 'B' ? "text-white" : "text-white/80"
                  )}>{getDisplayName(partido, 'b')}</span>
                  {getCarreraSubtitle(partido, 'b') && (
                    <span className="hidden md:block text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[120px]">{getCarreraSubtitle(partido, 'b')}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={cn(
            "mt-4 pt-3 border-t border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_currentColor]",
            SPORT_ACCENT[sportName] || 'text-white/40',
            "opacity-40 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
          )}>
            Ver Detalles <MoveRight size={10} className="ml-2 shadow-sm" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function UpcomingMatchCard({ partido }: { partido: Partido }) {
  const router = useRouter();
  const sportName = partido.disciplinas?.name || 'Deporte';
  const genero = (partido.genero || 'masculino').toLowerCase();

  return (
    <Link href={`/partido/${partido.id}`} className="group block relative z-10">
      <div 
        onClick={() => router.push(`/partido/${partido.id}`)}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 hover:bg-black/30 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all duration-300 p-3 sm:p-4 hover:-translate-y-1 cursor-pointer">
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />
        {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
        <div className="absolute -right-[12%] -bottom-[12%] flex items-center justify-center pointer-events-none select-none opacity-[0.1] group-hover:opacity-[0.2] transition-all duration-1000 rotate-[-12deg] z-0 text-white">
          <SportIcon sport={sportName} size={120} className="transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]" />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
              <SportIcon sport={sportName} size={15} variant="react" className="shrink-0 text-white/40 group-hover:text-white/60 transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black font-display text-white/90 leading-tight tracking-tight">
                {getRelativeDate(partido.fecha, true)}
              </span>
              <span className={cn(
                "text-[9px] font-black tracking-[0.15em] uppercase leading-tight mt-0.5",
                genero === 'femenino' ? "text-pink-400/80" :
                  genero === 'mixto' ? "text-purple-400/80" :
                    "text-blue-400/80"
              )}>
                {genero === 'mixto' ? 'Mixto' : genero === 'femenino' ? 'Femenino' : 'Masculino'}
              </span>
            </div>
          </div>
        </div>

        {partido.marcador_detalle?.tipo === 'carrera' ? (
          <div className="relative z-10 flex flex-col items-center gap-2 my-2">
            <h3 className="text-sm font-black text-white tracking-tight text-center">
              {partido.marcador_detalle?.distancia && partido.marcador_detalle?.estilo
                ? `${partido.marcador_detalle.distancia} ${partido.marcador_detalle.estilo}`
                : partido.equipo_a}
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">
              {(partido.marcador_detalle?.participantes || []).length} participantes
            </span>
          </div>
        ) : (
          <div className="relative z-10 space-y-3 my-2">
            <div className="flex items-center gap-3">
              <Avatar name={getDisplayName(partido, 'a')} src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url || partido.delegacion_a_info?.escudo_url} size="sm" className="w-7 h-7 text-[10px] border border-white/5 bg-black/40" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">{getDisplayName(partido, 'a')}</span>
                {getCarreraSubtitle(partido, 'a') && (
                  <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'a')}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name={getDisplayName(partido, 'b')} src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url || partido.delegacion_b_info?.escudo_url} size="sm" className="w-7 h-7 text-[10px] border border-white/5 bg-black/40" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">{getDisplayName(partido, 'b')}</span>
                {getCarreraSubtitle(partido, 'b') && (
                  <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'b')}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={cn(
          "mt-4 pt-3 border-t border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_currentColor]",
          SPORT_ACCENT[sportName] || 'text-white/40',
          "opacity-20 group-hover:opacity-100 group-hover:translate-x-0.5"
        )}>
          Ver Detalles <MoveRight size={10} className="ml-2 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

export function ResultCard({ partido }: { partido: Partido }) {
  const router = useRouter();
  const sportName = partido.disciplinas?.name || 'Deporte';
  const { scoreA, scoreB, subScoreA, subScoreB } = getCurrentScore(sportName, partido.marcador_detalle || {});
  const md = partido.marcador_detalle || {};
  const _compA = sportName === 'Tenis de Mesa' ? (subScoreA ?? 0) : scoreA;
  const _compB = sportName === 'Tenis de Mesa' ? (subScoreB ?? 0) : scoreB;
  const hasPenales = md.penales_a != null && md.penales_b != null;
  const winnerA = _compA > _compB || (_compA === _compB && hasPenales && md.penales_a > md.penales_b);
  const isDraw = _compA === _compB && !hasPenales;
  const genero = (partido.genero || 'masculino').toLowerCase();
  const categoria = partido.categoria;
  const isSetSport = ['Tenis', 'Tenis de Mesa', 'Voleibol', 'Vóleibol', 'Bádminton', 'Badminton'].includes(sportName);
  
  // For Tenis de Mesa: scoreA/B = puntos del set actual (irrelevante en finalizado),
  // subScoreA/B = sets ganados (lo que queremos mostrar como resultado final).
  const isTenisMesa = sportName === 'Tenis de Mesa';
  const primaryA = isTenisMesa ? (subScoreA ?? 0) : scoreA;
  const primaryB = isTenisMesa ? (subScoreB ?? 0) : scoreB;
  const secondaryA = isTenisMesa ? undefined : subScoreA;
  const secondaryB = isTenisMesa ? undefined : subScoreB;

  return (
    <Link href={`/partido/${partido.id}`} className="group block relative z-10">
      <div 
        onClick={() => router.push(`/partido/${partido.id}`)}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 hover:bg-black/30 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all duration-300 p-3 sm:p-4 hover:-translate-y-1 cursor-pointer">
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />
        {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
        <div className="absolute -right-[12%] -bottom-[12%] flex items-center justify-center pointer-events-none select-none opacity-[0.1] group-hover:opacity-[0.2] transition-all duration-1000 rotate-[-12deg] z-0 text-white">
          <SportIcon sport={sportName} size={120} className="transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]" />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 flex items-center justify-center transition-colors">
              <SportIcon sport={sportName} size={15} variant="react" className="shrink-0 text-white/30 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black font-display text-white/90 leading-tight tracking-tight">
                {getRelativeDate(partido.fecha, false)}
              </span>
              <span className={cn(
                "text-[9px] font-black tracking-[0.15em] uppercase leading-tight mt-0.5",
                genero === 'femenino' ? "text-pink-400/80" :
                  genero === 'mixto' ? "text-purple-400/80" :
                    "text-blue-400/80"
              )}>
                {genero === 'mixto' ? 'Mixto' : genero === 'femenino' ? 'Femenino' : 'Masculino'}
              </span>
              {categoria && (
                <span className={cn(
                  "mt-0.5 inline-block self-start text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded",
                  categoria.toLowerCase() === 'avanzado'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : categoria.toLowerCase() === 'intermedio'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-white/10 text-white/50 border border-white/10'
                )}>
                  {categoria}
                </span>
              )}
            </div>
          </div>
          <span className="text-[9px] font-black text-white/20 tracking-widest uppercase font-display">Finalizado</span>
        </div>

        {partido.marcador_detalle?.tipo === 'carrera' ? (
          <div className="relative z-10 flex flex-col items-center gap-2 my-2">
            <h3 className="text-sm font-black text-white tracking-tight text-center">
              {partido.marcador_detalle?.distancia && partido.marcador_detalle?.estilo
                ? `${partido.marcador_detalle.distancia} ${partido.marcador_detalle.estilo}`
                : partido.equipo_a}
            </h3>
            <div className="flex gap-3 items-end">
              {((partido.marcador_detalle?.participantes || []) as any[])
                .filter((p: any) => p.posicion && p.posicion <= 3 && p.estado === 'valid')
                .sort((a: any, b: any) => a.posicion - b.posicion)
                .map((p: any) => (
                  <div key={p.id} className="flex flex-col items-center gap-0.5 text-center">
                    <span className="text-sm">{p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : '🥉'}</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-[60px]">{p.nombre}</span>
                    <span className="text-[9px] text-cyan-400/60 font-mono">{p.tiempo || '—'}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : sportName === 'Ajedrez' ? (
          <div className={cn("relative z-10 space-y-2", partido.marcador_detalle?.resultado_final === 'empate' && "pr-12")}>
            {partido.marcador_detalle?.resultado_final === 'empate' && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/10 text-slate-300 border border-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                Empate
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={getDisplayName(partido, 'a')} src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url || partido.delegacion_a_info?.escudo_url} size="sm" className="w-6 h-6 text-[9px] border border-white/5 bg-black/40" />
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-[13px] font-bold truncate", partido.marcador_detalle?.resultado_final === 'victoria_a' || partido.marcador_detalle?.resultado_final === 'empate' ? "text-white" : "text-slate-500")}>
                    {getDisplayName(partido, 'a')}
                  </span>
                  {getCarreraSubtitle(partido, 'a') && (
                    <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'a')}</span>
                  )}
                </div>
              </div>
              {partido.marcador_detalle?.resultado_final === 'victoria_a' && (
                <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                  Ganador
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={getDisplayName(partido, 'b')} src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url || partido.delegacion_b_info?.escudo_url} size="sm" className="w-6 h-6 text-[9px] border border-white/5 bg-black/40" />
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-[13px] font-bold truncate", partido.marcador_detalle?.resultado_final === 'victoria_b' || partido.marcador_detalle?.resultado_final === 'empate' ? "text-white" : "text-slate-500")}>
                    {getDisplayName(partido, 'b')}
                  </span>
                  {getCarreraSubtitle(partido, 'b') && (
                    <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'b')}</span>
                  )}
                </div>
              </div>
              {partido.marcador_detalle?.resultado_final === 'victoria_b' && (
                <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                  Ganador
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative z-10 space-y-2">
            {(() => {
              const matchResult = getMatchResult(partido);
              return (
                <>
                  {/* Team A Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar 
                        name={getDisplayName(partido, 'a')} 
                        src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url || partido.delegacion_a_info?.escudo_url} 
                        size="sm" 
                        className={cn(
                          "w-6 h-6 text-[9px] border border-white/5 bg-black/40 transition-all",
                          matchResult === 'A' && "shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-500/50 scale-110"
                        )} 
                      />
                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "text-[13px] font-bold truncate", 
                          matchResult === 'A' || matchResult === 'DRAW' ? "text-white" : "text-slate-500"
                        )}>
                          {getDisplayName(partido, 'a')}
                        </span>
                        {getCarreraSubtitle(partido, 'a') && (
                          <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'a')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className={cn("text-xl font-black tabular-nums", matchResult === 'A' ? "text-white" : "text-slate-600")}>{primaryA}</span>
                      {sportName !== 'Voleibol' && secondaryA !== undefined && secondaryA !== null && (
                        <span className="text-[9px] text-slate-600 font-bold self-end mb-0.5">({secondaryA})</span>
                      )}
                    </div>
                  </div>

                  {/* Team B Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar 
                        name={getDisplayName(partido, 'b')} 
                        src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url || partido.delegacion_b_info?.escudo_url} 
                        size="sm" 
                        className={cn(
                          "w-6 h-6 text-[9px] border border-white/5 bg-black/40 transition-all",
                          matchResult === 'B' && "shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-500/50 scale-110"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "text-[13px] font-bold truncate", 
                          matchResult === 'B' || matchResult === 'DRAW' ? "text-white" : "text-slate-500"
                        )}>
                          {getDisplayName(partido, 'b')}
                        </span>
                        {getCarreraSubtitle(partido, 'b') && (
                          <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'b')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className={cn("text-xl font-black tabular-nums", matchResult === 'B' ? "text-white" : "text-slate-600")}>{primaryB}</span>
                      {sportName !== 'Voleibol' && secondaryB !== undefined && secondaryB !== null && (
                        <span className="text-[9px] text-slate-600 font-bold self-end mb-0.5">({secondaryB})</span>
                      )}
                    </div>
                  </div>
                  {sportName === 'Voleibol' && formatVolleyballSetsLine(partido.marcador_detalle) && (
                    <div className="text-center text-[10px] font-bold text-white/40 tabular-nums tracking-tight border-t border-white/5 pt-2 mt-1 px-2 leading-snug">
                      {formatVolleyballSetsLine(partido.marcador_detalle)}
                    </div>
                  )}
                  {hasPenales && (
                    <div className="text-center text-[10px] font-bold text-violet-400/70 tabular-nums tracking-tight border-t border-white/5 pt-2 mt-1 px-2">
                      Pen. {md.penales_a}–{md.penales_b}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        <div className={cn(
          "mt-4 pt-3 border-t border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_currentColor]",
          SPORT_ACCENT[sportName] || 'text-white/40',
          "opacity-20 group-hover:opacity-100 group-hover:translate-x-0.5"
        )}>
          Ver Detalles <MoveRight size={10} className="ml-2 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JornadaCard — for Ajedrez and Tenis de Mesa multi-participant events
// ─────────────────────────────────────────────────────────────────────────────

export function JornadaCard({ jornada }: { jornada: JornadaWithResults }) {
  const router = useRouter();
  const sportName = (jornada.disciplinas as any)?.name ?? 'Deporte';
  const isFinalized = jornada.estado === 'finalizado';
  const isLive = jornada.estado === 'en_curso';

  const top3 = [...(jornada.jornada_resultados ?? [])]
    .sort((a, b) => a.posicion - b.posicion)
    .slice(0, 3);

  const dateLabel = getRelativeDate(jornada.scheduled_at);
  const generoLabel = jornada.genero === 'femenino' ? 'F' : 'M';

  return (
    <Link href={`/jornadas/${jornada.id}`} className="group block h-full relative z-10">
      <div 
        onClick={() => router.push(`/jornadas/${jornada.id}`)}
        className={cn(
          "relative h-full overflow-hidden rounded-[2rem] border bg-black/20 backdrop-blur-xl transition-all duration-500 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-2xl hover:-translate-y-1 cursor-pointer",
          SPORT_BORDER[sportName] || 'border-white/10',
          SPORT_GLOW[sportName] || 'hover:shadow-indigo-500/10'
        )}>
        {/* Sport gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName] || 'from-white/5 to-transparent'} opacity-50 group-hover:opacity-70 transition-opacity`} />

        {/* Sport icon watermark */}
        <div className="absolute -bottom-6 -right-6 pointer-events-none select-none group-hover:scale-110 transition-transform duration-700 origin-bottom-right">
          <SportIcon sport={sportName} size={150} className={cn("opacity-[0.12] group-hover:opacity-[0.25] transition-all duration-500 drop-shadow-[0_0_30px_currentColor]", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        <div className="relative p-5 flex flex-col h-full gap-3">
          {/* Top row: sport + status */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-lg bg-black/30 border", SPORT_ACCENT[sportName] || 'text-white/60', SPORT_BORDER[sportName] || 'border-white/10')}>
                {sportName}
              </span>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                {generoLabel}
              </span>
            </div>

            {isLive ? (
              <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                En curso
              </span>
            ) : isFinalized ? (
              <span className="text-[10px] font-black tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                Finalizado
              </span>
            ) : (
              <span className="text-[10px] font-black tracking-widest uppercase text-white/30 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                {dateLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <p className="text-white font-black text-lg leading-tight">
              {jornada.nombre ?? `Ronda ${jornada.numero}`}
            </p>
            {jornada.lugar && (
              <p className="text-white/30 text-xs mt-0.5">{jornada.lugar}</p>
            )}
          </div>

          {/* Participants count or mini podium */}
          {isFinalized && top3.length > 0 ? (
            <div className="space-y-1.5">
              {top3.map((r, i) => {
                const carrera = (r.carreras as any)?.nombre ?? '—';
                const jugador = (r.jugadores as any)?.nombre;
                const medal = ['🥇', '🥈', '🥉'][i];
                return (
                  <div key={r.carrera_id} className="flex items-center gap-2 text-xs">
                    <span className="text-sm">{medal}</span>
                    <span className="font-bold text-white/80 truncate">{jugador ?? carrera}</span>
                    {jugador && <span className="text-white/30 truncate">{carrera}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Users size={12} />
              <span>
                {jornada.jornada_resultados?.length > 0
                  ? `${jornada.jornada_resultados.length} participantes`
                  : 'Todos los participantes'
                }
              </span>
            </div>
          )}

          {/* Footer */}
          <div className={cn(
            "mt-auto pt-3 border-t border-white/5 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_currentColor]",
            SPORT_ACCENT[sportName] || 'text-white/40',
            "opacity-20 group-hover:opacity-100"
          )}>
            {isFinalized ? 'Ver Resultados' : 'Ver Jornada'} <MoveRight size={10} className="ml-2 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
