"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Check, CircleDot, Loader2, Edit3, Info, Volleyball, X } from "lucide-react";
import { Button, Card } from "@/components/ui-primitives";
import { useAuth } from "@/hooks/useAuth";
import { SafeBackButton } from "@/shared/components/safe-back-button";
import { getCurrentScore } from "@/lib/sport-scoring";
import { RaceControl } from "@/components/race-control";
import { useMatchControl } from "@/modules/admin/matches/hooks/use-match-control";
import { AdminMatchHeader } from "@/modules/admin/matches/components/admin-match-header";
import { AdminScoreboard } from "@/modules/admin/matches/components/admin-scoreboard";
import { AdminEventCreator } from "@/modules/admin/matches/components/admin-event-creator";
import { AdminMatchTimeline } from "@/modules/admin/matches/components/admin-match-timeline";
import { AdminModals } from "@/modules/admin/matches/components/admin-modals";
import { AdminPlayerRoster } from "@/modules/admin/matches/components/admin-player-roster";
import { AjedrezControl } from "@/modules/admin/matches/components/ajedrez-control";
import { ScoreBreakdownEditor } from "@/modules/admin/matches/components/score-breakdown-editor";
import { FutbolEditor } from "@/modules/admin/matches/components/futbol-score-editor";
import { BasquetEditor } from "@/modules/admin/matches/components/basquet-score-editor";
import { TenisEditor } from "@/modules/admin/matches/components/tenis-editor";
import { MatchMetaEditor } from "@/modules/admin/matches/components/match-meta-editor";
import { BasketballBulkStats } from "@/modules/admin/matches/components/basketball-bulk-stats";
import { AdminMvpPicker } from "@/modules/admin/matches/components/admin-mvp-picker";
import { AdminQuickBench } from "@/modules/admin/matches/components/admin-quick-bench";
import { SPORT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getCarreraName, getDisplayName } from "@/lib/sport-helpers";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Evento } from "@/modules/matches/types";

// Local UI Constants
const DISCIPLINES_COLORS: Record<string, string> = {
    'Fútbol': 'from-emerald-500 to-emerald-900',
    'Futsal': 'from-emerald-600 to-emerald-900',
    'Baloncesto': 'from-orange-500 to-orange-800',
    'Voleibol': 'from-red-500 to-red-800',
    'Tenis': 'from-lime-500 to-lime-800',
    'Tenis de Mesa': 'from-rose-500 to-rose-800',
    'Ajedrez': 'from-slate-600 to-zinc-900',
    'Natación': 'from-cyan-500 to-blue-700',
};

const GET_SPORT_ACTIONS = (sport: string) => {
    if (sport === 'Fútbol' || sport === 'Futsal') {
        return [
            { value: 'gol', label: 'GOL', icon: '⚽', style: 'pill-green' },
            { value: 'tarjeta_amarilla', label: 'Amarilla', icon: '🟨', style: 'card-yellow' },
            { value: 'tarjeta_roja', label: 'Roja', icon: '🟥', style: 'card-red' },
            { value: 'cambio', label: 'Cambio', icon: '🔄', style: 'pill-neutral' },
        ];
    }
    if (sport === 'Baloncesto') {
        return [
            { value: 'punto_1', label: '+1', icon: '1️⃣', style: 'circle-orange' },
            { value: 'punto_2', label: '+2', icon: '2️⃣', style: 'circle-orange' },
            { value: 'punto_3', label: '+3', icon: '3️⃣', style: 'circle-orange-fire' },
            { value: 'falta', label: 'Falta', icon: '⛔', style: 'pill-neutral' },
            { value: 'falta_tecnica', label: 'Técnica', icon: '🟨', style: 'card-yellow' },
            { value: 'falta_antideportiva', label: 'Antideportiva', icon: '🟥', style: 'card-red' },
            { value: 'cambio', label: 'Cambio', icon: '🔄', style: 'pill-neutral' },
        ];
    }
    if (sport === 'Voleibol') {
        return [
            { value: 'punto', label: 'Punto', icon: '🏐', style: 'pill-blue' },
            { value: 'tarjeta_amarilla', label: 'Amarilla', icon: '🟨', style: 'card-yellow' },
            { value: 'tarjeta_roja', label: 'Roja', icon: '🟥', style: 'card-red' },
        ];
    }
    if (sport === 'Tenis' || sport === 'Tenis de Mesa') {
        return [
            { value: 'punto', label: 'Punto', icon: '🎾', style: 'pill-lime' },
            { value: 'set', label: 'Set', icon: '🏆', style: 'pill-gold' },
        ];
    }
    if (sport === 'Ajedrez') {
        return [
            { value: 'victoria', label: 'Victoria', icon: '👑', style: 'pill-gold' },
            { value: 'empate', label: 'Empate', icon: '🤝', style: 'pill-neutral' },
        ];
    }
    if (sport === 'Natación') {
        return [
            { value: 'victoria', label: '1er Lugar', icon: '🥇', style: 'pill-gold' },
            { value: 'segundo', label: '2do Lugar', icon: '🥈', style: 'pill-silver' },
            { value: 'tercero', label: '3er Lugar', icon: '🥉', style: 'pill-bronze' },
        ];
    }
    return [{ value: 'punto', label: 'Punto', icon: '➕', style: 'pill-blue' }];
};

