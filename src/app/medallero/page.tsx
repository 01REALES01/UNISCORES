"use client";

import { useState, useEffect, useMemo } from "react";
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
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [sportFilter, setSportFilter] = useState("todos");
    const [genderFilter, setGenderFilter] = useState("todos");
    const [searchQuery, setSearchQuery] = useState("");

    // Initial data fetch
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const [
                    { data: cData },
                    { data: dData },
                    { data: discData },
                    { data: pData }
                ] = await Promise.all([
                    supabase.from('carreras').select('*').order('nombre'),
                    supabase.from('delegaciones').select('id, nombre, genero, disciplina_id, carrera_ids, disciplinas(name)').order('nombre'),
                    supabase.from('disciplinas').select('id, name').order('name'),
                    supabase.from('partidos').select('id, disciplina_id, carrera_a_id, carrera_b_id, marcador_detalle, estado, genero').eq('estado', 'finalizado')
                ]);

                if (cData) setCarreras(cData);
                if (dData) setEquipos(dData);
                if (discData) setDisciplinas(discData);
                if (pData) setPartidos(pData);
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Performance calculation for "Carreras"
    const careerStatsList = useMemo(() => {
        const statsMap: Record<number, Stats> = {};
        
        carreras.forEach(c => {
            statsMap[c.id] = { won: 0, played: 0 };
        });

        const filteredPartidos = partidos.filter(p => {
            if (sportFilter !== "todos" && p.disciplina_id !== sportFilter) return false;
            if (genderFilter !== "todos" && p.genero !== genderFilter) return false;
            return true;
        });

        filteredPartidos.forEach(p => {
            if (statsMap[p.carrera_a_id]) statsMap[p.carrera_a_id].played++;
            if (statsMap[p.carrera_b_id]) statsMap[p.carrera_b_id].played++;

            const det = p.marcador_detalle || {};
            const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? 0;
            const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? 0;

            if (scoreA > scoreB) {
                if (statsMap[p.carrera_a_id]) statsMap[p.carrera_a_id].won++;
            } else if (scoreB > scoreA) {
                if (statsMap[p.carrera_b_id]) statsMap[p.carrera_b_id].won++;
            }
        });

        const list = carreras.map(c => ({
            id: c.id,
            nombre: c.nombre,
            escudo_url: c.escudo_url,
            ...statsMap[c.id]
        }));

        return list
            .sort((a, b) => {
                if (b.won !== a.won) return b.won - a.won;
                return b.played - a.played;
            });
    }, [carreras, partidos, sportFilter, genderFilter]);

    const filteredCarreras = careerStatsList.filter(c => 
        (c.nombre || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Helpers
    const getCareerNames = (ids: number[]) => {
        return ids.map(id => carreras.find(c => c.id === id)?.nombre).filter(Boolean).join(" / ");
    };

    const filteredEquiposList = useMemo(() => {
        if (!equipos) return [];
        return equipos.filter(e => {
            const matchesSport = sportFilter === "todos" || e.disciplina_id === sportFilter;
            const matchesGender = genderFilter === "todos" || e.genero === genderFilter;
            
            const safeName = e.nombre || "";
            const careerNames = e.carrera_ids ? getCareerNames(e.carrera_ids) : "";
            
            const matchesSearch = safeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                careerNames.toLowerCase().includes(searchQuery.toLowerCase());
            
            const isPlaceholder = /^\d+$/.test(safeName.trim()) || 
                                safeName.toLowerCase().includes("finalista") || 
                                safeName.toLowerCase().includes("ganador") ||
                                safeName.toLowerCase().includes("cupo") ||
                                safeName.toLowerCase().includes("grupo");
            
            const isRealCombinedTeam = (e.carrera_ids?.length || 0) >= 2;

            return matchesSport && matchesGender && matchesSearch && !isPlaceholder && isRealCombinedTeam;
        });
    }, [equipos, sportFilter, genderFilter, searchQuery, carreras]);

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: "carreras", label: "Carreras", icon: GraduationCap },
        { id: "equipos", label: "Equipos", icon: Users },
    ];

    const top3 = careerStatsList.slice(0, 3);
    const podiumOrder = top3.length === 3 
        ? [top3[1], top3[0], top3[2]] 
        : top3.length === 2 
            ? [top3[1], top3[0]] 
            : top3;

    // Components
    const TopPodium = ({ entry, rank }: { entry: any, rank: number }) => {
        const isFirst = rank === 1;
        const podiumConfigs: Record<number, any> = {
            1: {
                glow: "shadow-[0_0_50px_rgba(16,185,129,0.2)] border-emerald-500/40 ring-1 ring-emerald-500/10",
                height: "h-[320px] sm:h-[350px]",
                icon: <Crown size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />,
                iconBg: "bg-emerald-500/20 border-emerald-400/30",
                number: "01",
                numberColor: "text-emerald-400/20"
            },
            2: {
                glow: "shadow-[0_0_30px_rgba(139,92,246,0.1)] border-violet-500/20",
                height: "h-[280px] sm:h-[300px]",
                icon: <Medal size={20} className="text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" />,
                iconBg: "bg-violet-500/10 border-violet-500/20",
                number: "02",
                numberColor: "text-violet-400/10"
            },
            3: {
                glow: "shadow-[0_0_30px_rgba(167,139,250,0.05)] border-white/5",
                height: "h-[270px] sm:h-[290px]",
                icon: <Award size={20} className="text-white/20" />,
                iconBg: "bg-white/5 border-white/10",
                number: "03",
                numberColor: "text-white/5"
            }
        };

        const config = podiumConfigs[rank] || podiumConfigs[1];

        return (
            <Link
                href={`/carrera/${entry.id}`}
                className={cn(
                    "flex flex-col items-center group cursor-pointer relative",
                    isFirst ? "z-30 w-[140px] sm:w-[180px]" : "z-20 w-[110px] sm:w-[140px]"
                )}
            >
                {isFirst && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-black px-4 py-1 rounded-md uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-bounce z-40 font-sans">
                        Líder
                    </div>
                )}

                <div className={cn(
                    "w-full bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 transition-all duration-500 hover:bg-white/10 flex flex-col items-center pt-6 sm:pt-10 overflow-hidden relative",
                    config.height, config.glow,
                    "group-hover:scale-[1.05]"
                )}>
                    <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-3 sm:mb-4 border shadow-inner shrink-0",
                        config.iconBg
                    )}>
                        {config.icon}
                    </div>

                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 border border-white/10 overflow-hidden p-2 shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                        {entry.escudo_url ? (
                            <img src={entry.escudo_url} alt={entry.nombre} className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/20 uppercase tracking-tighter">NI</div>
                        )}
                    </div>

                    <div className="text-center px-2 space-y-1 mb-6 relative z-10">
                        <h4 className="font-display text-[13px] sm:text-[16px] font-bold text-white tracking-tight leading-tight line-clamp-2 px-1 group-hover:text-violet-400 transition-colors">
                            {entry.nombre}
                        </h4>
                        <p className="text-[9px] sm:text-[11px] font-medium text-white/40 italic font-sans uppercase tracking-[0.1em]">
                            {entry.won} Victorias
                        </p>
                    </div>

                    <div className="mt-auto w-full bg-white/5 h-16 sm:h-20 flex items-center justify-center relative border-t border-white/5 overflow-hidden">
                        <span className={cn(
                            "font-sans text-5xl sm:text-6xl font-black tracking-tighter opacity-80 z-10",
                            config.numberColor
                        )}>
                            {config.number}
                        </span>
                    </div>
                </div>
            </Link>
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><UniqueLoading size="lg" /></div>;

    const selectedSportName = disciplinas.find(d => d.id === sportFilter)?.name || "Global";

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 font-sans relative overflow-hidden">

            {/* Background Element Watermark - MORE VISIBLE */}
            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-start overflow-hidden opacity-[0.05]">
                <img 
                    src="/elementos/12.png" 
                    alt="" 
                    className="w-[800px] md:w-[1100px] h-auto -translate-x-[20%] translate-y-[10%] filter grayscale contrast-150 brightness-200" 
                    aria-hidden="true"
                />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-12 pb-24 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center gap-2 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 rounded-full border border-violet-500/20 mb-2 shadow-inner">
                        <Trophy size={12} className="text-violet-400" />
                        <span className="font-sans text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">Clasificación y Equipos</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter font-display text-white drop-shadow-2xl leading-none">
                        Equipos
                    </h1>
                    <p className="text-white/30 font-bold max-w-xl mx-auto mt-4 text-sm md:text-base leading-relaxed uppercase tracking-widest font-sans italic">
                        Consulta el desempeño estratégico de las delegaciones.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-12 animate-in fade-in duration-700 delay-200">
                    <div className="flex w-full md:w-auto p-1.5 bg-[#3a1c5e]/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-1 md:w-40 flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 font-sans",
                                        isActive
                                            ? "bg-violet-600 text-white shadow-xl shadow-violet-600/20 scale-105"
                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Gender Filters */}
                    <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
                            <input 
                                type="text" 
                                placeholder={activeTab === "carreras" ? "Buscar facultad..." : "Buscar equipo..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.12] backdrop-blur-3xl border border-white/30 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:bg-white/[0.18] focus:ring-4 focus:ring-white/10 focus:border-white/40 transition-all font-sans shadow-[0_0_30px_rgba(255,255,255,0.05)] placeholder:text-white/40 text-white"
                            />
                        </div>
                        <div className="flex gap-2 p-1.5 bg-[#3a1c5e]/40 backdrop-blur-xl border border-white/10 rounded-2xl shrink-0 shadow-inner">
                            {[
                                { id: 'todos', label: 'Todos', icon: <Users size={14} /> },
                                { id: 'masculino', label: '♂', icon: null },
                                { id: 'femenino', label: '♀', icon: null },
                            ].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => setGenderFilter(g.id)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 font-sans",
                                        genderFilter === g.id
                                            ? "bg-white/10 text-white shadow-inner"
                                            : "text-white/20 hover:text-white/60 hover:bg-white/5"
                                    )}
                                >
                                    {g.label}
                                </button>
                            ))}
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
                                        ? "bg-violet-600 text-white border-transparent shadow-xl shadow-violet-600/20 scale-105"
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
                        {/* Podium Section */}
                        {searchQuery === "" && (
                            <div className="flex justify-center items-end gap-2 sm:gap-6 pt-10 min-h-[350px]">
                                {podiumOrder.map((entry, idx) => {
                                    const realRank = top3.indexOf(entry) + 1;
                                    return <TopPodium key={'podium-' + entry.id} entry={entry} rank={realRank} />;
                                })}
                            </div>
                        )}

                        {/* List Section */}
                        <div className="flex flex-col gap-3 relative z-20">
                            {filteredCarreras.map((entry, idx) => {
                                const rank = (idx + 1).toString().padStart(2, '0');
                                return (
                                    <Link
                                        key={entry.id}
                                        href={`/carrera/${entry.id}`}
                                        className="flex flex-col sm:flex-row bg-[#3a1c5e]/40 backdrop-blur-xl border border-white/10 hover:border-violet-500/30 transition-all duration-500 hover:translate-x-1 group shadow-2xl rounded-3xl overflow-hidden min-h-[120px]"
                                    >
                                        <div className="absolute inset-0 bg-background mix-blend-overlay opacity-30 pointer-events-none group-hover:opacity-20 transition-opacity" />
                                        <div className="flex flex-1 w-full">
                                            {/* Avatar Column */}
                                            <div className="w-[80px] sm:w-[130px] shrink-0 border-r border-white/10 relative flex items-center justify-center bg-white/5 p-2">
                                                {entry.escudo_url ? (
                                                    <div className="w-14 h-14 sm:w-20 sm:h-20 z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] relative flex items-center justify-center">
                                                        <img src={entry.escudo_url} alt={entry.nombre} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                                                    </div>
                                                ) : (
                                                    <span className="font-sans text-3xl sm:text-5xl font-black text-white/5 uppercase tracking-tighter z-10">
                                                        {entry.nombre.substring(0,2).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Center Content Column */}
                                            <div className="flex-1 px-4 sm:px-6 py-4 flex flex-col justify-between min-w-0">
                                                <div className="mb-3">
                                                    <div className="inline-flex border-b-2 border-emerald-500/30 pb-0.5 mb-2 gap-2 items-center">
                                                        <span className="font-sans text-[11px] sm:text-xs font-black text-emerald-400 tracking-widest leading-none pr-1">{rank}</span>
                                                        <span className="font-sans text-[8px] font-black uppercase text-white/20 tracking-widest leading-none">Ranking {selectedSportName}</span>
                                                    </div>

                                                    <h2 className="font-display text-lg sm:text-2xl font-bold text-white leading-tight tracking-tight group-hover:text-violet-400 transition-colors">
                                                        {entry.nombre}
                                                    </h2>

                                                    <span className="font-sans text-[9px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1 block truncate">
                                                        PJ: {entry.played} Partidos Finalizados
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-8 mt-auto items-end">
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                                                            <Trophy size={11} className="sm:w-3.5 sm:h-3.5" />
                                                        </div>
                                                        <span className="font-sans text-xs sm:text-xl font-black text-white tabular-nums">
                                                            {entry.won.toString().padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 sm:gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                                                            <Activity size={11} className="sm:w-3.5 sm:h-3.5" />
                                                        </div>
                                                        <span className="font-sans text-[10px] sm:text-xs font-bold text-white/40 tabular-nums">
                                                            {entry.played.toString().padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Metric Box: Victorias Column */}
                                        <div className="w-full sm:w-[130px] h-12 sm:h-auto shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 flex flex-row sm:flex-col items-center justify-between sm:justify-center px-6 sm:px-0 bg-[#0a0515]/40 group-hover:bg-violet-600/10 transition-colors relative">
                                            <div className="flex flex-row sm:flex-col items-center gap-2 sm:gap-0">
                                                <span className="font-sans text-xl sm:text-4xl font-bold text-white tracking-tighter leading-none tabular-nums group-hover:text-emerald-400 transition-colors font-mono">
                                                    {entry.won}
                                                </span>
                                                <span className="font-sans text-[8px] sm:text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] sm:pt-1">
                                                    Victorias
                                                </span>
                                            </div>

                                            <div className="font-sans text-[11px] font-black text-white/40 font-mono tracking-widest sm:mt-2 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                {entry.played} PD
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tab: Equipos */}
                {activeTab === "equipos" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
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
                                    className="group relative flex items-center gap-8 bg-[#3a1c5e]/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 lg:p-10 overflow-hidden hover:border-violet-500/30 transition-all duration-500 shadow-2xl"
                                >
                                    <div className="absolute inset-0 bg-background mix-blend-overlay opacity-30 pointer-events-none group-hover:opacity-20 transition-opacity" />
                                    <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center p-6 shrink-0 shadow-inner group-hover:scale-105 group-hover:bg-white/10 transition-all duration-700 relative text-white/20 group-hover:text-violet-400">
                                        <SportIcon sport={discName} size={48} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-2xl lg:text-3xl font-bold text-white font-display tracking-tight leading-none group-hover:text-violet-400 transition-colors">
                                                {discName}
                                            </h4>
                                            <div className="p-2 border border-white/10 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <ArrowUpRight size={14} className="text-white" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                                {e.genero || 'Masculino'}
                                            </span>
                                            {isCombined && (
                                              <span className="text-[10px] font-black uppercase text-violet-400 tracking-widest px-2.5 py-1 bg-violet-600/10 rounded-lg border border-violet-500/20">
                                                  COMBINADO
                                              </span>
                                            )}
                                        </div>

                                        <p className="text-[11px] lg:text-[13px] font-bold text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-[0.2em] leading-relaxed font-sans italic">
                                            {careerLabels}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
