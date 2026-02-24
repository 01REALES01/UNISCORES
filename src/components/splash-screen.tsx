"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * SplashScreen - Animación de bienvenida para usuarios nuevos
 * 
 * Usa 3 imágenes como fotogramas clave:
 *   Frame 1: Logo "60 AÑOS UNINORTE" original
 *   Frame 2: El "6" inclinado como raqueta (sin cuerdas)
 *   Frame 3: Raqueta completa golpeando el "0" con chispas
 * 
 * Secuencia: Aparición → Transformación → Impacto → Salida
 * Duración total: ~3.2 segundos
 * Solo se muestra 1 vez (localStorage)
 */

const SPLASH_KEY = "uninorte_splash_seen";
const TOTAL_DURATION = 3400; // ms total antes de dismiss

export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
    const [phase, setPhase] = useState(0); // 0=mount, 1=frame1, 2=frame2, 3=frame3, 4=exit
    const [shouldShow, setShouldShow] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    const dismiss = useCallback(() => {
        if (dismissed) return;
        setDismissed(true);
        setPhase(4);
        try {
            localStorage.setItem(SPLASH_KEY, "true");
        } catch { }
        setTimeout(() => {
            setShouldShow(false);
            onComplete?.();
        }, 600);
    }, [dismissed, onComplete]);

    useEffect(() => {
        // Check if user has seen splash before
        try {
            if (localStorage.getItem(SPLASH_KEY) === "true") {
                setShouldShow(false);
                onComplete?.();
                return;
            }
        } catch { }

        // Animation timeline
        const timers: NodeJS.Timeout[] = [];

        // Phase 1: Logo appears (frame 1)
        timers.push(setTimeout(() => setPhase(1), 100));

        // Phase 2: Racket tilt (frame 2)
        timers.push(setTimeout(() => setPhase(2), 900));

        // Phase 3: Impact! (frame 3)
        timers.push(setTimeout(() => setPhase(3), 1700));

        // Phase 4: Exit
        timers.push(setTimeout(() => dismiss(), TOTAL_DURATION));

        return () => timers.forEach(clearTimeout);
    }, [dismiss, onComplete]);

    if (!shouldShow) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-600 ${phase === 4 ? "opacity-0 scale-110" : "opacity-100"
                }`}
            style={{ backgroundColor: "#3a3531" }}
            onClick={dismiss}
        >
            {/* Background glow effect */}
            <div
                className={`absolute inset-0 transition-opacity duration-300 ${phase === 3 ? "opacity-100" : "opacity-0"
                    }`}
                style={{
                    background: "radial-gradient(circle at 55% 45%, rgba(255,192,0,0.15) 0%, transparent 60%)",
                }}
            />

            {/* Impact flash */}
            <div
                className={`absolute inset-0 bg-white transition-opacity pointer-events-none ${phase === 3 ? "splash-flash" : "opacity-0"
                    }`}
            />

            {/* Container for frames */}
            <div
                className={`relative w-[280px] h-[340px] sm:w-[340px] sm:h-[420px] ${phase === 3 ? "splash-shake" : ""
                    }`}
            >
                {/* Frame 1: Original Logo */}
                <img
                    src="/splash/frame1.png"
                    alt="60 Años Uninorte"
                    className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ease-out ${phase >= 1 && phase < 2
                            ? "opacity-100 scale-100"
                            : phase === 0
                                ? "opacity-0 scale-90"
                                : "opacity-0 scale-105"
                        }`}
                    draggable={false}
                />

                {/* Frame 2: Racket Tilt */}
                <img
                    src="/splash/frame2.png"
                    alt="60 Años - Raqueta"
                    className={`absolute inset-0 w-full h-full object-contain transition-all duration-600 ease-out ${phase === 2
                            ? "opacity-100 scale-100 rotate-0"
                            : phase < 2
                                ? "opacity-0 scale-95 rotate-3"
                                : "opacity-0 scale-105 -rotate-2"
                        }`}
                    draggable={false}
                />

                {/* Frame 3: Impact with sparks */}
                <img
                    src="/splash/frame3.png"
                    alt="60 Años - Impacto"
                    className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ease-out ${phase >= 3 && phase < 4
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-95"
                        }`}
                    draggable={false}
                />

                {/* Particle ring effect on impact */}
                <div
                    className={`absolute inset-0 flex items-center justify-center pointer-events-none ${phase === 3 ? "splash-ring" : "opacity-0"
                        }`}
                >
                    <div
                        className="w-16 h-16 rounded-full border-2 border-yellow-400/60"
                        style={{
                            transform: "translate(30%, -5%)",
                        }}
                    />
                </div>
            </div>

            {/* UNINORTE text enhancement */}
            <div
                className={`absolute bottom-12 sm:bottom-16 text-center transition-all duration-500 ${phase >= 1 && phase < 4
                        ? "opacity-100 translate-y-0"
                        : phase === 0
                            ? "opacity-0 translate-y-4"
                            : "opacity-0 -translate-y-4"
                    }`}
            >
                <p className="text-white/40 text-[11px] font-medium tracking-[0.3em] uppercase">
                    Olimpiadas Universitarias 2026
                </p>
            </div>

            {/* Skip button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    dismiss();
                }}
                className={`absolute bottom-6 right-6 text-white/25 hover:text-white/60 text-[10px] 
          font-medium tracking-wider uppercase transition-all duration-300 
          px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 
          backdrop-blur-sm ${phase >= 1 && phase < 4 ? "opacity-100" : "opacity-0"}`}
            >
                Saltar
            </button>
        </div>
    );
}
