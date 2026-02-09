"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Avatar, Card } from "@/components/ui-primitives";
import { ArrowLeft, Clock, Play, Pause, Square, AlertCircle, Plus, Save, Users, Trophy, ChevronRight, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { PublicLiveTimer } from "@/components/public-live-timer";

// Tipos
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
    equipo: string;
    jugadores?: Jugador;
};

const DISCIPLINES_COLORS: Record<string, string> = {
    'Fútbol': 'from-emerald-600 to-green-800',
    'Baloncesto': 'from-orange-600 to-amber-800',
    'Voleibol': 'from-blue-600 to-indigo-800',
    'Tenis': 'from-lime-600 to-green-700',
    'Tenis de Mesa': 'from-red-600 to-rose-800',
};

// Configuración de Acciones por Deporte
const GET_SPORT_ACTIONS = (sport: string) => {
    const common = [
        { value: 'tarjeta_amarilla', label: 'Amarilla', icon: '🟨', style: 'card-yellow' },
        { value: 'tarjeta_roja', label: 'Roja', icon: '🟥', style: 'card-red' },
        { value: 'cambio', label: 'Cambio', icon: '🔄', style: 'pill-neutral' },
    ];

    if (sport === 'Baloncesto') {
        return [
            { value: 'punto_1', label: '+1', icon: '1️⃣', style: 'circle-orange' },
            { value: 'punto_2', label: '+2', icon: '2️⃣', style: 'circle-orange' },
            { value: 'punto_3', label: '+3', icon: '3️⃣', style: 'circle-orange-fire' },
            ...common
        ];
    }

    if (sport === 'Voleibol' || sport === 'Tenis' || sport === 'Tenis de Mesa') {
        return [
            { value: 'punto', label: 'Punto', icon: '🏐', style: 'pill-blue' },
            ...common
        ];
    }

    // Default (Fútbol)
    return [
        { value: 'gol', label: 'GOL', icon: '⚽', style: 'pill-green' },
        ...common
    ];
};

