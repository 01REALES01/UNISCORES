"use client";

import { useState, useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { stampAudit } from "@/lib/audit-helpers";
import { toast } from "sonner";
import type { Jugador } from "@/modules/matches/types";
import type { Profile } from "@/modules/users/types";

type ProfileLite = { id: string; email?: string; role?: string; full_name?: string | null; roles?: string[] } | null;

interface AdminMvpPickerProps {
    matchId: string;
    disciplinaName: string;
    estado: string;
    marcador_detalle: Record<string, unknown> | null | undefined;
    jugadoresA: Jugador[];
    jugadoresB: Jugador[];
    profile: ProfileLite;
    onSaved: () => void | Promise<void>;
}

export function AdminMvpPicker({
    matchId,
    disciplinaName,
    estado,
    marcador_detalle,
    jugadoresA,
    jugadoresB,
    profile,
    onSaved,
}: AdminMvpPickerProps) {
    const [saving, setSaving] = useState(false);
    const md = marcador_detalle || {};
    const currentId =
        md.mvp_jugador_id != null && md.mvp_jugador_id !== ""
            ? String(md.mvp_jugador_id)
            : "";

    const [selected, setSelected] = useState<string>(currentId);

    useEffect(() => {
        setSelected(currentId);
    }, [currentId]);

    const golesA = Number(md.goles_a ?? md.total_a ?? 0);
    const golesB = Number(md.goles_b ?? md.total_b ?? 0);
    const n = disciplinaName.toLowerCase();
    const isFutbolLike =
        n.includes("futbol") ||
        n.includes("fútbol") ||
        n.includes("futsal") ||
        n.includes("micro") ||
        n.includes("sala");
    const isDrawFutbol = isFutbolLike && golesA === 0 && golesB === 0;
    const isVolley = disciplinaName === "Voleibol";
    const isBasquet = disciplinaName === "Baloncesto";

    // Vóley: MVP siempre manual al finalizar. Fútbol/Básquet: manual opcional en cualquier
    // marcador — si no guardás nada, la ficha pública sigue usando el MVP inferido por eventos.
    const visible = estado === "finalizado" && (isVolley || isFutbolLike || isBasquet);

    if (!visible) return null;

    const save = async () => {
        setSaving(true);
        try {
            const { data: fresh, error: fetchErr } = await supabase
                .from("partidos")
                .select("marcador_detalle")
                .eq("id", matchId)
                .single();
            if (fetchErr) throw fetchErr;
            const det = { ...(fresh?.marcador_detalle || {}) } as Record<string, unknown>;
            if (!selected) {
                delete det.mvp_jugador_id;
            } else {
                det.mvp_jugador_id = selected;
            }
            const audited = stampAudit(det, profile as Profile | null | undefined);
            const { error } = await supabase
                .from("partidos")
                .update({ marcador_detalle: audited })
                .eq("id", matchId);
            if (error) throw error;
            toast.success(selected ? "MVP guardado" : "MVP eliminado");
            await onSaved();
        } catch (e: unknown) {
            console.error(e);
            toast.error("No se pudo guardar el MVP");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-black/40 to-black/60 p-6 shadow-[0_0_40px_rgba(245,158,11,0.08)]">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                    <Trophy className="text-amber-400" size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white">
                        Jugador más valioso (MVP)
                    </h3>
                    <p className="text-[11px] text-white/45 font-bold mt-0.5 leading-snug">
                        {isVolley
                            ? "Tras finalizar el partido, podés designar al MVP. Se muestra en la ficha pública del partido."
                            : isDrawFutbol
                              ? "Marcador 0–0: elegí al MVP para que figure en la página pública del partido."
                              : "Si no guardás nada, el MVP se calcula por los eventos. Podés elegir otro jugador y guardar para reemplazarlo en la ficha pública."}
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/35 block mb-2">
                        Jugador
                    </label>
                    <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        className="w-full h-12 rounded-xl bg-black/50 border border-white/15 text-white text-sm font-bold px-3 outline-none focus:border-amber-500/50"
                    >
                        <option value="">— Sin MVP —</option>
                        <optgroup label="Local / Equipo A">
                            {jugadoresA.map((j) => (
                                <option key={j.id} value={String(j.id)}>
                                    {j.nombre}
                                    {j.numero != null ? ` · #${j.numero}` : ""}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Visitante / Equipo B">
                            {jugadoresB.map((j) => (
                                <option key={j.id} value={String(j.id)}>
                                    {j.nombre}
                                    {j.numero != null ? ` · #${j.numero}` : ""}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <Button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving || selected === currentId}
                    className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs tracking-wide shrink-0"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : "Guardar MVP"}
                </Button>
            </div>
        </div>
    );
}
