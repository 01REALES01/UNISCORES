"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2, Edit3 } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { Button, Card } from "@/components/ui-primitives";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentScore } from "@/lib/sport-scoring";
import { RaceControl } from "@/components/race-control";
import { useMatchControl } from "@/modules/admin/matches/hooks/use-match-control";
import { AdminMatchHeader } from "@/modules/admin/matches/components/admin-match-header";
import { AdminScoreboard } from "@/modules/admin/matches/components/admin-scoreboard";
import { AdminEventCreator } from "@/modules/admin/matches/components/admin-event-creator";
import { AdminMatchTimeline } from "@/modules/admin/matches/components/admin-match-timeline";
import { AdminModals } from "@/modules/admin/matches/components/admin-modals";
import { AdminPlayerRoster } from "@/modules/admin/matches/components/admin-player-roster";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { EditMatchModal } from "@/modules/matches/components/edit-match-modal";
import type { Evento } from "@/modules/matches/types";

// Local UI Constants (could be moved to a constants file if reused)
const DISCIPLINES_COLORS: Record<string, string> = {
    'Fútbol': 'from-emerald-500 to-emerald-900',
    'Baloncesto': 'from-orange-500 to-orange-800',
    'Voleibol': 'from-red-500 to-red-800',
    'Tenis': 'from-lime-500 to-lime-800',
    'Tenis de Mesa': 'from-rose-500 to-rose-800',
    'Ajedrez': 'from-slate-600 to-zinc-900',
    'Natación': 'from-cyan-500 to-blue-700',
};

