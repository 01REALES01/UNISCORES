"use client";

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserX, Trophy, Loader2, Bell, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui-primitives';
import { useFriends } from '@/modules/users/hooks/use-friends';
import { FriendButton } from '@/modules/users/components/friend-button';
import { supabase } from '@/lib/supabase';
import type { FriendProfile, Friendship } from '@/modules/users/types';

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
            toast.success('Eliminado de amigos');
        } catch {
            toast.error('No se pudo eliminar');
        } finally {
            setRemoving(false);
            setConfirm(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.05] transition-all"
        >
            <Link href={`/perfil/${friend.friend_id}`} className="relative flex-shrink-0">
                <Avatar
                    name={friend.full_name}
                    src={friend.avatar_url}
                    className="w-12 h-12 rounded-2xl"
                />
            </Link>

            <div className="flex-1 min-w-0">
                <Link
                    href={`/perfil/${friend.friend_id}`}
                    className="text-sm font-black hover:text-red-400 transition-colors truncate block leading-tight"
                >
                    {friend.full_name}
                </Link>
                {friend.tagline && (
                    <p className="text-[10px] text-white/40 font-bold truncate mt-0.5 italic">"{friend.tagline}"</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                    <Trophy size={10} className="text-amber-500 flex-shrink-0" />
                    <span className="text-[10px] font-black text-white/40 tabular-nums">{friend.points ?? 0} pts</span>
                </div>
            </div>

            {/* Acción eliminar */}
            <div className="flex-shrink-0">
                {confirm ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleRemove}
                            disabled={removing}
                            className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                        >
                            {removing ? <Loader2 size={10} className="animate-spin" /> : 'Sí'}
                        </button>
                        <button
                            onClick={() => setConfirm(false)}
                            className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl bg-white/5 text-white/30 border border-white/10 hover:bg-white/10 transition-all"
                        >
                            No
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirm(true)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Eliminar amigo"
                    >
                        <UserX size={14} />
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
    request: Friendship;
    onAccept: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}) {
    const [acting, setActing] = useState<'accept' | 'reject' | null>(null);
    const [requesterProfile, setRequesterProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null);

    useEffect(() => {
        supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', request.requester_id)
            .single()
            .then(({ data }) => {
                if (data) setRequesterProfile(data as { full_name: string; avatar_url?: string });
            });
    }, [request.requester_id]);

    const handleAccept = async () => {
        setActing('accept');
        try { await onAccept(request.id); toast.success('¡Ahora son amigos!'); }
        catch { toast.error('Error al aceptar'); }
        finally { setActing(null); }
    };

    const handleReject = async () => {
        setActing('reject');
        try { await onReject(request.id); toast.success('Solicitud rechazada'); }
        catch { toast.error('Error al rechazar'); }
        finally { setActing(null); }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/20"
        >
            <Link href={`/perfil/${request.requester_id}`} className="flex-shrink-0">
                <Avatar
                    name={requesterProfile?.full_name ?? '?'}
                    src={requesterProfile?.avatar_url}
                    className="w-12 h-12 rounded-2xl"
                />
            </Link>

            <div className="flex-1 min-w-0">
                <Link
                    href={`/perfil/${request.requester_id}`}
                    className="text-sm font-black hover:text-red-400 transition-colors block truncate"
                >
                    {requesterProfile?.full_name ?? 'Usuario'}
                </Link>
                <p className="text-[10px] text-white/40 font-bold mt-0.5">quiere ser tu amigo</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={handleAccept}
                    disabled={!!acting}
                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                >
                    {acting === 'accept' ? <Loader2 size={10} className="animate-spin" /> : 'Aceptar'}
                </button>
                <button
                    onClick={handleReject}
                    disabled={!!acting}
                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl bg-white/5 text-white/30 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all"
                >
                    {acting === 'reject' ? <Loader2 size={10} className="animate-spin" /> : 'Rechazar'}
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
        <section>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-white/5">
                    <Search size={16} className="text-white/60" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] font-outfit">
                    Buscar personas
                </h3>
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Busca por nombre..."
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/[0.05] transition-all"
                />
                {searching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 size={14} className="animate-spin text-white/30" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 space-y-1.5"
                    >
                        {results.map(user => (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                            >
                                <Link href={`/perfil/${user.id}`} className="flex-shrink-0">
                                    <Avatar name={user.full_name} src={user.avatar_url} className="w-10 h-10 rounded-xl" />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/perfil/${user.id}`} className="text-sm font-black hover:text-red-400 transition-colors block truncate">
                                        {user.full_name}
                                    </Link>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Trophy size={9} className="text-amber-500" />
                                        <span className="text-[10px] font-black text-white/30 tabular-nums">{user.points ?? 0} pts</span>
                                    </div>
                                </div>
                                <FriendButton currentUserId={userId} targetId={user.id} />
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {query.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="text-center text-[11px] text-white/20 font-bold mt-4 uppercase tracking-widest">
                    Sin resultados para &quot;{query}&quot;
                </p>
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
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-white/20" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Buscador de usuarios */}
            <UserSearchSection userId={userId} />

            {/* Solicitudes pendientes recibidas */}
            {pendingRequests.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-red-500/10">
                            <Bell size={16} className="text-red-500" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] font-outfit">
                            Solicitudes pendientes
                        </h3>
                        <span className="ml-auto px-2.5 py-1 rounded-full bg-red-500 text-white text-[9px] font-black">
                            {pendingRequests.length}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
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
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-white/5">
                        <Users size={16} className="text-white/60" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] font-outfit">
                        Mis amigos
                    </h3>
                    <span className="ml-auto text-[10px] font-black text-white/30 uppercase tracking-widest">
                        {friends.length} {friends.length === 1 ? 'amigo' : 'amigos'}
                    </span>
                </div>

                {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                            <Users size={32} className="text-white/20" />
                        </div>
                        <p className="text-sm font-black text-white/30 uppercase tracking-widest mb-2">Sin amigos aún</p>
                        <p className="text-[11px] text-white/20 font-bold max-w-xs">
                            Visita el perfil de otros usuarios y agrégalos como amigos.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <AnimatePresence mode="popLayout">
                            {friends.map((f) => (
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
