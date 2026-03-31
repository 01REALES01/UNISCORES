"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Button, Badge } from "@/components/ui-primitives";
import { Plus, Newspaper, Trash2, Edit, Eye, EyeOff, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { useAuditLogger } from "@/hooks/useAuditLogger";

type Noticia = {
    id: string;
    titulo: string;
    contenido: string;
    imagen_url: string | null;
    categoria: string;
    autor_nombre: string;
    partido_id: number | null;
    carrera: string | null;
    published: boolean;
    created_at: string;
};

const CAT_COLORS: Record<string, string> = {
    cronica: 'text-blue-400',
    entrevista: 'text-emerald-400',
    analisis: 'text-purple-400',
    flash: 'text-amber-400',
};

export default function AdminNoticiasPage() {
    const router = useRouter();
    const { logAction } = useAuditLogger();
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchNoticias = async () => {
        const { data } = await safeQuery(
            supabase.from('noticias').select('*').order('created_at', { ascending: false }),
            'admin-noticias'
        );
        if (data) setNoticias(data as Noticia[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchNoticias();

        const handleRevalidate = () => {
            console.log('[AdminNoticias] Global revalidate triggered');
            fetchNoticias();
        };

        window.addEventListener('app:revalidate', handleRevalidate);
        return () => window.removeEventListener('app:revalidate', handleRevalidate);
    }, []);

    const togglePublished = async (id: string, current: boolean) => {
        const noticia = noticias.find(n => n.id === id);
        const { error } = await supabase.from('noticias').update({ published: !current }).eq('id', id);
        if (error) {
            toast.error('Error al cambiar estado');
        } else {
            toast.success(current ? 'Noticia despublicada' : 'Noticia publicada');
            logAction('TOGGLE_PUBLISH', 'noticia', id, {
                titulo: noticia?.titulo,
                published: !current,
            });
            fetchNoticias();
        }
    };

    const deleteNoticia = async (id: string) => {
        if (!confirm('¿Eliminar esta noticia permanentemente?')) return;
        const noticia = noticias.find(n => n.id === id);
        setDeletingId(id);
        const { error } = await supabase.from('noticias').delete().eq('id', id);
        if (error) {
            toast.error('Error al eliminar');
        } else {
            toast.success('Noticia eliminada');
            logAction('DELETE_NEWS', 'noticia', id, {
                titulo: noticia?.titulo,
                categoria: noticia?.categoria,
            });
            fetchNoticias();
        }
        setDeletingId(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <UniqueLoading size="md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Newspaper className="text-red-500" size={24} /> Noticias
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">{noticias.length} artículos</p>
                </div>
                <Button
                    onClick={() => router.push('/admin/noticias/nueva')}
                    className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
                >
                    <Plus size={18} /> Nueva Noticia
                </Button>
            </div>

            {/* List */}
            {noticias.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/[0.02]">
                    <Newspaper size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/30 font-bold">No hay noticias aún</p>
                    <p className="text-white/15 text-sm mt-1">Crea la primera noticia para tu medio deportivo</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {noticias.map(n => (
                        <div
                            key={n.id}
                            className="flex items-center gap-4 bg-white/8/60 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all group"
                        >
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
                                {n.imagen_url ? (
                                    <img src={n.imagen_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Newspaper size={20} className="text-white/10" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", CAT_COLORS[n.categoria] || 'text-white/40')}>
                                        {n.categoria}
                                    </span>
                                    {n.carrera && (
                                        <span className="text-[10px] text-white/20">· {n.carrera}</span>
                                    )}
                                    {!n.published && (
                                        <Badge variant="outline" className="text-[8px] py-0 px-1.5">Borrador</Badge>
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-white/80 truncate">{n.titulo}</h3>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-white/25">
                                    <span>{n.autor_nombre}</span>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5"><Clock size={9} /> {new Date(n.created_at).toLocaleDateString('es-CO')}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => togglePublished(n.id, n.published)}
                                    className={cn("p-2 rounded-lg transition-colors", n.published ? "hover:bg-amber-500/10 text-amber-400/60" : "hover:bg-green-500/10 text-green-400/60")}
                                    title={n.published ? "Despublicar" : "Publicar"}
                                >
                                    {n.published ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button
                                    onClick={() => router.push(`/admin/noticias/${n.id}`)}
                                    className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400/60 transition-colors"
                                    title="Editar"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => deleteNoticia(n.id)}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400/60 transition-colors"
                                    title="Eliminar"
                                    disabled={deletingId === n.id}
                                >
                                    {deletingId === n.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
