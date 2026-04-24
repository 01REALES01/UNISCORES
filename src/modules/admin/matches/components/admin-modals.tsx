import { Trophy, X, AlertCircle } from "lucide-react";
import { Card, Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import { useState } from "react";
import { MatchReviewModal } from "./match-review-modal";

interface AdminModalsProps {
  isEndingMatch: boolean;
  onCloseEnding: () => void;
  onConfirmEnding: () => void;
  onConfirmWO?: (ganador: 'equipo_a' | 'equipo_b') => void;
  onConfirmPenales?: (penalesA: number, penalesB: number) => void;
  isEditingScore: boolean;
  onCloseEditing: () => void;
  match: any;
  disciplinaName: string;
  onManualScoreUpdate: (field: string, value: number) => void;
  confirmingDeletion: any;
  onCloseDeletion: () => void;
  onConfirmDeletion: () => void;
  showReview: boolean;
  onCloseReview: () => void;
  onConfirmReview: () => void;
  eventos: any[];
}

export const AdminModals = ({
  isEndingMatch,
  onCloseEnding,
  onConfirmEnding,
  onConfirmWO,
  onConfirmPenales,
  isEditingScore,
  onCloseEditing,
  match,
  disciplinaName,
  onManualScoreUpdate,
  confirmingDeletion,
  onCloseDeletion,
  onConfirmDeletion,
  showReview,
  onCloseReview,
  onConfirmReview,
  eventos,
}: AdminModalsProps) => {
  const [showWOModal, setShowWOModal] = useState(false);
  const [showPenalesModal, setShowPenalesModal] = useState(false);
  const [penalesA, setPenalesA] = useState(0);
  const [penalesB, setPenalesB] = useState(0);
  const isFutbol = disciplinaName === 'Fútbol' || disciplinaName === 'Futsal';
  return (
    <>
      {isEndingMatch && !showWOModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="relative bg-background border-white/10 p-10 max-w-sm w-full text-center rounded-[3rem] animate-in zoom-in-95 shadow-[0_0_100px_rgba(244,63,94,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-secondary" />
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/20">
                <Trophy size={48} className="text-secondary animate-bounce" />
            </div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2 italic">Finalizar Partido</h2>
              <p className="text-sm font-black uppercase tracking-widest text-slate-500 italic">¿Cómo deseas finalizarlo?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" className="h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-xs" onClick={onCloseEnding}>Cancelar</Button>
              <Button className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 text-xs" onClick={onConfirmEnding}>Normal</Button>
              {isFutbol && (
                <Button className="h-14 col-span-2 rounded-2xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-200 font-black uppercase tracking-widest text-xs" onClick={() => { setPenalesA(0); setPenalesB(0); setShowPenalesModal(true); }}>Penales</Button>
              )}
              <Button className="h-14 col-span-2 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 font-black uppercase tracking-widest text-xs" onClick={() => setShowWOModal(true)}>W.O. (Walkover)</Button>
            </div>
          </Card>
        </div>
      )}

      {showWOModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="relative bg-background border-amber-500/30 p-10 max-w-sm w-full rounded-[3rem] animate-in zoom-in-95 shadow-[0_0_100px_rgba(251,146,60,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 to-orange-600" />
            <div className="w-20 h-20 rounded-3xl bg-amber-600/10 flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                <AlertCircle size={48} className="text-amber-400" />
            </div>
            <div className="text-center mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3 italic">Finalizar por W.O.</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">¿Quién gana por Walkover?</p>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase mb-2">
                  Equipo A
                </div>
                <div className="text-sm font-black text-white truncate mb-4">{match.equipo_a}</div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase mb-2">
                  Equipo B
                </div>
                <div className="text-sm font-black text-white truncate">{match.equipo_b}</div>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-sm"
                onClick={() => {
                  if (onConfirmWO) onConfirmWO('equipo_a');
                  setShowWOModal(false);
                }}
              >
                {match.equipo_a} Gana
              </Button>
              <Button
                className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-sm"
                onClick={() => {
                  if (onConfirmWO) onConfirmWO('equipo_b');
                  setShowWOModal(false);
                }}
              >
                {match.equipo_b} Gana
              </Button>
              <Button
                variant="ghost"
                className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-sm"
                onClick={() => setShowWOModal(false)}
              >
                Atrás
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showPenalesModal && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="relative bg-background border-violet-500/30 p-10 max-w-sm w-full rounded-[3rem] animate-in zoom-in-95 shadow-[0_0_100px_rgba(139,92,246,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 to-purple-600" />
            <div className="w-20 h-20 rounded-3xl bg-violet-600/10 flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
                <Trophy size={48} className="text-violet-400" />
            </div>
            <div className="text-center mb-8">
              <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3 italic">Tanda de Penales</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Ingresa el resultado de los penales</p>
            </div>
            <div className="space-y-4 mb-8">
              {(['a', 'b'] as const).map(side => (
                <div key={side} className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-white truncate max-w-[140px] uppercase">{getDisplayName(match, side)}</span>
                  <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-inner">
                    <button
                      onClick={() => side === 'a' ? setPenalesA(Math.max(0, penalesA - 1)) : setPenalesB(Math.max(0, penalesB - 1))}
                      className="w-10 h-10 rounded-lg border flex items-center justify-center text-white/25 hover:text-violet-400 hover:border-violet-400/30 transition-all active:scale-95 font-bold text-lg"
                    >−</button>
                    <span className="text-3xl font-black tabular-nums text-white min-w-[36px] text-center">{side === 'a' ? penalesA : penalesB}</span>
                    <button
                      onClick={() => side === 'a' ? setPenalesA(penalesA + 1) : setPenalesB(penalesB + 1)}
                      className="w-10 h-10 rounded-lg bg-violet-600/20 hover:bg-violet-500/30 flex items-center justify-center text-violet-300 transition-all active:scale-95 font-bold text-lg"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            {penalesA === penalesB && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 flex gap-3">
                <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/80 leading-relaxed">Los penales no pueden quedar empatados.</p>
              </div>
            )}
            <div className="space-y-3">
              <Button
                className="w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest text-sm disabled:opacity-40"
                disabled={penalesA === penalesB}
                onClick={() => {
                  if (onConfirmPenales) onConfirmPenales(penalesA, penalesB);
                  setShowPenalesModal(false);
                  onCloseEnding();
                }}
              >
                Finalizar con Penales
              </Button>
              <Button
                variant="ghost"
                className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-sm"
                onClick={() => setShowPenalesModal(false)}
              >
                Atrás
              </Button>
            </div>
          </Card>
        </div>
      )}

      {isEditingScore && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="bg-background border-white/10 p-10 max-w-sm w-full rounded-[3rem] shadow-2xl relative overflow-hidden">
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
                        className="w-12 h-12 rounded-[0.875rem] border flex items-center justify-center text-white/25 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
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
          <Card className="bg-background border-rose-500/20 p-10 max-w-sm w-full text-center rounded-[3rem] shadow-2xl relative overflow-hidden">
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

      {showReview && (
        <MatchReviewModal 
          match={match}
          eventos={eventos}
          onClose={onCloseReview}
          onConfirm={onConfirmReview}
          disciplinaName={disciplinaName}
        />
      )}
    </>
  );
};
