"use client";

import { cn } from "@/lib/utils";

type TimerProps = {
    detalle: {
        estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
        fase_futbol?: 'primer_tiempo' | 'entretiempo' | 'segundo_tiempo';
    };
    deporte?: string;
};

const FASE_CONFIG = {
    primer_tiempo:  { label: '1° Tiempo',    color: 'text-rose-500',   dot: 'bg-rose-500',   shadow: 'rgba(244,63,94,0.8)',   ping: 'bg-rose-400/80' },
    entretiempo:    { label: 'Entretiempo',   color: 'text-amber-400',  dot: 'bg-amber-400',  shadow: 'rgba(251,191,36,0.8)',  ping: 'bg-amber-400/80' },
    segundo_tiempo: { label: '2° Tiempo',     color: 'text-rose-500',   dot: 'bg-rose-500',   shadow: 'rgba(244,63,94,0.8)',   ping: 'bg-rose-400/80' },
} as const;

export function PublicLiveTimer({ detalle }: TimerProps) {
    const fase = detalle?.fase_futbol;
    const isActive = detalle?.estado_cronometro !== 'detenido';

    if (fase && fase in FASE_CONFIG) {
        const cfg = FASE_CONFIG[fase];
        return (
            <div className={cn("flex items-center gap-2 transition-all duration-500", cfg.color)}>
                <span className="relative flex h-2 w-2">
                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", cfg.ping)} />
                    <span className={cn("relative inline-flex rounded-full h-2 w-2", cfg.dot)} style={{ boxShadow: `0 0 12px ${cfg.shadow}` }} />
                </span>
                <span className="font-mono font-black text-sm tracking-[0.15em] uppercase" style={{ filter: `drop-shadow(0 0 10px ${cfg.shadow})` }}>
                    {cfg.label}
                </span>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center gap-2 transition-all duration-500",
            isActive ? "text-rose-500" : "text-slate-500/40"
        )}>
            {isActive ? (
                <>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400/80 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                    </span>
                    <span className="font-mono font-black text-sm tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]">
                        EN CURSO
                    </span>
                </>
            ) : (
                <span className="font-mono font-black text-sm tracking-[0.15em] text-slate-600 uppercase select-none">
                    —
                </span>
            )}
        </div>
    );
}
