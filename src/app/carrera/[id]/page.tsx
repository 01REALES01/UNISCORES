"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useCarreraProfile } from "@/hooks/use-carrera-profile";
import { MainNavbar } from "@/components/main-navbar";
import { NewsListCard } from "@/components/news-card";
import { SportIcon } from "@/components/sport-icons";
import { Avatar, Badge, Button } from "@/components/ui-primitives";
import UniqueLoading from "@/components/ui/morph-loading";
import { cn } from "@/lib/utils";
import {
    SPORT_EMOJI,
    SPORT_ACCENT,
    SPORT_GRADIENT,
    SPORT_BORDER,
    SPORT_COLORS,
} from "@/lib/constants";
import { getDisplayName, getCarreraSubtitle } from "@/lib/sport-helpers";
import {
    Trophy,
    Medal,
    Award,
    Star,
    ChevronLeft,
    Swords,
    Newspaper,
    Users,
    Target,
    Calendar,
    ArrowUpRight,
    Loader2,
    GraduationCap,
    Activity,
    Flame,
    ChevronDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CarreraTab = "partidos" | "deportes" | "noticias" | "deportistas";



// ─── Sport-Grouped Athletes Component ─────────────────────────────────────────

function SportGroupedAthletes({ athletes }: { athletes: any[] }) {
    const [openSports, setOpenSports] = useState<Record<string, boolean>>({});

    // Group athletes by sport
    const grouped = useMemo(() => {
        const map: Record<string, any[]> = {};
        for (const a of athletes) {
            const sport = a.disciplina?.name || "Multideporte";
            if (!map[sport]) map[sport] = [];
            map[sport].push(a);
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [athletes]);

    const toggle = (sport: string) =>
        setOpenSports((prev) => ({ ...prev, [sport]: !prev[sport] }));

    return (
        <div className="space-y-3">
            {grouped.map(([sport, list]) => {
                const isOpen = openSports[sport] ?? false;
                const accent = SPORT_ACCENT[sport] || "text-red-400";

                return (
                    <div key={sport} className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                        {/* Header / Toggle */}
                        <button
                            onClick={() => toggle(sport)}
                            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.04] transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                                    <SportIcon sport={sport} size={16} className={cn("opacity-80", accent)} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black tracking-tight text-white">{sport}</p>
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                        {list.length} deportista{list.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown
                                size={18}
                                className={cn(
                                    "text-white/30 transition-transform duration-300 group-hover:text-white/60",
                                    isOpen && "rotate-180"
                                )}
                            />
                        </button>

                        {/* Collapsible List */}
                        {isOpen && (
                            <div className="border-t border-white/5 px-2 pb-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                    {list.map((a: any) => (
                                        <Link
                                            key={a.id}
                                            href={`/perfil/${a.id}`}
                                            className="group"
                                        >
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 flex items-center gap-3">
                                                <Avatar
                                                    name={a.full_name}
                                                    src={a.avatar_url}
                                                    className="w-11 h-11 rounded-xl border border-white/5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold tracking-tight truncate group-hover:text-red-400 transition-colors">
                                                        {a.full_name}
                                                    </h4>
                                                    {a.points > 0 && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Star
                                                                size={10}
                                                                className="text-amber-500 fill-amber-500"
                                                            />
                                                            <span className="text-[10px] font-black text-amber-500/80 tabular-nums">
                                                                {a.points} pts
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowUpRight
                                                    size={14}
                                                    className="text-white/10 group-hover:text-red-500 transition-colors shrink-0"
                                                />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CarreraProfilePage() {
    const params = useParams();
    const router = useRouter();
    const carreraId = params.id ? Number(params.id) : null;

    const { user, profile, isStaff } = useAuth();
    const { carrera, matches, news, athletes, stats, loading, error } =
        useCarreraProfile(carreraId);

    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<CarreraTab>("partidos");
    const [sportFilter, setSportFilter] = useState<string>("todos");

    useEffect(() => {
        const sport = searchParams.get("sport");
        if (sport) {
            setSportFilter(sport);
        }
    }, [searchParams]);

    // ─── Derived data ────────────────────────────────────────────────────────

    const totalMedals = stats.oro + stats.plata + stats.bronce;

    const availableSports = useMemo(() => {
        const sports = new Set<string>();
        matches.forEach((m: any) => {
            const name =
                (Array.isArray(m.disciplinas)
                    ? m.disciplinas[0]
                    : m.disciplinas
                )?.name;
            if (name) sports.add(name);
        });
        return Array.from(sports).sort();
    }, [matches]);

    const filteredMatches = useMemo(() => {
        return matches.filter((m: any) => {
            if (sportFilter !== "todos") {
                const disc = (
                    Array.isArray(m.disciplinas)
                        ? m.disciplinas[0]
                        : m.disciplinas
                )?.name;
                if (disc !== sportFilter) return false;
            }
            return true;
        });
    }, [matches, sportFilter]);

    // ─── Date-grouped matches (like /partidos) ────────────────────────────

    const groupedFilteredMatches = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        filteredMatches.forEach((match: any) => {
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

            // Internal sorting: en_vivo (0), programado (1), finalizado (2)
            const sorted = groups[fecha].sort((a: any, b: any) => {
                const order: Record<string, number> = { en_vivo: 0, programado: 1, finalizado: 2 };
                const oA = order[(a.estado || '').toLowerCase().trim()] ?? 99;
                const oB = order[(b.estado || '').toLowerCase().trim()] ?? 99;
                if (oA !== oB) return oA - oB;
                return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
            });

            return { fecha, label, partidos: sorted, isToday };
        });
    }, [filteredMatches]);

    // Auto-scroll to today when Partidos tab mounts
    useEffect(() => {
        if (activeTab !== "partidos" || loading || groupedFilteredMatches.length === 0) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const target = groupedFilteredMatches.find(g => g.fecha >= todayStr)?.fecha;
        if (target) {
            setTimeout(() => {
                const el = document.getElementById(`carrera-date-${target}`);
                if (el) {
                    const offset = window.innerWidth < 768 ? 80 : 120;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elRect = el.getBoundingClientRect().top;
                    window.scrollTo({ top: elRect - bodyRect - offset, behavior: 'auto' });
                }
            }, 150);
        }
    }, [activeTab, loading, groupedFilteredMatches.length]);

    const disciplineEntries = useMemo(() => {
        return Object.values(stats.byDiscipline).sort(
            (a, b) =>
                b.oro - a.oro || b.plata - a.plata || b.puntos - a.puntos
        );
    }, [stats.byDiscipline]);

    // ─── Loading / Error ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0805]">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    if (!carrera || error) {
        return (
            <div className="min-h-screen bg-[#0a0805] text-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <GraduationCap className="text-red-500" size={32} />
                </div>
                <h1 className="text-2xl font-black mb-2 font-outfit uppercase tracking-wider">
                    Carrera no encontrada
                </h1>
                <p className="text-white/40 mb-8 max-w-sm text-center font-bold">
                    El programa académico que buscas no existe o no ha
                    participado en eventos.
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

    const getInitials = (name: string) => {
        const parts = name.split(" ");
        if (parts.length > 1)
            return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30 texture-grain overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[150px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-5xl mx-auto px-4 pt-10 pb-20 relative z-10">
                {/* Back button */}
                <div className="mb-8">
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
                    className="relative mb-12"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 rounded-[3rem] blur opacity-20" />
                    <div className="relative bg-[#0d0a07] border border-white/5 rounded-[3rem] p-8 md:p-12 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            {/* Career Avatar */}
                            <div className="relative">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-red-600/30 to-orange-500/20 border-4 border-white/5 flex items-center justify-center shadow-2xl">
                                    <span className="text-5xl md:text-6xl font-black text-white/30 font-outfit">
                                        {getInitials(carrera.nombre)}
                                    </span>
                                </div>
                                <div className="absolute -bottom-3 -right-3 p-3 bg-red-600 text-white rounded-2xl shadow-2xl border-4 border-[#0d0a07]">
                                    <GraduationCap size={20} />
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-2">
                                    Programa Académico
                                </p>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter font-outfit mb-4 leading-tight">
                                    {carrera.nombre}
                                </h1>

                                {/* Stats row */}
                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    {/* Medals */}
                                    <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                                        <Trophy
                                            size={18}
                                            className="text-amber-500"
                                        />
                                        <div className="flex gap-4 items-center">
                                            <span className="flex items-center gap-1">
                                                <span className="text-lg font-black tabular-nums text-amber-400">
                                                    {stats.oro}
                                                </span>
                                                <span className="text-[8px] font-black text-amber-400/60 uppercase">
                                                    Oro
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="text-lg font-black tabular-nums text-slate-300">
                                                    {stats.plata}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400/60 uppercase">
                                                    Plata
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="text-lg font-black tabular-nums text-amber-700">
                                                    {stats.bronce}
                                                </span>
                                                <span className="text-[8px] font-black text-amber-700/60 uppercase">
                                                    Bronce
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Record */}
                                    <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                                        <Swords
                                            size={18}
                                            className="text-red-500"
                                        />
                                        <div className="flex gap-3 text-sm">
                                            <span>
                                                <span className="font-black text-green-400">
                                                    {stats.won}
                                                </span>
                                                <span className="text-[8px] font-bold text-white/30 ml-1 uppercase">
                                                    V
                                                </span>
                                            </span>
                                            <span>
                                                <span className="font-black text-white/40">
                                                    {stats.draw}
                                                </span>
                                                <span className="text-[8px] font-bold text-white/30 ml-1 uppercase">
                                                    E
                                                </span>
                                            </span>
                                            <span>
                                                <span className="font-black text-red-400">
                                                    {stats.lost}
                                                </span>
                                                <span className="text-[8px] font-bold text-white/30 ml-1 uppercase">
                                                    D
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Matches played */}
                                    <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                                        <Activity
                                            size={16}
                                            className="text-white/40"
                                        />
                                        <span className="text-lg font-black tabular-nums">
                                            {stats.played}
                                        </span>
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                                            PJ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ═══ TABS ═══ */}
                <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-3xl mb-10 overflow-x-auto no-scrollbar">
                    <TabButton
                        active={activeTab === "partidos"}
                        onClick={() => setActiveTab("partidos")}
                        icon={<Swords size={18} />}
                        label="Partidos"
                    />
                    <TabButton
                        active={activeTab === "deportes"}
                        onClick={() => setActiveTab("deportes")}
                        icon={<Medal size={18} />}
                        label="Deportes"
                    />
                    <TabButton
                        active={activeTab === "noticias"}
                        onClick={() => setActiveTab("noticias")}
                        icon={<Newspaper size={18} />}
                        label="Noticias"
                    />
                    <TabButton
                        active={activeTab === "deportistas"}
                        onClick={() => setActiveTab("deportistas")}
                        icon={<Users size={18} />}
                        label="Deportistas"
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
                            {/* ── Filters ─────────────────────────────── */}
                            <div className="flex flex-col gap-4">
                                {/* 1) Sport filter (first) */}
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setSportFilter("todos")}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all",
                                            sportFilter === "todos"
                                                ? "bg-red-500 text-white border-red-500"
                                                : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                                        )}
                                    >
                                        Todos
                                    </button>
                                    {availableSports.map((sport) => (
                                        <button
                                            key={sport}
                                            onClick={() => setSportFilter(sport)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all",
                                                sportFilter === sport
                                                    ? "bg-white/10 border-white/20 text-white"
                                                    : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                                            )}
                                        >
                                            <span className="text-sm">
                                                {SPORT_EMOJI[sport] || "🏅"}
                                            </span>
                                            {sport}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Date-grouped matches ───────────────── */}
                            {groupedFilteredMatches.length === 0 ? (
                                <EmptyState
                                    icon={<Swords size={48} className="text-white/10" />}
                                    title="Sin partidos"
                                    description="No hay partidos con estos filtros."
                                />
                            ) : (
                                <div className="space-y-12">
                                    {groupedFilteredMatches.map((group) => (
                                        <section
                                            key={group.fecha}
                                            id={`carrera-date-${group.fecha}`}
                                            className="scroll-mt-24"
                                        >
                                            {/* Date header */}
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

                                            {/* Matches in this date */}
                                            <div className="space-y-3">
                                                {group.partidos.map((m: any) => (
                                                    <MatchRow
                                                        key={m.id}
                                                        match={m}
                                                        carreraName={carrera.nombre}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ─── DEPORTES TAB ─── */}
                    {activeTab === "deportes" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6"
                        >
                            {disciplineEntries.length === 0 ? (
                                <EmptyState
                                    icon={
                                        <Medal
                                            size={48}
                                            className="text-white/10"
                                        />
                                    }
                                    title="Sin participación deportiva"
                                    description="Esta carrera aún no ha participado en ningún deporte."
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {disciplineEntries.map((d) => {
                                        const accent =
                                            SPORT_ACCENT[d.name] ||
                                            "text-white";
                                        const gradient =
                                            SPORT_GRADIENT[d.name] ||
                                            "from-white/10 to-white/5";
                                        const border =
                                            SPORT_BORDER[d.name] ||
                                            "border-white/10";
                                        const winRate =
                                            d.played > 0
                                                ? Math.round(
                                                    (d.won / d.played) * 100
                                                )
                                                : 0;

                                        return (
                                            <div
                                                key={d.name}
                                                className={cn(
                                                    "relative overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 group hover:scale-[1.02] transition-all duration-500",
                                                    gradient,
                                                    border
                                                )}
                                            >
                                                {/* Sport icon bg */}
                                                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <SportIcon
                                                        sport={d.name}
                                                        size={64}
                                                    />
                                                </div>

                                                <div className="relative z-10 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                                                            <SportIcon
                                                                sport={d.name}
                                                                size={22}
                                                            />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-black uppercase tracking-wider font-outfit">
                                                                {d.name}
                                                            </h3>
                                                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                                                {d.played}{" "}
                                                                Partidos
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                                                                V / E / D
                                                            </p>
                                                            <p className="text-sm font-black tabular-nums">
                                                                <span className="text-green-400">
                                                                    {d.won}
                                                                </span>
                                                                <span className="text-white/20">
                                                                    {" / "}
                                                                </span>
                                                                <span className="text-white/40">
                                                                    {d.draw}
                                                                </span>
                                                                <span className="text-white/20">
                                                                    {" / "}
                                                                </span>
                                                                <span className="text-red-400">
                                                                    {d.lost}
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                                                                % Victoria
                                                            </p>
                                                            <p
                                                                className={cn(
                                                                    "text-lg font-black tabular-nums",
                                                                    accent
                                                                )}
                                                            >
                                                                {winRate}%
                                                            </p>
                                                        </div>
                                                        <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
                                                                Medallas
                                                            </p>
                                                            <div className="flex justify-center gap-1.5 text-xs font-black">
                                                                <span className="text-amber-400">
                                                                    🥇{d.oro}
                                                                </span>
                                                                <span className="text-slate-300">
                                                                    🥈{d.plata}
                                                                </span>
                                                                <span className="text-amber-700">
                                                                    🥉{d.bronce}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ─── NOTICIAS TAB ─── */}
                    {activeTab === "noticias" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-4"
                        >
                            {news.length === 0 ? (
                                <EmptyState
                                    icon={
                                        <Newspaper
                                            size={48}
                                            className="text-white/10"
                                        />
                                    }
                                    title="Sin noticias"
                                    description="Aún no hay noticias publicadas para esta carrera."
                                />
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {news.map((n: any) => (
                                        <NewsListCard
                                            key={n.id}
                                            noticia={n}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ─── DEPORTISTAS TAB ─── */}
                    {activeTab === "deportistas" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-4"
                        >
                            {athletes.length === 0 ? (
                                <EmptyState
                                    icon={
                                        <Users
                                            size={48}
                                            className="text-white/10"
                                        />
                                    }
                                    title="Sin deportistas registrados"
                                    description="No hay atletas vinculados a esta carrera aún."
                                />
                            ) : (
                                <SportGroupedAthletes athletes={athletes} />
                            )}
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

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
            role="tab"
            aria-selected={active}
            className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-red-500 outline-none",
                active
                    ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                    : "text-white/40 hover:text-white hover:bg-white/5"
            )}
        >
            {icon}
            <span className="hidden sm:inline font-outfit">{label}</span>
        </button>
    );
}

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

function MatchRow({
    match,
    carreraName,
}: {
    match: any;
    carreraName: string;
}) {
    const estado = (match.estado || "").toLowerCase().trim();
    const disc = (
        Array.isArray(match.disciplinas)
            ? match.disciplinas[0]
            : match.disciplinas
    )?.name;
    const det = match.marcador_detalle || {};

    const nameA = getDisplayName(match, "a");
    const nameB = getDisplayName(match, "b");
    const subA = getCarreraSubtitle(match, "a");
    const subB = getCarreraSubtitle(match, "b");

    const scoreA =
        det.goles_a ??
        det.sets_a ??
        det.total_a ??
        det.puntos_a ??
        det.juegos_a ??
        null;
    const scoreB =
        det.goles_b ??
        det.sets_b ??
        det.total_b ??
        det.puntos_b ??
        det.juegos_b ??
        null;

    const isLive = estado === "en_vivo";
    const isFinal = estado === "finalizado";

    const accent = SPORT_ACCENT[disc || ""] || "text-white/60";
    const border = SPORT_BORDER[disc || ""] || "border-white/5";

    return (
        <Link href={`/partido/${match.id}`} className="block group/match">
            <div
                className={cn(
                    "flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 rounded-2xl bg-white/[0.02] border transition-all duration-300 gap-4",
                    border,
                    "hover:bg-white/[0.04]"
                )}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Sport icon */}
                    <div
                        className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5",
                            isLive
                                ? "bg-red-500/20"
                                : "bg-white/5"
                        )}
                    >
                        {disc ? (
                            <SportIcon sport={disc} size={20} />
                        ) : (
                            <Swords size={16} className="text-white/30" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <p
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    accent
                                )}
                            >
                                {disc || "Deporte"}
                            </p>
                            {isLive && (
                                <Badge className="bg-red-500 text-white border-none text-[8px] font-black px-2 py-0.5 animate-pulse">
                                    EN VIVO
                                </Badge>
                            )}
                            {match.genero && (
                                <span className="text-[9px] font-bold text-white/20">
                                    {match.genero === "masculino"
                                        ? "♂"
                                        : match.genero === "femenino"
                                            ? "♀"
                                            : "⚤"}
                                </span>
                            )}
                        </div>
                        <h5 className="text-sm font-bold truncate">
                            <span
                                className={cn(
                                    nameA
                                        .toLowerCase()
                                        .includes(
                                            carreraName
                                                .toLowerCase()
                                                .substring(0, 8)
                                        )
                                        ? "text-white"
                                        : "text-white/60"
                                )}
                            >
                                {nameA}
                            </span>
                            <span className="text-[10px] text-white/20 mx-2">
                                VS
                            </span>
                            <span
                                className={cn(
                                    nameB
                                        .toLowerCase()
                                        .includes(
                                            carreraName
                                                .toLowerCase()
                                                .substring(0, 8)
                                        )
                                        ? "text-white"
                                        : "text-white/60"
                                )}
                            >
                                {nameB}
                            </span>
                        </h5>
                        {(subA || subB) && (
                            <p className="text-[9px] font-bold text-white/20 mt-0.5 truncate">
                                {subA || ""} vs {subB || ""}
                            </p>
                        )}
                    </div>
                </div>

                {/* Score / Date */}
                <div className="flex items-center gap-4 shrink-0">
                    {isFinal && scoreA !== null && scoreB !== null ? (
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                                Resultado
                            </p>
                            <p className="text-lg font-black tabular-nums">
                                {scoreA} - {scoreB}
                            </p>
                        </div>
                    ) : isLive && scoreA !== null ? (
                        <div className="text-right">
                            <p className="text-lg font-black tabular-nums text-red-400">
                                {scoreA} - {scoreB ?? 0}
                            </p>
                        </div>
                    ) : null}

                    <div className="text-[10px] font-bold text-white/20 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 whitespace-nowrap">
                        {new Date(match.fecha).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                        })}
                    </div>
                </div>
            </div>
        </Link>
    );
}
