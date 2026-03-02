"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { safeQuery, safeMutation } from "@/lib/supabase-query";
import { Button, Input } from "@/components/ui-primitives";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { value: 'cronica', label: 'Crónica', desc: 'Narrativa de un evento deportivo' },
    { value: 'entrevista', label: 'Entrevista', desc: 'Conversación con un deportista o figura' },
    { value: 'analisis', label: 'Análisis', desc: 'Análisis táctico o estadístico' },
    { value: 'flash', label: 'Flash', desc: 'Noticia breve y concisa' },
];

export default function NuevaNoticiaPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [partidos, setPartidos] = useState<any[]>([]);
    const [carreras, setCarreras] = useState<string[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const [form, setForm] = useState({
        titulo: '',
        contenido: '',
        imagen_url: '',
        categoria: 'cronica',
        autor_nombre: 'Redacción',
        partido_id: '' as string,
        carrera: '' as string,
        published: false,
    });

    useEffect(() => {
        const fetchData = async () => {
            const [partidosRes, carrerasRes] = await Promise.all([
                safeQuery(
                    supabase.from('partidos').select('id, equipo_a, equipo_b, disciplinas(name)').order('fecha', { ascending: false }),
                    'editor-partidos'
                ),
                safeQuery(
                    supabase.from('medallero').select('equipo_nombre').order('equipo_nombre'),
                    'editor-carreras'
                ),
            ]);

            if (partidosRes.data) setPartidos(partidosRes.data);
            if (carrerasRes.data) setCarreras(carrerasRes.data.map((c: any) => c.equipo_nombre).filter(Boolean));
        };
        fetchData();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate
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

        const { data, error } = await supabase.storage
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

        setForm(prev => ({ ...prev, imagen_url: urlData.publicUrl }));
        setPreviewImage(urlData.publicUrl);
        setUploading(false);
        toast.success('Imagen subida');
    };

    const handleSave = async (publish: boolean = false) => {
        if (!form.titulo.trim()) {
            toast.error('El título es obligatorio');
            return;
        }
        if (!form.contenido.trim()) {
            toast.error('El contenido es obligatorio');
            return;
        }

        setSaving(true);

        const payload = {
            titulo: form.titulo.trim(),
            contenido: form.contenido.trim(),
            imagen_url: form.imagen_url || null,
            categoria: form.categoria,
            autor_nombre: form.autor_nombre.trim() || 'Redacción',
            partido_id: form.partido_id ? parseInt(form.partido_id) : null,
            carrera: form.carrera || null,
            published: publish || form.published,
        };

        const { error } = await safeMutation(
            supabase.from('noticias').insert(payload),
            'crear-noticia'
        );

        if (error) {
            toast.error(error.message);
            setSaving(false);
            return;
        }

        toast.success(publish ? '¡Noticia publicada!' : 'Borrador guardado');
        router.push('/admin/noticias');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/noticias')} className="rounded-full">
                        <ArrowLeft size={20} />
                    </Button>
                    <h1 className="text-2xl font-black tracking-tight">Nueva Noticia</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => handleSave(false)} disabled={saving} className="text-white/50">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Borrador
                    </Button>
                    <Button onClick={() => handleSave(true)} disabled={saving} className="bg-gradient-to-r from-red-600 to-red-500 text-white gap-2">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                        Publicar
                    </Button>
                </div>
            </div>

            {/* Image Upload */}
            <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Imagen de Portada</label>
                {previewImage || form.imagen_url ? (
                    <div className="relative h-[250px] rounded-2xl overflow-hidden border border-white/10 group">
                        <img src={previewImage || form.imagen_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <label className="px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-bold cursor-pointer hover:bg-white/30 transition-colors">
                                Cambiar
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                            <button
                                onClick={() => { setPreviewImage(null); setForm(prev => ({ ...prev, imagen_url: '' })); }}
                                className="px-4 py-2 rounded-xl bg-red-500/30 text-white text-sm font-bold hover:bg-red-500/50 transition-colors"
                            >
                                Quitar
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center h-[200px] rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 hover:bg-white/[0.04] transition-all">
                        {uploading ? (
                            <Loader2 size={24} className="animate-spin text-white/30" />
                        ) : (
                            <>
                                <ImageIcon size={32} className="text-white/15 mb-2" />
                                <span className="text-sm font-bold text-white/30">Arrastra o haz clic para subir</span>
                                <span className="text-[10px] text-white/15 mt-1">PNG, JPG hasta 5MB</span>
                            </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                )}
            </div>

            {/* Title */}
            <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Título</label>
                <input
                    value={form.titulo}
                    onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Escribe un título que enganche..."
                    className="w-full text-2xl sm:text-3xl font-black bg-transparent border-none outline-none placeholder:text-white/10 text-white"
                />
            </div>

            {/* Content */}
            <div>
                <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">
                    Contenido <span className="text-white/15 normal-case">(soporta Markdown básico: **negritas**, ## subtítulos)</span>
                </label>
                <textarea
                    value={form.contenido}
                    onChange={(e) => setForm(prev => ({ ...prev, contenido: e.target.value }))}
                    placeholder="Escribe el artículo completo aquí..."
                    rows={15}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-5 text-base leading-relaxed text-white/80 placeholder:text-white/10 focus:outline-none focus:border-white/20 resize-y"
                />
            </div>

            {/* Grid: Category, Author, Partido, Carrera */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Category */}
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Categoría</label>
                    <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setForm(prev => ({ ...prev, categoria: cat.value }))}
                                className={cn(
                                    "p-3 rounded-xl border text-left transition-all",
                                    form.categoria === cat.value
                                        ? "border-red-500/40 bg-red-500/10 text-white"
                                        : "border-white/5 bg-white/[0.02] text-white/40 hover:bg-white/5"
                                )}
                            >
                                <span className="text-sm font-bold block">{cat.label}</span>
                                <span className="text-[10px] text-white/25">{cat.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Author */}
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Autor / Periodista</label>
                    <Input
                        value={form.autor_nombre}
                        onChange={(e) => setForm(prev => ({ ...prev, autor_nombre: e.target.value }))}
                        placeholder="Nombre del autor"
                    />
                </div>

                {/* Linked Partido */}
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Vincular a Partido (opcional)</label>
                    <select
                        value={form.partido_id}
                        onChange={(e) => setForm(prev => ({ ...prev, partido_id: e.target.value }))}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white/70 px-4 py-3 focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
                    >
                        <option value="">Ninguno</option>
                        {partidos.map((p: any) => (
                            <option key={p.id} value={p.id}>
                                {p.disciplinas?.name}: {p.equipo_a} vs {p.equipo_b}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Linked Carrera */}
                <div>
                    <label className="text-xs font-black uppercase tracking-widest text-white/30 block mb-3">Vincular a Carrera (opcional)</label>
                    <select
                        value={form.carrera}
                        onChange={(e) => setForm(prev => ({ ...prev, carrera: e.target.value }))}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl text-sm text-white/70 px-4 py-3 focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
                    >
                        <option value="">Ninguna</option>
                        {carreras.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