export default function MatchControlPage() {
    const params = useParams();
    const router = useRouter();
    const matchId = params.id as string;

    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorCtx, setErrorCtx] = useState<string | null>(null);

    // Datos
    const [jugadoresA, setJugadoresA] = useState<Jugador[]>([]);
    const [jugadoresB, setJugadoresB] = useState<Jugador[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);

    // Cronómetro Lógico (Backend Sync)
    const [minutoActual, setMinutoActual] = useState(0);
    const [cronometroActivo, setCronometroActivo] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // UI States
    const [nuevoEvento, setNuevoEvento] = useState({
        tipo: '',
        equipo: '',
        jugador_id: null as number | null,
    });
    const [addingPlayerTeam, setAddingPlayerTeam] = useState<string | null>(null);
    const [newPlayerForm, setNewPlayerForm] = useState({ nombre: '', numero: '' });

    // 1. Cargar Datos Iniciales
    useEffect(() => {
        fetchMatchDetails();
    }, [matchId]);

    // 2. Cronómetro (Lógica de servidor - cada 60s)
    useEffect(() => {
        if (cronometroActivo) {
            intervalRef.current = setInterval(() => {
                setMinutoActual(prev => {
                    const nuevo = prev + 1;
                    actualizarMinutoEnDB(nuevo);
                    return nuevo;
                });
            }, 60000); // 60,000ms = 1 minuto de juego
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [cronometroActivo]);

    // Funciones de Carga
    const fetchMatchDetails = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('partidos')
                .select(`*, disciplinas(name)`)
                .eq('id', matchId)
                .single();

            if (error) throw error;
            setMatch(data);

            // Restore Timer State
            const detalle = data.marcador_detalle || {};
            if (detalle.minuto_actual) setMinutoActual(detalle.minuto_actual);
            if (detalle.estado_cronometro === 'corriendo') setCronometroActivo(true);

            // Cargar relaciones
            await fetchJugadores();
            await fetchEventos();
        } catch (err: any) {
            console.error(err);
            setErrorCtx(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchJugadores = async () => {
        const { data } = await supabase.from('olympics_jugadores').select('*').eq('partido_id', matchId);
        if (data) {
            setJugadoresA(data.filter(j => j.equipo === 'equipo_a'));
            setJugadoresB(data.filter(j => j.equipo === 'equipo_b'));
        }
    };

    const fetchEventos = async () => {
        const { data } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:olympics_jugadores(*)')
            .eq('partido_id', matchId)
            .order('minuto', { ascending: false });

        if (data) setEventos(data);
    };

    // Funciones de Acción
    const actualizarMinutoEnDB = async (minuto: number) => {
        if (!match) return;
        const detalle = match.marcador_detalle || {};
        await supabase.from('partidos')
            .update({
                marcador_detalle: {
                    ...detalle,
                    minuto_actual: minuto,
                    estado_cronometro: cronometroActivo ? 'corriendo' : 'pausado',
                    ultimo_update: new Date().toISOString()
                }
            })
            .eq('id', matchId);
    };

    const toggleCronometro = async () => {
        const nuevoEstado = !cronometroActivo;
        setCronometroActivo(nuevoEstado);

        // Update DB
        const nuevoDetalle = {
            ...(match.marcador_detalle || {}),
            estado_cronometro: nuevoEstado ? 'corriendo' : 'pausado',
            ultimo_update: new Date().toISOString()
        };

        // Si inicia por primera vez
        if (nuevoEstado && match.estado === 'programado') {
            nuevoDetalle.tiempo_inicio = new Date().toISOString();
            nuevoDetalle.minuto_actual = 0;
            await supabase.from('partidos').update({
                estado: 'en_vivo',
                marcador_detalle: nuevoDetalle
            }).eq('id', matchId);
            setMatch({ ...match, estado: 'en_vivo', marcador_detalle: nuevoDetalle });
            registrarEventoSistema('inicio', 'Inicio del partido');
        } else {
            await supabase.from('partidos').update({ marcador_detalle: nuevoDetalle }).eq('id', matchId);
            setMatch({ ...match, marcador_detalle: nuevoDetalle });
        }
    };

    const finalizarPartido = async () => {
        if (!confirm("¿Seguro que deseas finalizar el partido?")) return;
        setCronometroActivo(false);
        await supabase.from('partidos').update({ estado: 'finalizado' }).eq('id', matchId);
        setMatch({ ...match, estado: 'finalizado' });
        registrarEventoSistema('fin', 'Fin del partido');
    };

    const registrarEventoSistema = async (tipo: string, desc: string) => {
        await supabase.from('olympics_eventos').insert({
            partido_id: matchId, tipo_evento: tipo, minuto: minutoActual, equipo: 'sistema', descripcion: desc
        });
        fetchEventos();
    };

    const handleNuevoEvento = async () => {
        if (!nuevoEvento.tipo || !nuevoEvento.equipo || !nuevoEvento.jugador_id) return;

        const { error } = await supabase.from('olympics_eventos').insert({
            partido_id: matchId,
            tipo_evento: nuevoEvento.tipo,
            minuto: minutoActual,
            equipo: nuevoEvento.equipo,
            jugador_id: nuevoEvento.jugador_id
        });

        if (!error) {
            // Lógica de Puntos Dinámica
            const tipo = nuevoEvento.tipo;
            if (tipo.startsWith('gol') || tipo.startsWith('punto')) {
                let puntos = 1;
                if (tipo === 'punto_2') puntos = 2;
                if (tipo === 'punto_3') puntos = 3;

                const field = nuevoEvento.equipo === 'equipo_a'
                    ? (match.disciplinas?.name === 'Fútbol' ? 'goles_a' : 'total_a')
                    : (match.disciplinas?.name === 'Fútbol' ? 'goles_b' : 'total_b');

                const actual = match.marcador_detalle?.[field] || 0;
                const nuevoMarcador = { ...match.marcador_detalle, [field]: actual + puntos };

                await supabase.from('partidos').update({ marcador_detalle: nuevoMarcador }).eq('id', matchId);
                setMatch({ ...match, marcador_detalle: nuevoMarcador });
            }
            setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
            fetchEventos();
        }
    };

    const handleSavePlayer = async () => {
        if (!newPlayerForm.nombre || !addingPlayerTeam) return;
        const { error } = await supabase.from('olympics_jugadores').insert({
            partido_id: matchId,
            nombre: newPlayerForm.nombre,
            numero: newPlayerForm.numero ? parseInt(newPlayerForm.numero) : null,
            equipo: addingPlayerTeam
        });

        if (!error) {
            fetchJugadores();
            setAddingPlayerTeam(null);
            setNewPlayerForm({ nombre: '', numero: '' });
        } else {
            alert("Error: " + error.message);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (!match) return <div className="p-8 text-center">Partido no encontrado</div>;

    const scoreA = match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0;
    const scoreB = match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0;

    // Dynamic styles
    const disciplinaName = match.disciplinas?.name || 'Deporte';
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);

    return (
        <div className="min-h-screen bg-background pb-12">

            {/* --- HERO HEADER (ADMIN) --- */}
            <div className={`relative ${bgGradient} bg-gradient-to-br text-white shadow-2xl transition-all duration-500 overflow-hidden`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-20"></div>
                <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12">
                    <Trophy size={300} />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 pt-8 pb-12">
                    {/* Top Bar */}
                    <div className="flex justify-between items-center mb-10">
                        <Link href="/admin/partidos">
                            <Button variant="glass" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                                <ArrowLeft size={16} className="mr-2" /> Panel
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                                {disciplinaName}
                            </Badge>
                            <Badge className={`${match.estado === 'en_vivo' ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20'
                                } text-white border-none animate-in fade-in`}>
                                {match.estado === 'en_vivo' ? '🔴 EN VIVO' : match.estado.toUpperCase()}
                            </Badge>
                        </div>
                    </div>

                    {/* Scoreboard Control Center */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-center max-w-4xl mx-auto">

                        {/* Team A */}
                        <div className="flex flex-col items-center group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Avatar name={match.equipo_a} size="lg" className="w-24 h-24 text-3xl border-4 border-white/10 shadow-xl relative z-10" />
                            </div>
                            <h2 className="text-2xl font-bold mt-4 text-center leading-tight drop-shadow-md">{match.equipo_a}</h2>
                        </div>

                        {/* Center: Timer & Controls */}
                        <div className="flex flex-col items-center gap-6 z-10">
                            <div className="flex items-end gap-2 leading-none">
                                <span className="text-8xl font-black tabular-nums tracking-tighter drop-shadow-xl">{scoreA}</span>
                                <span className="text-4xl font-bold text-white/40 mb-4">-</span>
                                <span className="text-8xl font-black tabular-nums tracking-tighter drop-shadow-xl">{scoreB}</span>
                            </div>

                            {/* THE MAGIC TIMER (Visual matches Public) */}
                            <div className="bg-black/30 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 flex items-center justify-center min-w-[140px]">
                                <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={toggleCronometro}
                                    className={`h-12 px-6 rounded-xl font-bold text-lg shadow-lg border-2 ${cronometroActivo
                                        ? 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-white'
                                        : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white'
                                        }`}
                                >
                                    {cronometroActivo ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                                </Button>
                                {match.estado === 'en_vivo' && (
                                    <Button onClick={finalizarPartido} className="h-12 w-12 rounded-xl bg-white/10 hover:bg-red-500/80 border-2 border-white/20">
                                        <Square size={18} className="fill-current" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="flex flex-col items-center group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Avatar name={match.equipo_b} size="lg" className="w-24 h-24 text-3xl border-4 border-white/10 shadow-xl relative z-10" />
                            </div>
                            <h2 className="text-2xl font-bold mt-4 text-center leading-tight drop-shadow-md">{match.equipo_b}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD CONTENT --- */}
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* ERROR ALERT */}
                {errorCtx && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 flex items-center gap-3">
                        <AlertCircle /> {errorCtx}
                    </div>
                )}

                <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">

                    {/* LEFT: ACTIONS CONTROLLER */}
                    <div className="space-y-6">
                        <Card variant="glass" className="p-6 border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                                <Activity className="text-primary" /> Registrar Evento
                            </h3>

                            {/* 1. BUTTONS GRID (PREMIUM) */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {actions.map(action => {
                                    // Style logic
                                    const isSelected = nuevoEvento.tipo === action.value;
                                    let baseClass = "relative h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 group overflow-hidden ";

                                    if (action.style === 'pill-green') baseClass += isSelected ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20";
                                    else if (action.style === 'circle-orange') baseClass += isSelected ? "bg-orange-500 border-orange-400 text-white shadow-lg" : "bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500/20";
                                    else if (action.style === 'circle-orange-fire') baseClass += isSelected ? "bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-orange-600/10 border-orange-600/20 text-orange-600 hover:bg-orange-600/20";
                                    else if (action.style === 'pill-blue') baseClass += isSelected ? "bg-blue-500 border-blue-400 text-white shadow-lg" : "bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20";
                                    else if (action.style === 'card-yellow') baseClass += isSelected ? "bg-yellow-400 border-yellow-300 text-black shadow-lg" : "bg-yellow-400/10 border-yellow-400/20 text-yellow-400 hover:bg-yellow-400/20";
                                    else if (action.style === 'card-red') baseClass += isSelected ? "bg-red-500 border-red-400 text-white shadow-lg" : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20";
                                    else baseClass += isSelected ? "bg-slate-100 border-white text-black" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700";

                                    return (
                                        <button
                                            key={action.value}
                                            onClick={() => setNuevoEvento({ ...nuevoEvento, tipo: action.value })}
                                            className={baseClass}
                                        >
                                            <span className="text-3xl mb-1 filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{action.label}</span>
                                            {/* Shine effect */}
                                            {isSelected && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 2. Equipo + 3. Jugador (Misma lógica, solo ajustando wrapper para animación) */}
                            <div className={`space-y-6 transition-all duration-300 ${nuevoEvento.tipo ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none grayscale'}`}>

                                {/* SELECT EQUIPO */}
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'equipo_a', name: match.equipo_a },
                                        { id: 'equipo_b', name: match.equipo_b }
                                    ].map(team => (
                                        <button
                                            key={team.id}
                                            onClick={() => setNuevoEvento({ ...nuevoEvento, equipo: team.id, jugador_id: null })}
                                            className={`p-4 rounded-xl border-2 font-bold transition-all flex items-center justify-between group ${nuevoEvento.equipo === team.id
                                                    ? 'border-primary bg-primary/10 text-primary shadow-inner'
                                                    : 'border-border/30 bg-muted/20 hover:border-primary/30'
                                                }`}
                                        >
                                            {team.name}
                                            <div className={`h-3 w-3 rounded-full ${nuevoEvento.equipo === team.id ? 'bg-primary' : 'bg-transparent border border-muted-foreground'}`} />
                                        </button>
                                    ))}
                                </div>

                                {/* SELECT JUGADOR */}
                                <div className={`transition-all duration-300 ${nuevoEvento.equipo ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    {/* (LÓGICA DE AGREGAR JUGADOR INSERTADA AQUÍ - MANTENIDA IGUAL QUE ANTES) */}
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs font-bold uppercase text-muted-foreground">Seleccionar Jugador</p>
                                        {!addingPlayerTeam && (
                                            <button
                                                onClick={() => setAddingPlayerTeam(nuevoEvento.equipo)}
                                                className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                                            >
                                                <Plus size={12} /> Nuevo
                                            </button>
                                        )}
                                    </div>

                                    {addingPlayerTeam ? (
                                        <div className="bg-slate-900/50 p-4 rounded-xl border border-primary/30 mb-4 animate-in zoom-in-95">
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    autoFocus
                                                    placeholder="Nombre"
                                                    className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm"
                                                    value={newPlayerForm.nombre}
                                                    onChange={e => setNewPlayerForm({ ...newPlayerForm, nombre: e.target.value })}
                                                />
                                                <input
                                                    placeholder="#"
                                                    type="number"
                                                    className="w-16 bg-background border rounded-lg px-3 py-2 text-sm"
                                                    value={newPlayerForm.numero}
                                                    onChange={e => setNewPlayerForm({ ...newPlayerForm, numero: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => setAddingPlayerTeam(null)} className="flex-1">Cancelar</Button>
                                                <Button size="sm" onClick={handleSavePlayer} className="flex-1">Guardar</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar mb-6 p-1">
                                                {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(j => (
                                                    <button
                                                        key={j.id}
                                                        onClick={() => setNuevoEvento({ ...nuevoEvento, jugador_id: j.id })}
                                                        className={`p-2.5 rounded-lg text-sm border transition-all text-left flex items-center gap-2 ${nuevoEvento.jugador_id === j.id
                                                                ? 'border-primary bg-primary text-white shadow-md'
                                                                : 'border-border/30 bg-muted/20 hover:bg-muted/40'
                                                            }`}
                                                    >
                                                        <Badge variant="secondary" className={`text-[10px] w-6 h-6 flex items-center justify-center ${nuevoEvento.jugador_id === j.id ? 'bg-white/20 text-white' : ''}`}>
                                                            {j.numero || '-'}
                                                        </Badge>
                                                        <span className="truncate font-medium">{j.nombre}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <Button
                                                size="lg"
                                                className="w-full text-lg h-14"
                                                disabled={!nuevoEvento.jugador_id}
                                                onClick={handleNuevoEvento}
                                            >
                                                <Save className="mr-2" />
                                                Confirmar Evento
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: TIMELINE */}
                    <div className="glass rounded-2xl p-0 border border-white/5 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2"><Clock className="text-muted-foreground" size={18} /> Historial</span>
                            <Badge variant="outline" className="text-xs">{eventos.length} acciones</Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {eventos.map((e, i) => (
                                <div key={e.id} className="flex gap-4 animate-in slide-in-from-right-4 fade-in duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold z-10">
                                            {e.minuto}'
                                        </div>
                                        <div className="w-0.5 flex-1 bg-slate-800/50 my-1" />
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <div className={`p-3 rounded-xl border ${e.equipo === 'sistema' ? 'bg-slate-900 border-slate-800' : 'bg-white/5 border-white/5 hover:bg-white/10'} transition-colors`}>
                                            <div className="flex justify-between items-start">
                                                <span className="text-lg mr-3 mt-1">
                                                    {e.tipo_evento === 'gol' && '⚽'}
                                                    {e.tipo_evento.startsWith('punto') && '🏐'}
                                                    {e.tipo_evento === 'tarjeta_amarilla' && '🟨'}
                                                    {e.tipo_evento === 'tarjeta_roja' && '🟥'}
                                                    {e.tipo_evento === 'cambio' && '🔄'}
                                                    {e.tipo_evento === 'inicio' && '🚀'}
                                                    {e.tipo_evento === 'fin' && '🏁'}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm capitalize mb-0.5">{e.tipo_evento.replace(/_/g, ' ').replace('punto', 'Punto')}</p>
                                                    {e.jugadores && (
                                                        <p className="text-xs text-muted-foreground">{e.jugadores.nombre} <span className="opacity-50">#{e.jugadores.numero}</span></p>
                                                    )}
                                                    {e.equipo !== 'sistema' && (
                                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1">
                                                            {e.equipo === 'equipo_a' ? match.equipo_a : match.equipo_b}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
