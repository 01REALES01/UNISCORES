import { Avatar } from "@/components/ui-primitives";
import { Play, Square, Radio, Clock, AlertCircle, CheckCircle, ArrowRight, Lock } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { SPORT_COLORS } from "@/lib/constants";
import { useState } from "react";
import { toast } from "sonner";

interface AdminScoreboardProps {
  match: any;
  scoreA: any;
  scoreB: any;
  onIniciarPartido: (modo: 'en_vivo' | 'asincronico') => void;
  onFinalizar: () => void;
  onCambiarPeriodo?: () => void;
  onCambiarSet?: (setNum: number, puntosA: number, puntosB: number) => void;
  onCambiarFaseFutbol?: (fase: 'primer_tiempo' | 'entretiempo' | 'segundo_tiempo') => void;
}

export const AdminScoreboard = ({
  match,
  scoreA,
  scoreB,
  onIniciarPartido,
  onFinalizar,
  onCambiarPeriodo,
  onCambiarSet,
  onCambiarFaseFutbol,
}: AdminScoreboardProps) => {
  const [showModeModal, setShowModeModal] = useState(false);
  const [showFaseError, setShowFaseError] = useState(false);
  const [pendingSet, setPendingSet] = useState<number | null>(null);
  const [editPuntosA, setEditPuntosA] = useState(0);
  const [editPuntosB, setEditPuntosB] = useState(0);
  const isLive = match.estado === 'en_curso';
  const isFinal = match.estado === 'finalizado';
  const disciplinaName = match.disciplinas?.name || 'Fútbol';
  const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';
  const detalle = match.marcador_detalle || {};
  const modoRegistro = detalle.modo_registro;
  const currentSet = detalle.set_actual || 1;

  const handleSetClick = (s: number) => {
    if (s === currentSet) return;
    
    // Allow jumping around but with a toast reminder
    if (s < currentSet) {
      toast.info(`Regresando al Set ${s}. Los puntos registrados aquí se sumarán al total.`);
    } else if (s > currentSet + 1) {
      toast.warning(`Saltando al Set ${s}. Asegúrate de haber completado los anteriores.`);
    }

    setEditPuntosA(detalle.sets?.[currentSet]?.puntos_a ?? 0);
    setEditPuntosB(detalle.sets?.[currentSet]?.puntos_b ?? 0);
    setPendingSet(s);
  };

  return (
    <>
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
              <h2 className="text-sm md:text-lg font-black text-white/90 uppercase tracking-wider text-center">{getDisplayName(match, 'a')}</h2>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center gap-5 min-w-[240px] sm:min-w-[300px]">
              <div className="flex items-center justify-center gap-4 sm:gap-6 px-8 sm:px-12 py-6 sm:py-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden"
                style={{ borderColor: `${sportColor}12`, background: `linear-gradient(to bottom, ${sportColor}06, ${sportColor}02)` }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <span className="text-5xl sm:text-7xl md:text-8xl font-black tabular-nums relative z-10 text-white drop-shadow-xl">{scoreA}</span>
                <div className="flex flex-col items-center gap-1 relative z-10">
                  <span className="text-xl sm:text-3xl font-black text-white/10">:</span>
                  {isLive && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sportColor }} />}
                </div>
                <span className="text-5xl sm:text-7xl md:text-8xl font-black tabular-nums relative z-10 text-white drop-shadow-xl">{scoreB}</span>
              </div>

              {isLive ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: sportColor }} />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 shadow-[0_0_12px_currentColor]" style={{ background: sportColor }} />
                    </span>
                    <span className="font-black text-sm uppercase tracking-[0.2em] drop-shadow-[0_0_10px_currentColor]" style={{ color: sportColor }}>
                      EN CURSO
                    </span>
                  </div>
                  {modoRegistro === 'asincronico' && (
                    <span className="text-[9px] font-bold text-amber-400/60 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> Asincrónico
                    </span>
                  )}
                </div>
              ) : match.estado === 'programado' ? (
                <span className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">Programado</span>
              ) : null}

              <div className="flex flex-col gap-2 w-full">
                {!isFinal && (
                    <div className="flex items-center gap-2 p-1.5 rounded-2xl border w-full shrink-0" style={{ borderColor: `${sportColor}10`, background: `${sportColor}04` }}>
                    {match.estado === 'programado' ? (
                      <button onClick={() => setShowModeModal(true)}
                        className="flex-1 h-12 rounded-[0.875rem] flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-white shadow-lg"
                        style={{ background: sportColor, boxShadow: `0 4px 15px ${sportColor}40` }}
                      >
                        <Play size={16} />
                        Iniciar Partido
                      </button>
                    ) : (
                      <>
                        <div className="flex-1 h-12 rounded-[0.875rem] flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest border"
                          style={{ background: `${sportColor}10`, color: sportColor, borderColor: `${sportColor}25` }}
                        >
                          EN CURSO
                        </div>
                        {isLive && (
                          <button onClick={onFinalizar}
                            className="px-6 h-12 rounded-[0.875rem] border flex items-center justify-center gap-2 text-rose-500 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500 hover:text-white transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
                            title="Finalizar Partido"
                          >
                            <Square size={14} fill="currentColor" />
                            Finalizar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
                 {isLive && (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                  <div className="flex items-center gap-2 px-1">
                    {[1, 2, 3, 4, 5].map(s => {
                      const isActive = currentSet === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleSetClick(s)}
                          className="flex-1 h-9 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 border"
                          style={isActive
                            ? { background: sportColor, color: '#000', borderColor: 'transparent', boxShadow: `0 2px 10px ${sportColor}40` }
                            : { background: `${sportColor}05`, color: `${sportColor}60`, borderColor: `${sportColor}20` }
                          }
                        >
                          S{s}
                        </button>
                      );
                    })}
                  </div>
                )}
                {isLive && disciplinaName === 'Fútbol' && onCambiarFaseFutbol && (() => {
                  const fase = detalle.fase_futbol;
                  const tiempoActual = detalle.tiempo_actual || 1;
                  const activeFase = fase === 'entretiempo' ? 'entretiempo'
                    : fase === 'segundo_tiempo' || tiempoActual === 2 ? 'segundo_tiempo'
                    : 'primer_tiempo';

                  const FASE_ORDER: Record<string, number> = { primer_tiempo: 0, entretiempo: 1, segundo_tiempo: 2 };
                  const activeIndex = FASE_ORDER[activeFase] ?? 0;

                  const fases: { key: 'primer_tiempo' | 'entretiempo' | 'segundo_tiempo'; label: string }[] = [
                    { key: 'primer_tiempo', label: '1º Tiempo' },
                    { key: 'entretiempo', label: 'Entretiempo' },
                    { key: 'segundo_tiempo', label: '2º Tiempo' },
                  ];

                  return (
                    <div className="flex items-center gap-2 px-1">
                      {fases.map(({ key, label }) => {
                        const isActive = activeFase === key;
                        const isPast = FASE_ORDER[key] < activeIndex;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (isPast) { setShowFaseError(true); return; }
                              if (!isActive) onCambiarFaseFutbol(key);
                            }}
                            className="flex-1 h-9 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 border flex items-center justify-center gap-1"
                            style={isActive
                              ? { background: sportColor, color: '#000', borderColor: 'transparent', boxShadow: `0 2px 10px ${sportColor}40`, cursor: 'default' }
                              : isPast
                                ? { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.06)', cursor: 'not-allowed' }
                                : { background: `${sportColor}05`, color: `${sportColor}60`, borderColor: `${sportColor}20` }
                            }
                          >
                            {isPast && <Lock size={8} />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
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
              <h2 className="text-sm md:text-lg font-black text-white/90 uppercase tracking-wider text-center">{getDisplayName(match, 'b')}</h2>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Volleyball Set Confirmation Modal */}
    {pendingSet !== null && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative bg-[#0a0816] border rounded-[3rem] p-10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95"
          style={{ borderColor: `${sportColor}20` }}>
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, ${sportColor}, ${sportColor}80)` }} />

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border"
              style={{ background: `${sportColor}15`, borderColor: `${sportColor}30` }}>
              <CheckCircle size={32} style={{ color: sportColor }} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white text-center mb-1">Cerrar Set {currentSet}</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center mb-8">
              {pendingSet! > 3
                ? 'Confirma el resultado final del partido'
                : `Confirma el resultado antes de avanzar al Set ${pendingSet}`}
            </p>

            {/* Set score — editable */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-6">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-center mb-4">
                Set {currentSet} — Marcador Final
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate max-w-[90px] text-center">{getDisplayName(match, 'a')}</p>
                  <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 p-1">
                    <button onClick={() => setEditPuntosA(v => Math.max(0, v - 1))} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white font-bold transition-all">−</button>
                    <span className="text-3xl font-black tabular-nums text-white min-w-[36px] text-center">{editPuntosA}</span>
                    <button onClick={() => setEditPuntosA(v => v + 1)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white font-bold transition-all" style={{ ['--hover-bg' as any]: `${sportColor}20` }}>+</button>
                  </div>
                </div>
                <span className="text-white/20 font-black text-xl mt-5">:</span>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate max-w-[90px] text-center">{getDisplayName(match, 'b')}</p>
                  <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 p-1">
                    <button onClick={() => setEditPuntosB(v => Math.max(0, v - 1))} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white font-bold transition-all">−</button>
                    <span className="text-3xl font-black tabular-nums text-white min-w-[36px] text-center">{editPuntosB}</span>
                    <button onClick={() => setEditPuntosB(v => v + 1)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white font-bold transition-all">+</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 flex gap-3">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200/80 leading-relaxed">
                {pendingSet! > 3
                  ? 'Una vez finalices el partido no podrás revertir esta acción.'
                  : `Una vez avances al Set ${pendingSet} no podrás volver al Set ${currentSet}.`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingSet(null)}
                className="flex-1 h-11 rounded-2xl border text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-all"
                style={{ borderColor: `${sportColor}15` }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { onCambiarSet?.(pendingSet!, editPuntosA, editPuntosB); setPendingSet(null); }}
                className="flex-1 h-11 rounded-2xl font-black text-[9px] uppercase tracking-widest text-black transition-all active:scale-95"
                style={{ background: sportColor, boxShadow: `0 4px 15px ${sportColor}40` }}
              >
                {pendingSet! > 3 ? 'Finalizar Partido' : `Avanzar al Set ${pendingSet}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Mode Selection Modal */}
    {showModeModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative bg-[#0a0816] border rounded-[3rem] p-10 max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95"
          style={{ borderColor: `${sportColor}20` }}>
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, ${sportColor}, ${sportColor}80)` }} />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border"
              style={{ background: `${sportColor}15`, borderColor: `${sportColor}30` }}>
              <Play size={32} style={{ color: sportColor }} />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white text-center mb-2">Iniciar Partido</h2>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center mb-8">¿Cómo se registrará el resultado?</p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => { setShowModeModal(false); onIniciarPartido('en_vivo'); }}
                className="w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ borderColor: `${sportColor}25`, background: `${sportColor}08` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0"
                    style={{ background: `${sportColor}20`, borderColor: `${sportColor}35` }}>
                    <Radio size={20} style={{ color: sportColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-white mb-1">En Vivo</p>
                    <p className="text-[9px] font-bold text-white/30 leading-relaxed">Resultado y eventos fieles a lo que está pasando en tiempo real.</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setShowModeModal(false); onIniciarPartido('asincronico'); }}
                className="w-full p-5 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ borderColor: `${sportColor}15`, background: `${sportColor}04` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <Clock size={20} className="text-white/50" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-white/70 mb-1">Asincrónico</p>
                    <p className="text-[9px] font-bold text-white/20 leading-relaxed">El partido aparecerá en curso. El resultado se actualizará al finalizar el encuentro.</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowModeModal(false)}
              className="w-full h-11 rounded-2xl border text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white/50 transition-all"
              style={{ borderColor: `${sportColor}10` }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    {/* Football Phase — No-going-back Warning Modal */}
    {showFaseError && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative bg-[#0a0816] border rounded-[3rem] p-10 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95"
          style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-400" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/30 bg-red-500/15">
              <Lock size={28} className="text-red-400" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">No se puede regresar</h2>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-8">
              Las fases del partido avanzan en un solo sentido.<br />No es posible regresar a una fase anterior.
            </p>
            <button
              onClick={() => setShowFaseError(false)}
              className="w-full h-11 rounded-2xl font-black text-[9px] uppercase tracking-widest text-white transition-all active:scale-95 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
