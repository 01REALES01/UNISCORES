"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, Medal, Trophy, Timer, ArrowDown01, CheckCircle2, AlertTriangle, Ban, Clock, Download, ExternalLink, Search, Loader2 } from "lucide-react";
import { Button, Input, Badge, Card, Avatar } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CARRERAS_UNINORTE, NATACION_PUNTOS } from "@/lib/constants";
import { parseTimeToMs, isValidTimeFormat } from "@/lib/sport-helpers";
import { toast } from "sonner";
import { stampAudit } from "@/lib/audit-helpers";
import type { Profile } from "@/hooks/useAuth";

// ── Types ────────────────────────────────────────────────────────────────────

export type ParticipantStatus = 'valid' | 'dns' | 'dq' | 'pending';

export type Participante = {
    id: string;
    nombre: string;
    carrera: string;       // Carrera universitaria (e.g. "Ingeniería de Sistemas")
    carrera_id?: number;
    profile_id?: string;   // UUID — links to /perfil/{profile_id}
    jugador_id?: number;   // links to jugadores table
    carril?: number;
    tiempo?: string;       // Display format: "mm:ss.xx" or "ss.xx"
    tiempo_ms?: number;    // Milliseconds — used for sorting
    estado: ParticipantStatus;
    posicion?: number;
    puntos?: number;
};

/** Resultado unificado de búsqueda (misma lógica que edición de partidos individuales). */
type AthletePick = {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    carrera?: { nombre: string } | null;
    source: "profile" | "jugador";
    badge?: string;
    realId?: number;
    profile_id?: string | null;
};

async function participanteFromAthletePick(
    p: AthletePick,
    carril: number | undefined
): Promise<Participante> {
    const id = Math.random().toString(36).substring(2, 9);
    if (p.source === "profile") {
        const { data: prof } = await supabase
            .from("profiles")
            .select("carrera_id, carreras_ids")
            .eq("id", p.id)
            .maybeSingle();
        const carreraId = prof?.carrera_id ?? prof?.carreras_ids?.[0] ?? null;
        let carreraNombre = p.carrera?.nombre ?? "";
        if (!carreraNombre && carreraId) {
            const { data: c } = await supabase.from("carreras").select("nombre").eq("id", carreraId).maybeSingle();
            carreraNombre = c?.nombre ?? "—";
        }
        if (!carreraNombre) carreraNombre = "—";
        const { data: j } = await supabase.from("jugadores").select("id").eq("profile_id", p.id).maybeSingle();
        return {
            id,
            nombre: p.full_name.trim(),
            carrera: carreraNombre,
            carrera_id: carreraId ?? undefined,
            profile_id: p.id,
            jugador_id: j?.id,
            carril,
            tiempo: "",
            estado: "pending",
            posicion: undefined,
            puntos: 0,
        };
    }
    const { data: jrow } = await supabase
        .from("jugadores")
        .select("id, carrera_id, carrera:carrera_id(nombre)")
        .eq("id", p.realId!)
        .maybeSingle();
    const carreraNombre = (jrow?.carrera as { nombre?: string } | null)?.nombre ?? p.carrera?.nombre ?? "—";
    return {
        id,
        nombre: p.full_name.trim(),
        carrera: carreraNombre,
        carrera_id: jrow?.carrera_id ?? undefined,
        profile_id: p.profile_id ?? undefined,
        jugador_id: p.realId,
        carril,
        tiempo: "",
        estado: "pending",
        posicion: undefined,
        puntos: 0,
    };
}

type RaceControlProps = {
    matchId: string | number;
    detalle: any;
    onUpdate: () => void;
    isLocked?: boolean;
    /** Si el partido está finalizado, se permite eliminar participantes (duplicados) y se recalcula el ranking al guardar. */
    matchEstado?: string | null;
    profile?: Profile | null;
    disciplinaId?: number | null;
    genero?: string | null;
    categoria?: string | null;
};

/** Filas legacy al modelo actual antes de recalcular posiciones / podio. */
function migrateRawRaceParticipantes(raw: any[] | undefined): Participante[] {
    return (raw || []).map((p: any) => ({
        ...p,
        estado: p.estado || (p.tiempo ? "valid" : "pending"),
        carrera: p.carrera || p.equipo || "",
    }));
}

function newRaceParticipantId(): string {
    return Math.random().toString(36).substring(2, 11);
}

/**
 * Si el JSON repite el mismo `id` en varias filas (duplicados), React y la papelera fallan.
 * Regenera `id` en repeticiones conservando el orden.
 */
function ensureUniqueParticipantIds(list: Participante[]): Participante[] {
    const seen = new Set<string>();
    let changed = false;
    const out: Participante[] = [];
    for (const p of list) {
        if (p.id && !seen.has(p.id)) {
            seen.add(p.id);
            out.push(p);
            continue;
        }
        changed = true;
        let id = newRaceParticipantId();
        while (seen.has(id)) id = newRaceParticipantId();
        seen.add(id);
        out.push({ ...p, id });
    }
    return changed ? out : list;
}

/** Import / legacy: tiempo válido pero estado aún "Pendiente" → al cerrar tratamos como válido. */
function coerceNatacionPendingWithValidTime(list: Participante[]): Participante[] {
    return list.map((p) => {
        if (p.estado !== "pending") return p;
        const t = (p.tiempo || "").trim();
        if (t && isValidTimeFormat(t)) {
            return { ...p, estado: "valid" as const, tiempo_ms: parseTimeToMs(t) };
        }
        return p;
    });
}

/** Sin tiempo válido y no NSP/DQ → no se puede finalizar la prueba. */
function incompleteNatacionRows(list: Participante[]): Participante[] {
    const coerced = coerceNatacionPendingWithValidTime(list);
    return coerced.filter((p) => {
        if (p.estado === "dns" || p.estado === "dq") return false;
        const t = (p.tiempo || "").trim();
        if (!t) return true;
        return !isValidTimeFormat(t);
    });
}

