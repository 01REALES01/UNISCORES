"use client";

import { useEffect, useState, useMemo } from "react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/use-matches";
import { GroupStageTable } from "@/components/group-stage-table";
import { BracketTree } from "@/components/bracket-tree";
import { SPORT_ACCENT, SPORT_GRADIENT, SPORT_BORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Trophy, Users, Swords, ShieldAlert, GraduationCap } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calculateStandings, compareStandings, type TeamStanding } from "@/modules/matches/utils/standings";
import { SportIcon } from "@/components/sport-icons";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";

const BRACKET_SPORTS = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis'] as const;
const GENDERS = [
    { label: 'Masculino', value: 'masculino', icon: '♂', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { label: 'Femenino', value: 'femenino', icon: '♀', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
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
    const isTenis = selectedSport === 'Tenis';

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

    const [fairPlayData, setFairPlayData] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchFairPlay = async () => {
            const matchIds = filteredMatches.map(m => m.id);
            if (matchIds.length === 0) return;

            const { data } = await supabase
                .from('olympics_eventos')
                .select('tipo_evento, equipo')
                .in('partido_id', matchIds)
                .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja']);

            if (data) {
                const counts: Record<string, number> = {};
                data.forEach(e => {
                    const team = e.equipo;
                    if (!team) return;
                    if (!counts[team]) counts[team] = 0;
                    if (e.tipo_evento === 'tarjeta_amarilla') counts[team] -= 1;
                    if (e.tipo_evento === 'tarjeta_roja') counts[team] -= 3;
                });
                setFairPlayData(counts);
            }
        };
        fetchFairPlay();
    }, [filteredMatches]);

    // Calculate best thirds if there are multiple groups
    const bestThirds = useMemo(() => {
        if (groups.length < 2) return [];
        const thirds: TeamStanding[] = [];
        groups.forEach(grupo => {
            const gMatches = groupMatches.filter(m => m.grupo === grupo);
            const s = calculateStandings(gMatches, selectedSport, fairPlayData);
            if (s.length >= 3) {
                thirds.push(s[2]); // 3rd place is index 2
            }
        });
        return thirds.sort((a, b) => compareStandings(a, b, selectedSport));
    }, [groups, groupMatches, selectedSport, fairPlayData]);

    const accent = SPORT_ACCENT[selectedSport] || 'text-amber-400';
    const border = SPORT_BORDER[selectedSport] || 'border-white/10';

    return (
        <div className="min-h-screen bg-background text-white selection:bg-violet-500/30 font-sans relative overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 bg-background mix-blend-multiply opacity-50" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] max-w-[1400px] opacity-[0.05] mix-blend-screen pointer-events-none">
                    <img src="/elementos/06.png" alt="3D Element" className="w-full h-auto object-contain filter invert opacity-80" />
                </div>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 relative z-10 shrink-0">
                {/* Header Section */}
                <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <p className="font-display text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-wide mb-2">
                            Tournament Bracket
                        </p>
                        <div className="flex items-end gap-4 flex-wrap justify-center lg:justify-start">
                            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
                                Clasificación
                            </h1>
                            <Link
                                href="/medallero"
                                className="mb-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400/80 hover:text-violet-300 hover:bg-violet-500/20 text-xs font-bold transition-colors"
                            >
                                <GraduationCap size={13} />
                                Ver sección de equipos
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Filters Area */}
                <div className="flex flex-col lg:flex-row gap-6 mb-12">
                    {/* Sport Selector Tabs */}
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 w-full lg:w-auto">
                        {BRACKET_SPORTS.map((sport) => {
                            const isActive = selectedSport === sport;
                            return (
                                <button
                                    key={sport}
                                    onClick={() => setSelectedSport(sport)}
                                    className={cn(
                                        "group relative min-w-[110px] h-28 rounded-[2rem] flex flex-col items-center justify-center border transition-all duration-500 overflow-hidden shrink-0",
                                        isActive
                                            ? "bg-white/5 border-violet-500/40 shadow-[0_0_30px_rgba(124,58,237,0.15)] scale-105"
                                            : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5"
                                    )}
                                >
                                    {/* Active Glow */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/20 to-transparent mix-blend-overlay" />
                                    )}
                                    
                                    {/* 3D Icon */}
                                    <div className="z-10 flex flex-col items-center gap-3">
                                        <SportIcon 
                                            sport={sport} 
                                            size={isActive ? 42 : 32} 
                                            className={cn(
                                                "transition-all duration-500",
                                                isActive ? "drop-shadow-[0_10px_15px_rgba(255,255,255,0.2)] scale-110" : "grayscale-[0.6] opacity-60 group-hover:grayscale-0 group-hover:opacity-100"
                                            )} 
                                        />
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                            isActive ? "text-white" : "text-white/40 group-hover:text-white/80"
                                        )}>
                                            {sport}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Gender Selector (always visible now) */}
                    <div className="flex lg:flex-row gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <div className="flex lg:flex-col gap-2">
                            {GENDERS.map((g) => {
                                const isSelected = selectedGender === g.value;
                                return (
                                    <button
                                        key={g.value}
                                        onClick={() => setSelectedGender(g.value)}
                                        className={cn(
                                            "relative flex items-center justify-center gap-2.5 px-6 lg:px-8 py-3.5 rounded-full text-xs font-display font-black tracking-wide transition-all overflow-hidden border",
                                            isSelected
                                                ? "bg-white text-violet-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                                : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
                                        )}
                                    >
                                        <span className={cn("relative z-10 text-base leading-none transition-colors", isSelected ? "text-violet-600" : "")}>{g.icon}</span>
                                        <span className="relative z-10 uppercase tracking-widest">{g.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {isTenis && (
                            <div className="flex lg:flex-col gap-2">
                                {CATEGORIES.map((c: { label: string, value: string }) => {
                                    const isSelected = selectedCategory === c.value;
                                    return (
                                        <button
                                            key={c.value}
                                            onClick={() => setSelectedCategory(c.value)}
                                            className={cn(
                                                "relative flex items-center justify-center gap-2.5 px-6 lg:px-8 py-3.5 rounded-full text-xs font-display font-black tracking-wide transition-all overflow-hidden border uppercase",
                                                isSelected
                                                    ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                                    : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80"
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

                {/* ━━━ INSTITUTIONAL BRAND BREAK ━━━ */}
                <div className="mt-4 mb-16 relative z-0">
                    <InstitutionalBanner />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        <p className="text-white/30 text-xs mt-4 uppercase tracking-widest font-bold">Cargando clasificación...</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* ── GROUP STAGE ── */}
                        {groups.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <Users size={22} className={accent} />
                                    <h2 className="text-2xl font-display font-black tracking-tight text-white/90">
                                        Fase de Grupos
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-4" />
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
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ── BEST THIRDS ── */}
                        {bestThirds.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                                <div className="flex items-center gap-3 mb-6">
                                    <Trophy size={22} className="text-amber-400" />
                                    <h2 className="text-2xl font-display font-black tracking-tight text-white/90">
                                        Tabla de Mejores Terceros
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-4" />
                                </div>

                                <div className="bg-black/20 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                    <div className="overflow-x-auto min-w-full">
                                        <table className="w-full text-xs min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-white/5 text-white/30 uppercase tracking-[0.2em] text-[10px] font-black bg-white/[0.02]">
                                                    <th className="text-left py-4 px-6 sm:px-8">#</th>
                                                    <th className="text-left py-4 px-4 w-1/3">Equipo</th>
                                                    <th className="text-center py-4 px-3 w-16">Grupo</th>
                                                    <th className="text-center py-4 px-3 w-12">PJ</th>
                                                    <th className="text-center py-4 px-3 w-16">{selectedSport === 'Voleibol' ? 'RS' : 'DIF'}</th>
                                                    <th className="text-center py-4 px-3 w-16">FP</th>
                                                    <th className="text-center py-4 px-6 sm:px-8 w-16 text-violet-300">PTS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {bestThirds.map((team, idx) => (
                                                    <tr key={team.team} className="transition-all duration-300 hover:bg-white/[0.04]">
                                                        <td className="py-4 px-6 sm:px-8">
                                                            <span className={cn(
                                                                "w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shadow-inner border transition-all",
                                                                idx < 2 ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"
                                                            )}>
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4">
                                                            <span className={cn(
                                                                "font-black text-[13px] uppercase tracking-wide truncate max-w-[200px] block transition-colors",
                                                                idx < 2 ? "text-white" : "text-white/70"
                                                            )}>
                                                                {team.team}
                                                            </span>
                                                        </td>
                                                        <td className="text-center py-4 px-3 text-white/40 font-black text-[13px] italic tracking-tight">{team.grupo}</td>
                                                        <td className="text-center py-4 px-3 text-white/50 font-bold tabular-nums">{team.played}</td>
                                                        <td className="text-center py-4 px-3 font-black tabular-nums">
                                                            {selectedSport === 'Voleibol' 
                                                                ? <span className="text-white/40 italic">{(team.setsLost === 0 ? team.setsWon : (team.setsWon / team.setsLost)).toFixed(2)}</span>
                                                                : <span className={cn("italic", team.diff > 0 ? 'text-emerald-400 font-black' : team.diff < 0 ? 'text-rose-400 font-bold' : 'text-white/40 font-bold')}>{team.diff > 0 ? `+${team.diff}` : team.diff}</span>
                                                            }
                                                        </td>
                                                        <td className="text-center py-4 px-3">
                                                            <div className={cn(
                                                                "inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-md border tabular-nums transition-colors",
                                                                team.fairPlay < 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-400 font-black" : "bg-white/5 border-white/5 text-white/30 font-bold"
                                                            )}>
                                                                <ShieldAlert size={10} className="shrink-0" />
                                                                {team.fairPlay}
                                                            </div>
                                                        </td>
                                                        <td className="text-center py-4 px-6 sm:px-8">
                                                            <span className={cn(
                                                                "font-black text-xl italic tracking-tighter tabular-nums transition-all",
                                                                idx < 2 ? "text-violet-300 scale-105 drop-shadow-md" : "text-white/60"
                                                            )}>
                                                                {team.points}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5">
                                        <p className="text-[10px] text-white/30 italic uppercase tracking-[0.2em] font-black">
                                            * Los mejores terceros califican a la siguiente fase
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ── KNOCKOUT STAGE ── */}
                        {bracketMatches.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                                <div className="flex items-center gap-3 mb-6">
                                    <Swords size={22} className={accent} />
                                    <h2 className="text-2xl font-display font-black tracking-tight text-white/90">
                                        Eliminación Directa
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-4" />
                                </div>

                                <div className={cn(
                                    "bg-black/20 backdrop-blur-3xl border rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl",
                                    SPORT_BORDER[selectedSport] || "border-white/10"
                                )}>
                                    <BracketTree
                                        matches={bracketMatches as any[]}
                                        sportName={selectedSport}
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
