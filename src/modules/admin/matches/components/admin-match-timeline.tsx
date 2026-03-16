import { Card, Badge } from "@/components/ui-primitives";
import { Trash2, TrendingUp, Clock } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";

interface AdminMatchTimelineProps {
  eventos: any[];
  match: any;
  onDeleteEvent: (event: any) => void;
  disciplinaName: string;
}

export const AdminMatchTimeline = ({
  eventos,
  match,
  onDeleteEvent,
  disciplinaName
}: AdminMatchTimelineProps) => {
  return (
    <Card variant="glass" className="h-[600px] flex flex-col p-0 border-white/10 bg-zinc-950/40 overflow-hidden relative shadow-2xl rounded-[2.5rem]">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      
      <div className="p-6 bg-white/[0.03] border-b border-white/5 font-black text-[10px] tracking-[0.2em] uppercase flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            <span>Bitácora Directo</span>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary border-0 font-black px-3 py-1">{eventos.length} EVENTOS</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative z-10">
        {eventos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 opacity-20">
                <Clock size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Esperando acciones...</p>
                <p className="text-[10px] font-bold mt-2">Los eventos registrados aparecerán aquí cronológicamente</p>
            </div>
        ) : (
            eventos.map((e, idx) => (
                <div 
                    key={e.id} 
                    className={cn(
                        "flex gap-4 p-4 rounded-[1.5rem] border transition-all duration-300 group relative overflow-hidden",
                        e.equipo === 'equipo_a' ? "bg-white/[0.02] border-white/5" : "bg-white/[0.04] border-white/10"
                    )}
                >
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                    
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center font-black text-[11px] text-primary shrink-0 shadow-inner">
                        {e.minuto}'
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <p className="font-black text-xs uppercase tracking-tight text-white/90">
                                {e.tipo_evento.replace(/_/g, ' ')}
                            </p>
                            {e.periodo && (
                                <span className="text-[9px] font-black bg-white/10 px-1.5 rounded text-white/40 uppercase">P{e.periodo}</span>
                            )}
                        </div>
                        <p className="text-[10px] font-bold text-white/40 truncate mt-0.5">
                            {e.jugadores?.nombre || (e.equipo === 'equipo_a' ? getDisplayName(match, 'a') : getDisplayName(match, 'b'))}
                        </p>
                    </div>

                    <div className="flex items-center">
                        <button 
                            onClick={() => onDeleteEvent(e)} 
                            className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg"
                            title="Eliminar Evento"
                        >
                            <Trash2 size={14} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </Card>
  );
};
