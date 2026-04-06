"use client";

import { useState, useEffect } from "react";
import { Button, Input, Badge } from "@/components/ui-primitives";
import { X, Save, Trophy, Loader2, Calendar, Users, Activity, MapPin, Clock, Plus, GraduationCap, Swords, Search, UserCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CARRERAS_UNINORTE, LUGARES_OLIMPICOS, NATACION_ESTILOS, NATACION_DISTANCIAS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { stampAudit } from "@/lib/audit-helpers";
import { motion, AnimatePresence } from "framer-motion";

type CreateMatchModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

const DISCIPLINES = [
    { name: 'Fútbol', emoji: '⚽', color: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/20', individual: false },
    { name: 'Baloncesto', emoji: '🏀', color: 'from-orange-500 to-amber-600', glow: 'shadow-orange-500/20', individual: false },
    { name: 'Voleibol', emoji: '🏐', color: 'from-blue-500 to-cyan-600', glow: 'shadow-blue-500/20', individual: false },
    { name: 'Tenis', emoji: '🎾', color: 'from-lime-500 to-green-500', glow: 'shadow-lime-500/20', individual: true },
    { name: 'Tenis de Mesa', emoji: '🏓', color: 'from-red-500 to-pink-600', glow: 'shadow-red-500/20', individual: true },
    { name: 'Ajedrez', emoji: '♟️', color: 'from-slate-600 to-zinc-800', glow: 'shadow-slate-500/20', individual: true },
    { name: 'Natación', emoji: '🏊', color: 'from-cyan-500 to-blue-600', glow: 'shadow-cyan-500/20', individual: true },
];

export function CreateMatchModal({ isOpen, onClose }: CreateMatchModalProps) {
    const { profile } = useAuth();
    const { logAction } = useAuditLogger();
    const [loading, setLoading] = useState(false);
    const [disciplina, setDisciplina] = useState("Fútbol");
    const [equipoA, setEquipoA] = useState("");
    const [equipoB, setEquipoB] = useState("");
    const [delegacionA, setDelegacionA] = useState("");
    const [delegacionB, setDelegacionB] = useState("");
    const [estado, setEstado] = useState("programado");
    const [modoRegistro, setModoRegistro] = useState<'en_vivo' | 'asincronico'>('en_vivo');
    const [genero, setGenero] = useState("masculino");
    const [lugar, setLugar] = useState("");
    const [fecha, setFecha] = useState("");
    const [fase, setFase] = useState("");
    const [grupo, setGrupo] = useState("");
    const [bracketOrder, setBracketOrder] = useState("");
    const [categoria, setCategoria] = useState<string>("");
    const [ajedrezRondas, setAjedrezRondas] = useState<number>(3);
    const [errorMsg, setErrorMsg] = useState("");
    // Swimming-specific fields
    const [natEstilo, setNatEstilo] = useState('Libre');
    const [natDistancia, setNatDistancia] = useState('50m');
    const [natSerie, setNatSerie] = useState('');
    const [carreras, setCarreras] = useState<{id: number, nombre: string}[]>([]);
    const [loadingCarreras, setLoadingCarreras] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    // Enrolled teams for current disciplina+genero (from carrera_disciplina table)
    const [enrolledTeams, setEnrolledTeams] = useState<{equipo_nombre: string; carrera_ids: number[]}[]>([]);
    // IDs of all carreras in the selected combined team (for carrera_a_ids / carrera_b_ids)
    const [carreraAIds, setCarreraAIds] = useState<number[]>([]);
    const [carreraBIds, setCarreraBIds] = useState<number[]>([]);
    // Athlete profile search (individual sports)
    const [athleteAQuery, setAthleteAQuery] = useState("");
    const [athleteBQuery, setAthleteBQuery] = useState("");
    const [athleteAResults, setAthleteAResults] = useState<any[]>([]);
    const [athleteBResults, setAthleteBResults] = useState<any[]>([]);
    const [athleteASelected, setAthleteASelected] = useState<{ id: string; full_name: string; avatar_url?: string } | null>(null);
    const [athleteBSelected, setAthleteBSelected] = useState<{ id: string; full_name: string; avatar_url?: string } | null>(null);
    const [searchingA, setSearchingA] = useState(false);
    const [searchingB, setSearchingB] = useState(false);

    useEffect(() => {
        if (isOpen) fetchCarreras();
    }, [isOpen]);

    const fetchCarreras = async () => {
        setLoadingCarreras(true);
        setFetchError(null);
        try {
            console.log("[CreateMatchModal] Fetching carreras...");
            const { data, error } = await supabase.from('carreras').select('id, nombre').order('nombre');
            if (error) {
                console.error("[CreateMatchModal] Error fetching carreras:", error);
                setFetchError(error.message);
                return;
            }
            if (data) {
                const filtered = data.filter(c => CARRERAS_UNINORTE.includes(c.nombre));
                setCarreras(filtered);
                console.log(`[CreateMatchModal] Cargadas ${filtered.length} carreras`);
            }
        } catch (err: any) {
            console.error("[CreateMatchModal] Critical error:", err);
            setFetchError(err.message || "Error desconocido");
        } finally {
            setLoadingCarreras(false);
        }
    };

    const isIndividual = DISCIPLINES.find(d => d.name === disciplina)?.individual || false;
    const isRaceSport = ['Natación', 'Atletismo', 'Ciclismo', 'Triatlón'].includes(disciplina);
    const supportsFase = ['Tenis', 'Tenis de Mesa'].includes(disciplina);
    const isTeamSport = !isIndividual && !isRaceSport;

    // Fetch enrolled teams from carrera_disciplina when disciplina/genero changes (team sports only)
    useEffect(() => {
        if (!isOpen || !isTeamSport) { setEnrolledTeams([]); return; }
        (async () => {
            const { data: disc } = await supabase.from('disciplinas').select('id').eq('name', disciplina).single();
            if (!disc) { setEnrolledTeams([]); return; }
            const { data } = await supabase
                .from('carrera_disciplina')
                .select('equipo_nombre, carrera_id')
                .eq('disciplina_id', disc.id)
                .eq('genero', genero);
            if (!data || data.length === 0) { setEnrolledTeams([]); return; }
            const map: Record<string, number[]> = {};
            data.forEach((r: any) => {
                if (!map[r.equipo_nombre]) map[r.equipo_nombre] = [];
                map[r.equipo_nombre].push(r.carrera_id);
            });
            setEnrolledTeams(Object.entries(map).map(([equipo_nombre, carrera_ids]) => ({ equipo_nombre, carrera_ids })));
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disciplina, genero, isOpen]);

    // Athlete search — debounced queries
    useEffect(() => {
        const q = athleteAQuery.trim();
        if (q.length < 2) { setAthleteAResults([]); return; }
        setSearchingA(true);
        const t = setTimeout(async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, carreras_ids').ilike('full_name', `%${q}%`).limit(8);
            setAthleteAResults(data ?? []);
            setSearchingA(false);
        }, 350);
        return () => { clearTimeout(t); setSearchingA(false); };
    }, [athleteAQuery]);

    useEffect(() => {
        const q = athleteBQuery.trim();
        if (q.length < 2) { setAthleteBResults([]); return; }
        setSearchingB(true);
        const t = setTimeout(async () => {
            const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, carreras_ids').ilike('full_name', `%${q}%`).limit(8);
            setAthleteBResults(data ?? []);
            setSearchingB(false);
        }, 350);
        return () => { clearTimeout(t); setSearchingB(false); };
    }, [athleteBQuery]);

    // Reset athlete selection when discipline changes
    useEffect(() => {
        setAthleteASelected(null); setAthleteAQuery(""); setAthleteAResults([]);
        setAthleteBSelected(null); setAthleteBQuery(""); setAthleteBResults([]);
    }, [disciplina]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        setLoading(true);
        setErrorMsg("");

        try {
            if (isRaceSport) {
                if (disciplina !== 'Natación' && !equipoA) throw new Error("Por favor ingresa el nombre de la prueba/evento");
            } else if (isIndividual) {
                if (!delegacionA || !delegacionB) throw new Error('Debes seleccionar la carrera de cada participante');
                // Accept either a selected profile or a manually typed name
                const nameA = athleteASelected?.full_name || equipoA;
                const nameB = athleteBSelected?.full_name || equipoB;
                if (!nameA || !nameB) throw new Error('Debes ingresar el nombre de cada participante');
            } else {
                if (!equipoA || !equipoB) throw new Error('Por favor completa los nombres de los equipos');
            }
            const needsCategoria = ['Tenis', 'Tenis de Mesa'].includes(disciplina);
            if (needsCategoria && !categoria) throw new Error('Debes seleccionar la categoría (principiante / intermedio / avanzado)');

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
                    participantes: [],
                    ...(disciplina === 'Natación' ? {
                        estilo: natEstilo,
                        distancia: natDistancia,
                        ...(natSerie ? { serie: parseInt(natSerie) } : {}),
                    } : {}),
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
            } else if (disciplina === 'Tenis') {
                // Determine match format based on fase
                const matchFormat =
                  (fase === 'semifinal' || fase === 'tercer_puesto' || fase === 'final')
                    ? 'best_of_2sets'
                    : 'propset_8games'; // default para primeras rondas

                marcadorInicial = {
                    set_actual: 1,
                    sets_a: 0,
                    sets_b: 0,
                    match_format: matchFormat,
                    // Tenis: unidad = juego. Puntos reales (0/15/30/40/AD) se manejan en el engine.
                    sets: {
                        1: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
                        2: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
                        3: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 }
                    }
                };
            } else if (disciplina === 'Tenis de Mesa') {
                marcadorInicial = {
                    set_actual: 1,
                    sets_a: 0,
                    sets_b: 0,
                    // T. Mesa: best-of-5, unidad = punto (11 pts para ganar un set)
                    sets: {
                        1: { puntos_a: 0, puntos_b: 0 },
                        2: { puntos_a: 0, puntos_b: 0 },
                        3: { puntos_a: 0, puntos_b: 0 },
                        4: { puntos_a: 0, puntos_b: 0 },
                        5: { puntos_a: 0, puntos_b: 0 }
                    }
                };
            } else if (disciplina === 'Ajedrez') {
                const rondas: Record<string, { resultado: null }> = {};
                for (let i = 1; i <= ajedrezRondas; i++) rondas[String(i)] = { resultado: null };
                marcadorInicial = { total_a: 0, total_b: 0, ronda_actual: 1, total_rondas: ajedrezRondas, rondas };
            } else { // Default for other non-race sports
                marcadorInicial = { total_a: 0, total_b: 0 };
            }

            // Buscar IDs de carreras si aplican
            let carreraAId = null;
            let carreraBId = null;

            if (!isRaceSport && !isIndividual) {
                // For team sports: use IDs from enrolled teams if available (supports combined teams)
                if (carreraAIds.length > 0) {
                    carreraAId = carreraAIds[0];
                } else {
                    const { data: cData } = await supabase.from('carreras').select('id').eq('nombre', equipoA).single();
                    carreraAId = cData?.id || null;
                }
                if (carreraBIds.length > 0) {
                    carreraBId = carreraBIds[0];
                } else {
                    const { data: cData } = await supabase.from('carreras').select('id').eq('nombre', equipoB).single();
                    carreraBId = cData?.id || null;
                }
            } else if (isIndividual) {
                // For individual sports, delegacionA/B are the career names
                const { data: cData } = await supabase.from('carreras').select('id, nombre').in('nombre', [delegacionA, delegacionB]);
                carreraAId = cData?.find(c => c.nombre === delegacionA)?.id || null;
                carreraBId = cData?.find(c => c.nombre === delegacionB)?.id || null;
            }

            // Resolve final athlete names (profile-linked or typed)
            const finalNameA = isIndividual ? (athleteASelected?.full_name || equipoA) : equipoA;
            const finalNameB = isIndividual ? (athleteBSelected?.full_name || equipoB) : equipoB;

            // Insertar partido
            const { data: newMatch, error } = await supabase.from('partidos').insert({
                disciplina_id: disc?.id,
                equipo_a: isRaceSport && disciplina === 'Natación' ? `${natDistancia} ${natEstilo}` : finalNameA,
                equipo_b: isRaceSport ? 'Evento Múltiple' : finalNameB,
                delegacion_a: isIndividual ? delegacionA : equipoA,
                delegacion_b: isIndividual ? delegacionB : equipoB,
                ...(isIndividual && athleteASelected ? { athlete_a_id: athleteASelected.id } : {}),
                ...(isIndividual && athleteBSelected ? { athlete_b_id: athleteBSelected.id } : {}),
                carrera_a_id: carreraAId,
                carrera_b_id: carreraBId,
                ...(carreraAIds.length > 1 ? { carrera_a_ids: carreraAIds } : {}),
                ...(carreraBIds.length > 1 ? { carrera_b_ids: carreraBIds } : {}),
                fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString(),
                estado: estado,
                genero: genero,
                lugar: lugar || 'Coliseo Central',
                marcador_detalle: stampAudit({ 
                    ...marcadorInicial, 
                    modo_registro: modoRegistro 
                }, profile),
                ...(fase ? { fase } : {}),
                ...(grupo ? { grupo } : {}),
                ...(bracketOrder ? { bracket_order: parseInt(bracketOrder) } : {}),
                ...(categoria ? { categoria } : {}),
            }).select().single();

            if (error) throw error;

            // Log Action
            if (newMatch) {
                await logAction('CREATE_MATCH', 'partido', newMatch.id, {
                    equipoA: newMatch.equipo_a,
                    equipoB: newMatch.equipo_b,
                    disciplina: disciplina,
                    estado: estado
                });
            }

            // Clean & Close
            setEquipoA("");
            setEquipoB("");
            setCarreraAIds([]);
            setCarreraBIds([]);
            setAthleteASelected(null); setAthleteAQuery(""); setAthleteAResults([]);
            setAthleteBSelected(null); setAthleteBQuery(""); setAthleteBResults([]);
            setDisciplina("Fútbol");
            setEstado("programado");
            setGenero("masculino");
            setLugar("");
            setFecha("");
            setFase("");
            setGrupo("");
            setBracketOrder("");
            setCategoria("");
            setAjedrezRondas(3);
            onClose();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    // For team sports: prefer enrolled teams from carrera_disciplina; fall back to all carreras
    const teamOptions: { equipo_nombre: string; carrera_ids: number[] }[] =
        enrolledTeams.length > 0
            ? enrolledTeams
            : carreras.map(c => ({ equipo_nombre: c.nombre, carrera_ids: [c.id] }));

    const selectedDiscColor = DISCIPLINES.find(d => d.name === disciplina)?.color || 'from-primary to-secondary';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">

                {/* Header Dinámico Premium "Cyber-Olympic Luxury" */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`relative p-6 bg-gradient-to-br ${selectedDiscColor} text-white overflow-hidden transition-all duration-700 shrink-0 shadow-2xl z-20`}
                >
                    {/* Background Pattern - Moving Noise */}
                    <motion.div 
                        animate={{ 
                            backgroundPosition: ["0% 0%", "100% 100%"],
                            opacity: [0.15, 0.2, 0.15]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200%_200%] mix-blend-overlay"
                    />
                    
                    <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-6 -translate-y-6 rotate-12 scale-150">
                        <Trophy size={160} />
                    </div>

                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <motion.div 
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 mb-1"
                            >
                                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest border border-white/20">
                                    Nuevo Encuentro
                                </span>
                            </motion.div>
                            <h2 className="text-3xl font-black tracking-tighter drop-shadow-md flex items-center gap-2">
                                <Plus size={24} className="text-white/80" /> {disciplina}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all backdrop-blur-md border border-white/10 hover:scale-110 active:scale-95 group shadow-lg"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </motion.div>

                {/* Body con Scroll */}
                <div className="p-5 space-y-5 bg-zinc-950/50 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Error Message */}
                    {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-2 animate-pulse">
                            <Activity size={16} />
                            {errorMsg}
                        </div>
                    )}

                    {/* 1. Selección de Disciplina (Grid Premium) */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                1. Seleccionar Deporte
                            </label>
                            <span className="text-[10px] font-bold text-zinc-600">PASO 1 DE 3</span>
                        </div>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {DISCIPLINES.map((d, index) => {
                                const isSelected = disciplina === d.name;
                                return (
                                    <motion.button
                                        key={d.name}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: index * 0.05 + 0.3 }}
                                        whileHover={{ y: -4, scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setDisciplina(d.name)}
                                        className={`relative group flex flex-col items-center justify-center p-2 h-24 rounded-2xl border transition-all duration-500 overflow-hidden ${
                                            isSelected
                                            ? `border-transparent ring-2 ring-primary ring-offset-2 ring-offset-zinc-950 bg-gradient-to-br ${d.color} ${d.glow} text-white shadow-2xl z-10`
                                            : 'border-white/5 bg-zinc-900/60 hover:bg-zinc-800 hover:border-white/20'
                                        }`}
                                    >
                                        {isSelected && (
                                            <motion.div 
                                                layoutId="active-disc-bg"
                                                className="absolute inset-0 bg-white/20 mix-blend-overlay" 
                                            />
                                        )}
                                        <span className={`text-3xl mb-1.5 filter drop-shadow-md transition-all duration-500 ${isSelected ? 'scale-110 rotate-3' : 'grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'}`}>
                                            {d.emoji}
                                        </span>
                                        <span className={`text-[10px] font-black truncate w-full text-center tracking-tighter uppercase ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                                            {d.name}
                                        </span>
                                        
                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-white/10 to-transparent transition-opacity" />
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Equipos / Evento (Glassmorphism Pods) */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isRaceSport ? 'race' : 'vs'}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="space-y-4"
                        >
                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2 px-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                2. Configurar Competidores
                            </label>

                            {isRaceSport ? (
                                <div className="p-5 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm space-y-4 shadow-inner relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                    
                                    {disciplina === 'Natación' ? (
                                        <div className="space-y-4 relative z-10">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-zinc-500 px-1">Estilo</label>
                                                    <select
                                                        value={natEstilo}
                                                        onChange={(e) => setNatEstilo(e.target.value)}
                                                        className="w-full h-11 bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                                                    >
                                                        {NATACION_ESTILOS.map(e => <option key={e} value={e}>{e}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-zinc-500 px-1">Distancia</label>
                                                    <select
                                                        value={natDistancia}
                                                        onChange={(e) => setNatDistancia(e.target.value)}
                                                        className="w-full h-11 bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                                                    >
                                                        {NATACION_DISTANCIAS.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-end gap-4">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase text-zinc-500 px-1">Serie (opcional)</label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Nº Serie"
                                                        value={natSerie}
                                                        onChange={(e) => setNatSerie(e.target.value)}
                                                        className="bg-black/60 border-white/10 focus:border-cyan-500 h-11 text-sm font-bold rounded-xl"
                                                        min={1}
                                                    />
                                                </div>
                                                <div className="flex-[2] p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                                                        <Activity size={16} className="text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-cyan-500/60 leading-none mb-1">Preview Evento</p>
                                                        <p className="text-xs text-white font-bold leading-none">{natDistancia} {natEstilo}{natSerie ? ` · S${natSerie}` : ''}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 relative z-10">
                                            <Input
                                                placeholder="Ej: Final 100m Planos Varones"
                                                value={equipoA}
                                                onChange={(e) => setEquipoA(e.target.value)}
                                                className="bg-black/60 border-white/10 focus:border-primary/50 h-12 text-sm font-bold rounded-xl placeholder:text-zinc-600"
                                            />
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                    Los participantes se gestionan después de crear el evento
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
                                    {/* Local Pod */}
                                    <div className="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm space-y-3 relative group overflow-hidden">
                                        <div className="absolute top-0 left-0 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/80">Local / A</span>
                                            {isIndividual && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">Atleta</span>}
                                        </div>

                                        {isIndividual ? (
                                            <div className="space-y-3">
                                                {/* Carrera selector */}
                                                <div className="relative">
                                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50" size={16} />
                                                    <select
                                                        className="w-full h-10 bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-bold text-white focus:border-blue-500/50 outline-none transition-all appearance-none"
                                                        value={delegacionA}
                                                        onChange={(e) => setDelegacionA(e.target.value)}
                                                    >
                                                        <option value="" disabled>
                                                            {loadingCarreras ? "Cargando..." : "Seleccionar Carrera..."}
                                                        </option>
                                                        {carreras.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                                    </select>
                                                </div>
                                                {/* Athlete search */}
                                                {athleteASelected ? (
                                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                                        {athleteASelected.avatar_url ? (
                                                            <img src={athleteASelected.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                                        ) : (
                                                            <UserCircle size={28} className="text-blue-400 shrink-0" />
                                                        )}
                                                        <span className="text-xs font-black text-white truncate flex-1">{athleteASelected.full_name}</span>
                                                        <button onClick={() => { setAthleteASelected(null); setEquipoA(""); setAthleteAQuery(""); }} className="text-white/30 hover:text-white/70 shrink-0">
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/40" size={14} />
                                                            <input
                                                                placeholder="Buscar atleta..."
                                                                value={athleteAQuery}
                                                                onChange={e => { setAthleteAQuery(e.target.value); setEquipoA(e.target.value); }}
                                                                disabled={!delegacionA}
                                                                className={cn(
                                                                    "w-full h-10 bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 text-xs font-bold text-white placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all",
                                                                    !delegacionA && "opacity-30"
                                                                )}
                                                            />
                                                            {searchingA && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />}
                                                        </div>
                                                        {athleteAResults.length > 0 && (
                                                            <div className="rounded-xl border border-blue-500/20 bg-zinc-950 overflow-hidden">
                                                                {athleteAResults.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => { setAthleteASelected(p); setEquipoA(p.full_name); setAthleteAQuery(""); setAthleteAResults([]); }}
                                                                        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors text-left border-b border-white/5 last:border-0"
                                                                    >
                                                                        {p.avatar_url ? (
                                                                            <img src={p.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                                                <UserCircle size={18} className="text-blue-400" />
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs font-bold text-white truncate">{p.full_name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative group/sel">
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50 transition-colors group-focus-within/sel:text-blue-400" size={18} />
                                                <select
                                                    className="w-full h-12 bg-black/60 border border-white/10 rounded-xl pl-11 pr-4 text-sm font-black text-white focus:border-blue-500/50 outline-none transition-all appearance-none"
                                                    value={equipoA}
                                                    onChange={(e) => {
                                                        const t = teamOptions.find(t => t.equipo_nombre === e.target.value);
                                                        setEquipoA(e.target.value);
                                                        setCarreraAIds(t?.carrera_ids ?? []);
                                                    }}
                                                >
                                                    <option value="" disabled>
                                                        {loadingCarreras ? "Cargando catálogo..." : fetchError ? `Error: ${fetchError}` : "Elegir Equipo..."}
                                                    </option>
                                                    {teamOptions.map(t => <option key={t.equipo_nombre} value={t.equipo_nombre}>{t.equipo_nombre}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* VS Badge */}
                                    <div className="flex sm:flex-col items-center justify-center gap-2 py-1">
                                        <div className="h-px w-full sm:w-px sm:h-8 bg-zinc-800" />
                                        <div className="w-10 h-10 rounded-2xl bg-black border-2 border-zinc-900 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] z-10">
                                            <span className="text-[10px] font-black text-white italic tracking-tighter">VS</span>
                                        </div>
                                        <div className="h-px w-full sm:w-px sm:h-8 bg-zinc-800" />
                                    </div>

                                    {/* Visitante Pod */}
                                    <div className="p-4 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm space-y-3 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex justify-between items-center px-1">
                                            {isIndividual && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase">Atleta</span>}
                                            <span className="text-[9px] font-black uppercase tracking-widest text-pink-500/80">Visitante / B</span>
                                        </div>

                                        {isIndividual ? (
                                            <div className="space-y-3">
                                                {/* Carrera selector */}
                                                <div className="relative">
                                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500/50" size={16} />
                                                    <select
                                                        className="w-full h-10 bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-bold text-white focus:border-pink-500/50 outline-none transition-all appearance-none"
                                                        value={delegacionB}
                                                        onChange={(e) => setDelegacionB(e.target.value)}
                                                    >
                                                        <option value="" disabled>
                                                            {loadingCarreras ? "Cargando..." : "Seleccionar Carrera..."}
                                                        </option>
                                                        {carreras.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                                                    </select>
                                                </div>
                                                {/* Athlete search */}
                                                {athleteBSelected ? (
                                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-pink-500/10 border border-pink-500/30">
                                                        {athleteBSelected.avatar_url ? (
                                                            <img src={athleteBSelected.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                                        ) : (
                                                            <UserCircle size={28} className="text-pink-400 shrink-0" />
                                                        )}
                                                        <span className="text-xs font-black text-white truncate flex-1">{athleteBSelected.full_name}</span>
                                                        <button onClick={() => { setAthleteBSelected(null); setEquipoB(""); setAthleteBQuery(""); }} className="text-white/30 hover:text-white/70 shrink-0">
                                                            <XCircle size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500/40" size={14} />
                                                            <input
                                                                placeholder="Buscar atleta..."
                                                                value={athleteBQuery}
                                                                onChange={e => { setAthleteBQuery(e.target.value); setEquipoB(e.target.value); }}
                                                                disabled={!delegacionB}
                                                                className={cn(
                                                                    "w-full h-10 bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 text-xs font-bold text-white placeholder:text-zinc-600 focus:border-pink-500/50 outline-none transition-all",
                                                                    !delegacionB && "opacity-30"
                                                                )}
                                                            />
                                                            {searchingB && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 animate-spin" />}
                                                        </div>
                                                        {athleteBResults.length > 0 && (
                                                            <div className="rounded-xl border border-pink-500/20 bg-zinc-950 overflow-hidden">
                                                                {athleteBResults.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => { setAthleteBSelected(p); setEquipoB(p.full_name); setAthleteBQuery(""); setAthleteBResults([]); }}
                                                                        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-pink-500/10 active:bg-pink-500/20 transition-colors text-left border-b border-white/5 last:border-0"
                                                                    >
                                                                        {p.avatar_url ? (
                                                                            <img src={p.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                                                                                <UserCircle size={18} className="text-pink-400" />
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs font-bold text-white truncate">{p.full_name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative group/sel">
                                                <Users className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-500/50 transition-colors group-focus-within/sel:text-pink-400" size={18} />
                                                <select
                                                    className="w-full h-12 bg-black/60 border border-white/10 rounded-xl pl-4 pr-11 text-sm font-black text-white focus:border-pink-500/50 outline-none transition-all appearance-none text-right"
                                                    value={equipoB}
                                                    onChange={(e) => {
                                                        const t = teamOptions.find(t => t.equipo_nombre === e.target.value);
                                                        setEquipoB(e.target.value);
                                                        setCarreraBIds(t?.carrera_ids ?? []);
                                                    }}
                                                >
                                                    <option value="" disabled>
                                                        {loadingCarreras ? "Cargando catálogo..." : fetchError ? `Error: ${fetchError}` : "Elegir Equipo..."}
                                                    </option>
                                                    {teamOptions.map(t => <option key={t.equipo_nombre} value={t.equipo_nombre}>{t.equipo_nombre}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* 3. Categoría y Detalles (Premium Grid) */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                        <div className="col-span-1 sm:col-span-2 space-y-3">
                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2 px-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                3. Categoría y Logística
                            </label>
                            
                            {/* Género Switcher Premium */}
                            <div className="flex p-1.5 bg-zinc-900/60 rounded-2xl border border-white/5 backdrop-blur-sm h-14">
                                {[
                                    { id: 'masculino', label: 'Masculino', emoji: '♂', color: 'bg-blue-600', glow: 'shadow-blue-500/40' },
                                    { id: 'femenino', label: 'Femenino', emoji: '♀', color: 'bg-pink-600', glow: 'shadow-pink-500/40' },
                                    { id: 'mixto', label: 'Mixto', emoji: '⚤', color: 'bg-purple-600', glow: 'shadow-purple-500/40' }
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => setGenero(g.id)}
                                        className={`relative flex-1 rounded-xl text-[11px] font-black transition-all duration-500 flex items-center justify-center gap-2 overflow-hidden ${
                                            genero === g.id 
                                            ? `${g.color} text-white shadow-lg ${g.glow} scale-[1.02] z-10` 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <span className="text-sm">{g.emoji}</span>
                                        <span className="uppercase tracking-tighter">{g.label}</span>
                                        {genero === g.id && (
                                            <motion.div 
                                                layoutId="active-gender"
                                                className="absolute inset-0 bg-white/10 mix-blend-overlay"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Número de rondas — solo para Ajedrez */}
                        {disciplina === 'Ajedrez' && (
                            <div className="col-span-1 sm:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Número de rondas
                                </label>
                                <div className="flex p-1.5 bg-zinc-900/60 rounded-2xl border border-slate-500/20 backdrop-blur-sm h-12">
                                    {[1, 3, 5, 7].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setAjedrezRondas(n)}
                                            className={`flex-1 rounded-xl text-[11px] font-black transition-all duration-300 ${
                                                ajedrezRondas === n
                                                    ? 'bg-slate-600 text-white shadow-lg'
                                                    : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            {n} {n === 1 ? 'ronda' : 'rondas'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Categoría — solo para Tenis y Tenis de Mesa (NO Natación) */}
                        {['Tenis', 'Tenis de Mesa'].includes(disciplina) && (
                            <div className="col-span-1 sm:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                                    Nivel / Categoría <span className="text-red-400">*</span>
                                </label>
                                <div className="flex p-1.5 bg-zinc-900/60 rounded-2xl border border-lime-500/20 backdrop-blur-sm h-12">
                                    {[
                                        { id: 'intermedio', label: 'Intermedio' },
                                        { id: 'avanzado', label: 'Avanzado' },
                                    ].map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => setCategoria(c.id)}
                                            className={`flex-1 rounded-xl text-[10px] font-black transition-all duration-300 uppercase tracking-tight ${
                                                categoria === c.id
                                                    ? 'bg-lime-600 text-white shadow-lg shadow-lime-500/30'
                                                    : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Bracket / Fase — Refined */}
                        {(supportsFase || (!isIndividual && !isRaceSport)) && (
                            <div className="col-span-1 sm:col-span-2 p-4 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1 border-l-2 border-primary ml-1">
                                    Fase de Torneo (Opcional)
                                </label>
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <Swords className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                        <select
                                            className="w-full h-11 bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-bold text-white focus:border-primary/50 outline-none transition-all appearance-none"
                                            value={fase}
                                            onChange={(e) => { setFase(e.target.value); if (e.target.value !== 'grupos') setGrupo(''); }}
                                        >
                                            <option value="">Sin fase</option>
                                            <option value="grupos">Fase de Grupos</option>
                                            <option value="cuartos">Cuartos de Final</option>
                                            <option value="semifinal">Semifinal</option>
                                            <option value="tercer_puesto">Tercer Puesto</option>
                                            <option value="final">Final</option>
                                        </select>
                                    </div>
                                    {fase === 'grupos' && (
                                        <select
                                            className="w-24 h-11 bg-black/60 border border-white/10 rounded-xl px-4 text-xs font-black text-white focus:border-primary/50 outline-none appearance-none text-center"
                                            value={grupo}
                                            onChange={(e) => setGrupo(e.target.value)}
                                        >
                                            <option value="" disabled>Grup...</option>
                                            {['A', 'B', 'C', 'D', 'E', 'F'].map(g => <option key={g} value={g}>G {g}</option>)}
                                        </select>
                                    )}
                                    {fase && fase !== 'grupos' && (
                                        <Input
                                            type="number"
                                            placeholder="#"
                                            className="w-16 h-11 bg-black/60 border-white/10 focus:border-primary/50 rounded-xl text-center font-black"
                                            value={bracketOrder}
                                            onChange={(e) => setBracketOrder(e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lugar y Estado - Compact Glass */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Lugar</label>
                            <div className="relative group">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={16} />
                                <select
                                    className="w-full h-11 bg-zinc-900/60 border border-white/5 rounded-2xl pl-10 pr-4 text-sm font-bold text-white focus:border-primary/40 focus:bg-black/40 outline-none transition-all appearance-none"
                                    value={lugar}
                                    onChange={e => setLugar(e.target.value)}
                                >
                                    <option value="" disabled>Seleccionar Sede...</option>
                                    {LUGARES_OLIMPICOS.map(l => <option key={l} value={l} className="bg-zinc-900 text-white font-bold">{l}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Estado y Registro</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-zinc-900/40 p-2 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                                <button
                                    onClick={() => { setEstado('programado'); setModoRegistro('en_vivo'); }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[10px] font-black transition-all border ${
                                        estado === 'programado' && modoRegistro === 'en_vivo' 
                                        ? 'bg-zinc-800 text-white border-white/20 shadow-lg' 
                                        : 'bg-black/20 border-transparent text-zinc-600 hover:bg-black/40 hover:text-zinc-400'
                                    }`}
                                >
                                    <Clock size={14} /> PROGRAMADO
                                </button>
                                <button
                                    onClick={() => { setEstado('en_curso'); setModoRegistro('en_vivo'); }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[10px] font-black transition-all border ${
                                        estado === 'en_curso' && modoRegistro === 'en_vivo' 
                                        ? 'bg-red-600/20 text-red-500 border-red-500/30 shadow-lg shadow-red-900/20' 
                                        : 'bg-black/20 border-transparent text-zinc-600 hover:bg-red-500/10 hover:text-red-400'
                                    }`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> EN VIVO
                                </button>
                                <button
                                    onClick={() => { setEstado('en_curso'); setModoRegistro('asincronico'); }}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[10px] font-black transition-all border ${
                                        modoRegistro === 'asincronico' 
                                        ? 'bg-amber-600/20 text-amber-500 border-amber-500/30 shadow-lg shadow-amber-900/20' 
                                        : 'bg-black/20 border-transparent text-zinc-600 hover:bg-amber-500/10 hover:text-amber-400'
                                    }`}
                                >
                                    <Clock size={14} /> ASINCRÓNICO
                                </button>
                            </div>
                        </div>

                        {/* Fecha Premium */}
                        {estado === 'programado' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="col-span-1 sm:col-span-2 space-y-3 pt-2"
                            >
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Horario del Encuentro</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 pointer-events-none" size={18} />
                                    <Input
                                        type="datetime-local"
                                        value={fecha}
                                        onChange={e => setFecha(e.target.value)}
                                        className="h-14 bg-zinc-900/60 border-white/5 focus:border-primary/40 rounded-3xl pl-12 pr-6 font-black text-sm [color-scheme:dark] transition-all hover:bg-black/40"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Footer Actions (Tactile & High Impact) */}
                <div className="p-6 bg-zinc-950/80 backdrop-blur-xl flex gap-3 border-t border-white/5 relative z-30">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex-1"
                    >
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                        >
                            Cancelar
                        </Button>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex-[2]"
                    >
                        <Button
                            onClick={handleCreate}
                            disabled={loading || (!isRaceSport && (!equipoA || !equipoB)) || (isRaceSport && disciplina !== 'Natación' && !equipoA)}
                            className={`w-full h-14 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] shadow-2xl transition-all duration-500 relative overflow-hidden group ${
                                (!equipoA || (!isRaceSport && !equipoB)) 
                                ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-50' 
                                : `bg-gradient-to-r ${selectedDiscColor} hover:scale-[1.02] hover:shadow-primary/20 active:scale-[0.98]`
                            }`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <Save size={18} />
                                    <span>Lanzar Encuentro</span>
                                </div>
                            )}
                            
                            {/* Inner Glow Shine */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
