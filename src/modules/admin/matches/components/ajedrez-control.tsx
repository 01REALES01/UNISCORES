"use client";

import { useState } from "react";
import { Crown, Handshake, RotateCcw, CheckCircle2, Flag } from "lucide-react";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { stampAudit } from "@/lib/audit-helpers";
import { AjedrezService, type AjedrezRondaResultado } from "@/modules/sports/services/ajedrez.service";
import type { Profile } from "@/hooks/useAuth";

const service = new AjedrezService();

type AjedrezControlProps = {
    matchId: string | number;
    match: any;
    onUpdate: () => void;
    profile?: Profile | null;
};

const RESULTADO_CONFIG: Record<NonNullable<AjedrezRondaResultado>, { label: string; icon: any; colorA: string; colorB: string }> = {
    victoria_a: { label: 'Gana A', icon: Crown, colorA: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30', colorB: 'opacity-40' },
    victoria_b: { label: 'Gana B', icon: Crown, colorA: 'opacity-40', colorB: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' },
    empate:     { label: 'Empate',  icon: Handshake, colorA: 'bg-amber-600/80 text-white', colorB: 'bg-amber-600/80 text-white' },
};

export function AjedrezControl({ matchId, match, onUpdate, profile }: AjedrezControlProps) {
    const [saving, setSaving] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    const detalle = match.marcador_detalle || {};
    const rondaActual = detalle.ronda_actual || 1;
    const totalRondas = detalle.total_rondas || 3;
    const singleRondaSuizo = totalRondas === 1;
    const rondas: Record<string, { resultado: AjedrezRondaResultado }> = detalle.rondas || {};
    const isLocked = match.estado === 'finalizado';
    const allDone = service.isFinished(detalle);

    const equipoA = match.equipo_a || match.delegacion_a || 'Equipo A';
    const equipoB = match.equipo_b || match.delegacion_b || 'Equipo B';

    const saveDetalle = async (newDetalle: any) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('partidos')
                .update({ marcador_detalle: stampAudit(newDetalle, profile) })
                .eq('id', matchId);
            if (error) throw error;
            onUpdate();
        } catch (e: any) {
            toast.error('Error guardando: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRegistrarResultado = (resultado: AjedrezRondaResultado) => {
        if (isLocked || !resultado) return;
        const newDetalle = service.setRondaResult(detalle, resultado);
        saveDetalle(newDetalle);
    };

    const handleDeshacer = () => {
        if (isLocked) return;
        const newDetalle = service.undoLastRonda(detalle);
        saveDetalle(newDetalle);
        toast.info('Último resultado deshecho');
    };

    const handleFinalizar = async () => {
        if (!allDone) {
            toast.error(
                singleRondaSuizo
                    ? 'Registra el resultado del partido antes de finalizar'
                    : 'Registra el resultado de todas las rondas antes de finalizar'
            );
            return;
        }
        if (!confirm('¿Finalizar el partido? Esto registrará el resultado final.')) return;

        setFinalizing(true);
        try {
            const ganador = detalle.total_a > detalle.total_b ? 'victoria_a'
                : detalle.total_b > detalle.total_a ? 'victoria_b'
                : 'empate';

            const { error } = await supabase
                .from('partidos')
                .update({
                    estado: 'finalizado',
                    marcador_detalle: stampAudit({
                        ...detalle,
                        resultado_final: ganador,
                    }, profile)
                })
                .eq('id', matchId);

            if (error) throw error;
            toast.success('Partido finalizado');
            onUpdate();
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        } finally {
            setFinalizing(false);
        }
    };

    // Labels para puntos (puede ser .5)
    const fmtPts = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1);

    return (
        <div className="space-y-6">
            {/* Score header */}
            <div className="grid grid-cols-3 items-center gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1 truncate">{equipoA}</p>
                    <p className="text-5xl font-black text-white tabular-nums">{fmtPts(detalle.total_a || 0)}</p>
                    <p className="text-[10px] text-white/30 mt-1">puntos</p>
                </div>
                <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                        {singleRondaSuizo
                            ? 'Una partida (suizo)'
                            : `Ronda ${Math.min(rondaActual, totalRondas)} / ${totalRondas}`}
                    </p>
                    {!singleRondaSuizo && (
                        <>
                            <div className="flex justify-center gap-1">
                                {Array.from({ length: totalRondas }, (_, i) => {
                                    const r = rondas[String(i + 1)];
                                    const res = r?.resultado;
                                    return (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-3 h-3 rounded-full border",
                                                res === 'victoria_a' ? "bg-emerald-500 border-emerald-500" :
                                                res === 'victoria_b' ? "bg-blue-500 border-blue-500" :
                                                res === 'empate' ? "bg-amber-500 border-amber-500" :
                                                i + 1 === rondaActual ? "bg-white/20 border-white/40 animate-pulse" :
                                                "bg-white/5 border-white/10"
                                            )}
                                        />
                                    );
                                })}
                            </div>
                            <p className="text-[9px] font-black uppercase text-white/20">Historial</p>
                        </>
                    )}
                </div>
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1 truncate">{equipoB}</p>
                    <p className="text-5xl font-black text-white tabular-nums">{fmtPts(detalle.total_b || 0)}</p>
                    <p className="text-[10px] text-white/30 mt-1">puntos</p>
                </div>
            </div>

            {/* Ronda historial detallado (omitido si una sola ronda suizo) */}
            {!singleRondaSuizo && Object.keys(rondas).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Array.from({ length: totalRondas }, (_, i) => {
                        const n = i + 1;
                        const r = rondas[String(n)]?.resultado;
                        return (
                            <div
                                key={n}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border",
                                    r === 'victoria_a' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                                    r === 'victoria_b' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                                    r === 'empate'     ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                                    "bg-white/5 border-white/10 text-white/30"
                                )}
                            >
                                <span>R{n}</span>
                                <span>
                                    {r === 'victoria_a' ? `♟ ${equipoA.split(' ')[0]}` :
                                     r === 'victoria_b' ? `♟ ${equipoB.split(' ')[0]}` :
                                     r === 'empate'     ? '= Tablas' : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botones de resultado — solo si no está bloqueado y hay rondas pendientes */}
            {!isLocked && !allDone && (
                <div className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
                        {singleRondaSuizo ? 'Resultado del partido' : `Resultado — Ronda ${rondaActual}`}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        {/* Gana A */}
                        <button
                            onClick={() => handleRegistrarResultado('victoria_a')}
                            disabled={saving}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Crown size={24} className="text-emerald-400" />
                            <span className="text-[11px] font-black uppercase tracking-tight text-emerald-300">Gana A</span>
                            <span className="text-[10px] text-emerald-400/60 truncate max-w-full px-1">{equipoA.split(' ').slice(0, 2).join(' ')}</span>
                        </button>

                        {/* Empate */}
                        <button
                            onClick={() => handleRegistrarResultado('empate')}
                            disabled={saving}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Handshake size={24} className="text-amber-400" />
                            <span className="text-[11px] font-black uppercase tracking-tight text-amber-300">Tablas</span>
                            <span className="text-[10px] text-amber-400/60">+0.5 cada uno</span>
                        </button>

                        {/* Gana B */}
                        <button
                            onClick={() => handleRegistrarResultado('victoria_b')}
                            disabled={saving}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Crown size={24} className="text-blue-400" />
                            <span className="text-[11px] font-black uppercase tracking-tight text-blue-300">Gana B</span>
                            <span className="text-[10px] text-blue-400/60 truncate max-w-full px-1">{equipoB.split(' ').slice(0, 2).join(' ')}</span>
                        </button>
                    </div>

                    {/* Deshacer */}
                    {Object.values(rondas).some(r => r.resultado !== null) && (
                        <button
                            onClick={handleDeshacer}
                            disabled={saving}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mx-auto"
                        >
                            <RotateCcw size={12} />
                            Deshacer último resultado
                        </button>
                    )}
                </div>
            )}

            {/* Finalizar */}
            {!isLocked && (
                <Button
                    onClick={handleFinalizar}
                    disabled={finalizing || saving || !allDone}
                    className={cn(
                        "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm border-0",
                        allDone
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                    )}
                >
                    <Flag size={18} className="mr-2" />
                    {finalizing ? 'Finalizando...' : allDone ? 'Finalizar Partido' : singleRondaSuizo ? 'Registra el resultado para finalizar' : `Quedan ${totalRondas - Object.values(rondas).filter(r => r.resultado !== null).length} rondas`}
                </Button>
            )}

            {/* Estado finalizado */}
            {isLocked && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-emerald-300">Partido finalizado</p>
                        <p className="text-xs text-emerald-400/60">
                            {detalle.total_a > detalle.total_b
                                ? `Ganó ${equipoA}`
                                : detalle.total_b > detalle.total_a
                                ? `Ganó ${equipoB}`
                                : 'Empate general'}
                            {' '}— {fmtPts(detalle.total_a || 0)} vs {fmtPts(detalle.total_b || 0)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
