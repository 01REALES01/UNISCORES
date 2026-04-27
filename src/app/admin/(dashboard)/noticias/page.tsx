"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery, safeMutation, invalidateCache } from "@/lib/supabase-query";
import { Button, Badge } from "@/components/ui-primitives";
import { Plus, Newspaper, Trash2, Edit, Eye, EyeOff, Loader2, Clock, Instagram, X, Send } from "lucide-react";
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
    instagram: 'text-pink-400',
};

export default function AdminNoticiasPage() {
    const router = useRouter();
    const { logAction } = useAuditLogger();
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showIgForm, setShowIgForm] = useState(false);
    const [igUrl, setIgUrl] = useState('');
    const [igCarrera, setIgCarrera] = useState('');
    const [igSaving, setIgSaving] = useState(false);
    const [carreras, setCarreras] = useState<string[]>([]);

    const fetchNoticias = async () => {
        const [noticiasRes, carrerasRes] = await Promise.all([
            safeQuery(
                supabase.from('noticias').select('*').order('created_at', { ascending: false }),
                'admin-noticias'
            ),
            safeQuery(
                supabase.from('medallero').select('equipo_nombre').order('equipo_nombre'),
                'admin-carreras-ig'
            ),
        ]);
        if (noticiasRes.data) setNoticias(noticiasRes.data as Noticia[]);
        if (carrerasRes.data) setCarreras(carrerasRes.data.map((c: any) => c.equipo_nombre).filter(Boolean));
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
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setShowIgForm(!showIgForm)}
                        variant={showIgForm ? "outline" : "default"}
                        className={cn(
                            "gap-2 transition-all",
                            showIgForm
                                ? "border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                                : "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white hover:opacity-90"
                        )}
                    >
                        {showIgForm ? <X size={16} /> : <Instagram size={16} />}
                        {showIgForm ? 'Cancelar' : 'Post de IG'}
                    </Button>
                    <Button
                        onClick={() => router.push('/admin/noticias/nueva')}
                        className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
                    >
                        <Plus size={18} /> Nueva Noticia
                    </Button>
                </div>
            </div>

            {/* Quick Instagram Post Form */}
            {showIgForm && (
                <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-orange-400/5 p-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg">
                            <Instagram size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Publicar Post de Instagram</h3>
                            <p className="text-[10px] text-white/30 font-bold">Pega la URL y se publicará directamente en el feed</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <div className={cn(
                                "rounded-xl p-[1px] transition-all",
                                igUrl ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400" : "bg-transparent"
                            )}>
                                <input
                                    value={igUrl}
                                    onChange={(e) => setIgUrl(e.target.value)}
                                    placeholder="https://www.instagram.com/p/CODIGO..."
                                    className="w-full bg-black/60 border border-white/10 rounded-xl text-sm text-white px-4 py-3 focus:outline-none placeholder:text-white/20"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <select
                            value={igCarrera}
                            onChange={(e) => setIgCarrera(e.target.value)}
                            className="bg-black/60 border border-white/10 rounded-xl text-xs text-white/60 px-4 py-3 focus:outline-none appearance-none cursor-pointer min-w-[160px]"
                        >
                            <option value="">Sin carrera</option>
                            {carreras.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Button
                            disabled={!igUrl.includes('instagram.com') || igSaving}
                            onClick={async () => {
                                if (!igUrl.includes('instagram.com')) {
                                    toast.error('URL de Instagram inválida');
                                    return;
                                }
                                setIgSaving(true);
                                const shortcode = igUrl.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[1] || '';
                                const { error } = await safeMutation(
                                    supabase.from('noticias').insert({
                                        titulo: `Post de Instagram${igCarrera ? ` — ${igCarrera}` : ''}`,
                                        contenido: '',
                                        categoria: 'instagram',
                                        instagram_url: igUrl.trim(),
                                        carrera: igCarrera || null,
                                        autor_nombre: 'Instagram',
                                        published: true,
                                    }),
                                    'crear-ig-post'
                                );
                                if (error) {
                                    toast.error('Error: ' + error.message);
                                } else {
                                    toast.success('¡Post de Instagram publicado!');
                                    invalidateCache('home-noticias');
                                    logAction('CREATE_IG_POST', 'noticia', undefined, { url: igUrl, carrera: igCarrera });
                                    setIgUrl('');
                                    setIgCarrera('');
                                    setShowIgForm(false);
                                    fetchNoticias();
                                }
                                setIgSaving(false);
                            }}
                            className="gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 shrink-0 px-6"
                        >
                            {igSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Publicar
                        </Button>
                    </div>
                </div>
            )}

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
                                {n.categoria === 'instagram' ? (
                                    <div className="w-full h-full bg-gradient-to-br from-pink-900/40 via-purple-900/40 to-orange-900/30 flex items-center justify-center">
                                        <Instagram size={20} className="text-white/30" />
                                    </div>
                                ) : n.imagen_url ? (
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