/** Evita que `...detalle` arrastre goles_a/puntos_a decimales y rompa el trigger de quiniela al finalizar. */
const HEAD_TO_HEAD_SCORE_KEYS = [
    "puntos_a",
    "puntos_b",
    "total_a",
    "total_b",
    "goles_a",
    "goles_b",
    "sets_a",
    "sets_b",
    "games_a",
    "games_b",
    "cuarto_actual",
] as const;

function stripHeadToHeadScoreKeysFromDetalle(detalle: Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (!detalle || typeof detalle !== "object") return {};
    const out: Record<string, unknown> = { ...detalle };
    for (const k of HEAD_TO_HEAD_SCORE_KEYS) delete out[k];
    return out;
}

function sanitizeNatacionParticipantesForDb(list: Participante[]): Participante[] {
    return list.map((p) => {
        let carril = p.carril;
        if (typeof carril === "number" && Number.isFinite(carril)) {
            const r = Math.round(carril);
            carril = r >= 1 && r <= 10 ? r : undefined;
        }
        let posicion = p.posicion;
        if (typeof posicion === "number" && Number.isFinite(posicion)) posicion = Math.round(posicion);
        let puntos = p.puntos;
        if (typeof puntos === "number" && Number.isFinite(puntos)) puntos = Math.round(puntos);
        return { ...p, carril, posicion, puntos };
    });
}

type PodiumMedalOp = {
    carrera: string;
    carrera_id?: number;
    tipo: "oro" | "plata" | "bronce";
    puntos: number;
};

