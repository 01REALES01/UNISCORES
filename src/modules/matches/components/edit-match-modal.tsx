"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Badge, Avatar } from "@/components/ui-primitives";
import { X, Save, Clock, Loader2, Plus, Play, Pause, Square, AlertCircle, Minus, Edit2, Check, Activity, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addPoints, removePoints, setPoints, getCurrentScore, ScoreDetail, recalculateTotals, getCurrentPeriodNumber, getPeriodDuration, nextPeriod } from "@/lib/sport-scoring";
import { useAuth } from "@/hooks/useAuth";
import { stampAudit, stampEventAudit, parseEventAudit } from "@/lib/audit-helpers";
import { toast } from "sonner";

type EditMatchModalProps = {
    match: any;
    isOpen: boolean;
    onClose: () => void;
    profile?: any;
};

// --- Sub-components for Clean UI ---

function NumericStepper({ label, value, onChange, color = "indigo", sublabel }: { label: string, value: number, onChange: (val: number) => void, color?: string, sublabel?: string }) {
    return (
        <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 truncate max-w-[100px]">{label}</span>
            <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-[1.5rem] p-1.5 shadow-2xl">
                <button 
                    onClick={() => onChange(Math.max(0, value - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 active:scale-90 transition-all text-slate-500 hover:text-white"
                >
                    <Minus size={14} />
                </button>
                <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={value}
                    onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center text-2xl font-black text-white font-mono tabular-nums bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button 
                    onClick={() => onChange(value + 1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl bg-${color}-500/10 hover:bg-${color}-500/20 active:scale-90 transition-all text-${color}-400`}
                >
                    <Plus size={14} />
                </button>
            </div>
            {sublabel && <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{sublabel}</span>}
        </div>
    );
}

function PeriodScoreRow({
    periodLabel,
    isActive,
    onActivate,
    scoreA,
    scoreB,
    onChangeA,
    onChangeB,
    onDelete,
    teamA,
    teamB,
    color = "indigo",
}: {
    periodLabel: string;
    isActive: boolean;
    onActivate: () => void;
    scoreA: number;
    scoreB: number;
    onChangeA: (v: number) => void;
    onChangeB: (v: number) => void;
    onDelete?: () => void;
    teamA: string;
    teamB: string;
    color?: string;
}) {
    return (
        <div className={`p-3 rounded-2xl border transition-colors ${isActive ? `bg-${color}-500/10 border-${color}-500/20` : 'bg-black/20 border-white/5'}`}>
            <div className="flex items-center justify-between mb-2">
                <button
                    type="button"
                    onClick={onActivate}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? `bg-${color}-500 animate-pulse` : 'bg-slate-700'}`} />
                    {periodLabel}
                    {isActive && <span className={`text-${color}-400 text-[8px]`}>(VIVO)</span>}
                </button>
                {onDelete && (
                    <button onClick={onDelete} className="p-1.5 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all">
                        <X size={12} />
                    </button>
                )}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[8px] font-bold text-slate-600 uppercase truncate max-w-full">{teamA}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onChangeA(Math.max(0, scoreA - 1))} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 active:scale-90">-</button>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={scoreA}
                            onChange={(e) => onChangeA(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-10 h-8 text-center text-lg font-black text-white font-mono bg-black/30 rounded-lg outline-none border border-white/5 focus:border-indigo-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button onClick={() => onChangeA(scoreA + 1)} className={`w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-${color}-400 active:scale-90`}>+</button>
                    </div>
                </div>
                <span className="text-slate-700 text-xs font-black">VS</span>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[8px] font-bold text-slate-600 uppercase truncate max-w-full">{teamB}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => onChangeB(Math.max(0, scoreB - 1))} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 active:scale-90">-</button>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={scoreB}
                            onChange={(e) => onChangeB(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-10 h-8 text-center text-lg font-black text-white font-mono bg-black/30 rounded-lg outline-none border border-white/5 focus:border-purple-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button onClick={() => onChangeB(scoreB + 1)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-purple-400 active:scale-90">+</button>
                    </div>
                </div>
            </div>
            {!isActive && (
                <button
                    type="button"
                    onClick={onActivate}
                    className={`w-full mt-2 py-1.5 rounded-xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-500 text-[8px] font-black uppercase tracking-widest hover:bg-${color}-500 hover:text-white transition-all`}
                >
                    Proyectar EN VIVO
                </button>
            )}
            {isActive && (
                <div className={`w-full mt-2 py-1.5 rounded-xl bg-${color}-500/20 border border-${color}-500/40 text-${color}-400 text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1`}>
                    <Activity size={10} className="animate-pulse" />
                    EN VIVO
                </div>
            )}
        </div>
    );
}

type Jugador = {
    id: number;
    nombre: string;
    numero: number | null;
    equipo: string;
};

type Evento = {
    id: number;
    tipo_evento: string;
    minuto: number;
    jugador_id: number | null;
    equipo: string;
    descripcion: string | null;
    created_at: string;
    jugadores?: Jugador;
};

const getEventosTipos = (sport: string) => {
    if (sport === 'Baloncesto') return [
        { value: 'punto_1', label: '1️⃣ +1 Punto', color: 'success' },
        { value: 'punto_2', label: '2️⃣ +2 Puntos', color: 'success' },
        { value: 'punto_3', label: '3️⃣ +3 Puntos', color: 'warning' },
        { value: 'falta', label: '⛔ Falta', color: 'danger' },
    ];
    if (sport === 'Voleibol') return [
        { value: 'punto', label: '🏐 Punto', color: 'success' },
        { value: 'cambio', label: '🔄 Cambio', color: 'warning' },
    ];
    // Fútbol y otros
    return [
        { value: 'gol', label: '⚽ Gol', color: 'success' },
        { value: 'tarjeta_amarilla', label: '🟨 Tarjeta Amarilla', color: 'warning' },
        { value: 'tarjeta_roja', label: '🟥 Tarjeta Roja', color: 'danger' },
    ];
};

export function EditMatchModal({ match, isOpen, onClose, profile }: EditMatchModalProps) {
    const [loading, setLoading] = useState(false);
    const [jugadoresA, setJugadoresA] = useState<Jugador[]>([]);
    const [jugadoresB, setJugadoresB] = useState<Jugador[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);

    // Cronómetro
    const [minutoActual, setMinutoActual] = useState(0);
    const [cronometroActivo, setCronometroActivo] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [tempTime, setTempTime] = useState("0");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Edición manual de marcador
    const [isEditingScoreA, setIsEditingScoreA] = useState(false);
    const [tempScoreA, setTempScoreA] = useState("0");
    const [isEditingScoreB, setIsEditingScoreB] = useState(false);
    const [tempScoreB, setTempScoreB] = useState("0");

    // Nuevo evento
    const [showEventMenu, setShowEventMenu] = useState(false);
    const [nuevoEvento, setNuevoEvento] = useState({
        tipo: '',
        equipo: '',
        jugador_id: null as number | null,
    });

    // Edición Avanzada (todos los deportes)
    const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
    const [advancedSets, setAdvancedSets] = useState<any>({});
    const [advancedFutbolTiempos, setAdvancedFutbolTiempos] = useState<Record<number, { goles_a: number; goles_b: number }>>({});
    // Nuevo estado local para evitar depender únicamente de la prop 'match' que puede estar cacheada
    const [localDetalle, setLocalDetalle] = useState<any>(match?.marcador_detalle || {});
    const [advancedSetActual, setAdvancedSetActual] = useState(1);
    const [manualScoreA, setManualScoreA] = useState('0');
    const [manualScoreB, setManualScoreB] = useState('0');
    const [manualPeriod, setManualPeriod] = useState(1);
    const [manualMinute, setManualMinute] = useState(0);

    // Sincronizar estado local cuando cambia la prop (prop -> local)
    useEffect(() => {
        if (match?.marcador_detalle) {
            setLocalDetalle(match.marcador_detalle);
        }
    }, [match?.marcador_detalle]);

    const openAdvancedEdit = () => {
        const d = localDetalle || {};
        const sport = match.disciplinas?.name || '';

        setManualScoreA((d.total_a ?? d.goles_a ?? d.puntos_a ?? 0).toString());
        setManualScoreB((d.total_b ?? d.goles_b ?? d.puntos_b ?? 0).toString());
        setManualMinute(minutoActual);

        if (sport === 'Baloncesto') {
            setManualPeriod(d.cuarto_actual || 1);
            setAdvancedSets(JSON.parse(JSON.stringify(d.cuartos || {})));
            setAdvancedSetActual(d.cuarto_actual || 1);
            setAdvancedFutbolTiempos({});
        } else if (sport === 'Fútbol') {
            setManualPeriod(d.tiempo_actual || 1);
            setAdvancedSets({});
            setAdvancedSetActual(d.tiempo_actual || 1);
            const tiempos: Record<number, { goles_a: number; goles_b: number }> = {};
            if (d.tiempos) {
                for (const [k, v] of Object.entries(d.tiempos)) {
                    tiempos[Number(k)] = { goles_a: (v as any)?.goles_a ?? 0, goles_b: (v as any)?.goles_b ?? 0 };
                }
            }
            if (!tiempos[1]) tiempos[1] = { goles_a: 0, goles_b: 0 };
            if (!tiempos[2]) tiempos[2] = { goles_a: 0, goles_b: 0 };
            setAdvancedFutbolTiempos(tiempos);
        } else {
            setManualPeriod(d.set_actual || 1);
            setAdvancedSets(JSON.parse(JSON.stringify(d.sets || {})));
            setAdvancedSetActual(d.set_actual || 1);
            setAdvancedFutbolTiempos({});
        }

        setShowAdvancedEdit(true);
    };

    const handleAdvChange = (setNum: number, field: string, value: string) => {
        // Permitir vacío temporalmente mientras se borra/escribe, o parseInt
        const val = value === '' ? '' : parseInt(value);
        setAdvancedSets((prev: any) => {
            const next = {
                ...prev,
                [setNum]: {
                    ...(prev[setNum] || {}),
                    [field]: typeof val === 'number' ? Math.max(0, val) : 0
                }
            };
            return next;
        });
    };

    const handleDeleteSet = (setNum: number) => {
        const nextSets = { ...advancedSets };
        delete nextSets[setNum];
        setAdvancedSets(nextSets);
        
        // Si borramos el periodo actual, retroceder al anterior disponible o al 1
        if (manualPeriod === setNum) {
            const remainingSets = Object.keys(nextSets).map(Number).sort((a,b) => b-a);
            const fallback = remainingSets.find(s => s < setNum) || remainingSets[0] || 1;
            setManualPeriod(fallback);
            setAdvancedSetActual(fallback);
        }
        
        toast.success(`Set ${setNum} eliminado. Recuerda Confirmar para actualizar el marcador global.`);
    };

    const saveAdvancedEdit = async () => {
        if (!match) return;
        setLoading(true);
        const sport = match.disciplinas?.name || '';

        // 1. Fetch LATEST state to avoid overwriting recent changes (like clock ticks)
        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', match.id)
            .single();

        const latestDetalle = freshMatch?.marcador_detalle || localDetalle || {};

        // 2. Prepare the new forced state
        let forcedDetalle = {
            ...latestDetalle,
            minuto_actual: manualMinute,
            ultimo_update: new Date().toISOString()
        };

        // 3. Delegate to sport logic for fields sensitization
        forcedDetalle.set_actual = manualPeriod;
        forcedDetalle.cuarto_actual = manualPeriod;
        forcedDetalle.tiempo_actual = manualPeriod;

        if (sport === 'Voleibol' || sport === 'Tenis' || sport === 'Tenis de Mesa') {
            forcedDetalle.sets = advancedSets;
        } else if (sport === 'Baloncesto') {
            forcedDetalle.cuartos = advancedSets;
        } else if (sport === 'Fútbol') {
            forcedDetalle.tiempos = advancedFutbolTiempos;
        }

        forcedDetalle = setPoints(sport, forcedDetalle, 'equipo_a', parseInt(manualScoreA) || 0);
        forcedDetalle = setPoints(sport, forcedDetalle, 'equipo_b', parseInt(manualScoreB) || 0);
        
        // Final sanity re-calc
        forcedDetalle = recalculateTotals(sport, forcedDetalle);

        const { error } = await supabase
            .from('partidos')
            .update({ marcador_detalle: stampAudit(forcedDetalle, profile) })
            .eq('id', match.id);

        setLoading(false);
        if (error) {
            console.error('Error saving advanced edit:', error);
            toast.error('No se pudo guardar: ' + (error.message || 'Error Desconocido'));
        } else {
            setLocalDetalle(forcedDetalle);
            setMinutoActual(manualMinute);
            toast.success('Estado del partido actualizado con éxito');
            setShowAdvancedEdit(false);
        }
    };

    // Cargar jugadores y eventos
    useEffect(() => {
        if (match && isOpen) {
            console.log('📊 Cargando datos del partido:', match.id);
            fetchJugadores();
            fetchEventos();

            // Cargar estado del cronómetro
            const detalle = match.marcador_detalle || {};
            if (detalle.minuto_actual) {
                setMinutoActual(detalle.minuto_actual);
            }

            // Inicializar periodo manual basado en el estado actual del partido
            const sport = match.disciplinas?.name || '';
            if (sport === 'Baloncesto') setManualPeriod(detalle.cuarto_actual || 1);
            else if (sport === 'Fútbol') setManualPeriod(detalle.tiempo_actual || 1);
            else setManualPeriod(detalle.set_actual || 1);

            if (detalle.estado_cronometro === 'corriendo') {
                setCronometroActivo(true);
            }
        }
    }, [match, isOpen]);

    useEffect(() => {
        if (cronometroActivo) {
            console.log('⏱️ Cronómetro iniciado (Tiempo Real)');
            const sportName = match.disciplinas?.name || '';
            const isCountdown = sportName === 'Baloncesto';
            
            // ⚠️ EXTREMELY IMPORTANT: We DISABLED auto-syncing the minute to the DB every 60s
            // because it causes race conditions where it fetches the OLD state and overwrites
            // a score update that just happened. The minute will be saved with every manual score
            // change or when explicitly clicking pause/resume/stop.
            intervalRef.current = setInterval(() => {
                setMinutoActual(prev => {
                    const nuevo = isCountdown ? Math.max(0, prev - 1) : prev + 1;
                    return nuevo;
                });
            }, 60000); 
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                console.log('⏱️ Cronómetro pausado');
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [cronometroActivo]);

    const fetchJugadores = async () => {
        console.log('👥 Cargando jugadores...');
        const { data, error } = await supabase
            .from('roster_partido')
            .select('*, jugador:jugadores(*)')
            .eq('partido_id', match.id);

        if (error) {
            console.error('❌ Error cargando jugadores:', error);
        } else if (data) {
            console.log('✅ Jugadores cargados:', data.length);
            const transformed = data.map((r: any) => ({
                id: r.jugador?.id,
                roster_id: r.id,
                nombre: r.jugador?.nombre,
                numero: r.jugador?.numero,
                equipo: r.equipo_a_or_b,
                profile_id: r.jugador?.profile_id
            }));
            setJugadoresA(transformed.filter(j => j.equipo === 'equipo_a'));
            setJugadoresB(transformed.filter(j => j.equipo === 'equipo_b'));
        }
    };

    const fetchEventos = async () => {
        console.log('📋 Cargando eventos...');
        const { data, error } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:jugadores!jugador_id_normalized(*)')
            .eq('partido_id', match.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error cargando eventos:', error);
        } else if (data) {
            setEventos(data);
        }
    };

    // --- SCORING FUNCTIONS ---

    const handleUpdateScore = async (equipo: 'equipo_a' | 'equipo_b', puntos: number = 1) => {
        const deporte = match.disciplinas?.name || 'Genérico';
        const detalleActual = localDetalle || {};
        
        // --- TARGET SELECTION ---
        // Si el usuario seleccionó un periodo en la barra superior (manualPeriod), 
        // forzamos ese periodo temporalmente para que la mutación ocurra allí.
        const detailToMutate = { ...detalleActual };
        const officialQuarter = detailToMutate.cuarto_actual;
        const officialTime = detailToMutate.tiempo_actual;
        const officialSet = detailToMutate.set_actual;

        if (deporte === 'Baloncesto') detailToMutate.cuarto_actual = manualPeriod;
        else if (deporte === 'Fútbol') detailToMutate.tiempo_actual = manualPeriod;
        else detailToMutate.set_actual = manualPeriod;

        // Optimistic local update
        const nuevoDetalle = addPoints(deporte, detailToMutate, equipo, puntos);

        // RESTORE official session period to avoid flickering labels in public view
        nuevoDetalle.cuarto_actual = officialQuarter;
        nuevoDetalle.tiempo_actual = officialTime;
        nuevoDetalle.set_actual = officialSet;

        setLocalDetalle(nuevoDetalle);

        const { error } = await supabase
            .from('partidos')
            .update({ marcador_detalle: stampAudit(nuevoDetalle, profile) })
            .eq('id', match.id);

        if (error) {
            console.error('CRITICAL: Score Update Failed:', error);
            toast.error(`Error DB: ${error.message}`);
            setLocalDetalle(detalleActual); // Rollback
        }
    };

    const handleUndoScore = async (equipo: 'equipo_a' | 'equipo_b', puntos: number = 1) => {
        const deporte = match.disciplinas?.name || 'Genérico';
        const detalleActual = localDetalle || {};
        
        // --- TARGET SELECTION ---
        const detailToMutate = { ...detalleActual };
        const officialQuarter = detailToMutate.cuarto_actual;
        const officialTime = detailToMutate.tiempo_actual;
        const officialSet = detailToMutate.set_actual;

        if (deporte === 'Baloncesto') detailToMutate.cuarto_actual = manualPeriod;
        else if (deporte === 'Fútbol') detailToMutate.tiempo_actual = manualPeriod;
        else detailToMutate.set_actual = manualPeriod;

        const nuevoDetalle = removePoints(deporte, detailToMutate, equipo, puntos);

        // RESTORE official session period
        nuevoDetalle.cuarto_actual = officialQuarter;
        nuevoDetalle.tiempo_actual = officialTime;
        nuevoDetalle.set_actual = officialSet;

        setLocalDetalle(nuevoDetalle);

        const { error } = await supabase
            .from('partidos')
            .update({ marcador_detalle: stampAudit(nuevoDetalle, profile) })
            .eq('id', match.id);

        if (error) {
            console.error('CRITICAL: Score Undo Failed:', error);
            toast.error(`Error DB: ${error.message}`);
            setLocalDetalle(detalleActual); // Rollback
        }
    };

    const handleSetScore = async (equipo: 'equipo_a' | 'equipo_b', valorNuevo: number) => {
        const deporte = match.disciplinas?.name || 'Genérico';
        const detalleActual = localDetalle || {};

        // --- TARGET SELECTION ---
        const detailToMutate = { ...detalleActual };
        const officialQuarter = detailToMutate.cuarto_actual;
        const officialTime = detailToMutate.tiempo_actual;
        const officialSet = detailToMutate.set_actual;

        if (deporte === 'Baloncesto') detailToMutate.cuarto_actual = manualPeriod;
        else if (deporte === 'Fútbol') detailToMutate.tiempo_actual = manualPeriod;
        else detailToMutate.set_actual = manualPeriod;

        const nuevoDetalle = setPoints(deporte, detailToMutate, equipo, valorNuevo);
        
        // RESTORE official session period
        nuevoDetalle.cuarto_actual = officialQuarter;
        nuevoDetalle.tiempo_actual = officialTime;
        nuevoDetalle.set_actual = officialSet;

        // Explicitly set the minute at the time of manual override
        nuevoDetalle.minuto_actual = minutoActual;

        setLocalDetalle(nuevoDetalle);
        
        const { error } = await supabase
            .from('partidos')
            .update({ marcador_detalle: stampAudit(nuevoDetalle, profile) })
            .eq('id', match.id);

        if (error) {
            console.error('Error setting score:', error);
            toast.error(`No se pudo guardar: ${error.message}`);
        }
    };

    const handleSaveManualScore = (equipo: 'equipo_a' | 'equipo_b') => {
        if (equipo === 'equipo_a') {
            handleSetScore('equipo_a', parseInt(tempScoreA) || 0);
            setIsEditingScoreA(false);
        } else {
            handleSetScore('equipo_b', parseInt(tempScoreB) || 0);
            setIsEditingScoreB(false);
        }
    };

    // Renderizado de controles de puntuación según deporte
    const renderScoreControls = (equipo: 'equipo_a' | 'equipo_b', currentScoreValue: number) => {
        const deporte = match.disciplinas?.name;

        const isEditing = equipo === 'equipo_a' ? isEditingScoreA : isEditingScoreB;
        const setEditing = equipo === 'equipo_a' ? setIsEditingScoreA : setIsEditingScoreB;
        const tempScore = equipo === 'equipo_a' ? tempScoreA : tempScoreB;
        const setTemp = equipo === 'equipo_a' ? setTempScoreA : setTempScoreB;

        if (isEditing) {
            return (
                <div className="flex gap-1.5 justify-center mt-3 animate-in fade-in zoom-in-95 duration-200">
                    <input
                        type="number"
                        value={tempScore}
                        onChange={(e) => setTemp(e.target.value)}
                        className="w-14 h-9 text-center rounded-lg bg-white/5 border border-white/10 text-white font-black font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveManualScore(equipo)}
                    />
                    <button 
                        onClick={() => handleSaveManualScore(equipo)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 active:scale-90 transition-all"
                    >
                        <Check size={16} />
                    </button>
                    <button 
                        onClick={() => setEditing(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
            );
        }

        const btnManualEdit = (
            <Button size="sm" variant="ghost" onClick={() => {
                setTemp(currentScoreValue.toString());
                setEditing(true);
            }} className="h-8 px-2 text-slate-500 hover:text-white">
                <Edit2 size={12} />
            </Button>
        );

        if (deporte === 'Voleibol' || deporte === 'Tenis' || deporte === 'Tenis de Mesa') {
            return (
                <div className="flex gap-2 justify-center mt-2 items-center">
                    <Button size="sm" variant="outline" onClick={() => handleUndoScore(equipo)} disabled={!match.marcador_detalle} className="h-8 w-8 p-0">
                        <Minus size={14} />
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateScore(equipo, 1)} className="bg-indigo-600 hover:bg-indigo-700 h-8 px-3">
                        +1 Punto
                    </Button>
                    {btnManualEdit}
                </div>
            );
        }

        if (deporte === 'Baloncesto') {
            return (
                <div className="flex gap-1 justify-center mt-2 items-center">
                    <Button size="sm" variant="outline" onClick={() => handleUpdateScore(equipo, 1)} className="h-8 px-2 text-xs">+1</Button>
                    <Button size="sm" variant="outline" onClick={() => handleUpdateScore(equipo, 2)} className="h-8 px-2 text-xs">+2</Button>
                    <Button size="sm" variant="outline" onClick={() => handleUpdateScore(equipo, 3)} className="h-8 px-2 text-xs">+3</Button>
                    {btnManualEdit}
                </div>
            );
        }

        // Fútbol y otros (Solo mostrar si es Admin manual, pero fútbol usa eventos)
        if (deporte === 'Fútbol') {
            return (
                <div className="flex justify-center mt-2 items-center gap-2">
                    <span className="text-[10px] text-slate-500">Usa "Nuevo Evento" para Goles</span>
                    {btnManualEdit}
                </div>
            );
        }

        return (
            <div className="flex justify-center mt-2 items-center gap-2">
                <Button size="sm" onClick={() => handleUpdateScore(equipo, 1)}>+1</Button>
                {btnManualEdit}
            </div>
        );
    };

    const actualizarMinutoEnDB = async (minuto: number) => {
        // PREVENT OVERWRITE: Fetch freshest data possible
        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', match.id)
            .single();

        const latestDetalle = freshMatch?.marcador_detalle || localDetalle || {};
        const nuevoDetalle = {
            ...latestDetalle,
            minuto_actual: minuto,
            estado_cronometro: cronometroActivo ? 'corriendo' : 'pausado',
            ultimo_update: new Date().toISOString()
        };

        setLocalDetalle(nuevoDetalle);

        const { error } = await supabase
            .from('partidos')
            .update({
                marcador_detalle: stampAudit(nuevoDetalle, profile) // Ensure audit is preserved
            })
            .eq('id', match.id);

        if (error) {
            console.error('❌ Error actualizando minuto:', error);
        }
    };

    const iniciarPartido = async () => {
        console.log('🟢 Iniciando partido...');
        const sportName = match.disciplinas?.name || 'Fútbol';
        const isCountdown = sportName === 'Baloncesto';
        const initialMin = isCountdown ? 12 : 0;
        
        setCronometroActivo(true);
        setMinutoActual(initialMin);

        const nuevoDetalle = {
            ...match.marcador_detalle,
            tiempo_inicio: new Date().toISOString(),
            minuto_actual: initialMin,
            estado_cronometro: 'corriendo',
            ultimo_update: new Date().toISOString(),
            ...(isCountdown ? { cuarto_actual: 1 } : {})
        };

        setLocalDetalle(nuevoDetalle);

        const { error: updateError } = await supabase
            .from('partidos')
            .update({
                estado: 'en_curso',
                marcador_detalle: nuevoDetalle
            })
            .eq('id', match.id);

        if (updateError) {
            console.error('❌ Error iniciando partido:', updateError);
            toast.error("Error al iniciar partido");
            return;
        }

        const { error: eventError } = await supabase
            .from('olympics_eventos')
            .insert({
                partido_id: match.id,
                tipo_evento: 'inicio',
                minuto: initialMin,
                equipo: 'sistema',
                periodo: 1,
                descripcion: stampEventAudit('Inicio del partido', profile)
            });

        if (eventError) {
            console.error('❌ Error creando evento de inicio:', eventError);
        } else {
            console.log('✅ Partido iniciado correctamente');
            fetchEventos();
        }
    };

    const pausarCronometro = () => {
        console.log('⏸️ Pausando cronómetro...');
        setCronometroActivo(false);
        actualizarMinutoEnDB(minutoActual);
    };

    const reanudarCronometro = () => {
        console.log('▶️ Reanudando cronómetro...');
        // Force the new ultimo_update on resume
        actualizarMinutoEnDB(minutoActual);
        setCronometroActivo(true);
    };

    const handleSaveManualTime = () => {
        const nuevoMinuto = parseInt(tempTime) || 0;
        setMinutoActual(nuevoMinuto);
        actualizarMinutoEnDB(nuevoMinuto); // Saves with new ultimo_update explicitly
        setIsEditingTime(false);
    };

    const finalizarPartido = async () => {
        console.log('🏁 Finalizando partido...');
        setCronometroActivo(false);

        const nuevoDetalle = {
            ...match.marcador_detalle,
            minuto_actual: minutoActual,
            estado_cronometro: 'detenido',
            ultimo_update: new Date().toISOString()
        };

        setLocalDetalle(nuevoDetalle);

        const { error: updateError } = await supabase
            .from('partidos')
            .update({
                estado: 'finalizado',
                marcador_detalle: nuevoDetalle
            })
            .eq('id', match.id);

        if (updateError) {
            console.error('❌ Error finalizando partido:', updateError);
            return;
        }

        const { error: eventError } = await supabase
            .from('olympics_eventos')
            .insert({
                partido_id: match.id,
                tipo_evento: 'fin',
                minuto: minutoActual,
                equipo: 'sistema',
                periodo: getCurrentPeriodNumber(match.disciplinas?.name, match.marcador_detalle),
                descripcion: stampEventAudit('Fin del partido', profile)
            });

        if (eventError) {
            console.error('❌ Error creando evento de fin:', eventError);
        } else {
            console.log('✅ Partido finalizado correctamente');
            fetchEventos();
        }
    };

    const agregarEvento = async () => {
        console.log('📝 Agregando evento:', nuevoEvento);

        if (!nuevoEvento.tipo || !nuevoEvento.equipo || !nuevoEvento.jugador_id) {
            alert('Por favor completa todos los campos');
            return;
        }

        const { error } = await supabase
            .from('olympics_eventos')
            .insert({
                partido_id: match.id,
                tipo_evento: nuevoEvento.tipo,
                minuto: minutoActual,
                equipo: nuevoEvento.equipo,
                jugador_id: nuevoEvento.jugador_id,
                periodo: getCurrentPeriodNumber(match.disciplinas?.name, match.marcador_detalle),
                descripcion: stampEventAudit(null, profile)
            });

        if (error) {
            console.error('❌ Error agregando evento:', error);
            alert('Error al registrar evento: ' + error.message);
            return;
        }

        // Si es gol, actualizar marcador
        if (nuevoEvento.tipo === 'gol') {
            console.log('⚽ Actualizando marcador (Fútbol)...');
            // Fetch fresh data from DB to avoid stale state
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle')
                .eq('id', match.id)
                .single();
            const detalleActual = freshMatch?.marcador_detalle || match.marcador_detalle || {};
            const deporte = match.disciplinas?.name || 'Fútbol';

            // Usar addPoints con equipo correcto
            const nuevoDetalle = addPoints(deporte, detalleActual, nuevoEvento.equipo as any, 1);

            const { error: scoreError } = await supabase
                .from('partidos')
                .update({ marcador_detalle: nuevoDetalle })
                .eq('id', match.id);

            if (scoreError) {
                console.error('❌ Error actualizando marcador:', scoreError);
            } else {
                console.log('✅ Marcador actualizado');
            }
        }

        console.log('✅ Evento registrado correctamente');
        setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
        setShowEventMenu(false);
        fetchEventos();
    };

    const agregarJugador = async (equipo: string) => {
        const nombre = prompt(`Nombre del jugador (${equipo === 'equipo_a' ? (match.carrera_a?.nombre || match.equipo_a) : (match.carrera_b?.nombre || match.equipo_b)}):`);
        if (!nombre) return;

        const numeroStr = prompt('Número de camiseta (opcional):');

        const { data: created, error: createError } = await supabase
            .from('jugadores')
            .insert({
                nombre,
                numero: numeroStr ? parseInt(numeroStr) : null,
                carrera_id: equipo === 'equipo_a' ? match.carrera_a_id : match.carrera_b_id
            })
            .select()
            .single();

        if (createError) {
            alert('Error al crear jugador: ' + createError.message);
            return;
        }

        const { error: rosterError } = await supabase
            .from('roster_partido')
            .insert({
                partido_id: match.id,
                jugador_id: created.id,
                equipo_a_or_b: equipo
            });

        if (rosterError) {
            alert('Error al vincular jugador: ' + rosterError.message);
        } else {
            fetchJugadores();
        }
    };

    if (!isOpen || !match) return null;

    // Calcular score visual usando la librería y el estado local (MUY IMPORTANTE)
    // Forzamos el uso de manualPeriod para que el modal muestre los puntos del cuarto/set seleccionado
    const displayDetalle = { 
        ...localDetalle, 
        cuarto_actual: manualPeriod,
        set_actual: manualPeriod,
        tiempo_actual: manualPeriod
    };
    const currentScore = getCurrentScore(match.disciplinas?.name, displayDetalle);
    const scoreA = currentScore.scoreA;
    const scoreB = currentScore.scoreB;
    const subScoreA = currentScore.subScoreA;
    const subScoreB = currentScore.subScoreB;
    const extraInfo = currentScore.extra;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            {/* Click outside to close (desktop only) */}
            <div className="absolute inset-0 hidden sm:block" onClick={onClose} />
            
            <div className="w-full h-[92dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-background rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-white/10 shadow-[0_0_100px_-20px_rgba(99,102,241,0.2)] flex flex-col relative z-20 animate-in slide-in-from-bottom-5 duration-500 overflow-hidden">
                {/* Mobile Drag Handle */}
                <div className="sm:hidden w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 shrink-0" />
                {/* Decorative Background Elements */}
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
                
                {/* Header */}
                <div className="flex items-center justify-between p-7 border-b border-white/5 bg-white/[0.02] relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Clock className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl uppercase tracking-tight text-white">Panel de Administración</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{match.disciplinas?.name} Command Center</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 sm:space-y-10 relative z-10 custom-scrollbar">
                    {/* Period Selector - Intuitive Navigation */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar">
                        {(() => {
                            const sport = match.disciplinas?.name || '';
                            const base = sport === 'Baloncesto' ? [1, 2, 3, 4] : sport === 'Fútbol' ? [1, 2] : [1, 2, 3, 4, 5];
                            // Combine base periods with any additional ones in data or the current manual selection
                            const all = Array.from(new Set([
                                ...base, 
                                manualPeriod, 
                                (localDetalle?.cuarto_actual || localDetalle?.set_actual || localDetalle?.tiempo_actual || 1)
                            ])).sort((a, b) => a - b);

                            return (
                                <>
                                    {all.map((p) => {
                                        const isActive = manualPeriod === p;
                                        let label = '';
                                        if (sport === 'Baloncesto') label = p > 4 ? `OT ${p - 4}` : `${p}º Q`;
                                        else if (sport === 'Fútbol') label = `${p}º T`;
                                        else label = `Set ${p}`;

                                        return (
                                            <button
                                                key={p}
                                                onClick={() => {
                                                    setManualPeriod(p);
                                                    if (sport === 'Voleibol' || sport === 'Tenis' || sport === 'Tenis de Mesa') {
                                                        setAdvancedSetActual(p);
                                                    } else if (sport === 'Baloncesto') {
                                                        setAdvancedSetActual(p);
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                                                    isActive
                                                        ? 'bg-indigo-500 border-indigo-400 text-black shadow-lg shadow-indigo-500/20'
                                                        : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        onClick={openAdvancedEdit}
                                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Edit2 size={12} /> Corregir Todo
                                    </button>
                                </>
                            );
                        })()}
                    </div>

                    {/* Marcador y Cronómetro - Responsive Sport-Aware Hero */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-6 sm:gap-8 bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 sm:p-8 items-center shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        
                        {/* Equipo A */}
                        <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 text-center">
                            <div className="flex items-center sm:flex-col gap-3 sm:gap-4 order-1 sm:order-none text-left sm:text-center shrink-0">
                                <Avatar name={match.carrera_a?.nombre || match.equipo_a} size="lg" className="w-14 h-14 sm:w-20 sm:h-20 ring-2 sm:ring-4 ring-indigo-500/20 shadow-xl" />
                                <div className="space-y-0 sm:space-y-1">
                                    <p className="font-black text-sm sm:text-xl tracking-tight text-white line-clamp-1">{match.carrera_a?.nombre || match.equipo_a}</p>
                                    <p className="text-[8px] sm:text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Local</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center order-2 sm:order-none">
                                <p className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none">{scoreA}</p>
                                {subScoreA !== undefined && (
                                    <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest mt-1">
                                        {currentScore.subLabel}: {subScoreA}
                                    </span>
                                )}
                            </div>
                            
                            <div className="order-3 sm:order-none sm:w-full">
                                {renderScoreControls('equipo_a', scoreA)}
                            </div>
                        </div>

                        {/* Cronómetro / Info Central */}
                        <div className="flex flex-col items-center justify-center py-4 bg-white/5 rounded-3xl border border-white/5 sm:min-w-[240px] relative order-first sm:order-none">
                            {extraInfo && (
                                <Badge className="absolute -top-3 bg-indigo-500 text-black font-black uppercase tracking-widest px-3 border-4 border-[#0c0a1a] scale-90 sm:scale-100">{extraInfo}</Badge>
                            )}

                            {['Fútbol', 'Baloncesto', 'Futsal', 'Balonmano'].includes(match.disciplinas?.name) ? (
                                <div className="flex flex-col items-center gap-2">
                                    {isEditingTime ? (
                                        <div className="flex flex-col items-center gap-2 animate-in fade-in py-2">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={tempTime}
                                                    onChange={(e) => setTempTime(e.target.value)}
                                                    className="w-16 sm:w-20 h-10 sm:h-12 text-center text-xl sm:text-2xl font-black font-mono bg-black/40 border-white/10"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveManualTime()}
                                                />
                                                <span className="text-xl font-black text-slate-500">'</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="sm" className="h-7 px-3 bg-green-600 text-[10px] font-bold" onClick={handleSaveManualTime}>OK</Button>
                                                <Button size="sm" variant="ghost" className="h-7 px-3 text-[10px]" onClick={() => setIsEditingTime(false)}>ESC</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="text-5xl sm:text-6xl font-black font-mono text-primary cursor-pointer hover:text-indigo-400 transition-all group relative px-8 py-2 rounded-2xl hover:bg-white/[0.03]"
                                            onClick={() => {
                                                setTempTime(minutoActual.toString());
                                                setIsEditingTime(true);
                                            }}
                                        >
                                            {minutoActual}'
                                            <Edit2 size={12} className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400" />
                                        </div>
                                    )}

                                    <div className="flex gap-2 w-full px-4">
                                        {match.estado === 'programado' ? (
                                            <Button onClick={iniciarPartido} className="w-full bg-indigo-500 text-black font-black uppercase tracking-widest text-xs h-11 rounded-xl">
                                                <Play size={16} fill="currentColor" /> INICIAR
                                            </Button>
                                        ) : match.estado === 'en_curso' ? (
                                            <>
                                                {cronometroActivo ? (
                                                    <Button onClick={pausarCronometro} variant="secondary" className="flex-1 h-11 rounded-xl border-white/5">
                                                        <Pause size={16} fill="currentColor" />
                                                    </Button>
                                                ) : (
                                                    <Button onClick={reanudarCronometro} variant="secondary" className="flex-1 h-11 rounded-xl border-white/5">
                                                        <Play size={16} fill="currentColor" />
                                                    </Button>
                                                )}
                                                
                                                {/* Botón Siguiente Cuarto / Tiempo */}
                                                <Button 
                                                    variant="outline" 
                                                    className="flex-1 h-11 rounded-xl bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500 hover:text-black transition-all"
                                                    onClick={async () => {
                                                        const sport = match.disciplinas?.name || '';
                                                        const nuevoDetalle = nextPeriod(sport, localDetalle);
                                                        setLocalDetalle(nuevoDetalle);
                                                        setManualPeriod(getCurrentPeriodNumber(sport, nuevoDetalle));
                                                        
                                                        const { error } = await supabase
                                                            .from('partidos')
                                                            .update({ marcador_detalle: stampAudit(nuevoDetalle, profile) })
                                                            .eq('id', match.id);
                                                            
                                                        if (error) toast.error("Error al avanzar periodo");
                                                        else toast.success(`Iniciando ${sport === 'Baloncesto' ? 'Cuarto' : 'Tiempo'} ${getCurrentPeriodNumber(sport, nuevoDetalle)}`);
                                                    }}
                                                >
                                                    <ChevronRight size={18} />
                                                </Button>

                                                <Button onClick={finalizarPartido} variant="ghost" className="flex-1 h-11 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5">
                                                    <Square size={16} fill="currentColor" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest opacity-40">Finalizado</Badge>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-2">
                                    <div className="flex justify-center gap-3">
                                        {match.estado === 'programado' && (
                                            <Button onClick={iniciarPartido} className="bg-indigo-500 text-black font-black px-6 h-11 rounded-xl">
                                                <Play size={16} fill="currentColor" className="mr-2" /> INICIAR
                                            </Button>
                                        )}
                                        {match.estado === 'en_curso' && (
                                            <Button onClick={finalizarPartido} variant="ghost" className="h-11 rounded-xl text-red-500 hover:text-white hover:bg-red-500 border border-red-500/20 px-6 font-black uppercase tracking-widest text-xs">
                                                <Square size={16} fill="currentColor" className="mr-2" /> FINALIZAR
                                            </Button>
                                        )}
                                        {match.estado === 'finalizado' && <Badge variant="outline" className="font-black uppercase tracking-widest opacity-40">PARTIDO FINALIZADO</Badge>}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Equipo B */}
                        <div className="flex flex-row-reverse sm:flex-col items-center justify-between sm:justify-center gap-4 text-center">
                            <div className="flex flex-row-reverse sm:flex-col items-center gap-3 sm:gap-4 order-1 sm:order-none text-right sm:text-center shrink-0">
                                <Avatar name={match.carrera_b?.nombre || match.equipo_b} size="lg" className="w-14 h-14 sm:w-20 sm:h-20 ring-2 sm:ring-4 ring-purple-500/20 shadow-xl" />
                                <div className="space-y-0 sm:space-y-1">
                                    <p className="font-black text-sm sm:text-xl tracking-tight text-white line-clamp-1">{match.carrera_b?.nombre || match.equipo_b}</p>
                                    <p className="text-[8px] sm:text-[10px] font-bold text-purple-400 uppercase tracking-widest text-center">Visitante</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center order-2 sm:order-none">
                                <p className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none">{scoreB}</p>
                                {subScoreB !== undefined && (
                                    <span className="text-[10px] font-black text-purple-400/60 uppercase tracking-widest mt-1">
                                        {currentScore.subLabel}: {subScoreB}
                                    </span>
                                )}
                            </div>
                            
                            <div className="order-3 sm:order-none sm:w-full">
                                {renderScoreControls('equipo_b', scoreB)}
                            </div>
                        </div>
                    </div>

                    {/* Panel de Edición Avanzada — Mobile First */}
                    {showAdvancedEdit && (
                        <div className="rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 space-y-5 border-2 border-indigo-500/30 bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                            
                            {/* Header */}
                            <div className="flex justify-between items-start relative z-10">
                                <div className="min-w-0">
                                    <h4 className="font-black text-base sm:text-xl uppercase tracking-tighter flex items-center gap-2 text-white">
                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full shrink-0" />
                                        Corrección Manual
                                    </h4>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Edita marcador total y por período</p>
                                </div>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-white/5 shrink-0" onClick={() => setShowAdvancedEdit(false)}>
                                    <X size={18} className="text-slate-500" />
                                </Button>
                            </div>

                            <div className="space-y-5 relative z-10">
                                {/* Marcador Global */}
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                                    <h5 className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Marcador Global</h5>
                                    <div className="flex items-center justify-around gap-2">
                                        <NumericStepper 
                                            label={match.carrera_a?.nombre || match.equipo_a} 
                                            value={parseInt(manualScoreA)} 
                                            onChange={v => setManualScoreA(v.toString())}
                                            color="indigo"
                                        />
                                        <span className="text-slate-700 text-xs font-black">VS</span>
                                        <NumericStepper 
                                            label={match.carrera_b?.nombre || match.equipo_b} 
                                            value={parseInt(manualScoreB)} 
                                            onChange={v => setManualScoreB(v.toString())}
                                            color="purple"
                                        />
                                    </div>
                                </div>

                                {/* Minuto y Periodo actual */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center">
                                        <NumericStepper 
                                            label="Minuto" 
                                            value={manualMinute} 
                                            onChange={setManualMinute}
                                            color="emerald"
                                        />
                                    </div>
                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center">
                                        <NumericStepper 
                                            label={match.disciplinas?.name === 'Baloncesto' ? 'Cuarto' : match.disciplinas?.name === 'Fútbol' ? 'Tiempo' : 'Set'} 
                                            value={manualPeriod} 
                                            onChange={setManualPeriod}
                                            color="amber"
                                        />
                                    </div>
                                </div>

                                {/* Desglose por períodos */}
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                    <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Desglose por Períodos</h5>
                                    
                                    {(() => {
                                        const sport = match.disciplinas?.name || '';
                                        const teamA = match.carrera_a?.nombre || match.equipo_a;
                                        const teamB = match.carrera_b?.nombre || match.equipo_b;

                                        if (sport === 'Baloncesto') {
                                            const quarters = Object.keys(advancedSets).map(Number).sort((a, b) => a - b);
                                            return (
                                                <div className="space-y-3">
                                                    {quarters.length === 0 && (
                                                        <p className="text-[9px] text-slate-600 italic text-center py-3">Sin datos de cuartos. Añade uno abajo.</p>
                                                    )}
                                                    {quarters.map(qNum => (
                                                        <PeriodScoreRow
                                                            key={qNum}
                                                            periodLabel={qNum > 4 ? `PRÓRROGA ${qNum-4}` : `${qNum}º CUARTO`}
                                                            isActive={manualPeriod === qNum}
                                                            onActivate={() => setManualPeriod(qNum)}
                                                            scoreA={advancedSets[qNum]?.puntos_a || 0}
                                                            scoreB={advancedSets[qNum]?.puntos_b || 0}
                                                            onChangeA={v => handleAdvChange(qNum, 'puntos_a', v.toString())}
                                                            onChangeB={v => handleAdvChange(qNum, 'puntos_b', v.toString())}
                                                            onDelete={() => handleDeleteSet(qNum)}
                                                            teamA={teamA}
                                                            teamB={teamB}
                                                            color="orange"
                                                        />
                                                    ))}
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const nextQ = Math.max(4, ...Object.keys(advancedSets).map(Number), 0) + 1;
                                                            handleAdvChange(nextQ, 'puntos_a', '0');
                                                            handleAdvChange(nextQ, 'puntos_b', '0');
                                                            setManualPeriod(nextQ);
                                                            toast.info(`Añadido ${nextQ > 4 ? `Prórroga ${nextQ-4}` : `${nextQ}º Cuarto`}`);
                                                        }}
                                                        className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 text-slate-500 hover:text-orange-400 text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={14} />
                                                        Añadir Cuarto / Prórroga
                                                    </button>
                                                </div>
                                            );
                                        }

                                        if (sport === 'Voleibol' || sport === 'Tenis' || sport === 'Tenis de Mesa') {
                                            const fieldA = sport === 'Tenis' ? 'juegos_a' : 'puntos_a';
                                            const fieldB = sport === 'Tenis' ? 'juegos_b' : 'puntos_b';
                                            return (
                                                <div className="space-y-3">
                                                    {[1, 2, 3, 4, 5].map(setNum => (
                                                        <PeriodScoreRow
                                                            key={setNum}
                                                            periodLabel={`SET ${setNum}`}
                                                            isActive={manualPeriod === setNum}
                                                            onActivate={() => setManualPeriod(setNum)}
                                                            scoreA={advancedSets[setNum]?.[fieldA] || 0}
                                                            scoreB={advancedSets[setNum]?.[fieldB] || 0}
                                                            onChangeA={v => handleAdvChange(setNum, fieldA, v.toString())}
                                                            onChangeB={v => handleAdvChange(setNum, fieldB, v.toString())}
                                                            onDelete={advancedSets[setNum] ? () => handleDeleteSet(setNum) : undefined}
                                                            teamA={teamA}
                                                            teamB={teamB}
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        }

                                        if (sport === 'Fútbol') {
                                            const tiempoKeys = Object.keys(advancedFutbolTiempos).map(Number).sort((a, b) => a - b);
                                            const handleFutbolChange = (t: number, side: 'goles_a' | 'goles_b', v: number) => {
                                                setAdvancedFutbolTiempos(prev => ({
                                                    ...prev,
                                                    [t]: { ...prev[t], [side]: v }
                                                }));
                                            };
                                            return (
                                                <div className="space-y-3">
                                                    {tiempoKeys.map(t => (
                                                        <PeriodScoreRow
                                                            key={t}
                                                            periodLabel={t <= 2 ? `${t}º TIEMPO` : `PRÓRROGA ${t - 2}`}
                                                            isActive={manualPeriod === t}
                                                            onActivate={() => setManualPeriod(t)}
                                                            scoreA={advancedFutbolTiempos[t]?.goles_a || 0}
                                                            scoreB={advancedFutbolTiempos[t]?.goles_b || 0}
                                                            onChangeA={v => handleFutbolChange(t, 'goles_a', v)}
                                                            onChangeB={v => handleFutbolChange(t, 'goles_b', v)}
                                                            onDelete={t > 2 ? () => {
                                                                setAdvancedFutbolTiempos(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[t];
                                                                    return next;
                                                                });
                                                                if (manualPeriod === t) setManualPeriod(Math.min(t - 1, 2));
                                                            } : undefined}
                                                            teamA={teamA}
                                                            teamB={teamB}
                                                            color="emerald"
                                                        />
                                                    ))}
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            const nextT = Math.max(2, ...Object.keys(advancedFutbolTiempos).map(Number)) + 1;
                                                            setAdvancedFutbolTiempos(prev => ({ ...prev, [nextT]: { goles_a: 0, goles_b: 0 } }));
                                                            setManualPeriod(nextT);
                                                            toast.info(`Añadido ${nextT > 2 ? `Prórroga ${nextT - 2}` : `${nextT}º Tiempo`}`);
                                                        }}
                                                        className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-500 hover:text-emerald-400 text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={14} />
                                                        Añadir Prórroga
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="py-6 text-center bg-black/20 rounded-xl border border-dashed border-white/5">
                                                <AlertCircle size={24} className="mx-auto text-slate-700 mb-2" />
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed max-w-[220px] mx-auto">
                                                    Ajusta el marcador global arriba. Los cambios sobreescriben el marcador automático.
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Confirm Button */}
                                <Button onClick={saveAdvancedEdit} className="w-full h-14 sm:h-16 bg-indigo-500 hover:bg-indigo-600 text-black font-black text-xs sm:text-sm uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all active:scale-95 group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                    <Save size={20} className="mr-2 group-hover:rotate-12 transition-transform" />
                                    CONFIRMAR CAMBIOS
                                </Button>
                                <p className="text-[8px] text-center text-slate-600 font-bold uppercase tracking-[0.2em]">Los cambios se aplican inmediatamente</p>
                            </div>
                        </div>
                    )}

                    {/* Crear Evento — Command Center Style */}
                    {(match.estado === 'en_curso' && !showAdvancedEdit) && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 sm:p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-white">
                                    <Plus className="w-4 h-4 text-indigo-400" />
                                    Registrar Incidencia
                                </h4>
                                <Button
                                    size="sm"
                                    onClick={() => setShowEventMenu(!showEventMenu)}
                                    variant={showEventMenu ? "secondary" : "default"}
                                    className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider"
                                >
                                    {showEventMenu ? 'Cerrar Panel' : '+ Evento Rápido'}
                                </Button>
                            </div>

                            {showEventMenu && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {/* Tipo de Evento */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Categoría de Evento</label>
                                        <div className="flex gap-2">
                                            {getEventosTipos(match.disciplinas?.name || '').map((tipo: { value: string; label: string; color: string }) => (
                                                <button
                                                    key={tipo.value}
                                                    onClick={() => setNuevoEvento({ ...nuevoEvento, tipo: tipo.value })}
                                                    className={`flex-1 py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-tight border-2 transition-all duration-300 ${nuevoEvento.tipo === tipo.value
                                                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                                                        : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20'
                                                        }`}
                                                >
                                                    <span className="block text-lg mb-1">{tipo.label.split(' ')[0]}</span>
                                                    {tipo.label.split(' ').slice(1).join(' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Seleccionar Equipo */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Equipo Responsable</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'equipo_a', name: match.carrera_a?.nombre || match.equipo_a, color: 'indigo' },
                                                { id: 'equipo_b', name: match.carrera_b?.nombre || match.equipo_b, color: 'purple' }
                                            ].map(team => (
                                                <button
                                                    key={team.id}
                                                    onClick={() => setNuevoEvento({ ...nuevoEvento, equipo: team.id, jugador_id: null })}
                                                    className={`py-4 px-2 rounded-2xl font-black text-[10px] uppercase tracking-tight border-2 transition-all duration-300 ${nuevoEvento.equipo === team.id
                                                        ? `border-${team.color}-500 bg-${team.color}-500/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]`
                                                        : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20'
                                                        }`}
                                                >
                                                    {team.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Seleccionar Jugador */}
                                    {nuevoEvento.equipo && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Atleta / Jugador</label>
                                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                                {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(jugador => (
                                                    <button
                                                        key={jugador.id}
                                                        onClick={() => setNuevoEvento({ ...nuevoEvento, jugador_id: jugador.id })}
                                                        className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all duration-200 ${nuevoEvento.jugador_id === jugador.id
                                                            ? 'border-indigo-500 bg-indigo-500 text-black shadow-lg shadow-indigo-500/30'
                                                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                                                            }`}
                                                    >
                                                        {jugador.numero && <span className="opacity-50 mr-1">#{jugador.numero}</span>}
                                                        {jugador.nombre}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => agregarJugador(nuevoEvento.equipo)}
                                                    className="px-4 py-3 rounded-xl text-xs font-bold border border-dashed border-white/20 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                                >
                                                    <Plus size={14} className="inline mr-1" /> Nuevo Atleta
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={agregarEvento}
                                        className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-indigo-500/20 disabled:opacity-20 disabled:grayscale"
                                        disabled={!nuevoEvento.tipo || !nuevoEvento.equipo || !nuevoEvento.jugador_id}
                                    >
                                        Registrar Evento (Minuto {minutoActual}')
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Línea de Tiempo — Premium Vertical Flow */}
                    <div className="space-y-6">
                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                            <Clock size={14} className="text-indigo-400" />
                            Bitácora del Encuentro
                        </h4>
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 sm:p-6 max-h-96 overflow-y-auto space-y-3 custom-scrollbar">
                            {eventos.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Esperando el pitido inicial...</p>
                                </div>
                            ) : (
                                eventos.map(evento => (
                                    <div key={evento.id} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
                                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center shrink-0 shadow-lg group-hover:border-indigo-500/30 transition-colors">
                                            <span className="text-xs font-black text-white">{evento.minuto}'</span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase">Min</span>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xl">
                                                    {evento.tipo_evento === 'gol' && '⚽'}
                                                    {evento.tipo_evento === 'tarjeta_amarilla' && '🟨'}
                                                    {evento.tipo_evento === 'tarjeta_roja' && '🟥'}
                                                    {evento.tipo_evento === 'inicio' && '🟢'}
                                                    {evento.tipo_evento === 'fin' && '🏁'}
                                                </span>
                                                <h5 className="font-black text-xs uppercase tracking-tight text-white truncate">
                                                    {(() => {
                                                        const audit = parseEventAudit(evento.descripcion);
                                                        return audit.texto || evento.tipo_evento.replace('_', ' ').toUpperCase();
                                                    })()}
                                                </h5>
                                            </div>
                                            
                                            {evento.jugadores && (
                                                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                    {evento.jugadores.numero && <span className="text-indigo-400">#{evento.jugadores.numero}</span>}
                                                    {evento.jugadores.nombre}
                                                </p>
                                            )}
                                            
                                            {(() => {
                                                const audit = parseEventAudit(evento.descripcion);
                                                if (!audit.autor) return null;
                                                return (
                                                    <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                                                        <Edit2 size={8} /> {audit.autor.nombre}
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                        
                                        <Badge 
                                            variant="outline" 
                                            className={`text-[8px] font-black uppercase tracking-tighter px-2 border-none shrink-0 ${
                                                evento.equipo === 'equipo_a' 
                                                ? 'bg-indigo-500/10 text-indigo-400' 
                                                : evento.equipo === 'equipo_b' 
                                                ? 'bg-purple-500/10 text-purple-400' 
                                                : 'bg-white/5 text-slate-500'
                                            }`}
                                        >
                                            {evento.equipo === 'equipo_a' ? 'LOCAL' : evento.equipo === 'equipo_b' ? 'VISITA' : 'SISTEMA'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer - Stability & Branding */}
                <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Protocolo Live Activo</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={onClose}
                        className="h-10 px-8 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                    >
                        Cerrar Panel
                    </Button>
                </div>
            </div>
        </div>
    );
}
