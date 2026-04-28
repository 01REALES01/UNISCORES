"use client";

import { useState } from "react";
import { X, Check, Users, Search, Target } from "lucide-react";
import { Avatar, Button, Card } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { getDisplayName } from "@/lib/sport-helpers";
import { SPORT_COLORS } from "@/lib/constants";

interface AdminSpecificStatsEditorProps {
    match: any;
    jugadoresA: any[];
    jugadoresB: any[];
    disciplinaName: string;
    onClose: () => void;
    onAddEvent: (tipo: string, equipo: 'equipo_a' | 'equipo_b', jugadorId: number | null) => Promise<boolean>;
}

const STAT_LABELS: Record<string, { label: string, icon: string }> = {
    'tiro': { label: 'Tiro', icon: '🦶' },
    'tiro_al_arco': { label: 'Al arco', icon: '🥅' },
    'falta_cometida': { label: 'Falta', icon: '⚠️' },
    'tiro_esquina': { label: 'Córner', icon: '🚩' },
    'posesion': { label: 'Posesión', icon: '📊' },
    'rebote': { label: 'Rebote', icon: '🏀' },
    'robo': { label: 'Robo', icon: '🤏' },
    'asistencia': { label: 'Asistencia', icon: '🤝' },
    'ace': { label: 'Ace', icon: '🎯' },
    'bloqueo': { label: 'Bloqueo', icon: '🧱' },
    'ataque_directo': { label: 'Ataque', icon: '💥' },
    'gol': { label: 'Gol', icon: '⚽' },
    'punto': { label: 'Punto', icon: '🏐' },
    'punto_1': { label: '+1 Pt', icon: '1️⃣' },
    'punto_2': { label: '+2 Pts', icon: '2️⃣' },
    'punto_3': { label: '+3 Pts', icon: '3️⃣' },
    'falta': { label: 'Falta', icon: '⛔' },
    'tarjeta_amarilla': { label: 'Amarilla', icon: '🟨' },
    'tarjeta_roja': { label: 'Roja', icon: '🟥' },
};

const SPORT_STATS: Record<string, string[]> = {
    'Fútbol': ['gol', 'tiro', 'tiro_al_arco', 'falta_cometida', 'tiro_esquina', 'tarjeta_amarilla', 'tarjeta_roja'],
    'Futsal': ['gol', 'tiro', 'tiro_al_arco', 'falta_cometida', 'tiro_esquina', 'tarjeta_amarilla', 'tarjeta_roja'],
    'Baloncesto': ['punto_1', 'punto_2', 'punto_3', 'rebote', 'robo', 'asistencia', 'bloqueo', 'falta'],
    'Voleibol': ['punto', 'ace', 'bloqueo', 'ataque_directo', 'tarjeta_amarilla', 'tarjeta_roja'],
};

const TEAM_ONLY_STATS = ['falta_cometida', 'tiro_esquina', 'falta', 'posesion', 'punto'];

