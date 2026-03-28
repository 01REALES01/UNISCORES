import { useState } from "react";
import { Check, Zap, UserX } from "lucide-react";
import { Avatar, Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import { SPORT_COLORS } from "@/lib/constants";

interface AdminEventCreatorProps {
  match: any;
  actions: any[];
  jugadoresA: any[];
  jugadoresB: any[];
  eventos: any[];
  onAddEvent: (data: any) => void;
  onAddPlayer: (team: string, data: any) => Promise<number | null>;
  disciplinaName: string;
}

export const AdminEventCreator = ({
  match,
  actions,
  jugadoresA,
  jugadoresB,
  eventos,
  onAddEvent,
  onAddPlayer,
  disciplinaName
}: AdminEventCreatorProps) => {
  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: '',
    equipo: '',
    jugador_id: null as number | null,
  });
  const [addingPlayerTeam, setAddingPlayerTeam] = useState<string | null>(null);
  const [newPlayerForm, setNewPlayerForm] = useState({ nombre: '', numero: '', profile_id: '' });

  const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';
  const isIndividualSport = ['Ajedrez', 'Tenis', 'Tenis de Mesa'].includes(disciplinaName);
  const isVolleyball = disciplinaName === 'Voleibol';
  const isFutbol = disciplinaName === 'Fútbol';
  const needsPlayer = !isIndividualSport;
  const playerOptional = isVolleyball;

  // Players expelled by red card — cannot receive more events
  const expelledPlayerIds = new Set(
    isFutbol
      ? eventos
          .filter(e => e.tipo_evento === 'tarjeta_roja')
          .map(e => e.jugador_id_normalized)
          .filter(Boolean)
      : []
  );

  const canConfirm = nuevoEvento.tipo && nuevoEvento.equipo && (
    nuevoEvento.jugador_id || isIndividualSport || (playerOptional && nuevoEvento.jugador_id === -1)
  );

  const handleConfirm = () => {
    if (playerOptional && nuevoEvento.jugador_id === -1) {
      onAddEvent({ ...nuevoEvento, jugador_id: null });
    } else {
      onAddEvent(nuevoEvento);
    }
    setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
  };

  const handleLocalAddPlayer = async () => {
    if (!newPlayerForm.nombre || !addingPlayerTeam) return;
    const newJugadorId = await onAddPlayer(addingPlayerTeam, newPlayerForm);
    setAddingPlayerTeam(null);
    setNewPlayerForm({ nombre: '', numero: '', profile_id: '' });
    if (newJugadorId) {
      setNuevoEvento(prev => ({ ...prev, jugador_id: newJugadorId }));
    }
  };

  const step = !nuevoEvento.tipo ? 1 : !nuevoEvento.equipo ? 2 : 3;

  const StepBadge = ({ n, active }: { n: number, active: boolean }) => (
    <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black border transition-all"
      style={active
        ? { background: sportColor, color: '#000', borderColor: sportColor }
        : { background: `${sportColor}10`, borderColor: `${sportColor}20`, color: `${sportColor}60` }
      }>{n}</span>
  );

  return (
    <div className="rounded-[2rem] border overflow-hidden backdrop-blur-sm relative"
      style={{ borderColor: `${sportColor}10`, background: `linear-gradient(to bottom, ${sportColor}06, transparent)` }}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: `${sportColor}08` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner"
            style={{ background: `${sportColor}15`, borderColor: `${sportColor}25` }}>
            <Zap size={16} style={{ color: sportColor }} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Registrar Evento</h3>
            <p className="text-[9px] font-bold text-white/20 mt-0.5">Paso {step} de {needsPlayer ? 3 : 2}</p>
          </div>
        </div>
        {nuevoEvento.tipo && (
          <div className="font-black text-[8px] tracking-[0.2em] uppercase px-3 py-1 rounded-lg border"
            style={{ background: `${sportColor}10`, color: `${sportColor}aa`, borderColor: `${sportColor}25` }}>
            {nuevoEvento.tipo.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Step 1: Action */}
        <div>
          <p className="text-[9px] font-black uppercase text-white/25 mb-3 tracking-[0.25em] flex items-center gap-2">
            <StepBadge n={1} active={step === 1} /> Acción
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {actions.map(action => (
              <button
                key={action.value}
                onClick={() => setNuevoEvento({ ...nuevoEvento, tipo: action.value })}
                className="py-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 group/act"
                style={nuevoEvento.tipo === action.value
                  ? { background: `${sportColor}12`, borderColor: `${sportColor}35`, boxShadow: `0 4px 20px ${sportColor}10` }
                  : { borderColor: `${sportColor}08`, background: `${sportColor}03` }
                }
              >
                <span className="text-2xl group-hover/act:scale-110 transition-transform">{action.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-tight"
                  style={{ color: nuevoEvento.tipo === action.value ? sportColor : 'rgba(255,255,255,0.35)' }}
                >{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Team */}
        <div className={cn("transition-all duration-300", nuevoEvento.tipo ? "opacity-100" : "opacity-20 pointer-events-none blur-[1px]")}>
          <p className="text-[9px] font-black uppercase text-white/25 mb-3 tracking-[0.25em] flex items-center gap-2">
            <StepBadge n={2} active={step === 2} /> Competidor
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['equipo_a', 'equipo_b'].map(tid => (
              <button
                key={tid}
                onClick={() => setNuevoEvento({ ...nuevoEvento, equipo: tid, jugador_id: null })}
                className="py-4 px-4 rounded-xl border-2 transition-all flex items-center gap-3"
                style={nuevoEvento.equipo === tid
                  ? { borderColor: `${sportColor}40`, background: `${sportColor}08`, boxShadow: `0 4px 20px ${sportColor}08` }
                  : { borderColor: `${sportColor}08`, background: `${sportColor}03` }
                }
              >
                <Avatar
                  name={getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}
                  src={tid === 'equipo_a' ? match.carrera_a?.escudo_url : match.carrera_b?.escudo_url}
                  className={cn("w-8 h-8 border shrink-0", nuevoEvento.equipo === tid ? "border-white/30" : "border-white/10")}
                />
                <span className={cn("font-black text-[10px] uppercase tracking-tight truncate", nuevoEvento.equipo === tid ? "text-white/90" : "text-white/40")}>
                  {getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Player */}
        {needsPlayer && (
          <div className={cn("transition-all duration-300", nuevoEvento.equipo ? "opacity-100" : "opacity-20 pointer-events-none blur-[1px]")}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <p className="text-[9px] font-black uppercase text-white/25 tracking-[0.25em] flex items-center gap-2">
                <StepBadge n={3} active={step === 3} /> Jugador {playerOptional && <span className="text-white/15 normal-case tracking-normal ml-1">(opcional)</span>}
              </p>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {playerOptional && (
                  <button
                    onClick={() => setNuevoEvento({ ...nuevoEvento, jugador_id: -1 })}
                    className="flex-1 sm:flex-initial text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-1"
                    style={nuevoEvento.jugador_id === -1
                      ? { background: `${sportColor}15`, color: `${sportColor}cc`, borderColor: `${sportColor}30` }
                      : { borderColor: `${sportColor}10`, color: 'rgba(255,255,255,0.2)' }
                    }
                  >
                    <UserX size={10} /> Sin jugador
                  </button>
                )}
                <button onClick={() => setAddingPlayerTeam(nuevoEvento.equipo)}
                  className="flex-1 sm:flex-initial text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border transition-all"
                  style={{ background: `${sportColor}08`, color: `${sportColor}90`, borderColor: `${sportColor}20` }}
                >
                  + Nuevo
                </button>
              </div>
            </div>

            {addingPlayerTeam ? (
              <div className="p-4 rounded-xl border animate-in fade-in zoom-in-95 duration-200 space-y-3" style={{ borderColor: `${sportColor}25`, background: `${sportColor}05` }}>
                <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${sportColor}60` }}>Nuevo jugador para {getDisplayName(match, addingPlayerTeam === 'equipo_a' ? 'a' : 'b')}</p>
                <input placeholder="Nombre completo"
                  className="w-full bg-black/20 border rounded-lg px-3 py-2.5 text-[11px] font-bold focus:outline-none transition-all placeholder:text-white/15"
                  style={{ borderColor: `${sportColor}20` }}
                  value={newPlayerForm.nombre} onChange={e => setNewPlayerForm({ ...newPlayerForm, nombre: e.target.value })} autoFocus
                />
                <div className="flex gap-2">
                  <input placeholder="#"
                    className="w-14 bg-black/20 border rounded-lg px-2 py-2.5 text-[11px] text-center font-mono font-black focus:outline-none"
                    style={{ borderColor: `${sportColor}20` }}
                    value={newPlayerForm.numero} onChange={e => setNewPlayerForm({ ...newPlayerForm, numero: e.target.value })}
                  />
                  <Button size="sm" onClick={handleLocalAddPlayer} className="flex-1 h-9 text-black font-black text-[9px] uppercase tracking-widest" style={{ background: sportColor }}>Registrar</Button>
                  <button onClick={() => setAddingPlayerTeam(null)} className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-white/25 hover:text-white text-xs">✕</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(j => {
                  const isExpelled = expelledPlayerIds.has(j.id);
                  return (
                    <button key={j.id}
                      onClick={() => !isExpelled && setNuevoEvento({ ...nuevoEvento, jugador_id: j.id })}
                      disabled={isExpelled}
                      className={cn(
                        "p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all group/j",
                        isExpelled && "opacity-40 cursor-not-allowed"
                      )}
                      style={isExpelled
                        ? { borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }
                        : nuevoEvento.jugador_id === j.id
                          ? { background: sportColor, color: '#000', borderColor: sportColor }
                          : { borderColor: `${sportColor}08`, background: `${sportColor}03` }
                      }
                    >
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[9px] font-black border shrink-0 transition-colors"
                        style={isExpelled
                          ? { background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: 'rgba(239,68,68,0.6)' }
                          : nuevoEvento.jugador_id === j.id
                            ? { background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'transparent' }
                            : { background: `${sportColor}10`, borderColor: `${sportColor}15`, color: `${sportColor}70` }
                        }
                      >
                        {isExpelled ? '🟥' : (j.numero || '?')}
                      </div>
                      <span className={cn(
                        "truncate text-[10px] font-black uppercase tracking-tight",
                        isExpelled && "line-through"
                      )}>{j.nombre}</span>
                      {isExpelled && <span className="text-[7px] font-black text-rose-500/60 uppercase tracking-wider ml-auto shrink-0">Expulsado</span>}
                    </button>
                  );
                })}
                {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).length === 0 && nuevoEvento.equipo && !addingPlayerTeam && (
                  <div className="col-span-full py-6 text-center rounded-xl border border-dashed" style={{ borderColor: `${sportColor}10` }}>
                    <p className="text-[9px] font-black text-white/15 uppercase tracking-widest">Sin jugadores</p>
                    <p className="text-[8px] text-white/10 mt-1">Usa la Plantilla de arriba para registrar</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <div className="pt-4 border-t" style={{ borderColor: `${sportColor}08` }}>
          <Button size="lg"
            className={cn("w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-[10px]",
              canConfirm ? "text-black shadow-xl hover:scale-[1.01] active:scale-95" : "text-white/10 border cursor-not-allowed"
            )}
            style={canConfirm
              ? { background: sportColor, boxShadow: `0 8px 25px ${sportColor}25` }
              : { borderColor: `${sportColor}10`, background: `${sportColor}04` }
            }
            onClick={handleConfirm} disabled={!canConfirm}
          >
            <Check className="mr-2" size={18} strokeWidth={3} /> Confirmar Acción
          </Button>
        </div>
      </div>
    </div>
  );
};
