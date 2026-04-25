"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useMatches } from "@/hooks/use-matches";
import { getCurrentScore } from "@/lib/sport-scoring";
import {
    getCarreraSubtitle,
    getDisplayName,
    getMatchSideImageUrl,
    getSwimmingEventTitle,
    isRaceMatch,
} from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { SPORT_COLORS } from "@/lib/constants";

const SPORT_ICON: Record<string, string> = {
    'Fútbol':       '/FutbolIcono.png',
    'Baloncesto':   '/BasketIcono.png',
    'Voleibol':     '/VolleyIcono.png',
    'Tenis':        '/TenisIcono.png',
    'Tenis de Mesa':'/TenisDMIcono.png',
    'Ajedrez':      '/AjedrezIcono.png',
    'Natación':     '/NatacionIcono.png',
};
import type { PartidoWithRelations } from "@/modules/matches/types";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    LayoutGrid,
    Maximize2,
    Minimize2,
    Pause,
    Play,
    UserSquare2,
} from "lucide-react";

const PAGE_SIZE = 4;
const AUTO_INTERVAL_OPTIONS = [8, 12, 18, 25] as const;
const FALLBACK_SHIELD = "/logo_olimpiadas.png";

/** Logo cartelera (Olimpiadas Deportivas). Respaldo SVG si falta el PNG. */
const BRAND_LOGO_MAIN = "/brand/olimpiadas-deportivas-logo.png";
const BRAND_LOGO_FALLBACK = "/brand/olimpiadas-elementos-recuperado-01.svg";

/** No mostrar en la vista TV (pedido explícito). Nombres sin tildes (se normaliza igual). */
const TV_EXCLUDED_SPORTS_NORM = new Set(["natacion", "tenis de mesa"]);

function normSportName(n?: string | null): string {
    return (n ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function isTvExcludedSport(name?: string | null): boolean {
    return TV_EXCLUDED_SPORTS_NORM.has(normSportName(name));
}

function ymdBogota(iso: string): string {
    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Bogota",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

/** Fecha estilo cartelera: "DOMINGO, 24 DE ABRIL DE 2026" en mayúsculas. */
function titleForYmdBroadcast(ymd: string): string {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return ymd;
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const s = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(dt);
    return s.toLocaleUpperCase("es-CO");
}

/** Abreviatura ~3 letras estilo transmisión (COL / VEN). */
function abbrBroadcast(name: string): string {
    const clean = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .trim()
        .toUpperCase();
    if (!clean) return "???";
    const parts = clean.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
        const a = parts[0][0] ?? "";
        const b = parts[1][0] ?? "";
        const c = parts[1][1] ?? parts[0][1] ?? "";
        return (a + b + c).slice(0, 3).padEnd(3, "·");
    }
    return clean.slice(0, 3).padEnd(3, "·");
}

function sideLogoUrl(sport: string, side: "a" | "b", m: PartidoWithRelations): string {
    return getMatchSideImageUrl(sport, side, m) || FALLBACK_SHIELD;
}

/** Iluminación suave: esmeralda (plan redesign) + toque del deporte si hay filtro */
function AmbientOrbs({ sportColor }: { sportColor?: string }) {
    const accent = sportColor || "#10B981";
    return (
        <>
            <div
                aria-hidden
                className="pointer-events-none absolute -left-[18%] top-[8%] h-[42vh] w-[42vh] rounded-full bg-emerald-500/12 blur-[110px] mix-blend-screen transition-opacity duration-700"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -right-[12%] bottom-[8%] h-[38vh] w-[38vh] rounded-full blur-[95px] mix-blend-screen transition-colors duration-700"
                style={{ backgroundColor: `${accent}14` }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[28%] h-[28vh] w-[55vw] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[90px] mix-blend-screen"
            />
        </>
    );
}

/** Watermark del deporte en el fondo cuando hay un deporte filtrado */
function SportWatermark({ sport }: { sport: string }) {
    const iconSrc = SPORT_ICON[sport];
    if (!iconSrc) return null;
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
                src={iconSrc}
                alt=""
                className="select-none object-contain mix-blend-screen"
                style={{
                    width: 'clamp(14rem, 38vw, 30rem)',
                    height: 'clamp(14rem, 38vw, 30rem)',
                    opacity: 0.07,
                    filter: 'blur(1.5px)',
                }}
            />
        </div>
    );
}

/** Patrón de puntos sutil para textura de fondo */
function DotGrid() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 opacity-80"
            style={{
                backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px), radial-gradient(circle, rgba(16,185,129,0.04) 1px, transparent 1px)",
                backgroundSize: "28px 28px, 28px 28px",
                backgroundPosition: "0 0, 14px 14px",
                maskImage: "radial-gradient(ellipse 85% 75% at 50% 45%, black 35%, transparent 100%)",
            }}
        />
    );
}

