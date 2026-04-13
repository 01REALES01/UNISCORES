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
import { SafeBackButton } from "@/shared/components/safe-back-button";
import { ResilienceUI } from "@/components/resilience-ui";
import UniqueLoading from "@/components/ui/morph-loading";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";
import { getCurrentScore } from "@/lib/sport-scoring";
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
    MoveRight,
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

    const grouped = useMemo(() => {
        const map: Record<string, { masculine: any[]; feminine: any[]; others: any[] }> = {};
        
        const processGender = (item: any) => {
            const g = (item.sexo || item.genero || '').toLowerCase().trim();
            if (g === 'masculino' || g === 'm') return 'masculine';
            if (g === 'femenino' || g === 'f') return 'feminine';
            return 'others';
        };

        for (const a of athletes) {
            const sport = a.disciplina?.name || "Multideporte";
            if (!map[sport]) map[sport] = { masculine: [], feminine: [], others: [] };
            map[sport][processGender(a)].push({ ...a, isProfile: true });
        }

        for (const j of jugadores) {
            const sport = j.disciplina?.name || "Multideporte";
            if (!map[sport]) map[sport] = { masculine: [], feminine: [], others: [] };
            
            const alreadyInMap = [
                ...map[sport].masculine, 
                ...map[sport].feminine, 
                ...map[sport].others
            ].some((a: any) => a.isProfile && a.id === j.profile_id);

            if (!alreadyInMap) {
                map[sport][processGender(j)].push({ ...j, isProfile: false });
            }
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [athletes, jugadores]);

    const toggle = (sport: string) =>
        setOpenSports((prev) => ({ ...prev, [sport]: !prev[sport] }));

    return (
        <div className="space-y-3">
            {grouped.map(([sport, categories]) => {
                const isOpen = openSports[sport] ?? false;
                const accent = SPORT_ACCENT[sport] || "text-emerald-400";
                const totalCount = categories.masculine.length + categories.feminine.length + categories.others.length;

                return (
                    <div key={sport} className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden group/sport">
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
                                        {totalCount} deportista{totalCount !== 1 ? 's' : ''}
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

                        {isOpen && (
                            <div className="border-t border-white/5 bg-black/40 px-4 pb-6 pt-4 space-y-8">
                                {[
                                    { title: "Masculino", list: categories.masculine, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: "♂" },
                                    { title: "Femenino", list: categories.feminine, color: "text-pink-400 bg-pink-500/10 border-pink-500/20", icon: "♀" },
                                    { title: "Otros / Mixto", list: categories.others, color: "text-white/40 bg-white/5 border-white/10", icon: "⚥" }
                                ].map((cat) => (
                                    cat.list.length > 0 && (
                                        <div key={cat.title} className="space-y-4">
                                            <div className="flex items-center gap-3 px-1">
                                                <div className={cn("px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-2", cat.color)}>
                                                    <span>{cat.icon}</span>
                                                    {cat.title}
                                                    <span className="opacity-40 tabular-nums">({cat.list.length})</span>
                                                </div>
                                                <div className="flex-1 h-px bg-white/5" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {cat.list.map((a: any) => (
                                                    a.isProfile ? (
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
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Perfil Activo</span>
                                                                        {a.points > 0 && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Star size={8} className="text-amber-500 fill-amber-500" />
                                                                                <span className="text-[9px] font-black text-amber-500/80 tabular-nums">{a.points}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <ArrowUpRight size={14} className="text-white/10 group-hover:text-violet-400 transition-colors shrink-0" />
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <JugadorCard key={`j-${a.id}`} j={a} />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )
                                ))}
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
    const [selectedSport, setSelectedSport] = useState<string>("all");

    useEffect(() => {
        const sport = searchParams.get("sport");
        if (sport) {
            setSelectedSport(sport);
        }
    }, [searchParams]);

    // ─── Derived data ────────────────────────────────────────────────────────

    const sportsPresent = useMemo(() => {
        const sports = new Set<string>();
        matches.forEach((m: any) => {
            const name = (Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas)?.name;
            if (name) sports.add(name);
        });
        return Array.from(sports).sort();
    }, [matches]);

    const filteredMatches = useMemo(() => {
        return matches.filter((m: any) => {
            if (selectedSport !== "all") {
                const disc = (Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas)?.name;
                if (disc !== selectedSport) return false;
            }
            return true;
        });
    }, [matches, selectedSport]);

    // ─── Date-grouped matches ────────────────────────────────────────────

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

            if (isToday) label = `HOY, ${label}`;
            else if (isYesterday) label = `AYER, ${label}`;
            else if (isTomorrow) label = `MAÑANA, ${label}`;
            else label = `${label.split(',')[0].toUpperCase()}, ${label}`;

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

    const disciplineEntries = useMemo(() => {
        return Object.values(stats.byDiscipline).sort((a, b) => b.oro - a.oro || b.plata - a.plata || b.puntos - a.puntos);
    }, [stats.byDiscipline]);

    const enrolledOnlyEntries = useMemo(() => {
        const withStats = new Set(disciplineEntries.map(d => d.name));
        return deportesInscritos.filter(e => !withStats.has(e.disciplina_name));
    }, [disciplineEntries, deportesInscritos]);

    const jugadorOnlyEntries = useMemo(() => {
        const alreadyShown = new Set([...disciplineEntries.map(d => d.name), ...deportesInscritos.map(e => e.disciplina_name)]);
        const map: Record<string, number> = {};
        for (const j of jugadores) {
            const sport = j.disciplina?.name;
            if (sport && !alreadyShown.has(sport)) {
                map[sport] = (map[sport] || 0) + 1;
            }
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [jugadores, disciplineEntries, deportesInscritos]);

    const deportesEquipoMap = useMemo(() => {
        const map: Record<string, { delegacion_id: number; equipo_nombre: string; isCombined: boolean }> = {};
        for (const e of deportesInscritos) {
            const key = `${e.disciplina_name}_${e.genero}`;
            map[key] = { delegacion_id: e.delegacion_id, equipo_nombre: e.equipo_nombre, isCombined: e.isCombined };
        }
        return map;
    }, [deportesInscritos]);

    const [loadTimeout, setLoadTimeout] = useState(false);

    useEffect(() => {
        if (!loading || carrera) { setLoadTimeout(false); return; }
        const t = setTimeout(() => setLoadTimeout(true), 8000);
        return () => clearTimeout(t);
    }, [loading, carrera]);

    if (loading && !carrera) {
        if (loadTimeout) return (
            <ResilienceUI 
                title="Conexión Lenta"
                description="La carga del programa está tardando. ¿Deseas reintentar?"
                onRetry={() => { setLoadTimeout(false); mutate(); }}
                backFallback="/medallero"
                retryLabel="REINTENTAR"
            />
        );
        return <div className="min-h-screen flex items-center justify-center bg-background"><UniqueLoading size="lg" /></div>;
    }

    if (!carrera || error) return (
        <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-xl"><GraduationCap className="text-violet-400" size={32} /></div>
            <h1 className="text-2xl font-black mb-2 uppercase tracking-wider">Carrera no encontrada</h1>
            <p className="text-white/40 mb-8 max-w-sm font-bold italic">El programa académico que buscas no existe o no ha participado en eventos.</p>
            <SafeBackButton fallback="/medallero" label="Volver al Medallero" className="bg-violet-600 hover:bg-violet-700 h-12 px-8 shadow-none" />
        </div>
    );

    const getInitials = (name: string) => {
        const parts = name.split(" ");
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

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
                <div className="mb-8"><SafeBackButton fallback="/medallero" variant="ghost" label="Regresar" /></div>

                {/* HERO SECTION */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-12">
                    <div className="absolute -inset-2 bg-gradient-to-r from-violet-600/30 via-emerald-500/20 to-violet-900/30 rounded-[3rem] blur-xl opacity-30 shadow-2xl" />
                    <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden p-6 sm:p-10 md:p-12 flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12 text-center lg:text-left shadow-2xl">
                        <div className="relative group/escudo shrink-0">
                            <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/40 to-emerald-500/20 rounded-[2.5rem] blur-xl opacity-50 shadow-2xl" />
                            <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-[2rem] bg-black border border-white/10 flex items-center justify-center p-3 shadow-2xl overflow-hidden">
                                {carrera.escudo_url ? <img src={carrera.escudo_url} alt={carrera.nombre} className="w-full h-full object-contain filter drop-shadow-md" /> : <span className="text-5xl md:text-7xl font-black text-white/10">{getInitials(carrera.nombre)}</span>}
                            </div>
                            {isStaff && (
                                <>
                                    <input ref={escudoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleEscudoUpload(file); }} />
                                    <button onClick={() => escudoInputRef.current?.click()} className="absolute inset-0 rounded-[2rem] bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                                        {uploadingEscudo ? <Loader2 size={24} className="animate-spin" /> : <Pencil size={24} />}
                                    </button>
                                </>
                            )}
                            <div className="absolute -bottom-4 -right-2 p-3.5 bg-violet-600 rounded-2xl shadow-xl border border-violet-400/30"><GraduationCap size={22} /></div>
                        </div>
                        <div className="flex-1 flex flex-col items-center lg:items-start">
                            <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] mb-3">Programa Académico</p>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase leading-tight text-white mb-6">{carrera.nombre}</h1>
                            <div className="w-full flex flex-col xl:flex-row gap-3">
                                <FollowCareerButton careerId={carrera.id} initialFollowersCount={carrera.followers_count || 0} />
                                <div className="grid grid-cols-3 gap-2 flex-1">
                                    <div className="col-span-1 bg-white/5 border border-white/10 rounded-2xl py-3 text-center shadow-inner">
                                        <div className="flex justify-center gap-3">
                                            <div className="flex flex-col"><span className="text-lg font-black text-emerald-400">{stats.won}</span><span className="text-[8px] font-black text-white/20 uppercase">W</span></div>
                                            <div className="flex flex-col"><span className="text-lg font-black text-white/20">{stats.draw}</span><span className="text-[8px] font-black text-white/20 uppercase">D</span></div>
                                            <div className="flex flex-col"><span className="text-lg font-black text-rose-500">{stats.lost}</span><span className="text-[8px] font-black text-white/20 uppercase">L</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 border border-white/10 rounded-2xl py-3 text-center"><span className="text-2xl font-black text-white">{stats.played}</span><p className="text-[8px] font-black text-white/20 uppercase">Jugados</p></div>
                                    <div className="bg-violet-600 rounded-2xl py-3 text-center shadow-lg"><span className="text-2xl font-black text-white">{stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0}%</span><p className="text-[8px] font-black text-white/60 uppercase">Efectividad</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
                
                {/* ─── INSTITUTIONAL BRAND BREAK ─── */}
                <div className="mt-8 mb-10 relative z-0">
                    <InstitutionalBanner variant={3} className="rounded-[2.5rem] shadow-2xl" />
                </div>

                <div className="flex gap-1 p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl mb-10 overflow-x-auto no-scrollbar shadow-2xl">
                    <TabButton active={activeTab === "partidos"} onClick={() => setActiveTab("partidos")} icon={<Swords size={18} />} label="Partidos" />
                    <TabButton active={activeTab === "deportes"} onClick={() => setActiveTab("deportes")} icon={<Medal size={18} />} label="Deportes" />
                    <TabButton active={activeTab === "noticias"} onClick={() => setActiveTab("noticias")} icon={<Newspaper size={18} />} label="Noticias" />
                    <TabButton active={activeTab === "deportistas"} onClick={() => setActiveTab("deportistas")} icon={<Users size={18} />} label="Deportistas" />
                </div>

                <div className="min-h-[400px]">
                    {activeTab === "partidos" && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 px-4 w-full justify-start sm:justify-center">
                                <button onClick={() => setSelectedSport("all")} className={cn("min-w-[100px] h-24 rounded-[2rem] border transition-all duration-500 flex flex-col items-center justify-center p-3", selectedSport === "all" ? "bg-violet-600/30 border-violet-500/50 scale-105 shadow-2xl" : "bg-white/[0.03] border-white/5 hover:bg-white/10")}>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", selectedSport === "all" ? "bg-violet-500 shadow-xl" : "bg-white/5 border border-white/10")}><Swords size={20} /></div>
                                    <span className={cn("text-[9px] font-black uppercase tracking-widest", selectedSport === "all" ? "text-white" : "text-white/20")}>Todos</span>
                                </button>
                                {sportsPresent.map(sport => (
                                    <button key={sport} onClick={() => setSelectedSport(sport)} className={cn("min-w-[100px] h-24 rounded-[2rem] border transition-all duration-500 flex flex-col items-center justify-center p-3", selectedSport === sport ? "bg-violet-600/30 border-violet-500/50 scale-105 shadow-2xl" : "bg-white/[0.03] border-white/5 hover:bg-white/10")}>
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", selectedSport === sport ? "bg-violet-500 shadow-xl" : "bg-white/5 border border-white/10")}><SportIcon sport={sport} size={24} className={selectedSport === sport ? "opacity-100" : "opacity-40"} /></div>
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest truncate w-full px-2", selectedSport === sport ? "text-white" : "text-white/20")}>{sport}</span>
                                    </button>
                                ))}
                            </div>

                            {groupedFilteredMatches.length === 0 ? (
                                <EmptyState icon={<Calendar size={48} />} title="Sin partidos" description="No hay encuentros para estos filtros." />
                            ) : (
                                <div className="space-y-20">
                                    {groupedFilteredMatches.map(group => (
                                        <section key={group.fecha} id={`carrera-date-${group.fecha}`} className="scroll-mt-32">
                                            <div className="flex items-center justify-center gap-4 mb-10 sticky top-[240px] sm:top-[280px] z-40 py-2 pointer-events-none">
                                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent max-w-xs" />
                                                <h2 className={cn(
                                                    "flex items-center gap-3 px-8 py-3.5 rounded-full border backdrop-blur-3xl transition-all duration-500 shadow-2xl pointer-events-auto",
                                                    group.isToday 
                                                        ? "bg-black border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.1)] scale-105" 
                                                        : "bg-[#09080d] border-white/20 ring-1 ring-white/10"
                                                )}>
                                                    <div className="flex items-baseline gap-2.5">
                                                        {(() => {
                                                            const parts = group.label.split(',');
                                                            return (
                                                                <>
                                                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-emerald-400">
                                                                        {parts[0]}
                                                                    </span>
                                                                    {parts[1] && (
                                                                        <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                                                                            {parts[1]}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </h2>
                                                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/10 to-transparent max-w-xs" />
                                            </div>
                                            <div className="grid grid-cols-1 gap-8">
                                                {group.partidos.map((m: any) => (
                                                    <MatchRow key={m.id} match={m} />
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === "deportes" && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Primero mostramos los deportes donde está inscrito (con o sin partidos) */}
                            {deportesInscritos.map(insc => {
                                const statsEntry = disciplineEntries.find(d => d.name === insc.disciplina_name);
                                const winRate = statsEntry && statsEntry.played > 0 ? Math.round((statsEntry.won / statsEntry.played) * 100) : 0;
                                const isCombined = insc.isCombined;

                                return (
                                    <Link 
                                        key={`${insc.disciplina_name}_${insc.genero}`} 
                                        href={`/equipo/${insc.delegacion_id}?sport=${encodeURIComponent(insc.disciplina_name)}`}
                                        className="group block relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 transition-all duration-500 hover:bg-white/[0.05] hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/10 active:scale-[0.98]"
                                    >
                                        <div className="absolute top-6 right-6 opacity-5 group-hover:opacity-10 transition-opacity"><SportIcon sport={insc.disciplina_name} size={64} /></div>
                                        <div className="relative z-10 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-2xl bg-black/40 border border-white/10 shadow-xl group-hover:border-violet-500/40 transition-colors"><SportIcon sport={insc.disciplina_name} size={28} /></div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase tracking-widest group-hover:text-violet-400 transition-colors">{insc.disciplina_name}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                                                insc.genero === 'femenino' ? "bg-pink-500/10 text-pink-400" : "bg-blue-500/10 text-blue-400"
                                                            )}>
                                                                {insc.genero}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isCombined && (
                                                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                                        Equipo Combinado
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Info de Delegación / Nombre de Equipo */}
                                            {insc.equipo_nombre && insc.equipo_nombre !== carrera.nombre && (
                                                <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 group-hover:bg-white/10 transition-colors">
                                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                        <Users size={10} className="text-violet-400" /> Delegación Asociada
                                                    </p>
                                                    <p className="text-[11px] font-black text-white uppercase tracking-wider">{insc.equipo_nombre}</p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-black/30 rounded-2xl p-4 text-center border border-white/5">
                                                    <p className="text-[8px] font-black text-white/20 uppercase mb-2">V / E / D</p>
                                                    <p className="text-xs font-black tabular-nums tracking-tighter">
                                                        <span className="text-emerald-400">{statsEntry?.won || 0}</span>
                                                        <span className="mx-1 text-white/10">/</span>
                                                        <span className="text-white/40">{statsEntry?.draw || 0}</span>
                                                        <span className="mx-1 text-white/10">/</span>
                                                        <span className="text-rose-400">{statsEntry?.lost || 0}</span>
                                                    </p>
                                                </div>
                                                <div className="bg-black/30 rounded-2xl p-4 text-center border border-white/5">
                                                    <p className="text-[8px] font-black text-white/20 uppercase mb-2">Efectividad</p>
                                                    <p className="text-xl font-black text-violet-400 tabular-nums">{winRate}%</p>
                                                </div>
                                            </div>

                                            {(!statsEntry || statsEntry.played === 0) ? (
                                                <div className="pt-2">
                                                    <div className="bg-white/5 border border-white/5 rounded-xl py-2 px-3 flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
                                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Aún sin competencias</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="pt-2 flex justify-end">
                                                    <div className="text-[8px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                        Ver Detalles <MoveRight size={10} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                            
                            {/* Cualquier otro deporte que tenga stats pero no esté en inscritos (fallback) */}
                            {disciplineEntries.filter(d => !deportesInscritos.some(i => i.disciplina_name === d.name)).map(d => (
                                <div key={`fallback-${d.name}`} className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 group transition-all duration-500 hover:bg-white/[0.05]">
                                    <div className="absolute top-6 right-6 opacity-5"><SportIcon sport={d.name} size={64} /></div>
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 shadow-xl"><SportIcon sport={d.name} size={28} /></div>
                                            <div><h3 className="text-sm font-black uppercase tracking-widest">{d.name}</h3><p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{d.played} Partidos</p></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-black/30 rounded-2xl p-4 text-center border border-white/5"><p className="text-[8px] font-black text-white/20 uppercase mb-2">V / E / D</p><p className="text-xs font-black tabular-nums tracking-tighter"><span className="text-emerald-400">{d.won}</span><span className="mx-1 text-white/10">/</span><span className="text-white/40">{d.draw}</span><span className="mx-1 text-white/10">/</span><span className="text-rose-400">{d.lost}</span></p></div>
                                            <div className="bg-black/30 rounded-2xl p-4 text-center border border-white/5"><p className="text-[8px] font-black text-white/20 uppercase mb-2">Efectividad</p><p className="text-xl font-black text-violet-400 tabular-nums">{d.played > 0 ? Math.round((d.won / d.played) * 100) : 0}%</p></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "noticias" && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                            {news.length === 0 ? <EmptyState icon={<Newspaper size={48} />} title="Sin noticias" description="Aún no hay publicaciones para esta carrera." /> : news.map((n: any) => <NewsListCard key={n.id} noticia={n} />)}
                        </motion.div>
                    )}

                    {activeTab === "deportistas" && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {athletes.length === 0 && jugadores.length === 0 ? <EmptyState icon={<Users size={48} />} title="Sin deportistas" description="No hay atletas vinculados aún." /> : <SportGroupedAthletes athletes={athletes} jugadores={jugadores} />}
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button onClick={onClick} className={cn("flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl transition-all relative overflow-hidden group min-w-[80px]", active ? "text-white bg-white/5" : "text-white/20 hover:text-white/40")}>
            <div className="relative z-10 group-hover:scale-110 transition-transform">{icon}</div>
            <span className="text-[9px] font-black uppercase tracking-widest relative z-10">{label}</span>
            {active && <motion.div layoutId="carreraTabMarker" className="absolute inset-0 bg-gradient-to-t from-violet-600/20 to-transparent border-b-2 border-violet-500" />}
        </button>
    );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl opacity-40">{icon}</div>
            <h3 className="text-lg font-black text-white/20 uppercase tracking-[0.2em] mb-2">{title}</h3>
            <p className="text-white/40 text-sm max-w-sm font-bold italic">{description}</p>
        </div>
    );
}

function MatchRow({ match }: { match: any }) {
    const estado = (match.estado || "").toLowerCase().trim();
    const sportName = (Array.isArray(match.disciplinas) ? match.disciplinas[0] : match.disciplinas)?.name || 'Deporte';
    const det = match.marcador_detalle || {};
    const nameA = getDisplayName(match, "a");
    const nameB = getDisplayName(match, "b");
    const { scoreA, scoreB } = getCurrentScore(sportName, det);
    const isLive = estado === "en_curso";
    const isFinal = estado === "finalizado";
    const genero = (match.genero || 'masculino').toLowerCase();
    
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const displayTime = new Date(match.fecha).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    }).toUpperCase();

    const winnerA = isFinal && Number(scoreA) > Number(scoreB);
    const winnerB = isFinal && Number(scoreB) > Number(scoreA);

    return (
        <Link href={`/partido/${match.id}`} className="group block w-full">
            <div className={cn(
                "relative overflow-hidden rounded-[2rem] border transition-all duration-500 hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:-translate-y-1 backdrop-blur-xl shadow-2xl",
                SPORT_BORDER[sportName] || 'border-white/10',
            )} style={{ 
                background: `linear-gradient(135deg, ${SPORT_COLORS[sportName]}20 0%, rgba(255,255,255,0.03) 100%)`,
                borderColor: `${SPORT_COLORS[sportName]}40`
            }}>
                {/* Background Element 08 - More visible */}
                <div className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.08] mix-blend-screen pointer-events-none group-hover:opacity-[0.15] transition-opacity duration-700">
                    <img src="/elementos/08.png" alt="" className="w-full h-full object-contain filter contrast-125 saturate-150" />
                </div>

                {/* Ambient Background Watermark Restored */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none select-none opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-700">
                    <SportIcon sport={sportName} size={150} className={cn("transition-all duration-700", SPORT_ACCENT[sportName] || 'text-white')} />
                </div>

                <div className="relative p-5 sm:p-7 flex flex-col justify-center">
                    {/* Header - Vibrant */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className={cn("w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-lg", sportName === 'Fútbol' ? 'border-emerald-500/40' : '')}>
                                <SportIcon sport={sportName} size={14} className="text-white opacity-90" />
                            </div>
                            <span className="text-[10px] font-black text-white/80 tracking-[0.2em] uppercase truncate drop-shadow-sm">{sportName}</span>
                        </div>

                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 shadow-inner",
                            isLive ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "text-white/60"
                        )}>
                            {isLive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                                {isLive ? 'EN VIVO' : isFinal ? 'FINALIZADO' : 'PROGRAMADO'}
                            </span>
                        </div>
                    </div>

                    {/* Content - Narrower & Optimized */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-8 py-2">
                        {/* Team A */}
                        <div className="flex flex-col items-center gap-3 text-center min-w-0">
                             <div className={cn(
                                "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 border flex items-center justify-center text-base sm:text-lg font-black transition-all duration-500 shadow-2xl",
                                winnerA ? "border-emerald-500/60 text-white shadow-emerald-500/20 scale-105" : "border-white/10 text-white/50"
                            )}>
                                {getInitials(nameA)}
                            </div>
                            <span className={cn(
                                "text-[11px] sm:text-[12px] font-black uppercase tracking-wider leading-tight line-clamp-1 truncate max-w-full px-2 transition-colors",
                                winnerA ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : "text-white/60"
                            )}>{nameA}</span>
                        </div>

                        {/* Center Display - Tighter and Punchy */}
                        <div className="flex flex-col items-center justify-center min-w-[80px] sm:min-w-[120px]">
                            {(isFinal || isLive) ? (
                                <div className="flex items-center justify-center gap-2.5 font-black text-4xl sm:text-5xl text-white tracking-tighter tabular-nums mb-0.5 leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    <span className={winnerB ? "opacity-25" : ""}>{scoreA}</span>
                                    <span className="text-white/30 text-2xl -mt-1">:</span>
                                    <span className={winnerA ? "opacity-25" : ""}>{scoreB}</span>
                                </div>
                            ) : (
                                <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tighter mb-0.5 leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                                    {displayTime.split(' ')[0]}
                                </div>
                            )}

                            <div className={cn(
                                "text-[8px] font-black tracking-[0.25em] uppercase flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.05]",
                                genero === 'femenino' ? "text-pink-400 border-pink-500/20" : "text-blue-400 border-blue-500/20"
                            )}>
                                <span className={cn("w-1 h-1 rounded-full bg-current shadow-[0_0_5px_currentColor]")}></span>
                                {genero}
                                <span className={cn("w-1 h-1 rounded-full bg-current shadow-[0_0_5px_currentColor]")}></span>
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="flex flex-col items-center gap-3 text-center min-w-0">
                             <div className={cn(
                                "w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 border flex items-center justify-center text-base sm:text-lg font-black transition-all duration-500 shadow-2xl",
                                winnerB ? "border-emerald-500/60 text-white shadow-emerald-500/20 scale-105" : "border-white/10 text-white/50"
                            )}>
                                {getInitials(nameB)}
                            </div>
                            <span className={cn(
                                "text-[11px] sm:text-[12px] font-black uppercase tracking-wider leading-tight line-clamp-1 truncate max-w-full px-2 transition-colors",
                                winnerB ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : "text-white/60"
                            )}>{nameB}</span>
                        </div>
                    </div>

                    {/* Minimalist Footer Hint - High impact */}
                     <div className={cn(
                        "mt-5 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-500 shadow-lg group-hover:scale-[1.02]",
                        SPORT_ACCENT[sportName] || 'text-white'
                    )}>
                        <div className="flex items-center gap-2 drop-shadow-[0_0_8px_currentColor]">
                            Analizar Partido <MoveRight size={12} className="group-hover:translate-x-2 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
