"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, UserPlus, Trophy, Zap, Users, Trash2, CheckCheck, Settings, ChevronLeft, ToggleLeft, ToggleRight, BellOff, Smartphone } from "lucide-react";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Avatar } from "@/components/ui-primitives";
import {
    getPreferences,
    updatePreferences,
    respondFriendRequest,
    type NotificationPreferences,
} from "@/services/notification-service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SPORT_OPTIONS = ["Fútbol", "Baloncesto", "Voleibol", "Tenis de Mesa", "Natación", "Ajedrez", "Tenis"];

type FilterType = 'all' | 'unread' | 'friends' | 'sports';

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "ahora";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getNotifIcon(type: string) {
    switch (type) {
        case 'match_start': return <Zap size={16} className="text-red-500" />;
        case 'match_end': return <Trophy size={16} className="text-amber-500" />;
        case 'score_update': return <Zap size={16} className="text-indigo-400" />;
        case 'friend_request': return <UserPlus size={16} className="text-blue-400" />;
        case 'friend_accepted': return <Users size={16} className="text-emerald-400" />;
        default: return <Bell size={16} className="text-white/40" />;
    }
}

function getNotifAccent(type: string) {
    switch (type) {
        case 'match_start': return 'border-l-red-500';
        case 'match_end': return 'border-l-amber-500';
        case 'score_update': return 'border-l-indigo-500';
        case 'friend_request': return 'border-l-blue-500';
        case 'friend_accepted': return 'border-l-emerald-500';
        default: return 'border-l-white/10';
    }
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className="transition-all duration-200"
            aria-label={enabled ? "Desactivar" : "Activar"}
        >
            {enabled
                ? <ToggleRight size={28} className="text-emerald-500" />
                : <ToggleLeft size={28} className="text-white/20" />
            }
        </button>
    );
}

