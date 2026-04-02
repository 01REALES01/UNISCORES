"use client";

import { useState } from 'react';
import { UserPlus, UserCheck, UserX, Clock, Loader2, Check, X } from 'lucide-react';
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

    const baseStyles = "h-12 px-8 rounded-2xl flex items-center gap-3 font-display font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50 active:scale-95 whitespace-nowrap";

    if (isLoading) {
        return (
            <div className={cn("h-12 px-8 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/20 select-none", className)}>
                <Loader2 size={16} className="animate-spin" />
                <span className="font-display font-black text-[10px] uppercase tracking-[0.22em]">Cargando</span>
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
                    baseStyles,
                    "bg-violet-600 text-white shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:bg-violet-500 hover:shadow-[0_8px_30px_rgba(139,92,246,0.4)] hover:-translate-y-0.5",
                    className
                )}
            >
                {acting ? <Loader2 size={16} className="animate-spin text-white" /> : <UserPlus size={16} />}
                AGREGAR AMIGO
            </button>
        );
    }

    if (status === 'pending_sent') {
        return (
            <button
                onClick={() => handle(cancelOrRemove, 'Solicitud cancelada')}
                disabled={acting}
                className={cn(
                    baseStyles,
                    "bg-black/60 border border-white/10 text-white hover:bg-black/80 hover:border-violet-500/40 hover:text-violet-400",
                    className
                )}
            >
                {acting ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} className="text-violet-400" />}
                SOLICITUD ENVIADA
            </button>
        );
    }

    if (status === 'pending_received') {
        return (
            <button
                onClick={() => handle(acceptRequest, '¡Ahora son amigos!')}
                disabled={acting}
                className={cn(
                    baseStyles,
                    "bg-emerald-500 text-black shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:-translate-y-0.5",
                    className
                )}
            >
                {acting ? <Loader2 size={16} className="animate-spin text-black" /> : <UserCheck size={16} />}
                ACEPTAR SOLICITUD
            </button>
        );
    }

    if (status === 'accepted') {
        if (confirmRemove) {
            return (
                <div className={cn("flex items-center p-1 bg-black/60 border border-white/5 rounded-2xl backdrop-blur-xl shadow-2xl", className)}>
                    <div className="px-4 text-[9px] font-display font-black text-white/30 uppercase tracking-[0.1em]">¿ELIMINAR AMIGO?</div>
                    <button
                        onClick={() => handle(cancelOrRemove, 'Eliminado de amigos')}
                        disabled={acting}
                        className="h-10 px-4 rounded-xl bg-rose-600/20 text-rose-400 text-[10px] font-display font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        {acting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} SI
                    </button>
                    <button
                        onClick={() => setConfirmRemove(false)}
                        className="h-10 px-4 rounded-xl text-white/20 hover:text-white transition-all flex items-center justify-center"
                    >
                        <X size={14} />
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={() => setConfirmRemove(true)}
                className={cn(
                    baseStyles,
                    "bg-black/60 border border-white/10 text-white/60 hover:bg-black/80 hover:border-emerald-500/40 hover:text-emerald-400 group",
                    className
                )}
            >
                <UserCheck size={16} className="text-emerald-400 group-hover:hidden" />
                <UserX size={16} className="hidden group-hover:block text-rose-500" />
                <span className="group-hover:hidden">SOCIOS</span>
                <span className="hidden group-hover:inline text-rose-500">FINALIZAR</span>
            </button>
        );
    }

    return null;
}
