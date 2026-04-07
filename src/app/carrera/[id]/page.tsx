"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useCarreraProfile } from "@/modules/users/hooks/use-carrera-profile";
import { MainNavbar } from "@/components/main-navbar";
import { NewsListCard } from "@/components/news-card";
import { FollowCareerButton } from "@/modules/careers/components/follow-career-button";
import { SportIcon } from "@/components/sport-icons";
import { Avatar, Badge, Button } from "@/shared/components/ui-primitives";
import UniqueLoading from "@/components/ui/morph-loading";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
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
    Pencil,
    TrendingUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CarreraTab = "partidos" | "deportes" | "noticias" | "deportistas";



// ─── Jugador (Excel-imported) Card ───────────────────────────────────────────

function JugadorCard({ j }: { j: any }) {
    const href = j.profile_id ? `/perfil/${j.profile_id}` : `/jugador/${j.id}`;
    const activated = !!j.profile_id;
    const initials = (j.nombre || "").split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <Link href={href} className="group">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 flex items-center gap-3 shadow-inner">
                <div className={cn(
                    "w-11 h-11 rounded-xl border flex items-center justify-center text-sm font-black flex-shrink-0",
                    activated 
                        ? "bg-violet-500/20 border-violet-500/30 text-violet-400" 
                        : "bg-white/5 border-white/10 text-white/20"
                )}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={cn(
                        "text-sm font-bold tracking-tight truncate transition-colors",
                        activated ? "text-white group-hover:text-violet-400" : "text-white/40 group-hover:text-white/60"
                    )}>
                        {j.nombre}
                        {j.numero && <span className="ml-1.5 text-white/20 text-[10px] font-mono">#{j.numero}</span>}
                    </h4>
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        activated ? "text-emerald-400" : "text-white/20"
                    )}>
                        {activated ? "Perfil Activo" : "Sin Perfil"}
                    </span>
                </div>
                <ArrowUpRight size={14} className="text-white/10 group-hover:text-emerald-400 transition-colors shrink-0" />
            </div>
        </Link>
    );
}

// ─── Sport-Grouped Athletes Component ─────────────────────────────────────────