function BrandLogoBlock({ compact }: { compact?: boolean }) {
    const [src, setSrc] = useState(BRAND_LOGO_MAIN);
    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-emerald-500/15",
                compact ? "px-3 py-1.5 max-w-[min(90vw,340px)]" : "px-4 py-2 max-w-[min(92vw,440px)]"
            )}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt="Olimpiadas Deportivas — Interprogramas UNINORTE"
                className={cn("h-auto w-full max-w-full object-contain object-center", compact ? "max-h-11 sm:max-h-12" : "max-h-14 sm:max-h-[4.5rem]")}
                onError={() => setSrc(BRAND_LOGO_FALLBACK)}
            />
        </div>
    );
}

function CircleShield({
    url,
    className,
}: {
    url: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "shrink-0 rounded-full border-2 border-white/25 shadow-md overflow-hidden",
                className
            )}
            style={{
                background:
                    "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.2), rgba(16,185,129,0.12) 55%, rgba(49,22,81,0.25))",
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={url}
                alt=""
                className="h-full w-full object-contain"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_SHIELD;
                }}
            />
        </div>
    );
}

function ScoreBox({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex min-w-[5.5rem] sm:min-w-[7.5rem] shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-white/[0.07] px-4 py-2 sm:px-5 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.2)] backdrop-blur-sm",
                className
            )}
        >
            {children}
        </div>
    );
}

function SportBadge({ sport, live }: { sport: string; live: boolean }) {
    const color = SPORT_COLORS[sport] || "#10B981";
    const iconSrc = SPORT_ICON[sport];
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
            style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}
        >
            {iconSrc && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconSrc} alt="" className="h-3 w-3 object-contain mix-blend-screen" />
            )}
            {sport}
            {live && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse inline-block" />}
        </span>
    );
}

