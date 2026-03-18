"use client";

import { Activity, Trophy, MapPin, ChevronRight, Ticket } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/shared/components/ui-primitives";
import { PublicLiveTimer } from "@/shared/components/public-live-timer";
import { SportIcon } from "@/shared/components/sport-icons";
import { getDisplayName, getCarreraSubtitle, isRaceMatch } from "@/lib/sport-helpers";
import type { PartidoWithRelations } from "@/modules/matches/types";

const SPORT_WINNER_BORDER: Record<string, string> = {
    'Fútbol':        'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-110',
    'Baloncesto':    'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] scale-110',
    'Voleibol':      'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110',
    'Tenis':         'border-lime-500 shadow-[0_0_30px_rgba(132,204,22,0.5)] scale-110',
    'Tenis de Mesa': 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)] scale-110',
    'Ajedrez':       'border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.5)] scale-110',
    'Natación':      'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] scale-110',
};

function getWinnerStyle(sport: string, isWinner: boolean): string {
    if (!isWinner) return 'border-white/10 opacity-60';
    return SPORT_WINNER_BORDER[sport] || 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] scale-110';
}

interface MatchFeaturedCardProps {
    match: PartidoWithRelations;
}

export function MatchFeaturedCard({ match }: MatchFeaturedCardProps) {
    if (!match) return null;

    const sport = match.disciplinas?.name ?? '';
    const isLive = match.estado === 'en_vivo';
    const isFinished = match.estado === 'finalizado';
    const isRace = isRaceMatch(match);

    const scoreA = match.marcador_detalle?.goles_a ?? match.marcador_detalle?.sets_a ?? match.marcador_detalle?.total_a ?? 0;
    const scoreB = match.marcador_detalle?.goles_b ?? match.marcador_detalle?.sets_b ?? match.marcador_detalle?.total_b ?? 0;

    const wonA = isFinished && scoreA > scoreB;
    const wonB = isFinished && scoreB > scoreA;
    const isDraw = isFinished && scoreA === scoreB;

    return (
        <div className="bg-gradient-to-br from-indigo-950/40 to-[#0a0805]/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />

            <div className="relative z-10 flex flex-col items-center">
                <div className={cn(
                    "text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 shadow-lg flex items-center gap-2",
                    isLive ? 'bg-rose-600 shadow-rose-500/50' : 'bg-indigo-600 shadow-indigo-500/50'
                )}>
                    {isLive ? <Activity size={14} className="animate-pulse" /> : <Trophy size={14} />}
                    {isLive ? 'En Vivo Ahora' : 'Partido del Día'}
                </div>

                <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-md">
                    <SportIcon sport={sport} size={14} /> {sport}
                </div>

                {isRace ? (
                    /* RACE VIEW (Swimming etc) */
                    <div className="flex flex-col items-center justify-center w-full relative z-10 py-2 sm:py-4 gap-4 mb-8">
                        <div className="flex flex-col items-center bg-white/5 px-6 py-4 rounded-3xl border border-white/10 w-full max-w-sm shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                            <h4 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight text-center">
                                {match.marcador_detalle?.distancia}
                            </h4>
                            <span className="text-xs sm:text-sm font-bold text-indigo-400 uppercase tracking-widest mt-1 text-center">
                                {match.marcador_detalle?.estilo}
                            </span>
                        </div>

                        {isFinished ? (
                            <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-center mb-1">Resultados Finales</span>
                                {Array.isArray(match.marcador_detalle?.participantes) &&
                                    [...match.marcador_detalle.participantes]
                                        .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                        .slice(0, 3)
                                        .map((p: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "text-sm sm:text-base font-black w-6 text-center",
                                                        p.posicion === 1 ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" :
                                                        p.posicion === 2 ? "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.6)]" :
                                                        p.posicion === 3 ? "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]" : "text-white/50"
                                                    )}>
                                                        #{p.posicion}
                                                    </span>
                                                    <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px]">{p.nombre}</span>
                                                </div>
                                                <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400 tabular-nums">{p.tiempo}</span>
                                            </div>
                                        ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                {isLive ? (
                                    <div className="flex flex-col items-center gap-3 mt-2">
                                        <span className="text-sm font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)] flex items-center gap-2">
                                            <Activity size={16} className="animate-pulse" />
                                            En Progreso
                                        </span>
                                        <span className="text-xs font-bold text-white/50 bg-black/40 px-4 py-1.5 rounded-full">{match.marcador_detalle?.participantes?.length || 0} Participantes</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 mt-2">
                                        <div className="flex flex-col items-center">
                                            <span className="text-3xl sm:text-4xl font-black tracking-tighter text-[#FFC000]">
                                                {new Date(match.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-[9px] font-black text-white/30 uppercase mt-1">HOY</span>
                                        </div>
                                        <span className="text-xs font-bold text-white/50 bg-black/40 px-4 py-1.5 rounded-full">{match.marcador_detalle?.participantes?.length || 0} Participantes registrados</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* REGULAR MATCH VIEW */
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full mb-8 relative gap-6 sm:gap-2">
                        {/* Team A */}
                        <div className="flex sm:flex-col items-center gap-4 sm:gap-3 w-full sm:w-[40%] text-center px-1 sm:px-4">
                            <Avatar 
                                name={getDisplayName(match, 'a')} 
                                src={match.atleta_a?.avatar_url}
                                size="lg" 
                                className={cn(
                                    "w-14 h-14 sm:w-20 sm:h-20 shadow-xl transition-all duration-500 border-2 bg-[#0a0805] shrink-0",
                                    getWinnerStyle(sport, wonA)
                                )} 
                            />
                            <div className="flex flex-col min-w-0 items-start sm:items-center w-full">
                                <span className={cn(
                                    "text-sm sm:text-base font-black w-full line-clamp-2 leading-tight",
                                    (isFinished && !wonA) ? "text-white/40" : "text-white"
                                )}>
                                    {getDisplayName(match, 'a')}
                                </span>
                                {getCarreraSubtitle(match, 'a') && (
                                    <span className="text-[10px] text-white/40 font-bold truncate block w-full">{getCarreraSubtitle(match, 'a')}</span>
                                )}
                            </div>
                        </div>

                        {/* Middle: Score/Time */}
                        <div className="flex flex-col items-center justify-center w-full sm:w-[20%] relative z-10 shrink-0 min-w-0 py-4 sm:py-0 bg-white/5 sm:bg-transparent rounded-2xl border border-white/5 sm:border-none">
                            {isLive ? (
                                <div className="flex flex-col items-center">
                                    {sport === 'Ajedrez' ? (
                                        <span className="text-sm sm:text-base font-black text-rose-500 tracking-widest bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/30">VS</span>
                                    ) : (
                                        <span className="text-4xl sm:text-5xl font-black text-rose-500 tracking-tighter drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]">
                                            {scoreA} - {scoreB}
                                        </span>
                                    )}
                                    <div className="scale-90 sm:scale-75 origin-top mt-1">
                                        <PublicLiveTimer detalle={match.marcador_detalle} deporte={sport} />
                                    </div>
                                </div>
                            ) : isFinished ? (
                                <div className="flex flex-col items-center">
                                    {sport === 'Ajedrez' ? (
                                        <span className="text-xs sm:text-sm font-black text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                                            {isDraw ? 'EMPATE' : 'FINAL'}
                                        </span>
                                    ) : (
                                        <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                            {scoreA} - {scoreB}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-black text-white/30 uppercase mt-1">FINALIZADO</span>
                                </div>
                            ) : (
                                <>
                                    <span className="text-3xl sm:text-4xl font-black tracking-tighter text-[#FFC000]">
                                        {new Date(match.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[9px] font-black text-white/30 uppercase mt-1">HOY</span>
                                </>
                            )}
                        </div>

                        {/* Team B */}
                        <div className="flex flex-row-reverse sm:flex-col items-center gap-4 sm:gap-3 w-full sm:w-[40%] text-center px-1 sm:px-4">
                            <Avatar 
                                name={getDisplayName(match, 'b')} 
                                src={match.atleta_b?.avatar_url}
                                size="lg" 
                                className={cn(
                                    "w-14 h-14 sm:w-20 sm:h-20 shadow-xl transition-all duration-500 border-2 bg-[#0a0805] shrink-0",
                                    getWinnerStyle(sport, wonB)
                                )} 
                            />
                            <div className="flex flex-col min-w-0 items-end sm:items-center w-full">
                                <span className={cn(
                                    "text-sm sm:text-base font-black w-full line-clamp-2 leading-tight",
                                    (isFinished && !wonB) ? "text-white/40" : "text-white"
                                )}>
                                    {getDisplayName(match, 'b')}
                                </span>
                                {getCarreraSubtitle(match, 'b') && (
                                    <span className="text-[10px] text-white/40 font-bold truncate block w-full">{getCarreraSubtitle(match, 'b')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col w-full gap-3 text-center">
                    <Link href={`/mapa?lugar=${encodeURIComponent(match.lugar || '')}`} className="w-full">
                        <div className="flex items-center justify-center gap-2 text-xs font-mono text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors px-4 py-2 rounded-xl w-full mb-2 cursor-pointer shadow-sm group">
                            <MapPin size={14} className="group-hover:text-indigo-200 transition-colors" />
                            <span className="truncate">{match.lugar}</span>
                            <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-auto" />
                        </div>
                    </Link>
                    <div className="flex items-center gap-3 w-full">
                        <Link href={`/partido/${match.id}`} className="flex-1">
                            <button className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-white to-gray-200 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                                <Ticket size={16} /> {isFinished ? 'Ver Resultados' : 'Ver Detalles'}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
