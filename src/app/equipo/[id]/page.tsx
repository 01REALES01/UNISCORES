"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTeamProfile } from "@/modules/teams/hooks/use-team-profile";
import { MainNavbar } from "@/components/main-navbar";
import { SportIcon } from "@/components/sport-icons";
import { Avatar, Badge, Button } from "@/shared/components/ui-primitives";
import UniqueLoading from "@/components/ui/morph-loading";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import {
    SPORT_EMOJI,
    SPORT_ACCENT,
    SPORT_GRADIENT,
    SPORT_COLORS,
    SPORT_BORDER
} from "@/lib/constants";
import {
    Trophy,
    ChevronLeft,
    Swords,
    Users,
    Users2,
    Activity,
    TrendingUp,
    ShieldHalf,
    ArrowUpRight,
    Star
} from "lucide-react";

// ─── Shared Components ────────────────────────────────────────────────────────

function EmptyState({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
                {icon}
            </div>
            <h3 className="text-lg font-black text-white/20 uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-white/40 text-sm max-w-md font-bold italic">{description}</p>
        </div>
    );
}

function MatchRow({ match, carreraName }: { match: any; carreraName?: string }) {
    const estado = (match.estado || "").toLowerCase().trim();
    const disc = (Array.isArray(match.disciplinas) ? match.disciplinas[0] : match.disciplinas)?.name;
    const det = match.marcador_detalle || {};

    const nameA = getDisplayName(match, "a");
    const nameB = getDisplayName(match, "b");
    const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? null;
    const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? null;

    const isLive = estado === "en_curso";
    const isFinal = estado === "finalizado";

    const accent = SPORT_ACCENT[disc || ""] || "text-white/60";

    // Winner calculations
    const scoreNumA = typeof scoreA === 'number' ? scoreA : parseInt(scoreA) || 0;
    const scoreNumB = typeof scoreB === 'number' ? scoreB : parseInt(scoreB) || 0;
    const isDraw = isFinal && scoreNumA === scoreNumB;
    const winnerA = isFinal && scoreNumA > scoreNumB;
    const winnerB = isFinal && scoreNumB > scoreNumA;

    return (
        <Link href={`/partido/${match.id}`} className="block group/match">
            <div className={cn(
                "relative flex flex-col p-4 sm:p-5 rounded-[1.5rem] border border-white/5 transition-all duration-500 overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 bg-white/[0.03] hover:bg-white/[0.05]"
            )}>
                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
                {/* Sport Gradient Wash */}
                <div className={cn(
                    "absolute inset-0 opacity-[0.08] pointer-events-none bg-gradient-to-br transition-opacity group-hover/match:opacity-[0.12]",
                    SPORT_GRADIENT[disc || ""] || "from-white/10 to-transparent"
                )} />
                {/* Glow Bloom */}
                <div 
                    className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 opacity-[0.08] group-hover/match:opacity-[0.15]"
                    style={{ backgroundColor: SPORT_COLORS[disc || ""] || '#ffffff10' }}
                />

                {/* Top Header Row */}
                <div className="flex items-center justify-between w-full mb-3 z-10">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center border shadow-inner transition-colors",
                            isLive ? "bg-red-500/20 border-red-500/30" : "bg-white/5 border-white/10"
                        )}>
                            {disc ? <SportIcon sport={disc} size={12} className={isLive ? "text-red-400 animate-pulse" : "text-white/40 opacity-80"} /> : <Swords size={12} className="text-white/20" />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{disc || 'Evento'}</span>
                    </div>

                    <div>
                        {isLive ? (
                            <Badge className="bg-red-600 text-white border-transparent text-[9px] font-black px-3 py-1 animate-pulse uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(220,38,38,0.4)] rounded-full">
                                EN VIVO
                            </Badge>
                        ) : (
                            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/40 shadow-inner">
                                {new Date(match.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Central Compact Layout */}
                <div className="flex items-center justify-center gap-4 sm:gap-8 relative z-10 w-full px-1 sm:px-0 mb-1">
                    {/* Team A */}
                    <div className="flex flex-col items-center gap-2 w-[80px] sm:w-[100px]">
                        <Avatar
                            name={nameA}
                            src={match.carrera_a?.escudo_url || match.atleta_a?.avatar_url}
                            className={cn(
                                "w-11 h-11 sm:w-14 sm:h-14 border-2 transition-all duration-500 bg-black/20",
                                winnerA ? `scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-500` : "border-white/5",
                                !winnerA && isFinal && !isDraw ? "opacity-20 grayscale-[0.5]" : ""
                            )}
                        />
                        <span className={cn(
                            "text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight line-clamp-2 w-full",
                            winnerA || isDraw || isLive ? "text-white" : "text-white/40"
                        )}>
                            {nameA}
                        </span>
                    </div>

                    {/* The Score Hub */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                        {isFinal || isLive ? (
                            <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 font-black text-3xl sm:text-4xl text-white tracking-tighter tabular-nums">
                                    <span className={winnerB ? "opacity-20" : "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"}>{scoreA ?? 0}</span>
                                    <span className="text-white/10 text-lg -mt-0.5">:</span>
                                    <span className={winnerA ? "opacity-20" : "drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"}>{scoreB ?? 0}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tighter mb-1 mt-1 font-mono">
                                {new Date(match.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        )}
                        {match.genero && (
                            <div className={cn(
                                "text-[7px] sm:text-[8px] font-black tracking-[0.2em] uppercase transition-all mt-2",
                                match.genero === 'femenino' ? "text-pink-400" : match.genero === 'mixto' ? "text-purple-400" : "text-blue-400"
                            )}>
                                {match.genero}
                            </div>
                        )}
                    </div>

                    {/* Team B */}
                    <div className="flex flex-col items-center gap-2 w-[80px] sm:w-[100px]">
                        <Avatar
                            name={nameB}
                            src={match.carrera_b?.escudo_url || match.atleta_b?.avatar_url}
                            className={cn(
                                "w-11 h-11 sm:w-14 sm:h-14 border-2 transition-all duration-500 bg-black/20",
                                winnerB ? `scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-500` : "border-white/5",
                                !winnerB && isFinal && !isDraw ? "opacity-20 grayscale-[0.5]" : ""
                            )}
                        />
                        <span className={cn(
                            "text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight line-clamp-2 w-full",
                            winnerB || isDraw || isLive ? "text-white" : "text-white/40"
                        )}>
                            {nameB}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function TabButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 px-2 rounded-2xl transition-all relative overflow-hidden group min-w-[70px]",
                active
                    ? "text-white bg-white/5 shadow-inner"
                    : "text-white/40 hover:bg-white/5 hover:text-white"
            )}
        >
            <div className="relative z-10 transition-transform group-hover:scale-110">
                {icon}
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest relative z-10">
                {label}
            </span>
            {active && (
                <motion.div
                    layoutId="teamTabMarker"
                    className="absolute inset-0 bg-gradient-to-t from-violet-600/20 to-transparent border-b-2 border-violet-500"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
            )}
        </button>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeamProfilePage() {
    const params = useParams();
    const router = useRouter();
    const delegacionId = params.id ? Number(params.id) : null;

    const { user, profile, isStaff } = useAuth();
    const { delegacion, carreras, matches, athletes, stats, loading, error } =
        useTeamProfile(delegacionId);

    const [activeTab, setActiveTab] = useState<"partidos" | "plantilla">("partidos");

    // ─── Derived data ────────────────────────────────────────────────────────

    const groupedFilteredMatches = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        matches.forEach((match: any) => {
            const fecha = (match.fecha || '').split('T')[0];
            if (!fecha) return;
            if (!groups[fecha]) groups[fecha] = [];
            groups[fecha].push(match);
        });

        return Object.keys(groups).sort((a, b) => a.localeCompare(b)).map(fecha => {
            const dateObj = new Date(fecha + 'T12:00:00');
            let label = dateObj.toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'short',
            });

            const isToday = fecha === todayStr;
            const isYesterday = fecha === yesterdayStr;
            const isTomorrow = fecha === tomorrowStr;

            if (isToday) label = `HOY — ${label}`;
            else if (isYesterday) label = `Ayer — ${label}`;
            else if (isTomorrow) label = `Mañana — ${label}`;

            const sorted = groups[fecha].sort((a: any, b: any) => {
                const order: Record<string, number> = { en_curso: 0, programado: 1, finalizado: 2 };
                const oA = order[(a.estado || '').toLowerCase().trim()] ?? 99;
                const oB = order[(b.estado || '').toLowerCase().trim()] ?? 99;
                if (oA !== oB) return oA - oB;
                return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
            });

            return { fecha, label, partidos: sorted, isToday };
        });
    }, [matches]);

    useEffect(() => {
        if (activeTab !== "partidos" || loading || groupedFilteredMatches.length === 0) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const target = groupedFilteredMatches.find(g => g.fecha >= todayStr)?.fecha;
        if (target) {
            setTimeout(() => {
                const el = document.getElementById(`team-date-${target}`);
                if (el) {
                    const offset = window.innerWidth < 768 ? 80 : 120;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elRect = el.getBoundingClientRect().top;
                    window.scrollTo({ top: elRect - bodyRect - offset, behavior: 'auto' });
                }
            }, 150);
        }
    }, [activeTab, loading, groupedFilteredMatches.length]);

    // ─── Loading / Error ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    if (!delegacion || error) {
        return (
            <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                    <ShieldHalf className="text-white/40" size={32} />
                </div>
                <h1 className="text-2xl font-black mb-2 font-display uppercase tracking-wider text-center">
                    Equipo no encontrado
                </h1>
                <p className="text-white/40 mb-8 max-w-sm text-center font-bold italic">
                    La delegación o equipo deportivo que buscas no existe.
                </p>
                <Button
                    onClick={() => router.back()}
                    className="rounded-2xl px-8 h-12 bg-violet-600 text-white font-black uppercase tracking-widest hover:bg-violet-700 shadow-lg shadow-violet-600/20"
                >
                    <ChevronLeft className="mr-2" size={18} /> Volver atrás
                </Button>
            </div>
        );
    }

    const sportName = delegacion.disciplinas?.name || "Multideporte";
    const sportAccent = SPORT_ACCENT[sportName] || "text-white/60";
    const sportGradient = SPORT_GRADIENT[sportName] || "from-white/10 to-transparent";
    const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 overflow-x-hidden relative font-sans">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-20 relative z-10">
                {/* Back button */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-violet-600 group-hover:text-white group-hover:border-transparent transition-all shadow-xl">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>
                </div>

                {/* ═══ HERO SECTION ═══ */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative mb-8 sm:mb-12"
                >
                    <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl p-6 sm:p-10 flex flex-col items-center text-center">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
                        
                        {/* Allied Career Badges */}
                        <div className="flex -space-x-4 mb-6 mt-4 hover:-space-x-2 transition-all duration-300">
                            {carreras.map((c: any, i: number) => (
                                <Link href={`/carrera/${c.id}`} key={c.id} className="relative z-10 hover:z-20 group/badge block">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center p-2 shadow-2xl ring-4 ring-black/20 transform group-hover/badge:scale-110 group-hover/badge:-translate-y-2 transition-all duration-300">
                                        {c.escudo_url ? (
                                            <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain" />
                                        ) : (
                                            <ShieldHalf size={24} className="text-white/10" />
                                        )}
                                        {/* Tooltip */}
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                            {c.nombre}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Team Name & Sport Info */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 shadow-inner">
                            <SportIcon sport={sportName} size={16} className={sportAccent} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                                {sportName} {delegacion.genero && delegacion.genero !== 'mixto' ? `• ${delegacion.genero}` : ''}
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tighter font-display mb-8 leading-tight text-white drop-shadow-2xl max-w-2xl px-2 uppercase">
                            {delegacion.nombre}
                        </h1>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
                            {/* Record */}
                            <div className="col-span-2 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl py-3 px-4 shadow-inner relative overflow-hidden">
                                <div className="flex items-center gap-4 sm:gap-6 w-full justify-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">{stats.won}</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">W</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl sm:text-2xl font-black text-white/20 tabular-nums">{stats.draw}</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">D</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl sm:text-2xl font-black text-rose-500 tabular-nums">{stats.lost}</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">L</span>
                                    </div>
                                </div>
                            </div>

                            {/* Played */}
                            <div className="col-span-1 flex flex-col items-center justify-center bg-black/20 border border-white/10 rounded-2xl py-3 px-4 shadow-sm group/played transition-colors hover:bg-white/5">
                                <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tighter group-hover:text-violet-400 transition-colors">{stats.played}</span>
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Jugados</span>
                            </div>

                            {/* Win Rate */}
                            <div className="col-span-1 flex flex-col items-center justify-center bg-violet-600 border border-transparent rounded-2xl py-3 px-4 shadow-xl shadow-violet-600/20">
                                <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tighter">{winRate}%</span>
                                <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">Victoria</span>
                            </div>
                        </div>

                    </div>
                </motion.div>

                {/* ═══ TABS ═══ */}
                <div className="flex gap-1 p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl mb-10 overflow-x-auto no-scrollbar max-w-sm mx-auto shadow-xl">
                    <TabButton
                        active={activeTab === "partidos"}
                        onClick={() => setActiveTab("partidos")}
                        icon={<Swords size={18} />}
                        label="Partidos"
                    />
                    <TabButton
                        active={activeTab === "plantilla"}
                        onClick={() => setActiveTab("plantilla")}
                        icon={<Users2 size={18} />}
                        label="Plantilla"
                    />
                </div>

                {/* ═══ TAB CONTENT ═══ */}
                <div className="min-h-[400px]">
                    {/* ─── PARTIDOS TAB ─── */}
                    {activeTab === "partidos" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6"
                        >
                            {groupedFilteredMatches.length === 0 ? (
                                <EmptyState
                                    icon={<Swords size={48} className="text-white/10" />}
                                    title="Sin partidos"
                                    description="Este equipo aún no tiene partidos programados."
                                />
                            ) : (
                                <div className="space-y-12">
                                    {groupedFilteredMatches.map((group) => (
                                        <section
                                            key={group.fecha}
                                            id={`team-date-${group.fecha}`}
                                            className="scroll-mt-24"
                                        >
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className={cn(
                                                    "h-px flex-1 bg-gradient-to-r from-transparent",
                                                    group.isToday ? "via-red-400/50 to-red-500" : "via-white/5 to-white/10"
                                                )} />
                                                <h2 className={cn(
                                                    "text-[10px] font-black px-5 py-2 rounded-full border backdrop-blur-md uppercase tracking-[0.25em] transition-all",
                                                    group.isToday
                                                        ? "text-white border-red-500 bg-red-500 shadow-[0_5px_15px_rgba(239,68,68,0.3)] scale-105"
                                                        : "text-white/40 border-white/10 bg-white/5 shadow-inner"
                                                )}>
                                                    {group.isToday && <span className="mr-2 text-red-500">●</span>}
                                                    {group.label}
                                                </h2>
                                                <div className={cn(
                                                    "h-px flex-1 bg-gradient-to-l from-transparent",
                                                    group.isToday ? "via-red-400/50 to-red-500" : "via-white/5 to-white/10"
                                                )} />
                                            </div>

                                            <div className="space-y-3">
                                                {group.partidos.map((m: any) => (
                                                    <MatchRow
                                                        key={m.id}
                                                        match={m}
                                                        carreraName={delegacion?.nombre}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ─── PLANTILLA TAB ─── */}
                    {activeTab === "plantilla" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6"
                        >
                             <div className="flex items-center justify-between px-2 mb-4">
                                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                                    <Users2 size={24} className={sportAccent} />
                                    Plantilla Consolidada
                                </h2>
                                <Badge className="bg-white/5 text-white/60 border-white/10 font-black uppercase">
                                    {athletes.length} Jugadores
                                </Badge>
                            </div>

                            {athletes.length === 0 ? (
                                <EmptyState
                                    icon={<Users size={48} className="text-white/10" />}
                                    title="Plantilla Vacía"
                                    description={`Aún no hay deportistas asignados a ${sportName} en las carreras que componen esta delegación.`}
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {athletes.map((a: any) => (
                                        <Link href={`/perfil/${a.id}`} key={a.id} className="group">
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 flex items-center gap-4 shadow-inner">
                                                <Avatar
                                                    name={a.full_name}
                                                    src={a.avatar_url}
                                                    className="w-12 h-12 rounded-xl border border-white/10 bg-black/20 shadow-inner"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold tracking-tight truncate group-hover:text-violet-400 transition-colors text-white">
                                                        {a.full_name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {a.points > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                 <Star size={10} className="text-amber-500 fill-amber-500" />
                                                                <span className="text-[10px] font-black text-amber-500/80 tabular-nums">{a.points} pts</span>
                                                            </div>
                                                        )}
                                                        {a.disciplina && (
                                                            <span className="text-[9px] font-black uppercase text-white/30 truncate hidden sm:block">
                                                                {a.disciplina.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowUpRight size={16} className="text-white/10 group-hover:text-violet-400 transition-colors shrink-0" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
