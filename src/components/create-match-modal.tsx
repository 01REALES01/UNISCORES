"use client";

import { useState } from "react";
import { Button, Input, Badge } from "@/components/ui-primitives";
import { X, Save, Trophy, Loader2, Calendar, Users, Activity, MapPin, Clock, Plus, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CARRERAS_UNINORTE, LUGARES_OLIMPICOS } from "@/lib/constants";

type CreateMatchModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

const DISCIPLINES = [
    { name: 'Fútbol', emoji: '⚽', color: 'from-emerald-500 to-green-600', individual: false },
    { name: 'Baloncesto', emoji: '🏀', color: 'from-orange-500 to-amber-600', individual: false },
    { name: 'Voleibol', emoji: '🏐', color: 'from-blue-500 to-cyan-600', individual: false },
    { name: 'Tenis', emoji: '🎾', color: 'from-lime-500 to-green-500', individual: true },
    { name: 'Tenis de Mesa', emoji: '🏓', color: 'from-red-500 to-pink-600', individual: true },
    { name: 'Ajedrez', emoji: '♟️', color: 'from-slate-600 to-zinc-800', individual: true },
    { name: 'Natación', emoji: '🏊', color: 'from-cyan-500 to-blue-600', individual: true },
];

export function CreateMatchModal({ isOpen, onClose }: CreateMatchModalProps) {
    const [loading, setLoading] = useState(false);
    const [disciplina, setDisciplina] = useState("Fútbol");
    const [equipoA, setEquipoA] = useState("");
    const [equipoB, setEquipoB] = useState("");
    const [delegacionA, setDelegacionA] = useState("");
    const [delegacionB, setDelegacionB] = useState("");
    const [estado, setEstado] = useState("programado");
    const [genero, setGenero] = useState("masculino");
    const [lugar, setLugar] = useState("");
    const [fecha, setFecha] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    if (!isOpen) return null;

    const isIndividual = DISCIPLINES.find(d => d.name === disciplina)?.individual || false;
    const isRaceSport = ['Natación', 'Atletismo', 'Ciclismo', 'Triatlón'].includes(disciplina);

    const handleCreate = async () => {
        setLoading(true);
        setErrorMsg("");

        try {
            if (isRaceSport) {
                if (!equipoA) throw new Error("Por favor ingresa el nombre de la prueba/evento");
            } else {
                const labelParticipante = isIndividual ? 'participantes' : 'equipos';
                if (!equipoA || !equipoB) throw new Error(`Por favor completa los nombres de los ${labelParticipante}`);
            }

            const { data: disc, error: discError } = await supabase
                .from('disciplinas')
                .select('id')
                .eq('name', disciplina)
                .single();

            if (discError || !disc) throw new Error("Error seleccionando disciplina. ¿Existen en la DB?");

            // Marcador inicial según deporte con estructura completa
            let marcadorInicial: Record<string, any> = {};

            if (isRaceSport) {
                marcadorInicial = {
                    tipo: 'carrera',
                    fase: 'Final',
                    participantes: []
                };
            } else if (disciplina === 'Fútbol') {
                marcadorInicial = {
                    tiempo_actual: 1,
                    minuto_actual: 0,
                    goles_a: 0,
                    goles_b: 0,
                    tiempos: {
                        1: { goles_a: 0, goles_b: 0 },
                        2: { goles_a: 0, goles_b: 0 }
                    }
                };
            } else if (disciplina === 'Baloncesto') {
                marcadorInicial = {
                    cuarto_actual: 1,
                    total_a: 0,
                    total_b: 0,
                    cuartos: {
                        1: { puntos_a: 0, puntos_b: 0 },
                        2: { puntos_a: 0, puntos_b: 0 },
                        3: { puntos_a: 0, puntos_b: 0 },
                        4: { puntos_a: 0, puntos_b: 0 }
                    }
                };
            } else if (disciplina === 'Voleibol') {
                marcadorInicial = {
                    set_actual: 1,
                    sets_a: 0,
                    sets_b: 0,
                    sets: {
                        1: { puntos_a: 0, puntos_b: 0 },
                        2: { puntos_a: 0, puntos_b: 0 },
                        3: { puntos_a: 0, puntos_b: 0 },
                        4: { puntos_a: 0, puntos_b: 0 },
                        5: { puntos_a: 0, puntos_b: 0 }
                    }
                };
            } else if (disciplina === 'Tenis' || disciplina === 'Tenis de Mesa') {
                marcadorInicial = {
                    set_actual: 1,
                    sets_a: 0,
                    sets_b: 0,
                    sets: {
                        1: { juegos_a: 0, juegos_b: 0 },
                        2: { juegos_a: 0, juegos_b: 0 },
                        3: { juegos_a: 0, juegos_b: 0 }
                    }
                };
            } else if (disciplina === 'Ajedrez') {
                marcadorInicial = { resultado: null }; // 'blancas', 'negras', 'empate'
            } else { // Default for other non-race sports
                marcadorInicial = { total_a: 0, total_b: 0 };
            }

            // Insertar partido
            const { error } = await supabase.from('partidos').insert({
                disciplina_id: disc?.id,
                equipo_a: isRaceSport ? equipoA : equipoA, // En carreras, equipo_a es el Nombre del Evento
                equipo_b: isRaceSport ? 'Evento Múltiple' : equipoB, // Placeholder descriptivo
                delegacion_a: isIndividual ? delegacionA : equipoA,
                delegacion_b: isIndividual ? delegacionB : equipoB,
                fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
                estado: estado,
                genero: genero,
                lugar: lugar || 'Coliseo Central',
                marcador_detalle: marcadorInicial
            });

            if (error) throw error;

            // Clean & Close
            setEquipoA("");
            setEquipoB("");
            setDisciplina("Fútbol");
            setEstado("programado");
            setGenero("masculino");
            setLugar("");
            setFecha("");
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

                {/* Header Dinámico Premium (Compacto) */}
                <div className={`relative p-5 bg-gradient-to-br ${selectedDiscColor} text-white overflow-hidden transition-all duration-500 shrink-0`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4 hue-rotate-15">
                        <Trophy size={120} />
                    </div>

                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight drop-shadow-sm flex items-center gap-2">
                                <Plus size={20} className="text-white/80" /> Crear Partido
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm border border-white/10 hover:scale-110 active:scale-95 group"
                        >
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Body con Scroll */}
                <div className="p-5 space-y-5 bg-zinc-950/50 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-2 animate-pulse">
                            <Activity size={16} />
                            {errorMsg}
                        </div>
                    )}

                    {/* 1. Selección de Disciplina (Grid Compacto) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
                            <Trophy size={12} className="text-primary" /> 1. Deporte
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {DISCIPLINES.map((d) => {
                                const isSelected = disciplina === d.name;
                                return (
                                    <button
                                        key={d.name}
                                        onClick={() => setDisciplina(d.name)}
                                        className={`relative group flex flex-col items-center justify-center p-2 h-20 rounded-xl border transition-all duration-300 overflow-hidden ${isSelected
                                            ? `border-transparent ring-2 ring-primary ring-offset-1 ring-offset-zinc-900 bg-gradient-to-br ${d.color} text-white shadow-lg shadow-black/50 scale-[1.02]`
                                            : 'border-white/5 bg-zinc-900/40 hover:bg-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        {isSelected && <div className="absolute inset-0 bg-white/20 mix-blend-overlay animate-pulse" />}
                                        <span className={`text-2xl mb-1 filter drop-shadow-sm transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'scale-110' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                            {d.emoji}
                                        </span>
                                        <span className={`text-[9px] font-bold truncate w-full text-center tracking-wide ${isSelected ? 'text-white' : 'text-muted-foreground group-hover:text-white'}`}>
                                            {d.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Equipos / Evento */}
                    {isRaceSport ? (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-left-4">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Trophy size={12} className="text-primary" /> Nombre de la Prueba / Evento
                            </label>
                            <Input
                                placeholder="Ej: 100m Libres - Final"
                                value={equipoA}
                                onChange={(e) => setEquipoA(e.target.value)}
                                className="bg-black/40 border-white/5 focus:border-primary/50 h-10 text-sm font-medium"
                            />
                            <p className="text-[10px] text-muted-foreground ml-1">
                                * Se agregarán los participantes en la pantalla de gestión.
                            </p>
                        </div>
                    ) : (
                        <div className="relative flex flex-col sm:flex-row items-stretch justify-between gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 shadow-inner">
                            {/* VS Badge Absolute Center (Hidden on small screens) */}
                            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <div className="w-8 h-8 rounded-full bg-black border-2 border-zinc-800 flex items-center justify-center shadow-lg">
                                    <span className="text-[9px] font-black text-white/40 italic">VS</span>
                                </div>
                            </div>

                            {/* Equipo A */}
                            <div className="flex-1 space-y-1">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                                    {isIndividual ? 'Participante A' : 'Equipo Local'}
                                </span>
                                {isIndividual ? (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Nombre Participante"
                                            value={equipoA}
                                            onChange={e => setEquipoA(e.target.value)}
                                            className="h-10 bg-black/40 border-white/10 focus:border-primary/50 focus:bg-black/60 rounded-lg transition-all font-semibold text-sm text-center"
                                        />
                                        <div className="relative">
                                            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                                            <select
                                                className="w-full h-9 bg-zinc-900/50 border border-white/10 rounded-lg pl-9 pr-2 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
                                                value={delegacionA}
                                                onChange={(e) => setDelegacionA(e.target.value)}
                                            >
                                                <option value="" disabled>Carrera / Delegación</option>
                                                {CARRERAS_UNINORTE.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-sm font-semibold text-white focus:border-primary/50 focus:bg-zinc-900 outline-none"
                                        value={equipoA}
                                        onChange={(e) => setEquipoA(e.target.value)}
                                    >
                                        <option value="" disabled>Seleccionar Carrera...</option>
                                        {CARRERAS_UNINORTE.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                            </div>

                            {/* Spacer for VS */}
                            <div className="w-4 hidden sm:block" />

                            {/* Equipo B */}
                            <div className="flex-1 space-y-1 text-right">
                                <span className="text-[9px] font-bold uppercase text-muted-foreground mr-1 block">
                                    {isIndividual ? 'Participante B' : 'Equipo Visitante'}
                                </span>
                                {isIndividual ? (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Nombre Participante"
                                            value={equipoB}
                                            onChange={e => setEquipoB(e.target.value)}
                                            className="h-10 bg-black/40 border-white/10 focus:border-primary/50 focus:bg-black/60 rounded-lg transition-all font-semibold text-sm text-center"
                                        />
                                        <div className="relative">
                                            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                                            <select
                                                className="w-full h-9 bg-zinc-900/50 border border-white/10 rounded-lg pl-9 pr-2 text-xs text-zinc-300 focus:border-pink-500 outline-none"
                                                value={delegacionB}
                                                onChange={(e) => setDelegacionB(e.target.value)}
                                            >
                                                <option value="" disabled>Carrera / Delegación</option>
                                                {CARRERAS_UNINORTE.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-sm font-semibold text-white focus:border-primary/50 focus:bg-zinc-900 outline-none text-right"
                                        style={{ direction: 'rtl' }} // Trick for right align select arrow? No, text right.
                                        value={equipoB}
                                        onChange={(e) => setEquipoB(e.target.value)}
                                    >
                                        <option value="" disabled>Seleccionar Carrera...</option>
                                        {CARRERAS_UNINORTE.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. Categoría y Detalles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Categoría Género */}
                        <div className="col-span-1 sm:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Users size={12} className="text-primary" /> 3. Categoría
                            </label>
                            <div className="flex p-1 bg-black/40 rounded-lg border border-white/5 h-10">
                                <button
                                    onClick={() => setGenero('masculino')}
                                    className={`flex-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${genero === 'masculino' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                                >
                                    ♂ Masculino
                                </button>
                                <button
                                    onClick={() => setGenero('femenino')}
                                    className={`flex-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${genero === 'femenino' ? 'bg-pink-600 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                                >
                                    ♀ Femenino
                                </button>
                                <button
                                    onClick={() => setGenero('mixto')}
                                    className={`flex-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${genero === 'mixto' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
                                >
                                    ⚤ Mixto
                                </button>
                            </div>
                        </div>
                        {/* Estado Switch */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Activity size={12} className="text-primary" /> Estado Inicial
                            </label>
                            <div className="flex p-1 bg-black/40 rounded-lg border border-white/5 h-10">
                                <button
                                    onClick={() => setEstado('programado')}
                                    className={`flex-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${estado === 'programado' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-muted-foreground hover:text-white'}`}
                                >
                                    <Calendar size={12} /> Programado
                                </button>
                                <button
                                    onClick={() => setEstado('en_vivo')}
                                    className={`flex-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${estado === 'en_vivo' ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : 'text-muted-foreground hover:text-red-400'}`}
                                >
                                    <Activity size={12} /> En Vivo
                                </button>
                            </div>
                        </div>

                        {/* Lugar Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
                                <MapPin size={12} className="text-primary" /> Lugar
                            </label>
                            <div className="relative group">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
                                <select
                                    className="w-full h-10 bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 text-sm font-medium text-white focus:border-primary/50 outline-none appearance-none"
                                    value={lugar}
                                    onChange={e => setLugar(e.target.value)}
                                >
                                    <option value="" disabled>Seleccionar Sede...</option>
                                    {LUGARES_OLIMPICOS.map(l => <option key={l} value={l} className="bg-zinc-900">{l}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Fecha Input (Full width if programmed) */}
                        {estado === 'programado' && (
                            <div className="col-span-1 sm:col-span-2 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 ml-1">
                                    <Clock size={12} className="text-primary" /> Fecha Programada
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={fecha}
                                    onChange={e => setFecha(e.target.value)}
                                    className="h-10 bg-black/40 border-white/10 focus:border-primary/50 rounded-lg font-medium text-sm [color-scheme:dark]"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions (Fixed at bottom) */}
                <div className="p-5 pt-0 bg-zinc-950/50 flex gap-3 border-t border-transparent">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={loading || !equipoA || (!isRaceSport && !equipoB)}
                        className={`flex-[2] h-12 rounded-xl text-sm font-bold shadow-xl transition-all duration-300 relative overflow-hidden group ${(!equipoA || (!isRaceSport && !equipoB)) ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-muted-foreground' : `bg-gradient-to-r ${selectedDiscColor} hover:scale-[1.01] hover:shadow-2xl`}`}
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                        {loading ? "Creando..." : "Crear Encuentro"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
