"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeBackButtonProps {
    fallback?: string;
    className?: string;
    label?: string;
    variant?: "default" | "ghost" | "admin";
    size?: "sm" | "md";
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
    label = "Volver",
    variant = "default",
    size = "md"
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

    const isSm = size === "sm";

    return (
        <button
            onClick={handleBack}
            className={cn(
                "flex items-center gap-2 group transition-all font-black uppercase tracking-widest active:scale-95",
                variant === "default" && "px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white shadow-xl",
                variant === "ghost" && "text-white/30 hover:text-white",
                variant === "admin" && "px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300",
                isSm ? "text-[9px] px-3 py-1.5" : "text-[10px] sm:text-xs",
                className
            )}
        >
            <ArrowLeft size={isSm ? 14 : 16} className="group-hover:-translate-x-0.5 transition-transform" />
            {label && <span>{label}</span>}
        </button>
    );
}

