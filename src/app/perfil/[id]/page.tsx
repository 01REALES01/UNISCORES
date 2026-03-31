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
import { isCreator, hasAuraBadge, hasMvpBadge, SPORT_EMOJI, SPORT_ACCENT } from "@/lib/constants";

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
                "flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all hover:scale-105",
                config.color,
                config.glow
            )}>
                <span className="opacity-80">{config.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{config.label}</span>
            </div>
        );
    };

    const getSportIcon = (disciplina?: string) => {
        const name = disciplina?.toLowerCase() || '';
        if (name.includes('basket')) return <Dribbble size={16} />;
        if (name.includes('fútbol') || name.includes('micro')) return <Swords size={16} />;
        if (name.includes('tenis') || name.includes('mesa')) return <Zap size={16} />;
        if (name.includes('volley')) return <TrendingUp size={16} className="rotate-90" />;
        return <Activity size={16} />;
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
                .select('tipo_evento, jugadores!inner(profile_id)')
                .eq('jugadores.profile_id', id);

            const stats = {
                goals: 0,
                pts3: 0,
                pts2: 0,
                pts1: 0,
                yellowCards: 0,
                redCards: 0,
                fouls: 0,
                totalEvents: events?.length || 0
            };

            events?.forEach(ev => {
                const type = ev.tipo_evento.toLowerCase();
                if (type === 'gol' || type === 'anotacion') stats.goals++;
                if (type === 'punto_3' || type.includes('triple')) stats.pts3++;
                if (type === 'punto_2' || type.includes('doble')) stats.pts2++;
                if (type === 'punto_1' || type.includes('libre')) stats.pts1++;
                if (type.includes('amarilla')) stats.yellowCards++;
                if (type.includes('roja')) stats.redCards++;
                if (type === 'falta') stats.fouls++;
            });
            setDetailedStats(stats);
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
                        disciplinas(name)
                    ),
                    jugadores!inner(profile_id)
                `)
                .eq('jugadores.profile_id', id)
                .order('partido_id', { ascending: false })
                .limit(5);


            // Second, get individual matches directly from partidos
            const { data: indMatches } = await supabase
                .from('partidos')
                .select(`
                    id, fecha, equipo_a, equipo_b, estado, marcador_detalle,
                    disciplinas(name)
                `)
                .or(`athlete_a_id.eq.${id},athlete_b_id.eq.${id}`)
                .order('fecha', { ascending: false })
                .limit(5);

            let allMatches: any[] = [];

            if (teamMatches && teamMatches.length > 0) {
                const mappedTeam = teamMatches
                    .filter((d: any) => d.partidos?.estado === 'finalizado' || d.partidos?.estado === 'en_curso')
                    .map((d: any) => ({
                        match_id: d.partidos.id,
                        fecha: d.partidos.fecha,
                        disciplina: d.partidos.disciplinas?.name,
                        equipo_a: d.partidos.equipo_a,
                        equipo_b: d.partidos.equipo_b,
                        estado: d.partidos.estado,
                        marcador_final: d.partidos.marcador_detalle
                    }));
                allMatches = [...allMatches, ...mappedTeam];
            }

            if (indMatches && indMatches.length > 0) {
                const mappedInd = indMatches
                    .filter((d: any) => d.estado === 'finalizado' || d.estado === 'en_curso')
                    .map((d: any) => ({
                        match_id: d.id,
                        fecha: d.fecha,
                        disciplina: d.disciplinas?.name,
                        equipo_a: d.equipo_a,
                        equipo_b: d.equipo_b,
                        estado: d.estado,
                        marcador_final: d.marcador_detalle
                    }));
                allMatches = [...allMatches, ...mappedInd];
            }

            // Sort descending locally to ensure correct inter-leaving of team & individual
            allMatches.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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
    const isProjectCreator = isCreator(profile.email);
    const showAuraBadge = hasAuraBadge(profile.email);
    const showMvpBadge = hasMvpBadge(profile.email);
    const sportName = profile.disciplina?.name;
    const sportEmoji = sportName ? SPORT_EMOJI[sportName] : null;

    const wins = profile.wins || 0;
    const losses = profile.losses || 0;
    const totalScore = profile.total_score_all_time || 0;
    const points = profile.points || 0;
    
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric' })
        : null;

    const firstName = profile.full_name?.split(' ')[0] || "Usuario";

    return (
        <div className="min-h-screen bg-background text-white selection:bg-amber-500/30 overflow-x-hidden">
            <MainNavbar user={user} profile={currentUserProfile} isStaff={isStaff} />

            <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 pb-24 relative z-10 space-y-12">
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
                                <div className="absolute -inset-4 bg-gradient-to-tr from-amber-600/20 via-yellow-400/10 to-transparent blur-2xl animate-pulse" />
                            )}
                            <Avatar
                                name={profile.full_name}
                                className={cn(
                                    "relative w-44 h-44 lg:w-56 lg:h-56 rounded-[2.5rem] border-2 border-white/10 shadow-2xl bg-black text-5xl lg:text-6xl font-sans",
                                    isProjectCreator && "border-amber-500/30"
                                )}
                            />
                            {isProjectCreator && (
                                <div className="absolute -bottom-2 -right-2 p-2.5 bg-amber-500 rounded-2xl shadow-xl z-20 border-4 border-black">
                                    <Crown size={20} className="text-black" />
                                </div>
                            )}
                        </div>

                        {/* Text Content Hub */}
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
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
                                        "text-5xl lg:text-8xl font-black font-sans tracking-tighter leading-none mb-2",
                                        isProjectCreator
                                            ? "text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500"
                                            : !profile.name_color ? "text-white" : undefined
                                    )}
                                    style={!isProjectCreator && profile.name_color ? { color: profile.name_color } : undefined}
                                >
                                    {profile.full_name}
                                </h1>
                            </div>

                            {/* Integrated Social Stats Bar */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl">
                                {/* Puntos */}
                                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02]">
                                    <div className="p-1.5 bg-red-500/10 rounded-lg text-red-500">
                                        <Target size={16} />
                                    </div>
                                    <div className="leading-tight">
                                        <p className="text-[14px] font-black tabular-nums">{points}</p>
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Puntos Globales</p>
                                    </div>
                                </div>
                                {/* SEGUIDORES */}
                                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02]">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
                                        <Users size={16} />
                                    </div>
                                    <div className="leading-tight">
                                        <p className="text-[14px] font-black tabular-nums">{friendsCount}</p>
                                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Amigos</p>
                                    </div>
                                </div>
                                {/* ACTIONS */}
                                <div className="flex items-center gap-2 pl-4 pr-2">
                                    <FollowButton targetId={profileId} initialFollowersCount={profile.followers_count || 0} />
                                    <FriendButton currentUserId={user?.id} targetId={profileId} />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ━━━ CONTENT GRID ━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN: Athlete Hub */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24">
                        {isDeportista ? (
                            <div className={cn(
                                "relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl min-h-[460px] flex flex-col group border transition-all duration-500",
                                sportName === 'Baloncesto' ? "bg-gradient-to-br from-[#1a0f05] to-[#0A0705] border-orange-500/20" :
                                sportName === 'Fútbol' ? "bg-gradient-to-br from-[#051a0f] to-[#0A0705] border-emerald-500/20" :
                                "bg-gradient-to-br from-[#0A0705] to-[#040302] border-white/5"
                            )}>
                                {/* Background Icon Glow */}
                                <div className="absolute -right-10 -bottom-10 opacity-[0.05] group-hover:opacity-[0.08] transition-all duration-1000 rotate-12 group-hover:rotate-0">
                                    <Trophy size={280} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex flex-col">
                                            <h3 className="text-white/40 font-black uppercase text-[10px] tracking-[0.3em] font-sans mb-1">
                                                Athlete Pro Card
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{sportEmoji}</span>
                                                <span className="text-lg font-black text-white uppercase tracking-tight">{sportName}</span>
                                            </div>
                                        </div>
                                        <div className="relative w-16 h-16 flex items-center justify-center">
                                            <svg className="w-full h-full -rotate-90">
                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                                    strokeDasharray={175.9} 
                                                    strokeDashoffset={175.9 * (1 - (wins / (wins + losses || 1)))} 
                                                    className={cn(
                                                        "transition-all duration-1000",
                                                        (wins / (wins + losses || 1)) > 0.5 ? "text-emerald-500" : "text-orange-500"
                                                    )} 
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-[14px] font-black tabular-nums leading-none">{Math.round((wins / (wins + losses || 1)) * 100)}%</span>
                                                <span className="text-[6px] font-bold text-white/30 uppercase">Win Rate</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Record Row */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-transform hover:scale-[1.02]">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60 mb-1">Victorias</p>
                                            <p className="text-3xl font-black tabular-nums">{wins}</p>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-transform hover:scale-[1.02]">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-red-500/60 mb-1">Derrotas</p>
                                            <p className="text-3xl font-black tabular-nums">{losses}</p>
                                        </div>
                                    </div>

                                    {/* Sport-Specific Performance */}
                                    <div className="flex-1 space-y-4">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 border-b border-white/5 pb-2">All-Time Performance</p>
                                        
                                        {sportName === 'Baloncesto' ? (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="text-center bg-white/[0.02] rounded-xl py-4 border border-white/5">
                                                    <p className="text-[20px] font-black text-orange-400">{detailedStats.pts3}</p>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase">3PT</p>
                                                </div>
                                                <div className="text-center bg-white/[0.02] rounded-xl py-4 border border-white/5">
                                                    <p className="text-[20px] font-black text-orange-400">{detailedStats.pts2}</p>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase">2PT</p>
                                                </div>
                                                <div className="text-center bg-white/[0.02] rounded-xl py-4 border border-white/5">
                                                    <p className="text-[20px] font-black text-orange-400">{detailedStats.pts1}</p>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase">FT</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-around py-4 bg-white/[0.02] rounded-xl border border-white/5">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-2xl font-black text-emerald-400 leading-none mb-1">{detailedStats.goals}</p>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Goles</p>
                                                </div>
                                                <div className="w-[1px] h-8 bg-white/5" />
                                                <div className="flex flex-col items-center">
                                                    <div className="flex gap-1.5 mb-1">
                                                        <div className="w-2.5 h-3.5 bg-yellow-500 rounded-[1px] shadow-[0_0_10px_rgba(234,179,8,0.2)]" />
                                                        <p className="text-sm font-black text-yellow-500">{detailedStats.yellowCards}</p>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Amarillas</p>
                                                </div>
                                                <div className="w-[1px] h-8 bg-white/5" />
                                                <div className="flex flex-col items-center">
                                                    <div className="flex gap-1.5 mb-1">
                                                        <div className="w-2.5 h-3.5 bg-red-600 rounded-[1px] shadow-[0_0_10px_rgba(220,38,38,0.2)]" />
                                                        <p className="text-sm font-black text-red-600">{detailedStats.redCards}</p>
                                                    </div>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Rojas</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* All-time Total Score */}
                                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                                                <Activity size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-white/30 uppercase leading-none mb-1">Total Career Score</p>
                                                <p className="text-xl font-black tabular-nums">{totalScore}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-bold text-white/30 uppercase leading-none mb-1">Matches</p>
                                            <p className="text-xl font-black tabular-nums">{wins + losses}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-background border border-indigo-500/10 p-8 shadow-2xl min-h-[360px] flex flex-col justify-between group">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
                                    <Target size={200} />
                                </div>
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <h3 className="text-indigo-400 font-black uppercase text-[10px] tracking-[0.3em] font-sans mb-8 max-w-[140px] leading-relaxed">
                                        ESTADÍSTICAS QUINIELA
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Puntos Totales</span>
                                            <Badge className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400">RANKED</Badge>
                                        </div>
                                        <div className="rounded-[1.5rem] bg-background border border-indigo-900/50 p-6 text-center shadow-inner">
                                            <p className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-2">Acumulado</p>
                                            <p className="text-4xl font-black text-white">{points}</p>
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
                            <div className="grid grid-cols-1 gap-4">
                                {carreras.map((c) => (
                                    <Link key={c.id} href={`/carrera/${c.id}`} className="group relative rounded-[2.5rem] bg-gradient-to-br from-[#0A0705] to-[#040302] border border-white/5 p-8 sm:p-10 overflow-hidden hover:border-red-500/30 transition-all shadow-2xl flex flex-col sm:flex-row items-center sm:items-stretch gap-10">
                                        {/* Large Blurry Background Escudo */}
                                        <div className="absolute -right-20 -top-20 w-80 h-80 opacity-[0.03] blur-3xl rounded-full bg-red-600 pointer-events-none group-hover:opacity-[0.05] transition-opacity" />
                                        
                                        <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-[2rem] bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-4 relative z-10">
                                            {c.escudo_url ? (
                                                <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-transform duration-700 group-hover:scale-110" />
                                            ) : (
                                                <span className="text-4xl font-black text-white/10">{c.nombre.substring(0, 2).toUpperCase()}</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col relative z-10 flex-1 justify-center text-center sm:text-left">
                                            <span className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.4em] text-red-500/70 mb-3 block">
                                                {isDeportista ? "REPRESENTANDO A" : "ESTUDIANTE DE"}
                                            </span>
                                            <h3 className="text-3xl lg:text-5xl font-black text-white group-hover:text-red-400 transition-colors tracking-tight leading-none mb-4">
                                                {c.nombre}
                                            </h3>
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-white group-hover:gap-4 transition-all">
                                                IR AL MEDALLERO DE FACULTAD <ArrowUpRight size={14} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10 p-12 text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/15">Sin carrera asignada</span>
                            </div>
                        )}

                        {/* ENCUENTROS RECIENTES */}
                        <div className="rounded-[2.5rem] bg-background border border-white/5 p-8 lg:p-10 shadow-xl space-y-8">
                            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                <div className="flex items-center gap-3">
                                    <Swords size={20} className="text-white/40" />
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60 font-sans">
                                        HISTORIAL DE COMPETENCIA
                                    </h3>
                                </div>
                                <Link href="/quiniela" className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-400 transition-colors">
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
                                            <div key={i} className="flex items-center justify-between bg-white/[0.02] border border-white/[0.03] p-5 rounded-2xl hover:bg-white/[0.04] transition-all hover:scale-[1.01] group cursor-pointer shadow-sm">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-10 h-10 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-white/40 group-hover:text-red-500 group-hover:border-red-500/20 transition-all shadow-inner">
                                                        {icon}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{h.disciplina}</span>
                                                            <div className="w-[1px] h-2.5 bg-white/10" />
                                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{new Date(h.fecha).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-[13px] font-black text-white group-hover:text-red-400 transition-colors">{h.equipo_a} vs {h.equipo_b}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl text-sm font-black tabular-nums shadow-inner group-hover:border-white/10">
                                                    {scoreA} - {scoreB}
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
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                    <div className="w-14 h-14 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                                        <Users className="text-red-500" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black font-sans tracking-tighter text-white">HUB COMUNIDAD</h2>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Gestión de amigos y seguimientos • Privado</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
                                    {/* Left: Friends */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 lg:p-12 shadow-2xl">
                                        <FriendsList userId={profileId} />
                                    </div>

                                    {/* Right: Seguidos */}
                                    <div className="space-y-8">
                                        {/* Siguiendo Profiles */}
                                        <div className="bg-white/[0.03] border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                        <Star className="text-blue-400" size={16} />
                                                    </div>
                                                    <h3 className="text-lg font-black font-sans tracking-tighter text-white">PROFILES SEGUIDOS</h3>
                                                </div>
                                                <span className="text-[10px] font-black text-white/20 uppercase tabular-nums">{followedProfiles.length}</span>
                                            </div>
                                            {followedProfiles.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {followedProfiles.slice(0, 6).map((f) => (
                                                        <Link 
                                                            key={f.id} 
                                                            href={`/perfil/${f.id}`}
                                                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group/item"
                                                        >
                                                            <Avatar className="w-10 h-10 border-2 border-white/10 ring-2 ring-blue-500/10 group-hover/item:ring-blue-500/20 transition-all" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-black text-white truncate">{f.full_name}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Activity size={10} className="text-blue-400" />
                                                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{f.points} PTS</p>
                                                                </div>
                                                            </div>
                                                            <ArrowUpRight size={14} className="text-white/20 group-hover/item:text-white transition-colors" />
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center py-6 text-[10px] font-black uppercase text-white/10 tracking-widest border border-dashed border-white/5 rounded-2xl">Sin perfiles seguidos</p>
                                            )}
                                        </div>

                                        {/* Siguiendo Carreras */}
                                        <div className="bg-white/[0.03] border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 lg:p-10 shadow-2xl relative overflow-hidden group hover:border-purple-500/20 transition-all">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                        <Trophy className="text-purple-400" size={16} />
                                                    </div>
                                                    <h3 className="text-lg font-black font-sans tracking-tighter text-white">CARRERAS SEGUIDAS</h3>
                                                </div>
                                                <span className="text-[10px] font-black text-white/20 uppercase tabular-nums">{followedCareers.length}</span>
                                            </div>
                                            {followedCareers.length > 0 ? (
                                                <div className="space-y-3">
                                                    {followedCareers.slice(0, 4).map((c) => (
                                                        <Link 
                                                            key={c.id} 
                                                            href={`/carreras/${c.id}`}
                                                            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group/item"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden">
                                                                    {c.escudo_url ? (
                                                                        <img src={c.escudo_url} alt={c.nombre} className="w-full h-full object-contain" />
                                                                    ) : (
                                                                        <span className="text-[10px] font-black text-white/20 uppercase">SC</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm font-black text-white group-hover/item:text-purple-400 transition-colors truncate max-w-[120px]">{c.nombre}</p>
                                                            </div>
                                                            <ArrowUpRight size={14} className="text-white/20 group-hover/item:text-white transition-colors" />
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center py-6 text-[10px] font-black uppercase text-white/10 tracking-widest border border-dashed border-white/5 rounded-2xl">Sin carreras seguidas</p>
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
