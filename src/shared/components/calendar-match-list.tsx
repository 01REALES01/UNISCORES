"use client";

import { BatteryCharging, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/shared/components/ui-primitives";
import { SportIcon } from "@/shared/components/sport-icons";
import { PublicLiveTimer } from "@/shared/components/public-live-timer";
import { SPORT_BORDER, SPORT_ACCENT, SPORT_GRADIENT } from "@/lib/constants";
import { getDisplayName, getCarreraSubtitle, isRaceMatch } from "@/lib/sport-helpers";
import type { PartidoWithRelations } from "@/modules/matches/types";

const SPORT_WINNER_BORDER_SM: Record<string, string> = {
    'Fútbol':        'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    'Baloncesto':    'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]',
    'Voleibol':      'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]',
    'Tenis':         'border-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.4)]',
    'Tenis de Mesa': 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
    'Ajedrez':       'border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.4)]',
    'Natación':      'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
};

function getWinnerStyleSm(sport: string, isWinner: boolean): string {
    if (!isWinner) return 'border-white/10 opacity-60';
    return SPORT_WINNER_BORDER_SM[sport] || 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]';
}

interface CalendarMatchListProps {
    loading: boolean;
    selectedDate: Date;
    matches: PartidoWithRelations[];
    isSameDay: (d1: Date, d2: Date) => boolean;
}

