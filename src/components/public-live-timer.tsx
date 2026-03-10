"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getPeriodDuration, isCountdownSport } from "@/lib/sport-scoring";

/** Deportes que no usan cronómetro — solo muestran estado simple */
const SPORTS_WITHOUT_TIMER = ['Ajedrez'];

type TimerProps = {
    detalle: {
        minuto_actual?: number;
        estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
        ultimo_update?: string;
    };
    deporte?: string;
};

export function PublicLiveTimer({ detalle, deporte = "" }: TimerProps) {
    const [displayTime, setDisplayTime] = useState("");

    // Para deportes sin cronómetro (Ajedrez) mostramos solo indicador de estado
    if (SPORTS_WITHOUT_TIMER.includes(deporte)) {
        const isRunning = detalle?.estado_cronometro === 'corriendo';
        return (
            <div className={cn(
                "flex items-center gap-2 transition-all duration-500",
                isRunning ? "text-rose-500" : "text-slate-500/40"
            )}>
                {isRunning ? (
                    <>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400/80 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"></span>
                        </span>
                        <span className="font-mono font-black text-sm tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]">
                            LIVE
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

    useEffect(() => {
        // Si no hay datos, mostrar 0' o duración inicial
        const isCountdown = isCountdownSport(deporte);
        const minutoBase = detalle?.minuto_actual ?? (isCountdown ? getPeriodDuration(deporte) : 0);

        if (detalle?.estado_cronometro !== 'corriendo') {
            setDisplayTime(`${minutoBase}:00`);
            return;
        }

        // Función para calcular tiempo actual interpolado
        const tick = () => {
            const now = new Date().getTime();
            const lastUpdate = detalle.ultimo_update ? new Date(detalle.ultimo_update).getTime() : now;

            // Diferencia en segundos desde que el admin guardó el minuto
            const diffSeconds = Math.floor((now - lastUpdate) / 1000);

            let totalSeconds = 0;
            if (isCountdown) {
                // Cuenta regresiva
                const baseSeconds = minutoBase * 60;
                totalSeconds = Math.max(0, baseSeconds - diffSeconds);
            } else {
                // Cuenta progresiva
                totalSeconds = (minutoBase * 60) + diffSeconds;
            }

            const mm = Math.floor(totalSeconds / 60);
            const ss = (totalSeconds % 60).toString().padStart(2, '0');

            setDisplayTime(`${mm}:${ss}`);
        };

        // Iniciar loop local
        tick(); // Ejecutar ya
        const interval = setInterval(tick, 1000); // Repetir cada segundo

        return () => clearInterval(interval);
    }, [detalle]);

    return (
        <div className={cn(
            "flex items-center gap-2.5 transition-all duration-500",
            detalle?.estado_cronometro === 'corriendo'
                ? "text-rose-500"
                : "text-slate-500/40"
        )}>
            {detalle?.estado_cronometro === 'corriendo' ? (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400/80 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"></span>
                </span>
            ) : (
                <div className="flex h-2 w-2 items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500/40"></span>
                </div>
            )}
            <span className={cn(
                "font-mono font-black text-base tracking-[0.1em] tabular-nums leading-none mt-0.5 transition-all duration-500",
                detalle?.estado_cronometro === 'corriendo' && "underline-offset-4 decoration-rose-500/30 drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]"
            )}>
                {displayTime || "00:00"}
            </span>
        </div>
    );
}
