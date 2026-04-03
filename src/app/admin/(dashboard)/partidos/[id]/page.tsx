"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2, Edit3 } from "lucide-react";
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
import { AjedrezControl } from "@/modules/admin/matches/components/ajedrez-control";
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
    const { scoreA, scoreB, labelA, labelB, extra: scoreExtra } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

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
                        labelA={labelA}
                        labelB={labelB}
                        scoreExtra={scoreExtra}
                        onEditScore={() => setIsEditingScore(true)}
                        onToggleCronometro={toggleCronometro}
                        onFinalizar={() => setIsEndingMatch(true)}
                        cronometroActivo={cronometroActivo}
                        onOpenFullEditor={() => setShowFullEditor(true)}
                        onCambiarPeriodo={handleCambiarPeriodo}
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
                                // 1. Find or create in 'jugadores'
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

                                // 2. Link to roster
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
                isEditingScore={isEditingScore}
                onCloseEditing={() => setIsEditingScore(false)}
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

            <EditMatchModal 
                match={match} 
                isOpen={showFullEditor} 
                onClose={() => setShowFullEditor(false)} 
                profile={profile}
            />
        </div>
    );
}
