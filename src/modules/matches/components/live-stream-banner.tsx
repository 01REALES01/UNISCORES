"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Play, Radio, Loader2 } from "lucide-react";
import type { PartidoWithRelations } from "@/modules/matches/types";
import { getDisplayName } from "@/lib/sport-helpers";
import { SPORT_COLORS } from "@/lib/constants";

interface LiveStreamItem {
    id: number;
    href: string;
    sport: string;
    title: string;
    subtitle?: string;
    sportColor: string;
    stream_url: string;
}

interface LiveStreamBannerProps {
    partidos: PartidoWithRelations[];
    jornadas: Array<{
        id: number;
        nombre: string | null;
        numero: number;
        stream_url: string | null;
        estado: string;
        disciplinas: { name: string } | null;
    }>;
}

function buildPotentialItems(
    partidos: PartidoWithRelations[],
    jornadas: LiveStreamBannerProps["jornadas"]
): LiveStreamItem[] {
    const items: LiveStreamItem[] = [];

    for (const p of partidos) {
        if (!p.stream_url || p.estado !== "en_curso") continue;
        const sport = p.disciplinas?.name ?? "Deporte";
        items.push({
            id: p.id,
            href: `/partido/${p.id}`,
            sport,
            title: `${getDisplayName(p, "a")} vs ${getDisplayName(p, "b")}`,
            subtitle: sport,
            sportColor: SPORT_COLORS[sport] ?? "#ef4444",
            stream_url: p.stream_url,
        });
    }

    for (const j of jornadas) {
        if (!j.stream_url || j.estado !== "en_curso") continue;
        const sport = j.disciplinas?.name ?? "Deporte";
        items.push({
            id: j.id,
            href: `/jornadas/${j.id}`,
            sport,
            title: j.nombre ?? `Ronda ${j.numero}`,
            subtitle: sport,
            sportColor: SPORT_COLORS[sport] ?? "#ef4444",
            stream_url: j.stream_url,
        });
    }

    return items;
}

export function LiveStreamBanner({ partidos, jornadas }: LiveStreamBannerProps) {
    const [liveItems, setLiveItems] = useState<LiveStreamItem[]>([]);
    const [loading, setLoading] = useState(true);

    const potentialItems = buildPotentialItems(partidos, jornadas);

    useEffect(() => {
        if (potentialItems.length === 0) {
            setLoading(false);
            setLiveItems([]);
            return;
        }

        async function verifyLiveStatus() {
            try {
                // Verify items in parallel
                const results = await Promise.all(
                    potentialItems.map(async (item) => {
                        const res = await fetch(`/api/utils/check-youtube-live?url=${encodeURIComponent(item.stream_url)}`);
                        const data = await res.json();
                        return data.isLive ? item : null;
                    })
                );
                
                const verified = results.filter((item): item is LiveStreamItem => item !== null);
                setLiveItems(verified);
            } catch (err) {
                console.error("Error verifying live streams:", err);
                // Fallback to potential items if API fails, so we don't hide everything by mistake
                setLiveItems(potentialItems);
            } finally {
                setLoading(false);
            }
        }

        verifyLiveStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [partidos.length, jornadas.length]);

    if (loading || liveItems.length === 0) return null;

    const primary = liveItems[0];
    const extra = liveItems.length - 1;

    return (
        <div className="animate-in fade-in slide-in-from-top-3 duration-700">
            <Link href={primary.href} className="block group">
                <div
                    className="relative overflow-hidden rounded-[2rem] border transition-all duration-500 shadow-2xl hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                        borderColor: `${primary.sportColor}40`,
                        background: `linear-gradient(135deg, ${primary.sportColor}18 0%, rgba(0,0,0,0.6) 60%)`,
                        boxShadow: `0 0 40px ${primary.sportColor}25`,
                    }}
                >
                    {/* Animated glow bg */}
                    <div
                        className="absolute inset-0 opacity-30 pointer-events-none animate-pulse"
                        style={{
                            background: `radial-gradient(circle at 20% 50%, ${primary.sportColor}30 0%, transparent 60%)`,
                        }}
                    />
                    {/* Top accent line */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{
                            background: `linear-gradient(to right, transparent, ${primary.sportColor}, transparent)`,
                        }}
                    />

                    <div className="relative z-10 flex items-center justify-between gap-4 px-6 py-5">
                        {/* Left: badge + title */}
                        <div className="flex items-center gap-4 min-w-0">
                            {/* Live pulse icon */}
                            <div
                                className="shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl border"
                                style={{
                                    backgroundColor: `${primary.sportColor}20`,
                                    borderColor: `${primary.sportColor}40`,
                                }}
                            >
                                <Radio
                                    size={20}
                                    className="animate-pulse"
                                    style={{ color: primary.sportColor }}
                                />
                            </div>

                            <div className="min-w-0">
                                {/* Status badge */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="relative flex h-2 w-2 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-red-400">
                                        Transmitido en Vivo Ahora
                                    </span>
                                    {extra > 0 && (
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-wider">
                                            +{extra} más
                                        </span>
                                    )}
                                </div>

                                {/* Match/Jornada name */}
                                <p className="text-sm sm:text-base font-black text-white tracking-tight truncate leading-tight">
                                    {primary.title}
                                </p>
                                {primary.subtitle && (
                                    <p
                                        className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
                                        style={{ color: `${primary.sportColor}cc` }}
                                    >
                                        {primary.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Right: CTA button */}
                        <div
                            className={cn(
                                "shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                                "group-hover:scale-105 group-hover:brightness-110"
                            )}
                            style={{
                                backgroundColor: primary.sportColor,
                                color: "#fff",
                                boxShadow: `0 4px 16px ${primary.sportColor}50`,
                            }}
                        >
                            <Play size={14} className="fill-current" />
                            <span className="hidden sm:inline">Ver transmisión</span>
                            <span className="sm:hidden">Ver</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