/** Solo tarjetas: fair play tras partido finalizado (Fútbol / Voleibol). */
const FAIR_PLAY_CARD_ACTIONS = [
    { value: 'tarjeta_amarilla', label: 'Amarilla', icon: '🟨', style: 'card-yellow' },
    { value: 'tarjeta_roja', label: 'Roja', icon: '🟥', style: 'card-red' },
] as const;

export default function MatchControlPage() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.id as string;
    const { profile } = useAuth();
    
    const {
        match,
        loading,
        errorCtx,
        jugadoresA,
        jugadoresB,
        eventos,
        activeEditors,
        toggleCronometro,
        toggleModoRegistro,
        handleNuevoEvento,
        handleBulkBasketballStats,
        handleManualScoreUpdate,
        handleCambiarPeriodo,
        handleCambiarFaseFutbol,
        handleCambiarSetDirecto,
        confirmarFinalizar,
        finalizarPorWO,
        requestDeleteEvento,
        fetchJugadores,
        fetchMatchDetails
    } = useMatchControl(matchId);

    const [isEndingMatch, setIsEndingMatch] = useState(false);
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [confirmingDeletion, setConfirmingDeletion] = useState<Evento | null>(null);
    const [showFullEditor, setShowFullEditor] = useState(false);
    const [fullEditorTab, setFullEditorTab] = useState<'marcador' | 'eventos' | 'jugadores'>('marcador');
    const [showMetaEditor, setShowMetaEditor] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [eventBenchMode, setEventBenchMode] = useState<'quick' | 'classic'>(() => {
        if (typeof window !== 'undefined') {
            try {
                return sessionStorage.getItem('admin-match-bench-mode') === 'classic' ? 'classic' : 'quick';
            } catch {
                return 'quick';
            }
        }
        return 'quick';
    });

    useEffect(() => {
        try {
            sessionStorage.setItem('admin-match-bench-mode', eventBenchMode);
        } catch {
            /* ignore */
        }
    }, [eventBenchMode]);

    /** Micro-confirmación en los botones rápidos de cancha (+rally, gol, +2/+3) cuando el evento se guarda. */
    const [canchaQuickAck, setCanchaQuickAck] = useState<string | null>(null);
    const canchaAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flashCanchaQuick = useCallback((id: string) => {
        if (canchaAckTimerRef.current) clearTimeout(canchaAckTimerRef.current);
        setCanchaQuickAck(id);
        canchaAckTimerRef.current = setTimeout(() => {
            setCanchaQuickAck(null);
            canchaAckTimerRef.current = null;
        }, 850);
    }, []);

    useEffect(() => {
        return () => {
            if (canchaAckTimerRef.current) clearTimeout(canchaAckTimerRef.current);
        };
    }, []);

    const canchaQuickLock = useRef(false);
    const fireVoleyRally = useCallback(
        async (equipo: "equipo_a" | "equipo_b") => {
            if (canchaQuickLock.current || !profile) return;
            canchaQuickLock.current = true;
            const done = () => {
                setTimeout(() => {
                    canchaQuickLock.current = false;
                }, 250);
            };
            try {
                const ok = await handleNuevoEvento("punto", equipo, null);
                if (ok) flashCanchaQuick(equipo === "equipo_a" ? "rally-a" : "rally-b");
            } catch {
                /* error ya notificado en el handler */
            } finally {
                done();
            }
        },
        [handleNuevoEvento, profile, flashCanchaQuick]
    );
    const fireFutbolGol = useCallback(
        async (equipo: "equipo_a" | "equipo_b") => {
            if (canchaQuickLock.current || !profile) return;
            canchaQuickLock.current = true;
            const done = () => {
                setTimeout(() => {
                    canchaQuickLock.current = false;
                }, 250);
            };
            try {
                const ok = await handleNuevoEvento("gol", equipo, null);
                if (ok) flashCanchaQuick(equipo === "equipo_a" ? "gol-a" : "gol-b");
            } catch {
                /* error ya notificado en el handler */
            } finally {
                done();
            }
        },
        [handleNuevoEvento, profile, flashCanchaQuick]
    );
    const fireBasketPunto = useCallback(
        async (tipo: "punto_2" | "punto_3", equipo: "equipo_a" | "equipo_b") => {
            if (canchaQuickLock.current || !profile) return;
            canchaQuickLock.current = true;
            const done = () => {
                setTimeout(() => {
                    canchaQuickLock.current = false;
                }, 250);
            };
            const tag =
                (equipo === "equipo_a" ? "a" : "b") + (tipo === "punto_2" ? "2" : "3");
            try {
                const ok = await handleNuevoEvento(tipo, equipo, null);
                if (ok) flashCanchaQuick(`bask-${tag}`);
            } catch {
                /* error ya notificado en el handler */
            } finally {
                done();
            }
        },
        [handleNuevoEvento, profile, flashCanchaQuick]
    );

    const handleAddPlayer = async (team: string, data: { nombre: string; numero: string; profile_id: string }) => {
        if (!match) return null;
        try {
            let jId: number | null = null;
            if (data.profile_id) {
                const { data: existing } = await supabase
                    .from('jugadores')
                    .select('id')
                    .eq('profile_id', data.profile_id)
                    .maybeSingle();
                if (existing) jId = existing.id;
            }

            if (!jId) {
                const { data: created, error: cErr } = await supabase
                    .from('jugadores')
                    .insert({
                        nombre: data.nombre,
                        numero: data.numero ? parseInt(data.numero) : null,
                        profile_id: data.profile_id || null,
                        disciplina_id: match.disciplina_id,
                        genero: match.genero,
                        carrera_id: team === 'equipo_a' ? match.carrera_a_id : match.carrera_b_id
                    })
                    .select()
                    .single();
                if (cErr) throw cErr;
                jId = created.id;
            }

            const { error: rErr } = await supabase.from('roster_partido').insert({
                partido_id: parseInt(matchId),
                jugador_id: jId,
                equipo_a_or_b: team
            });
            if (rErr) throw rErr;

            fetchJugadores();
            toast.success("Jugador añadido");
            return jId;
        } catch (error: any) {
            console.error("Error adding player:", error);
            toast.error(`Error: ${error.message}`);
            return null;
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            <p className="text-white/40 font-black uppercase tracking-widest text-xs animate-pulse">Sincronizando...</p>
        </div>
    );
    
    if (errorCtx || !match) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={40} className="text-red-500 mb-6" />
            <h1 className="text-2xl font-black text-white mb-2 uppercase">Error de Conexión</h1>
            <p className="text-slate-500 mb-8">{errorCtx || "No se pudo encontrar el partido."}</p>
            <SafeBackButton fallback="/admin/partidos" variant="admin" label="Volver al Panel" />
        </div>
    );

    const disciplinaName = match.disciplinas?.name || 'Fútbol';
    const isQuickBenchSport = ['Fútbol', 'Futsal', 'Baloncesto', 'Voleibol'].includes(disciplinaName);

    /** Actualiza `jugadores.numero` (vale para próximos partidos de la misma base). */
    const handleUpdateJugadorNumero = async (jugadorId: number, raw: string) => {
        const t = raw.trim();
        let numero: number | null = null;
        if (t !== '') {
            const n = parseInt(t, 10);
            if (Number.isNaN(n) || n < 0 || n > 999) {
                toast.error('Número inválido (0–999 o vacío para sin número)');
                return;
            }
            numero = n;
        }
        const { error } = await supabase.from('jugadores').update({ numero }).eq('id', jugadorId);
        if (error) {
            toast.error(error.message);
            return;
        }
        await fetchJugadores();
        toast.success('Dorsal guardado en la base de jugadores');
    };

    const handleRemovePlayerFromRoster = async (rosterId: number) => {
        const { error } = await supabase.from('roster_partido').delete().eq('id', rosterId);
        if (error) {
            toast.error(error.message);
            return;
        }
        await fetchJugadores();
        toast.success('Jugador quitado del partido');
    };

    const isTeamSport = ['Fútbol', 'Futsal', 'Baloncesto', 'Voleibol'].includes(disciplinaName);
    const isTenisSport = ['Tenis', 'Tenis de Mesa'].includes(disciplinaName);
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);
    const { scoreA, scoreB } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

    /** Vóley + modo cancha: bitácora solo si ya hay al menos un punto atribuido a jugador */
    const showVolleyballQuickTimeline =
        disciplinaName !== 'Voleibol' ||
        eventos.some(
            (e) => e.tipo_evento === 'punto' && e.jugador_id_normalized != null
        );

    const canchaQuickDisabled =
        !profile || match.estado === "cancelado" || match.estado === "finalizado";
    const canchaAccent = SPORT_COLORS[disciplinaName] || "#f97316";
    /** Lado A/B: carrera o delegación (misma lógica que ficha pública) */
    const canchaCarreraA = getCarreraName(match, "a") || getDisplayName(match, "a") || "Lado A";
    const canchaCarreraB = getCarreraName(match, "b") || getDisplayName(match, "b") || "Lado B";
    const isFutbolCancha = disciplinaName === "Fútbol" || disciplinaName === "Futsal";

    return (
        <div className="min-h-screen bg-background pb-24 text-white">
            <AdminMatchHeader
                match={match}
                disciplinaName={disciplinaName}
                bgGradient={bgGradient}
                activeEditors={activeEditors}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between gap-3 py-3 mb-2">
                    <div className="flex items-center gap-3 text-[10px] text-white/30 font-bold flex-wrap">
                        <span>📅 {match.fecha ? new Date(match.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'}</span>
                        <span>📍 {match.lugar || 'Sin lugar'}</span>
                    </div>
                    <button
                        onClick={() => setShowMetaEditor(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all active:scale-95 shrink-0"
                    >
                        <Edit3 size={11} />
                        Editar
                    </button>
                </div>

                {showMetaEditor && (
                    <MatchMetaEditor
                        match={match}
                        profile={profile}
                        onClose={() => setShowMetaEditor(false)}
                        onSaved={fetchMatchDetails}
                    />
                )}

                {(isTeamSport || isTenisSport) && (
                    <div className="flex items-stretch sm:items-center justify-stretch sm:justify-end mb-4 -mt-2">
                        <button
                            type="button"
                            onClick={() => setShowFullEditor(true)}
                            className="flex w-full sm:w-auto items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition-colors text-sm font-black uppercase tracking-wide text-white border-2 border-indigo-300/50 shadow-lg shadow-indigo-900/30 touch-manipulation"
                        >
                            <Edit3 size={18} className="shrink-0" />
                            Edición completa
                        </button>
                    </div>
                )}
                
                {match.marcador_detalle?.tipo === 'carrera' ? (
                    <Card className="p-8 mb-12">
                        <RaceControl
                          matchId={matchId}
                          detalle={match.marcador_detalle}
                          onUpdate={fetchMatchDetails}
                          isLocked={match.estado === 'finalizado'}
                          profile={profile}
                          disciplinaId={match.disciplina_id}
                          genero={match.genero}
                          categoria={(match as any).categoria}
                        />
                    </Card>
                ) : disciplinaName === 'Ajedrez' ? (
                    <Card className="p-8 mb-12">
                        <AjedrezControl
                          matchId={matchId}
                          match={match}
                          onUpdate={fetchMatchDetails}
                          profile={profile}
                        />
                    </Card>
                ) : (
                    <AdminScoreboard
                        match={match}
                        scoreA={scoreA}
                        scoreB={scoreB}
                        onIniciarPartido={(modo) => toggleCronometro(modo)}
                        onToggleModo={toggleModoRegistro}
                        onFinalizar={() => setIsEndingMatch(true)}
                        onCambiarPeriodo={handleCambiarPeriodo}
                        onCambiarSet={(setNum, pA, pB) => handleCambiarSetDirecto(setNum, pA, pB)}
                        onCambiarFaseFutbol={handleCambiarFaseFutbol}
                    />
                )}

                {match.marcador_detalle?.tipo !== 'carrera' &&
                    match.estado !== 'finalizado' &&
                    !(isQuickBenchSport && eventBenchMode === 'quick') && (
                        <AdminPlayerRoster
                            match={match}
                            jugadoresA={jugadoresA}
                            jugadoresB={jugadoresB}
                            matchId={matchId}
                            onPlayersUpdated={fetchJugadores}
                            disciplinaName={disciplinaName}
                            onAddPlayer={handleAddPlayer}
                        />
                    )}

                {match.marcador_detalle?.tipo !== 'carrera' && match.estado === 'finalizado' && (
                    <>
                        <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-center">
                            <AlertCircle size={20} className="shrink-0 text-white/30" />
                            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
                                {disciplinaName === 'Fútbol' || disciplinaName === 'Futsal' || disciplinaName === 'Voleibol'
                                    ? 'Partido finalizado — el marcador está cerrado; abajo podés registrar tarjetas (fair play).'
                                    : 'Partido finalizado — no se pueden registrar eventos desde acá'}
                            </p>
                        </div>
                        <AdminMvpPicker
                            matchId={matchId}
                            disciplinaName={disciplinaName}
                            estado={match.estado}
                            marcador_detalle={match.marcador_detalle}
                            jugadoresA={jugadoresA}
                            jugadoresB={jugadoresB}
                            profile={profile}
                            onSaved={fetchMatchDetails}
                        />
                        {(disciplinaName === 'Fútbol' || disciplinaName === 'Futsal' || disciplinaName === 'Voleibol') && (
                            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 mt-8">
                                <AdminEventCreator
                                    match={match}
                                    actions={[...FAIR_PLAY_CARD_ACTIONS]}
                                    jugadoresA={jugadoresA}
                                    jugadoresB={jugadoresB}
                                    eventos={eventos}
                                    onAddEvent={(data) =>
                                        handleNuevoEvento(data.tipo, data.equipo, data.jugador_id, true)
                                    }
                                    onAddPlayer={handleAddPlayer}
                                    disciplinaName={disciplinaName}
                                />
                                <AdminMatchTimeline
                                    eventos={eventos}
                                    match={match}
                                    onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                    disciplinaName={disciplinaName}
                                />
                            </div>
                        )}
                    </>
                )}

                {match.marcador_detalle?.tipo !== 'carrera' && match.estado !== 'finalizado' && (
                    <>
                        {isQuickBenchSport && disciplinaName === "Voleibol" && !canchaQuickDisabled && (
                            <div className="mt-6 mb-1 w-full max-w-2xl mx-auto">
                                <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mb-2.5 max-w-md mx-auto leading-relaxed">
                                    Tocá el bando — +1 al rally. Con partido aún <span className="text-white/55">programado</span> queda
                                    <span className="text-white/60"> en curso </span>sin tocar <span className="text-cyan-400/90">Iniciar partido</span>.
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                                    <button
                                        type="button"
                                        disabled={canchaQuickDisabled}
                                        onClick={() => void fireVoleyRally("equipo_a")}
                                        aria-label={`+1 al rally, ${canchaCarreraA}`}
                                        className={cn(
                                            "relative flex min-h-[64px] w-full items-stretch justify-start gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none shadow-lg",
                                            canchaQuickAck === "rally-a" &&
                                                "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.32)]"
                                        )}
                                        style={{
                                            borderColor: `${canchaAccent}66`,
                                            background: `linear-gradient(145deg, ${canchaAccent}22, rgba(0,0,0,0.45))`,
                                        }}
                                    >
                                        {canchaQuickAck === "rally-a" && (
                                            <span
                                                className="pointer-events-none absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-emerald-400 text-zinc-950 shadow-md"
                                                aria-hidden
                                            >
                                                <Check className="h-4 w-4" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl border border-white/20 bg-white/5">
                                            <Volleyball className="h-5 w-5" strokeWidth={2.2} style={{ color: canchaAccent }} />
                                        </span>
                                        <span className="min-w-0 flex-1 flex flex-col justify-center pr-1">
                                            <span className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 break-words">
                                                {canchaCarreraA}
                                            </span>
                                            <span className="mt-0.5 text-[9px] font-bold tracking-wide text-white/45">
                                                +1 al rally
                                            </span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={canchaQuickDisabled}
                                        onClick={() => void fireVoleyRally("equipo_b")}
                                        aria-label={`+1 al rally, ${canchaCarreraB}`}
                                        className={cn(
                                            "relative flex min-h-[64px] w-full items-stretch justify-start gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none shadow-lg",
                                            canchaQuickAck === "rally-b" &&
                                                "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.32)]"
                                        )}
                                        style={{
                                            borderColor: `${canchaAccent}66`,
                                            background: `linear-gradient(145deg, ${canchaAccent}22, rgba(0,0,0,0.45))`,
                                        }}
                                    >
                                        {canchaQuickAck === "rally-b" && (
                                            <span
                                                className="pointer-events-none absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-emerald-400 text-zinc-950 shadow-md"
                                                aria-hidden
                                            >
                                                <Check className="h-4 w-4" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl border border-white/20 bg-white/5">
                                            <Volleyball className="h-5 w-5" strokeWidth={2.2} style={{ color: canchaAccent }} />
                                        </span>
                                        <span className="min-w-0 flex-1 flex flex-col justify-center pr-1">
                                            <span className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 break-words">
                                                {canchaCarreraB}
                                            </span>
                                            <span className="mt-0.5 text-[9px] font-bold tracking-wide text-white/45">
                                                +1 al rally
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {isQuickBenchSport && disciplinaName === "Baloncesto" && !canchaQuickDisabled && (
                            <div className="mt-6 mb-1 w-full max-w-2xl mx-auto">
                                <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mb-2.5 max-w-md mx-auto leading-relaxed">
                                    Puntos al marcador (sin jugador en planilla). Con partido <span className="text-white/55">programado</span> pasa a
                                    <span className="text-white/60"> en curso </span>sin tocar <span className="text-amber-400/90">Iniciar partido</span>.
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                                    <div className="flex flex-col gap-2 rounded-2xl border-2 px-3.5 py-3 shadow-lg" style={{ borderColor: `${canchaAccent}66`, background: `linear-gradient(145deg, ${canchaAccent}18, rgba(0,0,0,0.45))` }}>
                                        <span className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 break-words">
                                            {canchaCarreraA}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={canchaQuickDisabled}
                                                onClick={() => void fireBasketPunto("punto_2", "equipo_a")}
                                                aria-label={`+2, ${canchaCarreraA}`}
                                                className={cn(
                                                    "relative flex min-h-[48px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-white/20 bg-white/5 px-3 text-sm font-black text-white transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none",
                                                    canchaQuickAck === "bask-a2" &&
                                                        "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950"
                                                )}
                                            >
                                                {canchaQuickAck === "bask-a2" && (
                                                    <span
                                                        className="pointer-events-none absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-zinc-950"
                                                        aria-hidden
                                                    >
                                                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                                                    </span>
                                                )}
                                                +2
                                            </button>
                                            <button
                                                type="button"
                                                disabled={canchaQuickDisabled}
                                                onClick={() => void fireBasketPunto("punto_3", "equipo_a")}
                                                aria-label={`+3, ${canchaCarreraA}`}
                                                className={cn(
                                                    "relative flex min-h-[48px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-white/20 bg-white/5 px-3 text-sm font-black text-white transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none",
                                                    canchaQuickAck === "bask-a3" &&
                                                        "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950"
                                                )}
                                            >
                                                {canchaQuickAck === "bask-a3" && (
                                                    <span
                                                        className="pointer-events-none absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-zinc-950"
                                                        aria-hidden
                                                    >
                                                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                                                    </span>
                                                )}
                                                +3
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 rounded-2xl border-2 px-3.5 py-3 shadow-lg" style={{ borderColor: `${canchaAccent}66`, background: `linear-gradient(145deg, ${canchaAccent}18, rgba(0,0,0,0.45))` }}>
                                        <span className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 break-words">
                                            {canchaCarreraB}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                disabled={canchaQuickDisabled}
                                                onClick={() => void fireBasketPunto("punto_2", "equipo_b")}
                                                aria-label={`+2, ${canchaCarreraB}`}
                                                className={cn(
                                                    "relative flex min-h-[48px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-white/20 bg-white/5 px-3 text-sm font-black text-white transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none",
                                                    canchaQuickAck === "bask-b2" &&
                                                        "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950"
                                                )}
                                            >
                                                {canchaQuickAck === "bask-b2" && (
                                                    <span
                                                        className="pointer-events-none absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-zinc-950"
                                                        aria-hidden
                                                    >
                                                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                                                    </span>
                                                )}
                                                +2
                                            </button>
                                            <button
                                                type="button"
                                                disabled={canchaQuickDisabled}
                                                onClick={() => void fireBasketPunto("punto_3", "equipo_b")}
                                                aria-label={`+3, ${canchaCarreraB}`}
                                                className={cn(
                                                    "relative flex min-h-[48px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-white/20 bg-white/5 px-3 text-sm font-black text-white transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none",
                                                    canchaQuickAck === "bask-b3" &&
                                                        "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950"
                                                )}
                                            >
                                                {canchaQuickAck === "bask-b3" && (
                                                    <span
                                                        className="pointer-events-none absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-zinc-950"
                                                        aria-hidden
                                                    >
                                                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                                                    </span>
                                                )}
                                                +3
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isQuickBenchSport && isFutbolCancha && !canchaQuickDisabled && (
                            <div className="mt-6 mb-1 w-full max-w-2xl mx-auto">
                                <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mb-2.5 max-w-md mx-auto leading-relaxed">
                                    Gol al marcador (sin jugador). Con partido <span className="text-white/55">programado</span> pasa a
                                    <span className="text-white/60"> en curso </span>sin tocar <span className="text-emerald-400/90">Iniciar partido</span>.
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
                                    <button
                                        type="button"
                                        disabled={canchaQuickDisabled}
                                        onClick={() => void fireFutbolGol("equipo_a")}
                                        aria-label={`Gol, ${canchaCarreraA}`}
                                        className={cn(
                                            "relative flex min-h-[64px] w-full items-stretch justify-start gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none shadow-lg",
                                            canchaQuickAck === "gol-a" &&
                                                "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.32)]"
                                        )}
                                        style={{
                                            borderColor: `${canchaAccent}66`,
                                            background: `linear-gradient(145deg, ${canchaAccent}18, rgba(0,0,0,0.45))`,
                                        }}
                                    >
                                        {canchaQuickAck === "gol-a" && (
                                            <span
                                                className="pointer-events-none absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-emerald-400 text-zinc-950 shadow-md"
                                                aria-hidden
                                            >
                                                <Check className="h-4 w-4" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl border border-white/20 bg-white/5">
                                            <CircleDot className="h-5 w-5" strokeWidth={2.2} style={{ color: canchaAccent }} />
                                        </span>
                                        <span className="min-w-0 flex-1 flex flex-col justify-center pr-1">
                                            <span className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 break-words">
                                                {canchaCarreraA}
                                            </span>
                                            <span className="mt-0.5 text-[9px] font-bold tracking-wide text-white/45">
                                                +1 gol (equipo)
                                            </span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={canchaQuickDisabled}
                                        onClick={() => void fireFutbolGol("equipo_b")}
                                        aria-label={`Gol, ${canchaCarreraB}`}
                                        className={cn(
                                            "relative flex min-h-[64px] w-full items-stretch justify-start gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] touch-manipulation disabled:opacity-40 disabled:pointer-events-none shadow-lg",
                                            canchaQuickAck === "gol-b" &&
                                                "ring-2 ring-emerald-400/85 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_28px_rgba(52,211,153,0.32)]"
                                        )}
                                        style={{
                                            borderColor: `${canchaAccent}66`,
                                            background: `linear-gradient(145deg, ${canchaAccent}18, rgba(0,0,0,0.45))`,
                                        }}
                                    >
                                        {canchaQuickAck === "gol-b" && (
                                            <span
                                                className="pointer-events-none absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-emerald-400 text-zinc-950 shadow-md"
                                                aria-hidden
                                            >
                                                <Check className="h-4 w-4" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-xl border border-white/20 bg-white/5">
                                            <CircleDot className="h-5 w-5" strokeWidth={2.2} style={{ color: canchaAccent }} />
                                        </span>
                                        <span className="min-w-0 flex-1 flex flex-col justify-center pr-1">
                                            <span className="text-sm sm:text-base font-black text-white leading-snug line-clamp-2 break-words">
                                                {canchaCarreraB}
                                            </span>
                                            <span className="mt-0.5 text-[9px] font-bold tracking-wide text-white/45">
                                                +1 gol (equipo)
                                            </span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {isQuickBenchSport && (
                            <div className="mt-8 mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                                    Registrar eventos
                                </p>
                                <div className="flex w-full sm:w-auto rounded-xl border border-white/10 p-0.5 bg-black/40 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setEventBenchMode('quick')}
                                        className={`flex-1 min-h-[44px] rounded-lg px-4 text-[10px] font-black uppercase tracking-wide transition-all touch-manipulation ${
                                            eventBenchMode === 'quick'
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-white/50 hover:text-white/80'
                                        }`}
                                    >
                                        Modo cancha
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEventBenchMode('classic')}
                                        className={`flex-1 min-h-[44px] rounded-lg px-4 text-[10px] font-black uppercase tracking-wide transition-all touch-manipulation ${
                                            eventBenchMode === 'classic'
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-white/50 hover:text-white/80'
                                        }`}
                                    >
                                        Modo clásico
                                    </button>
                                </div>
                            </div>
                        )}
                        {isQuickBenchSport && eventBenchMode === 'quick' ? (
                            <div className="mt-4 -mx-5 flex w-auto max-w-none flex-col gap-8 px-2 sm:-mx-6 sm:px-3 md:mx-0 md:w-full md:max-w-full md:px-0">
                                <AdminQuickBench
                                    match={match}
                                    jugadoresA={jugadoresA}
                                    jugadoresB={jugadoresB}
                                    eventos={eventos}
                                    actions={actions}
                                    disciplinaName={disciplinaName}
                                    onAddEvent={(data) =>
                                        void handleNuevoEvento(data.tipo, data.equipo, data.jugador_id)
                                    }
                                    onAddPlayer={handleAddPlayer}
                                    onUpdatePlayerNumero={handleUpdateJugadorNumero}
                                    onRemovePlayerFromRoster={handleRemovePlayerFromRoster}
                                />
                                {showVolleyballQuickTimeline && (
                                    <div className="w-full border-t border-white/10 pt-8">
                                        <AdminMatchTimeline
                                            eventos={eventos}
                                            match={match}
                                            onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                            disciplinaName={disciplinaName}
                                            layoutStacked
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 mt-4">
                                <AdminEventCreator
                                    match={match}
                                    actions={actions}
                                    jugadoresA={jugadoresA}
                                    jugadoresB={jugadoresB}
                                    eventos={eventos}
                                    onAddEvent={(data) =>
                                        handleNuevoEvento(data.tipo, data.equipo, data.jugador_id)
                                    }
                                    onAddPlayer={handleAddPlayer}
                                    disciplinaName={disciplinaName}
                                />

                                <AdminMatchTimeline
                                    eventos={eventos}
                                    match={match}
                                    onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                    disciplinaName={disciplinaName}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            <AdminModals
                isEndingMatch={isEndingMatch}
                onCloseEnding={() => setIsEndingMatch(false)}
                onConfirmEnding={() => {
                    setIsEndingMatch(false);
                    setShowReview(true);
                }}
                onConfirmWO={async (ganador: 'equipo_a' | 'equipo_b') => {
                    await finalizarPorWO(ganador);
                    setIsEndingMatch(false);
                }}
                isEditingScore={isEditingScore}
                onCloseEditing={() => setIsEditingScore(false)}
                match={match}
                disciplinaName={disciplinaName}
                onManualScoreUpdate={handleManualScoreUpdate}
                confirmingDeletion={confirmingDeletion}
                onCloseDeletion={() => setConfirmingDeletion(null)}
                showReview={showReview}
                onCloseReview={() => setShowReview(false)}
                onConfirmReview={async () => {
                    setShowReview(false);
                    await confirmarFinalizar();
                }}
                eventos={eventos}
                onConfirmDeletion={() => {
                    if (confirmingDeletion) requestDeleteEvento(confirmingDeletion);
                    setConfirmingDeletion(null);
                }}
            />

            {showFullEditor && (() => {
                const tabLabel = disciplinaName === 'Baloncesto' ? 'Cuartos' : (disciplinaName === 'Fútbol' || disciplinaName === 'Futsal') ? 'Tiempos' : 'Sets / Marcador';
                const tabs: { id: 'marcador' | 'eventos' | 'jugadores'; label: string }[] = [
                    { id: 'marcador' as const, label: tabLabel },
                    { id: 'eventos' as const, label: 'Eventos' },
                    { id: 'jugadores' as const, label: 'Jugadores' },
                ];
                const activeTab = fullEditorTab;

                return (
                    <div
                        className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-900 via-zinc-950 to-zinc-950 text-zinc-50"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-600/50 shrink-0 bg-slate-900/95 backdrop-blur-md">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/50 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/30">
                                <Edit3 size={18} className="text-indigo-100" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm font-black uppercase tracking-wide text-white truncate">Edición completa</h2>
                                <p className="text-xs text-slate-300 font-bold uppercase tracking-wide mt-0.5 truncate">{disciplinaName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFullEditor(false)}
                                className="flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-slate-100 text-slate-900 hover:bg-white active:scale-[0.98] transition-all border border-white/30 shrink-0 touch-manipulation font-black text-xs uppercase tracking-wide shadow-md"
                            >
                                <X size={18} />
                                <span className="hidden sm:inline">Cerrar</span>
                            </button>
                        </div>

                        <div className="flex gap-2 px-3 py-2.5 sm:px-4 shrink-0 bg-slate-900/90 border-b border-slate-600/40">
                            {tabs.map(tab => (
                                <button
                                    type="button"
                                    key={tab.id}
                                    onClick={() => setFullEditorTab(tab.id)}
                                    className="flex-1 min-h-[48px] rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-[0.98] border-2 touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
                                    style={activeTab === tab.id
                                        ? { background: '#6366f1', color: '#fff', borderColor: '#818cf8', boxShadow: '0 2px 16px rgba(99,102,241,0.5)' }
                                        : { background: 'rgba(30,41,59,0.85)', color: '#e2e8f0', borderColor: 'rgba(148,163,184,0.45)' }
                                    }
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-24">
                            {activeTab === 'marcador' && (
                                <div className="max-w-lg mx-auto pt-3 space-y-4">
                                    <div className="flex gap-3 rounded-2xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 text-left shadow-inner">
                                        <Info className="shrink-0 text-sky-300 mt-0.5" size={18} aria-hidden />
                                        <div className="min-w-0 text-sm leading-snug text-slate-100">
                                            <p className="font-black text-sky-200 uppercase tracking-wide text-[11px] mb-1">Marcador en esta pantalla</p>
                                            {disciplinaName === 'Voleibol' ? (
                                                <p className="text-slate-200/95">
                                                    En <span className="text-white font-bold">voleibol</span>, editás los <span className="text-white font-bold">puntos por set</span> (rally).
                                                    El motor recalcula los <span className="text-white font-bold">sets ganados</span>: eso es lo que ves en grande en el tablero del admin (no el 18–20 del rally).
                                                    Tras <span className="text-white font-bold">Confirmar marcador</span>, el tablero se sincroniza con la base de datos.
                                                </p>
                                            ) : disciplinaName === 'Baloncesto' ? (
                                                <p className="text-slate-200/95">
                                                    Los <span className="text-white font-bold">+1 / +2 / +3</span> por jugador y la <span className="text-white font-bold">edición manual por cuarto</span> guardan en la base de datos.
                                                    Tras <span className="text-white font-bold">Confirmar marcador</span> (manual), el tablero grande de arriba se actualiza.
                                                </p>
                                            ) : disciplinaName === 'Fútbol' || disciplinaName === 'Futsal' ? (
                                                <p className="text-slate-200/95">
                                                    Los eventos (gol, tarjeta…) y el <span className="text-white font-bold">marcador manual de goles</span> guardan en la base de datos.
                                                    Tras <span className="text-white font-bold">Confirmar marcador</span> (manual), el tablero grande de arriba se actualiza.
                                                </p>
                                            ) : (disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') ? (
                                                <p className="text-slate-200/95">
                                                    Modo rápido o por set. <span className="text-white font-bold">Confirmar marcador</span> guarda y actualiza el tablero principal del admin.
                                                </p>
                                            ) : (
                                                <p className="text-slate-200/95">
                                                    Los cambios guardan en la base de datos. Usá <span className="text-white font-bold">Confirmar marcador</span> cuando aplique para refrescar el tablero de arriba.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {disciplinaName === 'Baloncesto' ? (
                                        <BasquetEditor
                                            match={match}
                                            eventos={eventos}
                                            jugadoresA={jugadoresA}
                                            jugadoresB={jugadoresB}
                                            profile={profile}
                                            onSaved={fetchMatchDetails}
                                            onAddEvent={(tipo, equipo, jugadorId, bypass, overrides) =>
                                                handleNuevoEvento(tipo, equipo, jugadorId, bypass, overrides)
                                            }
                                            onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                            onAddPlayer={handleAddPlayer}
                                        />
                                    ) : disciplinaName === 'Voleibol' ? (
                                        <ScoreBreakdownEditor
                                            match={match}
                                            profile={profile}
                                            onSaved={fetchMatchDetails}
                                        />
                                    ) : disciplinaName === 'Fútbol' || disciplinaName === 'Futsal' ? (
                                        <FutbolEditor
                                            match={match}
                                            eventos={eventos}
                                            jugadoresA={jugadoresA}
                                            jugadoresB={jugadoresB}
                                            profile={profile}
                                            onSaved={fetchMatchDetails}
                                            onAddEvent={(tipo, equipo, jugadorId, bypass, overrides) =>
                                                handleNuevoEvento(tipo, equipo, jugadorId, bypass, overrides)
                                            }
                                            onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                            onAddPlayer={handleAddPlayer}
                                        />
                                    ) : isTenisSport ? (
                                        <TenisEditor
                                            match={match}
                                            profile={profile}
                                            onSaved={fetchMatchDetails}
                                        />
                                    ) : null}
                                </div>
                            )}

                            {activeTab === 'eventos' && (
                                <div className="max-w-7xl mx-auto pt-2">
                                    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
                                        <AdminEventCreator
                                            match={match}
                                            actions={actions}
                                            jugadoresA={jugadoresA}
                                            jugadoresB={jugadoresB}
                                            eventos={eventos}
                                            onAddEvent={(data) => handleNuevoEvento(data.tipo, data.equipo, data.jugador_id, true)}
                                            onAddPlayer={handleAddPlayer}
                                            disciplinaName={disciplinaName}
                                        />
                                        
                                        {disciplinaName === 'Baloncesto' && (
                                            <div className="mt-6">
                                                <BasketballBulkStats
                                                    match={match}
                                                    onSubmit={handleBulkBasketballStats}
                                                    onAddPlayer={handleAddPlayer}
                                                />
                                            </div>
                                        )}

                                        <AdminMatchTimeline
                                            eventos={eventos}
                                            match={match}
                                            onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                            disciplinaName={disciplinaName}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'jugadores' && (
                                <div className="max-w-7xl mx-auto pt-2">
                                    <AdminPlayerRoster
                                        match={match}
                                        jugadoresA={jugadoresA}
                                        jugadoresB={jugadoresB}
                                        matchId={matchId}
                                        onPlayersUpdated={fetchJugadores}
                                        disciplinaName={disciplinaName}
                                        onAddPlayer={handleAddPlayer}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 px-4 py-3 border-t border-slate-600/50 bg-slate-900/95 backdrop-blur-md" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                            <button
                                type="button"
                                onClick={() => setShowFullEditor(false)}
                                className="w-full min-h-[52px] rounded-2xl border-2 border-slate-500/60 bg-slate-100 text-slate-900 hover:bg-white active:scale-[0.99] transition-all flex items-center justify-center gap-2 font-black text-sm uppercase tracking-wide touch-manipulation shadow-md"
                            >
                                <X size={18} />
                                Cerrar editor
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
