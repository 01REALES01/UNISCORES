import Link from "next/link";
import { cn } from "@/lib/utils";
import { AlignLeft } from "lucide-react";
import { parseEventAudit } from "@/lib/audit-helpers";
import { getDisplayName } from "@/lib/sport-helpers";
import type { PartidoWithRelations as Partido, Evento } from "../types";

interface MatchTimelineProps {
  match: Partido;
  eventos: Evento[];
  sportName: string;
}

export function MatchTimeline({ match, eventos, sportName }: MatchTimelineProps) {
  const sportColor = {
    'Fútbol': '#10B981',
    'Baloncesto': '#FF8000',
    'Voleibol': '#FFB000',
    'Tenis': '#84CC16',
    'Tenis de Mesa': '#10B981',
    'Ajedrez': '#94A3B8',
    'Natación': '#06B6D4',
  }[sportName] || '#FFFFFF';

  return (
    <div className="rounded-[2.5rem] backdrop-blur-2xl border border-white/5 p-6 sm:p-10 animate-in fade-in duration-700 delay-200 shadow-2xl shadow-black/40" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10" style={{ color: sportColor }}>
          <AlignLeft size={22} className="drop-shadow-[0_0_8px_currentColor]" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight uppercase px-1">Minuto a Minuto</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-0.5 px-1">Registro oficial del evento</p>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto py-4 overflow-hidden">
        {/* Vertical Line - Centered */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent -translate-x-1/2" />

        {eventos.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-white/[0.02] rounded-[2rem] border border-white/5 border-dashed relative z-10">
            <p className="text-sm font-medium italic opacity-60">El partido está por comenzar...</p>
          </div>
        ) : (() => {
          // Separate 'fin' system events (match-end markers) from everything else.
          // This ensures: 1) post-match events appear BEFORE the finalization banner,
          // 2) there is only ONE finalization banner even if the admin re-finalized.
          const finEvent = eventos.find(e => e.equipo === 'sistema' && e.tipo_evento === 'fin');
          const otherEvents = eventos.filter(e => !(e.equipo === 'sistema' && e.tipo_evento === 'fin'));
          const orderedEvents = finEvent ? [...otherEvents, finEvent] : otherEvents;

          return (
          <div className="space-y-6 relative z-10">
            {orderedEvents.map((e, idx) => {
              const isTeamA = e.equipo === 'equipo_a';
              const isTeamB = e.equipo === 'equipo_b';
              const isSystem = e.equipo === 'sistema';

              let eventIcon = <div className="w-2.5 h-2.5 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)]" />;
              let eventLabel = 'Evento';
              if (e.tipo_evento === 'gol') { eventIcon = <span className="text-base">⚽</span>; eventLabel = 'Gol'; }
              else if (e.tipo_evento === 'tarjeta_amarilla') { eventIcon = <div className="w-3.5 h-4.5 bg-yellow-400 rounded-[3px] shadow-[0_0_10px_rgba(250,204,21,0.3)]" />; eventLabel = 'Tarjeta Amarilla'; }
              else if (e.tipo_evento === 'tarjeta_roja') { eventIcon = <div className="w-3.5 h-4.5 bg-red-500 rounded-[3px] shadow-[0_0_10px_rgba(239,68,68,0.3)]" />; eventLabel = 'Tarjeta Roja'; }
              else if (e.tipo_evento === 'cambio') { eventIcon = <span className="text-xl text-emerald-400">⇄</span>; eventLabel = 'Cambio'; }
              else if (e.tipo_evento === 'falta') { eventIcon = <span className="text-sm">⛔</span>; eventLabel = 'Falta'; }
              else if (e.tipo_evento === 'punto_1') { eventIcon = <span className="text-[11px] font-black text-white">+1</span>; eventLabel = 'Tiro Libre'; }
              else if (e.tipo_evento === 'punto_2') { eventIcon = <span className="text-[11px] font-black text-white">+2</span>; eventLabel = 'Anotación'; }
              else if (e.tipo_evento === 'punto_3') { eventIcon = <span className="text-[11px] font-black text-white">+3</span>; eventLabel = 'Triple'; }
              else if (e.tipo_evento === 'punto') { eventIcon = <span className="text-base">🏐</span>; eventLabel = 'Punto'; }
              else if (e.tipo_evento === 'set') { eventIcon = <span className="text-sm">🏆</span>; eventLabel = 'Set'; }

              if (isSystem) {
                const auditData = parseEventAudit(e.descripcion);
                return (
                  <div key={e.id || idx} className="relative flex justify-center py-6 w-full">
                    <div className="backdrop-blur-md px-6 font-black text-[11px] text-white/30 uppercase tracking-[0.3em] text-center border border-white/5 rounded-full py-1.5 shadow-xl" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                      {auditData.texto || 'Evento de Sistema'}
                    </div>
                  </div>
                );
              }

              return (
                <div key={e.id || idx} className="relative flex items-center min-h-[90px] group/item">
                  {/* Event icon indicator - Centered */}
                  <div className="absolute left-1/2 -translate-x-1/2 z-20">
                    <div className="w-9 h-9 rounded-full bg-[#111] border border-white/10 flex items-center justify-center shadow-2xl ring-[6px] ring-[#0a0805] group-hover/item:scale-110 transition-transform duration-300">
                      <span className="relative z-10">{eventIcon}</span>
                    </div>
                  </div>

                  {/* LEFT SIDE (Team A) */}
                  <div className={cn(
                    "w-1/2 pr-8 sm:pr-12 flex items-center justify-end gap-4 transition-all duration-300",
                    !isTeamA ? "opacity-0 pointer-events-none translate-x-4" : "opacity-100 translate-x-0"
                  )}>
                    <div className="text-right py-1">
                      <p className="text-sm sm:text-lg font-black leading-tight text-white uppercase tracking-tight">
                        <Link
                          href={e.jugadores?.profile_id ? `/perfil/${e.jugadores.profile_id}` : `/jugador/${e.jugadores?.id}`}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {e.jugadores?.nombre || getDisplayName(match, 'a')}
                        </Link>
                      </p>
                  <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-[0.15em]">{eventLabel}</p>
                </div>
                <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-xl border flex items-center justify-center flex-shrink-0 shadow-lg relative group-hover/item:scale-110 transition-transform" style={{ backgroundColor: `${sportColor}15`, borderColor: `${sportColor}30`, color: sportColor }}>
                  <div className="absolute inset-0 blur-md rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity" style={{ backgroundColor: `${sportColor}20` }} />
                  <span className="relative z-10">{eventIcon}</span>
                </div>
                  </div>

                  {/* RIGHT SIDE (Team B) */}
                  <div className={cn(
                    "w-1/2 pl-8 sm:pl-12 flex items-center justify-start gap-4 transition-all duration-300",
                    !isTeamB ? "opacity-0 pointer-events-none -translate-x-4" : "opacity-100 translate-x-0"
                  )}>
                    <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-xl border flex items-center justify-center flex-shrink-0 shadow-lg relative group-hover/item:scale-110 transition-transform" style={{ backgroundColor: `${sportColor}15`, borderColor: `${sportColor}30`, color: sportColor }}>
                      <div className="absolute inset-0 blur-md rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity" style={{ backgroundColor: `${sportColor}20` }} />
                      <span className="relative z-10">{eventIcon}</span>
                    </div>
                    <div className="text-left py-1">
                      <p className="text-sm sm:text-lg font-black leading-tight text-white uppercase tracking-tight">
                        <Link
                          href={e.jugadores?.profile_id ? `/perfil/${e.jugadores.profile_id}` : `/jugador/${e.jugadores?.id}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {e.jugadores?.nombre || getDisplayName(match, 'b')}
                        </Link>
                      </p>
                      <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-[0.15em]">{eventLabel}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
