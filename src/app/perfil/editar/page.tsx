"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainNavbar } from "@/components/main-navbar";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Save, Loader2, Trophy, Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";

// Allowed colors — gold/yellow excluded intentionally
const NAME_COLORS: { value: string; label: string }[] = [
    { value: '#ffffff', label: 'Blanco' },
    { value: '#f8fafc', label: 'Blanco humo' },
    { value: '#ef4444', label: 'Rojo' },
    { value: '#f97316', label: 'Naranja' },
    { value: '#ec4899', label: 'Rosa' },
    { value: '#d946ef', label: 'Fucsia' },
    { value: '#a855f7', label: 'Violeta' },
    { value: '#6366f1', label: 'Índigo' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#06b6d4', label: 'Cian' },
    { value: '#14b8a6', label: 'Teal' },
    { value: '#22c55e', label: 'Verde' },
    { value: '#84cc16', label: 'Lima' },
];

export default function EditProfilePage() {
    const router = useRouter();
    const { user, profile, isStaff, loading: authLoading, refreshProfile } = useAuth();

    const [carreras, setCarreras] = useState<any[]>([]);
    const [selectedCarreras, setSelectedCarreras] = useState<number[]>([]);
    const [nameColor, setNameColor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        const initData = async () => {
            if (profile) {
                setSelectedCarreras(profile.carreras_ids || []);
                setNameColor(profile.name_color ?? null);
                const { data } = await supabase.from('carreras').select('*').order('nombre');
                if (data) setCarreras(data);
                setFetching(false);
            }
        };
        if (!authLoading && profile) initData();
    }, [profile, authLoading]);

    const toggleCarrera = (id: number) => {
        setSelectedCarreras(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ carreras_ids: selectedCarreras, name_color: nameColor })
                .eq('id', user.id);

            if (error) throw error;
            await refreshProfile();
            toast.success('Perfil guardado');
            router.push('/perfil');
        } catch (error: any) {
            toast.error('Error al guardar: ' + (error?.message || 'Intenta de nuevo'));
            setLoading(false);
        }
    };

    if (authLoading || fetching) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0816]">
            <UniqueLoading size="lg" />
        </div>
    );
    if (!profile) return null;

    const previewColor = nameColor ?? '#ffffff';

    return (
        <div className="min-h-screen bg-[#0a0816] text-white selection:bg-amber-500/30 overflow-x-hidden">
            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-8 pb-24 relative z-10">

                {/* Back button */}
                <div className="mb-10">
                    <button onClick={() => router.back()} className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.2em] font-outfit">
                        <div className="p-2 rounded-full bg-white/5 border border-white/5 group-hover:bg-white group-hover:text-black transition-all flex items-center justify-center">
                            <ChevronLeft size={14} />
                        </div>
                        Regresar
                    </button>
                </div>

                <div className="mb-12 text-center lg:text-left">
                    <h1 className="text-4xl md:text-5xl font-black font-outfit tracking-tight text-white mb-4">
                        Configura tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">Perfil</span>
                    </h1>
                    <p className="text-white/40 text-sm font-bold max-w-lg mx-auto lg:mx-0">
                        Actualiza tu información, cuéntanos sobre ti y elige a qué carreras quieres representar como estudiante o deportista.
                    </p>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-8 max-w-4xl mx-auto w-full">

                    {/* ── Name Color Picker ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="rounded-[2.5rem] bg-[#0A0705] border border-white/5 p-8 shadow-2xl">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6 flex items-center gap-2">
                                <Palette size={14} /> COLOR DE NOMBRE
                            </h3>

                            {/* Live preview */}
                            <div className="mb-6 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                                <span className="text-white/20 text-xs font-bold uppercase tracking-widest">Vista previa</span>
                                <span
                                    className="text-2xl font-black font-outfit leading-tight"
                                    style={{ color: previewColor }}
                                >
                                    {profile.full_name?.split(' ').slice(0, 2).join(' ') || 'Tu Nombre'}
                                </span>
                            </div>

                            {/* Color swatches */}
                            <div className="flex flex-wrap gap-3">
                                {/* Reset to default (white) / no color */}
                                <button
                                    type="button"
                                    onClick={() => setNameColor(null)}
                                    className={cn(
                                        "relative w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center",
                                        nameColor === null
                                            ? "border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                                            : "border-white/20 hover:border-white/50"
                                    )}
                                    style={{ background: '#ffffff' }}
                                    title="Blanco (por defecto)"
                                >
                                    {nameColor === null && <Check size={14} className="text-black" />}
                                </button>

                                {NAME_COLORS.slice(1).map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setNameColor(value)}
                                        className={cn(
                                            "relative w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center",
                                            nameColor === value
                                                ? "border-white scale-110"
                                                : "border-transparent hover:border-white/40"
                                        )}
                                        style={{
                                            background: value,
                                            boxShadow: nameColor === value ? `0 0 12px ${value}80` : undefined,
                                        }}
                                        title={label}
                                    >
                                        {nameColor === value && (
                                            <Check size={14} className="text-black mix-blend-difference" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Career Selection ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-6 w-full"
                    >
                        <div className="rounded-[2.5rem] bg-[#0A0705] border border-white/5 p-8 shadow-2xl flex flex-col">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-8 flex items-center gap-2">
                                <Trophy size={14} /> SELECCIÓN DE CARRERAS
                            </h3>

                            <p className="text-xs font-bold text-white/50 mb-6">
                                Selecciona 1 o más carreras a las que perteneces. Estas aparecerán en tu perfil como tus tarjetas protagonistas.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                {carreras.map((carrera) => {
                                    const isSelected = selectedCarreras.includes(carrera.id);
                                    return (
                                        <button
                                            type="button"
                                            key={carrera.id}
                                            onClick={() => toggleCarrera(carrera.id)}
                                            className={cn(
                                                "relative flex items-center gap-4 p-4 rounded-3xl border transition-all text-left overflow-hidden min-h-[80px]",
                                                isSelected
                                                    ? "bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]"
                                                    : "bg-[#040302] border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors relative z-10",
                                                isSelected ? "bg-black/50 border-red-500/20 shadow-inner" : "bg-white/5 border-white/5"
                                            )}>
                                                {carrera.escudo_url ? (
                                                    <img src={carrera.escudo_url} alt={carrera.nombre} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-white/40 uppercase">{carrera.nombre.substring(0, 2)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col flex-1 relative z-10">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest mb-1 transition-colors",
                                                    isSelected ? "text-red-400" : "text-white/40"
                                                )}>
                                                    Facultad
                                                </span>
                                                <span className={cn(
                                                    "text-sm font-bold leading-tight transition-colors line-clamp-2",
                                                    isSelected ? "text-white" : "text-white/60"
                                                )}>
                                                    {carrera.nombre}
                                                </span>
                                            </div>
                                            <div className={cn(
                                                "absolute bottom-4 right-4 w-3 h-3 rounded-full border transition-all z-10",
                                                isSelected ? "bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-transparent border-white/20"
                                            )} />
                                            {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>

                    {/* Submit Bar */}
                    <div className="mt-4 mb-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || selectedCarreras.length === 0}
                            className={cn(
                                "rounded-[2rem] px-10 py-5 font-black uppercase tracking-[0.2em] text-sm flex items-center gap-3 transition-all",
                                loading || selectedCarreras.length === 0
                                    ? "bg-[#111] text-white/20 border border-white/5 cursor-not-allowed"
                                    : "bg-white text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                            )}
                        >
                            {loading ? (
                                <><Loader2 className="animate-spin" size={20} /> Guardando...</>
                            ) : (
                                <><Save size={20} /> {selectedCarreras.length === 0 ? 'Elige una carrera' : 'Guardar Cambios'}</>
                            )}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}
