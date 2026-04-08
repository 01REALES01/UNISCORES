"use client";

import { X, CheckCircle, AlertCircle } from "lucide-react";
import { Card, Button } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import { getCurrentScore } from "@/lib/sport-scoring";

interface MatchReviewModalProps {
  match: any;
  eventos: any[];
  onClose: () => void;
  onConfirm: () => void;
  disciplinaName: string;
}

export const MatchReviewModal = ({
  match,
  eventos,
  onClose,
  onConfirm,
  disciplinaName
}: MatchReviewModalProps) => {
  if (!match) return null;

  // Filtrar eventos de tarjetas
  const tarjetas = eventos.filter(e => 
    ['tarjeta_amarilla', 'tarjeta_roja'].includes(e.tipo_evento)
  );

  const tarjetasEquipoA = tarjetas.filter(t => t.equipo === 'equipo_a');
  const tarjetasEquipoB = tarjetas.filter(t => t.equipo === 'equipo_b');

  const amarillasA = tarjetasEquipoA.filter(t => t.tipo_evento === 'tarjeta_amarilla');
  const rojasA = tarjetasEquipoA.filter(t => t.tipo_evento === 'tarjeta_roja');
  const amarillasB = tarjetasEquipoB.filter(t => t.tipo_evento === 'tarjeta_amarilla');
  const rojasB = tarjetasEquipoB.filter(t => t.tipo_evento === 'tarjeta_roja');

  // Obtener marcador final
  const { scoreA, scoreB } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

  const equipoAName = getDisplayName(match, 'a');
  const equipoBName = getDisplayName(match, 'b');

  return (
    <div className="fixed inset-0 z-[102] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
      <Card className="relative bg-gradient-to-b from-[#0a0805] to-[#0a0816] border-white/10 p-0 max-w-2xl w-full rounded-[2.5rem] animate-in zoom-in-95 shadow-[0_0_100px_rgba(244,63,94,0.2)] overflow-hidden my-8">
        {/* Header Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-all text-white/50 hover:text-white z-10"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="relative p-8 sm:p-10">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-2 italic">
              Revisión del Partido
            </h2>
            <p className="text-sm font-black uppercase tracking-widest text-slate-400 italic">
              Verifica los detalles finales antes de confirmar
            </p>
          </div>

          {/* Marcador Final Section */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-6 text-center">
              Marcador Final
            </h3>
            <div className="flex items-center justify-between gap-4">
              {/* Equipo A */}
              <div className="flex-1 text-center">
                <p className="text-white/70 font-bold text-sm mb-2 truncate">{equipoAName}</p>
                <div className="text-5xl sm:text-6xl font-black text-white text-center drop-shadow-lg">
                  {scoreA}
                </div>
              </div>

              {/* Divisor */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-0.5 h-8 bg-white/20" />
                <span className="text-xs font-black text-white/40 uppercase tracking-wider">VS</span>
                <div className="w-0.5 h-8 bg-white/20" />
              </div>

              {/* Equipo B */}
              <div className="flex-1 text-center">
                <p className="text-white/70 font-bold text-sm mb-2 truncate">{equipoBName}</p>
                <div className="text-5xl sm:text-6xl font-black text-white text-center drop-shadow-lg">
                  {scoreB}
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas Section */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {/* Equipo A Tarjetas */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-4 text-center">
                {equipoAName}
              </h3>

              {/* Tarjetas Amarillas */}
              {amarillasA.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🟨</span>
                    <span className="text-xs font-bold text-yellow-300 uppercase tracking-wide">
                      {amarillasA.length} {amarillasA.length === 1 ? 'Amarilla' : 'Amarillas'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {amarillasA.map((tarjeta, idx) => (
                      <div key={idx} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2 text-xs">
                        <p className="text-yellow-300 font-bold truncate">
                          {tarjeta.jugadores?.nombre || `Jugador #${tarjeta.jugador_id}`}
                        </p>
                        <p className="text-yellow-200/50 text-[10px]">
                          Min. ~{tarjeta.minuto || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarjetas Rojas */}
              {rojasA.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🟥</span>
                    <span className="text-xs font-bold text-red-300 uppercase tracking-wide">
                      {rojasA.length} {rojasA.length === 1 ? 'Roja' : 'Rojas'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rojasA.map((tarjeta, idx) => (
                      <div key={idx} className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 text-xs">
                        <p className="text-red-300 font-bold truncate">
                          {tarjeta.jugadores?.nombre || `Jugador #${tarjeta.jugador_id}`}
                        </p>
                        <p className="text-red-200/50 text-[10px]">
                          Min. ~{tarjeta.minuto || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {amarillasA.length === 0 && rojasA.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4 italic">
                  Sin tarjetas registradas
                </p>
              )}
            </div>

            {/* Equipo B Tarjetas */}
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 mb-4 text-center">
                {equipoBName}
              </h3>

              {/* Tarjetas Amarillas */}
              {amarillasB.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🟨</span>
                    <span className="text-xs font-bold text-yellow-300 uppercase tracking-wide">
                      {amarillasB.length} {amarillasB.length === 1 ? 'Amarilla' : 'Amarillas'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {amarillasB.map((tarjeta, idx) => (
                      <div key={idx} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2 text-xs">
                        <p className="text-yellow-300 font-bold truncate">
                          {tarjeta.jugadores?.nombre || `Jugador #${tarjeta.jugador_id}`}
                        </p>
                        <p className="text-yellow-200/50 text-[10px]">
                          Min. ~{tarjeta.minuto || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarjetas Rojas */}
              {rojasB.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🟥</span>
                    <span className="text-xs font-bold text-red-300 uppercase tracking-wide">
                      {rojasB.length} {rojasB.length === 1 ? 'Roja' : 'Rojas'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rojasB.map((tarjeta, idx) => (
                      <div key={idx} className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 text-xs">
                        <p className="text-red-300 font-bold truncate">
                          {tarjeta.jugadores?.nombre || `Jugador #${tarjeta.jugador_id}`}
                        </p>
                        <p className="text-red-200/50 text-[10px]">
                          Min. ~{tarjeta.minuto || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {amarillasB.length === 0 && rojasB.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4 italic">
                  Sin tarjetas registradas
                </p>
              )}
            </div>
          </div>

          {/* Disclaimer for async matches */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 mb-8 flex gap-3">
            <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200">
              Esta es la revisión final del partido asincrónico. Verifica que todos los datos sean correctos antes de confirmar.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
              onClick={onClose}
            >
              Volver a Editar
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 text-xs transition-all"
              onClick={onConfirm}
            >
              ✓ Confirmar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
