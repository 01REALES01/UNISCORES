"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth, type Profile, type UserRole } from "@/hooks/useAuth";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { Card, Badge, Avatar, Button } from "@/components/ui-primitives";
import { Shield, Users, Search, ChevronDown, Check, Crown, UserCheck, User, AlertCircle, Loader2 } from "lucide-react";
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
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
        icon: UserCheck,
        description: 'Puede gestionar partidos',
    },
    public: {
        label: 'Público',
        color: 'text-slate-400',
        bg: 'bg-slate-500/10 border-slate-500/20',
        icon: User,
        description: 'Solo lectura',
    },
};

export default function UsuariosPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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
    }, []);

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

    const updateRole = async (userId: string, newRole: UserRole) => {
        if (userId === currentProfile?.id) {
            alert('No puedes cambiar tu propio rol');
            return;
        }

        setUpdatingId(userId);
        setOpenDropdown(null);

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            alert('Error al actualizar rol: ' + error.message);
        } else {
            await fetchProfiles();
        }

        setUpdatingId(null);
    };

    const filteredProfiles = profiles.filter(p => {
        if (roleFilter !== 'all' && p.role !== roleFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!p.email.toLowerCase().includes(q) && !(p.full_name || '').toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const adminCount = profiles.filter(p => p.role === 'admin').length;
    const dataEntryCount = profiles.filter(p => p.role === 'data_entry').length;
    const publicCount = profiles.filter(p => p.role === 'public').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Administra roles y permisos del equipo
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <Shield size={16} className="text-purple-400" />
                    <span className="text-xs font-bold text-purple-400">Solo Administradores</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-3">
                {[
                    { label: 'Admins', value: adminCount, color: 'text-purple-400', icon: '👑', filter: 'admin' },
                    { label: 'Data Entry', value: dataEntryCount, color: 'text-red-400', icon: '📝', filter: 'data_entry' },
                    { label: 'Públicos', value: publicCount, color: 'text-slate-400', icon: '👤', filter: 'public' },
                ].map(stat => (
                    <button
                        key={stat.label}
                        onClick={() => setRoleFilter(roleFilter === stat.filter ? 'all' : stat.filter)}
                        className={`p-4 rounded-2xl border text-left transition-all ${roleFilter === stat.filter
                            ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/20 bg-muted/10 hover:border-border/40'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{stat.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                        </div>
                        <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <SuggestiveSearch
                value={searchQuery}
                onChange={setSearchQuery}
                suggestions={["Buscar por nombre...", "Buscar por correo...", "Encuentra un admin..."]}
                className="h-11 rounded-xl border-2 border-border/30 bg-muted/10 focus-within:border-primary/50 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all w-full"
            />

            {/* Users List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <UniqueLoading size="lg" />
                </div>
            ) : filteredProfiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="p-6 rounded-3xl bg-muted/10 border-2 border-dashed border-border/30">
                        <Users size={48} className="text-muted-foreground/20" />
                    </div>
                    <p className="font-bold text-lg">No hay usuarios</p>
                    <p className="text-muted-foreground text-sm">{searchQuery ? 'Sin resultados para tu búsqueda' : 'Los usuarios registrados aparecerán aquí'}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredProfiles.map((userProfile) => {
                        const roleInfo = ROLE_CONFIG[userProfile.role];
                        const RoleIcon = roleInfo.icon;
                        const isCurrentUser = userProfile.id === currentProfile?.id;
                        const isUpdating = updatingId === userProfile.id;

                        return (
                            <div
                                key={userProfile.id}
                                className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${isCurrentUser
                                    ? 'border-primary/20 bg-primary/5'
                                    : 'border-border/15 bg-muted/5 hover:bg-muted/10 hover:border-border/30'
                                    }`}
                            >
                                {/* Avatar */}
                                <Avatar name={userProfile.full_name || userProfile.email} size="default" className="ring-2 ring-white/5 shrink-0" />

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-sm truncate">
                                            {userProfile.full_name || 'Sin nombre'}
                                        </span>
                                        {isCurrentUser && (
                                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary tracking-wider shrink-0">
                                                Tú
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{userProfile.email}</p>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                                        Registrado {new Date(userProfile.created_at).toLocaleDateString('es-CO', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>

                                {/* Role Selector */}
                                <div className="relative shrink-0">
                                    {isUpdating ? (
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/30">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="text-xs font-bold text-muted-foreground">Guardando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    if (isCurrentUser) return;
                                                    setOpenDropdown(openDropdown === userProfile.id ? null : userProfile.id);
                                                }}
                                                disabled={isCurrentUser}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${isCurrentUser
                                                    ? 'opacity-60 cursor-not-allowed'
                                                    : 'hover:border-primary/30 hover:bg-muted/20 cursor-pointer'
                                                    } ${roleInfo.bg}`}
                                            >
                                                <RoleIcon size={14} className={roleInfo.color} />
                                                <span className={`text-xs font-bold ${roleInfo.color}`}>{roleInfo.label}</span>
                                                {!isCurrentUser && <ChevronDown size={12} className="text-muted-foreground ml-1" />}
                                            </button>

                                            {/* Dropdown */}
                                            {openDropdown === userProfile.id && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                                                    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border/30 rounded-2xl shadow-2xl shadow-black/30 p-2 animate-in fade-in slide-in-from-top-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pt-2 pb-1.5">Cambiar Rol</p>
                                                        {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                                                            const config = ROLE_CONFIG[role];
                                                            const Icon = config.icon;
                                                            const isSelected = userProfile.role === role;
                                                            return (
                                                                <button
                                                                    key={role}
                                                                    onClick={() => updateRole(userProfile.id, role)}
                                                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${isSelected
                                                                        ? 'bg-primary/10 border border-primary/20'
                                                                        : 'hover:bg-muted/30 border border-transparent'
                                                                        }`}
                                                                >
                                                                    <div className={`p-1.5 rounded-lg ${config.bg}`}>
                                                                        <Icon size={14} className={config.color} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
                                                                        <p className="text-[10px] text-muted-foreground/60">{config.description}</p>
                                                                    </div>
                                                                    {isSelected && <Check size={14} className="text-primary shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
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

            {/* Count */}
            {!loading && filteredProfiles.length > 0 && (
                <p className="text-center text-xs text-muted-foreground/50 pt-4">
                    {filteredProfiles.length} de {profiles.length} usuarios
                </p>
            )}
        </div>
    );
}
