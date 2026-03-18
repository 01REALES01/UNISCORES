"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Trash2, UserPlus, Trophy, Zap, X, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { respondFriendRequest } from "@/services/notification-service";
import { Avatar } from "@/components/ui-primitives";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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

export function NotificationBell() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
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

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

        // Navigate based on type
        if (notif.type === 'match_start' || notif.type === 'match_end' || notif.type === 'score_update') {
            const matchId = notif.metadata?.match_id;
            if (matchId) router.push(`/partido/${matchId}`);
        } else if (notif.type === 'friend_request' || notif.type === 'friend_accepted') {
            const userId = notif.metadata?.sender_id || notif.metadata?.accepter_id;
            if (userId) router.push(`/perfil/${userId}`);
        }

        setIsOpen(false);
    };

    const totalBadge = unreadCount + friendRequests.length;

    return (
        <div className="flex items-center gap-2">
            {/* Test Button */}
            <button
                onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        type: 'match_start',
                        title: '🔴 [TEST] Partido en vivo',
                        body: 'Ingeniería vs Sistemas ha comenzado',
                        metadata: { match_id: 'test', sport: 'Fútbol', teams: 'Ingeniería vs Sistemas' }
                    });
                }}
                className="px-3 py-1.5 hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-500/80 bg-yellow-500/10 hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors rounded-full border border-yellow-500/20 cursor-pointer"
                title="Probar Notificación"
            >
                <Zap size={14} />
                <span>Test</span>
            </button>

            <div className="relative" ref={dropdownRef}>
                {/* Bell Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-full transition-all duration-300",
                    isOpen
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                )}
                aria-label="Notificaciones"
            >
                <Bell size={20} className={cn(totalBadge > 0 && "animate-[wiggle_0.5s_ease-in-out]")} />
                {totalBadge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-in zoom-in duration-300">
                        {totalBadge > 99 ? '99+' : totalBadge}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-3 w-[380px] max-h-[520px] bg-[#0F0D0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">
                            Notificaciones
                        </h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10"
                                >
                                    <CheckCheck size={12} />
                                    Leer todo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Friend Requests Section */}
                    {friendRequests.length > 0 && (
                        <div className="border-b border-white/5">
                            <div className="px-5 py-2.5 flex items-center gap-2">
                                <UserPlus size={12} className="text-blue-400" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
                                    Solicitudes de amistad ({friendRequests.length})
                                </span>
                            </div>
                            <div className="px-3 pb-3 space-y-1">
                                {friendRequests.slice(0, 3).map(req => (
                                    <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/20 transition-all">
                                        <Avatar
                                            name={req.sender?.full_name || 'Usuario'}
                                            src={req.sender?.avatar_url || undefined}
                                            className="w-9 h-9 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-white truncate">
                                                {req.sender?.full_name || 'Usuario'}
                                            </p>
                                            <p className="text-[9px] font-bold text-white/30">quiere ser tu amigo</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleAcceptFriend(req.id)}
                                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                title="Aceptar"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleRejectFriend(req.id)}
                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                                title="Rechazar"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[340px] scrollbar-hide">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-8">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                                    <Bell size={24} className="text-white/10" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                                    Sin notificaciones
                                </p>
                                <p className="text-[9px] font-bold text-white/10 mt-1 max-w-[200px]">
                                    Las alertas de partidos y solicitudes aparecerán aquí
                                </p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-0.5">
                                {notifications.slice(0, 20).map(notif => (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border-l-2",
                                            getNotifAccent(notif.type),
                                            notif.is_read
                                                ? "opacity-50 hover:opacity-80 hover:bg-white/[0.02]"
                                                : "bg-white/[0.03] hover:bg-white/[0.06]"
                                        )}
                                        onClick={() => handleNotifClick(notif)}
                                    >
                                        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                            {getNotifIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-[11px] font-black leading-tight",
                                                    notif.is_read ? "text-white/40" : "text-white"
                                                )}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[9px] font-bold text-white/20 whitespace-nowrap shrink-0">
                                                    {timeAgo(notif.created_at)}
                                                </span>
                                            </div>
                                            {notif.body && (
                                                <p className="text-[10px] font-bold text-white/30 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {notif.body}
                                                </p>
                                            )}
                                        </div>
                                        {/* Unread dot */}
                                        {!notif.is_read && (
                                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
                                        )}
                                        {/* Delete on hover */}
                                        <button
                                            className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notif.id);
                                            }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/5 px-5 py-3">
                        <button
                            onClick={() => {
                                router.push('/notificaciones');
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors py-1"
                        >
                            Ver todas las notificaciones
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
