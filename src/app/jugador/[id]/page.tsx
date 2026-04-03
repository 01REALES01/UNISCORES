"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MainNavbar } from "@/components/main-navbar";
import { Avatar } from "@/components/ui-primitives";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UniqueLoading from "@/components/ui/morph-loading";
import { ChevronLeft, Lock, Trophy, Calendar, ArrowUpRight, Users } from "lucide-react";
import { SPORT_ACCENT, SPORT_COLORS } from "@/lib/constants";
import { SportIcon } from "@/shared/components/sport-icons";

export default function JugadorPublicPage() {
    const params = useParams();
    const router = useRouter();
    const jugadorId = params.id as string;

    const [jugador, setJugador] = useState<any>(null);
    const [delegacion, setDelegacion] = useState<any>(null);
    const [partidos, setPartidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const { data: j } = await supabase
                .from('jugadores')
                .select('id, nombre, numero, email, profile_id, sexo, genero, carrera:carrera_id(id, nombre, escudo_url), disciplina:disciplina_id(id, name)')
                .eq('id', jugadorId)
                .single();

            if (!j) { setLoading(false); return; }

            // If profile exists, redirect to full profile page
            if (j.profile_id) {
                router.replace(`/perfil/${j.profile_id}`);
                return;
            }

            setJugador(j);

            // Find delegacion (implicit: carrera + disciplina + genero)
            const carreraData = Array.isArray(j.carrera) ? j.carrera[0] : j.carrera;
            const disciplinaData = Array.isArray(j.disciplina) ? j.disciplina[0] : j.disciplina;

            if (carreraData?.id && disciplinaData?.id && j.genero) {
                const { data: del } = await supabase
                    .from('delegaciones')
                    .select('id, nombre, genero')
                    .eq('disciplina_id', disciplinaData.id)
                    .eq('genero', j.genero)
                    .contains('carrera_ids', [carreraData.id])
                    .single();
                if (del) setDelegacion(del);
            }

            // Normalize jugador data to store with proper types
            (j as any).carrera = carreraData;
            (j as any).disciplina = disciplinaData;

            // Match history via roster_partido
            const { data: rp } = await supabase
                .from('roster_partido')
                .select('partido_id, equipo_a_or_b, partido:partidos(id, equipo_a, equipo_b, fecha, estado, disciplinas:disciplina_id(name))')
                .eq('jugador_id', jugadorId)
                .order('partido_id', { ascending: false })
                .limit(5);
            if (rp) setPartidos(rp);

            setLoading(false);
        };

        fetchData();
    }, [jugadorId]);

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <UniqueLoading size="lg" />
        </div>
    );

    if (!jugador) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white gap-4 p-8 text-center">
            <Trophy size={48} className="text-slate-700" />
            <h1 className="text-xl font-bold">Jugador no encontrado</h1>
            <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">← Volver al inicio</Link>
        </div>
    );

    const sportName = (jugador.disciplina as any)?.name || '';
    const sportColor = SPORT_COLORS[sportName] || '#6366f1';
    const sportAccent = SPORT_ACCENT[sportName] || 'text-violet-400';
    const initials = jugador.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
    const generoLabel = jugador.genero === 'femenino' ? 'Femenino' : jugador.genero === 'masculino' ? 'Masculino' : 'Mixto';

    return (
        <div className="min-h-screen bg-background text-white" style={{ backgroundColor: `${sportColor}08` }}>
            <MainNavbar user={null} profile={null} isStaff={false} />

            {/* Ambient glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
                    style={{ backgroundColor: sportColor }} />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-20">
                {/* Back */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-medium mb-8 transition-colors">
                    <ChevronLeft size={16} /> Volver
                </button>

                {/* Profile card */}
                <div className="rounded-3xl bg-white/[0.03] border border-white/10 overflow-hidden mb-6">
                    {/* Top band */}
                    <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${sportColor}30, ${sportColor}10)` }}>
                        <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    </div>

                    <div className="px-6 pb-6">
                        {/* Avatar */}
                        <div className="-mt-12 mb-4 flex items-end gap-4">
                            <div className="w-24 h-24 rounded-2xl border-4 border-background bg-white/10 flex items-center justify-center text-3xl font-black text-white/60 shadow-2xl">
                                {initials}
                            </div>
                            {/* "No activado" badge */}
                            <div className="mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                <Lock size={12} className="text-white/40" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Perfil no activado</span>
                            </div>
                        </div>

                        {/* Name + number */}
                        <div className="mb-4">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-white">{jugador.nombre}</h1>
                                {jugador.numero && (
                                    <span className="px-2 py-0.5 rounded-lg bg-white/10 text-white/60 text-sm font-black">#{jugador.numero}</span>
                                )}
                            </div>
                        </div>

                        {/* Info pills */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {(jugador.carrera as any) && (
                                <Link href={`/carrera/${(jugador.carrera as any).id}`}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                    {(jugador.carrera as any).escudo_url ? (
                                        <img src={(jugador.carrera as any).escudo_url} className="w-4 h-4 rounded-sm object-contain" alt="" />
                                    ) : null}
                                    <span className="text-xs font-bold text-white/70">{(jugador.carrera as any).nombre}</span>
                                    <ArrowUpRight size={12} className="text-white/30" />
                                </Link>
                            )}
                            {sportName && (
                                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10", sportAccent)}>
                                    <SportIcon sport={sportName} size={14} />
                                    <span className="text-xs font-bold">{sportName}</span>
                                </div>
                            )}
                            {jugador.genero && (
                                <div className={cn(
                                    "px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold",
                                    jugador.genero === 'femenino' ? 'text-pink-400' : jugador.genero === 'masculino' ? 'text-blue-400' : 'text-purple-400'
                                )}>
                                    {generoLabel}
                                </div>
                            )}
                            {delegacion && (
                                <Link href={`/equipo/${delegacion.id}`}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-bold text-white/70">
                                    <Users size={12} className="text-white/40" />
                                    {delegacion.nombre}
                                    <ArrowUpRight size={12} className="text-white/30" />
                                </Link>
                            )}
                        </div>

                        {/* CTA — activate profile */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className="text-sm text-white/50 mb-3">
                                ¿Eres <strong className="text-white/80">{jugador.nombre.split(' ')[0]}</strong>? Regístrate con tu correo universitario para activar tu perfil.
                            </p>
                            <Link href="/login"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all"
                                style={{ background: sportColor }}>
                                Activar mi perfil
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Match history */}
                {partidos.length > 0 && (
                    <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
                            <Calendar size={14} /> Partidos
                        </h3>
                        <div className="space-y-2">
                            {partidos.map((rp: any) => {
                                const p = rp.partido;
                                if (!p) return null;
                                return (
                                    <Link key={rp.partido_id} href={`/partido/${rp.partido_id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white/80 truncate">{p.equipo_a} vs {p.equipo_b}</p>
                                            <p className="text-[10px] text-white/30">{new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
                                            p.estado === 'finalizado' ? 'bg-white/10 text-white/40' : 'bg-emerald-500/20 text-emerald-400'
                                        )}>{p.estado === 'finalizado' ? 'Final' : 'En curso'}</span>
                                        <ArrowUpRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
