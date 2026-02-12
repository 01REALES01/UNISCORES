"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Medal, Trophy, Timer, ArrowDown01, CheckCircle2 } from "lucide-react";
import { Button, Input, Badge, Card } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Participante = {
    id: string; // uuid o random string
    nombre: string;
    equipo: string; // Facultad/Delegación
    carril?: number;
    tiempo?: string; // "10.55"
    posicion?: number; // 1, 2, 3...
    puntos?: number;
};

type RaceControlProps = {
    matchId: string | number;
    detalle: any;
    onUpdate: () => void;
    isLocked?: boolean;
};

export function RaceControl({ matchId, detalle, onUpdate, isLocked = false }: RaceControlProps) {
    // Si no hay participantes, inicializar vacío
    const [participantes, setParticipantes] = useState<Participante[]>(detalle.participantes || []);
    const [newItem, setNewItem] = useState({ nombre: "", equipo: "", carril: "" });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Sincronizar estado local si detalle cambia externamente
    useEffect(() => {
        if (detalle.participantes) {
            setParticipantes(detalle.participantes);
        }
    }, [detalle]);

    const handleAdd = () => {
        if (!newItem.nombre || !newItem.equipo) return;

        const newP: Participante = {
            id: Math.random().toString(36).substring(7),
            nombre: newItem.nombre,
            equipo: newItem.equipo,
            carril: newItem.carril ? parseInt(newItem.carril) : undefined,
            tiempo: "",
            posicion: undefined
        };

        const updated = [...participantes, newP];
        setParticipantes(updated);
        setNewItem({ nombre: "", equipo: "", carril: "" });
        saveChanges(updated);
    };

    const handleRemove = (id: string) => {
        if (isLocked) return;
        const updated = participantes.filter(p => p.id !== id);
        setParticipantes(updated);
        saveChanges(updated);
    };

    const handleChange = (id: string, field: keyof Participante, value: any) => {
        if (isLocked) return;
        const updated = participantes.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        );
        setParticipantes(updated);
    };

    const saveChanges = async (newData: Participante[]) => {
        setSaving(true);
        const { error } = await supabase
            .from('partidos')
            .update({
                marcador_detalle: {
                    ...detalle,
                    participantes: newData
                }
            })
            .eq('id', matchId);

        if (!error && onUpdate) onUpdate();
        setSaving(false);
    };

    const autoSort = () => {
        // Ordenar por tiempo (ascendente) si hay tiempos
        // Asume formato MM:SS.ms o SS.ms como string comparable si es consistente
        // Mejor estrategia: Ordenar por posición explícita si existe, si no por tiempo
        const sorted = [...participantes].sort((a, b) => {
            // Prioridad 1: Posición manual
            if (a.posicion && b.posicion) return a.posicion - b.posicion;
            if (a.posicion) return -1;
            if (b.posicion) return 1;

            // Prioridad 2: Tiempo (intento de parseo simple o string compare)
            if (a.tiempo && b.tiempo) return a.tiempo.localeCompare(b.tiempo);

            return 0;
        });

        // Auto-asignar posiciones basado en el orden de la lista visual
        const reindexed = sorted.map((p, idx) => ({ ...p, posicion: idx + 1 }));
        setParticipantes(reindexed);
        saveChanges(reindexed);
    };

    // Función mágica: Finalizar y Asignar Puntos
    const finalizeRace = async () => {
        if (!confirm("¿Estás seguro de finalizar la prueba? Esto asignará medallas y puntos al medallero general.")) return;

        setLoading(true);

        try {
            // 1. Guardar estado final del partido
            await supabase.from('partidos').update({ estado: 'finalizado' }).eq('id', matchId);

            // 2. Ordenar participantes por posición (1, 2, 3...)
            const ganadores = participantes.filter(p => p.posicion && p.posicion <= 3).sort((a, b) => a.posicion! - b.posicion!);

            // 3. Asignar Medallas
            for (const p of ganadores) {
                if (p.posicion === 1) await addMedal(p.equipo, 'oro', 5);
                else if (p.posicion === 2) await addMedal(p.equipo, 'plata', 3);
                else if (p.posicion === 3) await addMedal(p.equipo, 'bronce', 1);
            }

            alert("¡Prueba finalizada y medallas asignadas!");
            window.location.reload(); // Recargar para ver estado finalizado
        } catch (e) {
            console.error(e);
            alert("Error al finalizar prueba");
        } finally {
            setLoading(false);
        }
    };

    const addMedal = async (equipo: string, tipo: 'oro' | 'plata' | 'bronce', puntosExtra: number) => {
        // Llamada RPC o update manual. Haremos update manual con select primero por simplicidad.
        // Ojo: En producción usar una RPC (stored procedure) es más seguro para concurrencia.

        // 1. Verificar si existe equipo en medallero (case insensitive)
        const { data: existing } = await supabase
            .from('medallero')
            .select('*')
            .ilike('equipo_nombre', equipo)
            .maybeSingle();

        if (existing) {
            const currentMedals = existing[tipo] as number;

            await supabase.from('medallero').update({
                [tipo]: currentMedals + 1,
                puntos: existing.puntos + puntosExtra,
                updated_at: new Date().toISOString()
            }).eq('id', existing.id);
        } else {
            // Crear nuevo
            await supabase.from('medallero').insert({
                equipo_nombre: equipo,
                [tipo]: 1,
                puntos: puntosExtra
            });
        }
    };

    return (
        <Card className="p-6 bg-[#0a0f1c] border-white/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Timer size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Control de Evento</h3>
                        <p className="text-sm text-slate-400">Gestiona participantes y resultados</p>
                    </div>
                </div>
                {!isLocked && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={autoSort} className="border-white/10 hover:bg-white/5">
                            <ArrowDown01 size={16} className="mr-2" /> Ordenar
                        </Button>
                        <Button
                            size="sm"
                            onClick={finalizeRace}
                            disabled={loading || participantes.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white border-none"
                        >
                            <Trophy size={16} className="mr-2" /> Finalizar y Premiar
                        </Button>
                    </div>
                )}
            </div>

            {/* Lista Participantes */}
            <div className="space-y-2 mb-6">
                {/* Header Tabla */}
                <div className="grid grid-cols-[auto_2fr_2fr_1fr_1fr_auto] gap-2 px-4 py-2 text-xs font-bold uppercase text-slate-500">
                    <div className="w-8 text-center">Pos</div>
                    <div>Atleta / Participante</div>
                    <div>Equipo / Facultad</div>
                    <div>Carril</div>
                    <div>Tiempo</div>
                    <div className="w-8"></div>
                </div>

                {participantes.map((p, idx) => (
                    <div key={p.id} className={cn(
                        "grid grid-cols-[auto_2fr_2fr_1fr_1fr_auto] gap-2 items-center p-3 rounded-xl border transition-all",
                        p.posicion === 1 ? "bg-yellow-500/10 border-yellow-500/30" :
                            p.posicion === 2 ? "bg-slate-400/10 border-slate-400/30" :
                                p.posicion === 3 ? "bg-orange-700/10 border-orange-700/30" :
                                    "bg-white/5 border-white/5"
                    )}>
                        <div className="w-8">
                            <input
                                type="number"
                                value={p.posicion || ''}
                                onChange={(e) => handleChange(p.id, 'posicion', parseInt(e.target.value))}
                                className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                                placeholder="-"
                                disabled={isLocked}
                            />
                        </div>
                        <div className="font-medium text-white">
                            {isLocked ? p.nombre : (
                                <input
                                    value={p.nombre}
                                    onChange={(e) => handleChange(p.id, 'nombre', e.target.value)}
                                    className="w-full bg-transparent focus:outline-none focus:border-b border-indigo-500"
                                />
                            )}
                        </div>
                        <div className="text-sm text-slate-400">
                            {isLocked ? p.equipo : (
                                <input
                                    value={p.equipo}
                                    onChange={(e) => handleChange(p.id, 'equipo', e.target.value)}
                                    className="w-full bg-transparent focus:outline-none focus:border-b border-indigo-500"
                                />
                            )}
                        </div>
                        <div>
                            <input
                                type="number"
                                value={p.carril || ''}
                                onChange={(e) => handleChange(p.id, 'carril', parseInt(e.target.value))}
                                className="w-full bg-transparent text-slate-300 focus:outline-none"
                                placeholder="#"
                                disabled={isLocked}
                            />
                        </div>
                        <div className="font-mono text-indigo-300 font-bold">
                            <input
                                value={p.tiempo || ''}
                                onChange={(e) => handleChange(p.id, 'tiempo', e.target.value)}
                                className="w-full bg-transparent focus:outline-none text-right"
                                placeholder="--:--"
                                disabled={isLocked}
                            />
                        </div>
                        <div className="w-8 flex justify-center">
                            {!isLocked && (
                                <button onClick={() => handleRemove(p.id)} className="text-slate-600 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {isLocked && p.posicion && p.posicion <= 3 && (
                                <Medal size={16} className={cn(
                                    p.posicion === 1 ? "text-yellow-500" :
                                        p.posicion === 2 ? "text-slate-400" : "text-orange-600"
                                )} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Formulario Añadir */}
            {!isLocked && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-white/5">
                    <Input
                        placeholder="Nombre Atleta"
                        value={newItem.nombre}
                        onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })}
                        className="bg-black/20"
                    />
                    <Input
                        placeholder="Equipo (ej: Ing)"
                        value={newItem.equipo}
                        onChange={(e) => setNewItem({ ...newItem, equipo: e.target.value })}
                        className="bg-black/20"
                    />
                    <Input
                        placeholder="Carril"
                        type="number"
                        value={newItem.carril}
                        onChange={(e) => setNewItem({ ...newItem, carril: e.target.value })}
                        className="w-20 bg-black/20"
                    />
                    <Button onClick={handleAdd} disabled={!newItem.nombre || !newItem.equipo} variant="secondary">
                        <Plus size={16} />
                    </Button>
                </div>
            )}
        </Card>
    );
}