export function CalendarMatchList({ loading, selectedDate, matches, isSameDay }: CalendarMatchListProps) {
    const dayMatches = matches.filter(m => isSameDay(new Date(m.fecha), selectedDate));

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 content-start">
                {loading && (
                    <div className="text-center py-6 text-white/30 text-xs font-bold uppercase animate-pulse">Cargando...</div>
                )}

                {!loading && dayMatches.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="w-16 h-16 mb-4 relative z-10 flex items-center justify-center group-hover:-translate-y-2 transition-transform duration-500">
                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                            <BatteryCharging size={40} className="text-amber-400 drop-shadow-2xl" />
                        </div>
                        <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-rose-400 font-black text-lg sm:text-xl mb-2 tracking-tight relative z-10">
                            ¡Día Libre!
                        </h4>
                        <p className="text-white/50 text-xs sm:text-sm font-bold max-w-[240px] leading-relaxed relative z-10">
                            No hay eventos programados para esta fecha. ¡Descansa y prepárate para lo que viene!
                        </p>
                    </div>
                )}

                {!loading && dayMatches.map(match => {
                    const sportName = match.disciplinas?.name ?? '';
                    const sportBorder = SPORT_BORDER[sportName] || 'border-indigo-500/20';
                    const sportAccent = SPORT_ACCENT[sportName] || 'text-indigo-400';
                    const isLive = match.estado === 'en_curso';
                    const isFinished = match.estado === 'finalizado';
                    const isRace = isRaceMatch(match);

                    const scoreA = match.marcador_detalle?.goles_a ?? match.marcador_detalle?.sets_a ?? match.marcador_detalle?.total_a ?? 0;
                    const scoreB = match.marcador_detalle?.goles_b ?? match.marcador_detalle?.sets_b ?? match.marcador_detalle?.total_b ?? 0;

                    const wonA = isFinished && scoreA > scoreB;
                    const wonB = isFinished && scoreB > scoreA;
                    const isDraw = isFinished && scoreA === scoreB;

                    return (
                        <Link key={match.id} href={`/partido/${match.id}`} className="block">
                            <div className={cn(
                                "bg-[#0a0805] rounded-2xl border p-4 transition-all hover:bg-white/5 group relative overflow-hidden shadow-lg",
                                sportBorder
                            )}>
                                <div className={`absolute inset-0 bg-gradient-to-r ${SPORT_GRADIENT[sportName] || 'from-indigo-500/5'} to-transparent opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none`} />

                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs uppercase font-black text-white/40 tracking-widest">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center border",
                                                isLive ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/10 text-white/70"
                                            )}>
                                                <SportIcon sport={sportName} size={12} />
                                            </span>
                                            <span className={sportAccent}>{sportName}</span>
                                            <span className="opacity-50">• {new Date(match.fecha).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                        </div>
                                        {isLive && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]" />}
                                    </div>

                                    {isRace ? (
                                        <div className="flex flex-col items-center justify-center w-full py-3 bg-black/20 rounded-xl border border-white/5 mt-2">
                                            <h5 className="text-sm font-black text-white uppercase tracking-tight truncate px-4 text-center">
                                                {match.marcador_detalle?.distancia}
                                            </h5>
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">
                                                {match.marcador_detalle?.estilo}
                                            </span>
                                            
                                            {isFinished ? (
                                                <div className="flex flex-col gap-1 w-full px-6 mt-3">
                                                    {Array.isArray(match.marcador_detalle?.participantes) && 
                                                     [...match.marcador_detalle.participantes]
                                                        .sort((a: any, b: any) => Number(a.posicion) - Number(b.posicion))
                                                        .slice(0, 3)
                                                        .map((p: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                                                            <div className="flex gap-2 items-center">
                                                                <span className={cn(
                                                                    "text-[10px] sm:text-xs font-black w-4 text-center",
                                                                    p.posicion === 1 ? "text-amber-400" :
                                                                    p.posicion === 2 ? "text-slate-300" :
                                                                    p.posicion === 3 ? "text-amber-600" : "text-white/50"
                                                                )}>#{p.posicion}</span>
                                                                <span className="text-[10px] sm:text-xs font-bold text-white/80 truncate max-w-[100px]">{p.nombre}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-emerald-400 tabular-nums">{p.tiempo}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="mt-3">
                                                    <span className="text-[10px] font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                                        {match.marcador_detalle?.participantes?.length || 0} Participantes
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <Avatar 
                                                    name={getDisplayName(match, 'a')} 
                                                    src={match.atleta_a?.avatar_url}
                                                    className={cn(
                                                        "w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black bg-[#17130D] transition-all duration-500 border-2",
                                                        getWinnerStyleSm(sportName, wonA)
                                                    )} 
                                                />
                                                <div className="flex flex-col flex-1 min-w-0 pr-2">
                                                    <span className={cn(
                                                        "font-bold text-xs sm:text-sm truncate block w-full",
                                                        (isFinished && !wonA) ? "text-white/40" : "text-white"
                                                    )}>
                                                        {getDisplayName(match, 'a')}
                                                    </span>
                                                    {getCarreraSubtitle(match, 'a') && (
                                                        <span className="text-[9px] text-white/40 truncate block w-full font-bold">{getCarreraSubtitle(match, 'a')}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="px-3 shrink-0 flex flex-col items-center justify-center min-w-[70px]">
                                                {isLive ? (
                                                    <>
                                                        {sportName === 'Ajedrez' ? (
                                                            <span className="text-xs font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">VS</span>
                                                        ) : (
                                                            <span className="text-sm font-black text-rose-500 tabular-nums">
                                                                {scoreA} - {scoreB}
                                                            </span>
                                                        )}
                                                        <div className="scale-75 origin-top mt-0 flex items-center">
                                                            <PublicLiveTimer detalle={match.marcador_detalle} deporte={sportName} />
                                                        </div>
                                                    </>
                                                ) : isFinished ? (
                                                    <>
                                                        {sportName === 'Ajedrez' ? (
                                                            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/20">
                                                                {isDraw ? 'EMPATE' : 'FIN'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-black text-white tabular-nums">
                                                                {scoreA} - {scoreB}
                                                            </span>
                                                        )}
                                                        <span className="text-[8px] font-black text-white/30 uppercase mt-0.5">{sportName === 'Ajedrez' ? '' : 'FINAL'}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">VS</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 flex-1 min-w-0 flex-row-reverse justify-end">
                                                <Avatar 
                                                    name={getDisplayName(match, 'b')} 
                                                    src={match.atleta_b?.avatar_url}
                                                    className={cn(
                                                        "w-8 h-8 sm:w-10 sm:h-10 text-[10px] font-black bg-[#17130D] transition-all duration-500 border-2",
                                                        getWinnerStyleSm(sportName, wonB)
                                                    )}
                                                />
                                                <div className="flex flex-col flex-1 min-w-0 items-end text-right pl-2">
                                                    <span className={cn(
                                                        "font-bold text-xs sm:text-sm truncate block w-full",
                                                        (isFinished && !wonB) ? "text-white/40" : "text-white"
                                                    )}>
                                                        {getDisplayName(match, 'b')}
                                                    </span>
                                                    {getCarreraSubtitle(match, 'b') && (
                                                        <span className="text-[9px] text-white/40 truncate block w-full font-bold">{getCarreraSubtitle(match, 'b')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