const GET_SPORT_ACTIONS = (sport: string) => {
    if (sport === 'Fútbol') {
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
            { value: 'cambio', label: 'Cambio', icon: '🔄', style: 'pill-neutral' },
        ];
    }
    if (sport === 'Voleibol') {
        return [{ value: 'punto', label: 'Punto', icon: '🏐', style: 'pill-blue' }];
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
        cronometroActivo,
        activeEditors,
        toggleCronometro,
        handleNuevoEvento,
        handleManualScoreUpdate,
        handleCambiarPeriodo,
        handleCambiarSetDirecto,
        confirmarFinalizar,
        finalizarPorWO,
        requestDeleteEvento,
        fetchJugadores,
        fetchMatchDetails
    } = useMatchControl(matchId);

    const [isEndingMatch, setIsEndingMatch] = useState(false);
    const [confirmingDeletion, setConfirmingDeletion] = useState<Evento | null>(null);
    const [showAsyncReview, setShowAsyncReview] = useState(false);
    const [asyncScore, setAsyncScore] = useState({ scoreA: 0, scoreB: 0, yellowA: 0, yellowB: 0, redA: 0, redB: 0 });

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
            <Button onClick={() => router.back()}>Volver</Button>
        </div>
    );

    const disciplinaName = match.disciplinas?.name || 'Fútbol';
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);
    const { scoreA, scoreB } = getCurrentScore(disciplinaName, match.marcador_detalle || {});
    const isAsync = match.marcador_detalle?.modo_registro === 'asincronico';

    const handleFinalizarClick = () => {
        if (isAsync) {
            // Pre-populate from live events + marcador_detalle
            const liveGoalsA = eventos.filter(e => (e as any).equipo === 'equipo_a' && ['gol', 'anotacion', 'punto', 'punto_1', 'punto_2', 'punto_3'].includes((e as any).tipo_evento)).length;
            const liveGoalsB = eventos.filter(e => (e as any).equipo === 'equipo_b' && ['gol', 'anotacion', 'punto', 'punto_1', 'punto_2', 'punto_3'].includes((e as any).tipo_evento)).length;
            const liveYellowA = eventos.filter(e => (e as any).equipo === 'equipo_a' && (e as any).tipo_evento === 'tarjeta_amarilla').length;
            const liveYellowB = eventos.filter(e => (e as any).equipo === 'equipo_b' && (e as any).tipo_evento === 'tarjeta_amarilla').length;
            const liveRedA = eventos.filter(e => (e as any).equipo === 'equipo_a' && (e as any).tipo_evento === 'tarjeta_roja').length;
            const liveRedB = eventos.filter(e => (e as any).equipo === 'equipo_b' && (e as any).tipo_evento === 'tarjeta_roja').length;

            // Use the higher of marcador_detalle score vs event count
            const mdScoreA = match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0;
            const mdScoreB = match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0;

            setAsyncScore({
                scoreA: Math.max(mdScoreA, liveGoalsA),
                scoreB: Math.max(mdScoreB, liveGoalsB),
                yellowA: liveYellowA,
                yellowB: liveYellowB,
                redA: liveRedA,
                redB: liveRedB
            });
            setShowAsyncReview(true);
        } else {
            setIsEndingMatch(true);
        }
    };

    const handleAsyncConfirm = async () => {
        try {
            const sportName = match.disciplinas?.name || '';
            const scoreField = sportName === 'Fútbol' ? 'goles' : 'total';
            const detalle = { ...(match.marcador_detalle || {}) };
            detalle[`${scoreField}_a`] = asyncScore.scoreA;
            detalle[`${scoreField}_b`] = asyncScore.scoreB;
            detalle.tarjetas_amarillas_a = asyncScore.yellowA;
            detalle.tarjetas_amarillas_b = asyncScore.yellowB;
            detalle.tarjetas_rojas_a = asyncScore.redA;
            detalle.tarjetas_rojas_b = asyncScore.redB;

            await supabase.from('partidos').update({
                marcador_detalle: detalle
            }).eq('id', matchId);

            await confirmarFinalizar();
            setShowAsyncReview(false);
        } catch (err: any) {
            toast.error('Error al finalizar: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-24 text-white">
            <AdminMatchHeader 
                match={match} 
                disciplinaName={disciplinaName} 
                bgGradient={bgGradient} 
                activeEditors={activeEditors} 
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {match.marcador_detalle?.tipo === 'carrera' ? (
                    <Card className="p-8 mb-12">
                        <RaceControl 
                          matchId={matchId} 
                          detalle={match.marcador_detalle} 
                          onUpdate={fetchMatchDetails} 
                          isLocked={match.estado === 'finalizado'} 
                          profile={profile} 
                        />
                    </Card>
                ) : (
                    <AdminScoreboard
                        match={match}
                        scoreA={scoreA}
                        scoreB={scoreB}
                        onIniciarPartido={(modo) => toggleCronometro(modo)}
                        onFinalizar={handleFinalizarClick}
                        onCambiarPeriodo={handleCambiarPeriodo}
                        onCambiarSet={(setNum, pA, pB) => handleCambiarSetDirecto(setNum, pA, pB)}
                    />
                )}

                {match.estado !== 'finalizado' && (
                    <AdminPlayerRoster
                        match={match}
                        jugadoresA={jugadoresA}
                        jugadoresB={jugadoresB}
                        matchId={matchId}
                        onPlayersUpdated={fetchJugadores}
                        disciplinaName={disciplinaName}
                    />
                )}

                {/* Event creator + timeline */}
                {/* Event creator + timeline */}
                <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 mt-8">
                    <AdminEventCreator 
                        match={match}
                        actions={actions}
                        jugadoresA={jugadoresA}
                        jugadoresB={jugadoresB}
                        eventos={eventos}
                        onAddEvent={(data) => handleNuevoEvento(data.tipo, data.equipo, data.jugador_id)}
                        onAddPlayer={async (team, data) => {
                            try {
                                let jId: number | null = null;
                                const { data: existing } = await supabase
                                    .from('jugadores')
                                    .select('id')
                                    .eq('profile_id', data.profile_id)
                                    .maybeSingle();

                                if (existing && data.profile_id) {
                                    jId = existing.id;
                                } else {
                                    const { data: created, error: cErr } = await supabase
                                        .from('jugadores')
                                        .insert({
                                            nombre: data.nombre,
                                            numero: data.numero ? parseInt(data.numero) : null,
                                            profile_id: data.profile_id || null,
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
                        }}
                        disciplinaName={disciplinaName}
                    />

                    <AdminMatchTimeline 
                        eventos={eventos}
                        match={match}
                        onDeleteEvent={(e) => setConfirmingDeletion(e)}
                        disciplinaName={disciplinaName}
                    />
                </div>
            </div>

            <AdminModals
                isEndingMatch={isEndingMatch}
                onCloseEnding={() => setIsEndingMatch(false)}
                onConfirmEnding={async () => {
                   await confirmarFinalizar();
                   setIsEndingMatch(false);
                }}
                onConfirmWO={async (ganador: 'equipo_a' | 'equipo_b') => {
                   await finalizarPorWO(ganador);
                   setIsEndingMatch(false);
                }}
                isEditingScore={false}
                onCloseEditing={() => {}}
                match={match}
                disciplinaName={disciplinaName}
                onManualScoreUpdate={handleManualScoreUpdate}
                confirmingDeletion={confirmingDeletion}
                onCloseDeletion={() => setConfirmingDeletion(null)}
                onConfirmDeletion={() => {
                  if (confirmingDeletion) requestDeleteEvento(confirmingDeletion);
                  setConfirmingDeletion(null);
                }}
            />

            {/* Async Finalization Review Modal */}
            {showAsyncReview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative bg-[#0a0816] border border-white/10 rounded-[3rem] p-8 max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

                        <div className="relative z-10">
                            <h2 className="text-xl font-black uppercase tracking-tight text-white text-center mb-1">Revisión Final</h2>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center mb-8">Confirma el resultado del partido asincrónico</p>

                            {/* Score Input */}
                            <div className="mb-6">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-3 text-center">Marcador Final</p>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider truncate max-w-[100px]">{getDisplayName(match, 'a')}</span>
                                        <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-1">
                                            <button onClick={() => setAsyncScore(s => ({...s, scoreA: Math.max(0, s.scoreA - 1)}))} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white font-bold transition-all">−</button>
                                            <span className="text-3xl font-black tabular-nums text-white min-w-[40px] text-center">{asyncScore.scoreA}</span>
                                            <button onClick={() => setAsyncScore(s => ({...s, scoreA: s.scoreA + 1}))} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center justify-center text-white/40 font-bold transition-all">+</button>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-black text-white/10 mt-6">-</span>
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider truncate max-w-[100px]">{getDisplayName(match, 'b')}</span>
                                        <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-1">
                                            <button onClick={() => setAsyncScore(s => ({...s, scoreB: Math.max(0, s.scoreB - 1)}))} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white font-bold transition-all">−</button>
                                            <span className="text-3xl font-black tabular-nums text-white min-w-[40px] text-center">{asyncScore.scoreB}</span>
                                            <button onClick={() => setAsyncScore(s => ({...s, scoreB: s.scoreB + 1}))} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center justify-center text-white/40 font-bold transition-all">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cards Input */}
                            <div className="mb-8 space-y-4">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest text-center">Tarjetas</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm">🟨</span>
                                            <span className="text-[8px] font-bold text-yellow-400/60 uppercase tracking-widest">Amarillas</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => setAsyncScore(s => ({...s, yellowA: Math.max(0, s.yellowA - 1)}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">−</button>
                                                <span className="text-lg font-black text-white min-w-[20px] text-center">{asyncScore.yellowA}</span>
                                                <button onClick={() => setAsyncScore(s => ({...s, yellowA: s.yellowA + 1}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-yellow-500/20 flex items-center justify-center text-white/30 hover:text-yellow-400 text-xs font-bold">+</button>
                                            </div>
                                            <span className="text-white/10 font-black">|</span>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => setAsyncScore(s => ({...s, yellowB: Math.max(0, s.yellowB - 1)}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">−</button>
                                                <span className="text-lg font-black text-white min-w-[20px] text-center">{asyncScore.yellowB}</span>
                                                <button onClick={() => setAsyncScore(s => ({...s, yellowB: s.yellowB + 1}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-yellow-500/20 flex items-center justify-center text-white/30 hover:text-yellow-400 text-xs font-bold">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/[0.03] rounded-xl border border-white/5 p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm">🟥</span>
                                            <span className="text-[8px] font-bold text-red-400/60 uppercase tracking-widest">Rojas</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => setAsyncScore(s => ({...s, redA: Math.max(0, s.redA - 1)}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">−</button>
                                                <span className="text-lg font-black text-white min-w-[20px] text-center">{asyncScore.redA}</span>
                                                <button onClick={() => setAsyncScore(s => ({...s, redA: s.redA + 1}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/30 hover:text-red-400 text-xs font-bold">+</button>
                                            </div>
                                            <span className="text-white/10 font-black">|</span>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => setAsyncScore(s => ({...s, redB: Math.max(0, s.redB - 1)}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 text-xs font-bold">−</button>
                                                <span className="text-lg font-black text-white min-w-[20px] text-center">{asyncScore.redB}</span>
                                                <button onClick={() => setAsyncScore(s => ({...s, redB: s.redB + 1}))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-white/30 hover:text-red-400 text-xs font-bold">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="ghost" className="h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-xs" onClick={() => setShowAsyncReview(false)}>Cancelar</Button>
                                <Button className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 text-xs" onClick={handleAsyncConfirm}>Confirmar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
