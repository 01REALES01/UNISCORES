import { Trash2, Clock, Radio } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { SPORT_COLORS } from "@/lib/constants";

interface AdminMatchTimelineProps {
  eventos: any[];
  match: any;
  onDeleteEvent: (event: any) => void;
  disciplinaName: string;
}

const EVENT_EMOJIS: Record<string, string> = {
  gol: '⚽', punto: '🏐', punto_1: '1️⃣', punto_2: '2️⃣', punto_3: '3️⃣',
  tarjeta_amarilla: '🟨', tarjeta_roja: '🟥', falta: '⛔', cambio: '🔄',
  inicio: '🟢', fin: '🏁', periodo: '⏱', victoria: '👑', empate: '🤝', set: '🏆',
};

export const AdminMatchTimeline = ({
  eventos,
  match,
  onDeleteEvent,
  disciplinaName
}: AdminMatchTimelineProps) => {
  const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';

  return (
    <div className="rounded-[2rem] border overflow-hidden backdrop-blur-sm relative h-[600px] flex flex-col"
      style={{ borderColor: `${sportColor}10`, background: `linear-gradient(to bottom, ${sportColor}06, transparent)` }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 py-5 border-b flex items-center justify-between shrink-0" style={{ borderColor: `${sportColor}08` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner"
            style={{ background: `${sportColor}15`, borderColor: `${sportColor}25` }}>
            <Radio size={14} style={{ color: sportColor }} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Bitácora</h3>
            <p className="text-[9px] font-bold text-white/20 mt-0.5">Eventos del partido</p>
          </div>
        </div>
        <div className="font-black text-[8px] tracking-[0.2em] uppercase px-3 py-1 rounded-lg border"
          style={{ background: `${sportColor}10`, color: `${sportColor}80`, borderColor: `${sportColor}20` }}>
          {eventos.length}
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 custom-scrollbar relative z-10">
        {eventos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <Clock size={36} className="mb-4 text-white/[0.06]" />
            <p className="text-[10px] font-black text-white/15 uppercase tracking-widest">Esperando acciones</p>
            <p className="text-[8px] font-bold text-white/10 mt-1.5">Los eventos aparecerán aquí</p>
          </div>
        ) : (
          eventos.map((e) => {
            const isSystem = e.equipo === 'sistema';
            const isTeamA = e.equipo === 'equipo_a';
            const emoji = EVENT_EMOJIS[e.tipo_evento] || '📌';

            return (
              <div key={e.id}
                className="flex gap-3 p-3.5 rounded-xl border transition-all group/ev relative overflow-hidden"
                style={{
                  borderColor: isSystem ? `${sportColor}05` : `${sportColor}08`,
                  background: isSystem ? `${sportColor}02` : `${sportColor}04`
                }}
              >
                {/* Left accent */}
                <div className="absolute top-0 left-0 bottom-0 w-0.5 transition-colors"
                  style={{ background: isSystem ? `${sportColor}10` : isTeamA ? `${sportColor}40` : `${sportColor}20` }} />



                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{emoji}</span>
                    <p className="font-black text-[10px] uppercase tracking-tight text-white/70">
                      {e.tipo_evento.replace(/_/g, ' ')}
                    </p>
                    {e.periodo && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-white/25 uppercase"
                        style={{ background: `${sportColor}10` }}>P{e.periodo}</span>
                    )}
                  </div>
                  {e.jugadores && (
                    <p className="text-[9px] font-bold text-white/30 truncate mt-0.5">
                      {e.jugadores.numero ? `#${e.jugadores.numero} ` : ''}{e.jugadores.nombre}
                    </p>
                  )}
                  {!e.jugadores && !isSystem && (
                    <p className="text-[9px] font-bold text-white/20 mt-0.5">
                      {isTeamA ? getDisplayName(match, 'a') : getDisplayName(match, 'b')}
                    </p>
                  )}
                </div>

                {/* Delete */}
                {!isSystem && (
                  <div className="flex items-center">
                    <button onClick={() => onDeleteEvent(e)}
                      className="p-2 rounded-xl text-white/0 group-hover/ev:text-rose-500/50 hover:!bg-rose-500/10 hover:!text-rose-500 transition-all active:scale-90"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
