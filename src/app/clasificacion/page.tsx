"use client";

import { useEffect, useState, useMemo } from "react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/use-matches";
import { GroupStageTable } from "@/components/group-stage-table";
import { BracketTree } from "@/components/bracket-tree";
import { SPORT_ACCENT, SPORT_GRADIENT, SPORT_BORDER, DEPORTES_INDIVIDUALES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Trophy, Users, Swords, ShieldAlert, GraduationCap, Mars, Venus, Shield, ChevronDown, Filter, Target, History, RefreshCcw } from "lucide-react";
import { FairPlayTable } from "@/modules/matches/components/fair-play-table";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateStandings, compareStandings, type TeamStanding } from "@/modules/matches/utils/standings";
import { SportIcon } from "@/components/sport-icons";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";

const BRACKET_SPORTS = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis'] as const;
const GENDERS = [
    { label: 'Masculino', value: 'masculino', icon: <Mars size={18} />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { label: 'Femenino', value: 'femenino', icon: <Venus size={18} />, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
] as const;

const CATEGORIES = [
    { label: 'Intermedio', value: 'intermedio' },
    { label: 'Avanzado', value: 'avanzado' },
] as const;

export default function ClasificacionPage() {
    const { user, profile, isStaff } = useAuth();
    const { matches, loading } = useMatches();

    const [selectedSport, setSelectedSport] = useState<string>('Fútbol');
    const [selectedGender, setSelectedGender] = useState<string>('masculino');
    const [selectedCategory, setSelectedCategory] = useState<string>('avanzado');
    const [hideTeamBrackets, setHideTeamBrackets] = useState<boolean>(false);
    const isTenis = selectedSport === 'Tenis';
    const isTeamSport = ['Fútbol', 'Voleibol', 'Baloncesto'].includes(selectedSport);

    // Fetch site configuration + realtime updates
    useEffect(() => {
        supabase.from('site_config').select('value').eq('key', 'hide_team_brackets').maybeSingle()
            .then(({ data }) => { if (data) setHideTeamBrackets(data.value === true); });

        const channel = supabase.channel('site_config_bracket')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_config', filter: 'key=eq.hide_team_brackets' },
                (payload) => setHideTeamBrackets(payload.new.value === true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Smart auto-selection: If the current filter is empty but other categories have data, switch to them.
    useEffect(() => {
        if (matches.length === 0) return;
        
        const currentData = matches.filter(m => 
            m.disciplinas?.name === selectedSport &&
            (m.genero || 'masculino').toLowerCase() === selectedGender.toLowerCase() &&
            (!isTenis || (m.categoria || 'avanzado').toLowerCase() === selectedCategory.toLowerCase())
        );

        if (currentData.length === 0) {
            // Find the category/gender combination with the MOST matches for this sport
            const sportMatches = matches.filter(m => m.disciplinas?.name === selectedSport);
            if (sportMatches.length > 0) {
                const stats: Record<string, number> = {};
                sportMatches.forEach(m => {
                    const key = `${m.genero || 'masculino'}-${m.categoria || 'avanzado'}`;
                    stats[key] = (stats[key] || 0) + 1;
                });

                // Get the best key
                const bestKey = Object.entries(stats).sort((a, b) => b[1] - a[1])[0][0];
                const [newGender, newCategory] = bestKey.split('-');
                
                if (newGender.toLowerCase() !== selectedGender.toLowerCase()) setSelectedGender(newGender);
                if (isTenis && newCategory.toLowerCase() !== selectedCategory.toLowerCase()) setSelectedCategory(newCategory);
            }
        }
    }, [selectedSport, matches, isTenis]);

    // Filter matches for the selected sport, gender and category (if tenis)
    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            const sportMatch = m.disciplinas?.name === selectedSport;
            const genderMatch = (m.genero || 'masculino').toLowerCase() === selectedGender.toLowerCase();
            const categoryMatch = !isTenis || (m.categoria || 'avanzado').toLowerCase() === selectedCategory.toLowerCase();
            const hasFase = m.fase != null;
            return sportMatch && genderMatch && categoryMatch && hasFase;
        });
    }, [matches, selectedSport, selectedGender, selectedCategory, isTenis]);

    // Group matches by fase
    const groupMatches = useMemo(() => {
        if (matches.length === 0) return [];
        return filteredMatches.filter((m: any) => {
            if (m.fase !== 'grupos') return false;
            
            const a = String(m.equipo_a).toUpperCase();
            const b = String(m.equipo_b).toUpperCase();
            
            if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
            
            const elimKeywords = ['GANADOR', 'PERDEDOR', 'LLAVE', 'FINAL', '1RO', '2DO', '3RO', '4TO'];
            if (elimKeywords.some(kw => a.includes(kw) || b.includes(kw))) return false;
            
            return true;
        });
    }, [filteredMatches]);

    const bracketMatches = useMemo(() => {
        return filteredMatches.filter(m => m.fase !== 'grupos');
    }, [filteredMatches]);

    // Get unique groups
    const groups = useMemo(() => {
        const g = new Set<string>();
        groupMatches.forEach(m => {
            if (m.grupo) g.add(m.grupo);
        });
        return Array.from(g).sort();
    }, [groupMatches]);

    const [carreras, setCarreras] = useState<any[]>([]);

    useEffect(() => {
        const fetchCarreras = async () => {
            const { data } = await supabase.from('carreras').select('id, nombre');
            if (data) setCarreras(data);
        };
        fetchCarreras();
    }, []);

    const [fairPlayData, setFairPlayData] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchFairPlay = async () => {
            const matchIds = filteredMatches.map(m => m.id);
            if (matchIds.length === 0) return;

            // Build lookup: matchId + '_equipo_a' → real team name
            const teamNameByMatchAndSide: Record<string, string> = {};
            filteredMatches.forEach(m => {
                const a = m.delegacion_a || m.equipo_a;
                const b = m.delegacion_b || m.equipo_b;
                if (a) teamNameByMatchAndSide[`${m.id}_equipo_a`] = a;
                if (b) teamNameByMatchAndSide[`${m.id}_equipo_b`] = b;
            });

            const { data } = await supabase
                .from('olympics_eventos')
                .select('tipo_evento, equipo, descripcion, partido_id')
                .in('partido_id', matchIds)
                .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento', 'ajuste_fair_play']);

            if (data) {
                const counts: Record<string, number> = {};
                // Initialize all teams with baseline 2000
                filteredMatches.forEach(m => {
                    const a = m.delegacion_a || m.equipo_a;
                    const b = m.delegacion_b || m.equipo_b;
                    if (a && !(a in counts)) counts[a] = 2000;
                    if (b && !(b in counts)) counts[b] = 2000;
                });
                data.forEach((e: any) => {
                    const team = e.equipo;
                    if (!team) return;
                    // Resolve 'equipo_a'/'equipo_b' to real team name
                    const resolvedTeam = teamNameByMatchAndSide[`${e.partido_id}_${team}`] || team;
                    if (!(resolvedTeam in counts)) counts[resolvedTeam] = 2000;
                    if (e.tipo_evento === 'tarjeta_amarilla') counts[resolvedTeam] -= 50;
                    if (e.tipo_evento === 'tarjeta_roja') counts[resolvedTeam] -= 100;
                    if (e.tipo_evento === 'expulsion_delegado') counts[resolvedTeam] -= 100;
                    if (e.tipo_evento === 'mal_comportamiento') counts[resolvedTeam] -= 100;
                    if (e.tipo_evento === 'ajuste_fair_play') counts[resolvedTeam] += Number(e.descripcion ?? 0);
                });
                setFairPlayData(counts);
            }
        };
        fetchFairPlay();
    }, [filteredMatches]);

    // Helper to normalize career names (extremely robust)
    const normalizeName = (name: string) => {
        return name.toLowerCase()
            .trim()
            .replace(/^ing\.?\s*/, 'ingeniería ')
            .replace(/^lic\.?\s*/, 'licenciatura ')
            .replace(/^odont\.?\s*/, 'odontología ')
            .replace(/\s+/g, ' ');
    };

    const cleanName = (name: string) => {
        return normalizeName(name)
            .replace(/^(ingeniería|licenciatura|odontología)\s+/, '')
            .trim();
    };

    const stripName = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Build a global name-to-id map from all matches + careers table
    const teamIdMap = useMemo(() => {
        const map: Record<string, { teamId?: string; athleteId?: string; avatarUrl?: string; escudoUrl?: string }> = {};
        
        // 1. Fill from careers table (very reliable)
        carreras.forEach(c => {
            const raw = (c.nombre || '').trim().toLowerCase();
            const norm = normalizeName(c.nombre || '');
            const clean = cleanName(c.nombre || '');
            const stripped = stripName(c.nombre || '');
            
            if (raw) map[raw] = { teamId: String(c.id), escudoUrl: c.escudo_url };
            if (norm) map[norm] = { teamId: String(c.id), escudoUrl: c.escudo_url };
            if (clean) map[clean] = { teamId: String(c.id), escudoUrl: c.escudo_url };
            if (stripped) map[stripped] = { teamId: String(c.id), escudoUrl: c.escudo_url };
        });

        // 2. Fill from matches (for athletes and as fallback)
        matches.forEach(m => {
            const teamA = m.delegacion_a || m.equipo_a || '';
            const teamB = m.delegacion_b || m.equipo_b || '';
            
            const process = (name: string, cid?: any, aid?: any, icon?: string) => {
                if (!name) return;
                const raw = name.trim().toLowerCase();
                const norm = normalizeName(name);
                const clean = cleanName(name);
                const stripped = stripName(name);
                
                const data: any = aid 
                    ? { athleteId: String(aid), avatarUrl: icon } 
                    : (cid ? { teamId: String(cid), escudoUrl: icon } : (icon ? { avatarUrl: icon, escudoUrl: icon } : null));
                
                if (data) {
                    if (!map[raw]) map[raw] = data;
                    if (!map[norm]) map[norm] = data;
                    if (!map[clean]) map[clean] = data;
                    if (!map[stripped]) map[stripped] = data;
                }
            };

            process(teamA, m.carrera_a_id, m.athlete_a_id, m.atleta_a?.avatar_url || m.carrera_a?.escudo_url || m.delegacion_a_info?.escudo_url);
            process(teamB, m.carrera_b_id, m.athlete_b_id, m.atleta_b?.avatar_url || m.carrera_b?.escudo_url || m.delegacion_b_info?.escudo_url);
        });
        return map;
    }, [matches, carreras]);

    // Calculate best thirds if there are multiple groups
    const bestThirds = useMemo(() => {
        if (groups.length < 2) return [];
        const thirds: TeamStanding[] = [];
        groups.forEach(grupo => {
            const gMatches = groupMatches.filter(m => m.grupo === grupo);
            const s = calculateStandings(gMatches, selectedSport, fairPlayData, teamIdMap);
            if (s.length >= 3) {
                thirds.push(s[2]); // 3rd place is index 2
            }
        });
        return thirds.sort((a, b) => compareStandings(a, b, selectedSport));
    }, [groups, groupMatches, selectedSport, fairPlayData, teamIdMap]);

    const accent = SPORT_ACCENT[selectedSport] || 'text-amber-400';
    const border = SPORT_BORDER[selectedSport] || 'border-white/10';

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 font-sans relative overflow-x-hidden">

        {/* Background Element Watermark - WHITE-BEIGE STYLE */}
        <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.08]">
            <img 
                src="/elementos/06.png" 
                alt="" 
                className="w-[1000px] md:w-[1300px] h-auto filter grayscale brightness-[3] contrast-75" 
                aria-hidden="true"
            />
        </div>

            {/* Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 relative z-10 shrink-0">
                {/* Header Section */}
                <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center justify-center gap-2 mb-2 text-violet-400">
                             <div className="p-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <Trophy size={20} />
                            </div>
                            <h4 className="text-xs font-black tracking-widest font-display uppercase tracking-[0.2em]">Tournament Bracket</h4>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter leading-none font-display text-white drop-shadow-2xl">
                                Clasificación
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="flex flex-col gap-6 mb-12">
                    {/* 1. Sport Selector Tabs */}
                    <div className="flex justify-center w-full">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 px-1 w-full max-w-5xl justify-start sm:justify-center group animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                            {BRACKET_SPORTS.map((sport) => {
                                const isActive = selectedSport === sport;
                                return (
                                    <button
                                        key={sport}
                                        onClick={() => setSelectedSport(sport)}
                                        className={cn(
                                            "group/btn relative min-w-[110px] h-28 rounded-[2rem] flex flex-col items-center justify-center border transition-all duration-500 overflow-hidden shrink-0",
                                            isActive
                                                ? "bg-violet-600/20 border-violet-500/50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-105"
                                                : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 backdrop-blur-3xl"
                                        )}
                                    >
                                        {/* Active Glow */}
                                        {isActive && (
                                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/50 to-transparent pointer-events-none" />
                                        )}
                                        
                                        {/* 3D Icon */}
                                        <div className="z-10 flex flex-col items-center gap-3">
                                            <SportIcon 
                                                sport={sport} 
                                                size={isActive ? 42 : 32} 
                                                className={cn(
                                                    "transition-all duration-500",
                                                    isActive ? "drop-shadow-[0_0_10px_rgba(139,92,246,0.6)] scale-110" : "grayscale opacity-20 group-hover/btn:grayscale-0 group-hover/btn:opacity-100"
                                                )} 
                                            />
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                                isActive ? "text-violet-400" : "text-white/30 group-hover/btn:text-white/60"
                                            )}>
                                                {sport}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Gender & Level Selectors (Mobile optimized horizontal row) */}
                    <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        {/* Mobile scroll hint */}
                        <div className="flex sm:hidden items-center justify-between w-full mb-1 px-2 max-w-lg">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Opciones de categoría</span>
                            <span className="text-[9px] font-bold text-violet-400 italic font-mono">Desliza ↔</span>
                        </div>

                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 w-full justify-start sm:justify-center">
                            <div className="flex gap-2 shrink-0">
                                {GENDERS.map((g) => {
                                    const isSelected = selectedGender === g.value;
                                    return (
                                        <button
                                            key={g.value}
                                            onClick={() => setSelectedGender(g.value)}
                                            className={cn(
                                                "relative flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-full text-xs font-display font-black tracking-wide transition-all overflow-hidden border whitespace-nowrap",
                                                isSelected
                                                    ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-xl scale-105"
                                                    : "bg-black/40 border-white/10 text-white/40 hover:bg-white/10"
                                            )}
                                        >
                                            <span className={cn("relative z-10 leading-none flex items-center justify-center", isSelected ? "text-[#7C3AED]" : "text-violet-400")}>{g.icon}</span>
                                            <span className="relative z-10 uppercase tracking-widest">{g.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Separator line on mobile if tennis */}
                            {isTenis && <div className="w-px bg-slate-100 my-2 shrink-0 h-8 self-center" />}

                            {isTenis && (
                                <div className="flex gap-2 shrink-0">
                                    {CATEGORIES.map((c) => {
                                        const isSelected = selectedCategory === c.value;
                                        return (
                                            <button
                                                key={c.value}
                                                onClick={() => setSelectedCategory(c.value)}
                                                className={cn(
                                                    "relative flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-full text-xs font-display font-black tracking-wide transition-all overflow-hidden border uppercase whitespace-nowrap",
                                                isSelected
                                                        ? "bg-[#F5F5DC] text-[#7C3AED] border-[#F5F5DC] shadow-xl scale-105"
                                                        : "bg-black/40 border-white/10 text-white/40 hover:bg-white/10"
                                                )}
                                            >
                                                <span className="relative z-10 tracking-widest">{c.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ━━━ INSTITUTIONAL BRAND BREAK ━━━ */}
                <div className="mt-4 mb-16 relative z-0">
                    <InstitutionalBanner />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-8 h-8 border-2 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
                        <p className="text-slate-400 text-xs mt-4 uppercase tracking-widest font-bold">Cargando clasificación...</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* ── GROUP STAGE ── */}
                        {groups.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 bg-[#281345]/60 rounded-[2.5rem] p-6 md:p-8 border border-white/[0.04]">
                                <div className="flex items-center gap-3 mb-6">
                                    <Users size={22} className="text-violet-500" />
                                    <h2 className="text-2xl font-display font-black tracking-tight text-white">
                                        Fase de Grupos
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-violet-100 to-transparent ml-4" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {groups.map((grupo) => {
                                        const gMatches = groupMatches.filter(m => m.grupo === grupo);
                                        return (
                                            <GroupStageTable
                                                key={grupo}
                                                matches={gMatches}
                                                sportName={selectedSport}
                                                grupo={grupo}
                                                light={false}
                                                teamIdMap={teamIdMap}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        )}


                        {/* ── FAIR PLAY ── */}
                        {!DEPORTES_INDIVIDUALES.includes(selectedSport) && filteredMatches.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 bg-[#1a1340]/50 rounded-[2.5rem] p-6 md:p-8 border border-emerald-500/[0.06]">
                                <div className="flex items-center gap-3 mb-6">
                                    <Shield size={22} className="text-emerald-500" />
                                    <h2 className="text-2xl font-display font-black tracking-tight text-white">
                                        Fair Play
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-100 to-transparent ml-4" />
                                </div>
                                <FairPlayTable
                                    genero={selectedGender}
                                    sportName={selectedSport}
                                    teamIdMap={teamIdMap}
                                />
                            </section>
                        )}

                        {/* ── KNOCKOUT STAGE ── */}
                        {bracketMatches.length > 0 && !(isTeamSport && hideTeamBrackets) && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 bg-[#1e0f3a]/60 rounded-[2.5rem] p-6 md:p-8 border border-violet-500/[0.06]">
                                <div className="flex items-center gap-3 mb-6">
                                    <Swords size={22} className="text-violet-500" />
                                    <h2 className="text-2xl font-display font-black tracking-tight text-white">
                                        Eliminación Directa
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-violet-100 to-transparent ml-4" />
                                </div>

                                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl">
                                    <BracketTree
                                        matches={bracketMatches as any[]}
                                        sportName={selectedSport}
                                        light={false}
                                    />
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