function SportGroupedAthletes({ athletes, jugadores }: { athletes: any[]; jugadores: any[] }) {
    const [openSports, setOpenSports] = useState<Record<string, boolean>>({});

    // Group athletes (registered) by sport
    const grouped = useMemo(() => {
        const map: Record<string, { registered: any[]; imported: any[] }> = {};
        for (const a of athletes) {
            const sport = a.disciplina?.name || "Multideporte";
            if (!map[sport]) map[sport] = { registered: [], imported: [] };
            map[sport].registered.push(a);
        }
        // Also group imported jugadores by sport
        for (const j of jugadores) {
            const sport = j.disciplina?.name || "Multideporte";
            if (!map[sport]) map[sport] = { registered: [], imported: [] };
            // Only add if not already in registered (avoid duplicates for linked profiles)
            const alreadyInRegistered = map[sport].registered.some((a: any) => a.id === j.profile_id);
            if (!alreadyInRegistered) map[sport].imported.push(j);
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [athletes, jugadores]);

    const toggle = (sport: string) =>
        setOpenSports((prev) => ({ ...prev, [sport]: !prev[sport] }));

    return (
        <div className="space-y-3">
            {grouped.map(([sport, list]) => {
                const isOpen = openSports[sport] ?? false;
                const accent = SPORT_ACCENT[sport] || "text-emerald-400";

                return (
                    <div key={sport} className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden group/sport">
                        {/* Header / Toggle */}
                        <button
                            onClick={() => toggle(sport)}
                            className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/5 transition-all duration-300 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover/sport:scale-110 transition-transform">
                                    <SportIcon sport={sport} size={18} className={cn("opacity-80 scale-110 drop-shadow-sm", accent)} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black tracking-tight text-white">{sport}</p>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                        {list.registered.length + list.imported.length} deportista{(list.registered.length + list.imported.length) !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "p-2 rounded-lg bg-white/5 border border-white/10 transition-all",
                                isOpen ? "rotate-180 bg-violet-600 border-transparent shadow-lg shadow-violet-500/20" : "text-white/20"
                            )}>
                                <ChevronDown size={14} className={isOpen ? "text-white" : ""} />
                            </div>
                        </button>

                        {/* Collapsible List */}
                        {isOpen && (
                            <div className="border-t border-white/5 bg-black/40 px-3 pb-3 pt-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Registered athletes (with profiles) */}
                                    {list.registered.map((a: any) => (
                                        <Link key={a.id} href={`/perfil/${a.id}`} className="group">
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 flex items-center gap-3 shadow-inner">
                                                <Avatar
                                                    name={a.full_name}
                                                    src={a.avatar_url}
                                                    className="w-11 h-11 rounded-xl border border-white/10 bg-black/20 shadow-md"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold tracking-tight truncate group-hover:text-violet-400 transition-colors text-white">
                                                        {a.full_name}
                                                    </h4>
                                                    {a.points > 0 && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                                            <span className="text-[10px] font-black text-amber-500/80 tabular-nums">{a.points} pts</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowUpRight size={14} className="text-white/10 group-hover:text-violet-400 transition-colors shrink-0" />
                                            </div>
                                        </Link>
                                    ))}
                                    {/* Imported jugadores (with or without profile) */}
                                    {list.imported.map((j: any) => (
                                        <JugadorCard key={`j-${j.id}`} j={j} />
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
    const { carrera, matches, news, athletes, stats, deportesInscritos, loading, error, mutate } =
        useCarreraProfile(carreraId);

    const [jugadores, setJugadores] = useState<any[]>([]);
    useEffect(() => {
        if (!carreraId) return;
        supabase
            .from('jugadores')
            .select('id, nombre, numero, profile_id, sexo, genero, disciplina:disciplina_id(id, name)')
            .eq('carrera_id', carreraId)
            .then(({ data }) => { if (data) setJugadores(data); });
    }, [carreraId]);

    const escudoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingEscudo, setUploadingEscudo] = useState(false);

    const handleEscudoUpload = async (file: File) => {
        if (!carreraId || !isStaff) return;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Formato no soportado. Usa JPG, PNG, WebP o SVG.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("La imagen es demasiado grande (máximo 2MB).");
            return;
        }
        setUploadingEscudo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `carreras/${carreraId}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true, cacheControl: '3600' });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const { error: updateError } = await supabase
                .from('carreras')
                .update({ escudo_url: publicUrl })
                .eq('id', carreraId);
            if (updateError) throw updateError;
            toast.success('¡Escudo actualizado correctamente!');
            mutate();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error('Error al subir escudo: ' + msg);
        } finally {
            setUploadingEscudo(false);
        }
    };

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

            // Internal sorting: en_curso (0), programado (1), finalizado (2)
            const sorted = groups[fecha].sort((a: any, b: any) => {
                const order: Record<string, number> = { en_curso: 0, programado: 1, finalizado: 2 };
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

    // Enrolled sports that have no match results yet
    const enrolledOnlyEntries = useMemo(() => {
        const withStats = new Set(disciplineEntries.map(d => d.name));
        return deportesInscritos.filter(e => !withStats.has(e.disciplina_name));
    }, [disciplineEntries, deportesInscritos]);

    // Sports only known via jugadores (individual sports with no delegacion)
    const jugadorOnlyEntries = useMemo(() => {
        const alreadyShown = new Set([
            ...disciplineEntries.map(d => d.name),
            ...deportesInscritos.map(e => e.disciplina_name),
        ]);
        const map: Record<string, number> = {};
        for (const j of jugadores) {
            const sport = j.disciplina?.name;
            if (sport && !alreadyShown.has(sport)) {
                map[sport] = (map[sport] || 0) + 1;
            }
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [jugadores, disciplineEntries, deportesInscritos]);

    // Map: disciplina_name + genero → equipo info (for stats cards)
    const deportesEquipoMap = useMemo(() => {
        const map: Record<string, { delegacion_id: number; equipo_nombre: string; isCombined: boolean }> = {};
        for (const e of deportesInscritos) {
            const key = `${e.disciplina_name}_${e.genero}`;
            map[key] = { delegacion_id: e.delegacion_id, equipo_nombre: e.equipo_nombre, isCombined: e.isCombined };
        }
        return map;
    }, [deportesInscritos]);

    // ─── Loading / Error ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    if (!carrera || error) {
        return (
            <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center mb-6 border border-violet-100">
                    <GraduationCap className="text-violet-400" size={32} />
                </div>
                <h1 className="text-2xl font-black mb-2 font-sans uppercase tracking-wider">
                    Carrera no encontrada
                </h1>
                <p className="text-slate-400 mb-8 max-w-sm text-center font-bold">
                    El programa académico que buscas no existe o no ha
                    participado en eventos.
                </p>
                <Button
                    onClick={() => router.back()}
                    className="rounded-2xl px-8 h-12 bg-violet-600 text-white font-black uppercase tracking-widest hover:bg-violet-700"
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
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 overflow-x-hidden relative font-sans">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 bg-background/50" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120vh] max-w-max opacity-[0.05] pointer-events-none">
                    <img src="/elementos/10.png" alt="" className="h-full w-auto object-contain filter grayscale invert rotate-90 scale-125" />
                </div>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-5xl mx-auto px-4 pt-10 pb-20 relative z-10">
                {/* Back button */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-xl">
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
                    {/* Animated Premium Background */}
                    <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-violet-600/30 via-emerald-500/20 to-violet-900/30 rounded-[2.5rem] sm:rounded-[3rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
                    
                    <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
                        {/* Noise & Glows */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none mix-blend-overlay" />
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-600/20 to-emerald-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-400/20 to-transparent blur-3xl rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="relative z-10 p-6 sm:p-10 md:p-12 flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12 text-center lg:text-left">
                            
                            {/* Avatar / Escudo Majestic Presentation */}
                            <div className="relative group/escudo shrink-0">
                                {/* Back glow for avatar */}
                                <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/40 to-emerald-500/20 rounded-[2.5rem] blur-xl opacity-50 group-hover/escudo:opacity-80 transition-opacity duration-500" />
                                
                                <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-[2rem] bg-black backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden p-3 transition-transform hover:scale-105 duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent mix-blend-overlay" />
                                    {carrera.escudo_url ? (
                                        <img
                                            src={carrera.escudo_url}
                                            alt={`Escudo de ${carrera.nombre}`}
                                            className="w-full h-full object-contain filter drop-shadow-md"
                                        />
                                    ) : (
                                        <span className="text-5xl md:text-7xl font-black text-white/10 font-sans truncate z-10 filter contrast-200">
                                            {getInitials(carrera.nombre)}
                                        </span>
                                    )}
                                </div>

                                {/* Admin upload button */}
                                {isStaff && (
                                    <>
                                        <input
                                            ref={escudoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleEscudoUpload(file);
                                                e.target.value = '';
                                            }}
                                        />
                                        <button
                                            onClick={() => escudoInputRef.current?.click()}
                                            disabled={uploadingEscudo}
                                            title="Cambiar escudo"
                                            className="absolute inset-0 rounded-[2rem] bg-slate-900/70 opacity-0 group-hover/escudo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
                                        >
                                            {uploadingEscudo ? (
                                                <Loader2 size={28} className="text-white animate-spin" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Pencil size={24} className="text-white drop-shadow-lg" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">Cambiar</span>
                                                </div>
                                            )}
                                        </button>
                                    </>
                                )}

                                <div className="absolute -bottom-4 -right-2 p-3.5 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl shadow-[0_10px_20px_rgba(124,58,237,0.4)] border border-violet-400/30">
                                    <GraduationCap size={22} className="drop-shadow-md" />
                                </div>
                            </div>

                            {/* Info & Stats */}
                            <div className="flex-1 w-full max-w-2xl lg:max-w-none flex flex-col items-center lg:items-start">
                                <p className="font-display text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] mb-3">
                                    Programa Académico
                                </p>
                                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter font-display uppercase leading-tight text-white drop-shadow-2xl px-2 lg:px-0 mb-6">
                                    {carrera.nombre}
                                </h1>

                                {/* Stats Dashboard Grid */}
                                <div className="w-full flex flex-col xl:flex-row gap-3">
                                    {/* Follow Button spans full width on mobile/tablet, shrink on very large screens */}
                                    <div className="w-full xl:w-auto shrink-0">
                                        <FollowCareerButton careerId={carrera.id} initialFollowersCount={carrera.followers_count || 0} />
                                    </div>

                                    {/* Record, Played, Win Rate */}
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1 w-full">
                                        {/* Match Record */}
                                        <div className="col-span-3 sm:col-span-1 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl py-3 px-4 shadow-inner relative overflow-hidden">
                                            <div className="flex items-center gap-4 sm:gap-3 w-full justify-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-black text-emerald-400 tabular-nums">{stats.won}</span>
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">W</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-black text-white/20 tabular-nums">{stats.draw}</span>
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">D</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-lg font-black text-rose-500 tabular-nums">{stats.lost}</span>
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">L</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Matches Played */}
                                        <div className="col-span-1 sm:col-span-1 flex flex-col items-center justify-center bg-black/20 border border-white/10 rounded-2xl py-3 px-4 shadow-sm group/activity">
                                            <span className="text-2xl font-black text-white group-hover/activity:text-violet-400 transition-colors tabular-nums tracking-tighter">{stats.played}</span>
                                            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">JugADOS</span>
                                        </div>

                                        {/* Win Rate */}
                                        <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center bg-violet-600 border border-transparent rounded-2xl py-3 px-4 shadow-[0_10px_30px_rgba(124,58,237,0.3)]">
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp size={12} className="text-white" />
                                                <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0}%</span>
                                            </div>
                                            <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">EFECTIVIDAD</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Edge-to-edge Win Rate Progress Bar */}
                        {stats.played > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 flex shadow-[0_-2px_10px_rgba(0,0,0,0.5)] bg-black/50">
                                <div
                                    className="h-full bg-emerald-500 relative z-10 transition-all duration-1000 ease-out"
                                    style={{ width: `${(stats.won / stats.played) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                                <div
                                    className="h-full bg-slate-600 relative z-10 transition-all duration-1000 ease-out"
                                    style={{ width: `${(stats.draw / stats.played) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-rose-600 relative z-10 transition-all duration-1000 ease-out"
                                    style={{ width: `${(stats.lost / stats.played) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* ━━━ INSTITUTIONAL BRAND BREAK ━━━ */}
                <div className="mt-8 mb-4 relative z-0">
                    <InstitutionalBanner variant={3} className="rounded-[2.5rem] shadow-2xl" />
                </div>

                {/* ═══ TABS ═══ */}
                <div className="flex gap-1 p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl mb-10 overflow-x-auto no-scrollbar shadow-xl">
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
                                            "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all",
                                            sportFilter === "todos"
                                                ? "bg-violet-600 text-white border-transparent shadow-[0_10px_20px_rgba(124,58,237,0.2)]"
                                                : "bg-white text-slate-400 border-violet-100 hover:bg-violet-50"
                                        )}
                                    >
                                        Todos
                                    </button>
                                    {availableSports.map((sport) => (
                                        <button
                                            key={sport}
                                            onClick={() => setSportFilter(sport)}
                                            className={cn(
                                                "flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all",
                                                sportFilter === sport
                                                    ? "bg-violet-600 text-white border-transparent shadow-[0_10px_20px_rgba(124,58,237,0.2)]"
                                                    : "bg-white text-slate-400 border-violet-100 hover:bg-violet-50"
                                            )}
                                        >
                                            <div className="flex items-center justify-center shrink-0">
                                                <SportIcon 
                                                    sport={sport} 
                                                    size={18} 
                                                    className={sportFilter === sport ? "opacity-100 scale-110 drop-shadow-md text-white" : "opacity-60 text-slate-400"} 
                                                />
                                            </div>
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
                                                    group.isToday ? "via-emerald-500/50 to-emerald-500/80" : "via-white/5 to-white/10"
                                                )} />
                                                <h2 className={cn(
                                                    "text-[10px] font-black px-5 py-2 rounded-full border backdrop-blur-md uppercase tracking-[0.25em] transition-all",
                                                    group.isToday
                                                        ? "text-white border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-105"
                                                        : "text-white/50 border-white/10 bg-white/5"
                                                )}>
                                                    {group.isToday && <span className="mr-2 text-emerald-400">●</span>}
                                                    {group.label}
                                                </h2>
                                                <div className={cn(
                                                    "h-px flex-1 bg-gradient-to-l from-transparent",
                                                    group.isToday ? "via-emerald-500/50 to-emerald-500/80" : "via-white/5 to-white/10"
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
                            {disciplineEntries.length === 0 && enrolledOnlyEntries.length === 0 && jugadorOnlyEntries.length === 0 ? (
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
                                                            <h3 className="text-sm font-black uppercase tracking-wider font-sans">
                                                                {d.name}
                                                            </h3>
                                                            {/* Note: Finished disciplines (stats) currently merge Masc/Fem in the byDiscipline lookup.
                                                                If a specific gendered version is found in enrolled, show its combined info. */}
                                                            { (deportesEquipoMap[`${d.name}_masculino`]?.isCombined || deportesEquipoMap[`${d.name}_femenino`]?.isCombined) && (
                                                                <div className="flex flex-col gap-1">
                                                                    {['masculino', 'femenino'].map(g => {
                                                                        const info = deportesEquipoMap[`${d.name}_${g}`];
                                                                        if (!info?.isCombined) return null;
                                                                        return (
                                                                            <Link
                                                                                key={g}
                                                                                href={`/equipo/${info.delegacion_id}`}
                                                                                onClick={e => e.stopPropagation()}
                                                                                className="text-[9px] font-bold text-violet-400/70 hover:text-violet-300 uppercase tracking-widest truncate max-w-[140px] hover:underline block"
                                                                            >
                                                                                {info.equipo_nombre} · {g}
                                                                            </Link>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
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
                                                                <span className="text-rose-400">
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

                                    {/* Sports enrolled but no results yet */}
                                    {enrolledOnlyEntries.map((e) => {
                                        const accent = SPORT_ACCENT[e.disciplina_name] || "text-white/40";
                                        const border = SPORT_BORDER[e.disciplina_name] || "border-white/5";
                                        return (
                                            <div
                                                key={`${e.disciplina_name}_${e.genero}`}
                                                className={cn(
                                                    "relative overflow-hidden rounded-[2rem] border bg-white/[0.02] p-6",
                                                    border
                                                )}
                                            >
                                                <div className="absolute top-4 right-4 opacity-5">
                                                    <SportIcon sport={e.disciplina_name} size={64} />
                                                </div>
                                                <div className="relative z-10 flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                                                        <SportIcon sport={e.disciplina_name} size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-black uppercase tracking-wider font-sans">
                                                            {e.disciplina_name}
                                                        </h3>
                                                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", accent)}>
                                                            {e.genero}
                                                        </p>
                                                        {e.isCombined && (
                                                            <Link
                                                                href={`/equipo/${e.delegacion_id}`}
                                                                className="text-[10px] font-bold text-violet-400/70 hover:text-violet-300 uppercase tracking-widest truncate hover:underline block"
                                                            >
                                                                {e.equipo_nombre} · combinado
                                                            </Link>
                                                        )}
                                                    </div>
                                                    <span className="ml-auto shrink-0 text-[10px] font-bold text-white/20 uppercase tracking-widest border border-white/10 rounded-full px-2 py-0.5">
                                                        Por jugar
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Individual sports from Excel roster (no delegacion) */}
                                    {jugadorOnlyEntries.map(([sport, count]) => {
                                        const accent = SPORT_ACCENT[sport] || "text-white/40";
                                        const border = SPORT_BORDER[sport] || "border-white/5";
                                        return (
                                            <div
                                                key={`jugador_${sport}`}
                                                className={cn(
                                                    "relative overflow-hidden rounded-[2rem] border bg-white/[0.02] p-6",
                                                    border
                                                )}
                                            >
                                                <div className="absolute top-4 right-4 opacity-5">
                                                    <SportIcon sport={sport} size={64} />
                                                </div>
                                                <div className="relative z-10 flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                                                        <SportIcon sport={sport} size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-black uppercase tracking-wider font-sans">
                                                            {sport}
                                                        </h3>
                                                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", accent)}>
                                                            {count} deportista{count !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <span className="ml-auto shrink-0 text-[10px] font-bold text-white/20 uppercase tracking-widest border border-white/10 rounded-full px-2 py-0.5">
                                                        Individual
                                                    </span>
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
                            {athletes.length === 0 && jugadores.length === 0 ? (
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
                                <SportGroupedAthletes athletes={athletes} jugadores={jugadores} />
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
                    layoutId="carreraTabMarker"
                    className="absolute inset-0 bg-gradient-to-t from-violet-600/20 to-transparent border-b-2 border-violet-500"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
            )}
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
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-xl">
                {icon}
            </div>
            <h3 className="text-lg font-black text-white/20 uppercase tracking-widest mb-2">{title}</h3>
            <p className="text-white/40 text-sm max-w-md font-bold italic">{description}</p>
        </div>
    );
}

function MatchRow({ match, carreraName }: { match: any; carreraName: string }) {
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
