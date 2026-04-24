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
import { getCurrentScore } from "@/lib/sport-scoring";
import { SafeBackButton } from "@/shared/components/safe-back-button";
import { ResilienceUI } from "@/components/resilience-ui";
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
    const { scoreA, scoreB } = getCurrentScore(disc || '', det);

    const isLive = estado === "en_curso";
    const isFinal = estado === "finalizado";

    const accent = SPORT_ACCENT[disc || ""] || "text-white/60";

    // Winner calculations
    const scoreNumA = typeof scoreA === 'number' ? scoreA : parseInt(scoreA) || 0;
    const scoreNumB = typeof scoreB === 'number' ? scoreB : parseInt(scoreB) || 0;
    const hasPenales = det.penales_a != null && det.penales_b != null;
    const isDraw = isFinal && scoreNumA === scoreNumB && !hasPenales;
    const winnerA = isFinal && (scoreNumA > scoreNumB || (scoreNumA === scoreNumB && hasPenales && det.penales_a > det.penales_b));
    const winnerB = isFinal && (scoreNumB > scoreNumA || (scoreNumA === scoreNumB && hasPenales && det.penales_b > det.penales_a));

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

                {/* Ambient Background - Large Sport Watermark (DEEP ZOOM) */}
                <div className="absolute -right-[10%] -bottom-[15%] flex items-center justify-center pointer-events-none select-none opacity-[0.05] group-hover/match:opacity-[0.08] transition-all duration-1000 rotate-[-12deg]">
                    <SportIcon sport={disc || ""} size={220} className={cn("transition-all duration-[1500ms] group-hover:scale-110", accent)} />
                </div>

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
                        {hasPenales && (
                            <div className="text-[9px] font-bold text-violet-400/70 tabular-nums tracking-tight mt-1">
                                Pen. {det.penales_a}–{det.penales_b}
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
    const { delegacion, carreras, matches, athletes, stats, loading, error, mutate } =
        useTeamProfile(delegacionId);

    const [activeTab, setActiveTab] = useState<"partidos" | "plantilla">("partidos");
    const [selectedGender, setSelectedGender] = useState<string>("todos");
    const [loadTimeout, setLoadTimeout] = useState(false);

    // Resilience: If loading takes > 8s, offer a retry
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("[TeamProfile] Load exceeded 8s timeout, showing Retry UI");
                setLoadTimeout(true);
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [loading]);

    const filteredMatches = useMemo(() => {
        if (!matches) return [];
        let results = matches;
        if (selectedGender !== "todos") {
            results = results.filter((m) => (m.genero || "").toLowerCase() === selectedGender);
        }
        return results;
    }, [matches, selectedGender]);

    const groupedFilteredMatches = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const today = new Date().toISOString().split("T")[0];

        filteredMatches.forEach((m) => {
            const dateStr = new Date(m.fecha).toISOString().split("T")[0];
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(m);
        });

        return Object.keys(groups)
            .sort((a, b) => a.localeCompare(b))
            .map((date) => {
                const dateObj = new Date(date + "T12:00:00Z");
                return {
                    fecha: date,
                    isToday: date === today,
                    label: dateObj.toLocaleDateString("es-CO", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                    }),
                    partidos: groups[date],
                };
            });
    }, [filteredMatches]);

    if (loadTimeout && loading && !delegacion) {
        return (
            <ResilienceUI 
                title="Conexión Lenta"
                description="La información del equipo está tardando en cargar. Esto puede deberse a tu conexión o a un retraso en el servidor."
                onRetry={() => {
                    setLoadTimeout(false);
                    mutate();
                }}
                backFallback="/clasificacion"
                retryLabel="REINTENTAR CARGA"
            />
        );
    }

    if (loading && !delegacion) return <div className="min-h-screen flex items-center justify-center bg-background"><UniqueLoading size="lg" /></div>;

    if (!delegacion || error) {
        return (
            <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
                    <ShieldHalf className="text-white/20" size={40} />
                </div>
                <h1 className="text-3xl font-black mb-3 font-display uppercase tracking-widest text-center text-white/90">Equipo no encontrado</h1>
                <p className="text-white/40 mb-10 max-w-sm text-center font-bold italic text-sm">La delegación o equipo deportivo que buscas no se encuentra disponible actualmente.</p>
                <SafeBackButton fallback="/clasificacion" className="shadow-none rounded-2xl px-10 h-14 bg-violet-600 text-white font-black uppercase tracking-widest hover:bg-violet-700 shadow-2xl shadow-violet-600/30" label="Volver a Clasificación" />
            </div>
        );
    }



 
     const sportName = delegacion.disciplinas?.name || "Multideporte";
    const sportAccent = SPORT_ACCENT[sportName] || "text-white/60";
    const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 overflow-x-hidden relative font-sans">
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[180px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-32 relative z-10">
                <div className="mb-8 font-display">
                    <SafeBackButton fallback="/clasificacion" variant="ghost" label="Regresar" />
                </div>

                {/* ═══ HERO SECTION ═══ */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative mb-12 sm:mb-16">
                    <div className="relative bg-white/[0.04] backdrop-blur-3xl border border-white/10 rounded-[4rem] overflow-hidden shadow-2xl p-8 sm:p-14 flex flex-col items-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
                        
                        {/* Team Name Header */}
                        <div className="flex flex-col items-center text-center w-full z-10 mb-10">
                            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-black/40 border border-white/10 mb-8 shadow-2xl backdrop-blur-xl">
                                <SportIcon sport={sportName} size={20} className={sportAccent} />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50 font-display">
                                    {sportName} {delegacion.genero && delegacion.genero !== 'mixto' ? `• ${delegacion.genero}` : ''}
                                </span>
                            </div>

                            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter mb-4 leading-[0.85] text-white drop-shadow-[0_15px_40px_rgba(0,0,0,0.6)] uppercase font-sans">
                                {delegacion.nombre}
                            </h1>
                            
                            <div className="h-1.5 w-32 bg-violet-600 rounded-full mb-12 shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
                        </div>

                        {/* Allied Career Grid - Modernized */}
                        <div className="w-full max-w-3xl flex flex-col items-center gap-6 z-10 mb-14">
                            <div className="flex items-center gap-4 w-full">
                                <div className="h-px flex-1 bg-white/10" />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] font-display whitespace-nowrap">Composición de Delegación</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                                {carreras.map((c: any) => (
                                    <Link href={`/carrera/${c.id}`} key={c.id} className="group/car block">
                                        <div className="relative p-5 rounded-[2.5rem] bg-black/40 border border-white/10 hover:border-violet-500/50 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col items-center text-center">
                                            <div className="absolute inset-0 bg-violet-600/0 group-hover/car:bg-violet-600/5 transition-colors" />
                                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 mb-4 p-4 flex items-center justify-center group-hover/car:scale-110 group-hover/car:border-violet-500/30 transition-all duration-500 shadow-inner">
                                                {c.escudo_url ? (
                                                    <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain filter brightness-110" />
                                                ) : (
                                                    <ShieldHalf size={32} className="text-white/10" />
                                                )}
                                            </div>
                                            <h4 className="text-[12px] font-black text-white group-hover/car:text-violet-400 transition-colors uppercase tracking-widest leading-tight mb-4 px-2 line-clamp-2 h-8 flex items-center justify-center">
                                                {c.nombre}
                                            </h4>
                                            <div className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover/car:bg-violet-600 group-hover/car:text-white group-hover/car:border-transparent transition-all shadow-xl flex items-center justify-center gap-2">
                                                Ver Perfil <ArrowUpRight size={12} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Stats Dashboard */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl z-10">
                            <div className="col-span-2 flex items-center justify-center gap-8 bg-black/60 border border-white/10 rounded-[2.5rem] py-6 px-4 shadow-2xl backdrop-blur-xl">
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums tracking-tighter">{stats.won}</span>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">Victories</span>
                                </div>
                                <div className="w-px h-10 bg-white/5" />
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl sm:text-4xl font-black text-white/30 tabular-nums tracking-tighter">{stats.draw}</span>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">Draws</span>
                                </div>
                                <div className="w-px h-10 bg-white/5" />
                                <div className="flex flex-col items-center">
                                    <span className="text-3xl sm:text-4xl font-black text-rose-500 tabular-nums tracking-tighter">{stats.lost}</span>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">Defeats</span>
                                </div>
                            </div>

                            <div className="col-span-1 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[2.5rem] py-6 px-4 shadow-xl group/stats hover:bg-white/10 transition-all backdrop-blur-xl">
                                <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter group-hover:text-violet-400 transition-colors">{stats.played}</span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Played</span>
                            </div>

                            <div className="col-span-1 flex flex-col items-center justify-center bg-[#F5F5DC] border border-transparent rounded-[2.5rem] py-6 px-4 shadow-2xl shadow-violet-600/30">
                                <span className="text-3xl sm:text-4xl font-black text-violet-900 tracking-tighter">{winRate}%</span>
                                <span className="text-[10px] font-black text-violet-900/40 uppercase tracking-[0.2em] mt-1">Win Rate</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ═══ TABS SECTION ═══ */}
                <div className="flex flex-col items-center gap-10 mb-14">
                    <div className="flex w-full max-w-sm p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                        {[
                            { id: "partidos", label: "Partidos", icon: Swords },
                            { id: "plantilla", label: "Plantilla", icon: Users2 },
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-500 font-display relative",
                                        isActive ? "text-white scale-105" : "text-white/30 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div layoutId="teamActiveTab" className="absolute inset-0 bg-violet-600 rounded-2xl shadow-xl shadow-violet-600/30" />
                                    )}
                                    <Icon size={16} className="relative z-10" />
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ═══ CONTENT AREA ═══ */}
                <div className="min-h-[500px]">
                    {activeTab === "partidos" && (
                        <div className="space-y-16">
                            {groupedFilteredMatches.length === 0 ? (
                                <EmptyState icon={<Swords size={48} className="text-white/10" />} title="Sin partidos" description="Este equipo aún no tiene encuentros programados en el calendario." />
                            ) : (
                                groupedFilteredMatches.map((group) => (
                                    <section key={group.fecha} id={`team-date-${group.fecha}`} className="scroll-mt-32">
                                        <div className="flex items-center gap-6 mb-8 group/date">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-white/20" />
                                            <h2 className={cn(
                                                "text-[11px] font-black px-8 py-3 rounded-2xl border backdrop-blur-md uppercase tracking-[0.3em] font-display transition-all",
                                                group.isToday ? "bg-red-600 border-red-500 text-white shadow-2xl shadow-red-600/20 scale-110" : "bg-white/5 border-white/10 text-white/50"
                                            )}>
                                                {group.label}
                                            </h2>
                                            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-white/20" />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {group.partidos.map((m: any) => <MatchRow key={m.id} match={m} />)}
                                        </div>
                                    </section>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === "plantilla" && (
                        <div className="space-y-10">
                            <div className="flex items-center gap-4 w-full">
                                <div className="h-px flex-1 bg-white/10" />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] font-display whitespace-nowrap">Roster de Atletas</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>
                            
                            {athletes.length === 0 ? (
                                <EmptyState icon={<Users2 size={48} className="text-white/10" />} title="Roster Vacío" description="No hay deportistas vinculados a este equipo en este momento." />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {athletes.map((a: any) => (
                                        <Link href={a.isProfile ? `/perfil/${a.id}` : '#'} key={a.id} className={cn("group/ath block", !a.isProfile && "cursor-default")}>
                                            <div className="p-5 rounded-[2rem] bg-black/40 border border-white/5 hover:border-violet-500/30 transition-all duration-500 flex items-center gap-4 shadow-xl relative overflow-hidden">
                                                <div className="absolute inset-0 bg-violet-600/0 group-hover/ath:bg-violet-600/5 transition-colors" />
                                                <Avatar name={a.full_name} src={a.avatar_url} className="w-16 h-16 rounded-[1.2rem] border border-white/10 bg-black/60 shadow-2xl transition-transform group-hover/ath:scale-105" />
                                                <div className="flex-1 min-w-0 z-10">
                                                    <h4 className="text-[13px] font-black tracking-tight truncate group-hover/ath:text-violet-400 transition-colors text-white uppercase font-sans">
                                                        {a.full_name}
                                                    </h4>
                                                    <div className="flex items-center gap-2.5 mt-2">
                                                        {a.isProfile ? (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">ACTIVO</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">REGISTRADO</span>
                                                        )}
                                                        {a.points > 0 && (
                                                            <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                                <Star size={8} className="text-amber-500 fill-amber-500" />
                                                                <span className="text-[9px] font-black text-amber-500 tabular-nums">{a.points}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {a.isProfile && <ArrowUpRight size={16} className="text-white/10 group-hover/ath:text-violet-400 group-hover/ath:translate-x-1 group-hover/ath:-translate-y-1 transition-all shrink-0" />}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
