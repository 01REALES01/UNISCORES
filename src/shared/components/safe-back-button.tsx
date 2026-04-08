"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeBackButtonProps {
    fallback?: string;
    className?: string;
    label?: string;
}

/**
 * SafeBackButton Component
 * 
 * Provides a robust "go back" functionality. 
 * If there is browser history, it uses router.back() to preserve context/filters.
 * If there is no history (direct link), it falls back to a logical parent path.
 */
export function SafeBackButton({ 
    fallback = "/", 
    className, 
    label = "Volver" 
}: SafeBackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        // En Next.js / Entornos de Navegador, window.history.length > 1 
        // suele indicar que hay una página previa a la cual regresar.
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(fallback);
        }
    };

    return (
        <button
            onClick={handleBack}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white group shadow-xl",
                className
            )}
        >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            {label && <span>{label}</span>}
        </button>
    );
}
