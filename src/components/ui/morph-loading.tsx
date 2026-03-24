"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Home, RefreshCcw } from "lucide-react"

interface UniqueLoadingProps {
    variant?: "morph"
    size?: "sm" | "md" | "lg"
    className?: string
    showFallback?: boolean
}

export default function UniqueLoading({
    variant = "morph",
    size = "md",
    className,
    showFallback = true,
}: UniqueLoadingProps) {
    const [isSlow, setIsSlow] = useState(false)

    useEffect(() => {
        if (!showFallback) return;
        const timer = setTimeout(() => setIsSlow(true), 6000)
        return () => clearTimeout(timer)
    }, [showFallback])

    const containerSizes = {
        sm: "w-16 h-16",
        md: "w-24 h-24",
        lg: "w-32 h-32",
    }

    if (variant === "morph") {
        return (
            <div className="flex flex-col items-center gap-8">
                <div className={cn("relative", containerSizes[size], className)}>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="absolute w-4 h-4 bg-black dark:bg-white"
                                style={{
                                    animation: `morph-${i} 2s infinite ease-in-out`,
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </div>
                </div>

                {isSlow && (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="text-center px-6">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                                ¿Tarda demasiado?
                            </p>
                            <p className="text-[10px] text-white/20">La conexión parece inestable</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all active:scale-95"
                            >
                                <RefreshCcw size={12} /> Reintentar
                            </button>
                            <Link 
                                href="/" 
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase text-red-500 hover:bg-red-500/20 transition-all active:scale-95"
                            >
                                <Home size={12} /> Ir a Inicio
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return null
}
