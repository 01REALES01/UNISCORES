import { Trophy, X } from "lucide-react";
import { Card, Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";

interface AdminModalsProps {
  isEndingMatch: boolean;
  onCloseEnding: () => void;
  onConfirmEnding: () => void;
  isEditingScore: boolean;
  onCloseEditing: () => void;
  match: any;
  disciplinaName: string;
  onManualScoreUpdate: (field: string, value: number) => void;
  confirmingDeletion: any;
  onCloseDeletion: () => void;
  onConfirmDeletion: () => void;
}

export const AdminModals = ({
  isEndingMatch,
  onCloseEnding,
  onConfirmEnding,
  isEditingScore,
  onCloseEditing,
  match,
  disciplinaName,
  onManualScoreUpdate,
  confirmingDeletion,
  onCloseDeletion,
  onConfirmDeletion
}: AdminModalsProps) => {
  return (
    <>
      {isEndingMatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="relative bg-[#0a0805] border-white/10 p-10 max-w-sm w-full text-center rounded-[3rem] animate-in zoom-in-95 shadow-[0_0_100px_rgba(244,63,94,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 to-orange-600" />
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <Trophy size={48} className="text-amber-500 animate-bounce" />
            </div>
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter text-white">¿Finalizar Partido?</h3>
            <p className="text-sm text-white/40 mb-10 font-bold px-4">El resultado actual será permanente y se cerrarán todas las actualizaciones Live.</p>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-white/40 hover:text-white" onClick={onCloseEnding}>Cancelar</Button>
              <Button className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest shadow-xl shadow-rose-600/20" onClick={onConfirmEnding}>Sí, Finalizar</Button>
            </div>
          </Card>
        </div>
      )}

      {isEditingScore && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="bg-[#0a0805] border-white/10 p-10 max-w-sm w-full rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-center mb-10 text-primary">Ajuste Manual de Score</h3>
            
            <div className="flex flex-col gap-8 mb-10">
              {(['a', 'b'] as const).map(tid => {
                const field = disciplinaName === 'Fútbol' ? 'goles_'+tid : 'total_'+tid;
                const currentVal = match.marcador_detalle?.[field] || 0;
                return (
                  <div key={tid} className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-1">Competidor {tid.toUpperCase()}</span>
                        <span className="text-xs font-black text-white truncate max-w-[120px] uppercase font-mono">{getDisplayName(match, tid)}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-inner">
                      <button 
                        onClick={() => onManualScoreUpdate(field, Math.max(0, currentVal - 1))} 
                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 rounded-lg transition-all font-black text-xl"
                      >
                        -
                      </button>
                      <span className="text-3xl font-black tabular-nums text-white min-w-[40px] text-center font-mono">{currentVal}</span>
                      <button 
                        onClick={() => onManualScoreUpdate(field, currentVal + 1)} 
                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 rounded-lg transition-all font-black text-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Button className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest shadow-xl" onClick={onCloseEditing}>
                Actualizar Marcador
            </Button>
          </Card>
        </div>
      )}

      {confirmingDeletion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="bg-[#0a0805] border-rose-500/20 p-10 max-w-sm w-full text-center rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
                <X size={32} className="text-rose-500" />
            </div>
            <h3 className="text-xl font-black uppercase mb-4 text-white tracking-tighter">¿Eliminar Acción?</h3>
            <p className="text-xs text-white/30 mb-10 font-bold px-6 leading-relaxed">Si este evento otorgó puntos (ej. un Gol), se descontarán automáticamente del marcador global para mantener la consistencia.</p>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-white/40" onClick={onCloseDeletion}>Cancelar</Button>
              <Button className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-600/20" onClick={onConfirmDeletion}>Sí, Eliminar</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
