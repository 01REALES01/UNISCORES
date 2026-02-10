"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Avatar, Card } from "@/components/ui-primitives";
import { ArrowLeft, Clock, Play, Pause, Square, AlertCircle, Plus, Save, Users, Trophy, ChevronRight, Activity, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { addPoints, getCurrentScore, cambiarTiempoFutbol, cambiarCuartoBasket } from "@/lib/sport-scoring";

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
    'Ajedrez': 'from-slate-700 to-zinc-900',
    'Natación': 'from-cyan-500 to-blue-700',
};

// Configuración de Acciones por Deporte
const GET_SPORT_ACTIONS = (sport: string) => {
    // Solo Fútbol tiene tarjetas y cambios
    if (sport === 'Fútbol') {
        return [
            { value: 'gol', label: 'GOL', icon: '⚽', style: 'pill-green' },
            { value: 'tarjeta_amarilla', label: 'Amarilla', icon: '🟨', style: 'card-yellow' },
            { value: 'tarjeta_roja', label: 'Roja', icon: '🟥', style: 'card-red' },
            { value: 'cambio', label: 'Cambio', icon: '🔄', style: 'pill-neutral' },
        ];
    }

    // Baloncesto tiene puntos y faltas 
    if (sport === 'Baloncesto') {
        return [
            { value: 'punto_1', label: '+1', icon: '1️⃣', style: 'circle-orange' },
            { value: 'punto_2', label: '+2', icon: '2️⃣', style: 'circle-orange' },
            { value: 'punto_3', label: '+3', icon: '3️⃣', style: 'circle-orange-fire' },
            { value: 'falta', label: 'Falta', icon: '⛔', style: 'pill-neutral' },
            { value: 'cambio', label: 'Cambio', icon: '🔄', style: 'pill-neutral' },
        ];
    }

    // Voleibol solo puntos
    if (sport === 'Voleibol') {
        return [
            { value: 'punto', label: 'Punto', icon: '🏐', style: 'pill-blue' },
        ];
    }

    // Tenis y Tenis de Mesa - puntos/sets
    if (sport === 'Tenis' || sport === 'Tenis de Mesa') {
        return [
            { value: 'punto', label: 'Punto', icon: '🎾', style: 'pill-lime' },
            { value: 'set', label: 'Set', icon: '🏆', style: 'pill-gold' },
        ];
    }

    // Ajedrez - solo resultado final
    if (sport === 'Ajedrez') {
        return [
            { value: 'victoria', label: 'Victoria', icon: '👑', style: 'pill-gold' },
            { value: 'empate', label: 'Empate', icon: '🤝', style: 'pill-neutral' },
        ];
    }

    // Natación - solo resultado final
    if (sport === 'Natación') {
        return [
            { value: 'victoria', label: '1er Lugar', icon: '🥇', style: 'pill-gold' },
            { value: 'segundo', label: '2do Lugar', icon: '🥈', style: 'pill-silver' },
            { value: 'tercero', label: '3er Lugar', icon: '🥉', style: 'pill-bronze' },
        ];
    }

    // Default fallback
    return [
        { value: 'punto', label: 'Punto', icon: '➕', style: 'pill-blue' },
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
    const [isEndingMatch, setIsEndingMatch] = useState(false);

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

    const handleFinalizarClick = () => {
        setIsEndingMatch(true);
    };

    const handleCambiarPeriodo = async () => {
        const disciplinaName = match.disciplinas?.name || 'Deporte';
        let nuevoMarcador = { ...match.marcador_detalle };
        let mensaje = '';

        if (disciplinaName === 'Fútbol') {
            nuevoMarcador = cambiarTiempoFutbol(nuevoMarcador);
            mensaje = 'Cambio al 2º tiempo';
        } else if (disciplinaName === 'Baloncesto') {
            const cuartoActual = nuevoMarcador.cuarto_actual || 1;
            if (cuartoActual < 4) {
                nuevoMarcador = cambiarCuartoBasket(nuevoMarcador);
                mensaje = `Cambio al ${nuevoMarcador.cuarto_actual}º cuarto`;
            }
        }

        if (mensaje) {
            await supabase.from('partidos').update({ marcador_detalle: nuevoMarcador }).eq('id', matchId);
            setMatch({ ...match, marcador_detalle: nuevoMarcador });
            registrarEventoSistema('periodo', mensaje);
        }
    };

    const confirmarFinalizar = async () => {
        setIsEndingMatch(false);
        setCronometroActivo(false);

        // Calcular minuto final si estaba corriendo
        let finalMinute = minutoActual;
        if (cronometroActivo) {
            const detalle = match.marcador_detalle || {};
            const lastUpdate = detalle.ultimo_update ? new Date(detalle.ultimo_update).getTime() : new Date().getTime();
            const now = new Date().getTime();
            const diffMinutes = Math.floor((now - lastUpdate) / 60000);
            finalMinute += diffMinutes;
        }

        const nuevoDetalle = {
            ...(match.marcador_detalle || {}),
            estado_cronometro: 'detenido',
            minuto_actual: finalMinute,
            ultimo_update: new Date().toISOString()
        };

        const { error } = await supabase
            .from('partidos')
            .update({
                estado: 'finalizado',
                marcador_detalle: nuevoDetalle
            })
            .eq('id', matchId);

        if (!error) {
            setMatch({ ...match, estado: 'finalizado', marcador_detalle: nuevoDetalle });
            setMinutoActual(finalMinute);
            registrarEventoSistema('fin', 'Partido finalizado oficialmente');
        } else {
            alert("Error al finalizar: " + error.message);
        }
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
            // Lógica de Puntos usando sport-scoring
            const tipo = nuevoEvento.tipo;
            const disciplinaName = match.disciplinas?.name || 'Deporte';

            if (tipo.startsWith('gol') || tipo.startsWith('punto')) {
                let puntos = 1;
                if (tipo === 'punto_2') puntos = 2;
                if (tipo === 'punto_3') puntos = 3;

                // Usar la nueva lógica de scoring
                const nuevoMarcador = addPoints(
                    disciplinaName,
                    match.marcador_detalle || {},
                    nuevoEvento.equipo as 'equipo_a' | 'equipo_b',
                    puntos
                );

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

    // Dynamic styles
    const disciplinaName = match.disciplinas?.name || 'Deporte';
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);

    // Obtener marcador según deporte
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

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
                            <Badge className={`border-none ${(match.genero || 'masculino') === 'femenino' ? 'bg-pink-500/80 text-white' :
                                    (match.genero || 'masculino') === 'mixto' ? 'bg-purple-500/80 text-white' :
                                        'bg-blue-500/80 text-white'
                                }`}>
                                {(match.genero || 'masculino') === 'femenino' ? '♀ Femenino' : (match.genero || 'masculino') === 'mixto' ? '⚤ Mixto' : '♂ Masculino'}
                            </Badge>
                            <Badge className={`${match.estado === 'en_vivo' ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20'
                                } text-white border-none animate-in fade-in`}>
                                {match.estado === 'en_vivo' ? '🔴 EN VIVO' : match.estado.toUpperCase()}
                            </Badge>
                        </div>
                    </div>

                    {/* Scoreboard Control Center */}
                    <div className="grid grid-cols-3 md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-8 items-center max-w-4xl mx-auto">

                        {/* Team A */}
                        <div className="flex flex-col items-center group order-1">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/10 flex items-center justify-center text-xl md:text-3xl font-bold border-2 md:border-4 border-white/10 shadow-xl relative z-10 backdrop-blur-sm">
                                    {match.equipo_a.charAt(0)}
                                </div>
                            </div>
                            <h2 className="text-sm md:text-2xl font-bold mt-2 md:mt-4 text-center leading-tight drop-shadow-md break-words max-w-[100px] md:max-w-none line-clamp-2">
                                {match.equipo_a}
                            </h2>
                        </div>

                        {/* Center: Timer & Controls */}
                        <div className="flex flex-col items-center gap-2 md:gap-6 z-10 order-2 col-span-1">
                            <div className="flex items-center justify-center gap-2 md:gap-4 leading-none">
                                <span className="text-5xl md:text-8xl font-black tabular-nums tracking-tighter drop-shadow-xl">{scoreA}</span>
                                <span className="text-2xl md:text-4xl font-bold text-white/40">-</span>
                                <span className="text-5xl md:text-8xl font-black tabular-nums tracking-tighter drop-shadow-xl">{scoreB}</span>
                            </div>

                            {/* Sub-score del período actual (puntos set, goles tiempo, etc.) */}
                            {subScoreA !== undefined && subScoreB !== undefined && (
                                <div className="flex items-center gap-3 bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                                    <span className="text-sm md:text-lg font-bold tabular-nums">{subScoreA}</span>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{subLabel || 'Pts'}</span>
                                    <span className="text-sm md:text-lg font-bold tabular-nums">{subScoreB}</span>
                                </div>
                            )}

                            {/* Period/Quarter/Set Indicator */}
                            {extra && (
                                <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 text-xs font-bold">
                                    {extra}
                                </div>
                            )}

                            {/* THE MAGIC TIMER (Visual matches Public) */}
                            <div className="scale-75 md:scale-100 bg-black/30 backdrop-blur-md px-3 md:px-6 py-1 md:py-2 rounded-xl md:rounded-2xl border border-white/10 flex items-center justify-center min-w-[100px] md:min-w-[140px]">
                                <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 md:gap-3 mt-1 md:mt-0">
                                <Button
                                    onClick={toggleCronometro}
                                    size="sm"
                                    className={`h-10 w-12 md:h-12 md:w-auto md:px-6 rounded-lg md:rounded-xl font-bold md:text-lg shadow-lg border-2 ${cronometroActivo
                                        ? 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-white'
                                        : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white'
                                        }`}
                                >
                                    {cronometroActivo ? <Pause className="fill-current w-4 h-4 md:w-5 md:h-5" /> : <Play className="fill-current w-4 h-4 md:w-5 md:h-5" />}
                                </Button>
                                {match.estado !== 'finalizado' && (
                                    <Button
                                        onClick={handleFinalizarClick}
                                        title="Finalizar Partido"
                                        size="sm"
                                        className="h-10 w-10 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-white/10 hover:bg-red-500/80 border-2 border-white/20 text-white transition-colors"
                                    >
                                        <Square className="fill-current w-4 h-4 md:w-5 md:h-5" />
                                    </Button>
                                )}
                                {/* Botón para cambiar período (solo deportes con períodos) */}
                                {match.estado === 'en_vivo' && (disciplinaName === 'Fútbol' || disciplinaName === 'Baloncesto') && (
                                    <Button
                                        onClick={handleCambiarPeriodo}
                                        size="sm"
                                        disabled={
                                            (disciplinaName === 'Fútbol' && (match.marcador_detalle?.tiempo_actual || 1) >= 2) ||
                                            (disciplinaName === 'Baloncesto' && (match.marcador_detalle?.cuarto_actual || 1) >= 4)
                                        }
                                        className="h-10 md:h-12 px-3 md:px-4 rounded-lg md:rounded-xl bg-blue-500/20 hover:bg-blue-500/40 border-2 border-blue-400/40 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-bold whitespace-nowrap"
                                        title={disciplinaName === 'Fútbol' ? 'Cambiar a 2º Tiempo' : 'Siguiente Cuarto'}
                                    >
                                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="flex flex-col items-center group order-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/10 flex items-center justify-center text-xl md:text-3xl font-bold border-2 md:border-4 border-white/10 shadow-xl relative z-10 backdrop-blur-sm">
                                    {match.equipo_b.charAt(0)}
                                </div>
                            </div>
                            <h2 className="text-sm md:text-2xl font-bold mt-2 md:mt-4 text-center leading-tight drop-shadow-md break-words max-w-[100px] md:max-w-none line-clamp-2">
                                {match.equipo_b}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD CONTENT --- */}
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* SCORE BREAKDOWN (Parciales por Tiempo/Cuarto/Set) */}
                {(disciplinaName === 'Fútbol' || disciplinaName === 'Baloncesto' || disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                    <Card variant="glass" className="mb-6 p-4 md:p-6 border-white/10 bg-zinc-900/50">
                        <h3 className="text-sm md:text-base font-bold mb-4 flex items-center gap-2">
                            <Trophy size={18} className="text-primary" />
                            {disciplinaName === 'Fútbol' && 'Marcador por Tiempos'}
                            {disciplinaName === 'Baloncesto' && 'Marcador por Cuartos'}
                            {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && 'Marcador por Sets'}
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Equipo</th>
                                        {disciplinaName === 'Fútbol' && (
                                            <>
                                                <th className="text-center py-2 px-3 font-semibold">1º T</th>
                                                <th className="text-center py-2 px-3 font-semibold">2º T</th>
                                                <th className="text-center py-2 px-3 font-bold text-primary">Total</th>
                                            </>
                                        )}
                                        {disciplinaName === 'Baloncesto' && (
                                            <>
                                                <th className="text-center py-2 px-3 font-semibold">Q1</th>
                                                <th className="text-center py-2 px-3 font-semibold">Q2</th>
                                                <th className="text-center py-2 px-3 font-semibold">Q3</th>
                                                <th className="text-center py-2 px-3 font-semibold">Q4</th>
                                                <th className="text-center py-2 px-3 font-bold text-primary">Total</th>
                                            </>
                                        )}
                                        {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                                            <>
                                                <th className="text-center py-2 px-3 font-semibold">S1</th>
                                                <th className="text-center py-2 px-3 font-semibold">S2</th>
                                                <th className="text-center py-2 px-3 font-semibold">S3</th>
                                                {disciplinaName === 'Voleibol' && (
                                                    <>
                                                        <th className="text-center py-2 px-3 font-semibold">S4</th>
                                                        <th className="text-center py-2 px-3 font-semibold">S5</th>
                                                    </>
                                                )}
                                                <th className="text-center py-2 px-3 font-bold text-primary">Sets</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Equipo A */}
                                    <tr className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-2 px-3 font-semibold">{match.equipo_a}</td>
                                        {disciplinaName === 'Fútbol' && (
                                            <>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.tiempos?.[1]?.goles_a || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.tiempos?.[2]?.goles_a || 0}</td>
                                                <td className="text-center py-2 px-3 font-bold text-lg">{match.marcador_detalle?.goles_a || 0}</td>
                                            </>
                                        )}
                                        {disciplinaName === 'Baloncesto' && (
                                            <>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[1]?.puntos_a || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[2]?.puntos_a || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[3]?.puntos_a || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[4]?.puntos_a || 0}</td>
                                                <td className="text-center py-2 px-3 font-bold text-lg">{match.marcador_detalle?.total_a || 0}</td>
                                            </>
                                        )}
                                        {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                                            <>
                                                <td className="text-center py-2 px-3">
                                                    {disciplinaName === 'Voleibol'
                                                        ? (match.marcador_detalle?.sets?.[1]?.puntos_a || 0)
                                                        : (match.marcador_detalle?.sets?.[1]?.juegos_a || 0)
                                                    }
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    {disciplinaName === 'Voleibol'
                                                        ? (match.marcador_detalle?.sets?.[2]?.puntos_a || 0)
                                                        : (match.marcador_detalle?.sets?.[2]?.juegos_a || 0)
                                                    }
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    {disciplinaName === 'Voleibol'
                                                        ? (match.marcador_detalle?.sets?.[3]?.puntos_a || 0)
                                                        : (match.marcador_detalle?.sets?.[3]?.juegos_a || 0)
                                                    }
                                                </td>
                                                {disciplinaName === 'Voleibol' && (
                                                    <>
                                                        <td className="text-center py-2 px-3">{match.marcador_detalle?.sets?.[4]?.puntos_a || 0}</td>
                                                        <td className="text-center py-2 px-3">{match.marcador_detalle?.sets?.[5]?.puntos_a || 0}</td>
                                                    </>
                                                )}
                                                <td className="text-center py-2 px-3 font-bold text-lg">{match.marcador_detalle?.sets_a || 0}</td>
                                            </>
                                        )}
                                    </tr>
                                    {/* Equipo B */}
                                    <tr className="hover:bg-white/5">
                                        <td className="py-2 px-3 font-semibold">{match.equipo_b}</td>
                                        {disciplinaName === 'Fútbol' && (
                                            <>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.tiempos?.[1]?.goles_b || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.tiempos?.[2]?.goles_b || 0}</td>
                                                <td className="text-center py-2 px-3 font-bold text-lg">{match.marcador_detalle?.goles_b || 0}</td>
                                            </>
                                        )}
                                        {disciplinaName === 'Baloncesto' && (
                                            <>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[1]?.puntos_b || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[2]?.puntos_b || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[3]?.puntos_b || 0}</td>
                                                <td className="text-center py-2 px-3">{match.marcador_detalle?.cuartos?.[4]?.puntos_b || 0}</td>
                                                <td className="text-center py-2 px-3 font-bold text-lg">{match.marcador_detalle?.total_b || 0}</td>
                                            </>
                                        )}
                                        {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                                            <>
                                                <td className="text-center py-2 px-3">
                                                    {disciplinaName === 'Voleibol'
                                                        ? (match.marcador_detalle?.sets?.[1]?.puntos_b || 0)
                                                        : (match.marcador_detalle?.sets?.[1]?.juegos_b || 0)
                                                    }
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    {disciplinaName === 'Voleibol'
                                                        ? (match.marcador_detalle?.sets?.[2]?.puntos_b || 0)
                                                        : (match.marcador_detalle?.sets?.[2]?.juegos_b || 0)
                                                    }
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    {disciplinaName === 'Voleibol'
                                                        ? (match.marcador_detalle?.sets?.[3]?.puntos_b || 0)
                                                        : (match.marcador_detalle?.sets?.[3]?.juegos_b || 0)
                                                    }
                                                </td>
                                                {disciplinaName === 'Voleibol' && (
                                                    <>
                                                        <td className="text-center py-2 px-3">{match.marcador_detalle?.sets?.[4]?.puntos_b || 0}</td>
                                                        <td className="text-center py-2 px-3">{match.marcador_detalle?.sets?.[5]?.puntos_b || 0}</td>
                                                    </>
                                                )}
                                                <td className="text-center py-2 px-3 font-bold text-lg">{match.marcador_detalle?.sets_b || 0}</td>
                                            </>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* ERROR ALERT */}
                {errorCtx && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 flex items-center gap-3">
                        <AlertCircle /> {errorCtx}
                    </div>
                )}

                <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">

                    {/* LEFT: ACTIONS CONTROLLER */}
                    <div className="space-y-6">
                        <Card variant="glass" className="p-0 border-white/10 bg-zinc-900/50 overflow-hidden relative group">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                            <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Activity size={20} />
                                    </div>
                                    Registrar Evento
                                </h3>
                                {nuevoEvento.tipo && (
                                    <Badge variant="outline" className="animate-in fade-in zoom-in bg-primary/10 text-primary border-primary/20">
                                        Paso {nuevoEvento.equipo ? (nuevoEvento.jugador_id ? '3/3' : '2/3') : '1/3'}
                                    </Badge>
                                )}
                            </div>

                            <div className="p-6 space-y-8">
                                {/* 1. ACTIONS GRID */}
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider ml-1">1. Selecciona Acción</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {actions.map(action => {
                                            const isSelected = nuevoEvento.tipo === action.value;

                                            // Dynamic Styling based on action type
                                            let activeColors = "from-slate-700 to-slate-900 border-slate-600";
                                            let iconColor = "text-slate-400";

                                            if (action.style === 'pill-green') { activeColors = "from-emerald-600 to-emerald-800 border-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"; iconColor = "text-emerald-400"; }
                                            else if (action.style === 'card-yellow') { activeColors = "from-yellow-500 to-amber-600 border-yellow-300 shadow-[0_0_20px_-5px_rgba(234,179,8,0.5)]"; iconColor = "text-yellow-400"; }
                                            else if (action.style === 'card-red') { activeColors = "from-red-600 to-red-800 border-red-500 shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]"; iconColor = "text-red-500"; }
                                            else if (action.style.includes('orange')) { activeColors = "from-orange-500 to-red-600 border-orange-400 shadow-[0_0_20px_-5px_rgba(249,115,22,0.5)]"; iconColor = "text-orange-400"; }
                                            else if (action.style === 'pill-blue') { activeColors = "from-blue-600 to-indigo-700 border-blue-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]"; iconColor = "text-blue-400"; }

                                            return (
                                                <button
                                                    key={action.value}
                                                    onClick={() => setNuevoEvento({ ...nuevoEvento, tipo: action.value })}
                                                    className={`relative h-24 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group/btn overflow-hidden ${isSelected
                                                        ? `bg-gradient-to-br ${activeColors} text-white scale-[1.02] z-10 ring-2 ring-white/10`
                                                        : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-white/5 active:scale-95"
                                                        }`}
                                                >
                                                    {/* Background Glow for selected */}
                                                    {isSelected && <div className="absolute inset-0 bg-white/20 mix-blend-overlay" />}

                                                    <span className={`text-3xl transition-transform duration-300 group-hover/btn:scale-110 drop-shadow-md ${isSelected ? 'text-white' : 'grayscale opacity-70 group-hover/btn:grayscale-0 group-hover/btn:opacity-100'}`}>
                                                        {action.icon}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/90' : 'text-muted-foreground group-hover/btn:text-white'}`}>
                                                        {action.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. TEAM & PLAYER SELECTOR (Animated Reveal) */}
                                <div className={`space-y-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${nuevoEvento.tipo ? 'opacity-100 translate-y-0 filter-none' : 'opacity-30 translate-y-8 blur-sm pointer-events-none'}`}>

                                    {/* TEAM SELECTOR */}
                                    <div>
                                        <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider ml-1">2. ¿Para qué equipo?</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { id: 'equipo_a', name: match.equipo_a },
                                                { id: 'equipo_b', name: match.equipo_b }
                                            ].map(team => {
                                                const isSelected = nuevoEvento.equipo === team.id;
                                                return (
                                                    <button
                                                        key={team.id}
                                                        onClick={() => setNuevoEvento({ ...nuevoEvento, equipo: team.id, jugador_id: null })}
                                                        className={`relative h-20 rounded-2xl border-2 transition-all duration-200 overflow-hidden flex items-center px-4 gap-4 ${isSelected
                                                            ? 'border-primary bg-primary/10 shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]'
                                                            : 'border-white/5 bg-zinc-900/40 hover:bg-white/5 hover:border-white/10'
                                                            }`}
                                                    >
                                                        {/* Selection Indicator */}
                                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />}

                                                        <Avatar name={team.name} size="lg" className={`border-2 ${isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-white/10 opacity-70'}`} />

                                                        <div className="text-left overflow-hidden">
                                                            <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>{team.name}</p>
                                                            <p className="text-[10px] uppercase tracking-wider opacity-60">
                                                                {team.id === 'equipo_a' ? 'Local' : 'Visitante'}
                                                            </p>
                                                        </div>

                                                        {isSelected && (
                                                            <div className="ml-auto bg-primary text-primary-foreground rounded-full p-1 shadow-lg animate-in zoom-in spin-in-12">
                                                                <Check size={14} strokeWidth={4} />
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* PLAYER SELECTOR */}
                                    <div className={`transition-all duration-500 delay-100 ${nuevoEvento.equipo ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4 pointer-events-none'}`}>
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">3. Selecciona Jugador</p>
                                            {!addingPlayerTeam && (
                                                <button
                                                    onClick={() => setAddingPlayerTeam(nuevoEvento.equipo)}
                                                    className="text-[10px] font-bold uppercase flex items-center gap-1.5 text-primary hover:text-white px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary transition-all border border-primary/20"
                                                >
                                                    <Plus size={12} strokeWidth={3} /> Nuevo Jugador
                                                </button>
                                            )}
                                        </div>

                                        {addingPlayerTeam ? (
                                            <div className="bg-zinc-900 border border-primary/50 p-4 rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                                                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                                                <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                                    <Users size={14} /> Crear Nuevo Jugador
                                                </h4>
                                                <div className="flex gap-3 mb-3">
                                                    <input
                                                        autoFocus
                                                        placeholder="Nombre del Jugador"
                                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                                        value={newPlayerForm.nombre}
                                                        onChange={e => setNewPlayerForm({ ...newPlayerForm, nombre: e.target.value })}
                                                    />
                                                    <input
                                                        placeholder="#"
                                                        type="number"
                                                        className="w-20 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                                        value={newPlayerForm.numero}
                                                        onChange={e => setNewPlayerForm({ ...newPlayerForm, numero: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button size="sm" variant="ghost" onClick={() => setAddingPlayerTeam(null)} className="flex-1 rounded-xl h-9 hover:bg-white/10">Cancelar</Button>
                                                    <Button size="sm" onClick={handleSavePlayer} className="flex-1 rounded-xl h-9 bg-primary text-primary-foreground hover:bg-primary/90 font-bold">Guardar Jugador</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto custom-scrollbar p-1">
                                                    {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(j => {
                                                        const isSelected = nuevoEvento.jugador_id === j.id;
                                                        return (
                                                            <button
                                                                key={j.id}
                                                                onClick={() => setNuevoEvento({ ...nuevoEvento, jugador_id: j.id })}
                                                                className={`group relative p-3 rounded-xl border text-left transition-all duration-200 flex items-center gap-3 ${isSelected
                                                                    ? 'bg-white text-black border-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.5)] scale-[1.02] z-10'
                                                                    : 'bg-zinc-900/40 border-white/5 hover:bg-white/10 hover:border-white/10 text-muted-foreground hover:text-white'
                                                                    }`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${isSelected ? 'bg-black text-white border-black' : 'bg-white/5 border-white/10 text-white/50 group-hover:bg-white/10 group-hover:text-white'
                                                                    }`}>
                                                                    {j.numero || <Users size={14} />}
                                                                </div>
                                                                <span className="truncate text-xs font-bold leading-tight">{j.nombre}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-white/5">
                                                    <Button
                                                        size="lg"
                                                        className={`w-full h-14 rounded-xl text-lg font-black tracking-wide shadow-lg transition-all duration-300 ${nuevoEvento.jugador_id
                                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black shadow-emerald-500/20 translate-y-0 opacity-100'
                                                            : 'bg-white/5 text-muted-foreground border border-white/5 translate-y-2 opacity-50 cursor-not-allowed'
                                                            }`}
                                                        disabled={!nuevoEvento.jugador_id}
                                                        onClick={handleNuevoEvento}
                                                    >
                                                        {nuevoEvento.jugador_id ? (
                                                            <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                                                <Check strokeWidth={3} className="w-5 h-5" /> CONFIRMAR EVENTO
                                                            </span>
                                                        ) : 'Completa los pasos...'}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
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
                {/* --- PREMIUM END MATCH MODAL --- */}
                {isEndingMatch && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop with Blur */}
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                            onClick={() => setIsEndingMatch(false)}
                        />

                        {/* Modal Content */}
                        <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-0 max-w-sm w-full shadow-2xl shadow-black/50 scale-100 animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 overflow-hidden">

                            {/* Decorative Header Background */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-600/20 to-transparent pointer-events-none" />
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="p-6 relative z-10 text-center">
                                {/* Icon */}
                                <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 border-4 border-zinc-900 ring-1 ring-white/20">
                                    <Trophy size={36} className="text-white drop-shadow-md" />
                                </div>

                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                                    ¿Finalizar Partido?
                                </h3>
                                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                    El cronómetro se detendrá y el marcador actual se guardará como resultado definitivo.
                                </p>

                                {/* Score Preview Card */}
                                <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/10 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />

                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex flex-col items-center w-1/3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 truncate max-w-full">{match.equipo_a}</span>
                                            <span className="text-4xl font-black text-white tracking-tighter">{scoreA}</span>
                                        </div>

                                        <div className="h-8 w-px bg-white/10 mx-2" />

                                        <div className="flex flex-col items-center w-1/3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 truncate max-w-full">{match.equipo_b}</span>
                                            <span className="text-4xl font-black text-white tracking-tighter">{scoreB}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="ghost"
                                        className="h-12 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                                        onClick={() => setIsEndingMatch(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="h-12 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold shadow-lg shadow-orange-900/20 border-t border-white/20"
                                        onClick={confirmarFinalizar}
                                    >
                                        Confirmar Final
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
