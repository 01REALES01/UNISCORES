import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui-primitives";
import { MoveRight, Zap, Star, Trophy, Calendar } from "lucide-react";
import { SportIcon } from "@/components/sport-icons";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { SPORT_GRADIENT, SPORT_ACCENT, SPORT_BORDER, SPORT_GLOW } from "@/lib/constants";
import { getCurrentScore } from "@/lib/sport-scoring";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import type { PartidoWithRelations as Partido } from '../types';

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
  const sportName = partido.disciplinas?.name || 'Deporte';
  const { scoreA, scoreB, extra } = getCurrentScore(sportName, partido.marcador_detalle || {});
  const genero = (partido.genero || 'masculino').toLowerCase();

  return (
    <Link href={`/partido/${partido.id}`} className="group block h-full">
      <div className={cn(
        "relative h-full overflow-hidden rounded-[2rem] border bg-[#1a1625]/80 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
        SPORT_BORDER[sportName] || 'border-white/10',
        SPORT_GLOW[sportName] || 'hover:shadow-indigo-500/10'
      )}>
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-50 group-hover:opacity-70 transition-opacity`} />
        <div className="absolute -bottom-6 -right-6 pointer-events-none select-none group-hover:scale-110 transition-transform duration-700 origin-bottom-right">
          <SportIcon sport={sportName} size={150} className={cn("opacity-[0.12] group-hover:opacity-[0.25] transition-all duration-500 drop-shadow-[0_0_30px_currentColor]", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        <div className="relative p-5 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-full bg-[#17130D] flex items-center justify-center border border-white/10 shadow-[0_0_15px_currentColor]", SPORT_ACCENT[sportName])}>
                <SportIcon sport={sportName} size={18} className="drop-shadow-md" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest leading-tight truncate">{sportName}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] md:text-[13px] font-medium text-slate-400 leading-tight truncate">{partido.lugar || 'Coliseo Central'}</span>
                </div>
              </div>
            </div>
            <div className="z-10">
              <PublicLiveTimer detalle={partido.marcador_detalle || {}} deporte={partido.disciplinas?.name} />
            </div>
          </div>

          {partido.marcador_detalle?.tipo === 'carrera' ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
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
                <Avatar name={getDisplayName(partido, 'a')} src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url} size="lg" className="w-10 h-10 md:w-14 md:h-14 text-lg md:text-xl border-2 border-white/10 shadow-lg bg-[#0a0805] shrink-0" />
                <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
                  <span className="text-sm md:text-lg font-bold text-white leading-tight line-clamp-2 px-1 break-words">{getDisplayName(partido, 'a')}</span>
                  {getCarreraSubtitle(partido, 'a') && (
                    <span className="hidden md:block text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[120px]">{getCarreraSubtitle(partido, 'a')}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                {sportName === 'Ajedrez' ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" />
                    </span>
                    <span className="text-sm font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                      EN VIVO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 md:gap-2 font-black text-3xl md:text-6xl text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                    <span>{scoreA}</span>
                    <span className="text-slate-300/40 text-2xl md:text-4xl -mt-1 md:-mt-2">:</span>
                    <span>{scoreB}</span>
                  </div>
                )}

                <div className="flex flex-col items-center gap-1.5 mt-3">
                  <div className={cn(
                    "text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-1000",
                    genero === 'femenino' ? "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" :
                      genero === 'mixto' ? "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" :
                        "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                  )}>
                    {genero}
                  </div>

                  {extra && (
                    <div className={cn(
                      "text-[10px] font-black tracking-[0.25em] uppercase transition-all duration-300",
                      SPORT_ACCENT[sportName] || 'text-white/60',
                      "drop-shadow-[0_0_8px_currentColor] brightness-125"
                    )}>
                      {extra}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 md:gap-2 text-center min-w-0">
                <Avatar name={getDisplayName(partido, 'b')} src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url} size="lg" className="w-10 h-10 md:w-14 md:h-14 text-lg md:text-xl border-2 border-white/10 shadow-lg bg-[#0a0805] shrink-0" />
                <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
                  <span className="text-sm md:text-lg font-bold text-white leading-tight line-clamp-2 px-1 break-words">{getDisplayName(partido, 'b')}</span>
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
  const sportName = partido.disciplinas?.name || 'Deporte';
  const genero = (partido.genero || 'masculino').toLowerCase();

  return (
    <Link href={`/partido/${partido.id}`} className="group block">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#17130D] hover:bg-[#1f1911] shadow-sm transition-all duration-300 p-3 sm:p-4 hover:-translate-y-0.5">
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />
        <div className="absolute -bottom-3 -right-3 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">
          <SportIcon sport={sportName} size={70} className={cn("opacity-[0.12] group-hover:opacity-[0.20] transition-all duration-500", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <SportIcon sport={sportName} size={14} className={cn("shrink-0", SPORT_ACCENT[sportName])} />
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-white leading-tight">
                {getRelativeDate(partido.fecha, true)}
              </span>
              <span className={cn(
                "text-[9px] font-light tracking-[0.15em] uppercase leading-tight mt-0.5",
                genero === 'femenino' ? "text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.6)]" :
                  genero === 'mixto' ? "text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.6)]" :
                    "text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.6)]"
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
              <Avatar name={getDisplayName(partido, 'a')} src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url} size="sm" className="w-7 h-7 text-[10px] border border-white/5 bg-[#0a0805]" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">{getDisplayName(partido, 'a')}</span>
                {getCarreraSubtitle(partido, 'a') && (
                  <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'a')}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name={getDisplayName(partido, 'b')} src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url} size="sm" className="w-7 h-7 text-[10px] border border-white/5 bg-[#0a0805]" />
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
          "opacity-40 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
        )}>
          Ver Detalles <MoveRight size={10} className="ml-2 shadow-sm" />
        </div>
      </div>
    </Link>
  );
}

export function ResultCard({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || 'Deporte';
  const { scoreA, scoreB } = getCurrentScore(sportName, partido.marcador_detalle || {});
  const winnerA = scoreA > scoreB;
  const isDraw = scoreA === scoreB;
  const genero = (partido.genero || 'masculino').toLowerCase();

  return (
    <Link href={`/partido/${partido.id}`} className="group block">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#17130D] hover:bg-[#1f1911] shadow-sm transition-all duration-300 p-3 sm:p-4 hover:-translate-y-0.5">
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />
        <div className="absolute -bottom-3 -right-3 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">
          <SportIcon sport={sportName} size={70} className={cn("opacity-[0.12] group-hover:opacity-[0.20] transition-all duration-500", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <SportIcon sport={sportName} size={14} className={cn("shrink-0", SPORT_ACCENT[sportName])} />
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-white leading-tight">
                {getRelativeDate(partido.fecha, false)}
              </span>
              <span className={cn(
                "text-[9px] font-light tracking-[0.15em] uppercase leading-tight mt-0.5",
                genero === 'femenino' ? "text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.6)]" :
                  genero === 'mixto' ? "text-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.6)]" :
                    "text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.6)]"
              )}>
                {genero === 'mixto' ? 'Mixto' : genero === 'femenino' ? 'Femenino' : 'Masculino'}
              </span>
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-600/60 tracking-wider uppercase">Finalizado</span>
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
              <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                Empate
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={getDisplayName(partido, 'a')} src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url} size="sm" className="w-6 h-6 text-[9px] border border-white/5 bg-[#0a0805]" />
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
                <Avatar name={getDisplayName(partido, 'b')} src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url} size="sm" className="w-6 h-6 text-[9px] border border-white/5 bg-[#0a0805]" />
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={getDisplayName(partido, 'a')} src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url} size="sm" className="w-6 h-6 text-[9px] border border-white/5 bg-[#0a0805]" />
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-[13px] font-bold truncate", winnerA || isDraw ? "text-white" : "text-slate-500")}>
                    {getDisplayName(partido, 'a')}
                  </span>
                  {getCarreraSubtitle(partido, 'a') && (
                    <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'a')}</span>
                  )}
                </div>
              </div>
              <span className={cn("text-xl font-black tabular-nums ml-2", winnerA ? "text-white" : "text-slate-600")}>
                {scoreA}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={getDisplayName(partido, 'b')} src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url} size="sm" className="w-6 h-6 text-[9px] border border-white/5 bg-[#0a0805]" />
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-[13px] font-bold truncate", !winnerA && scoreB > scoreA ? "text-white" : isDraw ? "text-white" : "text-slate-500")}>
                    {getDisplayName(partido, 'b')}
                  </span>
                  {getCarreraSubtitle(partido, 'b') && (
                    <span className="text-[9px] text-slate-500 font-medium truncate">{getCarreraSubtitle(partido, 'b')}</span>
                  )}
                </div>
              </div>
              <span className={cn("text-xl font-black tabular-nums ml-2", !winnerA && scoreB > scoreA ? "text-white" : "text-slate-600")}>
                {scoreB}
              </span>
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
    </Link>
  );
}
