"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2, Edit3, X } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
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
    const isTeamSport = ['Fútbol', 'Baloncesto', 'Voleibol'].includes(disciplinaName);
    const isTenisSport = ['Tenis', 'Tenis de Mesa'].includes(disciplinaName);
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);
    const { scoreA, scoreB } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

    return (
        <div className="min-h-screen bg-background pb-24 text-white">
            <AdminMatchHeader
                match={match}
                disciplinaName={disciplinaName}
                bgGradient={bgGradient}
                activeEditors={activeEditors}
            />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Fecha / Lugar — editable */}
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

                {/* Edición Completa — deportes de equipo y tenis */}
                {(isTeamSport || isTenisSport) && (
                    <div className="flex items-center justify-end mb-4 -mt-2">
                        <button
                            onClick={() => setShowFullEditor(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-colors text-xs font-black uppercase tracking-[0.2em] text-white border border-indigo-400/40"
                        >
                            <Edit3 size={15} />
                            Edición Completa
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

                {/* Roster + Event sections — not applicable for natación */}
                {match.marcador_detalle?.tipo !== 'carrera' && match.estado !== 'finalizado' && (
                    <AdminPlayerRoster
                        match={match}
                        jugadoresA={jugadoresA}
                        jugadoresB={jugadoresB}
                        matchId={matchId}
                        onPlayersUpdated={fetchJugadores}
                        disciplinaName={disciplinaName}
                    />
                )}

                {match.marcador_detalle?.tipo !== 'carrera' && match.estado === 'finalizado' && (
                    <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-center">
                        <AlertCircle size={20} className="shrink-0 text-white/30" />
                        <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
                            Partido finalizado — no se pueden registrar eventos desde acá
                        </p>
                    </div>
                )}

                {match.marcador_detalle?.tipo !== 'carrera' && match.estado !== 'finalizado' && (
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

            {/* Edición Completa — modal tabbed mobile-first */}
            {showFullEditor && (() => {
                const tabLabel = disciplinaName === 'Baloncesto' ? 'Cuartos' : disciplinaName === 'Fútbol' ? 'Tiempos' : 'Sets / Marcador';
                const tabs: { id: 'marcador' | 'eventos' | 'jugadores'; label: string }[] = [
                    { id: 'marcador' as const, label: tabLabel },
                    { id: 'eventos' as const, label: 'Eventos' },
                    { id: 'jugadores' as const, label: 'Jugadores' },
                ];
                const activeTab = fullEditorTab;

                return (
                    <div className="fixed inset-0 z-50 flex flex-col bg-[#080810]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                        {/* Header — sticky, always visible */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0 bg-[#080810]">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                <Edit3 size={14} className="text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white truncate">Edición Completa</h2>
                                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{disciplinaName}</p>
                            </div>
                            <button
                                onClick={() => setShowFullEditor(false)}
                                className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all border border-white/10 shrink-0"
                            >
                                <X size={14} className="text-white/70" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Cerrar</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-4 py-2 shrink-0 bg-[#080810] border-b border-white/[0.04]">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFullEditorTab(tab.id)}
                                    className="flex-1 h-9 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border"
                                    style={activeTab === tab.id
                                        ? { background: '#6366f1', color: '#fff', borderColor: 'transparent', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }
                                        : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.06)' }
                                    }
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto px-4 pb-24">
                            {/* MARCADOR TAB — Sets (Voleibol/Tenis) / Cuartos (Baloncesto) / Fútbol */}
                            {activeTab === 'marcador' && (
                                <div className="max-w-lg mx-auto pt-2">
                                    {disciplinaName === 'Baloncesto' ? (
                                        <BasquetEditor
                                            match={match}
                                            eventos={eventos}
                                            jugadoresA={jugadoresA}
                                            jugadoresB={jugadoresB}
                                            onAddEvent={(tipo, equipo, jugadorId, bypass, overrides) =>
                                                handleNuevoEvento(tipo, equipo, jugadorId, bypass, overrides)
                                            }
                                            onDeleteEvent={(e) => setConfirmingDeletion(e)}
                                        />
                                    ) : disciplinaName === 'Voleibol' ? (
                                        <ScoreBreakdownEditor
                                            match={match}
                                            profile={profile}
                                            onSaved={fetchMatchDetails}
                                        />
                                    ) : disciplinaName === 'Fútbol' ? (
                                        <FutbolEditor
                                            match={match}
                                            eventos={eventos}
                                            jugadoresA={jugadoresA}
                                            jugadoresB={jugadoresB}
                                            onAddEvent={(tipo, equipo, jugadorId, bypass, overrides) =>
                                                handleNuevoEvento(tipo, equipo, jugadorId, bypass, overrides)
                                            }
                                            onDeleteEvent={(e) => setConfirmingDeletion(e)}
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

                            {/* EVENTOS TAB */}
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
                                        
                                        {disciplinaName === 'Baloncesto' && (
                                            <div className="mt-6">
                                                <BasketballBulkStats
                                                    match={match}
                                                    onSubmit={handleBulkBasketballStats}
                                                    onAddPlayer={async (team, data) => {
                                                        // Use the same logic as in AdminEventCreator
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

                            {/* JUGADORES TAB */}
                            {activeTab === 'jugadores' && (
                                <div className="max-w-7xl mx-auto pt-2">
                                    <AdminPlayerRoster
                                        match={match}
                                        jugadoresA={jugadoresA}
                                        jugadoresB={jugadoresB}
                                        matchId={matchId}
                                        onPlayersUpdated={fetchJugadores}
                                        disciplinaName={disciplinaName}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Bottom close bar — always reachable on mobile */}
                        <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#080810]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                            <button
                                onClick={() => setShowFullEditor(false)}
                                className="w-full h-11 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] text-white/60"
                            >
                                <X size={14} />
                                Cerrar Editor
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
