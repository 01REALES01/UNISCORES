"use client";

import { useEffect, useState } from "react";
import { Youtube, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchStreamProps {
    url: string;
    className?: string;
}

export function MatchStream({ url, className }: MatchStreamProps) {
    const [videoId, setVideoId] = useState<string | null>(null);

    useEffect(() => {
        if (!url) {
            setVideoId(null);
            return;
        }

        // Regex para capturar IDs de YouTube en varios formatos
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*$/;
        const match = url.match(regExp);

        if (match && match[2].length === 11) {
            setVideoId(match[2]);
        } else {
            setVideoId(null);
        }
    }, [url]);

    if (!videoId) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 text-center gap-3",
                className
            )}>
                <AlertCircle className="text-red-400 opacity-50" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    URL de streaming no válida o no soportada
                </p>
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white transition-all"
                >
                    <ExternalLink size={12} /> Abrir link externo
                </a>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500", className)}>
            <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title="Match Streaming"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                />
            </div>
            
            <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-600/20 text-red-500">
                        <Youtube size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                        Transmitiendo vía YouTube
                    </span>
                </div>
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all flex items-center gap-1.5"
                >
                    Ver en YouTube <ExternalLink size={11} />
                </a>
            </div>
        </div>
    );
}
