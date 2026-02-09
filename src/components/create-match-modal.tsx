"use client";

import { useState } from "react";
import { Button, Input, Badge } from "@/components/ui-primitives";
import { X, Save, Trophy, Loader2, Calendar, Users, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CreateMatchModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

const DISCIPLINES = [
    { name: 'Fútbol', emoji: '⚽', color: 'from-emerald-500 to-green-600' },
    { name: 'Baloncesto', emoji: '🏀', color: 'from-orange-500 to-amber-600' },
    { name: 'Voleibol', emoji: '🏐', color: 'from-blue-500 to-cyan-600' },
    { name: 'Tenis', emoji: '🎾', color: 'from-lime-500 to-green-500' },
    { name: 'Tenis de Mesa', emoji: '🏓', color: 'from-red-500 to-pink-600' },
];

export function CreateMatchModal({ isOpen, onClose }: CreateMatchModalProps) {
    const [loading, setLoading] = useState(false);
    const [disciplina, setDisciplina] = useState("Fútbol");
    const [equipoA, setEquipoA] = useState("");
    const [equipoB, setEquipoB] = useState("");
    const [estado, setEstado] = useState("programado");
    const [errorMsg, setErrorMsg] = useState("");

    if (!isOpen) return null;

    const handleCreate = async () => {
        setLoading(true);
        setErrorMsg("");

        try {
            if (!equipoA || !equipoB) throw new Error("Por favor completa los nombres de los equipos");

            const { data: disc, error: discError } = await supabase
                .from('disciplinas')
                .select('id')
                .eq('name', disciplina)
                .single();

            if (discError || !disc) throw new Error("Error seleccionando disciplina. ¿Existen en la DB?");

            // Marcador inicial
            let marcadorInicial = {};
            if (disciplina === 'Fútbol') {
                marcadorInicial = { goles_a: 0, goles_b: 0 };
            } else if (disciplina === 'Baloncesto') {
                marcadorInicial = { total_a: 0, total_b: 0, cuartos: {} };
            } else {
                marcadorInicial = { total_a: 0, total_b: 0 };
            }

            const { error } = await supabase.from('partidos').insert({
                disciplina_id: disc.id,
                equipo_a: equipoA,
                equipo_b: equipoB,
                fecha: new Date().toISOString(),
                estado: estado,
                marcador_detalle: marcadorInicial
            });

            if (error) throw error;

            // Clean & Close
            setEquipoA("");
            setEquipoB("");
            setDisciplina("Fútbol");
            setEstado("programado");
            onClose();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedDiscColor = DISCIPLINES.find(d => d.name === disciplina)?.color || 'from-primary to-secondary';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">

                {/* Header Dinámico */}
                <div className={`relative p-6 bg-gradient-to-r ${selectedDiscColor} text-white overflow-hidden transition-all duration-500`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4">
                        <Trophy size={140} />
                    </div>

                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                Crear Partido
                            </h2>
                            <p className="text-white/80 text-sm mt-1 font-medium">Configura el encuentro deportivo</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm flex items-center gap-3 animate-pulse">
                            <Activity size={18} />
                            {errorMsg}
                        </div>
                    )}

                    {/* 1. Selección de Disciplina */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Trophy size={14} /> Disciplina
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {DISCIPLINES.map((d) => (
                                <button
                                    key={d.name}
                                    onClick={() => setDisciplina(d.name)}
                                    className={`relative group flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-200 ${disciplina === d.name
                                            ? `border-transparent bg-muted ring-2 ring-offset-2 ring-primary bg-gradient-to-br ${d.color} text-white shadow-lg scale-105`
                                            : 'border-border/40 bg-muted/20 hover:border-primary/30 hover:bg-muted/50'
                                        }`}
                                >
                                    <span className="text-2xl mb-1 filter drop-shadow-sm group-hover:scale-110 transition-transform">{d.emoji}</span>
                                    <span className="text-[10px] font-bold truncate w-full text-center">{d.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Equipos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 group-focus-within:text-primary transition-colors">
                                <Users size={14} /> Equipo Local
                            </label>
                            <Input
                                placeholder="Ej: Ingeniería"
                                value={equipoA}
                                onChange={e => setEquipoA(e.target.value)}
                                className="bg-muted/30 border-border/50 focus:bg-background transition-all"
                            />
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 group-focus-within:text-primary transition-colors">
                                <Users size={14} /> Equipo Visitante
                            </label>
                            <Input
                                placeholder="Ej: Medicina"
                                value={equipoB}
                                onChange={e => setEquipoB(e.target.value)}
                                className="bg-muted/30 border-border/50 focus:bg-background transition-all"
                            />
                        </div>
                    </div>

                    {/* 3. Estado Inicial */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Calendar size={14} /> Estado Inicial
                        </label>
                        <div className="flex bg-muted/30 p-1.5 rounded-xl border border-border/30">
                            {[
                                { id: 'programado', label: '📅 Programado' },
                                { id: 'en_vivo', label: '🔴 En Vivo Ahora' }
                            ].map((st) => (
                                <button
                                    key={st.id}
                                    onClick={() => setEstado(st.id)}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${estado === st.id
                                            ? 'bg-white text-black shadow-md'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                                        }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={loading || !equipoA || !equipoB}
                            className={`flex-[2] h-12 rounded-xl text-base shadow-xl transition-all ${!equipoA || !equipoB ? 'opacity-50' : `shadow-${selectedDiscColor.split('-')[1]}/30 hover:scale-[1.02]`
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                            {loading ? "Creando..." : "Crear Encuentro"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
