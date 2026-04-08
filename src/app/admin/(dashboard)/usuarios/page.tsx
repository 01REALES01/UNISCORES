"use client";

import { useEffect, useState, useMemo } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth, type Profile, type UserRole } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
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
    X,
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
    // Multi-sport: tracks disciplina_ids per user from profile_disciplinas table
    const [userDisciplinas, setUserDisciplinas] = useState<Record<string, number[]>>({});
    const { profile: currentProfile, isAdmin } = useAuth();
    const { logAction } = useAuditLogger();
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

    async function fetchDisciplinas() {
        const { data } = await supabase.from('disciplinas').select('id, name').order('name');
        if (data) setDisciplinas(data);
    }

    async function fetchProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (data && !error) {
            setProfiles(data as Profile[]);
            // Fetch multi-sport assignments for deportistas
            const deportistas = data.filter((p: any) => p.roles?.includes('deportista'));
            if (deportistas.length > 0) {
                const { data: pdData } = await supabase
                    .from('profile_disciplinas')
                    .select('profile_id, disciplina_id')
                    .in('profile_id', deportistas.map((p: any) => p.id));
                if (pdData) {
                    const map: Record<string, number[]> = {};
                    pdData.forEach((row: any) => {
                        if (!map[row.profile_id]) map[row.profile_id] = [];
                        map[row.profile_id].push(row.disciplina_id);
                    });
                    setUserDisciplinas(map);
                }
            }
        }
        setLoading(false);
    }

    /** Toggle a single disciplina for a user in profile_disciplinas */
    const toggleUserDisciplina = async (userId: string, disciplinaId: number) => {
        const current = userDisciplinas[userId] || [];
        const has = current.includes(disciplinaId);

        if (has) {
            // Remove
            await supabase.from('profile_disciplinas')
                .delete()
                .eq('profile_id', userId)
                .eq('disciplina_id', disciplinaId);
        } else {
            // Add
            await supabase.from('profile_disciplinas')
                .insert({ profile_id: userId, disciplina_id: disciplinaId });
        }

        // Re-fetch to get updated list
        const { data: pdData } = await supabase
            .from('profile_disciplinas')
            .select('disciplina_id')
            .eq('profile_id', userId);
        const newIds = (pdData || []).map((r: any) => r.disciplina_id);
        setUserDisciplinas(prev => ({ ...prev, [userId]: newIds }));

        // Sync legacy field: athlete_disciplina_id = first sport or null
        await supabase.from('profiles').update({
            athlete_disciplina_id: newIds.length > 0 ? newIds[0] : null
        }).eq('id', userId);

        await logAction('UPDATE_ATHLETE_SPORT', 'usuario', userId, {
            action: has ? 'remove' : 'add',
            disciplina_id: disciplinaId,
            all_disciplinas: newIds
        });
    };

    const toggleRole = async (userId: string, targetRole: UserRole) => {
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

        // If removing deportista, clear legacy field and join table
        if (targetRole === 'deportista' && currentRoles.includes('deportista')) {
            updates.athlete_disciplina_id = null;
            await supabase.from('profile_disciplinas').delete().eq('profile_id', userId);
            setUserDisciplinas(prev => { const n = { ...prev }; delete n[userId]; return n; });
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            alert('Error al actualizar roles: ' + error.message);
        } else {
            await logAction('UPDATE_ROLE', 'usuario', userId, {
                email: userToUpdate.email,
                viejos_roles: currentRoles,
                nuevos_roles: updatedRoles,
            });
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
        <div className="space-y-6 animate-in fade-in duration-500 relative min-h-screen">
            {/* Ambient Background */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="relative overflow-hidden rounded-3xl bg-white/8/60 backdrop-blur-xl border border-white/5 p-6 sm:p-10">
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
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent leading-tight font-sans">
                                Gestión de Usuarios
                            </h1>
                            <p className="text-slate-500 mt-1.5 text-sm font-medium">
                                Administra roles y permisos de acceso al sistema
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Responsive behavior */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
                                className={`relative group p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 overflow-hidden backdrop-blur-md ${isActive
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
                                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-1">{stat.label}</p>
                                        <p className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tighter transition-colors font-sans ${isActive ? 'text-white' : stat.color}`}>
                                            {stat.value}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

            {/* Filters & Search */}
            <div className="relative overflow-hidden rounded-2xl bg-white/[0.12] backdrop-blur-3xl border border-white/30 p-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <SuggestiveSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    suggestions={["Buscar por nombre...", "Buscar por correo...", "Encuentra un admin..."]}
                    className="h-11 rounded-xl bg-white/5 border border-white/10 focus-within:border-white/60 focus-within:bg-white/10 focus-within:ring-4 focus-within:ring-white/10 transition-all w-full"
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
                    <div className="text-center px-4">
                        <p className="font-bold text-lg text-white">No hay usuarios</p>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs">{searchQuery ? 'Sin resultados para tu búsqueda' : 'Los usuarios registrados aparecerán aquí'}</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2 pb-20">
                    {filteredProfiles.map((userProfile) => {
                        const isCurrentUser = userProfile.id === currentProfile?.id;
                        const isUpdating = updatingId === userProfile.id;

                        return (
                            <div
                                key={userProfile.id}
                                className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border transition-all duration-300 backdrop-blur-md ${isCurrentUser
                                    ? 'border-purple-500/30 bg-purple-500/[0.03] shadow-lg shadow-purple-500/5'
                                    : 'border-white/5 bg-white/8/40 hover:bg-white/8/60 hover:border-white/15'
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
                                <div className="relative shrink-0 w-full sm:w-[220px] mt-2 sm:mt-0">
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

                                            {/* For current user who is deportista: show sport editor button */}
                                            {isCurrentUser && userProfile.roles?.includes('deportista') && (
                                                <div className="mt-2">
                                                    <button
                                                        onClick={() => setSelectedDisciplina(selectedDisciplina === userProfile.id ? null : userProfile.id)}
                                                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Trophy size={12} className="text-emerald-400" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                                                Mis Deportes
                                                                {(userDisciplinas[userProfile.id] || []).length > 0
                                                                    ? ` · ${(userDisciplinas[userProfile.id] || []).length}`
                                                                    : ''}
                                                            </span>
                                                        </div>
                                                        <ChevronDown size={12} className="text-emerald-400" />
                                                    </button>

                                                    {selectedDisciplina === userProfile.id && (
                                                        <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/5 space-y-2 animate-in slide-in-from-top-2">
                                                            <p className="text-[9px] font-black uppercase text-slate-500 px-2 tracking-widest">Selecciona tus deportes</p>
                                                            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                                {disciplinas.map(d => {
                                                                    const isChecked = (userDisciplinas[userProfile.id] || []).includes(d.id);
                                                                    return (
                                                                        <button
                                                                            key={d.id}
                                                                            onClick={() => toggleUserDisciplina(userProfile.id, d.id)}
                                                                            className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left transition-all flex items-center justify-between ${
                                                                                isChecked
                                                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                                    : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                                                                            }`}
                                                                        >
                                                                            {d.name}
                                                                            {isChecked && <Check size={12} />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Dropdown Menu */}
                                            {openDropdown === userProfile.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none" onClick={() => setOpenDropdown(null)} />
                                                    <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-1/2 sm:top-full mt-0 sm:mt-2 z-50 w-[90vw] sm:w-64 -translate-x-1/2 sm:translate-x-0 -translate-y-1/2 sm:translate-y-0 bg-white/8 border border-white/10 rounded-3xl shadow-2xl shadow-black p-3 sm:p-2 animate-in fade-in zoom-in-95 sm:slide-in-from-top-2 duration-200">
                                                        <div className="flex items-center justify-between sm:block px-3 pt-2 pb-3 mb-2 border-b border-white/5 sm:border-0">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Gestión de Roles</p>
                                                            <button 
                                                                onClick={() => setOpenDropdown(null)}
                                                                className="sm:hidden text-slate-500 hover:text-white"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1 overflow-y-auto max-h-[60vh] sm:max-h-[350px] custom-scrollbar">
                                                            {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                                                                const config = ROLE_CONFIG[role];
                                                                const Icon = config.icon;
                                                                const isSelected = userProfile.roles?.includes(role) || (role === 'public' && (!userProfile.roles || userProfile.roles.length === 0));
                                                                const isAthlete = role === 'deportista';
                                                                const isDeportistaActive = userProfile.roles?.includes('deportista');
                                                                const thisUserDiscs = userDisciplinas[userProfile.id] || [];

                                                                return (
                                                                    <div key={role} className="space-y-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (isAthlete && !isDeportistaActive) {
                                                                                    // First activate deportista role, then let them pick sports
                                                                                    toggleRole(userProfile.id, role);
                                                                                    setSelectedDisciplina(userProfile.id);
                                                                                } else if (isAthlete && isDeportistaActive) {
                                                                                    // Toggle sport picker panel
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
                                                                                <p className="text-[10px] text-slate-500/80 leading-snug mt-0.5">
                                                                                    {isAthlete && isDeportistaActive && thisUserDiscs.length > 0
                                                                                        ? `${thisUserDiscs.length} deporte${thisUserDiscs.length > 1 ? 's' : ''} asignado${thisUserDiscs.length > 1 ? 's' : ''}`
                                                                                        : config.description}
                                                                                </p>
                                                                            </div>
                                                                            {isSelected && !isAthlete && <Check size={14} className={config.color} />}
                                                                            {isAthlete && <ChevronDown size={14} className={isDeportistaActive ? 'text-emerald-400' : 'text-slate-400'} />}
                                                                        </button>

                                                                        {/* Multi-sport picker: shows when user is deportista and panel is open */}
                                                                        {isAthlete && selectedDisciplina === userProfile.id && (
                                                                            <div className="mx-1 p-2 bg-white/5 rounded-xl border border-white/5 space-y-2 animate-in slide-in-from-top-2">
                                                                                <div className="flex items-center justify-between px-2">
                                                                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Deportes (multi-selección)</p>
                                                                                    {isDeportistaActive && (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                if (confirm('¿Quitar rol de deportista y todos sus deportes?')) {
                                                                                                    toggleRole(userProfile.id, 'deportista');
                                                                                                }
                                                                                            }}
                                                                                            className="text-[9px] font-black text-rose-400 hover:text-rose-300 transition-colors"
                                                                                        >
                                                                                            Quitar rol
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                                                    {disciplinas.map(d => {
                                                                                        const isChecked = thisUserDiscs.includes(d.id);
                                                                                        return (
                                                                                            <button
                                                                                                key={d.id}
                                                                                                onClick={() => toggleUserDisciplina(userProfile.id, d.id)}
                                                                                                className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left transition-all flex items-center justify-between ${
                                                                                                    isChecked
                                                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                                                        : 'hover:bg-white/5 text-slate-300 hover:text-white border border-transparent'
                                                                                                }`}
                                                                                            >
                                                                                                {d.name}
                                                                                                {isChecked && <Check size={12} />}
                                                                                            </button>
                                                                                        );
                                                                                    })}
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
