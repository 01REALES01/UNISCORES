"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, Medal, Trophy, Timer, ArrowDown01, CheckCircle2, AlertTriangle, Ban, Clock, GraduationCap, Download, ExternalLink } from "lucide-react";
import { Button, Input, Badge, Card } from "@/components/ui-primitives";
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

type RaceControlProps = {
    matchId: string | number;
    detalle: any;
    onUpdate: () => void;
    isLocked?: boolean;
    profile?: Profile | null;
    disciplinaId?: number | null;
    genero?: string | null;
    categoria?: string | null;
};

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ParticipantStatus, { label: string; color: string; icon: any }> = {
    valid: { label: 'Válido', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    pending: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
    dns: { label: 'NSP', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Ban },
    dq: { label: 'DQ', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
};

// ── Component ────────────────────────────────────────────────────────────────

export function RaceControl({ matchId, detalle, onUpdate, isLocked = false, profile, disciplinaId, genero, categoria }: RaceControlProps) {
    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [newCarrera, setNewCarrera] = useState("");
    const [newNombre, setNewNombre] = useState("");
    const [newCarril, setNewCarril] = useState("");
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingInscritos, setLoadingInscritos] = useState(false);

    // Initialize from detalle
    useEffect(() => {
        const raw = detalle.participantes || [];
        // Migrate old data that might not have 'estado' or 'carrera'
        const migrated = raw.map((p: any) => ({
            ...p,
            estado: p.estado || (p.tiempo ? 'valid' : 'pending'),
            carrera: p.carrera || p.equipo || '',
        }));
        setParticipantes(migrated);
    }, [detalle]);

    // ── Add participant ──────────────────────────────────────────────────────
    const handleAdd = () => {
        if (!newCarrera || !newNombre.trim()) {
            toast.error('Selecciona carrera e ingresa nombre del nadador');
            return;
        }

        const newP: Participante = {
            id: Math.random().toString(36).substring(2, 9),
            nombre: newNombre.trim(),
            carrera: newCarrera,
            carril: newCarril ? parseInt(newCarril) : undefined,
            tiempo: '',
            estado: 'pending',
            posicion: undefined,
            puntos: 0,
        };

        const updated = [...participantes, newP];
        setParticipantes(updated);
        setNewNombre('');
        setNewCarrera('');
        setNewCarril('');
        saveParticipantes(updated);
    };

    // ── Remove participant ───────────────────────────────────────────────────
    const handleRemove = (id: string) => {
        if (isLocked) return;
        const updated = participantes.filter(p => p.id !== id);
        setParticipantes(updated);
        saveParticipantes(updated);
    };

    // ── Load enrolled delegaciones ───────────────────────────────────────────
    const handleCargarInscritos = async () => {
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

            const updated = [...participantes, ...nuevos];
            setParticipantes(updated);
            saveParticipantes(updated);
            toast.success(`${nuevos.length} delegaciones cargadas. Completa los nombres.`);
        } catch (e: any) {
            toast.error('Error cargando inscritos: ' + e.message);
        } finally {
            setLoadingInscritos(false);
        }
    };

    // ── Update field ─────────────────────────────────────────────────────────
    const handleChange = (id: string, field: keyof Participante, value: any) => {
        if (isLocked && field !== 'posicion') return;

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
        const ranked = recalculateRanking(participantes);
        setParticipantes(ranked);
        saveParticipantes(ranked);
        toast.success('Ranking recalculado automáticamente');
    };

    // ── Save to DB ───────────────────────────────────────────────────────────
    const saveParticipantes = async (data: Participante[]) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('partidos')
                .update({
                    marcador_detalle: stampAudit({
                        ...detalle,
                        participantes: data,
                    }, profile)
                })
                .eq('id', matchId);

            if (error) {
                toast.error('Error guardando: ' + error.message);
            } else if (onUpdate) {
                onUpdate();
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
        const ranked = recalculateRanking(participantes);
        setParticipantes(ranked);
        saveParticipantes(ranked);
        toast.success('Resultados guardados y ranking recalculado');
    };

    // ── Finalize race ────────────────────────────────────────────────────────
    const finalizeRace = async () => {
        // Validate all participants have results
        const pending = participantes.filter(p => p.estado === 'pending');
        if (pending.length > 0) {
            toast.error(`Hay ${pending.length} participante(s) pendientes. Registra su tiempo o márcalos como NSP/DQ.`);
            return;
        }

        if (!confirm('¿Estás seguro de finalizar la prueba? Esto asignará medallas y puntos al medallero.')) return;

        setLoading(true);
        try {
            // Recalculate final ranking
            const finalData = recalculateRanking(participantes);

            // Save final state
            await supabase.from('partidos').update({
                estado: 'finalizado',
                marcador_detalle: stampAudit({
                    ...detalle,
                    participantes: finalData,
                }, profile)
            }).eq('id', matchId);

            // Assign medals to carreras
            const podium = finalData.filter(p => p.posicion && p.posicion <= 3 && p.estado === 'valid');
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
        const { data: existing } = await (query as any).maybeSingle();

        if (existing) {
            await supabase.from('medallero').update({
                [tipo]: (existing[tipo] as number || 0) + 1,
                puntos: (existing.puntos || 0) + puntosExtra,
                updated_at: new Date().toISOString()
            }).eq('id', existing.id);
        } else {
            await supabase.from('medallero').insert({
                equipo_nombre: equipo,
                carrera_id: carreraId ?? null,
                [tipo]: 1,
                puntos: puntosExtra
            });
        }
    };

    // ── Summary stats ────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const valid = participantes.filter(p => p.estado === 'valid').length;
        const pending = participantes.filter(p => p.estado === 'pending').length;
        const dq = participantes.filter(p => p.estado === 'dq').length;
        const dns = participantes.filter(p => p.estado === 'dns').length;
        return { valid, pending, dq, dns, total: participantes.length };
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
        <Card className="p-0 bg-background border-white/10 overflow-hidden">
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
                    {!isLocked && (
                        <div className="flex gap-2 flex-wrap justify-end">
                            {disciplinaId && (
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={autoRankAndSave}
                                disabled={saving}
                                className="border-white/10 hover:bg-white/5 text-xs"
                            >
                                <ArrowDown01 size={14} className="mr-1.5" /> Auto Ranking
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white border-none text-xs"
                            >
                                <Save size={14} className="mr-1.5" /> Guardar
                            </Button>
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400">{stats.total} participantes</span>
                    {stats.valid > 0 && <span className="text-emerald-400">{stats.valid} con tiempo</span>}
                    {stats.pending > 0 && <span className="text-yellow-400">{stats.pending} pendientes</span>}
                    {stats.dq > 0 && <span className="text-red-400">{stats.dq} DQ</span>}
                    {stats.dns > 0 && <span className="text-slate-500">{stats.dns} NSP</span>}
                </div>
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
                            {isLocked ? (
                                p.profile_id ? (
                                    <Link href={`/perfil/${p.profile_id}`} className="group/link flex items-center gap-1.5 hover:text-cyan-300 transition-colors">
                                        <span className={cn("font-semibold text-white text-sm truncate", isInvalid && "line-through")}>{p.nombre}</span>
                                        <ExternalLink size={10} className="text-cyan-500/50 group-hover/link:text-cyan-400 shrink-0" />
                                    </Link>
                                ) : (
                                    <span className={cn("font-semibold text-white text-sm truncate block", isInvalid && "line-through")}>{p.nombre}</span>
                                )
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        value={p.nombre}
                                        onChange={(e) => handleChange(p.id, 'nombre', e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none border-b border-transparent focus:border-cyan-500/50 transition-colors truncate py-0.5"
                                        placeholder="Nombre del nadador"
                                    />
                                    {p.profile_id && (
                                        <Link href={`/perfil/${p.profile_id}`} target="_blank" className="text-cyan-500/40 hover:text-cyan-400 shrink-0 p-0.5">
                                            <ExternalLink size={11} />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    );

                    const carreraCell = (
                        <div className="min-w-0">
                            {isLocked ? (
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
                        isLocked ? (
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
                        isLocked ? (
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
                        isLocked ? (
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
                        <div className="flex justify-center">
                            {!isLocked ? (
                                <button
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

            {/* Add Participant Form */}
            {!isLocked && (
                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Plus size={10} /> Agregar Participante
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* 1. Carrera FIRST */}
                        <div className="relative flex-1">
                            <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                            <select
                                value={newCarrera}
                                onChange={(e) => setNewCarrera(e.target.value)}
                                className="w-full h-9 bg-zinc-900/80 border border-white/10 rounded-lg pl-8 pr-2 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
                            >
                                <option value="" disabled>1. Carrera...</option>
                                {CARRERAS_UNINORTE.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {/* 2. Name SECOND */}
                        <Input
                            placeholder="2. Nombre del Nadador"
                            value={newNombre}
                            onChange={(e) => setNewNombre(e.target.value)}
                            disabled={!newCarrera}
                            className={cn(
                                "flex-1 bg-zinc-900/80 border-white/10 h-9 text-xs",
                                !newCarrera && "opacity-40 cursor-not-allowed"
                            )}
                        />
                        <Input
                            placeholder="Carril"
                            type="number"
                            value={newCarril}
                            onChange={(e) => setNewCarril(e.target.value)}
                            className="w-20 bg-zinc-900/80 border-white/10 h-9 text-xs text-center"
                            min={1}
                            max={10}
                        />
                        <Button
                            onClick={handleAdd}
                            disabled={!newCarrera || !newNombre.trim()}
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white border-none h-9 px-4"
                        >
                            <Plus size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {/* Finalize Button */}
            {!isLocked && participantes.length > 0 && (
                <div className="p-4 border-t border-white/5">
                    <Button
                        onClick={finalizeRace}
                        disabled={loading || stats.pending > 0}
                        className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white border-none h-11 font-bold text-sm shadow-lg shadow-emerald-900/30"
                    >
                        <Trophy size={18} className="mr-2" />
                        {stats.pending > 0
                            ? `Hay ${stats.pending} pendiente(s) — registra resultados primero`
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
