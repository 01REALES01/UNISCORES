"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeQuery, safeMutation, invalidateCache } from "@/lib/supabase-query";
import { Button, Input } from "@/components/ui-primitives";
import { ArrowLeft, Save, Loader2, Image as ImageIcon, Eye, Trash2, Upload, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { MarkdownEditor } from "@/shared/components/markdown-editor";
import { SafeBackButton } from "@/shared/components/safe-back-button";

const CATEGORIES = [
    { value: 'cronica', label: 'Crónica', desc: 'Narrativa de un evento deportivo' },
    { value: 'entrevista', label: 'Entrevista', desc: 'Conversación con un deportista' },
    { value: 'analisis', label: 'Análisis', desc: 'Análisis táctico o estadístico' },
    { value: 'flash', label: 'Flash', desc: 'Noticia breve y concisa' },
    { value: 'instagram', label: 'Instagram', desc: 'Post de Instagram vinculado' },
];

export default function EditNoticiaPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();

    const { logAction } = useAuditLogger();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [partidos, setPartidos] = useState<any[]>([]);
    const [carreras, setCarreras] = useState<string[]>([]);
    const [extraImages, setExtraImages] = useState<string[]>([]);

    const [form, setForm] = useState({
        titulo: '',
        contenido: '',
        imagen_url: '',
        categoria: 'cronica',
        autor_nombre: 'Redacción',
        partido_id: '' as string,
        carrera: '' as string,
        instagram_url: '',
        published: false,
    });

    useEffect(() => {
        const fetchAll = async () => {
            const [noticiaRes, partidosRes, carrerasRes] = await Promise.all([
                safeQuery<any>(supabase.from('noticias').select('*').eq('id', id).single(), 'edit-noticia'),
                safeQuery(supabase.from('partidos').select('id, equipo_a, equipo_b, disciplinas(name)').order('fecha', { ascending: true }), 'edit-partidos'),
                safeQuery(supabase.from('medallero').select('equipo_nombre').order('equipo_nombre'), 'edit-carreras'),
            ]);

            if (noticiaRes.data) {
                const n = noticiaRes.data;
                let cleanContent = n.contenido || '';
                let extras: string[] = [];

                const galleryMatch = cleanContent.match(/<!-- GALLERY:(.*?) -->/);
                if (galleryMatch) {
                    try {
                        extras = JSON.parse(galleryMatch[1]);
                        cleanContent = cleanContent.replace(/<!-- GALLERY:(.*?) -->\n\n?/, '');
                    } catch (e) {
                        console.error("Error parsing gallery metadata:", e);
                    }
                }

                setForm({
                    titulo: n.titulo || '',
                    contenido: cleanContent,
                    imagen_url: n.imagen_url || '',
                    categoria: n.categoria || 'cronica',
                    autor_nombre: n.autor_nombre || 'Redacción',
                    partido_id: n.partido_id ? String(n.partido_id) : '',
                    carrera: n.carrera || '',
                    instagram_url: n.instagram_url || '',
                    published: n.published || false,
                });
                setExtraImages(extras);
            }
            if (partidosRes.data) setPartidos(partidosRes.data);
            if (carrerasRes.data) setCarreras(carrerasRes.data.map((c: any) => c.equipo_nombre).filter(Boolean));
            setLoading(false);
        };
        fetchAll();
    }, [id]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'main' | number = 'main') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen debe ser menor a 5MB');
            return;
        }

        setUploading(true);
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

        const { error } = await supabase.storage
            .from('news-images')
            .upload(fileName, file, { upsert: true });

        if (error) {
            toast.error('Error subiendo imagen: ' + error.message);
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('news-images')
            .getPublicUrl(fileName);

        if (slot === 'main') {
            setForm(prev => ({ ...prev, imagen_url: urlData.publicUrl }));
        } else {
            setExtraImages(prev => {
                const newArr = [...prev];
                newArr[slot] = urlData.publicUrl;
                return newArr;
            });
        }
        
        setUploading(false);
        toast.success('Imagen subida');
    };

    const handleSave = async (publish?: boolean) => {
        if (!form.titulo.trim() || !form.contenido.trim()) {
            toast.error('Título y contenido son obligatorios');
            return;
        }
        setSaving(true);

        let finalContent = form.contenido.trim();
        const validExtras = extraImages.filter(Boolean);
        if (validExtras.length > 0) {
            finalContent = `<!-- GALLERY:${JSON.stringify(validExtras)} -->\n\n${finalContent}`;
        }

        const payload = {
            titulo: form.titulo.trim(),
            contenido: finalContent,
            imagen_url: form.imagen_url || null,
            categoria: form.categoria,
            autor_nombre: form.autor_nombre.trim() || 'Redacción',
            partido_id: form.partido_id ? parseInt(form.partido_id, 10) : null,
            carrera: form.carrera.trim() || null,
            instagram_url: form.instagram_url.trim() || null,
            published: publish !== undefined ? publish : form.published,
            updated_at: new Date().toISOString(),
        };

        const { error } = await safeMutation(
            supabase.from('noticias').update(payload).eq('id', id),
            'update-noticia'
        );
        if (error) { toast.error('Error: ' + error.message); setSaving(false); return; }

        // Invalidar caché para reflejar cambios al volver
        invalidateCache('home-noticias');
        invalidateCache('admin-noticias');

        logAction('UPDATE_NEWS', 'noticia', id, {
            titulo: payload.titulo,
            categoria: payload.categoria,
            published: payload.published,
        });

        toast.success('Noticia actualizada');
        router.push('/admin/noticias');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 size={32} className="animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <SafeBackButton fallback="/admin/noticias" variant="admin" size="sm" label="" />
                    <h1 className="text-2xl font-black tracking-tight">Editar Noticia</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => handleSave()} disabled={saving} className="text-white/50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar
                    </Button>
                    <Button onClick={() => handleSave(!form.published)} disabled={saving} className="bg-gradient-to-r from-red-600 to-red-500 text-white gap-2">
                        {form.published ? 'Despublicar' : 'Publicar'}
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-white/30 block">Galería de Imágenes (Máx 4)</label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {/* Main Image */}
                    <div className="col-span-1 sm:col-span-2">
                        {form.imagen_url ? (
                            <div className="relative h-[250px] rounded-3xl overflow-hidden border border-white/10 group bg-black/40">
                                <img src={form.imagen_url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 backdrop-blur-sm">
                                    <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest cursor-pointer transition-all">
                                        Cambiar Portada
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'main')} />
                                    </label>
                                    <button
                                        onClick={() => setForm(prev => ({ ...prev, imagen_url: '' }))}
                                        className="p-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="absolute top-4 left-4 px-3 py-1 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">Portada</div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center h-[250px] rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group">
                                {uploading ? <Loader2 size={24} className="animate-spin text-violet-500" /> : (
                                    <>
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Upload size={24} className="text-white/20 group-hover:text-violet-500" />
                                        </div>
                                        <span className="text-xs font-black text-white/30 uppercase tracking-widest">Subir Portada</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'main')} />
                            </label>
                        )}
                    </div>

                    {/* Secondary Images (3 slots) */}
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="col-span-1">
                            {extraImages[i] ? (
                                <div className="relative h-[120px] sm:h-[250px] rounded-3xl overflow-hidden border border-white/10 group bg-black/40">
                                    <img src={extraImages[i]} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                        <button
                                            onClick={() => setExtraImages(prev => {
                                                const newArr = [...prev];
                                                newArr[i] = '';
                                                return newArr;
                                            })}
                                            className="p-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/40 transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white/40 text-[9px] font-black uppercase tracking-widest rounded-full border border-white/10">{i + 2}</div>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center h-[120px] sm:h-[250px] rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 transition-all group">
                                    {uploading ? <Loader2 size={18} className="animate-spin text-white/20" /> : (
                                        <>
                                            <Plus size={24} className="text-white/10 group-hover:scale-110 transition-transform" />
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-2">Añadir</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, i)} />
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Title */}
            <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Título</label>
                <input
                    value={form.titulo}
                    onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Título del artículo"
                    className="w-full text-2xl sm:text-3xl font-black bg-transparent border-none outline-none placeholder:text-white/10 text-white"
                />
            </div>

            {/* Content */}
            <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Contenido</label>
                <MarkdownEditor
                    value={form.contenido}
                    onChange={(val) => setForm(prev => ({ ...prev, contenido: val }))}
                    category={form.categoria}
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Categoría</label>
                    <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => (
                            <button key={cat.value} onClick={() => setForm(prev => ({ ...prev, categoria: cat.value }))}
                                className={cn("p-3 rounded-xl border text-left transition-all", form.categoria === cat.value ? "border-red-500/40 bg-red-500/10 text-white" : "border-white/5 bg-white/[0.02] text-white/40 hover:bg-white/5")}>
                                <span className="text-sm font-bold block">{cat.label}</span>
                                <span className="text-[10px] text-white/25">{cat.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Autor</label>
                    <Input value={form.autor_nombre} onChange={(e) => setForm(prev => ({ ...prev, autor_nombre: e.target.value }))} />
                </div>
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Partido</label>
                    <select value={form.partido_id} onChange={(e) => setForm(prev => ({ ...prev, partido_id: e.target.value }))}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white/70 px-4 py-3 focus:outline-none appearance-none cursor-pointer">
                        <option value="">Ninguno</option>
                        {partidos.map((p: any) => <option key={p.id} value={p.id}>{p.disciplinas?.name}: {p.equipo_a} vs {p.equipo_b}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Programa</label>
                    <select value={form.carrera} onChange={(e) => setForm(prev => ({ ...prev, carrera: e.target.value }))}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white/70 px-4 py-3 focus:outline-none appearance-none cursor-pointer">
                        <option value="">Ninguna</option>
                        {carreras.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Instagram URL */}
                <div className="sm:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                        Vincular Post de Instagram
                    </label>
                    <div className={cn(
                        "rounded-2xl p-[1px] transition-all",
                        form.instagram_url ? "bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400" : "bg-transparent"
                    )}>
                        <input
                            value={form.instagram_url}
                            onChange={(e) => setForm(prev => ({ ...prev, instagram_url: e.target.value }))}
                            placeholder="https://www.instagram.com/p/CODIGO_DEL_POST/"
                            className="w-full bg-[#0a0816] border border-white/10 rounded-2xl text-sm text-white/70 px-4 py-3 focus:outline-none focus:border-pink-500/30 transition-all placeholder:text-white/15"
                        />
                    </div>
                    {form.instagram_url && (
                        <p className="mt-2 text-[10px] font-bold text-pink-400/60 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                            Post vinculado correctamente
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