/** Misma regla que al finalizar: top 3 con tiempo válido y estado valid. */
function podiumMedalOpsFromRanked(ranked: Participante[]): PodiumMedalOp[] {
    const out: PodiumMedalOp[] = [];
    const podium = ranked.filter((p) => p.posicion && p.posicion <= 3 && p.estado === "valid");
    for (const p of podium) {
        if (p.posicion === 1)
            out.push({ carrera: p.carrera, carrera_id: p.carrera_id, tipo: "oro", puntos: NATACION_PUNTOS[1] || 5 });
        else if (p.posicion === 2)
            out.push({ carrera: p.carrera, carrera_id: p.carrera_id, tipo: "plata", puntos: NATACION_PUNTOS[2] || 3 });
        else if (p.posicion === 3)
            out.push({ carrera: p.carrera, carrera_id: p.carrera_id, tipo: "bronce", puntos: NATACION_PUNTOS[3] || 1 });
    }
    return out;
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ParticipantStatus, { label: string; color: string; icon: any }> = {
    valid: { label: 'Válido', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    pending: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
    dns: { label: 'NSP', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Ban },
    dq: { label: 'DQ', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
};

// ── Component ────────────────────────────────────────────────────────────────

export function RaceControl({
    matchId,
    detalle,
    onUpdate,
    isLocked = false,
    matchEstado,
    profile,
    disciplinaId,
    genero,
    categoria,
}: RaceControlProps) {
    const isFinalizado = matchEstado === "finalizado";
    /** Antes de finalizar: todo el flujo. Después: solo recuperación (agregar uno, editar filas pendientes, guardar). */
    const canUsePreFinalizeTools = !isLocked && !isFinalizado;
    const canAddSingleParticipant = !isLocked || isFinalizado;
    const canSaveMarcador = !isLocked || isFinalizado;
    const canRemoveParticipants = !isLocked || isFinalizado;
    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [newCarril, setNewCarril] = useState("");
    const [newTiempo, setNewTiempo] = useState("");
    const [athleteQuery, setAthleteQuery] = useState("");
    const [athleteResults, setAthleteResults] = useState<AthletePick[]>([]);
    const [athleteSearching, setAthleteSearching] = useState(false);
    const [athleteOpen, setAthleteOpen] = useState(false);
    const [pendingAthlete, setPendingAthlete] = useState<AthletePick | null>(null);
    const athleteSearchRef = useRef<HTMLDivElement>(null);
    const athleteDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingInscritos, setLoadingInscritos] = useState(false);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (athleteSearchRef.current && !athleteSearchRef.current.contains(e.target as Node)) setAthleteOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // Initialize from detalle
    useEffect(() => {
        const migrated = migrateRawRaceParticipantes(detalle.participantes);
        const idList = migrated.map((p) => p.id);
        const hadDuplicateIds = new Set(idList).size !== idList.length;
        const fixed = ensureUniqueParticipantIds(migrated);
        setParticipantes(fixed);
        if (hadDuplicateIds) {
            toast.info(
                "Había filas con el mismo id interno (datos duplicados). Ya quedaron con ids distintos: podés borrar la fila de más sin error."
            );
        }
    }, [detalle]);

    const searchAthletes = async (q: string) => {
        if (!q.trim()) {
            setAthleteResults([]);
            return;
        }
        setAthleteSearching(true);
        try {
            const tokens = q.trim().split(/\s+/);
            let pQuery = supabase
                .from("profiles")
                .select("id, full_name, avatar_url, carrera:carrera_id(nombre)");
            let jQuery = supabase
                .from("jugadores")
                .select("id, nombre, profile_id, carrera:carrera_id(nombre)");

            tokens.forEach((token) => {
                if (token) {
                    pQuery = pQuery.ilike("full_name", `%${token}%`);
                    jQuery = jQuery.ilike("nombre", `%${token}%`);
                }
            });

            const [profilesRes, jugadoresRes] = await Promise.all([pQuery.limit(24), jQuery.limit(24)]);

            const profiles = profilesRes.data || [];
            const players = jugadoresRes.data || [];
            const unified: AthletePick[] = [];
            const seenProfileIds = new Set<string>();

            profiles.forEach((p: { id: string; full_name: string; avatar_url?: string; carrera?: { nombre: string } }) => {
                unified.push({
                    id: p.id,
                    full_name: p.full_name,
                    avatar_url: p.avatar_url,
                    carrera: p.carrera,
                    source: "profile",
                    badge: "Cuenta activa",
                });
                seenProfileIds.add(p.id);
            });

            players.forEach(
                (j: { id: number; nombre: string; profile_id: string | null; carrera?: { nombre: string } | null }) => {
                    if (j.profile_id && seenProfileIds.has(j.profile_id)) return;
                    unified.push({
                        id: String(j.id),
                        realId: j.id,
                        full_name: j.nombre,
                        avatar_url: null,
                        carrera: j.carrera,
                        source: "jugador",
                        badge: "Acta / jugadores",
                        profile_id: j.profile_id,
                    });
                }
            );

            setAthleteResults(unified);
        } catch (e) {
            console.error(e);
        } finally {
            setAthleteSearching(false);
        }
    };

    const onAthleteInput = (val: string) => {
        setAthleteQuery(val);
        setAthleteOpen(true);
        setPendingAthlete(null);
        setNewTiempo("");
        clearTimeout(athleteDebounceRef.current);
        athleteDebounceRef.current = setTimeout(() => {
            void searchAthletes(val);
        }, 300);
    };

    // ── Add participant (solo perfiles / jugadores en BD, sin nombre libre) ──
    const handleAddFromProfile = async () => {
        if (!canAddSingleParticipant) {
            toast.error("No se puede agregar participantes en este estado del partido.");
            return;
        }
        if (!pendingAthlete) {
            toast.error("Busca y elige un deportista de la lista (cuenta o acta). No se admiten nombres a mano.");
            return;
        }
        const dup = participantes.some((ex) => {
            if (pendingAthlete.source === "profile" && ex.profile_id === pendingAthlete.id) return true;
            if (
                pendingAthlete.source === "jugador" &&
                pendingAthlete.realId != null &&
                ex.jugador_id === pendingAthlete.realId
            ) {
                return true;
            }
            return false;
        });
        if (dup) {
            toast.error("Ese deportista ya está en la lista de la prueba.");
            return;
        }
        const carrilNum = parseInt(newCarril.trim(), 10);
        if (!Number.isFinite(carrilNum) || carrilNum < 1 || carrilNum > 10) {
            toast.error("Indicá un carril entre 1 y 10.");
            return;
        }
        const timeTrim = newTiempo.trim();
        if (!timeTrim) {
            toast.error("Indicá el tiempo registrado en la prueba.");
            return;
        }
        if (!isValidTimeFormat(timeTrim)) {
            toast.error("Tiempo inválido. Usa mm:ss.xx o ss.xx (ej. 1:05.32 o 65.32).");
            return;
        }
        try {
            const newP = await participanteFromAthletePick(pendingAthlete, carrilNum);
            const withTime: Participante = {
                ...newP,
                carril: carrilNum,
                tiempo: timeTrim,
                tiempo_ms: parseTimeToMs(timeTrim),
                estado: "valid",
            };
            const updated = recalculateRanking([...ensureUniqueParticipantIds(participantes), withTime]);
            setParticipantes(updated);
            setPendingAthlete(null);
            setAthleteQuery("");
            setAthleteResults([]);
            setNewCarril("");
            setNewTiempo("");
            saveParticipantes(updated);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "No se pudo agregar el participante";
            toast.error(msg);
        }
    };

    // ── Remove participant ───────────────────────────────────────────────────
    const handleRemove = (id: string) => {
        if (!canRemoveParticipants) return;
        const row = participantes.find((p) => p.id === id);
        if (isFinalizado) {
            const label = row?.nombre?.trim() || "este participante";
            const ok = window.confirm(
                `¿Eliminar a "${label}" del resultado ya publicado?\n\nLa ficha pública se actualizará de inmediato. Esta acción no se puede deshacer desde aquí.`
            );
            if (!ok) return;
        }
        const safe = ensureUniqueParticipantIds(participantes);
        const updated = recalculateRanking(safe.filter((p) => p.id !== id));
        setParticipantes(updated);
        void saveParticipantes(updated);
        if (isFinalizado) {
            toast.success("Participante eliminado. Ranking actualizado y visible en la ficha pública.");
        }
    };

    // ── Load enrolled delegaciones ───────────────────────────────────────────
    const handleCargarInscritos = async () => {
        if (!canUsePreFinalizeTools) return;
        if (!disciplinaId) {
            toast.error('No se encontró la disciplina del partido');
            return;
        }
        setLoadingInscritos(true);
        try {
            let query = supabase
                .from('delegaciones')
                .select('id, nombre, carrera_ids')
                .eq('disciplina_id', disciplinaId)
                .not('carrera_ids', 'eq', '{}');
            if (genero) query = query.eq('genero', genero);

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) {
                toast.info('No hay delegaciones inscritas en esta disciplina');
                return;
            }

            // Only add delegaciones not already in the list
            const existingCarreras = new Set(participantes.map(p => p.carrera.toLowerCase()));
            const nuevos: Participante[] = data
                .filter((d: any) => !existingCarreras.has(d.nombre.toLowerCase()))
                .map((d: any) => ({
                    id: Math.random().toString(36).substring(2, 9),
                    nombre: '',
                    carrera: d.nombre,
                    estado: 'pending' as ParticipantStatus,
                    puntos: 0,
                }));

            if (nuevos.length === 0) {
                toast.info('Todos los inscritos ya están en la lista');
                return;
            }

            const updated = ensureUniqueParticipantIds([...participantes, ...nuevos]);
            setParticipantes(updated);
            saveParticipantes(updated);
            toast.success(
                `${nuevos.length} delegaciones cargadas como filas. Asigna cada nadador con el buscador de participantes (perfil o acta).`
            );
        } catch (e: any) {
            toast.error('Error cargando inscritos: ' + e.message);
        } finally {
            setLoadingInscritos(false);
        }
    };

    // ── Update field ─────────────────────────────────────────────────────────
    const handleChange = (id: string, field: keyof Participante, value: any) => {
        const row = participantes.find((x) => x.id === id);
        const recoveryRow = isFinalizado && row?.estado === "pending";
        if (isLocked && !recoveryRow && field !== "posicion") return;

        setParticipantes(prev => prev.map(p => {
            if (p.id !== id) return p;

            const updated = { ...p, [field]: value };

            // Auto-set estado based on time
            if (field === 'tiempo') {
                const timeStr = value as string;
                if (timeStr && timeStr.trim() !== '') {
                    updated.tiempo_ms = parseTimeToMs(timeStr);
                    if (updated.estado === 'pending') updated.estado = 'valid';
                } else {
                    updated.tiempo_ms = undefined;
                    if (updated.estado === 'valid') updated.estado = 'pending';
                }
            }

            // Clear time when setting DQ/DNS
            if (field === 'estado') {
                if (value === 'dq' || value === 'dns') {
                    updated.posicion = undefined;
                    updated.puntos = 0;
                }
            }

            return updated;
        }));
    };

    // ── Auto-rank by time ────────────────────────────────────────────────────
    const autoRankAndSave = () => {
        const ranked = recalculateRanking(ensureUniqueParticipantIds(participantes));
        setParticipantes(ranked);
        saveParticipantes(ranked);
        toast.success('Ranking recalculado automáticamente');
    };

    // ── Save to DB ───────────────────────────────────────────────────────────
    const saveParticipantes = async (data: Participante[]) => {
        setSaving(true);
        const rankedForSave = recalculateRanking(ensureUniqueParticipantIds(data));
        const forDb = sanitizeNatacionParticipantesForDb(rankedForSave);
        try {
            const { error } = await supabase
                .from('partidos')
                .update({
                    marcador_detalle: stampAudit({
                        ...stripHeadToHeadScoreKeysFromDetalle(detalle),
                        participantes: forDb,
                    }, profile)
                })
                .eq('id', matchId);

            if (error) {
                toast.error('Error guardando: ' + error.message);
            } else {
                if (isFinalizado) {
                    try {
                        const oldRanked = recalculateRanking(migrateRawRaceParticipantes(detalle.participantes));
                        const oldOps = podiumMedalOpsFromRanked(oldRanked);
                        const newOps = podiumMedalOpsFromRanked(forDb);
                        for (const op of oldOps) {
                            await removeMedal(op.carrera, op.carrera_id, op.tipo, op.puntos);
                        }
                        for (const op of newOps) {
                            await addMedal(op.carrera, op.carrera_id, op.tipo, op.puntos);
                        }
                    } catch (medalErr: unknown) {
                        console.error(medalErr);
                        const msg = medalErr instanceof Error ? medalErr.message : "error desconocido";
                        toast.error(
                            `Marcador guardado, pero falló la sincronización del medallero (${msg}). Revisá el medallero o volvé a guardar.`
                        );
                    }
                }
                if (onUpdate) onUpdate();
            }
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Save all (manual button) ─────────────────────────────────────────────
    const handleSaveAll = () => {
        // Validate times
        const invalidTimes = participantes.filter(p => p.tiempo && !isValidTimeFormat(p.tiempo));
        if (invalidTimes.length > 0) {
            toast.error(`Formato de tiempo inválido para: ${invalidTimes.map(p => p.nombre).join(', ')}. Usa mm:ss.xx o ss.xx`);
            return;
        }

        // Recalculate ranking, then save
        const ranked = recalculateRanking(ensureUniqueParticipantIds(participantes));
        setParticipantes(ranked);
        saveParticipantes(ranked);
        toast.success('Resultados guardados y ranking recalculado');
    };

    // ── Finalize race ────────────────────────────────────────────────────────
    const finalizeRace = async () => {
        const incomplete = incompleteNatacionRows(participantes);
        if (incomplete.length > 0) {
            const label = (p: Participante) => p.nombre?.trim() || p.carrera || "(sin nombre)";
            const sample = incomplete.slice(0, 8).map(label).join(", ");
            toast.error(
                `Faltan ${incomplete.length} resultado(s): tiempo válido (mm:ss.xx / ss.xx) o estado NSP/DQ. ` +
                    (sample ? `Ej.: ${sample}${incomplete.length > 8 ? "…" : ""}` : "")
            );
            return;
        }

        if (!confirm('¿Estás seguro de finalizar la prueba? Esto asignará medallas y puntos al medallero.')) return;

        setLoading(true);
        try {
            const coerced = coerceNatacionPendingWithValidTime(participantes);
            const needsCoerce = participantes.some(
                (p) =>
                    p.estado === "pending" &&
                    !!(p.tiempo || "").trim() &&
                    isValidTimeFormat((p.tiempo || "").trim())
            );
            if (needsCoerce) setParticipantes(coerced);
            // Recalculate final ranking
            const finalData = recalculateRanking(ensureUniqueParticipantIds(coerced));
            const finalForDb = sanitizeNatacionParticipantesForDb(finalData);

            // Save final state (Supabase no lanza si falla el UPDATE: hay que leer `error`.)
            const { data: updatedPartido, error: partidoErr } = await supabase
                .from("partidos")
                .update({
                    estado: "finalizado",
                    marcador_detalle: stampAudit(
                        {
                            ...stripHeadToHeadScoreKeysFromDetalle(detalle),
                            participantes: finalForDb,
                        },
                        profile
                    ),
                })
                .eq("id", matchId)
                .select("id, estado")
                .maybeSingle();
            if (partidoErr) {
                throw new Error(partidoErr.message);
            }
            if (!updatedPartido || updatedPartido.estado !== "finalizado") {
                throw new Error(
                    "No se pudo confirmar el partido como finalizado (0 filas actualizadas o permisos RLS). Revisá el id del partido o políticas en Supabase."
                );
            }

            // Assign medals to carreras
            const podium = finalForDb.filter(p => p.posicion && p.posicion <= 3 && p.estado === 'valid');
            for (const p of podium) {
                if (p.posicion === 1) await addMedal(p.carrera, p.carrera_id, 'oro', NATACION_PUNTOS[1] || 5);
                else if (p.posicion === 2) await addMedal(p.carrera, p.carrera_id, 'plata', NATACION_PUNTOS[2] || 3);
                else if (p.posicion === 3) await addMedal(p.carrera, p.carrera_id, 'bronce', NATACION_PUNTOS[3] || 1);
            }

            toast.success('¡Prueba finalizada y medallas asignadas!');
            if (onUpdate) onUpdate();
        } catch (e: any) {
            toast.error('Error al finalizar: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const addMedal = async (equipo: string, carreraId: number | undefined, tipo: 'oro' | 'plata' | 'bronce', puntosExtra: number) => {
        // Prefer carrera_id lookup (reliable), fall back to name matching
        let query = supabase.from('medallero').select('*');
        if (carreraId) {
            query = query.eq('carrera_id', carreraId) as any;
        } else {
            query = query.ilike('equipo_nombre', equipo) as any;
        }
        const { data: existing, error: selErr } = await (query as any).maybeSingle();
        if (selErr) throw new Error(selErr.message);

        if (existing) {
            const { error: upErr } = await supabase.from('medallero').update({
                [tipo]: (existing[tipo] as number || 0) + 1,
                puntos: (existing.puntos || 0) + puntosExtra,
                updated_at: new Date().toISOString()
            }).eq('id', existing.id);
            if (upErr) throw new Error(upErr.message);
        } else {
            const { error: insErr } = await supabase.from('medallero').insert({
                equipo_nombre: equipo,
                carrera_id: carreraId ?? null,
                [tipo]: 1,
                puntos: puntosExtra
            });
            if (insErr) throw new Error(insErr.message);
        }
    };

    /** Inverso de addMedal: corrige medallero cuando el podio de una prueba ya finalizada cambia al guardar. */
    const removeMedal = async (equipo: string, carreraId: number | undefined, tipo: 'oro' | 'plata' | 'bronce', puntosExtra: number) => {
        let query = supabase.from('medallero').select('*');
        if (carreraId) {
            query = query.eq('carrera_id', carreraId) as any;
        } else {
            query = query.ilike('equipo_nombre', equipo) as any;
        }
        const { data: existing } = await (query as any).maybeSingle();
        if (!existing) return;
        const nextMedal = Math.max(0, (existing[tipo] as number || 0) - 1);
        const nextPuntos = Math.max(0, (existing.puntos || 0) - puntosExtra);
        await supabase.from('medallero').update({
            [tipo]: nextMedal,
            puntos: nextPuntos,
            updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
    };

    // ── Summary stats ────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const valid = participantes.filter(p => p.estado === 'valid').length;
        const pending = participantes.filter(p => p.estado === 'pending').length;
        const dq = participantes.filter(p => p.estado === 'dq').length;
        const dns = participantes.filter(p => p.estado === 'dns').length;
        const blocking = incompleteNatacionRows(participantes).length;
        return { valid, pending, dq, dns, total: participantes.length, blocking };
    }, [participantes]);

    // ── Event metadata ───────────────────────────────────────────────────────
    const eventMeta = useMemo(() => {
        const parts: string[] = [];
        if (detalle.distancia) parts.push(detalle.distancia);
        if (detalle.estilo) parts.push(detalle.estilo);
        if (detalle.serie) parts.push(`Serie ${detalle.serie}`);
        return parts.join(' · ');
    }, [detalle]);

    const categoriaLabel: Record<string, string> = {
        principiante: 'Principiante',
        intermedio: 'Intermedio',
        avanzado: 'Avanzado',
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Card className="p-0 bg-background border-white/10 overflow-visible">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-cyan-500/20 rounded-xl text-cyan-400">
                            <Timer size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Control de Prueba</h3>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                {eventMeta && (
                                    <p className="text-sm text-cyan-400/80 font-medium">{eventMeta}</p>
                                )}
                                {categoria && (
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 border border-lime-500/30">
                                        {categoriaLabel[categoria] ?? categoria}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {(canUsePreFinalizeTools || canSaveMarcador) && (
                        <div className="flex gap-2 flex-wrap justify-end">
                            {canUsePreFinalizeTools && disciplinaId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCargarInscritos}
                                    disabled={loadingInscritos || saving}
                                    className="border-violet-500/30 hover:bg-violet-500/10 text-violet-300 text-xs"
                                >
                                    <Download size={14} className="mr-1.5" />
                                    {loadingInscritos ? 'Cargando...' : 'Cargar inscritos'}
                                </Button>
                            )}
                            {canUsePreFinalizeTools && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={autoRankAndSave}
                                    disabled={saving}
                                    className="border-white/10 hover:bg-white/5 text-xs"
                                >
                                    <ArrowDown01 size={14} className="mr-1.5" /> Auto Ranking
                                </Button>
                            )}
                            {canSaveMarcador && (
                                <Button
                                    size="sm"
                                    onClick={handleSaveAll}
                                    disabled={saving}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white border-none text-xs"
                                >
                                    <Save size={14} className="mr-1.5" /> Guardar
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400">{stats.total} participantes</span>
                    {stats.valid > 0 && <span className="text-emerald-400">{stats.valid} con tiempo</span>}
                    {stats.pending > 0 && <span className="text-yellow-400">{stats.pending} pendientes</span>}
                    {stats.blocking > 0 && (
                        <span className="text-amber-400">
                            {stats.blocking} sin cerrar (tiempo o NSP/DQ)
                        </span>
                    )}
                    {stats.dq > 0 && <span className="text-red-400">{stats.dq} DQ</span>}
                    {stats.dns > 0 && <span className="text-slate-500">{stats.dns} NSP</span>}
                </div>
                {isLocked && isFinalizado && (
                    <p className="mt-3 text-[11px] text-amber-300/90 leading-relaxed max-w-3xl">
                        Prueba finalizada: podés usar la papelera para quitar duplicados, o el buscador más abajo para volver a incorporar a alguien (fila en Pendiente: tiempo, carril y estado; luego Guardar). El ranking se recalcula y la vista pública se actualiza.
                    </p>
                )}
            </div>

            {/* Participant List */}
            <div className="p-3 md:p-4 space-y-2">
                {/* Column headers — desktop only */}
                <div className="hidden md:grid md:grid-cols-[44px_1.5fr_1.5fr_60px_116px_106px_40px] gap-2 px-3 py-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    <div className="text-center">Pos</div>
                    <div>Nadador</div>
                    <div>Carrera</div>
                    <div className="text-center">Carril</div>
                    <div className="text-right">Tiempo</div>
                    <div className="text-center">Estado</div>
                    <div></div>
                </div>

                {participantes.map((p) => {
                    const statusCfg = STATUS_CONFIG[p.estado] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;
                    const isPodium = p.estado === 'valid' && p.posicion && p.posicion <= 3;
                    const isInvalid = p.estado === 'dq' || p.estado === 'dns';
                    const recoveryRow = isFinalizado && p.estado === "pending";
                    const rowCellsLocked = isLocked && !recoveryRow;

                    const rowBg = cn(
                        "rounded-xl border transition-all",
                        isPodium && p.posicion === 1 ? "bg-gradient-to-r from-yellow-500/15 to-transparent border-yellow-500/25 shadow-[0_0_15px_rgba(234,179,8,0.1)]" :
                        isPodium && p.posicion === 2 ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/20" :
                        isPodium && p.posicion === 3 ? "bg-gradient-to-r from-orange-700/10 to-transparent border-orange-600/20" :
                        isInvalid ? "bg-red-950/20 border-white/5 opacity-60" :
                        "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                    );

                    /* ── Shared cells ─────────────────────────────────────── */
                    const posCell = (
                        <div className="w-10 shrink-0 flex items-center justify-center">
                            {isPodium ? (
                                <span className="text-xl leading-none">
                                    {p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : '🥉'}
                                </span>
                            ) : isInvalid ? (
                                <span className="text-xs text-slate-600">—</span>
                            ) : (
                                <span className="text-sm font-bold text-white/40">{p.posicion ?? '-'}</span>
                            )}
                        </div>
                    );

                    const athleteCell = (
                        <div className={cn("min-w-0 flex-1", isInvalid && "opacity-60")}>
                            {rowCellsLocked ? (
                                p.profile_id ? (
                                    <Link href={`/perfil/${p.profile_id}`} className="group/link flex items-center gap-1.5 hover:text-cyan-300 transition-colors">
                                        <span className={cn("font-semibold text-white text-sm truncate", isInvalid && "line-through")}>{p.nombre}</span>
                                        <ExternalLink size={10} className="text-cyan-500/50 group-hover/link:text-cyan-400 shrink-0" />
                                    </Link>
                                ) : (
                                    <span className={cn("font-semibold text-white text-sm truncate block", isInvalid && "line-through")}>{p.nombre}</span>
                                )
                            ) : p.profile_id || p.jugador_id ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="min-w-0 flex-1 text-white font-semibold text-sm truncate py-0.5" title="Vinculado a perfil o acta — agrega otro con el buscador arriba">
                                        {p.nombre}
                                    </span>
                                    {p.profile_id && (
                                        <Link href={`/perfil/${p.profile_id}`} target="_blank" className="text-cyan-500/40 hover:text-cyan-400 shrink-0 p-0.5">
                                            <ExternalLink size={11} />
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        value={p.nombre}
                                        onChange={(e) => handleChange(p.id, 'nombre', e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-dashed border-white/20 focus:border-cyan-500/50 transition-colors truncate py-0.5"
                                        placeholder="Nombre (dato antiguo; preferir quitar y volver a agregar con buscador)"
                                    />
                                </div>
                            )}
                        </div>
                    );

                    const carreraCell = (
                        <div className="min-w-0">
                            {rowCellsLocked ? (
                                p.carrera_id ? (
                                    <Link href={`/carrera/${p.carrera_id}`} className="text-xs text-cyan-500/70 hover:text-cyan-400 truncate block transition-colors">
                                        {p.carrera}
                                    </Link>
                                ) : (
                                    <span className="text-xs text-slate-400 truncate block">{p.carrera}</span>
                                )
                            ) : (
                                <div className="flex items-center gap-1">
                                    <select
                                        value={p.carrera}
                                        onChange={(e) => handleChange(p.id, 'carrera', e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-xs text-slate-300 focus:outline-none border-none cursor-pointer"
                                    >
                                        <option value="" className="bg-zinc-900">Seleccionar...</option>
                                        {CARRERAS_UNINORTE.map(c => (
                                            <option key={c} value={c} className="bg-zinc-900">{c}</option>
                                        ))}
                                    </select>
                                    {p.carrera_id && (
                                        <Link href={`/carrera/${p.carrera_id}`} target="_blank" className="text-cyan-500/40 hover:text-cyan-400 shrink-0 p-0.5">
                                            <ExternalLink size={11} />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    );

                    const carrilCell = (
                        rowCellsLocked ? (
                            <span className="text-xs text-slate-500 tabular-nums">{p.carril ?? '-'}</span>
                        ) : (
                            <input
                                type="number"
                                value={p.carril || ''}
                                onChange={(e) => handleChange(p.id, 'carril', parseInt(e.target.value) || undefined)}
                                className="w-full bg-transparent text-center text-sm text-slate-300 focus:outline-none py-0.5"
                                placeholder="#"
                                min={1}
                                max={10}
                            />
                        )
                    );

                    const tiempoCell = (
                        rowCellsLocked ? (
                            <span className={cn(
                                "font-mono font-bold text-sm tabular-nums",
                                isInvalid ? "text-slate-600 line-through" :
                                isPodium ? "text-cyan-300" : "text-cyan-400/80"
                            )}>
                                {p.tiempo || (isInvalid ? '—' : '--:--.--')}
                            </span>
                        ) : (
                            <input
                                value={p.tiempo || ''}
                                onChange={(e) => handleChange(p.id, 'tiempo', e.target.value)}
                                className={cn(
                                    "w-full bg-transparent font-mono font-bold text-sm focus:outline-none tabular-nums border-b border-transparent focus:border-cyan-500/50 transition-colors py-0.5",
                                    p.tiempo && !isValidTimeFormat(p.tiempo) ? "text-red-400" : "text-cyan-400",
                                    isInvalid && "text-slate-600 cursor-not-allowed"
                                )}
                                placeholder="ss.xx"
                                disabled={isInvalid}
                            />
                        )
                    );

                    const estadoCell = (
                        rowCellsLocked ? (
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border",
                                statusCfg.color
                            )}>
                                <StatusIcon size={10} />
                                {statusCfg.label}
                            </span>
                        ) : (
                            <select
                                value={p.estado}
                                onChange={(e) => handleChange(p.id, 'estado', e.target.value as ParticipantStatus)}
                                className={cn(
                                    "w-full bg-transparent text-[10px] font-bold uppercase focus:outline-none cursor-pointer text-center rounded px-1 py-1 border",
                                    statusCfg.color
                                )}
                            >
                                <option value="pending" className="bg-zinc-900 text-yellow-400">Pendiente</option>
                                <option value="valid" className="bg-zinc-900 text-emerald-400">Válido</option>
                                <option value="dns" className="bg-zinc-900 text-slate-400">NSP</option>
                                <option value="dq" className="bg-zinc-900 text-red-400">DQ</option>
                            </select>
                        )
                    );

                    const deleteCell = (
                        <div className="flex justify-center items-center gap-1">
                            {canRemoveParticipants ? (
                                <button
                                    type="button"
                                    title={rowCellsLocked ? "Quitar fila (duplicado o error)" : "Eliminar participante"}
                                    onClick={() => handleRemove(p.id)}
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                                >
                                    <Trash2 size={14} />
                                </button>
                            ) : isPodium ? (
                                <Medal size={14} className={cn(
                                    p.posicion === 1 ? "text-yellow-400" :
                                    p.posicion === 2 ? "text-slate-400" : "text-orange-600"
                                )} />
                            ) : null}
                        </div>
                    );

                    return (
                        <div key={p.id} className={rowBg}>
                            {/* ── Mobile layout ───────────────────────────── */}
                            <div className="md:hidden p-3 space-y-2">
                                {/* Row 1: pos + name + delete */}
                                <div className="flex items-center gap-2">
                                    {posCell}
                                    {athleteCell}
                                    {deleteCell}
                                </div>
                                {/* Row 2: carrera + carril */}
                                <div className="flex items-center gap-2 pl-11">
                                    <div className="flex-1 min-w-0">{carreraCell}</div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-slate-600 uppercase tracking-wider">C</span>
                                        <div className="w-10 text-center">{carrilCell}</div>
                                    </div>
                                </div>
                                {/* Row 3: tiempo + estado */}
                                <div className="flex items-center gap-2 pl-11">
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-[10px] text-slate-600 uppercase tracking-wider shrink-0">T</span>
                                        <div className="flex-1 text-right">{tiempoCell}</div>
                                    </div>
                                    <div className="w-28 shrink-0 text-center">{estadoCell}</div>
                                </div>
                            </div>

                            {/* ── Desktop layout ──────────────────────────── */}
                            <div className="hidden md:grid md:grid-cols-[44px_1.5fr_1.5fr_60px_116px_106px_40px] gap-2 items-center p-3">
                                {posCell}
                                {athleteCell}
                                {carreraCell}
                                <div className="text-center">{carrilCell}</div>
                                <div className="text-right">{tiempoCell}</div>
                                <div className="text-center">{estadoCell}</div>
                                {deleteCell}
                            </div>
                        </div>
                    );
                })}

                {participantes.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-sm italic">
                        No hay participantes registrados aún
                    </div>
                )}
            </div>

            {/* Add participant: búsqueda en perfiles / jugadores (sin nombre libre) */}
            {canAddSingleParticipant && (
                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Plus size={10} /> Agregar participante
                    </p>
                    {isFinalizado && (
                        <p className="text-[10px] text-amber-200/90 mb-2 leading-relaxed">
                            Corrección con prueba cerrada: al añadir, cargá carril y tiempo aquí; pulsá Guardar arriba si solo ajustás filas ya en la lista.
                        </p>
                    )}
                    <p className="text-[10px] text-slate-600 mb-3">
                        Busca por nombre (perfil o acta). Con la persona elegida, completá carril (1–10) y tiempo antes de Añadir. Formato de tiempo: mm:ss.xx o ss.xx.
                    </p>
                    <p className="text-[10px] text-slate-500 mb-3 leading-relaxed border border-white/5 rounded-lg px-3 py-2 bg-white/[0.02]">
                        <span className="text-slate-400 font-semibold">¿Carreras fuera del listado olímpico o sin cuenta en la app?</span> La búsqueda usa la tabla{" "}
                        <span className="text-slate-300">jugadores</span> (actas), no solo perfiles. Si no sale nadie, creá la ficha en{" "}
                        <Link href="/admin/jugadores" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                            Admin → Jugadores
                        </Link>{" "}
                        con su <span className="text-slate-300">programa real</span> (ej. Enfermería) y, si podés, disciplina Natación y género acorde a esta prueba; después volvé a buscar acá. Si ese programa no aparece en el desplegable del formulario, falta en el catálogo <span className="text-slate-400">carreras</span> de la base: hay que agregarlo allí (migración o SQL) como hicimos con Enfermería.
                    </p>
                    {pendingAthlete && (
                        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <Avatar
                                src={pendingAthlete.avatar_url ?? undefined}
                                name={pendingAthlete.full_name}
                                size="sm"
                                className="w-8 h-8 rounded-lg shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{pendingAthlete.full_name}</p>
                                <p className="text-[10px] text-cyan-300/80 truncate">
                                    {pendingAthlete.carrera?.nombre ?? "Sin carrera en datos"}
                                    <span className="text-white/30"> · {pendingAthlete.badge}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setPendingAthlete(null);
                                    setNewTiempo("");
                                }}
                                className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10"
                                aria-label="Quitar selección"
                            >
                                <span className="sr-only">Quitar</span>×
                            </button>
                        </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                        <div ref={athleteSearchRef} className="relative z-20 min-w-0 w-full sm:flex-1 sm:min-w-[12rem]">
                            <div className="flex items-center gap-2 h-9 bg-zinc-900/80 border border-white/10 rounded-lg px-2.5 focus-within:border-cyan-500/50">
                                {athleteSearching ? (
                                    <Loader2 size={14} className="text-zinc-500 animate-spin shrink-0" />
                                ) : (
                                    <Search size={14} className="text-zinc-500 shrink-0" />
                                )}
                                <input
                                    type="text"
                                    value={athleteQuery}
                                    onChange={(e) => onAthleteInput(e.target.value)}
                                    onFocus={() => {
                                        if (athleteQuery) setAthleteOpen(true);
                                    }}
                                    placeholder="Buscar deportista (nombre)…"
                                    className="flex-1 min-w-0 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none"
                                />
                            </div>
                            {athleteOpen && athleteResults.length > 0 && (
                                <div className="absolute z-[200] bottom-full left-0 right-0 mb-1 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-[#0f0f1a] shadow-xl ring-1 ring-white/10">
                                    {athleteResults.map((r) => (
                                        <button
                                            key={`${r.source}-${r.id}`}
                                            type="button"
                                            onClick={() => {
                                                setPendingAthlete(r);
                                                setAthleteQuery(r.full_name);
                                                setAthleteOpen(false);
                                                setAthleteResults([]);
                                                setNewTiempo("");
                                            }}
                                            className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-white/5"
                                        >
                                            <Avatar
                                                src={r.avatar_url ?? undefined}
                                                name={r.full_name}
                                                size="sm"
                                                className="w-7 h-7 rounded-md shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-white truncate">{r.full_name}</p>
                                                <p className="text-[9px] text-zinc-500 truncate">
                                                    {r.carrera?.nombre ?? "—"} · {r.badge}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {athleteOpen && !athleteSearching && athleteQuery.trim() && athleteResults.length === 0 && (
                                <div className="absolute z-[200] bottom-full left-0 right-0 mb-1 rounded-lg border border-white/10 bg-[#0f0f1a] px-3 py-2 text-[10px] text-zinc-500 ring-1 ring-white/10">
                                    Sin resultados. El deportista debe existir en perfiles o en actas (tabla jugadores).
                                </div>
                            )}
                        </div>
                        <Input
                            placeholder="Carril"
                            type="number"
                            value={newCarril}
                            onChange={(e) => setNewCarril(e.target.value)}
                            className="w-full sm:w-20 bg-zinc-900/80 border-white/10 h-9 text-xs text-center"
                            min={1}
                            max={10}
                            title="Carril 1–10"
                        />
                        <Input
                            placeholder="Tiempo (mm:ss.xx)"
                            value={newTiempo}
                            onChange={(e) => setNewTiempo(e.target.value)}
                            className="w-full sm:w-32 min-w-0 bg-zinc-900/80 border-white/10 h-9 text-xs font-mono text-center text-cyan-200"
                            inputMode="decimal"
                            title="Tiempo oficial de la prueba"
                        />
                        <Button
                            type="button"
                            onClick={() => void handleAddFromProfile()}
                            disabled={
                                !pendingAthlete ||
                                saving ||
                                !newCarril.trim() ||
                                !newTiempo.trim()
                            }
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white border-none h-9 px-4"
                        >
                            <Plus size={16} className="mr-1" /> Añadir
                        </Button>
                    </div>
                </div>
            )}

            {/* Finalize Button */}
            {canUsePreFinalizeTools && participantes.length > 0 && (
                <div className="p-4 border-t border-white/5">
                    <Button
                        onClick={finalizeRace}
                        disabled={loading || stats.blocking > 0}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white border-none h-11 font-bold text-sm shadow-lg shadow-emerald-900/30"
                    >
                        <Trophy size={18} className="mr-2" />
                        {stats.blocking > 0
                            ? `Faltan ${stats.blocking} por cerrar — tiempo válido o NSP/DQ`
                            : 'Finalizar Prueba y Asignar Medallas'
                        }
                    </Button>
                </div>
            )}
        </Card>
    );
}

// ── Ranking Logic ────────────────────────────────────────────────────────────

function recalculateRanking(participantes: Participante[]): Participante[] {
    // Split into valid (with time) and invalid (DQ, DNS, pending)
    const validWithTime = participantes
        .filter(p => p.estado === 'valid' && p.tiempo && p.tiempo.trim() !== '')
        .map(p => ({
            ...p,
            tiempo_ms: parseTimeToMs(p.tiempo),
        }));

    const validNoTime = participantes.filter(p => p.estado === 'valid' && (!p.tiempo || p.tiempo.trim() === ''));
    const pending = participantes.filter(p => p.estado === 'pending');
    const invalid = participantes.filter(p => p.estado === 'dq' || p.estado === 'dns');

    // Sort valid participants by time (ascending = fastest first)
    validWithTime.sort((a, b) => a.tiempo_ms - b.tiempo_ms);

    // Assign positions and points
    const ranked = validWithTime.map((p, idx) => ({
        ...p,
        posicion: idx + 1,
        puntos: NATACION_PUNTOS[idx + 1] || 0,
    }));

    // No-time valid participants get position after ranked
    const nextPos = ranked.length + 1;
    const unrankedValid = validNoTime.map((p, idx) => ({
        ...p,
        posicion: nextPos + idx,
        puntos: 0,
    }));

    // Pending participants keep no position
    const pendingFixed = pending.map(p => ({
        ...p,
        posicion: undefined,
        puntos: 0,
    }));

    // Invalid participants get no position
    const invalidFixed = invalid.map(p => ({
        ...p,
        posicion: undefined,
        puntos: 0,
    }));

    return [...ranked, ...unrankedValid, ...pendingFixed, ...invalidFixed];
}
