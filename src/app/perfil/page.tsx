"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CARRERAS_UNINORTE } from "@/lib/constants";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/use-profile";
import { MainNavbar } from "@/components/main-navbar";
import { supabase } from "@/lib/supabase";
import { Button, Input, Avatar } from "@/components/ui-primitives";
import { toast } from "sonner";
import {
    User,
    Settings,
    Trophy,
    Star,
    Camera,
    LogOut,
    Mail,
    Shield,
    Medal,
    Target,
    ChevronRight,
    Loader2,
    CheckCircle2,
    GraduationCap,
    Users
} from "lucide-react";
import { FriendsList } from "@/modules/users/components/friends-list";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";

type ProfileTab = 'general' | 'stats' | 'quiniela' | 'amigos';

export default function PerfilPage() {
    const { user, profile, isDeportista, isStaff, loading: authLoading, signOut } = useAuth();
    const { updating, uploading, updateProfile, uploadAvatar } = useProfile();
    const [activeTab, setActiveTab] = useState<ProfileTab>('general');

    // Form states
    const [fullName, setFullName] = useState("");
    const [tagline, setTagline] = useState("");
    const [aboutMe, setAboutMe] = useState("");

    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [carreras, setCarreras] = useState<any[]>([]);
    const [selectedCarreras, setSelectedCarreras] = useState<number[]>([]);
    const [searchCarrera, setSearchCarrera] = useState("");
    const [loadingCarreras, setLoadingCarreras] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        // Aseguramos que el componente inicie en vista pública (isEditing ya es false por defecto)
        setIsEditing(false);

        fetchCarreras();

        if (profile) {
            setFullName(profile.full_name || "");
            setTagline(profile.tagline || "");
            setAboutMe(profile.about_me || "");
            setSelectedCarreras(profile.carreras_ids || []);
            if (isDeportista) fetchHistory();
        }
    }, [profile, isDeportista]);

    const fetchCarreras = async () => {
        setLoadingCarreras(true);
        setFetchError(null);
        try {
            console.log("Fetching carreras...");
            const { data, error } = await supabase.from('carreras').select('*').order('nombre');

            if (error) {
                console.error("Error fetching carreras:", error);
                setFetchError(error.message);
                // No mostrar toast aquí para no ser intrusivo si es un error temporal
                return;
            }

            if (data) {
                // Filtramos por las oficiales por si hay datos basura en la DB que el admin no ha purgado
                const filtered = data.filter(c => CARRERAS_UNINORTE.includes(c.nombre));
                setCarreras(filtered);
                console.log(`Cargadas ${filtered.length} carreras (filtradas de ${data.length})`);
                if (filtered.length === 0) {
                    setFetchError("No se encontraron carreras.");
                }
            }
        } catch (err: any) {
            console.error("Critical error in fetchCarreras:", err);
            setFetchError("Error de conexión al cargar carreras.");
        } finally {
            setLoadingCarreras(false);
        }
    };

    const fetchHistory = async () => {
        if (!profile?.id) return;
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase.rpc('get_athlete_event_history', {
                athlete_profile_id: profile.id
            });
            if (data) setHistory(data);
        } catch (err) {
            console.error("Error fetching history:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0805]"><UniqueLoading size="lg" /></div>;
    if (!user) return null; // Redirect logic usually in useAuth or middleware

    const handleUpdate = async () => {
        const success = await updateProfile({
            full_name: fullName,
            tagline,
            about_me: aboutMe,
            carreras_ids: selectedCarreras
        });
        if (success) setIsEditing(false);
    };

    const toggleCarrera = (id: number) => {
        setSelectedCarreras(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            }
            if (prev.length >= 2) {
                toast.error("Máximo 2 carreras permitidas");
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await uploadAvatar(file);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-red-500/30 texture-grain overflow-x-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-4xl mx-auto px-4 pt-10 pb-20 relative z-10">
                {/* ─── HERO HEADER ─── */}
                <div className="relative mb-10 animate-in fade-in duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/6 via-transparent to-orange-500/4 rounded-[2.5rem]" />
                    <div className="absolute top-0 left-0 w-80 h-80 bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row gap-7 p-6 md:p-10">
                        {/* Avatar */}
                        <div className="relative self-start mx-auto sm:mx-0 flex-shrink-0 group">
                            <div className="absolute -inset-2 bg-gradient-to-br from-red-600 to-orange-500 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                            <Avatar
                                name={profile?.full_name || user.email}
                                src={profile?.avatar_url}
                                className="relative w-28 h-28 md:w-40 md:h-40 rounded-[2rem] border-2 border-white/8 shadow-2xl"
                            />
                            <label className="absolute -bottom-2 -right-2 p-2.5 bg-[#100d0a] border border-white/10 rounded-2xl cursor-pointer hover:bg-red-600 hover:border-red-600 transition-all duration-200 shadow-xl">
                                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                            </label>
                        </div>

                        {/* Identity */}
                        <div className="flex-1 flex flex-col justify-end text-center sm:text-left">
                            {/* Role badges */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-3">
                                {isDeportista && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
                                        <Star size={9} className="fill-current" />Deportista
                                    </span>
                                )}
                                {isStaff && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest">
                                        <Shield size={9} />Staff
                                    </span>
                                )}
                            </div>

                            {/* Name */}
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter font-outfit leading-[0.88] mb-3">
                                {profile?.full_name || "Usuario"}
                            </h1>

                            {/* Tagline */}
                            {profile?.tagline && (
                                <p className="text-white/35 text-sm md:text-base italic font-bold mb-4 max-w-lg leading-relaxed">
                                    &ldquo;{profile.tagline}&rdquo;
                                </p>
                            )}

                            {/* Stats row */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
                                <span className="flex items-center gap-1.5 text-white/30 text-[11px] font-bold">
                                    <Mail size={11} />{user.email}
                                </span>
                                <div className="w-px h-3 bg-white/10 hidden sm:block" />
                                <span className="flex items-center gap-1.5 text-amber-400 font-black text-lg tabular-nums">
                                    <Trophy size={14} />{profile?.points || 0}
                                    <span className="text-white/25 font-bold text-[10px] uppercase tracking-widest ml-0.5">pts</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px mx-8 bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-0 mb-10 border-b border-white/8 overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Settings size={15} />} label="General" />
                    {isDeportista && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Medal size={15} />} label="Mi Deporte" />}
                    <TabButton active={activeTab === 'quiniela'} onClick={() => setActiveTab('quiniela')} icon={<Target size={15} />} label="Quiniela" />
                    <TabButton active={activeTab === 'amigos'} onClick={() => setActiveTab('amigos')} icon={<Users size={15} />} label="Amigos" />
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'general' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="space-y-8"
                        >
                            {!isEditing ? (
                                /* ─── VIEW MODE (PÚBLICO) ─── */
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Main Info Card */}
                                        <div className="lg:col-span-7 space-y-8">
                                            {/* About Section */}
                                            <section className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group/about">
                                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] -rotate-12 group-hover/about:scale-110 transition-transform duration-1000">
                                                    <User size={200} />
                                                </div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500">
                                                            <Shield size={20} />
                                                        </div>
                                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/80 font-outfit">Sobre {profile?.full_name?.split(' ')[0] || 'mí'}</h3>
                                                    </div>
                                                    <div className="text-lg md:text-xl text-white/70 font-medium leading-relaxed font-outfit">
                                                        {profile?.about_me || "Este perfil está en construcción. Mantente al tanto de los próximos logros y actualizaciones."}
                                                    </div>
                                                </div>
                                            </section>

                                            <div className="flex justify-center md:justify-start">
                                                <Button
                                                    onClick={() => setIsEditing(true)}
                                                    className="h-16 px-12 rounded-[2rem] bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 transition-all duration-500 font-black uppercase tracking-[0.2em] text-[10px] group/edit"
                                                >
                                                    <Settings size={18} className="mr-3 group-hover/edit:rotate-90 transition-transform duration-500" />
                                                    Perfeccionar mi Perfil
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Right Sidebar - Academic Card */}
                                        <div className="lg:col-span-5 space-y-6">
                                            <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-white/10 p-10 shadow-3xl group/pride">
                                                <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-transparent to-orange-500/10 opacity-40 group-hover/pride:opacity-70 transition-opacity duration-1000" />

                                                <div className="relative z-10 space-y-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-inner group-hover/pride:scale-110 transition-transform duration-500">
                                                            <GraduationCap className="text-red-500" size={28} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Institución</h3>
                                                            <p className="text-sm font-black text-white font-outfit">Uninorte</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/60 mb-2 px-1">Programa Académico</h4>
                                                        {profile?.carreras_ids && profile.carreras_ids.length > 0 ? (
                                                            profile.carreras_ids.map((cid: number) => {
                                                                const carrera = carreras.find(c => c.id === cid);
                                                                return (
                                                                    <Link key={cid} href={`/carrera/${cid}`}>
                                                                        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 hover:border-red-500/40 transition-all duration-500 group/career hover:shadow-2xl hover:shadow-red-500/10">
                                                                            <p className="text-xs font-black text-white leading-tight uppercase tracking-tight group-hover/career:text-red-400">
                                                                                {carrera?.nombre || "Cargando..."}
                                                                            </p>
                                                                        </div>
                                                                    </Link>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="p-6 rounded-3xl border-2 border-dashed border-white/5 text-center bg-black/20">
                                                                <p className="text-[9px] font-black text-white/10 uppercase tracking-widest leading-relaxed">Sin carrera asignada aún</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 border-t border-white/5">
                                                        <p className="text-[11px] font-black italic text-white/30 leading-relaxed text-center group-hover/pride:text-white/50 transition-colors">
                                                            &quot;En el campo y en el aula, la excelencia es nuestro único camino.&quot;
                                                        </p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ─── EDIT MODE ─── */
                                <div className="space-y-8">
                                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 glass">
                                        <div className="flex items-center justify-between px-1">
                                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2 font-outfit">
                                                <Settings className="text-red-500" /> Editar Perfil
                                            </h2>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setIsEditing(false)}
                                                className="text-white/40 hover:text-white h-8 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                                                <Input
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Tu nombre"
                                                    className="bg-black/40 border-white/10 rounded-2xl focus:border-red-500 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Frase destacada</label>
                                                <Input
                                                    value={tagline}
                                                    onChange={(e) => setTagline(e.target.value)}
                                                    placeholder="Una frase que te identifique..."
                                                    className="bg-black/40 border-white/10 rounded-2xl focus:border-red-500 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Información sobre ti (Bio)</label>
                                                <textarea
                                                    value={aboutMe}
                                                    onChange={(e) => setAboutMe(e.target.value)}
                                                    placeholder="Cuentanos algo sobre ti, tu carrera o tus logros..."
                                                    className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl focus:border-red-500 transition-all font-bold p-4 text-sm outline-none resize-none"
                                                />
                                            </div>
                                            <div className="space-y-4 md:col-span-2">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                                                    <div className="space-y-1">
                                                        <label id="careers-label" className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Mi Carrera Universitaria (Máximo 2)</label>
                                                        <div className="relative max-w-xs">
                                                            <Input
                                                                aria-label="Buscar carrera universitaria"
                                                                placeholder="Buscar carrera..."
                                                                value={searchCarrera}
                                                                onChange={(e) => setSearchCarrera(e.target.value)}
                                                                className="h-9 text-[10px] bg-white/5 border-white/5 rounded-xl pl-3"
                                                            />
                                                        </div>
                                                    </div>
                                                    <span aria-live="polite" className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest bg-red-500/5 px-3 py-1 rounded-full border border-red-500/10 h-fit">
                                                        {selectedCarreras.length}/2 Seleccionadas
                                                    </span>
                                                </div>
                                                <div
                                                    role="group"
                                                    aria-labelledby="careers-label"
                                                    className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar p-1 focus-within:ring-1 focus-within:ring-white/10 rounded-2xl"
                                                >
                                                    {loadingCarreras && (
                                                        <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-4">
                                                            <Loader2 className="animate-spin text-red-500" size={32} />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Cargando catálogo...</p>
                                                        </div>
                                                    )}

                                                    {!loadingCarreras && fetchError && (
                                                        <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 max-w-[250px] text-center">
                                                                {fetchError}
                                                            </p>
                                                            <Button
                                                                onClick={fetchCarreras}
                                                                variant="outline"
                                                                className="h-8 rounded-xl border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10"
                                                            >
                                                                Reintentar Carga
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {!loadingCarreras && !fetchError && carreras.filter(c => c.nombre.toLowerCase().includes(searchCarrera.toLowerCase())).map(c => {
                                                        const isSelected = selectedCarreras.includes(c.id);
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => toggleCarrera(c.id)}
                                                                className={cn(
                                                                    "p-4 rounded-2xl text-left transition-all border font-bold text-[11px] relative overflow-hidden group/opt min-h-[70px] flex items-center",
                                                                    isSelected
                                                                        ? "bg-red-500/10 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                                                                        : "bg-black/40 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60"
                                                                )}
                                                            >
                                                                {isSelected && (
                                                                    <div className="absolute top-2 right-2">
                                                                        <CheckCircle2 size={14} className="text-red-500" />
                                                                    </div>
                                                                )}
                                                                <span className="relative z-10 leading-snug">{c.nombre}</span>
                                                                <div className={cn(
                                                                    "absolute inset-0 bg-gradient-to-br from-red-600/10 to-orange-500/10 opacity-0 group-hover/opt:opacity-100 transition-opacity",
                                                                    isSelected && "opacity-100"
                                                                )} />
                                                            </button>
                                                        );
                                                    })}
                                                    {carreras.length > 0 && carreras.filter(c => c.nombre.toLowerCase().includes(searchCarrera.toLowerCase())).length === 0 && (
                                                        <div className="col-span-full py-10 text-center opacity-40 italic text-xs">
                                                            No se encontraron carreras que coincidan con &quot;{searchCarrera}&quot;
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-white/20 font-bold mt-2 italic px-1">
                                                    Selecciona hasta 2 opciones si aplicas a doble titulación o eres egresado. Las carreras se mostrarán en tu perfil público.
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleUpdate}
                                            disabled={updating}
                                            className="w-full md:w-auto px-8 h-12 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl disabled:opacity-50"
                                        >
                                            {updating ? <><Loader2 className="mr-2 animate-spin" size={18} /> Guardando...</> : "Guardar Cambios"}
                                        </Button>
                                    </div>

                                    <section className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 flex flex-col items-center text-center">
                                        <h2 className="text-lg font-black text-red-500 uppercase tracking-widest mb-2">Zona Peligrosa</h2>
                                        <p className="text-sm text-white/40 mb-6 font-bold">¿Deseas cerrar tu sesión en este dispositivo?</p>
                                        <Button
                                            variant="outline"
                                            onClick={() => signOut()}
                                            className="border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-2xl px-10 font-bold"
                                        >
                                            <LogOut size={18} className="mr-2" /> Cerrar Sesión
                                        </Button>
                                    </section>
                                </div>
                            )}
                        </motion.div>
                    )}


                    {activeTab === 'stats' && isDeportista && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                            <div className="bg-gradient-to-br from-red-600/10 to-orange-600/10 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-10 opacity-10 blur-sm group-hover:blur-none transition-all">
                                    {profile?.disciplina?.icon === 'futbol' ? <Medal size={120} /> : <Trophy size={120} />}
                                </div>
                                <div className="relative z-10">
                                    <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{profile?.disciplina?.name || "Disciplina"}</p>
                                    <h3 className="text-4xl font-black tracking-tighter mb-4 font-outfit">Mi Rendimiento</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center group/card hover:border-red-500/30 transition-all">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Victorias</span>
                                            <span className="text-4xl font-black text-white tabular-nums font-outfit">{profile?.wins || 0}</span>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center group/card hover:border-white/20 transition-all">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Derrotas</span>
                                            <span className="text-4xl font-black text-white/60 tabular-nums font-outfit">{profile?.losses || 0}</span>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center group/card hover:border-orange-500/30 transition-all">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Puntos Totales</span>
                                            <span className="text-4xl font-black text-orange-500 tabular-nums font-outfit">{profile?.total_score_all_time || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Matches Historial */}
                            <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                                <h4 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2 font-outfit">
                                    <Target size={16} className="text-red-500" /> Historial Reciente
                                </h4>

                                <div className="space-y-4">
                                    {loadingHistory ? (
                                        <div className="flex flex-col items-center py-10 text-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                                <Loader2 size={24} className="text-white/20 animate-spin" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest text-white/20">Cargando historial...</p>
                                        </div>
                                    ) : history.length > 0 ? (
                                        history.map((h, i) => (
                                            <Link key={i} href={`/partido/${h.match_id}`} className="block group/item">
                                                <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/5 group-hover/item:border-white/10 group-hover/item:bg-white/[0.04] transition-all gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                            {h.disciplina.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black tracking-widest uppercase text-white/40 mb-1">{h.disciplina}</p>
                                                            <h5 className="text-sm font-bold flex items-center gap-2">
                                                                {h.equipo_a} <span className="text-[10px] text-white/20">VS</span> {h.equipo_b}
                                                            </h5>
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
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right hidden sm:block">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Resultado</p>
                                                            <p className="text-sm font-black tabular-nums">
                                                                {h.marcador_final?.goles_a ?? h.marcador_final?.sets_a ?? h.marcador_final?.total_a ?? 0} - {h.marcador_final?.goles_b ?? h.marcador_final?.sets_b ?? h.marcador_final?.total_b ?? 0}
                                                            </p>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-white/20 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                            {new Date(h.fecha).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center py-10 text-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                                <Trophy size={24} className="text-white/10" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest text-white/20">Sin encuentros registrados</p>
                                            <p className="text-[10px] font-bold text-white/10 mt-2 max-w-[200px]">Tus participaciones en {profile?.disciplina?.name} aparecerán aquí automáticamente.</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Info Card */}
                            <div className="p-8 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                                    <Star size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-amber-500 uppercase tracking-widest font-outfit">Perfil de Atleta Verificado</p>
                                    <p className="text-xs text-white/40 font-bold leading-relaxed">
                                        Tus estadísticas se actualizan en tiempo real cada vez que un administrador finaliza un partido donde estás vinculado como participante.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'quiniela' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="text-center md:text-left">
                                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Estatus en el Ranking</p>
                                        <h3 className="text-3xl font-black tracking-tighter mb-1">{profile?.points || 0} Aciertos</h3>
                                        <p className="text-white/40 text-sm font-bold">¡Sigue así para subir al Top del podio!</p>
                                    </div>
                                    <Link href="/quiniela">
                                        <Button className="rounded-2xl bg-white text-black font-black uppercase tracking-widest px-8 h-12 hover:bg-indigo-50 transition-all">
                                            Ir a la Quiniela <ChevronRight size={18} className="ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'amigos' && user && (
                        <FriendsList userId={user.id} />
                    )}
                </div>
            </main>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            role="tab"
            aria-selected={active}
            className={cn(
                "flex items-center justify-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all outline-none relative border-b-2 -mb-px whitespace-nowrap focus-visible:ring-2 focus-visible:ring-red-500",
                active
                    ? "text-white border-red-500"
                    : "text-white/30 border-transparent hover:text-white/60 hover:border-white/20"
            )}
        >
            {icon}
            <span className="hidden sm:inline font-outfit">{label}</span>
        </button>
    );
}
