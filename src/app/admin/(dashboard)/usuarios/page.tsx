"use client";

import { useEffect, useState, useMemo } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth, type Profile, type UserRole } from "@/hooks/useAuth";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { Card, Badge, Avatar, Button } from "@/components/ui-primitives";
import {
    Users,
    Shield,
    Crown,
    UserCheck,
    User,
    ChevronDown,
    Loader2,
    Check,
    PenTool,
    Trophy,
    Edit
} from "lucide-react";
import UniqueLoading from "@/components/ui/morph-loading";
import { useRouter } from "next/navigation";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: typeof Crown; description: string }> = {
    admin: {
        label: 'Administrador',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        icon: Crown,
        description: 'Control total del sistema',
    },
    data_entry: {
        label: 'Data Entry',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10 border-rose-500/20',
        icon: UserCheck,
        description: 'Puede gestionar partidos',
    },
    periodista: {
        label: 'Periodista',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        icon: PenTool,
        description: 'Puede gestionar noticias',
    },
    public: {
        label: 'Público',
        color: 'text-slate-400',
        bg: 'bg-slate-500/10 border-slate-500/20',
        icon: User,
        description: 'Solo lectura',
    },
    deportista: {
        label: 'Deportista',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        icon: UserCheck,
        description: 'Atleta con perfil público y stats',
    },
};export default function UsuariosPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [selectedDisciplina, setSelectedDisciplina] = useState<string | null>(null);
    const { profile: currentProfile, isAdmin } = useAuth();
    const router = useRouter();

    // Redirect if not admin
    useEffect(() => {
        if (!isAdmin && currentProfile) {
            router.push('/admin');
        }
    }, [isAdmin, currentProfile, router]);

    useEffect(() => {
        fetchProfiles();
        fetchDisciplinas();
    }, []);

    const fetchDisciplinas = async () => {
        const { data } = await supabase.from('disciplinas').select('id, name').order('name');
        if (data) setDisciplinas(data);
    };

    const fetchProfiles = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (data && !error) {
            setProfiles(data as Profile[]);
        }
        setLoading(false);
    };

    const toggleRole = async (userId: string, targetRole: UserRole, disciplinaId?: number) => {
        if (userId === currentProfile?.id) {
            alert('No puedes cambiar tu propio rol');
            return;
        }

        const userToUpdate = profiles.find(p => p.id === userId);
        if (!userToUpdate) return;

        let currentRoles = userToUpdate.roles || ['public'];
        let updatedRoles: UserRole[] = [...currentRoles];

        if (updatedRoles.includes(targetRole)) {
            // REMOVE ROLE (Minimum 1 role)
            if (updatedRoles.length <= 1) {
                alert('Un usuario debe tener al menos un rol');
                return;
            }
            updatedRoles = updatedRoles.filter(r => r !== targetRole);
        } else {
            // ADD ROLE (Maximum 2 roles)
            if (updatedRoles.length >= 2) {
                alert('Un usuario puede tener un máximo de 2 roles');
                return;
            }
            updatedRoles.push(targetRole);
        }

        setUpdatingId(userId);
        setOpenDropdown(null);

        const updates: any = { 
            roles: updatedRoles, 
            updated_at: new Date().toISOString() 
        };

        if (targetRole === 'deportista' && !currentRoles.includes('deportista') && disciplinaId) {
            updates.athlete_disciplina_id = disciplinaId;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            alert('Error al actualizar roles: ' + error.message);
        } else {
            // Optional: You could add a toast here if sonner is available
            await fetchProfiles();
        }

        setUpdatingId(null);
        setSelectedDisciplina(null);
    };

    const { filteredProfiles, stats } = useMemo(() => {
        const filtered = profiles.filter(p => {
            const userRoles = p.roles || ['public'];
            if (roleFilter !== 'all' && !userRoles.includes(roleFilter as UserRole)) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!p.email.toLowerCase().includes(q) && !(p.full_name || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });

        const counts = {
            admin: profiles.filter(p => p.roles?.includes('admin')).length,
            data_entry: profiles.filter(p => p.roles?.includes('data_entry')).length,
            deportista: profiles.filter(p => p.roles?.includes('deportista')).length,
            periodista: profiles.filter(p => p.roles?.includes('periodista')).length,
            public: profiles.filter(p => p.roles?.length === 1 && p.roles[0] === 'public').length,
        };

        return { filteredProfiles: filtered, stats: counts };
    }, [profiles, roleFilter, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative texture-grain min-h-screen">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="relative overflow-hidden rounded-3xl bg-[#17130D]/60 backdrop-blur-xl border border-white/5 p-8 sm:p-10">
                    <div className="absolute right-[-5%] top-[-20%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
                                    <Shield size={22} className="text-white" />
                                </div>
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase">
                                    Solo Administradores
                                </span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent leading-tight font-outfit">
                                Gestión de Usuarios
                            </h1>
                            <p className="text-slate-500 mt-1.5 text-sm font-medium">
                                Administra roles y permisos de acceso al sistema
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - High Craft Asymmetrical */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                        { label: 'Administradores', value: stats.admin, color: 'text-purple-400', gradient: 'from-purple-500 to-indigo-600', icon: Crown, filter: 'admin' },
                        { label: 'Data Entry', value: stats.data_entry, color: 'text-rose-400', gradient: 'from-rose-500 to-red-600', icon: UserCheck, filter: 'data_entry' },
                        { label: 'Deportistas', value: stats.deportista, color: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-600', icon: Trophy, filter: 'deportista' },
                        { label: 'Periodistas', value: stats.periodista, color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-600', icon: PenTool, filter: 'periodista' },
                        { label: 'Públicos', value: stats.public, color: 'text-slate-400', gradient: 'from-slate-500 to-slate-600', icon: User, filter: 'public' },
                    ].map((stat, i) => {
                        const isActive = roleFilter === stat.filter;
                        const Icon = stat.icon;
                        return (
                            <button
                                key={stat.label}
                                onClick={() => setRoleFilter(roleFilter === stat.filter ? 'all' : stat.filter)}
                                className={`relative group p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden backdrop-blur-md ${isActive
                                    ? 'border-white/15 bg-white/10 shadow-lg ring-1 ring-white/10'
                                    : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                    <div className="flex items-start justify-between">
                                        <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-gradient-to-br ' + stat.gradient + ' shadow-md' : 'bg-white/5 group-hover:bg-white/10'}`}>
                                            <Icon size={18} className={isActive ? "text-white" : stat.color} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1">{stat.label}</p>
                                        <p className={`text-3xl font-black tabular-nums tracking-tighter transition-colors font-outfit ${isActive ? 'text-white' : stat.color}`}>
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

            {/* Filters & Search */}
            <div className="relative overflow-hidden rounded-2xl bg-[#17130D]/40 backdrop-blur-md border border-white/5 p-4">
                <SuggestiveSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    suggestions={["Buscar por nombre...", "Buscar por correo...", "Encuentra un admin..."]}
                    className="h-11 rounded-xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-purple-500/10 transition-all w-full"
                />
            </div>

            {/* Users List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <UniqueLoading size="lg" />
                </div>
            ) : filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Users size={40} className="text-white/15" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-lg text-white">No hay usuarios</p>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs">{searchQuery ? 'Sin resultados para tu búsqueda' : 'Los usuarios registrados aparecerán aquí'}</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {filteredProfiles.map((userProfile) => {
                        const isCurrentUser = userProfile.id === currentProfile?.id;
                        const isUpdating = updatingId === userProfile.id;

                        return (
                            <div
                                key={userProfile.id}
                                className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border transition-all duration-300 backdrop-blur-md ${isCurrentUser
                                    ? 'border-purple-500/30 bg-purple-500/[0.03] shadow-lg shadow-purple-500/5'
                                    : 'border-white/5 bg-[#17130D]/40 hover:bg-[#17130D]/60 hover:border-white/15'
                                    } ${openDropdown === userProfile.id ? 'z-40' : 'z-10'}`}
                            >
                                {/* Left Content */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <Avatar name={userProfile.full_name || userProfile.email} size="lg" className="ring-2 ring-white/5 shrink-0 shadow-lg" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-base text-white truncate">
                                                {userProfile.full_name || 'Sin nombre'}
                                            </span>
                                            {isCurrentUser && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 tracking-widest shrink-0 border border-purple-500/30">
                                                    Tú
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate mb-1.5">{userProfile.email}</p>
                                        <p className="text-[10px] text-slate-600 font-medium">
                                            Registrado {new Date(userProfile.created_at).toLocaleDateString('es-CO', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Content - Role Selector (Multiple Badges) */}
                                <div className="relative shrink-0 w-full sm:w-[200px] mt-2 sm:mt-0">
                                    {isUpdating ? (
                                        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 h-11">
                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                            <span className="text-xs font-bold text-slate-400">Guardando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                onClick={() => {
                                                    if (isCurrentUser) return;
                                                    setOpenDropdown(openDropdown === userProfile.id ? null : userProfile.id);
                                                }}
                                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border min-h-11 transition-all ${isCurrentUser
                                                    ? 'opacity-60 cursor-not-allowed bg-black/20 border-white/5'
                                                    : 'cursor-pointer hover:border-white/30 hover:bg-white/[0.05] border-white/10 bg-black/40'
                                                    }`}
                                            >
                                                <div className="flex flex-wrap gap-1 py-0.5">
                                                    {(userProfile.roles || ['public']).map(r => {
                                                        const cfg = ROLE_CONFIG[r];
                                                        const RIcon = cfg.icon;
                                                        return (
                                                            <div key={r} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border shadow-sm ${cfg.bg}`}>
                                                                <RIcon size={10} className={cfg.color} />
                                                                <span className={`text-[9px] font-black uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {!isCurrentUser && <ChevronDown size={14} className="text-slate-500 transition-transform group-hover:text-white/80" />}
                                            </div>

                                            {/* Dropdown Menu */}
                                            {openDropdown === userProfile.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                                                    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-[#1A1612] border border-white/10 rounded-2xl shadow-2xl shadow-black p-2 animate-in fade-in slide-in-from-top-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 pt-2 pb-2">Seleccionar Roles (Máx 2)</p>
                                                        <div className="space-y-1 overflow-y-auto max-h-[350px] custom-scrollbar">
                                                            {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                                                                const config = ROLE_CONFIG[role];
                                                                const Icon = config.icon;
                                                                const isSelected = userProfile.roles?.includes(role) || (role === 'public' && (!userProfile.roles || userProfile.roles.length === 0));
                                                                const isAthlete = role === 'deportista';

                                                                return (
                                                                    <div key={role} className="space-y-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (isAthlete && !userProfile.roles?.includes('deportista')) {
                                                                                    setSelectedDisciplina(selectedDisciplina === userProfile.id ? null : userProfile.id);
                                                                                } else {
                                                                                    toggleRole(userProfile.id, role);
                                                                                }
                                                                            }}
                                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left group ${isSelected
                                                                                ? 'bg-white/10 border border-white/10'
                                                                                : 'hover:bg-white/5 border border-transparent'
                                                                                }`}
                                                                        >
                                                                            <div className={`p-2 rounded-lg transition-colors ${isSelected ? config.bg : 'bg-black/30 group-hover:bg-black/50'}`}>
                                                                                <Icon size={14} className={isSelected ? config.color : 'text-slate-500 group-hover:text-slate-300'} />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <span className={`text-sm font-bold ${isSelected ? config.color : 'text-slate-300'}`}>{config.label}</span>
                                                                                <p className="text-[10px] text-slate-500/80 leading-snug mt-0.5">{config.description}</p>
                                                                            </div>
                                                                            {isSelected && <Check size={14} className={config.color} />}
                                                                            {isAthlete && !isSelected && <ChevronDown size={14} className="text-slate-400" />}
                                                                        </button>

                                                                        {isAthlete && selectedDisciplina === userProfile.id && (
                                                                            <div className="mx-1 p-2 bg-white/5 rounded-xl border border-white/5 space-y-2 animate-in slide-in-from-top-2">
                                                                                <p className="text-[9px] font-black uppercase text-slate-500 px-2 tracking-widest">Selecciona Deporte</p>
                                                                                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                                                    {disciplinas.map(d => (
                                                                                        <button
                                                                                            key={d.id}
                                                                                            onClick={() => toggleRole(userProfile.id, 'deportista', d.id)}
                                                                                            className="w-full px-3 py-2 rounded-lg hover:bg-emerald-500/20 text-xs font-bold text-slate-300 hover:text-emerald-400 text-left transition-colors"
                                                                                        >
                                                                                            {d.name}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Counter */}
            {!loading && filteredProfiles.length > 0 && (
                <p className="text-center text-xs text-slate-600 font-medium pt-4">
                    Mostrando {filteredProfiles.length} de {profiles.length} usuarios en total
                </p>
            )}
            </div>
        </div>
    );
}
