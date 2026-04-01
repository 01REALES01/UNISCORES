"use client";

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserX, Trophy, Loader2, Bell, Search, ArrowUpRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Avatar, Badge } from '@/components/ui-primitives';
import { useFriends } from '@/modules/users/hooks/use-friends';
import { FriendButton } from '@/modules/users/components/friend-button';
import { supabase } from '@/lib/supabase';
import type { FriendProfile, Friendship } from '@/modules/users/types';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: tarjeta de amigo
// ─────────────────────────────────────────────────────────────────────────────

function FriendCard({
    friend,
    onRemove,
}: {
    friend: FriendProfile;
    onRemove: (friendshipId: string) => Promise<void>;
}) {
    const [removing, setRemoving] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const handleRemove = async () => {
        setRemoving(true);
        try {
            await onRemove(friend.friendship_id);
            toast.success('Amistad finalizada');
        } catch {
            toast.error('Error al procesar solicitud');
        } finally {
            setRemoving(false);
            setConfirm(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="group flex items-center gap-4 p-5 rounded-[2rem] bg-black/40 border border-white/5 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all relative overflow-hidden"
        >
            <Link href={`/perfil/${friend.friend_id}`} className="relative shrink-0 group-hover:scale-105 transition-transform duration-500">
                <Avatar
                    name={friend.full_name}
                    src={friend.avatar_url}
                    className="w-14 h-14 rounded-2xl border border-white/10 ring-2 ring-transparent group-hover:ring-violet-500/20 transition-all"
                />
            </Link>

            <div className="flex-1 min-w-0">
                <Link
                    href={`/perfil/${friend.friend_id}`}
                    className="text-[14px] font-black font-display text-white hover:text-violet-400 transition-colors truncate block leading-tight tracking-tight"
                >
                    {friend.full_name}
                </Link>
                {friend.tagline && (
                    <p className="text-[9px] text-white/30 font-bold truncate mt-0.5 italic">"{friend.tagline}"</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-white/5 shadow-inner">
                        <Trophy size={10} className="text-violet-400" />
                        <span className="text-[10px] font-mono font-bold text-white/60 tabular-nums">{friend.points ?? 0}</span>
                    </div>
                    <span className="text-[8px] font-display font-black text-white/10 uppercase tracking-widest">PTS ACUMULADOS</span>
                </div>
            </div>

            {/* Acción eliminar */}
            <div className="shrink-0 relative z-10">
                {confirm ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                        <button
                            onClick={handleRemove}
                            disabled={removing}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600 hover:text-white transition-all shadow-lg"
                            title="Confirmar"
                        >
                            {removing ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button
                            onClick={() => setConfirm(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white/20 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                            title="Cancelar"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirm(true)}
                        className="opacity-0 group-hover:opacity-100 w-10 h-10 flex items-center justify-center rounded-xl text-white/10 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent transition-all"
                        title="Eliminar amigo"
                    >
                        <UserX size={16} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: solicitudes pendientes recibidas
// ─────────────────────────────────────────────────────────────────────────────

function PendingRequestCard({
    request,
    onAccept,
    onReject,
}: {
    request: any;
    onAccept: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}) {
    const [acting, setActing] = useState<'accept' | 'reject' | null>(null);
    const requesterProfile = request.sender;

    const handleAccept = async () => {
        setActing('accept');
        try { 
            await onAccept(request.id); 
            toast.success('¡Ahora son amigos!'); 
        }
        catch { 
            toast.error('Error al aceptar'); 
        }
        finally { 
            setActing(null); 
        }
    };

    const handleReject = async () => {
        setActing('reject');
        try { 
            await onReject(request.id); 
            toast.success('Solicitud rechazada'); 
        }
        catch { 
            toast.error('Error al rechazar'); 
        }
        finally { 
            setActing(null); 
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-5 p-5 rounded-[2rem] bg-violet-600/5 border border-violet-500/20 backdrop-blur-md shadow-2xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-2 opacity-10">
                <Bell size={40} className="text-violet-400" />
            </div>

            <Link href={`/perfil/${request.requester_id}`} className="shrink-0 relative z-10 hover:scale-105 transition-transform duration-500">
                <Avatar
                    name={requesterProfile?.full_name ?? '?'}
                    src={requesterProfile?.avatar_url}
                    className="w-14 h-14 rounded-2xl border border-violet-500/30"
                />
            </Link>

            <div className="flex-1 min-w-0 relative z-10">
                <Link
                    href={`/perfil/${request.requester_id}`}
                    className="text-[14px] font-black font-display text-white hover:text-violet-400 transition-colors block truncate tracking-tight"
                >
                    {requesterProfile?.full_name ?? 'Usuario'}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-display font-black text-violet-400/60 uppercase tracking-[0.2em]">Solicitud Entrante</span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 relative z-10">
                <button
                    onClick={handleAccept}
                    disabled={!!acting}
                    className="h-10 px-6 text-[10px] font-display font-black uppercase tracking-[0.2em] rounded-xl bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-violet-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center min-w-[100px]"
                >
                    {acting === 'accept' ? <Loader2 size={14} className="animate-spin" /> : 'ACEPTAR'}
                </button>
                <button
                    onClick={handleReject}
                    disabled={!!acting}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/30 border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                >
                    {acting === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
                </button>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: buscador de usuarios
// ─────────────────────────────────────────────────────────────────────────────

type UserResult = { id: string; full_name: string; avatar_url?: string; points?: number };

function UserSearchSection({ userId }: { userId: string }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) { setResults([]); return; }

        setSearching(true);
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, points')
                .ilike('full_name', `%${q}%`)
                .neq('id', userId)
                .limit(8);
            setResults(data ?? []);
            setSearching(false);
        }, 350);

        return () => { clearTimeout(timer); setSearching(false); };
    }, [query, userId]);

    return (
        <section className="relative">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                        <Search size={18} className="text-white/40" />
                    </div>
                    <h3 className="text-[12px] font-display font-black uppercase tracking-[0.4em] text-white/60">
                        FIND ATHLETES
                    </h3>
                </div>
            </div>

            <div className="relative group">
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="w-full px-6 py-4 rounded-[1.5rem] bg-black/60 border border-white/10 text-[14px] font-display font-black placeholder:text-white/10 focus:outline-none focus:border-violet-500/40 focus:ring-4 focus:ring-violet-500/5 transition-all shadow-2xl"
                />
                {searching && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-violet-400" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mt-4 space-y-2 p-2 bg-black/20 rounded-[2rem] border border-white/5 backdrop-blur-3xl shadow-3xl"
                    >
                        {results.map(user => (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-violet-500/20 transition-all group/result shadow-lg"
                            >
                                <Link href={`/perfil/${user.id}`} className="shrink-0 hover:scale-105 transition-transform duration-500">
                                    <Avatar name={user.full_name} src={user.avatar_url} className="w-12 h-12 rounded-xl border border-white/5" />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/perfil/${user.id}`} className="text-[14px] font-black font-display hover:text-violet-400 transition-colors block truncate tracking-tight text-white">
                                        {user.full_name}
                                    </Link>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/5">
                                          <Trophy size={10} className="text-violet-400" />
                                          <span className="text-[10px] font-mono font-bold text-white/40 tabular-nums">{user.points ?? 0}</span>
                                        </div>
                                    </div>
                                </div>
                                <FriendButton currentUserId={userId} targetId={user.id} />
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {query.trim().length >= 2 && !searching && results.length === 0 && (
                <div className="mt-8 p-10 text-center rounded-[2rem] border border-dashed border-white/5 bg-white/[0.01]">
                    <p className="text-[11px] font-display font-black uppercase text-white/10 tracking-[0.5em]">No results found</p>
                </div>
            )}
        </section>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal: tab completo de amigos
// ─────────────────────────────────────────────────────────────────────────────

interface FriendsListProps {
    userId: string;
}

export function FriendsList({ userId }: FriendsListProps) {
    const {
        friends,
        pendingRequests,
        isLoading,
        removeFriend,
        acceptRequest,
        rejectRequest,
    } = useFriends(userId);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center py-32 space-y-4">
                <Loader2 className="animate-spin text-violet-500" size={40} />
                <p className="text-[10px] font-display font-black text-white/20 uppercase tracking-[0.5em]">Synchronizing Connections</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Buscador de usuarios */}
            <UserSearchSection userId={userId} />

            {/* Solicitudes pendientes recibidas */}
            {pendingRequests.length > 0 && (
                <section className="relative">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center shadow-inner relative">
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-ping" />
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full" />
                           <Bell size={18} className="text-violet-400" />
                        </div>
                        <h3 className="text-[12px] font-display font-black uppercase tracking-[0.4em] text-white/60">
                            PENDING REQUESTS
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {pendingRequests.map((req) => (
                                <PendingRequestCard
                                    key={req.id}
                                    request={req}
                                    onAccept={acceptRequest}
                                    onReject={rejectRequest}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </section>
            )}

            {/* Lista de amigos */}
            <section className="relative">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                            <Users size={18} className="text-white/40" />
                        </div>
                        <h3 className="text-[12px] font-display font-black uppercase tracking-[0.4em] text-white/60">
                            CONNECTIONS
                        </h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-white tabular-nums">{friends.length}</span>
                      <span className="text-[10px] font-display font-black text-white/20 uppercase tracking-widest">Global</span>
                    </div>
                </div>

                {friends.length === 0 ? (
                    <div className="relative overflow-hidden rounded-[3rem] p-12 lg:p-20 text-center bg-black/20 border-2 border-dashed border-white/5 group">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                          <Users size={200} />
                        </div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-inner">
                                <Users size={40} className="text-white/10" />
                            </div>
                            <h4 className="text-xl font-black text-white/40 font-display uppercase tracking-[0.2em] mb-3">No Active Connections</h4>
                            <p className="text-[12px] text-white/20 font-bold max-w-[280px] leading-relaxed mx-auto italic">
                              Start exploring the community to find training partners and build your professional network.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {(friends as any[]).map((f) => (
                                <FriendCard
                                    key={f.friendship_id}
                                    friend={f}
                                    onRemove={removeFriend}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </section>
        </div>
    );
}
