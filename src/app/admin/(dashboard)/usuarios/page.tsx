"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";

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
    Trophy,
    X,
    Edit,
    Trash2,
    PenTool,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import UniqueLoading from "@/components/ui/morph-loading";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
};

export default function UsuariosPage() {
    const searchParams = useSearchParams();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadTimeout, setLoadTimeout] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [selectedDisciplina, setSelectedDisciplina] = useState<string | null>(null);
    // Multi-sport: tracks disciplina_ids per user from profile_disciplinas table
    const [userDisciplinas, setUserDisciplinas] = useState<Record<string, number[]>>({});
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
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
        const q = searchParams.get('search');
        if (q !== null) setSearchQuery(q);
    }, [searchParams]);

    useEffect(() => {
        fetchProfiles();
        fetchDisciplinas();
    }, []);

    // Resilience: 8s safety net
    useEffect(() => {
        if (!loading) { setLoadTimeout(false); return; }
        const t = setTimeout(() => {
            if (loading) setLoadTimeout(true);
        }, 8000);
        return () => clearTimeout(t);
    }, [loading]);

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

    const handleDeleteUser = async (userId: string, email: string) => {
        if (userId === currentProfile?.id) return;

        const confirmText = `¿Estás seguro de que deseas eliminar permanentemente a ${email}? \n\nEsta acción borrará tanto el perfil como la cuenta de autenticación (login) y no se puede deshacer.`;
        
        if (!window.confirm(confirmText)) return;

        setDeletingId(userId);
        try {
            const res = await fetch('/api/admin/usuarios/eliminar', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.details || data.error || 'Error al eliminar');

            toast.success('Usuario eliminado correctamente');
            
            // Audit log local (opcional porque el perfil ya no existe, pero intentamos)
            await logAction('DELETE_USER', 'usuario', userId, { email });
            
            // Update local state
            setProfiles(prev => prev.filter(p => p.id !== userId));
        } catch (err: any) {
            console.error('Delete error:', err);
            toast.error(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const syncNames = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/sync-names', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Error al sincronizar');
            if (data.updated > 0) {
                toast.success(data.message);
                await fetchProfiles();
            } else {
                toast.info(data.message);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSyncing(false);
        }
    };

    const { filteredProfiles, stats } = useMemo(() => {
        const filtered = profiles.filter(p => {
            const userRoles = p.roles || ['public'];
            if (roleFilter !== 'all' && !userRoles.includes(roleFilter as UserRole)) return false;
            if (searchQuery) {
                const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
                const name = (p.full_name || '').toLowerCase();
                const email = (p.email || '').toLowerCase();
                
                const matchAll = tokens.every(token => 
                    name.includes(token) || email.includes(token)
                );
                
                if (!matchAll) return false;
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
        <div className="space-y-5 animate-in fade-in duration-500 relative pb-6 overflow-x-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-purple-600/[0.07] blur-[80px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-red-600/[0.05] blur-[70px]" aria-hidden />

            <div className="relative z-10 space-y-5">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-5 sm:p-8 shadow-lg shadow-black/20">
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
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                                Gestión de Usuarios
                            </h1>
                            <p className="text-slate-400 mt-1.5 text-sm font-medium">
                                Administra roles y permisos de acceso al sistema
                            </p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={syncNames}
                                disabled={syncing}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                title="Actualiza los nombres de jugadores vinculados"
                            >
                                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Sincronizando...' : 'Sincronizar nombres'}
                            </button>
                        )}
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
                                className={`relative group p-4 sm:p-5 rounded-2xl border text-left transition-colors overflow-hidden ${isActive
                                    ? 'border-zinc-500 bg-zinc-800/90 shadow-md ring-1 ring-zinc-600'
                                    : 'border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800/90 hover:border-zinc-600'
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
            <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/85 p-3 sm:p-4">
                <SuggestiveSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    suggestions={["Buscar por nombre...", "Buscar por correo...", "Encuentra un admin..."]}
                    className="h-11 rounded-xl bg-zinc-950 border border-zinc-600 focus-within:border-violet-500/70 focus-within:ring-2 focus-within:ring-violet-500/25 transition-all w-full"
                />
            </div>

            {/* Users List */}
            {loading && profiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32">
                    {loadTimeout ? (
                        <div className="flex flex-col items-center text-center max-w-sm">
                            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                                <Shield className="text-amber-500 animate-pulse" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">Sincronización Lenta</h3>
                            <p className="text-slate-400 text-sm mb-8 italic">
                                La base de datos de usuarios está tardando más de lo esperado en responder.
                            </p>
                            <Button 
                                onClick={() => { setLoadTimeout(false); fetchProfiles(); }} 
                                className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl"
                            >
                                Reintentar Conexión
                            </Button>
                        </div>
                    ) : (
                        <UniqueLoading size="lg" />
                    )}
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
                <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                    {filteredProfiles.map((userProfile) => {
                        const isCurrentUser = userProfile.id === currentProfile?.id;
                        const isUpdating = updatingId === userProfile.id;

                        return (
                            <div
                                key={userProfile.id}
                                className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-colors ${isCurrentUser
                                    ? 'border-purple-500/50 bg-purple-950/50 shadow-md shadow-purple-900/20'
                                    : 'border-zinc-700/80 bg-zinc-900/90 hover:border-zinc-600 hover:bg-zinc-900'
                                    } ${openDropdown === userProfile.id ? 'z-[120]' : 'z-10'}`}
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
                                    {!isCurrentUser && (
                                        <button
                                            onClick={() => handleDeleteUser(userProfile.id, userProfile.email)}
                                            disabled={deletingId === userProfile.id}
                                            className="shrink-0 p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all md:opacity-0 md:group-hover:opacity-100"
                                            title="Eliminar usuario"
                                        >
                                            {deletingId === userProfile.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Right Content - Role Selector (Multiple Badges) */}
                                <div className="relative shrink-0 w-full sm:w-[220px] mt-2 sm:mt-0">
                                    {isUpdating ? (
                                        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 h-11">
                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                            <span className="text-xs font-bold text-slate-300">Guardando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                onClick={() => {
                                                    if (isCurrentUser) return;
                                                    setOpenDropdown(openDropdown === userProfile.id ? null : userProfile.id);
                                                }}
                                                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border min-h-[2.75rem] transition-all ${isCurrentUser
                                                    ? 'opacity-60 cursor-not-allowed bg-zinc-950/50 border-zinc-800'
                                                    : 'cursor-pointer active:scale-[0.99] border-zinc-600 bg-zinc-950 hover:border-violet-500/50 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                <div className="flex flex-wrap gap-1 py-0.5">
                                                    {(userProfile.roles || ['public']).map(r => {
                                                        const cfg = ROLE_CONFIG[r];
                                                        const RIcon = cfg.icon;
                                                        return (
                                                            <div key={r} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border border-zinc-600/60 bg-zinc-900/80 ${cfg.bg}`}>
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
                                                        <div className="mt-2 rounded-xl border border-zinc-700 bg-zinc-950 p-2 space-y-2">
                                                            <p className="text-[9px] font-black uppercase text-zinc-500 px-2 tracking-widest">Selecciona tus deportes</p>
                                                            <div data-nested-scroll className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto custom-scrollbar">
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

                                            {/* Dropdown Menu — panel opaco; móvil anclado abajo para scroll usable */}
                                            {openDropdown === userProfile.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-[2px] sm:bg-black/50"
                                                        aria-hidden
                                                        onClick={() => setOpenDropdown(null)}
                                                    />
                                                    <div
                                                        role="dialog"
                                                        aria-modal="true"
                                                        aria-labelledby={`role-panel-title-${userProfile.id}`}
                                                        className="fixed z-[110] inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[min(78dvh,520px)] flex flex-col overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-950 shadow-2xl ring-1 ring-black/60 animate-in fade-in slide-in-from-bottom-3 duration-200 sm:absolute sm:inset-x-auto sm:inset-y-auto sm:left-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:w-[min(calc(100vw-2rem),288px)] sm:max-h-[min(70vh,400px)] sm:translate-x-0 sm:translate-y-0 sm:zoom-in-95 sm:slide-in-from-top-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-700 bg-zinc-900 px-3 py-3 sm:py-2.5">
                                                            <p id={`role-panel-title-${userProfile.id}`} className="text-[11px] font-black uppercase tracking-widest text-zinc-300">
                                                                Roles
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenDropdown(null)}
                                                                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white sm:hidden"
                                                                aria-label="Cerrar"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                        <div data-nested-scroll className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain p-2 sm:p-2">
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
                                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border ${isSelected
                                                                                ? 'border-zinc-500 bg-zinc-800/90'
                                                                                : 'border-transparent bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-600'
                                                                                }`}
                                                                        >
                                                                            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-zinc-950 ' + config.bg : 'bg-zinc-950 border border-zinc-700'}`}>
                                                                                <Icon size={14} className={isSelected ? config.color : 'text-zinc-400'} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>{config.label}</span>
                                                                                <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">
                                                                                    {isAthlete && isDeportistaActive && thisUserDiscs.length > 0
                                                                                        ? `${thisUserDiscs.length} deporte${thisUserDiscs.length > 1 ? 's' : ''} asignado${thisUserDiscs.length > 1 ? 's' : ''}`
                                                                                        : config.description}
                                                                                </p>
                                                                            </div>
                                                                            {isSelected && !isAthlete && <Check size={14} className={cn(config.color, 'shrink-0')} />}
                                                                            {isAthlete && <ChevronDown size={14} className={cn('shrink-0', isDeportistaActive ? 'text-emerald-400' : 'text-zinc-500')} />}
                                                                        </button>

                                                                        {/* Multi-sport picker: shows when user is deportista and panel is open */}
                                                                        {isAthlete && selectedDisciplina === userProfile.id && (
                                                                            <div className="mx-0.5 mb-1 rounded-xl border border-zinc-700 bg-zinc-900 p-2 space-y-2">
                                                                                <div className="flex items-center justify-between px-1">
                                                                                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Deportes</p>
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
                                                                                <div data-nested-scroll className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto custom-scrollbar">
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
