import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Activity, Radio } from "lucide-react";
import { Badge } from "@/components/ui-primitives";
import { formatUltimaEdicion } from "@/lib/audit-helpers";

interface AdminMatchHeaderProps {
  match: any;
  disciplinaName: string;
  bgGradient: string;
  activeEditors: any[];
}

export const AdminMatchHeader = ({ match, disciplinaName, bgGradient, activeEditors }: AdminMatchHeaderProps) => {
  const auditInfo = formatUltimaEdicion(match.marcador_detalle);
  const isLive = match.estado === 'en_curso';

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-1000", bgGradient, "opacity-20")} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0816]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-6 pb-4">
        {/* Top Nav */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/partidos">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm">
                <ArrowLeft size={13} /> Panel
              </button>
            </Link>
            <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] backdrop-blur-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{disciplinaName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLive ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-[10px] font-black text-rose-400 tracking-[0.2em] uppercase">En Vivo</span>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-sm">
                {match.estado === 'programado' ? 'Programado' : 'Finalizado'}
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
