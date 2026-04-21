"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MainNavbar } from "@/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { SportIcon } from "@/components/sport-icons";
import { cn } from "@/lib/utils";
import { MapPin, Users } from "lucide-react";
import { SafeBackButton } from "@/shared/components/safe-back-button";
import { MatchRow } from "@/modules/matches/components/matches-today-section";
import { JORNADA_SPORTS } from "@/lib/constants";
import type { PartidoWithRelations } from "@/modules/matches/types";

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
    const [partidos, setPartidos] = useState<PartidoWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterGenero, setFilterGenero] = useState<'masculino' | 'femenino' | null>(null);
    const [filterFase, setFilterFase] = useState<string | null>(null);

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

            const j = (data as any) ?? null;
            setJornada(j);

            if (j) {
                const sportName = (j.disciplinas as any)?.name ?? '';
                const isJornada = JORNADA_SPORTS.includes(sportName);

                // For jornada sports (Ajedrez, Tenis de Mesa), fetch ALL partidos
                // for the discipline regardless of genero.
                let pQuery = supabase
                    .from('partidos')
                    .select(`
                        *,
                        disciplinas(name),
                        carrera_a:carreras!carrera_a_id(nombre, escudo_url),
                        carrera_b:carreras!carrera_b_id(nombre, escudo_url),
                        atleta_a:profiles!athlete_a_id(id, full_name, avatar_url),
                        atleta_b:profiles!athlete_b_id(id, full_name, avatar_url)
                    `)
                    .eq('disciplina_id', j.disciplina_id);

                if (!isJornada) {
                    pQuery = pQuery.eq('genero', j.genero);
                }

                // For non-chess jornada sports, filter partidos by the jornada's date
                // so each jornada only shows its own matches
                if (isJornada && sportName !== 'Ajedrez') {
                    const jornadaDate = j.scheduled_at.split('T')[0];
                    pQuery = pQuery
                        .gte('fecha', `${jornadaDate}T00:00:00`)
                        .lt('fecha', `${jornadaDate}T23:59:59`);
                }

                const { data: pData } = await pQuery
                    .order('genero', { ascending: true })
                    .order('fase', { ascending: true })
                    .order('fecha', { ascending: true });

                setPartidos((pData as any[]) ?? []);
            }

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
    const isAjedrez = sportName === 'Ajedrez';
    const isJornadaSport = JORNADA_SPORTS.includes(sportName);
    const sortedResults = jornada
        ? [...jornada.jornada_resultados].sort((a, b) => a.posicion - b.posicion)
        : [];

    // Logical ordering for fases
    const FASE_ORDER: Record<string, number> = {
        grupos: 0, primera_ronda: 1, dieciseisavos: 2, octavos: 3,
        cuartos: 4, semifinal: 5, tercer_puesto: 6, final: 7,
    };
    const FASE_LABELS: Record<string, string> = {
        grupos: 'Fase de Grupos', primera_ronda: '32avos de Final',
        dieciseisavos: '16avos de Final', octavos: 'Octavos de Final',
        cuartos: 'Cuartos de Final', semifinal: 'Semifinal',
        tercer_puesto: 'Tercer Puesto', final: 'Final',
    };
    const faseOrder = (f: string) => FASE_ORDER[f] ?? (parseInt(f.replace(/\D/g, '')) || 99);
    const faseLabel = (f: string) => FASE_LABELS[f] ?? f;

    // All fases available (for filter pills)
    const allFases = isJornadaSport
        ? [...new Set(partidos.map(p => (p as any).fase ?? 'Ronda 1'))].sort((a, b) => faseOrder(a) - faseOrder(b))
        : [];

    // Apply filters
    const filteredPartidos = partidos.filter(p => {
        if (filterGenero && (p as any).genero !== filterGenero) return false;
        if (filterFase && ((p as any).fase ?? 'Ronda 1') !== filterFase) return false;
        return true;
    });

    // Group matches: for "grupos" fase, sub-group by grupo number; otherwise by fase
    const sections = useMemo(() => {
        if (!isJornadaSport) return [];
        const result: { key: string; label: string; matches: PartidoWithRelations[] }[] = [];

        // Sort fases logically
        const byFase = filteredPartidos.reduce<Record<string, PartidoWithRelations[]>>((acc, p) => {
            const key = (p as any).fase ?? 'Ronda 1';
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});

        const sortedFases = Object.keys(byFase).sort((a, b) => faseOrder(a) - faseOrder(b));

        for (const fase of sortedFases) {
            const matches = byFase[fase];
            if (fase === 'grupos') {
                // Sub-group by grupo number
                const byGrupo = matches.reduce<Record<string, PartidoWithRelations[]>>((acc, p) => {
                    const g = (p as any).grupo ?? '?';
                    if (!acc[g]) acc[g] = [];
                    acc[g].push(p);
                    return acc;
                }, {});
                const sortedGrupos = Object.keys(byGrupo).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
                for (const g of sortedGrupos) {
                    result.push({ key: `grupos-${g}`, label: `Grupo ${g}`, matches: byGrupo[g] });
                }
            } else {
                result.push({ key: fase, label: faseLabel(fase), matches });
            }
        }
        return result;
    }, [filteredPartidos, isJornadaSport]);

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
                        {/* Back button */}
                        <div className="mb-2">
                            <SafeBackButton fallback="/jornadas" variant="ghost" label="Regresar" />
                        </div>

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
                                        {!isJornadaSport && (
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
                                                jornada.genero === 'femenino' ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                            )}>
                                                {jornada.genero}
                                            </span>
                                        )}
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

                        {/* ── JORNADA SPORTS: filtros de fase ── */}
                        {isJornadaSport && (
                            <div className="space-y-3">
                                {/* Gender filter (only for Ajedrez which mixes genders) */}
                                {isAjedrez && (
                                <div className="flex items-center gap-2">
                                    {(['femenino', 'masculino'] as const).map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setFilterGenero(prev => prev === g ? null : g)}
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
                                                filterGenero === g
                                                    ? g === 'femenino'
                                                        ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                                                        : "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                                    : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
                                            )}
                                        >
                                            {g === 'femenino' ? '♀ Femenino' : '♂ Masculino'}
                                        </button>
                                    ))}
                                </div>
                                )}
                                {/* Fase filter */}
                                {allFases.length > 1 && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => setFilterFase(null)}
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
                                                filterFase === null
                                                    ? "bg-white/15 border-white/30 text-white"
                                                    : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
                                            )}
                                        >
                                            Todos
                                        </button>
                                        {allFases.map(fase => (
                                            <button
                                                key={fase}
                                                onClick={() => setFilterFase(prev => prev === fase ? null : fase)}
                                                className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all",
                                                    filterFase === fase
                                                        ? "bg-white/15 border-white/30 text-white"
                                                        : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
                                                )}
                                            >
                                                {faseLabel(fase)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── JORNADA SPORTS: partidos por fase ── */}
                        {isJornadaSport && (
                            partidos.length === 0 ? (
                                <div className="text-center py-16 text-white/20 text-sm">No hay partidos registrados.</div>
                            ) : (
                                <div className="space-y-6">
                                    {sections.map(section => (
                                        <div key={section.key} className="rounded-[2rem] border border-white/8 overflow-hidden bg-black/20 backdrop-blur-xl">
                                            {/* Section header */}
                                            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{section.label}</span>
                                                <span className="text-[9px] font-bold text-white/20">
                                                    {section.matches.filter(p => (p as any).estado === 'finalizado').length}/{section.matches.length} finalizados
                                                </span>
                                            </div>
                                            {/* Match rows */}
                                            <div>
                                                {section.matches.map(p => (
                                                    <MatchRow key={p.id} partido={p} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ── OTHER SPORTS: racing results table ── */}
                        {!isJornadaSport && (
                            <>
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

                                {sortedResults.length > 0 ? (
                                    <div className="rounded-[2rem] border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-xl">
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
                                                    <div className="flex items-center justify-center">
                                                        {medal ? (
                                                            <span className="text-xl leading-none">{medal}</span>
                                                        ) : (
                                                            <span className="text-sm font-black text-white/20 tabular-nums">#{r.posicion}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        {jugadorNombre ? (
                                                            <span className={cn("text-sm font-bold truncate block", isTop3 ? "text-white" : "text-white/60")}>
                                                                {jugadorNombre}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-white/20 italic">—</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {escudoUrl && (
                                                            <img src={escudoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 bg-white/5" />
                                                        )}
                                                        <span className={cn("text-[11px] font-bold uppercase tracking-wider truncate", isTop3 ? "text-white" : "text-white/40")}>
                                                            {carreraNombre}
                                                        </span>
                                                    </div>
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

                                {jornada.estado !== 'finalizado' && sortedResults.length > 0 && (
                                    <div className="flex items-center gap-3 text-white/30 text-sm">
                                        <Users size={16} />
                                        <span>{sortedResults.length} participante{sortedResults.length !== 1 ? 's' : ''} registrado{sortedResults.length !== 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
