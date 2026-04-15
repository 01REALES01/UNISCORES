import { getCurrentScore } from "@/lib/sport-scoring";
import { isAsyncMatch } from "@/lib/is-async-match";
import { SPORT_ACCENT, SPORT_BORDER, SPORT_COLORS, normalizeSportName } from "@/lib/constants";
import { getDisplayName } from "@/lib/sport-helpers";
import { SportIcon } from "@/components/sport-icons";
import { Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MoveRight } from "lucide-react";

export function UnifiedCard({
    partido,
    statusLabel,
    statusIcon,
    statusColor,
    scoreDisplay,
    scoreFooter,
    timeDisplay,
    highlightWinner = false
}: {
    partido: any,
    statusLabel: string,
    statusIcon?: React.ReactNode,
    statusColor?: string,
    scoreDisplay?: { a: any, b: any },
    /** Texto pequeño bajo el marcador (ej. sets en voleibol o parciales por set). */
    scoreFooter?: string | null,
    timeDisplay?: string,
    highlightWinner?: boolean
}) {
    const router = useRouter();
    const sportName = partido.disciplinas?.name || 'Deporte';
    const sportKey = normalizeSportName(sportName);
    const genero = (partido.genero || 'masculino').toLowerCase();
    const isAsync = isAsyncMatch(partido);

    const getAbbr = (name?: string) => {
        if (!name) return "??";
        const words = name.replace(/[^\w\s]/gi, '').split(/\s+/).filter(word => word.length > 2);
        if (words.length >= 2) {
             return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const displayNameA = getDisplayName(partido, 'a');
    const displayNameB = getDisplayName(partido, 'b');

    const winnerA = highlightWinner && (
        (sportKey !== 'Ajedrez' && Number(scoreDisplay?.a) > Number(scoreDisplay?.b)) ||
        (sportKey === 'Ajedrez' && partido.marcador_detalle?.resultado_final === 'victoria_a')
    );
    const winnerB = highlightWinner && (
        (sportKey !== 'Ajedrez' && Number(scoreDisplay?.b) > Number(scoreDisplay?.a)) ||
        (sportKey === 'Ajedrez' && partido.marcador_detalle?.resultado_final === 'victoria_b')
    );
    const isChessDraw = sportKey === 'Ajedrez' && partido.marcador_detalle?.resultado_final === 'empate';

    return (
        <Link href={`/partido/${partido.id}`} className="group block h-full relative z-10">
            <div 
                onClick={() => router.push(`/partido/${partido.id}`)}
                className={cn(
                "relative h-full overflow-hidden rounded-[2.2rem] border transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:-translate-y-1 backdrop-blur-xl shadow-2xl",
                SPORT_BORDER[sportKey] || 'border-white/10',
            )} style={{ 
                background: `linear-gradient(135deg, ${SPORT_COLORS[sportKey] || '#ffffff'}15 0%, rgba(255,255,255,0.02) 100%)`,
                borderColor: `${SPORT_COLORS[sportKey] || '#ffffff'}30`
            }}>
                <div className="absolute -right-16 -bottom-16 w-48 h-48 opacity-[0.08] mix-blend-screen pointer-events-none group-hover:opacity-[0.12] transition-opacity duration-700">
                    <img src="/elementos/08.png" alt="" className="w-full h-full object-contain filter contrast-125 saturate-150" />
                </div>
                
                <div className="absolute inset-0 bg-background mix-blend-overlay opacity-40 group-hover:opacity-30 transition-opacity" />
                
                <div className="absolute -right-[15%] -bottom-[20%] flex items-center justify-center pointer-events-none select-none opacity-[0.1] group-hover:opacity-[0.15] transition-all duration-1000 rotate-[-12deg]">
                    {/* Tamaños moderados en móvil: iconos enormes + blur en Safari a veces provocan cuelgues al pintar muchas tarjetas (ej. solo Voleibol). */}
                    <SportIcon sport={sportKey} size={140} className={cn("sm:hidden transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]", SPORT_ACCENT[sportKey] || 'text-white')} />
                    <SportIcon sport={sportKey} size={280} className={cn("hidden sm:block transition-all duration-[1500ms] group-hover:scale-110 group-hover:rotate-[5deg]", SPORT_ACCENT[sportKey] || 'text-white')} />
                </div>

                <div className="relative p-7 sm:p-10 flex flex-col h-full justify-center">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner hover:bg-white/10 transition-colors")} style={{ borderColor: `${SPORT_COLORS[sportKey] || '#ffffff'}30` }}>
                                <SportIcon sport={sportKey} size={15} variant="react" className="text-white transition-opacity group-hover:opacity-100 placeholder:grayscale" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] md:text-[11px] font-bold font-display text-white tracking-widest leading-tight truncate">{sportName}</span>
                                <span className="text-[10px] md:text-[11px] font-medium text-white/30 leading-tight truncate uppercase tracking-wider mt-0.5">{partido.lugar || 'Sede'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 min-w-[80px] pr-2">
                            {statusLabel === 'LIVE' ? (
                                isAsync
                                    ? <span className="text-[8px] font-black text-amber-400/60 uppercase tracking-widest px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">Sin cobertura</span>
                                    : <PublicLiveTimer detalle={partido.marcador_detalle || {}} deporte={sportKey} />
                            ) : (
                                <div 
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 shadow-inner transition-all"
                                    )}
                                    style={statusLabel === 'PROGRAMADO' ? { 
                                        color: SPORT_COLORS[sportKey], 
                                        borderColor: `${SPORT_COLORS[sportKey]}30`,
                                        background: `${SPORT_COLORS[sportKey]}10`
                                    } : {}}
                                >
                                    {statusIcon}
                                    <span className="text-[9px] font-black uppercase tracking-[0.1em]">{statusLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {partido.marcador_detalle?.tipo === 'carrera' ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-2 text-center w-full min-w-0">
                            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter truncate w-full px-4 drop-shadow-2xl">
                                {partido.marcador_detalle?.distancia} {partido.marcador_detalle?.estilo}
                            </h3>
                            <div className="flex flex-col items-center gap-1.5">
                                {partido.estado === 'finalizado' ? (
                                    <div className="flex flex-col gap-1">
                                        {(['🥇', '🥈', '🥉'] as const).map((medal, i) => {
                                            const p = (partido.marcador_detalle?.participantes || [])
                                                .slice()
                                                .sort((a: any, b: any) => (a.posicion ?? 99) - (b.posicion ?? 99))[i];
                                            if (!p) return null;
                                            return (
                                                <span key={i} className="text-[11px] font-black text-white/60 tracking-tight italic">
                                                    {medal} {p.nombre} {p.tiempo ? `• ${p.tiempo}` : ''}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-sm font-bold text-cyan-600 uppercase tracking-widest">
                                        {(partido.marcador_detalle?.participantes || []).length} PARTICIPANTES
                                    </span>
                                )}
                                <span className={cn(
                                    "text-[9px] font-black tracking-[0.2em] uppercase mt-1",
                                    genero === 'femenino' ? "text-pink-500/80" :
                                    genero === 'mixto' ? "text-purple-500/80" :
                                    "text-blue-500/80"
                                )}>
                                    {genero}
                                </span>
                            </div>
                        </div>
                    ) : (
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
                        <div className="flex flex-col items-center gap-3 text-center relative min-w-0 w-full">
                            <Avatar 
                                name={displayNameA} 
                                src={partido.atleta_a?.avatar_url || partido.carrera_a?.escudo_url || partido.delegacion_a_info?.escudo_url} 
                                className={cn(
                                    "w-16 h-16 sm:w-20 sm:h-20 border-2 transition-all duration-500 bg-black/40 shadow-xl self-center",
                                    winnerA ? "border-emerald-500 scale-105 shadow-emerald-500/20" : "border-white/10"
                                )} 
                            />
                            <span className={cn(
                                "text-[12px] sm:text-[13px] font-black uppercase tracking-widest leading-tight line-clamp-2 max-w-[110px] sm:max-w-[130px] transition-all",
                                winnerA ? "text-white" : "text-slate-200"
                            )}>
                                {displayNameA}
                            </span>
                            {sportKey === 'Ajedrez' && winnerA && (
                                <div className="absolute top-14 bg-amber-500 text-black px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter shadow-lg z-20">
                                    Ganador
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center min-w-[90px]">
                            {timeDisplay ? (
                                <div className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tighter mb-0.5 leading-none">
                                    {timeDisplay}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    {sportKey !== 'Ajedrez' && !isAsync && (
                                        <div className="flex items-center justify-center gap-2.5 font-bold text-5xl sm:text-6xl text-white tracking-tighter tabular-nums mb-0.5 leading-none">
                                            <span className={(winnerB && sportKey !== 'Ajedrez') ? "opacity-20" : ""}>{scoreDisplay?.a}</span>
                                            <span className="text-white/30 text-3xl -mt-1">:</span>
                                            <span className={(winnerA && sportKey !== 'Ajedrez') ? "opacity-20" : ""}>{scoreDisplay?.b}</span>
                                        </div>
                                    )}
                                    {sportKey !== 'Ajedrez' && isAsync && (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-3xl sm:text-5xl font-black text-white/20 tracking-widest">VS</span>
                                            <span className="text-[8px] font-black text-amber-400/50 uppercase tracking-widest">En curso</span>
                                        </div>
                                    )}
                                    {sportKey === 'Ajedrez' && isChessDraw && (
                                        <div className="bg-white/10 text-white/60 border border-white/20 px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-[0.2em] mb-2">
                                            Empate
                                        </div>
                                    )}
                                    {scoreFooter ? (
                                        <p className="mt-2 max-w-[min(100%,220px)] text-center text-[9px] sm:text-[10px] font-bold leading-snug text-white/45 tabular-nums tracking-tight px-1">
                                            {scoreFooter}
                                        </p>
                                    ) : null}
                                </div>
                            )}

                            <div className={cn(
                                "text-[9px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-1.5",
                                genero === 'femenino' ? "text-[#FF4081]" : "text-[#4081FF]"
                            )}>
                                <span className="w-1 h-1 rounded-full bg-current" aria-hidden="true"></span>
                                {genero}
                                <span className="w-1 h-1 rounded-full bg-current" aria-hidden="true"></span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 text-center relative min-w-0 w-full">
                            <Avatar 
                                name={displayNameB} 
                                src={partido.atleta_b?.avatar_url || partido.carrera_b?.escudo_url || partido.delegacion_b_info?.escudo_url} 
                                className={cn(
                                    "w-16 h-16 sm:w-20 sm:h-20 border-2 transition-all duration-500 bg-black/40 shadow-xl self-center",
                                    winnerB ? "border-emerald-500 scale-105 shadow-emerald-500/20" : "border-white/10"
                                )} 
                            />
                            <span className={cn(
                                "text-[12px] sm:text-[13px] font-black uppercase tracking-widest leading-tight line-clamp-2 max-w-[110px] sm:max-w-[130px] transition-all",
                                winnerB ? "text-white" : "text-slate-200"
                            )}>
                                {displayNameB}
                            </span>
                            {sportKey === 'Ajedrez' && winnerB && (
                                <div className="absolute top-14 bg-amber-500 text-black px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter shadow-lg z-20">
                                    Ganador
                                </div>
                            )}
                        </div>
                    </div>
                    )}

                     <div className={cn(
                        "mt-8 py-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-xl",
                        SPORT_ACCENT[sportKey] || 'text-white'
                    )}>
                        <div className="flex items-center gap-3 drop-shadow-[0_0_8px_currentColor]">
                            Analizar Partido <MoveRight size={14} className="group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
