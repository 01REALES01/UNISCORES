"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Instagram, ExternalLink, Heart, MessageCircle, Loader2 } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract the post shortcode from any Instagram URL */
function extractInstagramId(url: string): string | null {
    // Matches /p/SHORTCODE, /reel/SHORTCODE, /tv/SHORTCODE
    const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
}

/** Ensure the Instagram embed script is loaded */
function loadInstagramScript(): Promise<void> {
    return new Promise((resolve) => {
        if ((window as any).instgrm) {
            resolve();
            return;
        }

        // Check if script is already in the DOM
        if (document.querySelector('script[src*="instagram.com/embed.js"]')) {
            const check = setInterval(() => {
                if ((window as any).instgrm) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://www.instagram.com/embed.js";
        script.async = true;
        script.onload = () => {
            const check = setInterval(() => {
                if ((window as any).instgrm) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        };
        document.body.appendChild(script);
    });
}

// ─── Instagram Embed Card ───────────────────────────────────────────────────

interface InstagramEmbedProps {
    url: string;
    /** "card" = compact preview in lists, "full" = expanded in detail pages, "inline" = bare embed for wrapping */
    variant?: "card" | "full" | "inline";
    className?: string;
}

export function InstagramEmbed({ url, variant = "full", className }: InstagramEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const shortcode = extractInstagramId(url);

    useEffect(() => {
        if (!shortcode || !containerRef.current) return;

        let cancelled = false;

        const embedPost = async () => {
            try {
                await loadInstagramScript();
                if (cancelled) return;

                // Give the blockquote a moment to render
                requestAnimationFrame(() => {
                    if ((window as any).instgrm?.Embeds) {
                        (window as any).instgrm.Embeds.process(containerRef.current);
                    }
                    // Wait for iframe to appear
                    setTimeout(() => {
                        if (!cancelled) setLoaded(true);
                    }, 1500);
                });
            } catch {
                if (!cancelled) setError(true);
            }
        };

        embedPost();

        return () => { cancelled = true; };
    }, [shortcode]);

    if (!shortcode) {
        return <InstagramFallbackCard url={url} className={className} />;
    }

    if (variant === "card") {
        return <InstagramCardPreview url={url} shortcode={shortcode} className={className} />;
    }

    // Inline: bare embed with loading/error, no wrapper chrome
    if (variant === "inline") {
        return (
            <div className={cn("relative min-h-[400px]", className)}>
                {!loaded && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 rounded-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
                            <Instagram size={24} className="text-white" />
                        </div>
                        <p className="mt-3 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Cargando post...</p>
                        <Loader2 size={12} className="mt-2 animate-spin text-white/20" />
                    </div>
                )}
                {error && (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Instagram size={28} className="text-white/20 mb-3" />
                        <p className="text-sm font-black text-white/40 mb-2">No se pudo cargar</p>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Ver en Instagram →</a>
                    </div>
                )}
                <div
                    ref={containerRef}
                    className={cn(
                        "flex justify-center px-2 py-4 transition-opacity duration-700 [&_iframe]:!rounded-2xl [&_iframe]:!border-0 [&_iframe]:!shadow-none [&_.instagram-media]:!shadow-none [&_.instagram-media]:!border-0 [&_.instagram-media]:!bg-transparent [&_.instagram-media]:!mx-auto [&_.instagram-media]:!max-w-full",
                        loaded ? "opacity-100" : "opacity-0"
                    )}
                >
                    <blockquote
                        className="instagram-media"
                        data-instgrm-captioned
                        data-instgrm-permalink={`https://www.instagram.com/p/${shortcode}/`}
                        data-instgrm-version="14"
                        style={{ background: "transparent", border: 0, margin: "0 auto", maxWidth: "540px", width: "100%", minWidth: "326px" }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative group", className)}>
            {/* Ambient Glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-orange-500/10 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 hover:border-white/20 hover:shadow-[0_20px_60px_-15px_rgba(139,92,246,0.15)]">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/20">
                            <Instagram size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Instagram</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Post Oficial</p>
                        </div>
                    </div>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                    >
                        Ver en IG <ExternalLink size={10} />
                    </a>
                </div>

                {/* Embed Container */}
                <div className="relative min-h-[400px]">
                    {/* Loading State */}
                    {!loaded && !error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
                                    <Instagram size={28} className="text-white" />
                                </div>
                            </div>
                            <p className="mt-4 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Cargando post...</p>
                            <Loader2 size={14} className="mt-2 animate-spin text-white/20" />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                <Instagram size={28} className="text-white/20" />
                            </div>
                            <p className="text-sm font-black text-white/40 mb-2">No se pudo cargar el post</p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-violet-400 uppercase tracking-widest hover:text-violet-300 transition-colors"
                            >
                                Ver directamente en Instagram →
                            </a>
                        </div>
                    )}

                    {/* Actual Embed */}
                    <div
                        ref={containerRef}
                        className={cn(
                            "flex justify-center px-4 py-6 transition-opacity duration-700 [&_iframe]:!rounded-2xl [&_iframe]:!border-0 [&_iframe]:!shadow-none [&_.instagram-media]:!shadow-none [&_.instagram-media]:!border-0 [&_.instagram-media]:!bg-transparent [&_.instagram-media]:!mx-auto [&_.instagram-media]:!max-w-full",
                            loaded ? "opacity-100" : "opacity-0"
                        )}
                    >
                        <blockquote
                            className="instagram-media"
                            data-instgrm-captioned
                            data-instgrm-permalink={`https://www.instagram.com/p/${shortcode}/`}
                            data-instgrm-version="14"
                            style={{
                                background: "transparent",
                                border: 0,
                                margin: "0 auto",
                                maxWidth: "540px",
                                width: "100%",
                                minWidth: "326px",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Card Preview (for news lists) ──────────────────────────────────────────

function InstagramCardPreview({ url, shortcode, className }: { url: string; shortcode: string; className?: string }) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "group flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-orange-400/5 border border-white/10 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/5",
                className
            )}
        >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0 group-hover:scale-110 transition-transform">
                <Instagram size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">Post de Instagram</p>
                <p className="text-xs font-bold text-white/30 truncate">{url}</p>
            </div>
            <ExternalLink size={14} className="text-white/20 group-hover:text-pink-400 transition-colors shrink-0" />
        </a>
    );
}

// ─── Fallback (invalid URL) ─────────────────────────────────────────────────

function InstagramFallbackCard({ url, className }: { url: string; className?: string }) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "flex items-center gap-4 px-6 py-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all",
                className
            )}
        >
            <Instagram size={20} className="text-white/30" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/40 truncate">{url}</p>
            </div>
            <ExternalLink size={14} className="text-white/20" />
        </a>
    );
}
