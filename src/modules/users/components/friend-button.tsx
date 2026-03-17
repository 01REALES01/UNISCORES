"use client";

import { useState } from 'react';
import { UserPlus, UserCheck, UserX, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFriendRelation } from '@/modules/users/hooks/use-friends';

interface FriendButtonProps {
    currentUserId: string | null | undefined;
    targetId: string;
    className?: string;
}

/**
 * Botón inteligente que muestra la acción correcta según el estado de la relación:
 * - none            → "Agregar amigo"
 * - pending_sent    → "Solicitud enviada" (con opción de cancelar)
 * - pending_received → "Aceptar solicitud"
 * - accepted        → "Amigos" (con opción de eliminar)
 */
export function FriendButton({ currentUserId, targetId, className }: FriendButtonProps) {
    const { relation, isLoading, sendRequest, cancelOrRemove, acceptRequest } = useFriendRelation(currentUserId, targetId);
    const [acting, setActing] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    // No mostrar nada si es el propio perfil o no hay sesión
    if (!currentUserId || currentUserId === targetId) return null;

    const handle = async (action: () => Promise<void>, successMsg: string) => {
        setActing(true);
        setConfirmRemove(false);
        try {
            await action();
            toast.success(successMsg);
        } catch {
            toast.error('No se pudo completar la acción');
        } finally {
            setActing(false);
        }
    };

    if (isLoading) {
        return (
            <div className={cn("px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 text-white/30", className)}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cargando</span>
            </div>
        );
    }

    const { status } = relation;

    if (status === 'none') {
        return (
            <button
                onClick={() => handle(sendRequest, '¡Solicitud enviada!')}
                disabled={acting}
                className={cn(
                    "px-6 py-3 rounded-2xl bg-red-500 text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-red-400 transition-all disabled:opacity-50 shadow-[0_8px_30px_rgba(239,68,68,0.3)]",
                    className
                )}
            >
                {acting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Agregar amigo
            </button>
        );
    }

    if (status === 'pending_sent') {
        return (
            <button
                onClick={() => handle(cancelOrRemove, 'Solicitud cancelada')}
                disabled={acting}
                className={cn(
                    "px-6 py-3 rounded-2xl bg-white/5 border border-white/20 text-white/60 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all disabled:opacity-50",
                    className
                )}
            >
                {acting ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                Solicitud enviada
            </button>
        );
    }

    if (status === 'pending_received') {
        return (
            <button
                onClick={() => handle(acceptRequest, '¡Ahora son amigos!')}
                disabled={acting}
                className={cn(
                    "px-6 py-3 rounded-2xl bg-green-500 text-black flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-green-400 transition-all disabled:opacity-50 shadow-[0_8px_30px_rgba(34,197,94,0.3)]",
                    className
                )}
            >
                {acting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                Aceptar solicitud
            </button>
        );
    }

    if (status === 'accepted') {
        if (confirmRemove) {
            return (
                <div className={cn("flex items-center gap-2", className)}>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">¿Eliminar amigo?</span>
                    <button
                        onClick={() => handle(cancelOrRemove, 'Eliminado de amigos')}
                        disabled={acting}
                        className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all"
                    >
                        {acting ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar'}
                    </button>
                    <button
                        onClick={() => setConfirmRemove(false)}
                        className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={() => setConfirmRemove(true)}
                className={cn(
                    "px-6 py-3 rounded-2xl bg-white/5 border border-white/20 text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:border-red-500/40 hover:text-red-400 transition-all group",
                    className
                )}
            >
                <UserCheck size={16} className="text-green-400 group-hover:hidden" />
                <UserX size={16} className="hidden group-hover:block text-red-400" />
                <span className="group-hover:hidden">Amigos</span>
                <span className="hidden group-hover:inline">Eliminar</span>
            </button>
        );
    }

    return null;
}
