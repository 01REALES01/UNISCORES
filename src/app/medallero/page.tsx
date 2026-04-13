"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { 
    Trophy, 
    Users, 
    GraduationCap, 
    ArrowUpRight, 
    Search,
    Target,
    Crown,
    Medal,
    Award,
    Activity,
    Filter
} from "lucide-react";
import Link from "next/link";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";
import { supabase } from "@/lib/supabase";
import { SportIcon } from "@/shared/components/sport-icons";
import { cn } from "@/lib/utils";
import { SPORT_COLORS, DEPORTES_INDIVIDUALES } from "@/lib/constants";
import UniqueLoading from "@/components/ui/morph-loading";
import { computeCareerStats } from "@/lib/sport-helpers";
import { ResilienceUI } from "@/components/resilience-ui";

type Tab = "carreras" | "equipos";

interface Stats {
    won: number;
    played: number;
}

export default function MedalleroPage() {
    const { user, profile, isStaff } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("carreras");
    
    // Data states
    const [carreras, setCarreras] = useState<any[]>([]);
    const [equipos, setEquipos] = useState<any[]>([]);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [partidos, setPartidos] = useState<any[]>([]);
    const [athletes, setAthletes] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [loadTimeout, setLoadTimeout] = useState(false);

    // Filters
    const [sportFilter, setSportFilter] = useState<number | 'todos'>('todos');
    const [genderFilter, setGenderFilter] = useState<string>('todos');
    const [searchQuery, setSearchQuery] = useState("");

    const tabs = [
        { id: "carreras" as Tab, label: "Programas", icon: GraduationCap },
        { id: "equipos" as Tab, label: "Equipos", icon: Users },
    ];

    // Initial data fetch
    const fetchData = useCallback(async () => {
        setLoading(true);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const [
                { data: cData },
                { data: dData },
                { data: discData },
                { data: pData },
                { data: aData }
            ] = await Promise.all([
                supabase.from('carreras').select('*').order('nombre').abortSignal(controller.signal),
                supabase.from('delegaciones').select('id, nombre, genero, disciplina_id, carrera_ids, disciplinas(name)').order('nombre').abortSignal(controller.signal),
                supabase.from('disciplinas').select('id, name').order('name').abortSignal(controller.signal),
                supabase.from('partidos').select('id, disciplina_id, carrera_a_id, carrera_b_id, carrera_a_ids, carrera_b_ids, marcador_detalle, estado, genero, fase').eq('estado', 'finalizado').abortSignal(controller.signal),
                supabase.from('jugadores').select('id, nombre, disciplina_id, genero, profile:profiles(id, full_name, avatar_url, points, roles)').abortSignal(controller.signal)
            ]);

            if (cData) setCarreras(cData);
            if (dData) setEquipos(dData);
            if (discData) setDisciplinas(discData);
            if (pData) setPartidos(pData);
            if (aData) {
                const mapped = (aData as any[]).map(j => {
                    const prof = Array.isArray(j.profile) ? j.profile[0] : j.profile;
                    return {
                        id: prof?.id || `j-${j.id}`,
                        full_name: prof?.full_name || j.nombre,
                        avatar_url: prof?.avatar_url || null,
                        points: prof?.points || 0,
                        disciplina_id: j.disciplina_id,
                        genero: j.genero
                    };
                });
                setAthletes(mapped);
            }
        } catch (err: any) {
            console.error("Error fetching data:", err);
            if (err.name === 'AbortError') {
                console.warn("[Medallero] Fetch timed out");
            }
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel(`medallero:global:${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    // Resilience: If loading takes > 8s, offer a retry
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("[Medallero] Load exceeded 8s timeout, showing Retry UI");
                setLoadTimeout(true);
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [loading]);

    const getCareerNames = useCallback((ids: number[]) => {
        return ids.map(id => carreras.find(c => c.id === id)?.nombre).filter(Boolean).join(" + ");
    }, [carreras]);

    const filteredCarreras = useMemo(() => {
        let matchesToCompute = partidos;
        if (sportFilter !== 'todos') {
            matchesToCompute = matchesToCompute.filter(m => m.disciplina_id === sportFilter);
        }
        if (genderFilter !== 'todos') {
            matchesToCompute = matchesToCompute.filter(m => (m.genero || '').toLowerCase() === genderFilter);
        }

        let results = carreras.map(c => {
            const stats = computeCareerStats(matchesToCompute, c.id);
            return {
                ...c,
                ...stats,
            };
        });

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(c => c.nombre.toLowerCase().includes(q));
        }

        return results.sort((a, b) => b.won - a.won);
    }, [carreras, partidos, sportFilter, genderFilter, searchQuery]);

    const isIndividualSelected = useMemo(() => {
        if (sportFilter === 'todos') return false;
        const sport = disciplinas.find(d => d.id === sportFilter);
        return sport ? DEPORTES_INDIVIDUALES.includes(sport.name) : false;
    }, [sportFilter, disciplinas]);

    const filteredEquiposList = useMemo(() => {
        let results = equipos;
        if (sportFilter !== 'todos') {
            results = results.filter(e => e.disciplina_id === sportFilter);
        }
        if (genderFilter !== 'todos') {
            results = results.filter(e => e.genero?.toLowerCase() === genderFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(e => {
                const discName = (Array.isArray(e.disciplinas) ? e.disciplinas[0] : e.disciplinas)?.name || '';
                const careerNames = (e.carrera_ids || []).map((id: number) => carreras.find(c => c.id === id)?.nombre || '').join(' ').toLowerCase();
                return discName.toLowerCase().includes(q) || careerNames.includes(q);
            });
        }
        return results;
    }, [equipos, sportFilter, genderFilter, searchQuery, carreras]);

    const filteredAthletesList = useMemo(() => {
        let results = athletes;
        if (sportFilter !== 'todos') {
            results = results.filter(a => a.disciplina_id === sportFilter);
        }
        if (genderFilter !== 'todos') {
            results = results.filter(a => a.genero?.toLowerCase() === genderFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(a => a.full_name.toLowerCase().includes(q));
        }
        return results.sort((a, b) => b.points - a.points);
    }, [athletes, sportFilter, genderFilter, searchQuery]);

    if (loadTimeout && loading && carreras.length === 0) {
        return (
            <ResilienceUI 
                title="Sincronización Lenta"
                description="Estamos teniendo problemas para conectar con el medallero en tiempo real. Esto puede ser por saturación en la red o conexión inestable."
                onRetry={() => {
                    setLoadTimeout(false);
                    fetchData();
                }}
                backFallback="/"
                retryLabel="REINTENTAR SINCRONIZACIÓN"
            />
        );
    }


 
     if (loading && carreras.length === 0) return <div className="min-h-screen flex items-center justify-center bg-background"><UniqueLoading size="lg" /></div>;


    const selectedSportName = disciplinas.find(d => d.id === sportFilter)?.name || "Global";

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 font-sans relative overflow-hidden">

            {/* Background Element Watermark - WHITE/BEIGE STYLE */}
            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-start overflow-hidden opacity-[0.08]">
                <img 
                    src="/elementos/12.png" 
                    alt="" 
                    className="w-[800px] md:w-[1100px] h-auto -translate-x-[20%] translate-y-[10%] filter grayscale brightness-[3] contrast-100"
                    aria-hidden="true"
                />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-12 pb-24 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center gap-2 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 rounded-full border border-violet-500/20 mb-2 shadow-inner">
                        <Trophy size={12} className="text-violet-400" />
                        <span className="font-sans text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Clasificación y Programas</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter font-display text-white drop-shadow-2xl leading-none">
                        Programas
                    </h1>
                    <p className="text-white/30 font-bold max-w-xl mx-auto mt-4 text-sm md:text-base leading-relaxed uppercase tracking-widest font-sans italic">
                        Consulta el desempeño estratégico de las delegaciones.
                    </p>
                </div>

                {/* Redesigned Filter Controls Area - Premium Command Center Style */}
                <div className="flex flex-col gap-8 mb-16 animate-in fade-in duration-700 delay-200">
                    {/* Top Row: Tabs and Gender */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                        {/* Tab Switcher - Sliding Pill Aesthetic */}
                        <div className="flex p-1.5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-2xl w-full lg:w-auto overflow-hidden relative group/tabs">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover/tabs:opacity-100 transition-opacity duration-700" />
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex-1 lg:w-44 flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 font-sans relative z-10",
                                            isActive
                                                ? "bg-[#F5F5DC] text-[#7C3AED] shadow-[0_0_25px_rgba(245,245,220,0.3)] scale-105"
                                                : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                        )}
                                    >
                                        <Icon size={16} className={cn("transition-transform duration-500", isActive && "scale-110")} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Gender Filters - High Fidelity Buttons */}
                        <div className="flex gap-2 sm:gap-3 p-1.5 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl shrink-0 max-w-full overflow-x-auto no-scrollbar scroll-smooth relative group/gender">
                            {[
                                { id: 'todos', label: 'Todos', icon: '⚥' },
                                { id: 'masculino', label: 'Masculino', icon: '♂' },
                                { id: 'femenino', label: 'Femenino', icon: '♀' },
                            ].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setGenderFilter(g.id)}
                                    className={cn(
                                        "relative flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-12 py-3.5 rounded-full text-[10px] font-display font-black tracking-[0.2em] transition-all duration-500 overflow-hidden border whitespace-nowrap shrink-0 z-10",
                                        genderFilter === g.id
                                            ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-[0_0_30px_rgba(245,245,220,0.4)] scale-105"
                                            : "bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white/60 hover:border-white/20"
                                    )}
                                >
                                    <span className={cn("text-lg sm:text-xl leading-none transition-transform duration-500", genderFilter === g.id && "scale-125 translate-y-[1px]")}>{g.icon}</span>
                                    {g.label.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Middle Row: Search Bar (Modern Command-Line Aesthetic) */}
                    <div className="relative w-full group/search max-w-4xl mx-auto">
                        <div className="absolute inset-0 bg-violet-500/10 blur-[60px] opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-1000" />
                        
                        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-3xl transition-all duration-500 group-focus-within/search:border-violet-500/50 group-focus-within/search:bg-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-violet-400 group-focus-within/search:scale-110 transition-all duration-500" size={24} />
                            
                            <input 
                                type="text" 
                                placeholder={activeTab === "carreras" ? "INICIA TU BÚSQUEDA DE FACULTADES..." : "BUSCA UN EQUIPO O PARTICIPANTE..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent py-7 pl-16 pr-24 text-sm font-black tracking-[0.3em] focus:outline-none transition-all font-sans placeholder:text-white/10 text-white uppercase"
                            />

                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery("")}
                                        className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:bg-white/20 hover:text-white transition-all shadow-lg animate-in fade-in zoom-in-50"
                                    >
                                        <div className="w-4 h-4 flex items-center justify-center font-black text-xs">✕</div>
                                    </button>
                                )}
                                <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
                                <div className="p-2 border border-white/5 rounded-lg bg-white/5 hidden sm:flex items-center justify-center group-focus-within/search:text-violet-400 group-focus-within/search:border-violet-500/30 transition-all">
                                    <Target size={18} className="opacity-40 group-focus-within/search:opacity-100" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sport Filter Row (Pills) */}
                <div className="relative group mb-8 sm:mb-12 animate-in fade-in duration-1000 delay-300">
                    <div className="relative">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 py-1 px-1 -mx-4 sm:mx-0 px-4 sm:px-0">
                            <button
                                onClick={() => setSportFilter("todos")}
                                className={cn(
                                    "font-sans flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap border shrink-0",
                                    sportFilter === 'todos'
                                        ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-[0_0_20px_rgba(245,245,220,0.2)] scale-105"
                                        : "bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <Target size={18} />
                                <span>Ver Todo</span>
                            </button>
                            {disciplinas.map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => setSportFilter(d.id)}
                                    className={cn(
                                        "font-sans flex items-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap border shrink-0",
                                        sportFilter === d.id
                                            ? "bg-violet-600 text-white border-transparent shadow-xl shadow-violet-600/20 scale-105"
                                            : "bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    <SportIcon sport={d.name} size={18} />
                                    <span>{d.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Institutional Banner */}
                <div className="mb-12 animate-in fade-in duration-1000 delay-400">
                    <InstitutionalBanner variant={3} className="rounded-[2.5rem] overflow-hidden shadow-2xl" />
                </div>

                {/* Tab: Carreras */}
                {activeTab === "carreras" && (
                    <div className="space-y-12 animate-in fade-in duration-700">

                        {/* List Section */}
                        <div className="flex flex-col gap-3 relative z-20">
                            {filteredCarreras.map((entry, idx) => {
                                const rank = (idx + 1).toString().padStart(2, '0');
                                return (
                                    <Link
                                        key={entry.id}
                                        href={`/carrera/${entry.id}`}
                                        className="flex flex-col sm:flex-row bg-white/[0.03] backdrop-blur-3xl border border-white/10 hover:border-violet-500/30 transition-all duration-500 hover:translate-x-1 group shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] overflow-hidden min-h-[140px] relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex flex-1 w-full">
                                            {/* Avatar/Ranking Column */}
                                            <div className="w-[100px] sm:w-[160px] shrink-0 border-r border-white/5 relative flex items-center justify-center bg-white/[0.02] p-4">
                                                {/* Visual Ranking Badge */}
                                                <div className={cn(
                                                    "absolute -top-1 -left-1 w-12 h-12 flex items-center justify-center font-display text-base font-black italic tracking-tighter z-20 rounded-br-2xl border-b border-r shadow-2xl",
                                                    idx === 0 ? "bg-emerald-500 text-white border-emerald-400/50 shadow-emerald-500/20" :
                                                    idx === 1 ? "bg-violet-600 text-white border-violet-400/50 shadow-violet-600/20" :
                                                    idx === 2 ? "bg-violet-600 text-white border-violet-400/50 shadow-violet-500/20" :
                                                    "bg-white/10 text-white/40 border-white/20"
                                                )}>
                                                    #{idx + 1}
                                                </div>

                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 opacity-20" />
                                                    {entry.escudo_url ? (
                                                        <div className="w-16 h-16 sm:w-24 sm:h-24 z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] relative flex items-center justify-center bg-black/20 rounded-2xl p-3 border border-white/5 group-hover:border-white/20 transition-all">
                                                            <img src={entry.escudo_url} alt={entry.nombre} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-16 h-16 sm:w-24 sm:h-24 z-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-all">
                                                            <span className="font-sans text-3xl font-black text-white/10 uppercase tracking-tighter">
                                                                {entry.nombre.substring(0,2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content Column */}
                                            <div className="flex-1 px-6 sm:px-8 py-6 flex flex-col justify-center min-w-0">
                                                <div className="mb-2">
                                                    <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
                                                        <span className="font-sans text-[8px] sm:text-[9px] font-black uppercase text-violet-400 tracking-[0.3em] leading-none whitespace-nowrap bg-violet-400/10 px-2 py-1 rounded border border-violet-400/20">
                                                            ESTADÍSTICAS EN {selectedSportName.toUpperCase()}
                                                        </span>
                                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-violet-400/20 to-transparent" />
                                                    </div>

                                                    <h2 className="font-display text-xl sm:text-3xl font-bold text-white leading-tight tracking-tight group-hover:text-violet-400 transition-colors truncate">
                                                        {entry.nombre}
                                                    </h2>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Victorias</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                                                            <span className="font-sans text-lg sm:text-2xl font-black text-white tabular-nums leading-none">
                                                                {entry.won}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-[1px] bg-white/5 shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Jugados</span>
                                                        <span className="font-sans text-lg sm:text-2xl font-black text-white/40 tabular-nums leading-none">
                                                            {entry.played}
                                                        </span>
                                                    </div>
                                                    <div className="hidden sm:flex flex-col ml-auto">
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Efectividad</span>
                                                        <span className="font-sans text-sm font-black text-violet-400/60 tabular-nums leading-none">
                                                            {entry.played > 0 ? Math.round((entry.won / entry.played) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action/Indicator Column */}
                                        <div className="hidden sm:flex w-[80px] shrink-0 items-center justify-center border-l border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 bg-violet-600/10">
                                            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40">
                                                <ArrowUpRight size={20} className="text-white" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab: Equipos / Deportistas */}
                {activeTab === "equipos" && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
                        {isIndividualSelected ? (
                            // Render Athletes for Individual Sports
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredAthletesList.length === 0 ? (
                                    <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-black/20">
                                        <Activity size={48} className="text-white/5 mx-auto mb-4" />
                                        <p className="text-white/20 font-black uppercase font-sans tracking-[0.3em] px-4">No hay deportistas registrados en este filtro</p>
                                    </div>
                                ) : (
                                    filteredAthletesList.map(a => (
                                        <Link key={a.id} href={`/perfil/${a.id}`} className="group">
                                            <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 flex items-center gap-5 hover:border-violet-500/30 transition-all duration-500 shadow-xl overflow-hidden relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="w-20 h-20 rounded-2xl bg-black/20 border border-white/5 overflow-hidden shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-700 relative z-10">
                                                    {a.avatar_url ? (
                                                        <img src={a.avatar_url} alt={a.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/10 font-black text-2xl">
                                                            {a.full_name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 relative z-10">
                                                    <h4 className="text-xl font-bold text-white tracking-tight truncate group-hover:text-violet-400 transition-colors">
                                                        {a.full_name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                                                            a.genero === 'femenino' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                        )}>
                                                            {a.genero}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
                                                            {a.points} PTS
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0 relative z-10">
                                                  <ArrowUpRight size={16} className="text-white" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        ) : (
                            // Render Combined Teams for Team Sports
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {filteredEquiposList.length === 0 ? (
                                    <div className="col-span-full py-32 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-black/20">
                                        <Users size={48} className="text-white/5 mx-auto mb-4" />
                                        <p className="text-white/20 font-black uppercase font-sans tracking-[0.3em] px-4">No hay equipos registrados bajo este filtro</p>
                                    </div>
                                ) : filteredEquiposList.map((e) => {
                                    const discName = (Array.isArray(e.disciplinas) ? e.disciplinas[0] : e.disciplinas)?.name || '';
                                    const isCombined = e.carrera_ids?.length > 1;
                                    const careerLabels = getCareerNames(e.carrera_ids || []);
                                    
                                    return (
                                        <Link
                                            key={e.id}
                                            href={`/equipo/${e.id}`}
                                            className="group relative flex items-center gap-8 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 overflow-hidden hover:border-violet-500/30 transition-all duration-500 shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-0 group-hover:scale-125 transition-transform duration-700 opacity-20" />
                                                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[2rem] bg-black/40 border border-white/10 flex items-center justify-center p-6 shrink-0 shadow-inner group-hover:scale-105 group-hover:bg-black/60 transition-all duration-700 relative z-10 text-white/20 group-hover:text-violet-400">
                                                    <SportIcon sport={discName} size={48} />
                                                </div>
                                            </div>
        
                                            <div className="flex-1 min-w-0 relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h4 className="text-2xl lg:text-4xl font-bold text-white font-display tracking-tight leading-none group-hover:text-violet-400 transition-colors">
                                                        {discName}
                                                    </h4>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 mb-5">
                                                    <span className="text-[10px] font-black uppercase text-violet-400 tracking-widest px-3 py-1 bg-violet-500/10 rounded-lg border border-violet-500/20 whitespace-nowrap">
                                                        {e.genero || 'Masculino'}
                                                    </span>
                                                    {isCombined && (
                                                      <span className="text-[10px] font-black uppercase text-violet-400 tracking-widest px-3 py-1 bg-violet-600/10 rounded-lg border border-violet-500/20 whitespace-nowrap">
                                                          COMBINADO
                                                      </span>
                                                    )}
                                                </div>
        
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="h-[1px] w-8 bg-violet-400/30" />
                                                    <p className="text-[11px] lg:text-[14px] font-bold text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-[0.2em] leading-relaxed font-sans italic truncate">
                                                        {careerLabels}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-8 group-hover:translate-x-0 ml-4">
                                                <ArrowUpRight size={24} className="text-white" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
