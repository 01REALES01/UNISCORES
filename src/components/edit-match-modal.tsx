"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Input, Badge, Avatar } from "@/components/ui-primitives";
import { X, Save, Clock, Loader2, Plus, Play, Pause, Square, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
        // USANDO NUEVA TABLA
        const { data, error } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:olympics_jugadores(*)') // Join corregido
            .eq('partido_id', match.id)
            .order('minuto', { ascending: false });

        if (error) {
            console.error('❌ Error cargando eventos:', error);
        } else if (data) {
            console.log('✅ Eventos cargados:', data.length);
            setEventos(data);
        }
    };

    const actualizarMinutoEnDB = async (minuto: number) => {
        const detalle = match.marcador_detalle || {};
        const { error } = await supabase
            .from('partidos')
            .update({
                marcador_detalle: {
                    ...detalle,
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
            console.log('⚽ Actualizando marcador...');
            const detalle = match.marcador_detalle || {};
            const campo = nuevoEvento.equipo === 'equipo_a' ? 'goles_a' : 'goles_b';
            const nuevoMarcador = {
                ...detalle,
                [campo]: (detalle[campo] || 0) + 1
            };

            const { error: scoreError } = await supabase
                .from('partidos')
                .update({ marcador_detalle: nuevoMarcador })
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

        console.log('👤 Agregando jugador:', { nombre, equipo });

        // USANDO NUEVA TABLA
        const { error } = await supabase
            .from('olympics_jugadores')
            .insert({
                partido_id: match.id,
                nombre,
                numero: numeroStr ? parseInt(numeroStr) : null,
                equipo
            });

        if (error) {
            console.error('❌ Error agregando jugador:', error);
            alert('Error al agregar jugador: ' + error.message + ' (Revisa que ejecutaste el SQL y refrescaste la página)');
        } else {
            console.log('✅ Jugador agregado correctamente');
            fetchJugadores();
        }
    };

    if (!isOpen || !match) return null;

    const scoreA = match.marcador_detalle?.goles_a ?? 0;
    const scoreB = match.marcador_detalle?.goles_b ?? 0;

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
                            <p className="text-5xl font-black">{scoreA}</p>
                        </div>

                        {/* Cronómetro */}
                        <div className="text-center space-y-3 min-w-[200px]">
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

                        {/* Equipo B */}
                        <div className="text-center space-y-2">
                            <Avatar name={match.equipo_b} size="lg" />
                            <p className="font-bold text-lg">{match.equipo_b}</p>
                            <p className="text-5xl font-black text-muted-foreground">{scoreB}</p>
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
