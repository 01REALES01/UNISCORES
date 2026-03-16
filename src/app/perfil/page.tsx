"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/use-profile";
import { MainNavbar } from "@/components/main-navbar";
import { Button, Input, Avatar, Badge } from "@/components/ui-primitives";
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
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";

type ProfileTab = 'general' | 'stats' | 'quiniela';

export default function PerfilPage() {
    const { user, profile, isDeportista, isStaff, loading: authLoading, signOut } = useAuth();
    const { updating, uploading, updateProfile, uploadAvatar } = useProfile();
    const [activeTab, setActiveTab] = useState<ProfileTab>('general');
    
    // Form states
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setBio(profile.bio || "");
        }
    }, [profile]);

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0805]"><UniqueLoading size="lg" /></div>;
    if (!user) return null; // Redirect logic usually in useAuth or middleware

    const handleUpdate = async () => {
        await updateProfile({ full_name: fullName, bio });
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
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row items-center gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-orange-500 rounded-[2.5rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                        <div className="relative">
                            <Avatar 
                                name={profile?.full_name || user.email} 
                                src={profile?.avatar_url}
                                className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-white/5 shadow-2xl" 
                            />
                            <label className="absolute bottom-2 right-2 p-2.5 bg-[#1A1612] border border-white/10 rounded-2xl cursor-pointer hover:bg-red-600 transition-all shadow-xl group/icon">
                                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                            <h1 className="text-3xl font-black tracking-tighter font-outfit">{profile?.full_name || "Usuario"}</h1>
                            {isDeportista && (
                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 self-center md:self-auto">
                                    <Star size={12} className="mr-1 fill-current" /> Deportista
                                </Badge>
                            )}
                        </div>
                        <p className="text-white/40 font-bold flex items-center justify-center md:justify-start gap-2 mb-4">
                            <Mail size={14} /> {user.email}
                        </p>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                                <Trophy size={16} className="text-yellow-500" />
                                <span className="text-sm font-black tabular-nums">{profile?.points || 0}</span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Puntos</span>
                            </div>
                            {isStaff && (
                                <div className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                                    <Shield size={16} className="text-blue-400" />
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Personal de Staff</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-3xl mb-10 overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<Settings size={18} />} label="General" />
                    {isDeportista && <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Medal size={18} />} label="Mi Deporte" />}
                    <TabButton active={activeTab === 'quiniela'} onClick={() => setActiveTab('quiniela')} icon={<Target size={18} />} label="Quiniela" />
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <section className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 glass">
                                <h2 className="text-xl font-black tracking-tight flex items-center gap-2 mb-2 font-outfit">
                                    <Settings className="text-red-500" /> Información Personal
                                </h2>
                                
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
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Sobre mí (Bio)</label>
                                        <Input 
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Cuentanos algo sobre ti..."
                                            className="bg-black/40 border-white/10 rounded-2xl focus:border-red-500 transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                <Button 
                                    onClick={handleUpdate}
                                    disabled={updating}
                                    className="w-full md:w-auto px-8 h-12 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl disabled:opacity-50"
                                >
                                    {updating ? <><Loader2 className="mr-2 animate-spin" size={18} /> Guardando...</> : "Guardar Cambios"}
                                </Button>
                            </section>

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
                                    {/* Nota: En un futuro esto vendrá de un query filtrado, por ahora usamos un placeholder estilizado 
                                        que indique que el sistema de vinculación está activo */}
                                    <div className="flex flex-col items-center py-10 text-center">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                            <Loader2 size={24} className="text-white/20 animate-spin" />
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-widest text-white/20">Sincronizando últimos encuentros...</p>
                                        <p className="text-[10px] font-bold text-white/10 mt-2 max-w-[200px]">Tus participaciones en {profile?.disciplina?.name} aparecerán aquí automáticamente.</p>
                                    </div>
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
                "flex-1 flex items-center justify-center gap-2 py-4 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all focus-visible:ring-2 focus-visible:ring-red-500 outline-none",
                active ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
        >
            {icon}
            <span className="hidden sm:inline font-outfit">{label}</span>
        </button>
    );
}
