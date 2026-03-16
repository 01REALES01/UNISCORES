"use client";

import { useState, useMemo } from "react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/use-matches";
import { GroupStageTable } from "@/components/group-stage-table";
import { BracketTree } from "@/components/bracket-tree";
import { SPORT_EMOJI, SPORT_ACCENT, SPORT_GRADIENT, SPORT_BORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Trophy, Users, Swords } from "lucide-react";

const BRACKET_SPORTS = ['Fútbol', 'Baloncesto', 'Voleibol'] as const;
const GENDERS = [
    { label: 'Masculino', value: 'masculino', icon: '♂', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { label: 'Femenino', value: 'femenino', icon: '♀', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
] as const;

export default function ClasificacionPage() {
    const { user, profile, isStaff } = useAuth();
    const { matches, loading } = useMatches();

    const [selectedSport, setSelectedSport] = useState<string>('Fútbol');
    const [selectedGender, setSelectedGender] = useState<string>('masculino');

    // Filter matches for the selected sport and gender
    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            const sportMatch = m.disciplinas?.name === selectedSport;
            const genderMatch = (m.genero || 'masculino') === selectedGender;
            const hasFase = m.fase != null;
            return sportMatch && genderMatch && hasFase;
        });
    }, [matches, selectedSport, selectedGender]);

    // Group matches by fase
    const groupMatches = useMemo(() => {
        return filteredMatches.filter(m => m.fase === 'grupos');
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

    const accent = SPORT_ACCENT[selectedSport] || 'text-amber-400';

    return (
        <div className="min-h-screen bg-[#0a0816] text-white selection:bg-indigo-500/30 font-sans">
            {/* Ambient Background Gradient */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navbar */}
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-6xl mx-auto px-4 pt-8 pb-16 relative z-10">
                {/* Header */}
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-2">
                        <Swords className={cn("w-6 h-6", accent)} />
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Clasificación & Grupos
                        </h1>
                    </div>
                    <p className="text-white/40 text-sm max-w-lg">
                        Fase de grupos y eliminación directa de los deportes de equipo
                    </p>
                </div>

                {/* Sport Selector Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    {BRACKET_SPORTS.map((sport) => (
                        <button
                            key={sport}
                            onClick={() => setSelectedSport(sport)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border",
                                selectedSport === sport
                                    ? cn("bg-white/10 border-white/20 text-white shadow-lg", SPORT_BORDER[sport])
                                    : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white/80"
                            )}
                        >
                            <span className="text-base">{SPORT_EMOJI[sport]}</span>
                            <span>{sport}</span>
                        </button>
                    ))}
                </div>

                {/* Gender Selector */}
                <div className="flex gap-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    {GENDERS.map((g) => (
                        <button
                            key={g.value}
                            onClick={() => setSelectedGender(g.value)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                                selectedGender === g.value
                                    ? g.color
                                    : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5"
                            )}
                        >
                            <span className="text-sm">{g.icon}</span>
                            <span>{g.label}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        <p className="text-white/30 text-xs mt-4 uppercase tracking-widest font-bold">Cargando clasificación...</p>
                    </div>
                ) : filteredMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Trophy size={56} className="text-white/10 mb-6" />
                        <h3 className="text-lg font-bold text-white/30 mb-2">Sin clasificación aún</h3>
                        <p className="text-white/20 text-sm max-w-md">
                            La clasificación de {SPORT_EMOJI[selectedSport]} {selectedSport} ({selectedGender}) se mostrarán aquí cuando se configuren desde el panel de administración.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* ── GROUP STAGE ── */}
                        {groups.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <Users size={18} className={accent} />
                                    <h2 className="text-lg font-black uppercase tracking-wider text-white/80">
                                        Fase de Grupos
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {groups.map((grupo) => {
                                        const gMatches = groupMatches.filter(m => m.grupo === grupo);
                                        return (
                                            <GroupStageTable
                                                key={grupo}
                                                matches={gMatches as any[]}
                                                sportName={selectedSport}
                                                grupo={grupo}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ── KNOCKOUT STAGE ── */}
                        {bracketMatches.length > 0 && (
                            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                                <div className="flex items-center gap-3 mb-6">
                                    <Swords size={18} className={accent} />
                                    <h2 className="text-lg font-black uppercase tracking-wider text-white/80">
                                        Eliminación Directa
                                    </h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                </div>

                                <div className={cn(
                                    "bg-[#0a0805] border rounded-2xl p-6 overflow-hidden",
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
