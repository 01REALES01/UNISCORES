"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Trophy, Zap } from "lucide-react";

export default function OfflinePage() {
    const [isRetrying, setIsRetrying] = useState(false);
    const [dots, setDots] = useState("");

    // Animate dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? "" : prev + ".");
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Auto-retry every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (navigator.onLine) {
                window.location.href = "/";
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Listen for online event
    useEffect(() => {
        const handleOnline = () => {
            window.location.href = "/";
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, []);

    const handleRetry = () => {
        setIsRetrying(true);
        setTimeout(() => {
            if (navigator.onLine) {
                window.location.href = "/";
            } else {
                setIsRetrying(false);
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center max-w-sm mx-auto">
                {/* Animated icon */}
                <div className="relative mb-8">
                    <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-white/5 flex items-center justify-center backdrop-blur-sm">
                        <WifiOff size={44} className="text-red-400 animate-pulse" />
                    </div>
                    {/* Orbiting dots */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: "8s" }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-red-500/40 rounded-full" />
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 bg-amber-500/40 rounded-full" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-black tracking-tight mb-2">
                    <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                        Fuera de cobertura
                    </span>
                </h1>

                <p className="text-sm text-slate-500 font-medium mb-2">
                    Parece que te desconectaste del campo de juego{dots}
                </p>

                <p className="text-xs text-slate-600 mb-8">
                    Intentando reconexión automática. Verifica tu conexión a internet para volver a la acción.
                </p>

                {/* Retry button */}
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm rounded-2xl transition-all duration-300 shadow-xl shadow-red-500/20 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                >
                    <RefreshCw size={16} className={isRetrying ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                    {isRetrying ? "Reintentando..." : "Reintentar conexión"}
                </button>

                {/* Decorative bottom section */}
                <div className="mt-12 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-center gap-3 text-slate-600">
                        <Trophy size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Olimpiadas Uninorte 2026</span>
                        <Zap size={14} />
                    </div>
                </div>
            </div>
        </div>
    );
}
