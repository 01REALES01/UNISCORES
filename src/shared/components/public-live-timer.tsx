"use client";

import { cn } from "@/lib/utils";

type TimerProps = {
    detalle: {
        estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
    };
    deporte?: string;
};

export function PublicLiveTimer({ detalle }: TimerProps) {
    const isActive = detalle?.estado_cronometro !== 'detenido';

    return (
        <div className={cn(
            "flex items-center gap-2 transition-all duration-500",
            isActive ? "text-rose-500" : "text-slate-500/40"
        )}>
            {isActive ? (
                <>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400/80 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"></span>
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
