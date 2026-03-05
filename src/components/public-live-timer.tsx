"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getPeriodDuration, isCountdownSport } from "@/lib/sport-scoring";

type TimerProps = {
    detalle: {
        minuto_actual?: number;
        estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
        ultimo_update?: string; // Timestamp ISO de la última actualización
    };
    deporte?: string;
};

export function PublicLiveTimer({ detalle, deporte = "" }: TimerProps) {
    const [displayTime, setDisplayTime] = useState("");

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
            "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300",
            detalle?.estado_cronometro === 'corriendo'
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "bg-white/5 border-white/10 text-slate-400"
        )}>
            {detalle?.estado_cronometro === 'corriendo' ? (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
            ) : (
                <div className="flex h-2 w-2 items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                </div>
            )}
            <span className="font-mono font-bold text-sm tracking-widest tabular-nums leading-none mt-0.5">
                {displayTime || "00:00"}
            </span>
        </div>
    );
}