function MatchRow({ m, showSport = true }: { m: PartidoWithRelations; showSport?: boolean }) {
    const sport = m.disciplinas?.name || "Fútbol";
    const { scoreA, scoreB } = getCurrentScore(sport, m.marcador_detalle || {});
    const showScore = m.estado === "finalizado" || m.estado === "en_curso";
    const fullA = getDisplayName(m, "a");
    const fullB = getDisplayName(m, "b");
    const logoA = sideLogoUrl(sport, "a", m);
    const logoB = sideLogoUrl(sport, "b", m);
    const timeLbl = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(m.fecha));
    const live = m.estado === "en_curso";
    const race = isRaceMatch(m);
    const sportColor = SPORT_COLORS[sport] || "#10B981";
    const liveGlow = live ? `0 0 28px ${sportColor}55` : undefined;

    if (race) {
        const title = getSwimmingEventTitle(m);
        return (
            <div
                className={cn(
                    "relative flex w-full max-w-[min(920px,96vw)] mx-auto items-center gap-3 rounded-[1.5rem] border border-white/12 bg-white/8 px-4 py-3 sm:gap-5 sm:px-6 sm:py-3.5 backdrop-blur-sm overflow-hidden",
                )}
                style={{ boxShadow: liveGlow, borderLeftColor: sportColor + '66', borderLeftWidth: '3px' }}
            >
                <CircleShield url={logoA} className="h-11 w-11 sm:h-14 sm:w-14" />
                <div className="min-w-0 flex-1 text-left">
                    <p className="font-black uppercase tracking-tight text-[#F5F5DC] truncate text-sm sm:text-base drop-shadow-sm">
                        {title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        {showSport && <SportBadge sport={sport} live={live} />}
                        {m.genero && <span className="text-[9px] font-bold text-[#F5F5DC]/35 uppercase tracking-widest">{m.genero}</span>}
                    </div>
                </div>
                <ScoreBox>
                    <span className="font-mono font-black text-lg sm:text-xl text-[#F5F5DC] tabular-nums">{timeLbl}</span>
                </ScoreBox>
                <div className="min-w-0 flex-1 text-right">
                    <p className="font-black uppercase text-[#F5F5DC] truncate text-sm sm:text-base">{fullB}</p>
                </div>
                <CircleShield url={logoB} className="h-11 w-11 sm:h-14 sm:w-14" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative flex w-full max-w-[min(920px,96vw)] mx-auto items-center gap-3 rounded-[1.5rem] border border-white/12 bg-white/8 px-4 py-3 sm:gap-6 sm:px-6 sm:py-3.5 backdrop-blur-sm overflow-hidden",
            )}
            style={{ boxShadow: liveGlow, borderLeftColor: sportColor + '77', borderLeftWidth: '3px' }}
        >
            {/* Subtle sport glow streak at top */}
            <div
                aria-hidden
                className="pointer-events-none absolute top-0 left-1/4 right-1/4 h-px opacity-40"
                style={{ background: `linear-gradient(90deg, transparent, ${sportColor}, transparent)` }}
            />
            {/* Team A */}
            <div className="flex items-center gap-2 sm:gap-3 flex-[0_0_37%] min-w-0">
                <CircleShield url={logoA} className="h-10 w-10 sm:h-12 sm:w-12 shrink-0" />
                <p
                    className="font-black text-[#F5F5DC] leading-tight line-clamp-2 text-left min-w-0"
                    style={{ fontSize: "clamp(0.65rem, 1.5vw, 0.875rem)" }}
                >
                    {fullA}
                </p>
            </div>
            <ScoreBox>
                {showScore ? (
                    <span className="flex flex-col items-center gap-0.5">
                        <span
                            className={cn("font-mono font-black tabular-nums leading-none tracking-tight", live ? "text-[#10B981]" : "text-[#F5F5DC]")}
                            style={{ fontSize: "clamp(1.35rem, 4vw, 2.25rem)" }}
                        >
                            {scoreA}
                            <span className="text-[#F5F5DC]/40 font-light mx-1 sm:mx-1.5">—</span>
                            {scoreB}
                        </span>
                        {showSport && <SportBadge sport={sport} live={live} />}
                    </span>
                ) : (
                    <span className="flex flex-col items-center gap-0.5">
                        <span
                            className="font-mono font-black text-[#F5F5DC]/90 leading-none"
                            style={{ fontSize: "clamp(1rem, 2.8vw, 1.5rem)" }}
                        >
                            VS
                        </span>
                        <span className="text-[9px] font-bold text-[#F5F5DC]/50 uppercase tracking-wider">{timeLbl}</span>
                        {showSport && <SportBadge sport={sport} live={live} />}
                    </span>
                )}
            </ScoreBox>
            {/* Team B */}
            <div className="flex items-center gap-2 sm:gap-3 flex-[0_0_37%] flex-row-reverse min-w-0">
                <CircleShield url={logoB} className="h-10 w-10 sm:h-12 sm:w-12 shrink-0" />
                <p
                    className="font-black text-[#F5F5DC] leading-tight line-clamp-2 text-right min-w-0"
                    style={{ fontSize: "clamp(0.65rem, 1.5vw, 0.875rem)" }}
                >
                    {fullB}
                </p>
            </div>
        </div>
    );
}

