"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Badge, Avatar } from "@/components/ui-primitives";
import { X, Save, Clock, Loader2, Plus, Play, Pause, Square, AlertCircle, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { addPoints, removePoints, getCurrentScore, ScoreDetail } from "@/lib/sport-scoring";

type EditMatchModalProps = {
    match: any;
    isOpen: boolean;
    onClose: () => void;
};

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

const EVENTOS_TIPOS = [
    { value: 'gol', label: '⚽ Gol', color: 'success' },
    { value: 'tarjeta_amarilla', label: '🟨 Tarjeta Amarilla', color: 'warning' },
    { value: 'tarjeta_roja', label: '🟥 Tarjeta Roja', color: 'danger' },
];

export function EditMatchModal({ match, isOpen, onClose }: EditMatchModalProps) {
    const [loading, setLoading] = useState(false);
    const [jugadoresA, setJugadoresA] = useState<Jugador[]>([]);
    const [jugadoresB, setJugadoresB] = useState<Jugador[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);

    // Cronómetro
    const [minutoActual, setMinutoActual] = useState(0);
    const [cronometroActivo, setCronometroActivo] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Nuevo evento
    const [showEventMenu, setShowEventMenu] = useState(false);
    const [nuevoEvento, setNuevoEvento] = useState({
        tipo: '',
        equipo: '',
        jugador_id: null as number | null,
    });

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
            if (detalle.estado_cronometro === 'corriendo') {
                const tiempoInicio = new Date(detalle.tiempo_inicio).getTime();
                const ahora = new Date().getTime();
                const minutosTranscurridos = Math.floor((ahora - tiempoInicio) / 60000); // Calcular minutos reales transcurridos desde inicio/resume

                // Ajustar lógica si es necesario para manejar pausas, por ahora simple:
                // Si quieres que sea exacto considerando pausas, deberías guardar "minutos_acumulados" + (ahora - ultimo_inicio)
                // Por simplicidad, usaremos el guardado + intervalo

                setCronometroActivo(true);
            }
        }
    }, [match, isOpen]);

    // Cronómetro automático (1 minuto real = 1 minuto de juego)
    useEffect(() => {
        if (cronometroActivo) {
            console.log('⏱️ Cronómetro iniciado (Tiempo Real)');
            intervalRef.current = setInterval(() => {
                setMinutoActual(prev => {
                    const nuevo = prev + 1;
                    console.log(`⏱️ Minuto: ${nuevo}`);
                    actualizarMinutoEnDB(nuevo);
                    return nuevo;
                });
            }, 60000); // 60,000 ms = 1 minuto real
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
        // USANDO NUEVA TABLA
        const { data, error } = await supabase
            .from('olympics_jugadores')
            .select('*')
            .eq('partido_id', match.id);

        if (error) {
            console.error('❌ Error cargando jugadores:', error);
        } else if (data) {
            console.log('✅ Jugadores cargados:', data.length);
            setJugadoresA(data.filter(j => j.equipo === 'equipo_a'));
            setJugadoresB(data.filter(j => j.equipo === 'equipo_b'));
        }
    };

    const fetchEventos = async () => {
        console.log('📋 Cargando eventos...');
        const { data, error } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:olympics_jugadores(*)')
            .eq('partido_id', match.id)
            .order('minuto', { ascending: false });

        if (error) {
            console.error('❌ Error cargando eventos:', error);
        } else if (data) {
            setEventos(data);
        }
    };

    // --- SCORING FUNCTIONS ---

    const handleUpdateScore = async (equipo: 'equipo_a' | 'equipo_b', puntos: number = 1) => {
        const detalleActual = match.marcador_detalle || {};
        const deporte = match.disciplinas?.name || 'Genérico';

        // Calcular nuevo estado usando la librería compartida
        const nuevoDetalle = addPoints(deporte, detalleActual, equipo, puntos);

        // Optimistic UI update (opcional, pero mejor esperar a DB para consistencia crítica)
        // Por ahora guardamos directo

        const { error } = await supabase
            .from('partidos')
            .update({ marcador_detalle: nuevoDetalle })
            .eq('id', match.id);

        if (error) {
            console.error('Error updating score:', error);
            alert('Error actualizando marcador');
        } else {
            // Si es Fútbol, preguntamos si queremos crear evento
            if (deporte === 'Fútbol') {
                // Opcional: Podríamos auto-crear evento o dejar que el usuario lo haga
                // Por simplicidad, dejamos que la funcionalidad de "Evento" maneje el log, 
                // pero esta función maneja el marcador RAW.
            }
        }
    };

    const handleUndoScore = async (equipo: 'equipo_a' | 'equipo_b', puntos: number = 1) => {
        const detalleActual = match.marcador_detalle || {};
        const deporte = match.disciplinas?.name || 'Genérico';
        const nuevoDetalle = removePoints(deporte, detalleActual, equipo, puntos);

        await supabase.from('partidos').update({ marcador_detalle: nuevoDetalle }).eq('id', match.id);
    };

    // Renderizado de controles de puntuación según deporte
    const renderScoreControls = (equipo: 'equipo_a' | 'equipo_b') => {
        const deporte = match.disciplinas?.name;

        if (deporte === 'Voleibol' || deporte === 'Tenis' || deporte === 'Tenis de Mesa') {
            return (
                <div className="flex gap-2 justify-center mt-2">
                    <Button size="sm" variant="outline" onClick={() => handleUndoScore(equipo)} disabled={!match.marcador_detalle} className="h-8 w-8 p-0">
                        <Minus size={14} />
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateScore(equipo, 1)} className="bg-indigo-600 hover:bg-indigo-700 h-8 px-3">
                        +1 Punto
                    </Button>
                </div>
            );
        }

        if (deporte === 'Baloncesto') {
            return (
                <div className="flex gap-1 justify-center mt-2">
                    <Button size="sm" variant="outline" onClick={() => handleUpdateScore(equipo, 1)} className="h-8 px-2 text-xs">+1</Button>
                    <Button size="sm" variant="outline" onClick={() => handleUpdateScore(equipo, 2)} className="h-8 px-2 text-xs">+2</Button>
                    <Button size="sm" variant="outline" onClick={() => handleUpdateScore(equipo, 3)} className="h-8 px-2 text-xs">+3</Button>
                </div>
            );
        }

        // Fútbol y otros (Solo mostrar si es Admin manual, pero fútbol usa eventos)
        if (deporte === 'Fútbol') {
            return (
                <div className="flex justify-center mt-2">
                    <span className="text-[10px] text-slate-500">Usa "Nuevo Evento" para Goles</span>
                </div>
            );
        }

        return (
            <div className="flex justify-center mt-2">
                <Button size="sm" onClick={() => handleUpdateScore(equipo, 1)}>+1</Button>
            </div>
        );
    };

    const actualizarMinutoEnDB = async (minuto: number) => {
        const detalle = match.marcador_detalle || {};
        // IMPORTANT: Fetch the LATEST marcador_detalle from DB to avoid
        // overwriting score changes made between timer ticks (stale closure bug)
        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', match.id)
            .single();

        const freshDetalle = freshMatch?.marcador_detalle || detalle;
        const { error } = await supabase
            .from('partidos')
            .update({
                marcador_detalle: {
                    ...freshDetalle,
                    minuto_actual: minuto,
                    estado_cronometro: cronometroActivo ? 'corriendo' : 'pausado'
                }
            })
            .eq('id', match.id);

        if (error) {
            console.error('❌ Error actualizando minuto:', error);
        }
    };

    const iniciarPartido = async () => {
        console.log('🟢 Iniciando partido...');
        setCronometroActivo(true);
        setMinutoActual(0);

        const { error: updateError } = await supabase
            .from('partidos')
            .update({
                estado: 'en_vivo',
                marcador_detalle: {
                    ...match.marcador_detalle,
                    tiempo_inicio: new Date().toISOString(),
                    minuto_actual: 0,
                    estado_cronometro: 'corriendo'
                }
            })
            .eq('id', match.id);

        if (updateError) {
            console.error('❌ Error iniciando partido:', updateError);
            return;
        }

        const { error: eventError } = await supabase
            .from('olympics_eventos')
            .insert({
                partido_id: match.id,
                tipo_evento: 'inicio',
                minuto: 0,
                equipo: 'sistema',
                descripcion: 'Inicio del partido'
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
        setCronometroActivo(true);
    };

    const finalizarPartido = async () => {
        console.log('🏁 Finalizando partido...');
        setCronometroActivo(false);

        const { error: updateError } = await supabase
            .from('partidos')
            .update({
                estado: 'finalizado',
                marcador_detalle: {
                    ...match.marcador_detalle,
                    minuto_actual: minutoActual,
                    estado_cronometro: 'detenido'
                }
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
                descripcion: 'Fin del partido'
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
        const nombre = prompt(`Nombre del jugador (${equipo === 'equipo_a' ? match.equipo_a : match.equipo_b}):`);
        if (!nombre) return;

        const numeroStr = prompt('Número de camiseta (opcional):');

        const { error } = await supabase
            .from('olympics_jugadores')
            .insert({
                partido_id: match.id,
                nombre,
                numero: numeroStr ? parseInt(numeroStr) : null,
                equipo
            });

        if (error) {
            alert('Error al agregar jugador: ' + error.message);
        } else {
            fetchJugadores();
        }
    };

    if (!isOpen || !match) return null;

    // Calcular score visual usando la librería
    const currentScore = getCurrentScore(match.disciplinas?.name, match.marcador_detalle || {});
    const scoreA = currentScore.scoreA;
    const scoreB = currentScore.scoreB;
    const subScoreA = currentScore.subScoreA;
    const subScoreB = currentScore.subScoreB;
    const extraInfo = currentScore.extra;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-4xl rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20">
                    <div>
                        <h3 className="font-bold text-lg">Gestión del Partido</h3>
                        <p className="text-xs text-muted-foreground">{match.disciplinas?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Marcador y Cronómetro */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                        {/* Equipo A */}
                        <div className="text-center space-y-2">
                            <Avatar name={match.equipo_a} size="lg" />
                            <p className="font-bold text-lg">{match.equipo_a}</p>
                            <div className="flex flex-col items-center">
                                <p className="text-5xl font-black">{scoreA}</p>
                                {/* Subscore (Sets/Cuartos/Tiempos) */}
                                {subScoreA !== undefined && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        {currentScore.subLabel}: {subScoreA}
                                    </Badge>
                                )}
                            </div>
                            {renderScoreControls('equipo_a')}
                        </div>

                        {/* Cronómetro / Info Central - Solo si el deporte tiene tiempo */}
                        {['Fútbol', 'Baloncesto', 'Futsal'].includes(match.disciplinas?.name) ? (
                            <div className="text-center space-y-3 min-w-[200px]">
                                {extraInfo && (
                                    <Badge className="bg-indigo-500/10 text-indigo-400 mb-2">{extraInfo}</Badge>
                                )}

                                <div className="text-6xl font-black font-mono text-primary">
                                    {minutoActual}'
                                </div>

                                {match.estado === 'programado' && (
                                    <Button onClick={iniciarPartido} className="w-full">
                                        <Play size={16} />
                                        Iniciar Partido
                                    </Button>
                                )}

                                {match.estado === 'en_vivo' && (
                                    <div className="flex gap-2">
                                        {cronometroActivo ? (
                                            <Button onClick={pausarCronometro} variant="secondary" className="flex-1">
                                                <Pause size={16} />
                                                Pausar
                                            </Button>
                                        ) : (
                                            <Button onClick={reanudarCronometro} variant="secondary" className="flex-1">
                                                <Play size={16} />
                                                Reanudar
                                            </Button>
                                        )}
                                        <Button onClick={finalizarPartido} variant="ghost" className="flex-1">
                                            <Square size={16} />
                                            Finalizar
                                        </Button>
                                    </div>
                                )}

                                {match.estado === 'finalizado' && (
                                    <Badge variant="outline" className="text-sm">Partido Finalizado</Badge>
                                )}
                            </div>
                        ) : (
                            /* Vista simplificada para deportes sin reloj (Volley, Tenis) */
                            <div className="text-center space-y-3 min-w-[200px] flex flex-col justify-center">
                                {extraInfo && (
                                    <Badge className="bg-indigo-500/10 text-indigo-400 mb-2 mx-auto">{extraInfo}</Badge>
                                )}
                                <div className="text-sm text-slate-500 mb-2">Marcador de Sets</div>

                                <div className="flex justify-center gap-4 mb-4">
                                    {match.estado === 'programado' && (
                                        <Button onClick={iniciarPartido}>
                                            <Play size={16} /> Iniciar
                                        </Button>
                                    )}
                                    {match.estado === 'en_vivo' && (
                                        <Button onClick={finalizarPartido} variant="ghost" className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                                            <Square size={16} /> Finalizar Partido
                                        </Button>
                                    )}
                                    {match.estado === 'finalizado' && <Badge variant="outline">Finalizado</Badge>}
                                </div>
                            </div>
                        )}

                        {/* Equipo B */}
                        <div className="text-center space-y-2">
                            <Avatar name={match.equipo_b} size="lg" />
                            <p className="font-bold text-lg">{match.equipo_b}</p>
                            <div className="flex flex-col items-center">
                                <p className="text-5xl font-black text-muted-foreground">{scoreB}</p>
                                {subScoreB !== undefined && (
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        {currentScore.subLabel}: {subScoreB}
                                    </Badge>
                                )}
                            </div>
                            {renderScoreControls('equipo_b')}
                        </div>
                    </div>

                    {/* Crear Evento */}
                    {match.estado === 'en_vivo' && (
                        <div className="glass rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    Nuevo Evento
                                </h4>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        console.log('🔄 Toggle menu:', !showEventMenu);
                                        setShowEventMenu(!showEventMenu);
                                    }}
                                    variant={showEventMenu ? "secondary" : "default"}
                                >
                                    {showEventMenu ? 'Cancelar' : '+ Crear Evento'}
                                </Button>
                            </div>

                            {showEventMenu && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {/* Tipo de Evento */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Tipo de Evento
                                        </label>
                                        <div className="flex gap-2">
                                            {EVENTOS_TIPOS.map(tipo => (
                                                <button
                                                    key={tipo.value}
                                                    onClick={() => {
                                                        console.log('📌 Tipo seleccionado:', tipo.value);
                                                        setNuevoEvento({ ...nuevoEvento, tipo: tipo.value });
                                                    }}
                                                    className={`flex-1 py-3 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${nuevoEvento.tipo === tipo.value
                                                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/25'
                                                        : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-indigo-500/50 hover:bg-slate-800/80'
                                                        }`}
                                                >
                                                    {tipo.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Seleccionar Equipo */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Equipo
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => {
                                                    console.log('🏟️ Equipo seleccionado: equipo_a');
                                                    setNuevoEvento({ ...nuevoEvento, equipo: 'equipo_a', jugador_id: null });
                                                }}
                                                className={`py-3 rounded-xl font-semibold border-2 transition-all ${nuevoEvento.equipo === 'equipo_a'
                                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/25'
                                                    : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-indigo-500/50 hover:bg-slate-800/80'
                                                    }`}
                                            >
                                                {match.equipo_a}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    console.log('🏟️ Equipo seleccionado: equipo_b');
                                                    setNuevoEvento({ ...nuevoEvento, equipo: 'equipo_b', jugador_id: null });
                                                }}
                                                className={`py-3 rounded-xl font-semibold border-2 transition-all ${nuevoEvento.equipo === 'equipo_b'
                                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/25'
                                                    : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-indigo-500/50 hover:bg-slate-800/80'
                                                    }`}
                                            >
                                                {match.equipo_b}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Seleccionar Jugador */}
                                    {nuevoEvento.equipo && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Elegir Jugador
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                                {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(jugador => (
                                                    <button
                                                        key={jugador.id}
                                                        onClick={() => {
                                                            console.log('👤 Jugador seleccionado:', jugador.nombre);
                                                            setNuevoEvento({ ...nuevoEvento, jugador_id: jugador.id });
                                                        }}
                                                        className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${nuevoEvento.jugador_id === jugador.id
                                                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 shadow-lg shadow-indigo-500/25'
                                                            : 'border-white/10 bg-slate-800/50 text-slate-400 hover:border-indigo-500/50 hover:bg-slate-800/80'
                                                            }`}
                                                    >
                                                        {jugador.numero && `#${jugador.numero} `}{jugador.nombre}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => agregarJugador(nuevoEvento.equipo)}
                                                    className="p-3 rounded-xl text-sm font-medium border-2 border-dashed border-border/50 text-muted-foreground hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                                >
                                                    <Plus size={14} className="inline mr-1" />
                                                    Agregar Jugador
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={agregarEvento}
                                        className="w-full"
                                        disabled={!nuevoEvento.tipo || !nuevoEvento.equipo || !nuevoEvento.jugador_id}
                                    >
                                        <Save size={16} />
                                        Registrar Evento (Minuto {minutoActual})
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Línea de Tiempo */}
                    <div className="space-y-3">
                        <h4 className="font-bold flex items-center gap-2">
                            <Clock size={16} />
                            Línea de Tiempo
                        </h4>
                        <div className="glass rounded-xl p-4 max-h-80 overflow-y-auto space-y-2">
                            {eventos.length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm py-8">No hay eventos registrados</p>
                            ) : (
                                eventos.map(evento => (
                                    <div key={evento.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <Badge variant="outline" className="min-w-[50px] justify-center font-mono">
                                            {evento.minuto}'
                                        </Badge>
                                        <span className="text-lg">
                                            {evento.tipo_evento === 'gol' && '⚽'}
                                            {evento.tipo_evento === 'tarjeta_amarilla' && '🟨'}
                                            {evento.tipo_evento === 'tarjeta_roja' && '🟥'}
                                            {evento.tipo_evento === 'inicio' && '🟢'}
                                            {evento.tipo_evento === 'fin' && '🏁'}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm">
                                                {evento.tipo_evento.replace('_', ' ').toUpperCase()}
                                            </p>
                                            {evento.jugadores && (
                                                <p className="text-xs text-muted-foreground">
                                                    {evento.jugadores.numero && `#${evento.jugadores.numero} `}
                                                    {evento.jugadores.nombre}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant={evento.equipo === 'equipo_a' ? 'default' : 'secondary'} className="text-xs">
                                            {evento.equipo === 'equipo_a' ? match.equipo_a : evento.equipo === 'equipo_b' ? match.equipo_b : 'Sistema'}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </div>
    );
}
