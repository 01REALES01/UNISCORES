"use client";

import { useEffect, useState } from "react";

type TimerProps = {
    detalle: {
        minuto_actual?: number;
        estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
        ultimo_update?: string; // Timestamp ISO de la última actualización
    };
};

export function PublicLiveTimer({ detalle }: TimerProps) {
    const [displayTime, setDisplayTime] = useState("");

    useEffect(() => {
        // Si no hay datos, mostrar 0'
        const minutoBase = detalle?.minuto_actual || 0;

        if (detalle?.estado_cronometro !== 'corriendo') {
            setDisplayTime(`${minutoBase}'`);
            return;
        }

        // Función para calcular tiempo actual interpolado
        const tick = () => {
            const now = new Date().getTime();
            const lastUpdate = detalle.ultimo_update ? new Date(detalle.ultimo_update).getTime() : now;

            // Diferencia en segundos desde que el admin guardó el minuto
            const diffSeconds = Math.floor((now - lastUpdate) / 1000);

            // Minuto actual + minutos extra si han pasado (aunque el admin debería actualizar)
            // Nota: Asumimos que el admin guarda el estado "limpio" del minuto (ej. minuto 15:00)
            // Pero como el update es lento (cada 60s), usamos updated_at para sumar el offset.

            // Ajuste: si el admin da update cada minuto, diffSeconds irá de 0 a 60.

            const secondsDisplay = diffSeconds % 60;
            const minutesExtra = Math.floor(diffSeconds / 60);
            const totalMinutes = minutoBase + minutesExtra;

            // Formatear MM:SS
            const ss = secondsDisplay.toString().padStart(2, '0');
            setDisplayTime(`${totalMinutes}:${ss}`);
        };

        // Iniciar loop local
        tick(); // Ejecutar ya
        const interval = setInterval(tick, 1000); // Repetir cada segundo

        return () => clearInterval(interval);
    }, [detalle]);

    return (
        <div className="flex items-center gap-1 font-mono font-bold animate-pulse">
            {detalle?.estado_cronometro === 'corriendo' && (
                <span className="relative flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
            )}
            <span className="text-xl tracking-widest">{displayTime}</span>
        </div>
    );
}