function SpotlightMatch({ m }: { m: PartidoWithRelations }) {
    const sport = m.disciplinas?.name || "Fútbol";
    const { scoreA, scoreB } = getCurrentScore(sport, m.marcador_detalle || {});
    const showScore = m.estado === "finalizado" || m.estado === "en_curso";
    const fullA = getDisplayName(m, "a");
    const fullB = getDisplayName(m, "b");
    const subA = getCarreraSubtitle(m, "a");
    const subB = getCarreraSubtitle(m, "b");
    const logoA = sideLogoUrl(sport, "a", m);
    const logoB = sideLogoUrl(sport, "b", m);
    const timeLbl = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(m.fecha));
    const live = m.estado === "en_curso";
    const race = isRaceMatch(m);

    if (race) {
        return (
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-6 px-6 animate-in fade-in duration-500">
                <p className="text-center text-xs font-black uppercase tracking-[0.4em] text-emerald-400/90">{sport}</p>
                <h2 className="text-center font-black uppercase text-[#F5F5DC] leading-tight text-[clamp(1.5rem,5vw,2.75rem)] tracking-tight drop-shadow-md px-4">
                    {getSwimmingEventTitle(m)}
                </h2>
                <ScoreBox className="min-w-[8rem] py-4">
                    <span className="font-mono font-black text-2xl text-[#F5F5DC]">{timeLbl}</span>
                </ScoreBox>
            </div>
        );
    }

    const sportColor = SPORT_COLORS[sport] || "#10B981";
    const sportIconSrc = SPORT_ICON[sport];

    return (
        <div className="flex flex-1 min-h-0 items-center justify-center px-[4vw] py-6 animate-in fade-in zoom-in-95 duration-500">
            <div
                className="relative flex w-full max-w-[min(960px,98vw)] items-center gap-4 sm:gap-8 rounded-[2.5rem] border border-white/12 bg-white/8 px-5 py-8 sm:px-10 sm:py-10 backdrop-blur-sm overflow-hidden"
                style={{ borderTopColor: sportColor + '55', borderTopWidth: '2px', boxShadow: `0 0 60px ${sportColor}18` }}
            >
                {/* Top glow streak */}
                <div aria-hidden className="pointer-events-none absolute top-0 left-[15%] right-[15%] h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${sportColor}, transparent)`, opacity: 0.6 }} />
                {/* Sport label */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{ backgroundColor: sportColor + '20', border: `1px solid ${sportColor}40` }}>
                    {sportIconSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sportIconSrc} alt="" className="h-4 w-4 object-contain mix-blend-screen" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: sportColor }}>{sport}</span>
                    {live && <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-4 text-center mt-6">
                    <CircleShield url={logoA} className="h-[min(20vw,140px)] w-[min(20vw,140px)] border-[3px] border-white/25" />
                    <span className="font-black text-[#F5F5DC] drop-shadow-sm text-[clamp(1.1rem,3.5vw,2rem)] line-clamp-3 text-center leading-tight px-2">{fullA}</span>
                    {subA && <span className="text-[11px] font-semibold" style={{ color: sportColor }}>{subA}</span>}
                </div>
                <ScoreBox className="min-h-[6rem] min-w-[7rem] sm:min-w-[10rem] flex-col gap-1 py-4">
                    {showScore ? (
                        <span
                            className={cn("font-mono font-black tabular-nums leading-none", live ? "text-[#10B981]" : "text-[#F5F5DC]")}
                            style={{ fontSize: "clamp(2.5rem,10vw,5rem)" }}
                        >
                            {scoreA} <span className="text-[#F5F5DC]/40 mx-1">—</span> {scoreB}
                        </span>
                    ) : (
                        <span className="font-black text-[#F5F5DC]/90 text-2xl sm:text-4xl tracking-widest">VS</span>
                    )}
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#F5F5DC]/45">
                        {timeLbl}{live ? " · vivo" : ""}
                    </span>
                </ScoreBox>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-4 text-center mt-6">
                    <CircleShield url={logoB} className="h-[min(20vw,140px)] w-[min(20vw,140px)] border-[3px] border-white/25" />
                    <span className="font-black text-[#F5F5DC] drop-shadow-sm text-[clamp(1.1rem,3.5vw,2rem)] line-clamp-3 text-center leading-tight px-2">{fullB}</span>
                    {subB && <span className="text-[11px] font-semibold" style={{ color: sportColor }}>{subB}</span>}
                </div>
            </div>
        </div>
    );
}

