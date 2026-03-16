import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, Activity } from "lucide-react";
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

  return (
    <div className="relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-1000", bgGradient, "opacity-40")} />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-4">
        {/* Top Nav */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Link href="/admin/partidos">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all">
                <ArrowLeft size={14} /> Panel
              </button>
            </Link>
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black text-[10px] tracking-widest px-3 py-1">
              {disciplinaName}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {match.estado === 'en_vivo' ? (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black tracking-[0.2em] uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                On Air
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-black tracking-[0.2em] uppercase">
                {match.estado}
              </div>
            )}
          </div>
        </div>

        {/* Operational Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          {auditInfo ? (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Activity size={16} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sync Status</span>
                <span className="text-[11px] font-bold text-white/70">
                  Por <span className="text-primary">{auditInfo.nombre}</span> · {auditInfo.relativo}
                </span>
              </div>
            </div>
          ) : <div />}

          {activeEditors.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex -space-x-2">
                {activeEditors.slice(0, 3).map((editor, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-emerald-500/30 flex items-center justify-center text-[10px] font-black text-emerald-400">
                    {editor.user_name?.substring(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-black text-emerald-400">{activeEditors.length} Editores</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
