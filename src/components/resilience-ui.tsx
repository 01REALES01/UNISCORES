"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Button } from "@/shared/components/ui-primitives";
import { SafeBackButton } from "@/shared/components/safe-back-button";

interface ResilienceUIProps {
    title?: string;
    description?: string;
    onRetry: () => void;
    backFallback?: string;
    retryLabel?: string;
}

export function ResilienceUI({
    title = "Conexión Lenta",
    description = "La información está tardando en cargar. Esto puede deberse a tu conexión o a un retraso en el servidor.",
    onRetry,
    backFallback = "/clasificacion",
    retryLabel = "REINTENTAR CARGA"
}: ResilienceUIProps) {
    return (
        <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-6 text-center">
            {/* Ambient background effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center w-full max-w-sm"
            >
                {/* Icon Hub */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/10 flex items-center justify-center mb-8 border border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative">
                    <Activity className="text-amber-500 animate-pulse" size={40} />
                    <div className="absolute inset-0 rounded-full border border-amber-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                </div>

                {/* Text Content */}
                <h1 className="text-2xl sm:text-3xl font-black mb-3 font-display uppercase tracking-[0.2em] text-white/90 leading-tight">
                    {title}
                </h1>
                
                <p className="text-white/40 mb-10 font-bold italic text-sm leading-relaxed px-4">
                    {description}
                </p>
                
                {/* Action Hub - Mobile First (Column on small, Row on larger) */}
                <div className="flex flex-col gap-4 w-full px-2">
                    <Button 
                        onClick={onRetry}
                        className="rounded-2xl h-14 bg-amber-500 text-black font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-[0_10px_40px_rgba(245,158,11,0.2)] w-full border-none"
                    >
                        {retryLabel}
                    </Button>
                    
                    <SafeBackButton 
                        fallback={backFallback} 
                        variant="ghost" 
                        className="h-14 font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                        label="Regresar"
                    />
                </div>

                {/* Footer branding */}
                <div className="mt-16 opacity-10 flex items-center gap-2">
                    <div className="h-px w-8 bg-white" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Olimpiadas 2026</span>
                    <div className="h-px w-8 bg-white" />
                </div>
            </motion.div>
        </div>
    );
}