export default function NotificacionesPage() {
    const router = useRouter();
    const { user, profile, isStaff } = useAuth();
    const {
        notifications,
        unreadCount,
        friendRequests,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshFriendRequests,
    } = useNotifications();

    const { pushState, subscribing, subscribe: subscribePush, unsubscribe: unsubscribePush, isSupported: isPushSupported } = usePushSubscription();
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
    const [loadingPrefs, setLoadingPrefs] = useState(false);
    const [savingPrefs, setSavingPrefs] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        setLoadingPrefs(true);
        getPreferences(user.id).then(p => {
            setPrefs(p);
            setLoadingPrefs(false);
        });
    }, [user?.id]);

    const handlePrefToggle = async (key: keyof Omit<NotificationPreferences, 'id' | 'user_id' | 'followed_sports'>) => {
        if (!prefs || !user?.id) return;
        const updated = { ...prefs, [key]: !prefs[key] };
        setPrefs(updated);
        setSavingPrefs(true);
        await updatePreferences(user.id, { [key]: updated[key] });
        setSavingPrefs(false);
    };

    const handleSportToggle = async (sport: string) => {
        if (!prefs || !user?.id) return;
        const current = prefs.followed_sports || [];
        const updated = current.includes(sport)
            ? current.filter(s => s !== sport)
            : [...current, sport];
        const newPrefs = { ...prefs, followed_sports: updated };
        setPrefs(newPrefs);
        setSavingPrefs(true);
        await updatePreferences(user.id, { followed_sports: updated });
        setSavingPrefs(false);
    };

    const handleAcceptFriend = async (requestId: string) => {
        const success = await respondFriendRequest(requestId, true);
        if (success) {
            toast.success("¡Solicitud aceptada!");
            refreshFriendRequests();
        } else {
            toast.error("Error al aceptar solicitud");
        }
    };

    const handleRejectFriend = async (requestId: string) => {
        const success = await respondFriendRequest(requestId, false);
        if (success) {
            toast("Solicitud rechazada");
            refreshFriendRequests();
        }
    };

    const handleNotifClick = async (notif: typeof notifications[0]) => {
        if (!notif.is_read) await markAsRead(notif.id);
        if (notif.type === 'match_start' || notif.type === 'match_end' || notif.type === 'score_update') {
            const matchId = notif.metadata?.match_id;
            if (matchId) router.push(`/partido/${matchId}`);
        } else if (notif.type === 'friend_request' || notif.type === 'friend_accepted') {
            const userId = notif.metadata?.sender_id || notif.metadata?.accepter_id;
            if (userId) router.push(`/perfil/${userId}`);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'unread') return !n.is_read;
        if (activeFilter === 'friends') return n.type === 'friend_request' || n.type === 'friend_accepted';
        if (activeFilter === 'sports') return n.type === 'match_start' || n.type === 'match_end' || n.type === 'score_update';
        return true;
    });

    const filters: { key: FilterType; label: string; count?: number }[] = [
        { key: 'all', label: 'Todas' },
        { key: 'unread', label: 'No leídas', count: unreadCount },
        { key: 'friends', label: 'Amigos', count: friendRequests.length || undefined },
        { key: 'sports', label: 'Deportes' },
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0a0805] flex items-center justify-center text-white">
                <p className="text-white/40 font-bold">Inicia sesión para ver tus notificaciones.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0805] text-white">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-3xl mx-auto px-4 pt-10 pb-20 relative z-10">
                {/* Back button */}
                <div className="mb-8">
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:bg-indigo-500 group-hover:text-black transition-all">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>
                </div>

                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter">Notificaciones</h1>
                        <p className="text-white/30 text-xs font-bold mt-1 uppercase tracking-widest">
                            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                <CheckCheck size={13} />
                                Leer todo
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'notifications'
                                ? "bg-white/10 text-white shadow-inner"
                                : "text-white/30 hover:text-white/60"
                        )}
                    >
                        <Bell size={14} />
                        Notificaciones
                        {(unreadCount + friendRequests.length) > 0 && (
                            <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1">
                                {unreadCount + friendRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('preferences')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'preferences'
                                ? "bg-white/10 text-white shadow-inner"
                                : "text-white/30 hover:text-white/60"
                        )}
                    >
                        <Settings size={14} />
                        Preferencias
                    </button>
                </div>

                {/* ─── NOTIFICATIONS TAB ─────────────────────────────────── */}
                {activeTab === 'notifications' && (
                    <div className="space-y-4">
                        {/* Friend Requests */}
                        {friendRequests.length > 0 && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-blue-500/10 flex items-center gap-2">
                                    <UserPlus size={13} className="text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                                        Solicitudes de amistad ({friendRequests.length})
                                    </span>
                                </div>
                                <div className="p-3 space-y-2">
                                    {friendRequests.map(req => (
                                        <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                            <Avatar
                                                name={req.sender?.full_name || 'Usuario'}
                                                src={req.sender?.avatar_url || undefined}
                                                className="w-10 h-10 shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-white truncate">{req.sender?.full_name || 'Usuario'}</p>
                                                <p className="text-[10px] font-bold text-white/30">quiere ser tu amigo</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleAcceptFriend(req.id)}
                                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase"
                                                >
                                                    Aceptar
                                                </button>
                                                <button
                                                    onClick={() => handleRejectFriend(req.id)}
                                                    className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase"
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filter Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {filters.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setActiveFilter(f.key)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                        activeFilter === f.key
                                            ? "bg-white/10 text-white border border-white/10"
                                            : "bg-white/[0.02] text-white/30 border border-white/5 hover:bg-white/5 hover:text-white/60"
                                    )}
                                >
                                    {f.label}
                                    {f.count !== undefined && f.count > 0 && (
                                        <span className="min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[8px] font-black rounded-full px-1">
                                            {f.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Notifications List */}
                        <div className="space-y-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4">
                                        <Bell size={28} className="text-white/10" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/20">Sin notificaciones</p>
                                    <p className="text-[10px] font-bold text-white/10 mt-1">
                                        {activeFilter === 'unread' ? 'Todas leídas' : 'Las alertas aparecerán aquí'}
                                    </p>
                                </div>
                            ) : (
                                filteredNotifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "group relative flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border-l-2",
                                            getNotifAccent(notif.type),
                                            notif.is_read
                                                ? "opacity-50 hover:opacity-80 hover:bg-white/[0.02]"
                                                : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/5"
                                        )}
                                        onClick={() => handleNotifClick(notif)}
                                    >
                                        <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                                            {getNotifIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm font-black leading-tight",
                                                    notif.is_read ? "text-white/40" : "text-white"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[10px] font-bold text-white/20 whitespace-nowrap shrink-0">{timeAgo(notif.created_at)}</span>
                                            </div>
                                            {notif.body && (
                                                <p className="text-[11px] font-bold text-white/30 mt-1 leading-relaxed">{notif.body}</p>
                                            )}
                                        </div>
                                        {!notif.is_read && (
                                            <div className="absolute top-4 right-10 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                                        )}
                                        <button
                                            className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ─── PREFERENCES TAB ───────────────────────────────────── */}
                {activeTab === 'preferences' && (
                    <div className="space-y-4">
                        {loadingPrefs ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                            </div>
                        ) : prefs ? (
                            <>
                                {savingPrefs && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 text-center">Guardando...</p>
                                )}

                                {/* Push Notifications */}
                                {isPushSupported && (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                                        <div className="px-5 py-3 border-b border-white/5">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Notificaciones Push</p>
                                        </div>
                                        <div className="p-5">
                                            {pushState === 'granted' ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                            <BellRing size={18} className="text-emerald-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">Push activadas</p>
                                                            <p className="text-[10px] font-bold text-white/30">Recibirás alertas aunque la app esté cerrada</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const ok = await unsubscribePush();
                                                            if (ok) toast("Notificaciones push desactivadas");
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        Desactivar
                                                    </button>
                                                </div>
                                            ) : pushState === 'denied' ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                                        <BellOff size={18} className="text-red-500/50" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white/40">Push bloqueadas</p>
                                                        <p className="text-[10px] font-bold text-white/20">
                                                            Actívalas desde la configuración de tu navegador
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                                            <Smartphone size={18} className="text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">Activar notificaciones push</p>
                                                            <p className="text-[10px] font-bold text-white/30">Recibe alertas de partidos en vivo, goles y más</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            const ok = await subscribePush();
                                                            if (ok) toast.success("¡Notificaciones push activadas!");
                                                            else if (Notification.permission === 'denied') toast.error("Permiso denegado por el navegador");
                                                        }}
                                                        disabled={subscribing}
                                                        className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                                    >
                                                        {subscribing ? 'Activando...' : 'Activar'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Notification Types */}
                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-3 border-b border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Tipos de notificación</p>
                                    </div>
                                    <div className="divide-y divide-white/5">
                                        {[
                                            { key: 'match_start' as const, label: 'Inicio de partido', description: 'Cuando un partido comienza', emoji: '⚽' },
                                            { key: 'match_end' as const, label: 'Fin de partido', description: 'Cuando un partido termina', emoji: '🏁' },
                                            { key: 'score_updates' as const, label: 'Actualización de marcador', description: 'Cambios en el marcador en vivo', emoji: '📊' },
                                            { key: 'friend_requests' as const, label: 'Solicitudes de amistad', description: 'Nuevas solicitudes de conexión', emoji: '👥' },
                                        ].map(item => (
                                            <div key={item.key} className="flex items-center justify-between px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{item.emoji}</span>
                                                    <div>
                                                        <p className="text-sm font-black text-white">{item.label}</p>
                                                        <p className="text-[10px] font-bold text-white/30">{item.description}</p>
                                                    </div>
                                                </div>
                                                <ToggleSwitch
                                                    enabled={prefs[item.key]}
                                                    onChange={() => handlePrefToggle(item.key)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sport Filter */}
                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-3 border-b border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Deportes de interés</p>
                                        <p className="text-[9px] font-bold text-white/20 mt-1">
                                            {prefs.followed_sports.length === 0 ? 'Todos los deportes activos' : `${prefs.followed_sports.length} deporte(s) seleccionado(s)`}
                                        </p>
                                    </div>
                                    <div className="p-4 flex flex-wrap gap-2">
                                        <button
                                            onClick={() => {
                                                if (!user?.id) return;
                                                const newPrefs = { ...prefs, followed_sports: [] };
                                                setPrefs(newPrefs);
                                                setSavingPrefs(true);
                                                updatePreferences(user.id, { followed_sports: [] }).then(() => setSavingPrefs(false));
                                            }}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                                prefs.followed_sports.length === 0
                                                    ? "bg-white/10 text-white border-white/20"
                                                    : "bg-white/[0.02] text-white/30 border-white/5 hover:bg-white/5"
                                            )}
                                        >
                                            Todos
                                        </button>
                                        {SPORT_OPTIONS.map(sport => (
                                            <button
                                                key={sport}
                                                onClick={() => handleSportToggle(sport)}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                                    prefs.followed_sports.includes(sport)
                                                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                                        : "bg-white/[0.02] text-white/30 border-white/5 hover:bg-white/5 hover:text-white/60"
                                                )}
                                            >
                                                {sport}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-white/30 text-sm py-16">No se pudieron cargar las preferencias.</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