export function TvResultadosScreen() {
    const searchParams = useSearchParams();
    const { matches, loading } = useMatches();
    const shellRef = useRef<HTMLDivElement>(null);

    const [selectedYmd, setSelectedYmd] = useState(() => {
        const q = searchParams.get("fecha");
        if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
        return ymdBogota(new Date().toISOString());
    });
    const [sportFilter, setSportFilter] = useState<string>("todos");
    const [pageIndex, setPageIndex] = useState(0);
    const [spotlightIndex, setSpotlightIndex] = useState(0);
    const [layoutMode, setLayoutMode] = useState<"grid" | "spotlight">("grid");
    const [autoRotate, setAutoRotate] = useState(false);
    const [intervalIdx, setIntervalIdx] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [inFullscreen, setInFullscreen] = useState(false);

    useEffect(() => {
        const q = searchParams.get("fecha");
        if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) setSelectedYmd(q);
    }, [searchParams]);

    useEffect(() => {
        const onFs = () => {
            const el = shellRef.current;
            const fs = document.fullscreenElement;
            const nowFs = !!(el && fs === el);
            setInFullscreen(nowFs);
            if (nowFs) setShowControls(false);
        };
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const shiftDay = useCallback((delta: number) => {
        setSelectedYmd((prev) => {
            const [y, m, d] = prev.split("-").map(Number);
            const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
            base.setUTCDate(base.getUTCDate() + delta);
            return new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Bogota",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(base);
        });
        setPageIndex(0);
        setSpotlightIndex(0);
    }, []);

    const byDate = useMemo(
        () =>
            matches.filter(
                (m) =>
                    m.fecha &&
                    ymdBogota(m.fecha) === selectedYmd &&
                    !isTvExcludedSport(m.disciplinas?.name)
            ),
        [matches, selectedYmd]
    );

    const sportsOnDay = useMemo(() => {
        const s = new Set<string>();
        byDate.forEach((m) => {
            if (m.disciplinas?.name) s.add(m.disciplinas.name);
        });
        return Array.from(s).sort();
    }, [byDate]);

    const filtered = useMemo(() => {
        if (sportFilter === "todos") return byDate;
        return byDate.filter((m) => m.disciplinas?.name === sportFilter);
    }, [byDate, sportFilter]);

    useEffect(() => {
        if (sportFilter === "todos") return;
        if (!sportsOnDay.includes(sportFilter)) setSportFilter("todos");
    }, [sportFilter, sportsOnDay]);

    const sorted = useMemo(
        () => [...filtered].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
        [filtered]
    );

    const pages = useMemo(() => {
        const out: PartidoWithRelations[][] = [];
        for (let i = 0; i < sorted.length; i += PAGE_SIZE) {
            out.push(sorted.slice(i, i + PAGE_SIZE));
        }
        return out.length ? out : [[]];
    }, [sorted]);

    useEffect(() => {
        setPageIndex((p) => Math.min(p, Math.max(0, pages.length - 1)));
    }, [pages.length]);

    useEffect(() => {
        setSpotlightIndex((i) => Math.min(i, Math.max(0, sorted.length - 1)));
    }, [sorted.length]);

    const intervalSec = AUTO_INTERVAL_OPTIONS[intervalIdx] ?? 12;

    useEffect(() => {
        if (!autoRotate) return;
        if (layoutMode === "spotlight") {
            if (sorted.length <= 1) return;
            const id = window.setInterval(() => {
                setSpotlightIndex((i) => (i + 1) % sorted.length);
            }, intervalSec * 1000);
            return () => window.clearInterval(id);
        }
        if (pages.length <= 1) return;
        const id = window.setInterval(() => {
            setPageIndex((p) => (p + 1) % pages.length);
        }, intervalSec * 1000);
        return () => window.clearInterval(id);
    }, [autoRotate, layoutMode, pages.length, sorted.length, intervalSec]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "ArrowLeft") shiftDay(-1);
            if (e.key === "ArrowRight") shiftDay(1);
            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (layoutMode === "spotlight") {
                    setSpotlightIndex((i) => (i - 1 + sorted.length) % sorted.length);
                } else {
                    setPageIndex((p) => (p - 1 + pages.length) % pages.length);
                }
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (layoutMode === "spotlight") {
                    setSpotlightIndex((i) => (i + 1) % sorted.length);
                } else {
                    setPageIndex((p) => (p + 1) % pages.length);
                }
            }
            if (e.key === " " || e.key === "Enter") {
                if (e.key === " ") e.preventDefault();
                setAutoRotate((a) => !a);
            }
            if (e.key === "?" || e.key === "h" || e.key === "H") {
                setShowControls((s) => !s);
            }
            if (e.key === "v" || e.key === "V") {
                setLayoutMode((m) => (m === "grid" ? "spotlight" : "grid"));
                setPageIndex(0);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pages.length, sorted.length, layoutMode, shiftDay]);

    const currentRows = pages[pageIndex] ?? [];
    const spotlightMatch = sorted[spotlightIndex];

    const requestFs = () => {
        const el = shellRef.current;
        if (!el) return;
        if (document.fullscreenElement === el) void document.exitFullscreen();
        else void el.requestFullscreen?.();
    };

    const goSpotlight = () => {
        const start = Math.min(pageIndex * PAGE_SIZE, Math.max(0, sorted.length - 1));
        setSpotlightIndex(start);
        setLayoutMode("spotlight");
    };

    const chromeFooter = showControls && (
        <div
            className={cn(
                "shrink-0 border-t border-white/10 bg-background/80 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3",
                inFullscreen && "fixed bottom-0 left-0 right-0 z-50 max-h-[42vh] overflow-y-auto shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
            )}
        >
            <button
                type="button"
                onClick={() => shiftDay(-1)}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs sm:text-sm font-black uppercase tracking-wider text-foreground hover:bg-emerald-500/20 transition-colors"
            >
                <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                Día ant.
            </button>
            <button
                type="button"
                onClick={() => shiftDay(1)}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs sm:text-sm font-black uppercase tracking-wider text-foreground hover:bg-emerald-500/20 transition-colors"
            >
                Día sig.
                <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="hidden sm:inline w-px h-8 bg-white/15 mx-1" />
            <button
                type="button"
                onClick={() => {
                    if (layoutMode === "grid") goSpotlight();
                    else setLayoutMode("grid");
                }}
                className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors",
                    layoutMode === "spotlight"
                        ? "border-amber-400/45 bg-amber-500/12 text-foreground"
                        : "border-white/15 bg-white/5 text-foreground/90 hover:bg-white/10"
                )}
            >
                {layoutMode === "spotlight" ? (
                    <>
                        <LayoutGrid className="w-4 h-4" />
                        Grilla
                    </>
                ) : (
                    <>
                        <UserSquare2 className="w-4 h-4" />
                        1 partido
                    </>
                )}
            </button>
            {layoutMode === "grid" && (
                <>
                    <button
                        type="button"
                        disabled={pages.length <= 1}
                        onClick={() => setPageIndex((p) => (p - 1 + pages.length) % pages.length)}
                        className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-black uppercase text-foreground/90 hover:bg-white/10 disabled:opacity-30"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Pág.
                    </button>
                    <button
                        type="button"
                        disabled={pages.length <= 1}
                        onClick={() => setPageIndex((p) => (p + 1) % pages.length)}
                        className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-black uppercase text-foreground/90 hover:bg-white/10 disabled:opacity-30"
                    >
                        Pág.
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}
            {layoutMode === "spotlight" && sorted.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => setSpotlightIndex((i) => (i - 1 + sorted.length) % sorted.length)}
                        className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-black uppercase text-foreground/90 hover:bg-white/10"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Ant.
                    </button>
                    <button
                        type="button"
                        onClick={() => setSpotlightIndex((i) => (i + 1) % sorted.length)}
                        className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-black uppercase text-foreground/90 hover:bg-white/10"
                    >
                        Sig.
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}
            <button
                type="button"
                onClick={() => setAutoRotate((a) => !a)}
                className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-colors",
                    autoRotate
                        ? "border-emerald-500/50 bg-emerald-500/15 text-foreground"
                        : "border-white/20 bg-white/5 text-foreground/80 hover:bg-white/10"
                )}
            >
                {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                Auto
            </button>
            <select
                value={intervalIdx}
                onChange={(e) => setIntervalIdx(Number(e.target.value))}
                className="rounded-lg border border-emerald-500/30 bg-background/90 px-2 py-2 text-[11px] font-bold text-foreground/90"
            >
                {AUTO_INTERVAL_OPTIONS.map((sec, i) => (
                    <option key={sec} value={i}>
                        {sec}s
                    </option>
                ))}
            </select>
            <button
                type="button"
                onClick={requestFs}
                className="flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/12 px-3 py-2 text-[11px] font-black uppercase text-foreground hover:bg-amber-500/20"
            >
                {inFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                {inFullscreen ? "Salir" : "Pantalla completa"}
            </button>
            <button
                type="button"
                onClick={() => setShowControls(false)}
                className="rounded-xl border border-white/10 px-2 py-2 text-[10px] font-bold uppercase text-foreground/45 hover:text-foreground/80"
            >
                Ocultar (H)
            </button>
        </div>
    );

    const filterAccentColor =
        sportFilter !== "todos" ? (SPORT_COLORS[sportFilter] || "#10B981") : "#10B981";

    return (
        <div
            ref={shellRef}
            className="relative h-svh w-full overflow-hidden flex flex-col font-sans text-foreground bg-background"
        >
            {/* Mismo patrón de fondo que /calendario (elemento 08) */}
            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-start overflow-hidden opacity-30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/elementos/08.png"
                    alt=""
                    className="w-[800px] h-auto -translate-x-[15%] translate-y-[10%] filter contrast-110 brightness-100 rotate-[-10deg]"
                    aria-hidden
                />
            </div>
            <DotGrid />
            <AmbientOrbs sportColor={sportFilter !== "todos" ? SPORT_COLORS[sportFilter] : undefined} />
            {sportFilter !== "todos" && <SportWatermark sport={sportFilter} />}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-emerald-500/[0.07] via-transparent to-violet-950/12"
            />

            <header
                className={cn(
                    "relative z-10 flex flex-col items-center justify-center shrink-0",
                    inFullscreen ? "pt-[2vh] pb-2 px-4" : "pt-[2.5vh] pb-[1.5vh] px-5"
                )}
            >
                <BrandLogoBlock compact={inFullscreen} />
                <p className="mt-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.45em] text-emerald-400/85">
                    Interprogramas UNINORTE
                </p>
                <h1
                    className="mt-1 font-black uppercase tracking-tight text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
                    style={{ fontSize: inFullscreen ? "clamp(1.35rem, 3.8vw, 2.5rem)" : "clamp(1.6rem, 4.8vw, 3.25rem)" }}
                >
                    <span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.28)]">Resultados</span>{" "}
                    <span className="text-foreground">del día</span>
                </h1>
                {sportFilter !== "todos" && (
                    <div
                        className="mt-2 flex items-center gap-2 rounded-full px-4 py-1.5"
                        style={{
                            backgroundColor: `${filterAccentColor}22`,
                            border: `1px solid ${filterAccentColor}55`,
                        }}
                    >
                        {SPORT_ICON[sportFilter] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={SPORT_ICON[sportFilter]} alt="" className="h-5 w-5 object-contain mix-blend-screen" />
                        )}
                        <span
                            className="font-black uppercase tracking-[0.2em]"
                            style={{ color: filterAccentColor, fontSize: "clamp(0.65rem, 1.5vw, 0.9rem)" }}
                        >
                            {sportFilter}
                        </span>
                    </div>
                )}
                <div className="mt-3 rounded-full border border-emerald-500/25 bg-white/[0.07] px-7 py-2.5 sm:px-10 sm:py-3 shadow-lg backdrop-blur-md">
                    <span className="text-[clamp(0.75rem,1.8vw,1.1rem)] font-black uppercase tracking-wide text-foreground">
                        {titleForYmdBroadcast(selectedYmd)}
                    </span>
                </div>
                {!inFullscreen && layoutMode === "grid" && pages.length > 1 && (
                    <p className="mt-2 text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-widest">
                        Página {pageIndex + 1} de {pages.length} · {sorted.length} partidos
                    </p>
                )}
                {!inFullscreen && layoutMode === "spotlight" && sorted.length > 0 && (
                    <p className="mt-2 text-[10px] sm:text-xs font-bold text-foreground/50 uppercase tracking-widest">
                        Partido {spotlightIndex + 1} de {sorted.length}
                        {autoRotate ? " · auto" : ""}
                    </p>
                )}
                {!inFullscreen && sportsOnDay.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-[95vw]">
                        <button
                            type="button"
                            onClick={() => {
                                setSportFilter("todos");
                                setPageIndex(0);
                                setSpotlightIndex(0);
                            }}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wide transition-colors",
                                sportFilter === "todos"
                                    ? "border-emerald-400/45 bg-emerald-500/15 text-foreground shadow-[0_0_22px_rgba(16,185,129,0.2)]"
                                    : "border-white/15 bg-white/10 text-foreground/85 hover:bg-white/15"
                            )}
                        >
                            Todos
                        </button>
                        {sportsOnDay.map((sp) => (
                            <button
                                key={sp}
                                type="button"
                                onClick={() => {
                                    setSportFilter(sp);
                                    setPageIndex(0);
                                    setSpotlightIndex(0);
                                }}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wide transition-colors",
                                    sportFilter === sp
                                        ? "border-emerald-400/45 bg-emerald-500/15 text-foreground shadow-[0_0_22px_rgba(16,185,129,0.2)]"
                                        : "border-white/15 bg-white/10 text-foreground/85 hover:bg-white/15"
                                )}
                            >
                                {SPORT_ICON[sp] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={SPORT_ICON[sp]} alt="" className="h-3.5 w-3.5 object-contain mix-blend-screen" />
                                )}
                                {sp}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="relative z-10 flex-1 min-h-0 flex flex-col px-[3vw] pb-2">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-lg font-black text-foreground/35 uppercase tracking-widest">
                        Sincronizando…
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                        <p className="text-lg font-black text-foreground/55 uppercase tracking-wide">Sin partidos esta fecha</p>
                        <p className="text-sm text-foreground/40 max-w-md">
                            ← → día · <kbd className="font-mono text-emerald-400">V</kbd> grilla / foco
                        </p>
                    </div>
                ) : layoutMode === "spotlight" && spotlightMatch ? (
                    <SpotlightMatch m={spotlightMatch} />
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col justify-center gap-[1.75vh] mx-auto w-full max-w-[min(960px,98vw)] overflow-y-auto py-3">
                        {currentRows.map((m) => (
                            <MatchRow key={m.id} m={m} showSport={sportFilter === "todos"} />
                        ))}
                    </div>
                )}
            </main>

            {chromeFooter}

            {!showControls && (
                <button
                    type="button"
                    onClick={() => setShowControls(true)}
                    className={cn(
                        "fixed z-40 rounded-full border border-emerald-500/35 bg-background/85 backdrop-blur-sm px-4 py-2 text-[11px] font-black uppercase text-foreground hover:bg-emerald-500/10",
                        inFullscreen ? "bottom-3 right-3" : "bottom-4 right-4"
                    )}
                >
                    Controles (H)
                </button>
            )}

            {!inFullscreen && (
                <p className="relative z-10 text-center text-[9px] sm:text-[10px] text-foreground/30 pb-2 px-4 shrink-0 uppercase tracking-widest">
                    ← → día · ↑ ↓ · espacio auto · V foco · H menú
                </p>
            )}
        </div>
    );
}
