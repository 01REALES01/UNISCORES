"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, Badge } from "@/components/ui-primitives";
import {
    ShieldCheck,
    PenTool,
    Mic,
    Newspaper,
    Dribbble,
    Zap,
    TrendingUp,
    Star,
    Target,
    ChevronLeft,
    Loader2,
    Calendar,
    ArrowUpRight,
    Crown,
    Swords,
    Clock,
    Trophy,
    Activity,
    Users
} from "lucide-react";
import { FriendButton } from "@/modules/users/components/friend-button";
import { FollowButton } from "@/modules/users/components/follow-button";
import { FriendsList } from "@/modules/users/components/friends-list";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { motion } from "framer-motion";
import { isCreator, hasAuraBadge, hasMvpBadge, SPORT_ACCENT } from "@/lib/constants";
import { SportIcon } from "@/shared/components/sport-icons";
import { InstitutionalBanner } from "@/shared/components/institutional-banner";

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile: currentUserProfile, isStaff } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [carreras, setCarreras] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [followedProfiles, setFollowedProfiles] = useState<any[]>([]);
    const [followedCareers, setFollowedCareers] = useState<any[]>([]);
    const [friendsCount, setFriendsCount] = useState(0);
    const [athleteDisciplinas, setAthleteDisciplinas] = useState<any[]>([]);
    const [athleteTeams, setAthleteTeams] = useState<any[]>([]);
    const [detailedStats, setDetailedStats] = useState<any>({
        goals: 0,
        pts3: 0,
        pts2: 0,
        pts1: 0,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
        totalEvents: 0
    });
    const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
    const [sportStatsMap, setSportStatsMap] = useState<Record<string, any>>({});

    const renderRoleCard = (role: string) => {
        const roleLower = role.toLowerCase();
        const configs: Record<string, { color: string, icon: any, label: string, glow: string }> = {
            'admin': { 
                color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', 
                icon: <ShieldCheck size={12} />, 
                label: 'Administrator',
                glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            },
            'deportista': { 
                color: 'text-amber-200 border-amber-200/20 bg-amber-200/5', 
                icon: <Trophy size={12} />, 
                label: 'Deportista',
                glow: 'shadow-[0_0_15px_rgba(253,230,138,0.1)]'
            },
            'data_entry': { 
                color: 'text-red-400 border-red-500/20 bg-red-500/5', 
                icon: <PenTool size={12} />, 
                label: 'Data Entry',
                glow: 'shadow-[0_0_15px_rgba(239,68,68,0.1)]'
            },
            'periodista': { 
                color: 'text-blue-400 border-blue-500/20 bg-blue-500/5', 
                icon: <Newspaper size={12} />, 
                label: 'Redacción / Prensa',
                glow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]'
            }
        };

        const config = configs[roleLower] || { 
            color: 'text-white/40 border-white/10 bg-white/5', 
            icon: <Star size={12} />, 
            label: role,
            glow: ''
        };

        return (
            <div key={role} className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full border bg-black/40 backdrop-blur-md transition-all hover:scale-105 shadow-inner",
                config.color,
                config.glow
            )}>
                <span className="opacity-80">{config.icon}</span>
                <span className="text-[10px] font-display font-black tracking-widest">{config.label}</span>
            </div>
        );
    };

    const getSportIcon = (disciplina?: string) => {
        return <SportIcon sport={disciplina || ''} size={18} />;
    };

    const profileId = params.id as string;

    useEffect(() => {
        if (profileId) {
            fetchPublicProfile();
        }
    }, [profileId]);

    const fetchPublicProfile = async () => {
        setLoading(true);
        try {
            const { data: p, error } = await supabase
                .from('profiles')
                .select('*, disciplina:disciplinas(id, name, icon)')
                .eq('id', profileId)
                .single();

            if (error || !p) {
                console.error("Profile not found:", error);
                setLoading(false);
                return;
            }

            setProfile(p);

            if (p.carreras_ids && p.carreras_ids.length > 0) {
                const { data: c } = await supabase
                    .from('carreras')
                    .select('*')
                    .in('id', p.carreras_ids);
                if (c) setCarreras(c);
            }

            const isAthlete = p.roles?.includes('deportista');
            if (isAthlete) {
                fetchHistory(p.id);
                fetchDetailedStats(p.id);
                // Fetch multi-sport disciplines
                const { data: pdData } = await supabase
                    .from('profile_disciplinas')
                    .select('disciplina_id, disciplinas(id, name)')
                    .eq('profile_id', p.id);
                if (pdData) {
                    const deps = pdData.map((r: any) => (Array.isArray(r.disciplinas) ? r.disciplinas[0] : r.disciplinas)).filter(Boolean);
                    setAthleteDisciplinas(deps);
                    if (deps.length > 0 && !selectedSportId) {
                        setSelectedSportId(deps[0].id);
                    } else if (p.athlete_disciplina_id && !selectedSportId) {
                        setSelectedSportId(p.athlete_disciplina_id);
                    }
                }
                // Fetch athlete's teams/delegations
                if (p.carreras_ids?.length) {
                    const discIds = (pdData || []).map((r: any) => r.disciplina_id);
                    if (discIds.length === 0 && p.athlete_disciplina_id) discIds.push(p.athlete_disciplina_id);
                    if (discIds.length > 0) {
                        // Get athlete's official genero from linked jugador rows, avoiding nulls
                        const { data: jugadorRow } = await supabase
                            .from('jugadores')
                            .select('genero')
                            .eq('profile_id', p.id)
                            .not('genero', 'is', null)
                            .order('id', { ascending: false }) // Prefer most recent
                            .limit(1)
                            .maybeSingle();
                        const athleteGenero = jugadorRow?.genero; // 'masculino' | 'femenino' | null

                        let delegQuery = supabase
                            .from('delegaciones')
                            .select('id, nombre, genero, carrera_ids, disciplina_id, disciplinas(name)')
                            .in('disciplina_id', discIds)
                            .overlaps('carrera_ids', p.carreras_ids);

                        // Filter by gender: show matching gender + mixto; skip filter if unknown
                        if (athleteGenero && athleteGenero !== 'mixto') {
                            delegQuery = delegQuery.in('genero', [athleteGenero, 'mixto']);
                        }

                        const { data: delegaciones } = await delegQuery;
                        if (delegaciones) setAthleteTeams(delegaciones);
                    }
                }
            }

            const isOwnProfile = p.id === user?.id;
            if (isOwnProfile) {
                fetchFollowing(p.id);
            }
            fetchFriendsCount(p.id);
        } catch (err) {
            console.error("Error fetching public profile:", err);
        } finally {
            setLoading(false);
        }
    };


    const fetchFriendsCount = async (id: string) => {
        const { count } = await supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`sender_id.eq.${id},receiver_id.eq.${id}`);
        setFriendsCount(count || 0);
    };

    const fetchFollowing = async (id: string) => {
        try {
            // Profiles followed
            const { data: profiles } = await supabase
                .from('user_followers')
                .select('following_profile:profiles!following_profile_id(id, full_name, avatar_url, points)')
                .eq('follower_id', id);
            
            if (profiles) {
                setFollowedProfiles(profiles.map((f: any) => f.following_profile));
            }

            // Careers followed
            const { data: careers } = await supabase
                .from('career_followers')
                .select('career:carreras(id, nombre, escudo_url)')
                .eq('follower_id', id);

            if (careers) {
                setFollowedCareers(careers.map((f: any) => f.career));
            }
        } catch (err) {
            console.error("Error fetching following:", err);
        }
    };

    const fetchDetailedStats = async (id: string) => {
        try {
            // events aggregation: iterate over all events associated with any jugador linked to this profile
            const { data: events } = await supabase
                .from('eventos')
                .select('tipo_evento, jugador_id, jugadores!inner(profile_id, disciplina_id)')
                .eq('jugadores.profile_id', id);

            const statsMap: Record<string, any> = {};

            events?.forEach(ev => {
                const discId = (ev.jugadores as any)?.disciplina_id;
                if (!discId) return;

                if (!statsMap[discId]) {
                    statsMap[discId] = {
                        goals: 0, pts3: 0, pts2: 0, pts1: 0,
                        yellowCards: 0, redCards: 0, fouls: 0, totalEvents: 0
                    };
                }

                const s = statsMap[discId];
                const type = ev.tipo_evento.toLowerCase();
                s.totalEvents++;
                if (type === 'gol' || type === 'anotacion') s.goals++;
                if (type === 'punto_3' || type.includes('triple')) s.pts3++;
                if (type === 'punto_2' || type.includes('doble')) s.pts2++;
                if (type === 'punto_1' || type.includes('libre')) s.pts1++;
                if (type.includes('amarilla')) s.yellowCards++;
                if (type.includes('roja')) s.redCards++;
                if (type === 'falta') s.fouls++;
            });
            setSportStatsMap(prev => ({ ...prev, ...statsMap }));
        } catch (err) {
            console.error("Error fetching detailed stats:", err);
        }
    };

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true);
        try {
            // First, try to get team matches via normalized roster_partido
            const { data: teamMatches } = await supabase
                .from('roster_partido')
                .select(`
                    equipo:equipo_a_or_b,
                    partidos!inner(
                        id, fecha, equipo_a, equipo_b, estado, marcador_detalle,
                        disciplina_id, disciplinas(name)
                    ),
                    jugadores!inner(profile_id, disciplina_id)
                `)
                .eq('jugadores.profile_id', id)
                .order('partido_id', { ascending: false });


            // Second, get individual matches directly from partidos
            const { data: indMatches } = await supabase
                .from('partidos')
                .select(`
                    id, fecha, equipo_a, equipo_b, estado, marcador_detalle,
                    disciplina_id, disciplinas(name), athlete_a_id, athlete_b_id
                `)
                .or(`athlete_a_id.eq.${id},athlete_b_id.eq.${id}`)
                .order('fecha', { ascending: false });

            let allMatches: any[] = [];
            const winLossBySport: Record<string, { wins: number, losses: number }> = {};

            if (teamMatches && teamMatches.length > 0) {
                teamMatches.forEach((d: any) => {
                    const p = d.partidos;
                    const discId = p.disciplina_id;
                    if (!winLossBySport[discId]) winLossBySport[discId] = { wins: 0, losses: 0 };
                    
                    if (p.estado === 'finalizado') {
                        const det = p.marcador_detalle || {};
                        const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? 0;
                        const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? 0;
                        const side = d.equipo; // 'equipo_a' or 'equipo_b'
                        
                        if (side === 'equipo_a' && scoreA > scoreB) winLossBySport[discId].wins++;
                        else if (side === 'equipo_b' && scoreB > scoreA) winLossBySport[discId].wins++;
                        else if (scoreA !== scoreB) winLossBySport[discId].losses++;
                    }

                    if (p.estado === 'finalizado' || p.estado === 'en_curso') {
                        allMatches.push({
                            match_id: p.id,
                            fecha: p.fecha,
                            disciplina: p.disciplinas?.name,
                            equipo_a: p.equipo_a,
                            equipo_b: p.equipo_b,
                            estado: p.estado,
                            marcador_final: p.marcador_detalle
                        });
                    }
                });
            }

            if (indMatches && indMatches.length > 0) {
                indMatches.forEach((p: any) => {
                    const discId = p.disciplina_id;
                    if (!winLossBySport[discId]) winLossBySport[discId] = { wins: 0, losses: 0 };

                    if (p.estado === 'finalizado') {
                        const det = p.marcador_detalle || {};
                        const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? 0;
                        const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? 0;
                        const isAthleteA = p.athlete_a_id === id;
                        
                        if (isAthleteA && scoreA > scoreB) winLossBySport[discId].wins++;
                        else if (!isAthleteA && scoreB > scoreA) winLossBySport[discId].wins++;
                        else if (scoreA !== scoreB) winLossBySport[discId].losses++;
                    }

                    if (p.estado === 'finalizado' || p.estado === 'en_curso') {
                        allMatches.push({
                            match_id: p.id,
                            fecha: p.fecha,
                            disciplina: p.disciplinas?.name,
                            equipo_a: p.equipo_a,
                            equipo_b: p.equipo_b,
                            estado: p.estado,
                            marcador_final: p.marcador_detalle
                        });
                    }
                });
            }

            // Update sportStatsMap with wins/losses
            setSportStatsMap(prev => {
                const newMap = { ...prev };
                Object.keys(winLossBySport).forEach(sid => {
                    newMap[sid] = { ...(newMap[sid] || {}), ...winLossBySport[sid] };
                });
                return newMap;
            });

            // Sort ascending locally to ensure correct inter-leaving of team & individual
            allMatches.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            // Deduplicate across the two calls just in case
            const uniqueMatches: any[] = [];
            const seenIds = new Set();
            for (const m of allMatches) {
                if (!seenIds.has(m.match_id)) {
                    seenIds.add(m.match_id);
                    uniqueMatches.push(m);
                }
            }

            // If we still found strictly 0 matches, fallback to the RPC just in case
            if (uniqueMatches.length === 0) {
                const { data } = await supabase.rpc('get_athlete_event_history', {
                    athlete_profile_id: id
                });
                if (data) {
                    uniqueMatches.push(...data);
                }
            }
            
            setHistory(uniqueMatches.slice(0, 5));
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><UniqueLoading size="lg" /></div>;

    if (!profile) {
        return (
            <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <Star className="text-red-500" size={32} />
                </div>
                <h1 className="text-2xl font-black mb-2 font-sans uppercase tracking-wider">Perfil no encontrado</h1>
                <p className="text-white/40 mb-8 max-w-sm text-center font-bold">El usuario que buscas no existe o su perfil es privado.</p>
                <button onClick={() => router.back()} className="rounded-2xl px-8 py-3 bg-[#111] border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all text-sm flex items-center gap-2">
                    <ChevronLeft size={18} /> Volver
                </button>
            </div>
        );
    }

    const isDeportista = profile.roles?.includes('deportista');
    
    // Fix: Use auth email as fallback if profile visit is self (handles RLS privacy)
    const effectiveEmail = profileId === user?.id ? user?.email : profile.email;
    
    const isProjectCreator = isCreator(effectiveEmail);
    const showAuraBadge = hasAuraBadge(effectiveEmail);
    const showMvpBadge = hasMvpBadge(effectiveEmail);
    const sportName = profile.disciplina?.name;
    const wins = profile.wins || 0;
    const losses = profile.losses || 0;
    const points = profile.points || 0;
    
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric' })
        : null;

    const firstName = profile.full_name?.split(' ')[0] || "Usuario";

    return (
        <div className="min-h-screen bg-background text-white selection:bg-amber-500/30 overflow-x-hidden relative">
            {/* ━━━ AMBIENT HYBRID BACKGROUND ━━━ */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-[0.07]">
                <img 
                    src="/elementos/07.png" 
                    alt="" 
                    className="w-[800px] md:w-[1200px] h-auto grayscale contrast-150 brightness-200" 
                    aria-hidden="true"
                />
            </div>

            <MainNavbar user={user} profile={currentUserProfile} isStaff={isStaff} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-32 relative z-10 space-y-12 sm:space-y-16">
                {/* Back button */}
                <div>
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.2em] font-sans">
                        <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:bg-white group-hover:text-black transition-all flex items-center justify-center">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>
                </div>

                {/* ━━━ PREMIUM IDENTITY BLOCK ━━━ */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    {/* Hero Background Glow */}
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-red-600/5 via-blue-600/5 to-transparent blur-[120px] pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 lg:gap-12 relative z-10">
                        {/* Avatar Hub */}
                        <div className="relative group shrink-0">
                            {isProjectCreator && (
                                <div className="absolute -inset-6 bg-gradient-to-tr from-amber-600/30 via-yellow-400/10 to-transparent blur-3xl animate-pulse" />
                            )}
                            <Avatar
                                name={profile.full_name}
                                className={cn(
                                    "relative w-32 h-32 sm:w-44 sm:h-44 lg:w-64 lg:h-64 rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 shadow-2xl bg-black text-3xl sm:text-5xl lg:text-7xl font-sans ring-1 ring-white/5",
                                    isProjectCreator && "border-amber-500/40 ring-amber-500/20 shadow-amber-500/10"
                                )}
                            />
                            {isProjectCreator && (
                                <div className="absolute -bottom-2 -right-2 p-3 bg-amber-500 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] z-20 border-4 border-black group-hover:scale-110 transition-transform">
                                    <Crown size={24} className="text-black" />
                                </div>
                            )}
                        </div>

                        {/* Text Content Hub */}
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 w-full">
                            <div className="space-y-4 w-full">
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                                    {profile.roles?.map((role: string) => renderRoleCard(role))}
                                    {isProjectCreator && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                            <Crown size={12} />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Original Creator</span>
                                        </div>
                                    )}
                                    {showAuraBadge && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-gradient-to-r from-red-500/10 to-yellow-500/10 shadow-[0_0_18px_rgba(239,68,68,0.25)]">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">✦ AURA</span>
                                        </div>
                                    )}
                                    {showMvpBadge && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-pink-400/30 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 shadow-[0_0_18px_rgba(236,72,153,0.25)]">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-pink-300 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">★ MVP 2025</span>
                                        </div>
                                    )}
                                </div>
                                <h1
                                    className={cn(
                                        "text-2xl sm:text-5xl lg:text-8xl font-black font-sans tracking-tighter leading-[1.1] mb-2 drop-shadow-2xl break-all sm:break-words",
                                        isProjectCreator
                                            ? "text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500"
                                            : !profile.name_color ? "text-white" : undefined
                                    )}
                                    style={!isProjectCreator && profile.name_color ? { color: profile.name_color } : undefined}
                                >
                                    {profile.full_name}
                                </h1>
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5 mt-2 lg:mt-4 justify-center lg:justify-start w-fit mx-auto lg:mx-0">
                                  <Clock size={12} className="text-white/20" />
                                  <span className="text-[10px] font-display font-black tracking-widest text-white/30 uppercase">Member Since: {memberSince}</span>
                                </div>
                            </div>

                            {/* ━━━ SOCIAL ENGINE ━━━ */}
                            <div className="flex flex-col gap-3 w-full sm:w-auto">
                                {/* 1. Statistical Counters (3-column grid on mobile) */}
                                <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-stretch justify-center lg:justify-start gap-1.5 p-1 bg-black/40 border border-white/10 rounded-[2.5rem] sm:rounded-[2rem] backdrop-blur-xl shadow-2xl w-full sm:w-auto overflow-hidden">
                                    {/* Puntos */}
                                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-6 py-4 rounded-[2rem] sm:rounded-[1.5rem] bg-white/[0.03] border border-white/5 group/stat hover:bg-white/5 transition-colors justify-center min-w-0">
                                        <div className="p-1.5 sm:p-2 bg-violet-500/15 rounded-xl text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)] group-hover/stat:scale-110 transition-transform shrink-0">
                                            <Target size={14} className="sm:w-[18px] sm:h-[18px]" />
                                        </div>
                                        <div className="leading-tight text-center sm:text-left min-w-0 w-full">
                                            <p className="text-[14px] sm:text-[18px] font-black font-mono tabular-nums text-white drop-shadow-md truncate">{points}</p>
                                            <p className="text-[7px] sm:text-[9px] font-display font-black text-white/30 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Puntos</p>
                                        </div>
                                    </div>
                                    {/* AMIGOS */}
                                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-6 py-4 rounded-[2rem] sm:rounded-[1.5rem] bg-white/[0.03] border border-white/5 group/stat hover:bg-white/5 transition-colors justify-center min-w-0">
                                        <div className="p-1.5 sm:p-2 bg-emerald-500/15 rounded-xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover/stat:scale-110 transition-transform shrink-0">
                                            <Users size={14} className="sm:w-[18px] sm:h-[18px]" />
                                        </div>
                                        <div className="leading-tight text-center sm:text-left min-w-0 w-full">
                                            <p className="text-[14px] sm:text-[18px] font-black font-mono tabular-nums text-white drop-shadow-md truncate">{friendsCount}</p>
                                            <p className="text-[7px] sm:text-[9px] font-display font-black text-white/30 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Amigos</p>
                                        </div>
                                    </div>
                                    {/* SEGUIDORES (FANS) */}
                                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-6 py-4 rounded-[2rem] sm:rounded-[1.5rem] bg-white/[0.03] border border-white/5 group/stat hover:bg-white/5 transition-colors justify-center min-w-0">
                                        <div className="p-1.5 sm:p-2 bg-blue-500/15 rounded-xl text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover/stat:scale-110 transition-transform shrink-0">
                                            <Star size={14} className="sm:w-[18px] sm:h-[18px]" />
                                        </div>
                                        <div className="leading-tight text-center sm:text-left min-w-0 w-full">
                                            <p className="text-[14px] sm:text-[18px] font-black font-mono tabular-nums text-white drop-shadow-md truncate">{profile.followers_count || 0}</p>
                                            <p className="text-[7px] sm:text-[9px] font-display font-black text-white/30 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Fans</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Action Buttons (Separate row on mobile) */}
                                <div className="flex gap-2 w-full">
                                    {profileId === user?.id ? (
                                        <Link 
                                            href="/perfil/editar" 
                                            className="flex items-center gap-2 px-6 py-4 rounded-[1.8rem] sm:rounded-[1.5rem] bg-violet-600 border border-violet-500 text-white hover:bg-violet-500 transition-all group font-display font-black uppercase tracking-widest text-[10px] shadow-[0_4px_20px_rgba(124,58,237,0.3)] w-full justify-center"
                                        >
                                            <Zap size={14} className="fill-current group-hover:rotate-12 transition-transform" />
                                            <span>Configuración</span>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-2 w-full">
                                            <FollowButton targetId={profileId} initialFollowersCount={profile.followers_count || 0} variant="action-only" />
                                            <FriendButton currentUserId={user?.id} targetId={profileId} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ━━━ CONTENT GRID ━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-4 lg:sticky lg:top-24">
                        {isDeportista ? (
                            <div className={cn(
                                "relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] min-h-[450px] sm:min-h-[500px] flex flex-col group border-2 transition-all duration-700",
                                (athleteDisciplinas.find(d => d.id === selectedSportId)?.name === 'Baloncesto') ? "bg-gradient-to-br from-[#1a0f05]/80 to-[#0A0705]/95 border-orange-500/30 backdrop-blur-2xl" :
                                (athleteDisciplinas.find(d => d.id === selectedSportId)?.name === 'Fútbol') ? "bg-gradient-to-br from-[#051a0f]/80 to-[#0A0705]/95 border-emerald-500/30 backdrop-blur-2xl" :
                                "bg-gradient-to-br from-[#111]/80 to-[#000]/95 border-white/10 backdrop-blur-2xl"
                            )}>
                                {/* Glass Shine Effect */}
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    {/* Multi-sport Selector */}
                                    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                                        {athleteDisciplinas.map((d: any) => (
                                            <button 
                                                key={d.id}
                                                onClick={() => setSelectedSportId(d.id)}
                                                className={cn(
                                                    "shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                                                    selectedSportId === d.id 
                                                        ? "bg-white/20 border-white/40 text-white shadow-lg scale-110" 
                                                        : "bg-white/5 border-white/5 text-white/30 hover:bg-white/10"
                                                )}
                                                title={d.name}
                                            >
                                                <SportIcon sport={d.name} size={18} />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between mb-10">
                                        <div className="flex flex-col">
                                            <h3 className="text-white/40 font-display font-black uppercase text-[10px] tracking-[0.4em] mb-2">
                                                Athlete Pro Identity
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:border-violet-500/30 transition-colors">
                                                  <SportIcon sport={athleteDisciplinas.find(d => d.id === selectedSportId)?.name} size={28} />
                                                </div>
                                                <span className="text-2xl font-black text-white font-sans tracking-tight drop-shadow-md">{athleteDisciplinas.find(d => d.id === selectedSportId)?.name || sportName}</span>
                                            </div>
                                        </div>
                                        {(() => {
                                            const s = sportStatsMap[selectedSportId || ''] || { wins: 0, losses: 0 };
                                            const total = (s.wins || 0) + (s.losses || 0);
                                            const rate = total > 0 ? Math.round((s.wins / total) * 100) : 0;
                                            return (
                                                <div className="relative w-20 h-20 flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_10px_rgba(0,0,0,0.3)]">
                                                        <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                                        <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" 
                                                            strokeDasharray={213.6} 
                                                            strokeDashoffset={213.6 * (1 - (total > 0 ? (s.wins / total) : 0))} 
                                                            strokeLinecap="round"
                                                            className={cn(
                                                                "transition-all duration-1000",
                                                                rate > 50 ? "text-emerald-400" : rate > 0 ? "text-amber-400" : "text-white/10"
                                                            )} 
                                                            style={{ filter: `drop-shadow(0 0 8px ${rate > 50 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'})` }}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-[18px] font-black font-mono tabular-nums leading-none tracking-tighter text-white drop-shadow-lg">{rate}%</span>
                                                        <span className="text-[7px] font-display font-black text-white/30 uppercase tracking-widest mt-1">Win Rate</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    
                                    {/* Record Row */}
                                    {(() => {
                                        const s = sportStatsMap[selectedSportId || ''] || { wins: 0, losses: 0 };
                                        return (
                                            <div className="grid grid-cols-2 gap-4 mb-10">
                                                <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 transition-all hover:bg-white/10 hover:-translate-y-1 shadow-xl">
                                                    <p className="text-[10px] font-display font-black uppercase tracking-widest text-emerald-400/60 mb-2">Victorias</p>
                                                    <p className="text-4xl font-black font-mono tabular-nums tracking-tighter text-white drop-shadow-md">{s.wins || 0}</p>
                                                </div>
                                                <div className="bg-white/5 border border-white/5 rounded-[1.5rem] p-5 transition-all hover:bg-white/10 hover:-translate-y-1 shadow-xl">
                                                    <p className="text-[10px] font-display font-black uppercase tracking-widest text-rose-400/60 mb-2">Derrotas</p>
                                                    <p className="text-4xl font-black font-mono tabular-nums tracking-tighter text-white drop-shadow-md">{s.losses || 0}</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Performance Metrics */}
                                    <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 flex-1 shadow-inner relative overflow-hidden group/metrics">
                                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <p className="text-[10px] font-display font-black uppercase tracking-[0.4em] text-white/30 mb-6 flex items-center gap-2">
                                          <Activity size={12} /> Analytics
                                        </p>
                                        
                                        {(() => {
                                            const s = sportStatsMap[selectedSportId || ''] || {};
                                            const currentSportName = athleteDisciplinas.find(d => d.id === selectedSportId)?.name;
                                            
                                            if (currentSportName === 'Baloncesto') {
                                                return (
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                          { val: s.pts3 || 0, label: '3PT' },
                                                          { val: s.pts2 || 0, label: '2PT' },
                                                          { val: s.pts1 || 0, label: 'FT' }
                                                        ].map((s, idx) => (
                                                          <div key={idx} className="text-center bg-white/[0.03] rounded-2xl py-5 border border-white/5 hover:bg-white/10 transition-colors">
                                                              <p className="text-2xl font-black font-mono text-amber-400 mb-1 drop-shadow-md">{s.val}</p>
                                                              <p className="text-[8px] font-display font-black text-white/30 uppercase tracking-widest">{s.label}</p>
                                                          </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            
                                            return (
                                                <div className="flex items-center justify-around py-5">
                                                    <div className="flex flex-col items-center group/item">
                                                        <p className="text-3xl font-black font-mono text-emerald-400 leading-none mb-2 drop-shadow-md group-hover/item:scale-110 transition-transform">{s.goals || 0}</p>
                                                        <p className="text-[8px] font-display font-black text-white/30 uppercase tracking-[0.2em]">Goles</p>
                                                    </div>
                                                    <div className="w-[1px] h-10 bg-white/10" />
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex gap-2 mb-2">
                                                            <div className="w-3 h-4 bg-amber-500 rounded-sm shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
                                                            <p className="text-lg font-black font-mono text-white leading-none">{s.yellowCards || 0}</p>
                                                        </div>
                                                        <p className="text-[8px] font-display font-black text-white/30 uppercase tracking-[0.2em]">Amarillas</p>
                                                    </div>
                                                    <div className="w-[1px] h-10 bg-white/10" />
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex gap-2 mb-2">
                                                            <div className="w-3 h-4 bg-rose-600 rounded-sm shadow-[0_0_15px_rgba(225,29,72,0.4)]" />
                                                            <p className="text-lg font-black font-mono text-white leading-none">{s.redCards || 0}</p>
                                                        </div>
                                                        <p className="text-[8px] font-display font-black text-white/30 uppercase tracking-[0.2em]">Rojas</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-black/40 backdrop-blur-3xl border border-violet-500/20 p-6 sm:p-10 shadow-2xl min-h-[350px] sm:min-h-[400px] flex flex-col justify-between group">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
                                    <Target size={260} />
                                </div>
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <h3 className="text-violet-400 font-display font-bold text-[11px] tracking-widest mb-12 max-w-[180px] leading-relaxed border-l-2 border-violet-500/50 pl-4">
                                        Estadísticas quiniela
                                    </h3>
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-2">
                                            <span className="text-[10px] font-display font-black uppercase text-white/40 tracking-[0.3em]">Capital de Puntos</span>
                                            <Badge className="bg-violet-500/10 border-violet-500/30 text-violet-400 font-display font-black tracking-widest text-[9px]">OFFICIAL RANKED</Badge>
                                        </div>
                                        <div className="rounded-[2rem] bg-black/40 border border-white/5 p-10 text-center shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] group-hover:border-violet-500/20 transition-colors">
                                            <p className="text-[10px] font-display font-black text-violet-400/60 tracking-[0.3em] mb-3 uppercase">Puntuación Acumulada</p>
                                            <p className="text-6xl font-black font-mono text-white tracking-tighter drop-shadow-lg">{points}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Careers + Matches */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* THE NEW CAREER BANNER */}
                        {carreras.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {carreras.map((c) => (
                                    <Link key={c.id} href={`/carrera/${c.id}`} className="group relative rounded-[2.5rem] sm:rounded-[3rem] bg-black/40 border border-white/10 p-6 sm:p-10 overflow-hidden hover:border-violet-500/30 transition-all duration-500 shadow-2xl flex flex-col sm:flex-row items-center sm:items-stretch gap-6 sm:gap-10 backdrop-blur-xl">
                                        {/* Large Blurry Background Escudo */}
                                        <div className="absolute -right-20 -top-20 w-96 h-96 opacity-[0.05] blur-[100px] rounded-full bg-violet-600 pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700" />
                                        
                                        <div className="w-28 h-28 lg:w-40 lg:h-40 rounded-[2.5rem] bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] p-6 relative z-10 group-hover:scale-105 transition-transform duration-700">
                                            {c.escudo_url ? (
                                                <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                                            ) : (
                                                <span className="text-5xl font-black font-display text-white/10 uppercase tracking-tighter">{c.nombre.substring(0, 2)}</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col relative z-10 flex-1 justify-center text-center sm:text-left">
                                            <span className="text-[10px] lg:text-[12px] font-display font-black uppercase tracking-[0.5em] text-violet-400/70 mb-4 block">
                                                {isDeportista ? "REPRESENTANDO A" : "ESTUDIANTE DE"}
                                            </span>
                                            <h3 className="text-4xl lg:text-5xl font-black text-white group-hover:text-violet-400 transition-colors font-sans tracking-tight leading-none mb-6">
                                                {c.nombre}
                                            </h3>
                                            <div className="flex items-center justify-center sm:justify-start gap-3 text-[10px] font-display font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white transition-all">
                                                <span className="border-b border-white/10 pb-1">ACCEDER A LA SECCIÓN DE EQUIPOS</span>
                                                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[3rem] bg-black/20 border-2 border-dashed border-white/5 p-16 text-center backdrop-blur-md">
                                <span className="text-[11px] font-display font-black uppercase tracking-[0.4em] text-white/10">Identidad Académica no vinculada</span>
                            </div>
                        )}

                        {/* ━━━ ACTIVIDAD DEPORTIVA: Deportes + Equipos ━━━ */}
                        {isDeportista && (athleteDisciplinas.length > 0 || athleteTeams.length > 0) && (
                            <div className="rounded-[3rem] bg-black/20 border border-white/10 p-8 lg:p-12 shadow-2xl backdrop-blur-md space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
                                
                                {/* Deportes del atleta */}
                                {athleteDisciplinas.length > 0 && (
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner">
                                                <Activity size={20} className="text-emerald-400" />
                                            </div>
                                            <h3 className="text-[11px] font-display font-bold tracking-[0.3em] text-white/50">DEPORTES</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {athleteDisciplinas.map((d: any) => (
                                                <div key={d.id} className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-black/40 border border-white/10 hover:border-emerald-500/30 transition-all shadow-lg group">
                                                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <SportIcon sport={d.name || ''} size={16} />
                                                    </div>
                                                    <span className="text-sm font-black text-white tracking-tight">{d.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Equipos / Delegaciones */}
                                {athleteTeams.length > 0 && (
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-6 pt-6 border-t border-white/5">
                                            <div className="p-2.5 bg-violet-500/10 rounded-2xl border border-violet-500/20 shadow-inner">
                                                <Users size={20} className="text-violet-400" />
                                            </div>
                                            <h3 className="text-[11px] font-display font-bold tracking-[0.3em] text-white/50">EQUIPOS</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {athleteTeams.map((team: any) => {
                                                const discName = (Array.isArray(team.disciplinas) ? team.disciplinas[0] : team.disciplinas)?.name || '';
                                                return (
                                                    <Link key={team.id} href={`/equipo/${team.id}`} className="group/team">
                                                        <div className="flex items-center gap-4 p-5 rounded-[2rem] bg-black/40 border border-white/5 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all shadow-xl">
                                                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover/team:scale-110 transition-transform">
                                                                <SportIcon sport={discName} size={22} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[14px] font-black text-white truncate font-display tracking-tight leading-tight group-hover/team:text-violet-400 transition-colors">
                                                                    {team.nombre}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{discName}</span>
                                                                    {team.genero && team.genero !== 'mixto' && (
                                                                        <span className={cn(
                                                                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                                                                            team.genero === 'femenino'
                                                                                ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                        )}>
                                                                            {team.genero}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowUpRight size={16} className="text-white/10 group-hover/team:text-violet-400 transition-colors shrink-0" />
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ━━━ INSTITUTIONAL BRAND BREAK ━━━ */}
                        <div className="py-4 relative z-0">
                            <InstitutionalBanner />
                        </div>

                        {/* ENCUENTROS RECIENTES */}
                        <div className="rounded-[3rem] bg-black/20 border border-white/10 p-8 lg:p-12 shadow-2xl backdrop-blur-md space-y-10 relative overflow-hidden group/history">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] pointer-events-none" />
                            
                            <div className="flex items-center justify-between border-b border-white/10 pb-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                                      <Swords size={20} className="text-white/40" />
                                    </div>
                                    <h3 className="text-[11px] font-display font-black uppercase tracking-[0.5em] text-white/60">
                                        HISTORIAL DE COMPETENCIA
                                    </h3>
                                </div>
                                <Link href="/quiniela" className="text-[10px] font-display font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors px-4 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10">
                                    VER TODOS
                                </Link>
                            </div>

                            <div className="flex flex-col gap-4">
                                {loadingHistory ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-white/20" /></div>
                                ) : history.length > 0 ? (
                                    history.slice(0, 4).map((h, i) => {
                                        const scoreA = h.marcador_final?.goles_a ?? h.marcador_final?.sets_a ?? h.marcador_final?.total_a ?? 0;
                                        const scoreB = h.marcador_final?.goles_b ?? h.marcador_final?.sets_b ?? h.marcador_final?.total_b ?? 0;
                                        const icon = getSportIcon(h.disciplina);

                                        return (
                                            <div key={i} className="flex items-center justify-between bg-black/40 border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.05] hover:border-white/20 transition-all hover:scale-[1.01] group cursor-pointer shadow-lg relative overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                                <div className="flex items-center gap-6 relative z-10">
                                                    <div className="w-12 h-12 rotate-45 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all shadow-inner">
                                                        <div className="-rotate-45">{icon}</div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1.5 ">
                                                            <span className="text-[10px] font-display font-black text-white/20 uppercase tracking-[0.25em]">{h.disciplina}</span>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                                            <span className="text-[10px] font-mono font-bold text-white/20 uppercase tabular-nums">{new Date(h.fecha).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                          <p className="text-[14px] font-black text-white/90 font-display tracking-tight group-hover:text-white transition-colors">{h.equipo_a}</p>
                                                          <span className="text-[10px] font-display font-black text-white/15">VS</span>
                                                          <p className="text-[14px] font-black text-white/90 font-display tracking-tight group-hover:text-white transition-colors">{h.equipo_b}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 border border-white/10 px-6 py-3 rounded-2xl text-[18px] font-black font-mono tabular-nums shadow-inner group-hover:border-white/20 ring-1 ring-white/5 drop-shadow-md text-white">
                                                    {scoreA} <span className="text-white/20 mx-1">-</span> {scoreB}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12 border border-dashed border-white/5 rounded-[2rem]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">Sin participaciones registradas</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* section Comunidad (Privado) */}
                        {(profileId === user?.id) && (
                            <div className="space-y-12 pt-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 border-t border-white/5">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-10 relative">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-[2rem] bg-violet-600/10 flex items-center justify-center border border-violet-500/20 shadow-2xl backdrop-blur-xl group hover:scale-110 transition-transform">
                                            <Users className="text-violet-400 group-hover:text-violet-300 transition-colors" size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-4xl md:text-5xl font-black font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 mb-2">Estadísticas quiniela</h2>
                                            <p className="text-[10px] font-display font-black text-violet-400/40 uppercase tracking-[0.4em] mt-1">Gestión de identidad social • Vista de Propietario</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 rounded-2xl bg-black/40 border border-violet-500/20 backdrop-blur-xl flex items-center gap-3">
                                        <Activity size={14} className="text-violet-400 animate-pulse" />
                                        <span className="text-[10px] font-display font-black text-violet-400 uppercase tracking-widest leading-none">Perfil Verificado 2025</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                    {/* Left: Friends */}
                                    <div className="lg:col-span-7 bg-black/40 border border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl backdrop-blur-3xl relative overflow-hidden group/friends">
                                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-violet-600/5 blur-[100px] pointer-events-none" />
                                        <FriendsList userId={profileId} />
                                    </div>

                                    {/* Right: Seguidos */}
                                    <div className="lg:col-span-5 space-y-8">
                                        {/* Siguiendo Profiles */}
                                        <div className="bg-black/40 border border-white/10 backdrop-blur-3xl rounded-[3rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group hover:border-violet-500/30 transition-all duration-500">
                                            <div className="flex items-center justify-between mb-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:border-violet-500/30 transition-colors">
                                                        <Star className="text-violet-400" size={18} />
                                                    </div>
                                                    <h3 className="text-[11px] font-display font-black tracking-[0.5em] text-white/60 uppercase">PROFILES SEGUIDOS</h3>
                                                </div>
                                                <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/5 text-[12px] font-black font-mono tabular-nums text-violet-400 shadow-inner">
                                                  {followedProfiles.length}
                                                </div>
                                            </div>
                                            
                                            {followedProfiles.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                    {followedProfiles.map((f) => (
                                                        <Link 
                                                            key={f.id} 
                                                            href={`/perfil/${f.id}`}
                                                            className="flex items-center gap-5 p-5 rounded-[2rem] bg-black/60 border border-white/5 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all group/item shadow-2xl"
                                                        >
                                                            <Avatar name={f.full_name} className="w-12 h-12 border border-white/10 group-hover/item:scale-110 transition-transform" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[14px] font-black text-white truncate font-display tracking-tight leading-tight">{f.full_name}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Trophy size={10} className="text-violet-500/60" />
                                                                    <p className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest">{f.points} PTS</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                              <ArrowUpRight size={14} className="text-white/40" />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-[2rem]">
                                                  <p className="text-[10px] font-display font-black uppercase text-white/10 tracking-[0.4em]">Sin conexiones activas</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Siguiendo Carreras */}
                                        <div className="bg-black/40 border border-white/10 backdrop-blur-3xl rounded-[3rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
                                            <div className="flex items-center justify-between mb-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:border-emerald-500/30 transition-colors">
                                                        <Trophy className="text-emerald-400" size={18} />
                                                    </div>
                                                    <h3 className="text-[11px] font-display font-black tracking-[0.5em] text-white/60 uppercase">CARRERAS SEGUIDAS</h3>
                                                </div>
                                                <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/5 text-[12px] font-black font-mono tabular-nums text-emerald-400 shadow-inner">
                                                  {followedCareers.length}
                                                </div>
                                            </div>

                                            {followedCareers.length > 0 ? (
                                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                    {followedCareers.map((c) => (
                                                        <Link 
                                                            key={c.id} 
                                                            href={`/carreras/${c.id}`}
                                                            className="flex items-center justify-between p-5 rounded-[2rem] bg-black/60 border border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.05] transition-all group/item shadow-2xl"
                                                        >
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-12 h-12 rounded-[1rem] bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden p-2 group-hover/item:scale-110 transition-transform">
                                                                    {c.escudo_url ? (
                                                                        <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain filter drop-shadow-md" />
                                                                    ) : (
                                                                        <span className="text-[12px] font-black font-display text-white/20 uppercase">{c.nombre.substring(0, 2)}</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                  <p className="text-[14px] font-black text-white group-hover/item:text-emerald-400 transition-colors font-display tracking-tight leading-tight">{c.nombre}</p>
                                                                  <p className="text-[8px] font-display font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">FILTRANDO RESULTADOS</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                              <ArrowUpRight size={14} className="text-white/40" />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-[2rem]">
                                                  <p className="text-[10px] font-display font-black uppercase text-white/10 tracking-[0.4em]">Sin instituciones seguidas</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
