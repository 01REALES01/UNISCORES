"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, Badge, Button, Card } from "@/components/ui-primitives";
import { 
    Trophy, 
    Star, 
    Mail, 
    Medal, 
    Target,
    ChevronLeft,
    Loader2,
    Calendar,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { motion } from "framer-motion";

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user, profile: currentUserProfile, isStaff } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [carreras, setCarreras] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const profileId = params.id as string;

    useEffect(() => {
        if (profileId) {
            fetchPublicProfile();
        }
    }, [profileId]);

    const fetchPublicProfile = async () => {
        setLoading(true);
        try {
            // 1. Fetch Profile and joined data
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

            // 2. Fetch Careers if any
            if (p.carreras_ids && p.carreras_ids.length > 0) {
                const { data: c } = await supabase
                    .from('carreras')
                    .select('*')
                    .in('id', p.carreras_ids);
                if (c) setCarreras(c);
            }

            // 3. Fetch History and Stats if athlete
            const isAthlete = p.roles?.includes('deportista');
            if (isAthlete) {
                fetchHistory(p.id);
            }
        } catch (err) {
            console.error("Error fetching public profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true);
        try {
            const { data } = await supabase.rpc('get_athlete_event_history', { 
                athlete_profile_id: id 
            });
            if (data) setHistory(data);
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0805]"><UniqueLoading size="lg" /></div>;

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#0a0805] text-white flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <Star className="text-red-500" size={32} />
                </div>
                <h1 className="text-2xl font-black mb-2 font-outfit uppercase tracking-wider">Perfil no encontrado</h1>
                <p className="text-white/40 mb-8 max-w-sm text-center font-bold">El usuario que buscas no existe o su perfil es privado.</p>
                <Button onClick={() => router.back()} className="rounded-2xl px-8 h-12 bg-white text-black font-black uppercase tracking-widest hover:bg-slate-200">
                    <ChevronLeft className="mr-2" size={18} /> Volver atrás
                </Button>
            </div>
        );
    }

    const isDeportista = profile.roles?.includes('deportista');

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30 texture-grain overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[150px]" />
            </div>

            <MainNavbar user={user} profile={currentUserProfile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-20 relative z-10">
                <div className="mb-8">
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-red-500 group-hover:text-black transition-all">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>
                </div>

                {/* Header Profile Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row items-center gap-8 mb-16"
                >
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-orange-500 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative">
                            <Avatar 
                                name={profile.full_name} 
                                src={profile.avatar_url}
                                className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] border-4 border-white/10 shadow-2xl" 
                            />
                            {isDeportista && (
                                <div className="absolute -bottom-4 -right-4 p-4 bg-amber-500 text-black rounded-3xl shadow-2xl border-4 border-[#0a0805] animate-bounce-slow">
                                    <Trophy size={24} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter font-outfit">{profile.full_name}</h1>
                            {isDeportista && (
                                <Badge className="bg-amber-500 text-black border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 self-center md:self-auto rounded-full">
                                    <Star size={12} className="mr-1 fill-current" /> Atleta Élite
                                </Badge>
                            )}
                        </div>

                        {profile.tagline && (
                            <p className="text-xl md:text-2xl text-red-500 font-black italic mb-6 max-w-2xl leading-tight font-outfit">
                                &quot;{profile.tagline}&quot;
                            </p>
                        )}
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 glass hover:border-white/20 transition-all">
                                <Target size={20} className="text-red-500" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-white/40 uppercase tracking-widest leading-none mb-1">Puntos</span>
                                    <span className="text-2xl font-black tabular-nums font-outfit leading-none">{profile.points || 0}</span>
                                </div>
                            </div>
                            
                            {carreras.length > 0 && (
                                <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 glass hover:border-white/20 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-white/40 uppercase tracking-widest leading-none mb-1">Carreras</span>
                                        <div className="flex gap-2">
                                            {carreras.map(c => (
                                                <span key={c.id} className="text-[10px] font-black text-white bg-white/10 px-2 py-1 rounded-lg">
                                                    {c.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Athlete Stats (if applicable) */}
                    {isDeportista && (
                        <Card variant="glass" className="md:col-span-1 p-8 space-y-6 border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                                <Medal size={120} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-amber-500 mb-8 font-outfit">Estadísticas de Atleta</h3>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Disciplina</span>
                                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 px-3 font-black text-[9px] uppercase">
                                        {profile.disciplina?.name || "Multideporte"}
                                    </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                                        <p className="text-[9px] font-black text-white/30 uppercase mb-1">Wins</p>
                                        <p className="text-2xl font-black font-outfit">{profile.wins || 0}</p>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                                        <p className="text-[9px] font-black text-white/30 uppercase mb-1">Loss</p>
                                        <p className="text-2xl font-black font-outfit text-white/40">{profile.losses || 0}</p>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-4 rounded-2xl border border-amber-500/30 text-center">
                                    <p className="text-[9px] font-black text-amber-500 uppercase mb-1">Total Score</p>
                                    <p className="text-3xl font-black font-outfit text-white">{profile.total_score_all_time || 0}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    <div className={cn("space-y-8", isDeportista ? "md:col-span-2" : "md:col-span-3")}>
                        {/* Summary of Achievements / Bio Details */}
                        <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 glass min-h-[200px] flex flex-col justify-center">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/40 mb-6 font-outfit">Acerca de {profile.full_name?.split(' ')[0]}</h3>
                            <div className="text-white/80 font-bold leading-relaxed whitespace-pre-wrap">
                                {profile.about_me || profile.bio || "Este atleta prefiere dejar que su rendimiento en la cancha hable por él. No se ha proporcionado información adicional."}
                            </div>
                            <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-6">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                                    <Calendar size={14} />
                                    Se unió: {new Date(profile.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                                    <Star size={14} className="text-red-500 fill-red-500/20" />
                                    {isDeportista ? "Atleta Verificado" : "Usuario Platinum"}
                                </div>
                            </div>
                        </section>

                        {/* Recent History */}
                        {isDeportista && (
                            <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 glass overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] font-outfit">Encuentros Recientes</h3>
                                    <Link href="/partidos" className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1">
                                        Ver todos <ArrowUpRight size={12} />
                                    </Link>
                                </div>

                                <div className="space-y-3">
                                    {loadingHistory ? (
                                        <div className="flex justify-center py-10">
                                            <Loader2 className="animate-spin text-white/20" />
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.slice(0, 5).map((h, i) => (
                                            <Link key={i} href={`/partido/${h.match_id}`} className="block group/h">
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-black text-[10px]">
                                                            {h.disciplina.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-white/40 uppercase mb-0.5">{h.disciplina}</p>
                                                            <p className="text-xs font-bold text-white group-hover/h:text-red-400 transition-colors">
                                                                {h.equipo_a} vs {h.equipo_b}
                                                            </p>
                                                            {h.puntos_personales > 0 && (
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <Star size={10} className="text-amber-500 fill-amber-500" />
                                                                    <span className="text-[10px] font-black uppercase text-amber-500/80">
                                                                        {h.puntos_personales} {h.disciplina.toLowerCase().includes('f') ? 'Goles' : 'Puntos'} aportados
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-black tabular-nums">
                                                            {h.marcador_final?.goles_a ?? h.marcador_final?.sets_a ?? h.marcador_final?.total_a ?? h.marcador_final?.puntos_a ?? 0} - {h.marcador_final?.goles_b ?? h.marcador_final?.sets_b ?? h.marcador_final?.total_b ?? h.marcador_final?.puntos_b ?? 0}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{new Date(h.fecha).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <p className="text-center py-10 text-[10px] font-black uppercase tracking-widest text-white/20">Sin participaciones registradas</p>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
