"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTeamProfile } from "@/modules/teams/hooks/use-team-profile";
import { MainNavbar } from "@/components/main-navbar";
import { SportIcon } from "@/components/sport-icons";
import { Avatar, Badge, Button } from "@/components/ui-primitives";
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
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-white/30 mb-2">{title}</h3>
            <p className="text-white/20 text-sm max-w-md">{description}</p>
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
    const border = SPORT_BORDER[disc || ""] || "border-white/5";

    // Winner calculations
    const scoreNumA = typeof scoreA === 'number' ? scoreA : parseInt(scoreA) || 0;
    const scoreNumB = typeof scoreB === 'number' ? scoreB : parseInt(scoreB) || 0;
    const isDraw = isFinal && scoreNumA === scoreNumB;
    const winnerA = isFinal && scoreNumA > scoreNumB;
    const winnerB = isFinal && scoreNumB > scoreNumA;

    return (
        <Link href={`/partido/${match.id}`} className="block group/match">
            <div className={cn(
                "relative flex flex-col p-4 sm:p-5 rounded-[1.5rem] border transition-all duration-500 overflow-hidden hover:shadow-2xl hover:-translate-y-0.5",
                border,
                "bg-gradient-to-br from-white/[0.04] via-[#0d0a0e] to-[#0d0a0e]"
            )}>
                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none mix-blend-overlay" />
                {/* Sport Gradient Wash */}
                <div className={cn(
                    "absolute inset-0 opacity-[0.07] pointer-events-none bg-gradient-to-br",
                    SPORT_GRADIENT[disc || ""] || "from-white/10 to-transparent"
                )} />
                {/* Glow Blob */}
                <div
                    className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 opacity-15 group-hover/match:opacity-30"
                    style={{ backgroundColor: SPORT_COLORS[disc || ""] || '#ffffff10' }}
                />
                <div
                    className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-opacity duration-700 opacity-5 group-hover/match:opacity-15"
                    style={{ backgroundColor: SPORT_COLORS[disc || ""] || '#ffffff05' }}
                />
                {/* Bottom Accent Stripe */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] opacity-30 group-hover/match:opacity-60 transition-opacity"
                    style={{ backgroundColor: SPORT_COLORS[disc || ""] || '#ffffff10' }}
                />

                {/* Top Header Row (Asymmetrical) */}
                <div className="flex items-center justify-between w-full mb-3 z-10">
                    {/* Sport Badge (Top Left) */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center border shadow-inner transition-colors",
                            isLive ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-white/10"
                        )}>
                            {disc ? <SportIcon sport={disc} size={12} className={isLive ? "text-red-500 animate-pulse" : accent} /> : <Swords size={12} className="text-white/30" />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{disc || 'Evento'}</span>
                    </div>

                    {/* Status/Date Pill (Top Right) */}
                    <div>
                        {isLive ? (
                            <Badge className="bg-red-500/20 text-red-500 border border-red-500/30 text-[9px] font-black px-3 py-1 animate-pulse uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(239,68,68,0.2)] rounded-full">
                                DIRECTO
                            </Badge>
                        ) : (
                            <div className="bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-white/30 shadow-inner">
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
                                "w-11 h-11 sm:w-14 sm:h-14 border-2 transition-all duration-500 bg-[#0a0805]",
                                winnerA ? `scale-105 shadow-lg ${border.replace('border-', 'border-')}` : "border-white/5",
                                !winnerA && isFinal && !isDraw ? "opacity-50 grayscale-[0.8]" : ""
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
                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 font-black text-3xl sm:text-4xl text-white tracking-tighter tabular-nums drop-shadow-xl">
                                    <span className={winnerB ? "opacity-30" : ""}>{scoreA ?? 0}</span>
                                    <span className="text-white/10 text-lg -mt-0.5">:</span>
                                    <span className={winnerA ? "opacity-30" : ""}>{scoreB ?? 0}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tighter drop-shadow-xl mb-1 mt-1">
                                {new Date(match.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        )}
                        {match.genero && (
                            <div className={cn(
                                "text-[7px] sm:text-[8px] font-black tracking-[0.2em] uppercase transition-all mt-2",
                                match.genero === 'femenino' ? "text-pink-500/80" : match.genero === 'mixto' ? "text-purple-500/80" : "text-blue-500/80"
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
                                "w-11 h-11 sm:w-14 sm:h-14 border-2 transition-all duration-500 bg-[#0a0805]",
                                winnerB ? `scale-105 shadow-lg ${border.replace('border-', 'border-')}` : "border-white/5",
                                !winnerB && isFinal && !isDraw ? "opacity-50 grayscale-[0.8]" : ""
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
                    ? "text-red-400 bg-red-500/10"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
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
                    className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent border-b-2 border-red-500"
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

        return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(fecha => {
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
            <div className="min-h-screen flex items-center justify-center bg-[#0a0816]">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    if (!delegacion || error) {
        return (
            <div className="min-h-screen bg-[#0a0816] text-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldHalf className="text-red-500" size={32} />
                </div>
                <h1 className="text-2xl font-black mb-2 font-outfit uppercase tracking-wider text-center">
                    Equipo no encontrado
                </h1>
                <p className="text-white/40 mb-8 max-w-sm text-center font-bold">
                    La delegación o equipo deportivo que buscas no existe.
                </p>
                <Button
                    onClick={() => router.back()}
                    className="rounded-2xl px-8 h-12 bg-white text-black font-black uppercase tracking-widest hover:bg-slate-200"
                >
                    <ChevronLeft className="mr-2" size={18} /> Volver atrás
                </Button>
            </div>
        );
    }

    const sportName = delegacion.disciplinas?.name || "Multideporte";
    const sportAccent = SPORT_ACCENT[sportName] || "text-red-400";
    const sportGradient = SPORT_GRADIENT[sportName] || "from-red-600 to-orange-500";
    const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#0a0816] text-white selection:bg-red-500/30 texture-grain overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.15 }}>
                <div className={`absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br ${sportGradient} rounded-full blur-[150px]`} />
                <div className={`absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br ${sportGradient} rounded-full blur-[150px]`} />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-20 relative z-10">
                {/* Back button */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-red-500 group-hover:text-black transition-all">
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
                    <div className={`absolute -inset-1 sm:-inset-2 bg-gradient-to-r ${sportGradient} rounded-[2.5rem] sm:rounded-[3rem] blur-xl opacity-20 sm:opacity-30 group-hover:opacity-40 transition-opacity duration-700`} />
                    
                    <div className="relative bg-[#0a0805]/95 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl p-6 sm:p-10 flex flex-col items-center text-center">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
                        
                        {/* Allied Career Badges */}
                        <div className="flex -space-x-4 mb-6 mt-4 hover:-space-x-2 transition-all duration-300">
                            {carreras.map((c: any, i: number) => (
                                <Link href={`/carrera/${c.id}`} key={c.id} className="relative z-10 hover:z-20 group/badge block">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-xl ring-4 ring-[#0a0805] transform group-hover/badge:scale-110 group-hover/badge:-translate-y-2 transition-all duration-300">
                                        {c.escudo_url ? (
                                            <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain filter contrast-125" />
                                        ) : (
                                            <ShieldHalf size={24} className="text-white/20" />
                                        )}
                                        {/* Tooltip */}
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                            {c.nombre}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Team Name & Sport Info */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 shadow-lg">
                            <SportIcon sport={sportName} size={16} className={sportAccent} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                                {sportName} {delegacion.genero && delegacion.genero !== 'mixto' ? `• ${delegacion.genero}` : ''}
                            </span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tighter font-outfit mb-8 leading-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm max-w-2xl px-2">
                            {delegacion.nombre}
                        </h1>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
                            {/* Record */}
                            <div className="col-span-2 flex flex-col items-center justify-center bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 shadow-inner relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${sportGradient} opacity-10 blur-2xl rounded-full`} />
                                <div className="flex items-center gap-4 sm:gap-6 w-full justify-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">{stats.won}</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">W</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl sm:text-2xl font-black text-white/40 tabular-nums">{stats.draw}</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">D</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl sm:text-2xl font-black text-red-500 tabular-nums">{stats.lost}</span>
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">L</span>
                                    </div>
                                </div>
                            </div>

                            {/* Played */}
                            <div className="col-span-1 flex flex-col items-center justify-center bg-white/[0.02] border border-white/5 rounded-2xl py-3 px-4 shadow-inner">
                                <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tighter">{stats.played}</span>
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Jugados</span>
                            </div>

                            {/* Win Rate */}
                            <div className="col-span-1 flex flex-col items-center justify-center bg-emerald-500/5 border border-emerald-500/10 rounded-2xl py-3 px-4 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums tracking-tighter">{winRate}%</span>
                                <span className="text-[9px] font-black text-emerald-400/50 uppercase tracking-[0.2em] mt-1">Victoria</span>
                            </div>
                        </div>

                    </div>
                </motion.div>

                {/* ═══ TABS ═══ */}
                <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-3xl mb-10 overflow-x-auto no-scrollbar max-w-sm mx-auto">
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
                                                    group.isToday ? "via-red-500/50 to-red-500/80" : "via-white/5 to-white/10"
                                                )} />
                                                <h2 className={cn(
                                                    "text-[10px] font-black px-5 py-2 rounded-full border backdrop-blur-md uppercase tracking-[0.25em] transition-all",
                                                    group.isToday
                                                        ? "text-white border-red-500/50 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)] scale-105"
                                                        : "text-white/50 border-white/10 bg-white/5"
                                                )}>
                                                    {group.isToday && <span className="mr-2 text-red-400">●</span>}
                                                    {group.label}
                                                </h2>
                                                <div className={cn(
                                                    "h-px flex-1 bg-gradient-to-l from-transparent",
                                                    group.isToday ? "via-red-500/50 to-red-500/80" : "via-white/5 to-white/10"
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
                                <Badge className="bg-white/5 text-white/50 border-white/10 font-black uppercase">
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
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-4">
                                                <Avatar
                                                    name={a.full_name}
                                                    src={a.avatar_url}
                                                    className="w-12 h-12 rounded-xl border border-white/5 shadow-inner"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold tracking-tight truncate group-hover:text-red-400 transition-colors">
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
                                                <ArrowUpRight size={16} className="text-white/10 group-hover:text-red-500 transition-colors shrink-0" />
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