export function AdminSpecificStatsEditor({
    match,
    jugadoresA,
    jugadoresB,
    disciplinaName,
    onClose,
    onAddEvent
}: AdminSpecificStatsEditorProps) {
    const stats = SPORT_STATS[disciplinaName] || [];
    const [selectedStat, setSelectedStat] = useState<string>(stats[0] || 'gol');
    const [selectedTeam, setSelectedTeam] = useState<'equipo_a' | 'equipo_b'>('equipo_a');
    const [search, setSearch] = useState('');
    const [lastAction, setLastAction] = useState<{ player: string, stat: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';
    const currentJugadores = selectedTeam === 'equipo_a' ? jugadoresA : jugadoresB;
    const isTeamOnly = TEAM_ONLY_STATS.includes(selectedStat);

    const filteredJugadores = currentJugadores.filter(j => 
        j.nombre?.toLowerCase().includes(search.toLowerCase()) || 
        j.numero?.toString().includes(search)
    );

    const handleAction = async (jugadorId: number | null, nombre: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const ok = await onAddEvent(selectedStat, selectedTeam, jugadorId);
        if (ok) {
            setLastAction({ player: nombre, stat: STAT_LABELS[selectedStat]?.label || selectedStat });
            setTimeout(() => setLastAction(null), 2000);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-white animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Target size={20} className="text-white/60" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest">Editor de Estadísticas</h2>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{disciplinaName}</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Stat Selector - Horizontal Scroll */}
            <div className="px-4 py-4 border-b border-white/5 bg-white/[0.02] flex gap-2 overflow-x-auto no-scrollbar">
                {stats.map(s => (
                    <button
                        key={s}
                        onClick={() => {
                            setSelectedStat(s);
                            setSearch('');
                        }}
                        className={cn(
                            "flex items-center gap-2 px-5 min-h-[44px] rounded-2xl border-2 transition-all whitespace-nowrap active:scale-95",
                            selectedStat === s 
                                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                                : "bg-black/40 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                        )}
                    >
                        <span className="text-base">{STAT_LABELS[s]?.icon || '📊'}</span>
                        <span className="text-xs font-black uppercase tracking-wide">{STAT_LABELS[s]?.label || s}</span>
                    </button>
                ))}
            </div>

            {/* Team Toggle */}
            <div className="px-6 py-4 flex gap-3">
                {(['equipo_a', 'equipo_b'] as const).map(tid => (
                    <button
                        key={tid}
                        onClick={() => setSelectedTeam(tid)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-3 h-14 rounded-2xl border-2 transition-all active:scale-[0.98]",
                            selectedTeam === tid
                                ? "bg-white/10 border-white text-white shadow-xl"
                                : "bg-black/20 border-white/5 text-white/20"
                        )}
                    >
                        <Avatar 
                            name={getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')} 
                            src={tid === 'equipo_a' ? match.carrera_a?.escudo_url : match.carrera_b?.escudo_url}
                            className="w-8 h-8 border border-white/10"
                        />
                        <span className={cn(
                            "text-[11px] font-black uppercase tracking-strict truncate max-w-[120px]",
                            selectedTeam === tid ? "text-white" : "text-white/25"
                        )}>
                            {getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}
                        </span>
                    </button>
                ))}
            </div>

            {!isTeamOnly ? (
                <>
                    {/* Search & Team Stat */}
                    <div className="px-6 py-2 flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                            <input 
                                type="text"
                                placeholder="Buscar por nombre o número..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-white/30 transition-all"
                            />
                        </div>
                        {!search && (
                            <button
                                onClick={() => handleAction(null, 'General')}
                                className="px-6 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/30 transition-all active:scale-95"
                            >
                                Stat Equipo
                            </button>
                        )}
                    </div>

                    {/* Player Grid */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {filteredJugadores.map(j => (
                                <button
                                    key={j.id}
                                    onClick={() => handleAction(j.id, j.nombre)}
                                    className="group relative flex flex-col items-center gap-3 p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all active:scale-95"
                                >
                                    <div className="relative">
                                        {j.numero != null ? (
                                            <div className="w-14 h-14 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-all shadow-xl bg-white/5 flex items-center justify-center font-mono font-black text-white text-xl">
                                                {j.numero}
                                            </div>
                                        ) : (
                                            <Avatar name={j.nombre} className="w-14 h-14 border-2 border-white/10 group-hover:border-white/30 transition-all shadow-xl" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-center text-white/60 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                                        {j.nombre}
                                    </span>
                                </button>
                            ))}
                            {filteredJugadores.length === 0 && (
                                <div className="col-span-full py-20 text-center">
                                    <Users size={40} className="mx-auto text-white/5 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10">No se encontraron jugadores</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* Team Only Large Button View */
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <button
                        onClick={() => handleAction(null, 'General')}
                        disabled={isSubmitting}
                        className="w-full max-w-sm aspect-square rounded-[3rem] bg-emerald-500/10 border-4 border-emerald-500/30 flex flex-col items-center justify-center gap-6 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all active:scale-[0.97] group"
                    >
                        <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-500/20 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <span className="text-6xl">{STAT_LABELS[selectedStat]?.icon || '📊'}</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 mb-2">Registrar para equipo</span>
                            <span className="block text-2xl font-black uppercase text-white tracking-tight">
                                {STAT_LABELS[selectedStat]?.label}
                            </span>
                        </div>
                    </button>
                    <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-white/20 italic">
                        Esta estadística no requiere asignar jugador
                    </p>
                </div>
            )}

            {/* Toast/Notification Overlay */}
            {lastAction && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-bottom-4 slide-in-from-left-0 duration-300">
                    <div className="px-6 py-3 bg-emerald-500 text-black rounded-full flex items-center gap-3 shadow-2xl shadow-emerald-500/40">
                        <Check size={18} strokeWidth={4} />
                        <span className="text-xs font-black uppercase tracking-widest">+1 {lastAction.stat} — {lastAction.player}</span>
                    </div>
                </div>
            )}

            {/* Bottom Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-black/60 backdrop-blur-xl">
                <Button 
                    className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest shadow-xl"
                    onClick={onClose}
                >
                    Finalizar Registro
                </Button>
            </div>
        </div>
    );
}
