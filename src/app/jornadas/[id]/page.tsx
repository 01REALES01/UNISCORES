"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { SportIcon } from "@/components/sport-icons";
import { cn } from "@/lib/utils";
import { MapPin, Trophy, Users } from "lucide-react";

interface JornadaResultado {
    jugador_id: number | null;
    carrera_id: number;
    posicion: number;
    puntos_olimpicos: number | null;
    notas: string | null;
    jugadores: { nombre: string } | null;
    carreras: { nombre: string; escudo_url: string | null } | null;
}

interface Jornada {
    id: number;
    disciplina_id: number;
    genero: string;
    numero: number;
    nombre: string | null;
    scheduled_at: string;
    lugar: string | null;
    estado: 'programado' | 'en_curso' | 'finalizado';
    disciplinas: { name: string } | null;
    jornada_resultados: JornadaResultado[];
}

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

function estadoBadge(estado: string) {
    if (estado === 'finalizado') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (estado === 'en_curso')   return 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse';
    return 'bg-white/5 text-white/40 border-white/10';
}

function estadoLabel(estado: string) {
    if (estado === 'finalizado') return 'Finalizado';
    if (estado === 'en_curso')   return 'En Curso';
    return 'Programado';
}

export default function JornadaPublicPage() {
    const { id } = useParams<{ id: string }>();
    const { user, profile, isStaff } = useAuth();
    const [jornada, setJornada] = useState<Jornada | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchJornada() {
            const { data } = await supabase
                .from('jornadas')
                .select(`
                    id, disciplina_id, genero, numero, nombre, scheduled_at, lugar, estado,
                    disciplinas(name),
                    jornada_resultados(
                        jugador_id, carrera_id, posicion, puntos_olimpicos, notas,
                        jugadores(nombre),
                        carreras(nombre, escudo_url)
                    )
                `)
                .eq('id', id)
                .single();

            setJornada((data as any) ?? null);
            setLoading(false);
        }

        fetchJornada();

        const channel = supabase
            .channel(`jornada-public-${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jornadas', filter: `id=eq.${id}` }, fetchJornada)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jornada_resultados', filter: `jornada_id=eq.${id}` }, fetchJornada)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id]);

    const sportName = (jornada?.disciplinas as any)?.name ?? '';
    const sortedResults = jornada
        ? [...jornada.jornada_resultados].sort((a, b) => a.posicion - b.posicion)
        : [];

    return (
        <div className="min-h-screen bg-background text-white selection:bg-white/10 font-sans pb-20 relative">
            {/* Background watermark */}
            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-end overflow-hidden opacity-20">
                <img
                    src="/elementos/08.png"
                    alt=""
                    className="w-[800px] h-auto translate-x-[15%] filter contrast-125 brightness-150"
                    aria-hidden="true"
                />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 max-w-3xl mx-auto px-4 pt-10">
                {loading ? (
                    <div className="space-y-4">
                        <div className="h-10 w-64 bg-white/5 animate-pulse rounded-2xl" />
                        <div className="h-6 w-48 bg-white/5 animate-pulse rounded-xl" />
                        <div className="h-96 bg-white/5 animate-pulse rounded-[2rem]" />
                    </div>
                ) : !jornada ? (
                    <div className="text-center py-32 text-white/30 text-lg font-bold">Jornada no encontrada</div>
                ) : (
                    <div className="space-y-8">
                        {/* Header */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <SportIcon sport={sportName} size={20} variant="react" className="text-white/60" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.25em] text-white/40">{sportName}</span>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                        {jornada.nombre ?? `Ronda ${jornada.numero}`}
                                    </h1>
                                    <p className="text-white/40 text-sm mt-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                                            jornada.genero === 'femenino' ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                        )}>
                                            {jornada.genero}
                                        </span>
                                        <span>
                                            {new Date(jornada.scheduled_at).toLocaleString('es-CO', {
                                                weekday: 'long', day: 'numeric', month: 'long',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </span>
                                        {jornada.lugar && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} className="text-white/30" />
                                                {jornada.lugar}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <span className={cn("shrink-0 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border mt-1", estadoBadge(jornada.estado))}>
                                    {estadoLabel(jornada.estado)}
                                </span>
                            </div>
                        </div>

                        {/* Pending banner */}
                        {jornada.estado !== 'finalizado' && (
                            <div className={cn(
                                "rounded-2xl border px-4 py-3 text-sm font-medium flex items-center gap-3",
                                jornada.estado === 'en_curso'
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    : "bg-white/5 border-white/10 text-white/40"
                            )}>
                                {jornada.estado === 'en_curso' ? (
                                    <><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" /> Evento en curso — los resultados se actualizarán al finalizar.</>
                                ) : (
                                    <><div className="w-2 h-2 rounded-full bg-white/20 shrink-0" /> Los resultados estarán disponibles cuando finalice la jornada.</>
                                )}
                            </div>
                        )}

                        {/* Results table */}
                        {sortedResults.length > 0 ? (
                            <div className="rounded-[2rem] border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-xl">
                                {/* Table header */}
                                <div className="grid grid-cols-[48px_1fr_1fr_64px] gap-3 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center">#</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Jugador</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Programa</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center">Pts</span>
                                </div>

                                {sortedResults.map((r, idx) => {
                                    const medal = MEDAL_EMOJIS[r.posicion - 1];
                                    const carreraNombre = (r.carreras as any)?.nombre ?? '—';
                                    const jugadorNombre = (r.jugadores as any)?.nombre ?? null;
                                    const escudoUrl = (r.carreras as any)?.escudo_url ?? null;
                                    const isTop3 = r.posicion <= 3;

                                    return (
                                        <div
                                            key={`${r.carrera_id}-${r.posicion}`}
                                            className={cn(
                                                "grid grid-cols-[48px_1fr_1fr_64px] gap-3 px-5 py-4 border-b border-white/5 last:border-0 items-center transition-colors",
                                                isTop3 ? "bg-white/[0.02]" : ""
                                            )}
                                        >
                                            {/* Position */}
                                            <div className="flex items-center justify-center">
                                                {medal ? (
                                                    <span className="text-xl leading-none">{medal}</span>
                                                ) : (
                                                    <span className="text-sm font-black text-white/20 tabular-nums">#{r.posicion}</span>
                                                )}
                                            </div>

                                            {/* Jugador */}
                                            <div className="min-w-0">
                                                {jugadorNombre ? (
                                                    <span className={cn("text-sm font-bold truncate block", isTop3 ? "text-white" : "text-white/60")}>
                                                        {jugadorNombre}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-white/20 italic">—</span>
                                                )}
                                            </div>

                                            {/* Programa */}
                                            <div className="flex items-center gap-2 min-w-0">
                                                {escudoUrl && (
                                                    <img src={escudoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 bg-white/5" />
                                                )}
                                                <span className={cn("text-[11px] font-bold uppercase tracking-wider truncate", isTop3 ? "text-white" : "text-white/40")}>
                                                    {carreraNombre}
                                                </span>
                                            </div>

                                            {/* Puntos */}
                                            <div className="text-center">
                                                {r.puntos_olimpicos != null ? (
                                                    <span className={cn("text-sm font-black tabular-nums", isTop3 ? "text-emerald-400" : "text-white/30")}>
                                                        {r.puntos_olimpicos}
                                                    </span>
                                                ) : (
                                                    <span className="text-white/10 text-xs">—</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : jornada.estado === 'finalizado' ? (
                            <div className="text-center py-16 text-white/20 text-sm">No hay resultados registrados.</div>
                        ) : null}

                        {/* Participant count if not finalized */}
                        {jornada.estado !== 'finalizado' && sortedResults.length > 0 && (
                            <div className="flex items-center gap-3 text-white/30 text-sm">
                                <Users size={16} />
                                <span>{sortedResults.length} participante{sortedResults.length !== 1 ? 's' : ''} registrado{sortedResults.length !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
