import { SafeBackButton } from "@/shared/components/safe-back-button";
import { cn } from "@/lib/utils";
import { Activity, Trophy, RefreshCw, Loader2 } from "lucide-react";
import { formatUltimaEdicionAdmin, stampAudit } from "@/lib/audit-helpers";
import { getMatchResult } from "@/modules/quiniela/helpers";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalculateTotals } from "@/lib/sport-scoring";
import { toast } from "sonner";

interface AdminMatchHeaderProps {
  match: any;
  disciplinaName: string;
  bgGradient: string;
  activeEditors: any[];
  onRefresh?: () => void;
}

export const AdminMatchHeader = ({ match, disciplinaName, bgGradient, activeEditors, onRefresh }: AdminMatchHeaderProps) => {
  const [recalculating, setRecalculating] = useState(false);
  const auditInfo = formatUltimaEdicionAdmin(match);
  const isLive = match.estado === 'en_curso';

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const sport = match.disciplinas?.name || '';
      let newDetalle = { ...(match.marcador_detalle || {}) };
      
      // Force recalculation via service logic
      newDetalle = recalculateTotals(sport, newDetalle);
      
      // Update DB
      const { error } = await supabase
        .from('partidos')
        .update({ 
          marcador_detalle: stampAudit(newDetalle, { 
            id: 'system',
            full_name: 'Admin System (Recalc)',
            email: 'system@olympics.com',
            roles: ['admin']
          } as any) 
        })
        .eq('id', match.id);

      if (error) throw error;
      toast.success('Resultado recalculado y sincronizado');
      onRefresh?.();
    } catch (err: any) {
      toast.error('Error al recalcular: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-1000", bgGradient, "opacity-20")} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0816]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-6 pb-4">
        {/* Top Nav */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <SafeBackButton fallback="/admin/partidos" variant="admin" size="sm" label="Panel" />
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] backdrop-blur-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{disciplinaName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Recalculate Button */}
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              title="Forzar recalculación de marcador y ganador"
            >
              {recalculating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Recalcular
            </button>

            {isLive ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-[10px] font-black text-rose-400 tracking-[0.2em] uppercase">En Curso</span>
              </div>
            ) : match.estado === 'finalizado' ? (
              (() => {
                const result = getMatchResult(match);
                const winnerName = result === 'A' ? match.equipo_a : result === 'B' ? match.equipo_b : null;
                return (
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm flex items-center gap-2">
                      <Trophy size={12} /> Finalizado
                    </div>
                    {winnerName && (
                      <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                        Victoria: {winnerName}
                      </div>
                    )}
                    {result === 'DRAW' && (
                      <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                        Empate
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                Programado
              </div>
            )}
          </div>
        </div>

        {/* Audit & Presence */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {auditInfo ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                <Activity size={14} className="text-primary/60" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/25 block">Última edición</span>
                <span className="text-[10px] font-bold text-white/50">
                  <span className="text-primary/70">{auditInfo.nombre}</span> · {auditInfo.relativo}
                </span>
              </div>
            </div>
          ) : <div />}

          {activeEditors.length > 0 && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 backdrop-blur-sm">
              <div className="flex -space-x-2">
                {activeEditors.slice(0, 3).map((editor: any, i: number) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-emerald-500/20 flex items-center justify-center text-[9px] font-black text-emerald-400/70">
                    {editor.user_name?.substring(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-black text-emerald-400/60">{activeEditors.length} editores</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
