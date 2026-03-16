import { useState } from "react";
import { Activity, Check, User as LucideUser } from "lucide-react";
import { Card, Badge, Avatar, Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";

interface AdminEventCreatorProps {
  match: any;
  actions: any[];
  jugadoresA: any[];
  jugadoresB: any[];
  onAddEvent: (data: any) => void;
  onAddPlayer: (team: string, data: any) => void;
  disciplinaName: string;
}

export const AdminEventCreator = ({
  match,
  actions,
  jugadoresA,
  jugadoresB,
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

  const isIndividualSport = ['Ajedrez', 'Tenis', 'Tenis de Mesa', 'Voleibol'].includes(disciplinaName);

  const handleConfirm = () => {
    onAddEvent(nuevoEvento);
    setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
  };

  const handleLocalAddPlayer = () => {
    if (!newPlayerForm.nombre || !addingPlayerTeam) return;
    onAddPlayer(addingPlayerTeam, newPlayerForm);
    setAddingPlayerTeam(null);
    setNewPlayerForm({ nombre: '', numero: '', profile_id: '' });
  };

  return (
    <Card variant="glass" className="p-0 border-white/10 bg-zinc-900/50 overflow-hidden relative shadow-2xl">
      <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-3">
          <Activity size={20} className="text-primary" /> Registrar Evento
        </h3>
        {nuevoEvento.tipo && (
          <Badge className="bg-primary/20 text-primary uppercase text-[10px] tracking-widest px-3 py-1">Paso Activo</Badge>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Step 1: Action */}
        <div>
          <p className="text-[10px] font-black uppercase text-white/30 mb-4 tracking-widest">1. Selecciona Acción</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {actions.map(action => (
              <button
                key={action.value}
                onClick={() => setNuevoEvento({ ...nuevoEvento, tipo: action.value })}
                className={cn(
                  "h-24 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 group",
                  nuevoEvento.tipo === action.value 
                    ? "bg-primary text-black border-primary scale-[1.02] shadow-xl shadow-primary/20" 
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{action.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 & 3: Team and Player */}
        <div className={cn("space-y-8 transition-all duration-500", nuevoEvento.tipo ? "opacity-100" : "opacity-30 pointer-events-none filter blur-[2px]")}>
          <div>
            <p className="text-[10px] font-black uppercase text-white/30 mb-4 tracking-widest">2. Selecciona Competidor</p>
            <div className="grid grid-cols-2 gap-4">
              {['equipo_a', 'equipo_b'].map(tid => (
                <button
                  key={tid}
                  onClick={() => setNuevoEvento({ ...nuevoEvento, equipo: tid, jugador_id: null })}
                  className={cn(
                    "h-20 rounded-2xl border-2 transition-all flex items-center px-5 gap-4 shadow-inner",
                    nuevoEvento.equipo === tid 
                        ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                        : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <Avatar name={getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')} size="sm" className={cn(nuevoEvento.equipo === tid ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-900" : "")} />
                  <span className="font-black text-[11px] uppercase tracking-tight truncate">{getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}</span>
                </button>
              ))}
            </div>
          </div>

          {!isIndividualSport && (
            <div className={cn("transition-all duration-500", nuevoEvento.equipo ? "opacity-100" : "opacity-30 pointer-events-none")}>
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">3. Selecciona Jugador</p>
                <button 
                    onClick={() => setAddingPlayerTeam(nuevoEvento.equipo)} 
                    className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all"
                >
                    + Nuevo Atleta
                </button>
              </div>

              {addingPlayerTeam ? (
                <Card className="p-6 bg-zinc-900/80 border-primary/30 shadow-2xl animate-in zoom-in-95 duration-300">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Añadiendo a {getDisplayName(match, addingPlayerTeam === 'equipo_a' ? 'a' : 'b')}</p>
                    <div className="space-y-3">
                        <input 
                            placeholder="Nombre Completo" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:border-primary outline-none transition-all placeholder:text-white/20" 
                            value={newPlayerForm.nombre} 
                            onChange={e => setNewPlayerForm({ ...newPlayerForm, nombre: e.target.value })} 
                        />
                        <div className="flex gap-3">
                            <input 
                                placeholder="#" 
                                className="w-20 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-center font-mono font-black focus:border-primary outline-none transition-all" 
                                value={newPlayerForm.numero} 
                                onChange={e => setNewPlayerForm({ ...newPlayerForm, numero: e.target.value })} 
                            />
                            <Button size="lg" onClick={handleLocalAddPlayer} className="flex-1 bg-primary text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Registrar</Button>
                            <Button size="lg" variant="ghost" onClick={() => setAddingPlayerTeam(null)} className="px-4 text-white/40 hover:text-white">✕</Button>
                        </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                  {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(j => (
                    <button
                      key={j.id}
                      onClick={() => setNuevoEvento({ ...nuevoEvento, jugador_id: j.id })}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all group/j-btn",
                        nuevoEvento.jugador_id === j.id 
                            ? "bg-white text-black border-white shadow-xl scale-[1.02]" 
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] border shrink-0 transition-colors", 
                        nuevoEvento.jugador_id === j.id ? "bg-black text-white border-transparent" : "bg-white/10 border-white/10 text-white/60 group-hover/j-btn:bg-white/20"
                      )}>
                        {j.numero || '?'}
                      </div>
                      <span className="truncate text-[10px] font-black uppercase tracking-tight">{j.nombre}</span>
                    </button>
                  ))}
                  {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).length === 0 && nuevoEvento.equipo && !addingPlayerTeam && (
                      <div className="col-span-full py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sin jugadores registrados</p>
                      </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-white/5">
            <Button
              size="lg"
              className={cn(
                "w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all text-[11px]", 
                (nuevoEvento.jugador_id || isIndividualSport) && nuevoEvento.tipo 
                    ? "bg-primary text-black shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-95" 
                    : "bg-white/5 text-white/10 border border-white/5 grayscale"
              )}
              onClick={handleConfirm}
              disabled={!( (nuevoEvento.jugador_id || isIndividualSport) && nuevoEvento.tipo )}
            >
              <Check className="mr-3" size={20} strokeWidth={4} /> Confirmar Acción
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
