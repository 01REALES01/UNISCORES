"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Avatar, Card } from "@/components/ui-primitives";
import { ArrowLeft, Clock, Play, Pause, Square, AlertCircle, Plus, Save, Users, Trophy, ChevronRight, Activity, Check, Trash2, Edit2, Edit3, Terminal, RotateCcw, X, Crown, Handshake, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { cn } from "@/lib/utils";
import { getCurrentScore, recalculateTotals, cambiarTiempoFutbol, cambiarCuartoBasket, removePoints, addPoints, isCountdownSport, getPeriodDuration, getCurrentPeriodNumber } from "@/lib/sport-scoring";
import { getDisplayName, getCarreraName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { toast } from "sonner";
import { RaceControl } from "@/components/race-control";
import { invalidateCache } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import { stampAudit, formatUltimaEdicion, stampEventAudit, parseEventAudit } from "@/lib/audit-helpers";
import { motion, AnimatePresence } from "framer-motion";
import { SPORT_EMOJI } from "@/lib/constants";

// Tipos
type Jugador = {
    id: number;
    nombre: string;
    numero: number | null;
    equipo: string;
    profile_id?: string | null;
};

type Evento = {
    id: number;
    tipo_evento: string;
    minuto: number;
    equipo: string;
    descripcion?: string | null;
    periodo?: number | null;
    jugadores?: Jugador;
};

const DISCIPLINES_COLORS: Record<string, string> = {
    'Fútbol': 'from-emerald-500 to-emerald-900',
    'Baloncesto': 'from-orange-500 to-orange-800',
    'Voleibol': 'from-red-500 to-red-800',
    'Tenis': 'from-lime-500 to-lime-800',
    'Tenis de Mesa': 'from-rose-500 to-rose-800',
    'Ajedrez': 'from-slate-600 to-zinc-900',
    'Natación': 'from-cyan-500 to-blue-700',
};

const SPORT_ACCENT_COLORS: Record<string, string> = {
    'Fútbol': 'text-emerald-400',
    'Baloncesto': 'text-orange-400',
    'Voleibol': 'text-red-400',
    'Tenis': 'text-lime-400',
    'Tenis de Mesa': 'text-rose-400',
    'Ajedrez': 'text-slate-400',
    'Natación': 'text-cyan-400',
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
            { value: 'victoria', label: 'Victoria', icon: <Crown size={32} />, style: 'pill-gold' },
            { value: 'empate', label: 'Empate', icon: <Handshake size={32} />, style: 'pill-neutral' },
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
    const { profile } = useAuth();

    // Helper: stamp audit on any marcador_detalle before DB save
    const auditDetalle = (detalle: Record<string, any>) => stampAudit(detalle, profile);

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
    const [deportistas, setDeportistas] = useState<any[]>([]);
    const [deportistaSearch, setDeportistaSearch] = useState('');
    const [loadingDeportistas, setLoadingDeportistas] = useState(false);
    const [newPlayerForm, setNewPlayerForm] = useState({ nombre: '', numero: '', profile_id: '' });
    const [isEndingMatch, setIsEndingMatch] = useState(false);
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [confirmingDeletion, setConfirmingDeletion] = useState<Evento | null>(null);
    const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
    const [activeEditors, setActiveEditors] = useState<any[]>([]);

    // Edición Avanzada — Todos los deportes
    const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
    const [advancedData, setAdvancedData] = useState<any>({});
    const [advancedPeriod, setAdvancedPeriod] = useState(1); // set_actual / tiempo_actual / cuarto_actual
    const [advancedMinuto, setAdvancedMinuto] = useState(0);

    const openAdvancedEdit = () => {
        const det = match?.marcador_detalle || {};
        const sport = match?.disciplinas?.name;
        if (sport === 'Fútbol') {
            setAdvancedData(JSON.parse(JSON.stringify(det.tiempos || {})));
            setAdvancedPeriod(det.tiempo_actual || 1);
            setAdvancedMinuto(det.minuto_actual || 0);
        } else if (sport === 'Baloncesto' || sport === 'Futsal') {
            setAdvancedData(JSON.parse(JSON.stringify(det.cuartos || {})));
            setAdvancedPeriod(det.cuarto_actual || 1);
            setAdvancedMinuto(det.minuto_actual || 0);
        } else {
            setAdvancedData(JSON.parse(JSON.stringify(det.sets || {})));
            setAdvancedPeriod(det.set_actual || 1);
            setAdvancedMinuto(0);
        }
        setShowAdvancedEdit(true);
    };

    const handleAdvChange = (periodNum: number, field: string, value: string) => {
        const val = value === '' ? '' : parseInt(value);
        setAdvancedData((prev: any) => ({
            ...prev,
            [periodNum]: {
                ...(prev[periodNum] || {}),
                [field]: typeof val === 'number' ? Math.max(0, val) : 0
            }
        }));
    };

    const saveAdvancedEdit = async () => {
        if (!match) return;
        const prevDetalle = match.marcador_detalle || {};
        const deporte = match.disciplinas?.name || 'Fútbol';

        let forcedDetalle: any = { ...prevDetalle };

        if (deporte === 'Fútbol') {
            forcedDetalle.tiempos = advancedData;
            forcedDetalle.tiempo_actual = advancedPeriod;
            forcedDetalle.minuto_actual = advancedMinuto;
        } else if (deporte === 'Baloncesto' || deporte === 'Futsal') {
            forcedDetalle.cuartos = advancedData;
            forcedDetalle.cuarto_actual = advancedPeriod;
            forcedDetalle.minuto_actual = advancedMinuto;
        } else {
            forcedDetalle.sets = advancedData;
            forcedDetalle.set_actual = advancedPeriod;
        }

        const finalDetalle = recalculateTotals(deporte, forcedDetalle);

        const { error } = await supabase
            .from('partidos')
            .update({ 
                marcador_detalle: auditDetalle(finalDetalle),
                last_edited_by: profile?.id
            })
            .eq('id', matchId);

        if (error) {
            console.error('Error saving advanced edit:', error);
            alert('Error actualizando marcador avanzado');
        } else {
            console.log('✅ Marcador avanzado guardado', finalDetalle);
            setMatch((prev: any) => ({ ...prev, marcador_detalle: finalDetalle }));
            setMinutoActual(advancedMinuto);
            setShowAdvancedEdit(false);
            invalidateCache('admin-partidos');
            invalidateCache('home-partidos');
        }
    };

    // 1. Cargar Datos Iniciales & Presence
    useEffect(() => {
        fetchMatchDetails();

        // Presencia en tiempo real
        if (profile) {
            const sessionId = Math.random().toString(36).substring(7); // ID de sesión único por pestaña
            const channel = supabase.channel(`match-presence-${matchId}`, {
                config: {
                    presence: {
                        key: `${profile.id}-${sessionId}`,
                    },
                },
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    const editors = Object.values(state).flat();
                    // Filtrar solo MI sesión actual, pero permitir ver OTRAS sesiones mías (en otras pestañas)
                    setActiveEditors(editors.filter((e: any) => e.session_id !== sessionId));
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    const otherSession = newPresences.find((p: any) => p.session_id !== sessionId);
                    if (otherSession) {
                        toast.info(`${otherSession.user_name || 'Alguien'} se ha unido a la edición`);
                    }
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    // Logic for leave if needed
                })
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'partidos',
                    filter: `id=eq.${matchId}`
                }, (payload: any) => {
                    console.log('🔄 Sincronización Realtime - Cambio detectado:', payload.new);
                    setMatch((prev: any) => {
                        if (!prev) return payload.new;
                        return { ...prev, ...payload.new };
                    });
                    
                    if (payload.new.marcador_detalle) {
                        const newDetalle = payload.new.marcador_detalle;
                        if (newDetalle.estado_cronometro === 'corriendo') setCronometroActivo(true);
                        else if (newDetalle.estado_cronometro === 'pausado' || newDetalle.estado_cronometro === 'detenido') setCronometroActivo(false);
                        if (newDetalle.minuto_actual !== undefined) setMinutoActual(newDetalle.minuto_actual);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            user_id: profile.id,
                            session_id: sessionId,
                            user_name: profile.full_name || profile.email,
                            online_at: new Date().toISOString(),
                        });
                    }
                });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [matchId, profile]);

    // 2. Cronómetro (Lógica de servidor - cada 60s)
    useEffect(() => {
        if (cronometroActivo) {
            const isCountdown = isCountdownSport(match?.disciplinas?.name || "");
            intervalRef.current = setInterval(() => {
                setMinutoActual(prev => {
                    const nuevo = isCountdown ? Math.max(0, prev - 1) : prev + 1;
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
                .select(`*, disciplinas(name), delegacion_a, delegacion_b, carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)`)
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
            // Carga inicial de deportistas (solo los primeros 50 o los del deporte)
            fetchDeportistas('');
        } catch (err: any) {
            console.error(err);
            setErrorCtx(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search for deportistas
    useEffect(() => {
        const timer = setTimeout(() => {
            if (addingPlayerTeam) {
                fetchDeportistas(deportistaSearch);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [deportistaSearch, addingPlayerTeam]);

    const fetchJugadores = async () => {
        const { data } = await supabase.from('olympics_jugadores').select('*').eq('partido_id', matchId);
        if (data) {
            setJugadoresA(data.filter(j => j.equipo === 'equipo_a'));
            setJugadoresB(data.filter(j => j.equipo === 'equipo_b'));
        }
    };

    const fetchDeportistas = async (search: string = '') => {
        setLoadingDeportistas(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, full_name, roles, email, athlete_disciplina_id')
                .contains('roles', ['deportista']);
            
            if (search) {
                query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
            } else {
                // Si no hay búsqueda, limitamos drásticamente para agilizar el primer render
                query = query.limit(20);
            }

            const { data, error } = await query;
            
            if (error) throw error;

            if (data) {
                const currentDiscId = match?.disciplina_id;
                const sorted = [...data].sort((a, b) => {
                    if (currentDiscId) {
                        const matchesA = a.athlete_disciplina_id === currentDiscId;
                        const matchesB = b.athlete_disciplina_id === currentDiscId;
                        if (matchesA && !matchesB) return -1;
                        if (!matchesA && matchesB) return 1;
                    }
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });
                setDeportistas(sorted);
            }
        } catch (err) {
            console.error("Error fetching profiles:", err);
        } finally {
            setLoadingDeportistas(false);
        }
    };

    const handleDeletePlayer = async (playerId: number) => {
        if (!confirm("¿Eliminar este jugador de la nómina?")) return;
        
        const { error } = await supabase
            .from('olympics_jugadores')
            .delete()
            .eq('id', playerId);

        if (!error) {
            toast.success("Jugador eliminado");
            fetchJugadores();
        } else {
            toast.error("Error al eliminar: " + error.message);
        }
    };

    const fetchEventos = async () => {
        const { data } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:olympics_jugadores(*)')
            .eq('partido_id', matchId)
            .order('id', { ascending: false });

        if (data) {
            setEventos(data);
        }
    };

    // Funciones de Acción
    const actualizarMinutoEnDB = async (minuto: number) => {
        if (!match || !profile) return;
        // IMPORTANT: Fetch the LATEST marcador_detalle from DB to avoid
        // overwriting score changes made between timer ticks (stale closure bug)
        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', matchId)
            .single();

        const detalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};
        const nuevoDetalle = {
            ...detalle,
            minuto_actual: minuto,
            estado_cronometro: 'corriendo',
            ultimo_update: new Date().toISOString()
        };
        await supabase.from('partidos')
            .update({ 
                marcador_detalle: nuevoDetalle,
                last_edited_by: profile.id
            })
            .eq('id', matchId);
        // Keep local state in sync
        setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoDetalle, last_edited_by: profile.id }));
    };

    const toggleCronometro = async () => {
        try {
            const nuevoEstado = !cronometroActivo;
            setCronometroActivo(nuevoEstado);

            // Fetch latest from DB to avoid overwriting score
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle, estado')
                .eq('id', matchId)
                .single();
            const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

            // Update DB
            const nuevoDetalle = {
                ...freshDetalle,
                estado_cronometro: nuevoEstado ? 'corriendo' : 'pausado',
                ultimo_update: new Date().toISOString()
            };

            // Si inicia por primera vez
            const currentEstado = freshMatch?.estado || match.estado;
            if (nuevoEstado && currentEstado === 'programado') {
                const sportName = match?.disciplinas?.name || "";
                const isCountdown = isCountdownSport(sportName);

                nuevoDetalle.tiempo_inicio = new Date().toISOString();
                nuevoDetalle.minuto_actual = isCountdown ? getPeriodDuration(sportName) : 0;
                const { error } = await supabase.from('partidos').update({
                    estado: 'en_vivo',
                    marcador_detalle: auditDetalle(nuevoDetalle)
                }).eq('id', matchId);

                if (error) throw error;

                setMatch((prev: any) => ({ ...prev, estado: 'en_vivo', marcador_detalle: nuevoDetalle }));
                invalidateCache('home-partidos');
                invalidateCache('admin-dashboard');
                invalidateCache('admin-partidos');
                registrarEventoSistema('inicio', 'Inicio del partido');
            } else {
            const { error } = await supabase.from('partidos').update({
                marcador_detalle: auditDetalle(nuevoDetalle),
                last_edited_by: profile?.id
            }).eq('id', matchId);
                if (error) throw error;
                setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoDetalle }));
            }
        } catch (err: any) {
            console.error('Error toggling chronometer:', err);
            toast.error('Error con el cronómetro: ' + err.message);
            setCronometroActivo(cronometroActivo);
        }
    };

    const handleFinalizarClick = () => {
        setIsEndingMatch(true);
    };

    const handleCambiarPeriodo = async () => {
        try {
            const disciplinaName = match.disciplinas?.name || 'Deporte';
            setCronometroActivo(false);

            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle')
                .eq('id', matchId)
                .single();

            let nuevoMarcador = { ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}) };
            let mensaje = '';
            let nuevoMinuto = minutoActual;

            if (disciplinaName === 'Fútbol') {
                nuevoMarcador = cambiarTiempoFutbol(nuevoMarcador);
                mensaje = 'Cambio al 2º tiempo';
                if (nuevoMarcador.tiempo_actual === 2) nuevoMinuto = 45;
            } else if (disciplinaName === 'Baloncesto') {
                const cuartoActual = nuevoMarcador.cuarto_actual || 1;
                if (cuartoActual < 4) {
                    nuevoMarcador = cambiarCuartoBasket(nuevoMarcador);
                    mensaje = `Cambio al ${nuevoMarcador.cuarto_actual}º cuarto`;
                    nuevoMinuto = getPeriodDuration('Baloncesto');
                }
            }

            if (mensaje) {
                nuevoMarcador.minuto_actual = nuevoMinuto;
                nuevoMarcador.estado_cronometro = 'pausado';
                nuevoMarcador.ultimo_update = new Date().toISOString();

                const { error } = await supabase.from('partidos').update({ 
                    marcador_detalle: auditDetalle(nuevoMarcador),
                    last_edited_by: profile?.id
                }).eq('id', matchId);
                if (error) throw error;

                setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
                setMinutoActual(nuevoMinuto);
                registrarEventoSistema('periodo', mensaje);
                toast.success(mensaje + '. Cronómetro pausado.');
            }
        } catch (err: any) {
            console.error('Error changing period:', err);
            toast.error('Error al cambiar período: ' + err.message);
        }
    };

    const confirmarFinalizar = async () => {
        setIsEndingMatch(false);
        setCronometroActivo(false);

        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', matchId)
            .single();
        const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

        let finalMinute = minutoActual;
        const nuevoDetalle = {
            ...freshDetalle,
            estado_cronometro: 'detenido',
            minuto_actual: finalMinute,
            ultimo_update: new Date().toISOString()
        };

        const { error } = await supabase
            .from('partidos')
            .update({
                estado: 'finalizado',
                marcador_detalle: nuevoDetalle,
                last_edited_by: profile?.id
            })
            .eq('id', matchId);

        if (!error) {
            setMatch((prev: any) => ({ ...prev, estado: 'finalizado', marcador_detalle: nuevoDetalle }));
            setMinutoActual(finalMinute);
            invalidateCache('home-partidos');
            invalidateCache('admin-dashboard');
            invalidateCache('admin-partidos');
            registrarEventoSistema('fin', 'Partido finalizado oficialmente');
        } else {
            alert("Error al finalizar: " + error.message);
        }
    };

    const registrarEventoSistema = async (tipo: string, desc: string) => {
        const periodo = getCurrentPeriodNumber(match.disciplinas?.name || "", match.marcador_detalle || {});
        await supabase.from('olympics_eventos').insert({
            partido_id: matchId,
            tipo_evento: tipo,
            minuto: minutoActual,
            equipo: 'sistema',
            descripcion: stampEventAudit(desc, profile),
            periodo: periodo
        });
        fetchEventos();
    };

    const chessHasTerminalResult = () => {
        const det = match?.marcador_detalle || {};
        return !!det.resultado_final;
    };

    const handleNuevoEvento = async (eventOverride?: any) => {
        const stateToUse = eventOverride || nuevoEvento;
        const disciplinaName = match.disciplinas?.name || 'Deporte';

        if (match.estado !== 'en_vivo') {
            const isSetupAction = stateToUse.tipo === 'cambio';
            if (!(match.estado === 'programado' && isSetupAction)) {
                toast.error('Solo se pueden registrar eventos de juego en partidos EN VIVO.');
                return;
            }
        }

        if (disciplinaName === 'Ajedrez' && (stateToUse.tipo === 'victoria' || stateToUse.tipo === 'empate')) {
            if (chessHasTerminalResult()) {
                toast.error('Este partido ya tiene un resultado final registrado.');
                setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
                return;
            }
        }

        const isIndividualSport = ['Ajedrez', 'Tenis', 'Tenis de Mesa', 'Voleibol'].includes(disciplinaName);
        const isPlayerRequired = !isIndividualSport;
        const requiresTeam = !(disciplinaName === 'Ajedrez' && stateToUse.tipo === 'empate');

        if (!stateToUse.tipo) return;
        if (requiresTeam && !stateToUse.equipo) return;
        if (isPlayerRequired && !stateToUse.jugador_id) return;

        const equipo = stateToUse.equipo || 'sistema';
        const tipo = stateToUse.tipo;
        const jugador_id = stateToUse.jugador_id;
        const periodo = getCurrentPeriodNumber(disciplinaName, match.marcador_detalle || {});

        const { error } = await supabase.from('olympics_eventos').insert({
            partido_id: matchId,
            tipo_evento: tipo,
            minuto: minutoActual,
            equipo: equipo,
            jugador_id: jugador_id,
            periodo: periodo,
            descripcion: stampEventAudit(null, profile)
        });

        if (!error) {
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle')
                .eq('id', matchId)
                .single();
            const currentDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

            if (disciplinaName === 'Ajedrez' && (tipo === 'victoria' || tipo === 'empate')) {
                let resultadoFinal = '';
                let scoreA = 0;
                let scoreB = 0;

                if (tipo === 'empate') {
                    resultadoFinal = 'empate';
                    scoreA = 0.5;
                    scoreB = 0.5;
                } else {
                    resultadoFinal = equipo === 'equipo_a' ? 'victoria_a' : 'victoria_b';
                    scoreA = equipo === 'equipo_a' ? 1 : 0;
                    scoreB = equipo === 'equipo_b' ? 1 : 0;
                }

                const nuevoMarcador = {
                    ...currentDetalle,
                    resultado_final: resultadoFinal,
                    score_a: scoreA,
                    score_b: scoreB,
                };

                await supabase.from('partidos').update({
                    marcador_detalle: auditDetalle(nuevoMarcador),
                    estado: 'finalizado'
                }).eq('id', matchId);

                setCronometroActivo(false);
                setMatch((prev: any) => ({ ...prev, estado: 'finalizado', marcador_detalle: nuevoMarcador }));
                invalidateCache('home-partidos');
                invalidateCache('admin-dashboard');
                invalidateCache('admin-partidos');
                toast.success(tipo === 'empate' ? 'Empate registrado.' : 'Resultado registrado.');
            }
            else if (disciplinaName === 'Natación') {
                const puesto = tipo === 'victoria' ? 1 : tipo === 'segundo' ? 2 : tipo === 'tercero' ? 3 : 0;
                if (puesto > 0) {
                    const nuevosResultados = currentDetalle.resultados || [];
                    const isTeamA = equipo === 'equipo_a';
                    const playerList = isTeamA ? jugadoresA : jugadoresB;
                    const playerObj = playerList.find(p => p.id === jugador_id);
                    const playerName = playerObj?.nombre || null;

                    nuevosResultados.push({
                        puesto,
                        equipo: equipo,
                        jugador_id: jugador_id,
                        jugador_nombre: playerName,
                        timestamp: new Date().toISOString()
                    });

                    const nuevoMarcador = { ...currentDetalle, resultados: nuevosResultados };
                    await supabase.from('partidos').update({ 
                        marcador_detalle: auditDetalle(nuevoMarcador)
                    }).eq('id', matchId);
                    setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
                }
            }
            else if (tipo.startsWith('gol') || tipo.startsWith('punto') || tipo.startsWith('set')) {
                let puntos = 1;
                if (tipo === 'punto_2') puntos = 2;
                if (tipo === 'punto_3') puntos = 3;

                const nuevoMarcador = addPoints(disciplinaName, currentDetalle, equipo as 'equipo_a' | 'equipo_b', puntos);
                await supabase.from('partidos').update({ 
                    marcador_detalle: auditDetalle(nuevoMarcador)
                }).eq('id', matchId);
                setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
            } else {
                setMatch((prev: any) => ({ ...prev, marcador_detalle: currentDetalle }));
            }
            setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
            fetchEventos();
        }
    };

    const requestDeleteEvento = (evento: Evento) => {
        setConfirmingDeletion(evento);
    };

    const ejecutarEliminacion = async () => {
        if (!confirmingDeletion) return;
        const evento = confirmingDeletion;
        setConfirmingDeletion(null);
        setDeletingEventId(evento.id);
        const disciplinaName = match.disciplinas?.name || 'Deporte';

        const tipo = evento.tipo_evento;
        if (tipo.startsWith('gol') || tipo.startsWith('punto')) {
            let puntos = 1;
            if (tipo === 'punto_2') puntos = 2;
            if (tipo === 'punto_3') puntos = 3;

            const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
            const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

            const equipoKey = match.equipo_a === evento.equipo || evento.equipo === 'equipo_a' ? 'equipo_a' : 'equipo_b';
            const nuevoMarcador = removePoints(disciplinaName, freshDetalle, equipoKey as 'equipo_a', puntos);

            await supabase.from('partidos').update({ marcador_detalle: auditDetalle(nuevoMarcador) }).eq('id', matchId);
            setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
        }

        const { error } = await supabase.from('olympics_eventos').delete().eq('id', evento.id);
        if (!error) fetchEventos();
        setDeletingEventId(null);
    };

    const handleManualScoreUpdate = async (field: string, value: number) => {
        const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
        const nuevoMarcador = { ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}) };
        const oldVal = nuevoMarcador[field] || 0;
        nuevoMarcador[field] = value;
        const { error } = await supabase.from('partidos').update({ marcador_detalle: auditDetalle(nuevoMarcador) }).eq('id', matchId);
        if (!error) {
            setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
            registrarEventoSistema('ajuste', `Ajuste manual: ${field} de ${oldVal} a ${value}`);
        }
    };

    const handleSavePlayer = async () => {
        if (!newPlayerForm.nombre || !addingPlayerTeam) return;
        const { error } = await supabase.from('olympics_jugadores').insert({
            partido_id: matchId,
            nombre: newPlayerForm.nombre,
            numero: newPlayerForm.numero ? parseInt(newPlayerForm.numero) : null,
            equipo: addingPlayerTeam,
            profile_id: newPlayerForm.profile_id || null
        });

        if (!error) {
            fetchJugadores();
            setAddingPlayerTeam(null);
            setNewPlayerForm({ nombre: '', numero: '', profile_id: '' });
        } else {
            alert("Error: " + error.message);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (!match) return <div className="p-8 text-center">Partido no encontrado</div>;

    const disciplinaName = match.disciplinas?.name || 'Deporte';
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);
    const isIndividualSport = ['Ajedrez', 'Tenis', 'Tenis de Mesa', 'Voleibol'].includes(disciplinaName);
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

    return (
        <div className="min-h-screen bg-[#070504] pb-24 text-white selection:bg-primary/30">
            <div className="relative overflow-hidden">
                <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-1000", bgGradient, "opacity-40")} />
                
                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-16">
                    {/* Top Nav */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/partidos">
                                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all">
                                    <ArrowLeft size={14} /> Panel
                                </button>
                            </Link>
                            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black text-[10px] tracking-widest px-3 py-1">
                                {disciplinaName}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                            {match.estado === 'en_vivo' ? (
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black tracking-[0.2em] uppercase">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                    </span>
                                    On Air
                                </div>
                            ) : (
                                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-black tracking-[0.2em] uppercase">
                                    {match.estado}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Operational Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                        {(() => {
                            const auditInfo = formatUltimaEdicion(match.marcador_detalle);
                            if (!auditInfo) return <div />;
                            return (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                                        <Activity size={16} className="text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sync Status</span>
                                        <span className="text-[11px] font-bold text-white/70">
                                            Por <span className="text-primary">{auditInfo.nombre}</span> · {auditInfo.relativo}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {activeEditors.length > 0 && (
                            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                <div className="flex -space-x-2">
                                    {activeEditors.slice(0, 3).map((editor, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-emerald-500/30 flex items-center justify-center text-[10px] font-black text-emerald-400">
                                            {editor.user_name?.substring(0, 1).toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[11px] font-black text-emerald-400">{activeEditors.length} Editores</span>
                            </div>
                        )}
                    </div>

                    {/* SCOREBOARD */}
                    {match.marcador_detalle?.tipo === 'carrera' ? (
                        <Card variant="glass" className="w-full max-w-5xl mx-auto rounded-[3rem] bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 relative overflow-hidden">
                            <RaceControl matchId={matchId} detalle={match.marcador_detalle} onUpdate={fetchMatchDetails} isLocked={match.estado === 'finalizado'} profile={profile} />
                        </Card>
                    ) : (
                        <div className="max-w-6xl mx-auto">
                            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-12">
                                {/* Team A */}
                                <div className="flex flex-col items-center gap-6 group">
                                    <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-[2.5rem] bg-zinc-950/60 border-2 border-white/10 p-1">
                                        <Avatar name={getDisplayName(match, 'a')} size="lg" className="h-full w-full rounded-[2.25rem]" />
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-black text-white">{getDisplayName(match, 'a')}</h2>
                                </div>

                                {/* Center */}
                                <div className="flex flex-col items-center gap-8 min-w-[300px]">
                                    <div className="relative group/score">
                                        {match.estado === 'en_vivo' && (
                                            <button onClick={() => setIsEditingScore(true)} className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-primary text-white opacity-0 group-hover/score:opacity-100 transition-all z-20">
                                                <Edit2 size={16} strokeWidth={3} />
                                            </button>
                                        )}
                                        <div className="flex items-center justify-center gap-8 px-12 py-8 rounded-[3.5rem] bg-zinc-950/60 border border-white/10 shadow-2xl">
                                            <span className="text-5xl md:text-9xl font-black tabular-nums">{scoreA}</span>
                                            <span className="text-2xl md:text-6xl font-black text-white/10">:</span>
                                            <span className="text-5xl md:text-9xl font-black tabular-nums">{scoreB}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full flex flex-col items-center gap-6">
                                        <PublicLiveTimer detalle={match.marcador_detalle} deporte={match.disciplinas?.name} />
                                        <div className="flex items-center gap-4 bg-zinc-900/40 p-2 rounded-[1.75rem] border border-white/10">
                                            <button onClick={toggleCronometro} className={cn("flex-1 h-14 min-w-[120px] rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all", cronometroActivo ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500 text-white shadow-lg")}>
                                                {cronometroActivo ? <Pause size={18} /> : <Play size={18} />} {cronometroActivo ? 'Pause' : 'Start'}
                                            </button>
                                            {match.estado !== 'finalizado' && (
                                                <button onClick={handleFinalizarClick} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-rose-500 hover:border-rose-500/40">
                                                    <Square size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Team B */}
                                <div className="flex flex-col items-center gap-6 group">
                                    <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-[2.5rem] bg-zinc-950/60 border-2 border-white/10 p-1">
                                        <Avatar name={getDisplayName(match, 'b')} size="lg" className="h-full w-full rounded-[2.25rem]" />
                                    </div>
                                    <h2 className="text-xl md:text-3xl font-black text-white">{getDisplayName(match, 'b')}</h2>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ADVANCED STATS & OVERRIDE */}
                {(disciplinaName === 'Fútbol' || disciplinaName === 'Baloncesto') && (
                    <div className="max-w-7xl mx-auto px-6 mb-12">
                        <Card variant="glass" className="overflow-hidden border-white/5 bg-zinc-950/40 p-8 rounded-[2rem]">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6">Advanced Tactical Override</h3>
                            {!showAdvancedEdit ? (
                                <button onClick={openAdvancedEdit} className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-4">
                                    <Edit3 size={20} className="text-primary" />
                                    <span className="font-black text-xs uppercase tracking-widest">Open Manual Controls</span>
                                </button>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
                                    {/* Advanced edit inputs go here */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {/* Simple numeric inputs for periods */}
                                    </div>
                                    <div className="flex justify-end gap-4">
                                        <Button variant="ghost" onClick={() => setShowAdvancedEdit(false)}>Cancel</Button>
                                        <Button onClick={saveAdvancedEdit} className="bg-primary text-black font-bold">Save All Changes</Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.5fr_1fr] gap-8">
                    {/* LEFT: EVENT CONTROLLER */}
                    <div className="space-y-6">
                        <Card variant="glass" className="p-0 border-white/10 bg-zinc-900/50 overflow-hidden relative">
                            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <Activity size={20} className="text-primary" /> Registrar Evento
                                </h3>
                                {nuevoEvento.tipo && (
                                    <Badge className="bg-primary/20 text-primary uppercase text-[10px] tracking-widest">Paso Activo</Badge>
                                )}
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Step 1: Action */}
                                <div>
                                    <p className="text-[10px] font-black uppercase text-white/30 mb-3 tracking-widest">1. Selecciona Acción</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {actions.map(action => (
                                            <button
                                                key={action.value}
                                                onClick={() => setNuevoEvento({ ...nuevoEvento, tipo: action.value })}
                                                className={cn(
                                                    "h-24 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2",
                                                    nuevoEvento.tipo === action.value ? "bg-primary text-black border-primary scale-[1.02] shadow-lg" : "bg-white/5 border-white/5 hover:bg-white/10"
                                                )}
                                            >
                                                <span className="text-2xl">{action.icon}</span>
                                                <span className="text-[10px] font-bold uppercase">{action.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2 & 3: Team and Player */}
                                <div className={cn("space-y-8 transition-all duration-500", nuevoEvento.tipo ? "opacity-100" : "opacity-30 pointer-events-none filter blur-[2px]")}>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-white/30 mb-3 tracking-widest">2. Selecciona Competidor</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['equipo_a', 'equipo_b'].map(tid => (
                                                <button
                                                    key={tid}
                                                    onClick={() => setNuevoEvento({ ...nuevoEvento, equipo: tid, jugador_id: null })}
                                                    className={cn(
                                                        "h-16 rounded-2xl border-2 transition-all flex items-center px-4 gap-4",
                                                        nuevoEvento.equipo === tid ? "border-primary bg-primary/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    <Avatar name={getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')} size="sm" className={cn(nuevoEvento.equipo === tid ? "ring-2 ring-primary" : "")} />
                                                    <span className="font-bold text-xs truncate">{getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {!['Ajedrez', 'Tenis', 'Tenis de Mesa'].includes(disciplinaName) && (
                                        <div className={cn("transition-all duration-500", nuevoEvento.equipo ? "opacity-100" : "opacity-30 pointer-events-none")}>
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">3. Selecciona Jugador</p>
                                                <button onClick={() => setAddingPlayerTeam(nuevoEvento.equipo)} className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">+ Nuevo</button>
                                            </div>

                                            {addingPlayerTeam ? (
                                                <Card className="p-4 bg-zinc-900 border-primary/30">
                                                    <div className="space-y-3">
                                                        <input placeholder="Nombre" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs" value={newPlayerForm.nombre} onChange={e => setNewPlayerForm({ ...newPlayerForm, nombre: e.target.value })} />
                                                        <div className="flex gap-2">
                                                            <input placeholder="#" className="w-16 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs" value={newPlayerForm.numero} onChange={e => setNewPlayerForm({ ...newPlayerForm, numero: e.target.value })} />
                                                            <Button size="sm" onClick={handleSavePlayer} className="flex-1 bg-primary text-black">Añadir</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setAddingPlayerTeam(null)}>×</Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {(nuevoEvento.equipo === 'equipo_a' ? jugadoresA : jugadoresB).map(j => (
                                                        <button
                                                            key={j.id}
                                                            onClick={() => setNuevoEvento({ ...nuevoEvento, jugador_id: j.id })}
                                                            className={cn(
                                                                "p-3 rounded-xl border text-left flex items-center gap-3 transition-all",
                                                                nuevoEvento.jugador_id === j.id ? "bg-white text-black border-white" : "bg-white/5 border-white/5 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className={cn("w-6 h-6 rounded flex items-center justify-center font-black text-[10px] border", nuevoEvento.jugador_id === j.id ? "bg-black text-white" : "bg-white/10 border-white/10")}>{j.numero || '?'}</div>
                                                            <span className="truncate text-[10px] font-bold">{j.nombre}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-white/5">
                                        <Button
                                            size="lg"
                                            className={cn("w-full h-14 rounded-2xl font-black uppercase tracking-widest transition-all", (nuevoEvento.jugador_id || isIndividualSport) && nuevoEvento.tipo ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-white/5 text-white/20 border border-white/5")}
                                            onClick={() => handleNuevoEvento()}
                                            disabled={!( (nuevoEvento.jugador_id || isIndividualSport) && nuevoEvento.tipo )}
                                        >
                                            <Check className="mr-2" size={20} strokeWidth={3} /> Confirmar Evento
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: TIMELINE */}
                    <Card variant="glass" className="h-[600px] flex flex-col p-0 border-white/5 overflow-hidden">
                        <div className="p-4 bg-white/5 border-b border-white/5 font-black text-[10px] tracking-widest uppercase flex items-center justify-between">
                            <span>Historial Live</span>
                            <Badge variant="secondary" className="bg-primary/20 text-primary border-0">{eventos.length}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {eventos.map(e => (
                                <div key={e.id} className="flex gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 group border-l-4 border-l-primary/40">
                                    <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center font-black text-[10px] text-primary shrink-0">{e.minuto}'</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-xs truncate capitalize">{e.tipo_evento.replace('_', ' ')}</p>
                                        <p className="text-[10px] text-white/40 truncate">{e.jugadores?.nombre || (e.equipo === 'equipo_a' ? getDisplayName(match, 'a') : getDisplayName(match, 'b'))}</p>
                                    </div>
                                    <button onClick={() => requestDeleteEvento(e)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* MODALS */}
                {isEndingMatch && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <Card className="relative bg-zinc-900 border-white/10 p-8 max-w-sm w-full text-center rounded-[2rem] animate-in zoom-in-95">
                            <Trophy size={48} className="mx-auto mb-4 text-amber-500" />
                            <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">¿Finalizar Partido?</h3>
                            <p className="text-sm text-white/40 mb-8">El resultado actual será permanente.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="ghost" onClick={() => setIsEndingMatch(false)}>No</Button>
                                <Button className="bg-rose-500 hover:bg-rose-600 text-white font-bold" onClick={confirmarFinalizar}>Sí, Finalizar</Button>
                            </div>
                        </Card>
                    </div>
                )}

                {isEditingScore && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <Card className="bg-zinc-900 border-white/10 p-8 max-w-sm w-full rounded-[2rem]">
                            <h3 className="text-sm font-black uppercase tracking-widest text-center mb-8">Ajuste Manual</h3>
                            <div className="flex justify-between items-center gap-8 mb-8">
                                {(['a', 'b'] as const).map(tid => (
                                    <div key={tid} className="flex flex-col items-center gap-3">
                                        <span className="text-[10px] font-black uppercase text-white/30 truncate max-w-[80px]">{getDisplayName(match, tid)}</span>
                                        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                            <button onClick={() => handleManualScoreUpdate(disciplinaName === 'Fútbol' ? 'goles_'+tid : 'total_'+tid, Math.max(0, (match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_'+tid : 'total_'+tid] || 0) - 1))} className="w-8 h-8 hover:bg-white/10 rounded-lg">-</button>
                                            <span className="text-xl font-black tabular-nums">{match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_'+tid : 'total_'+tid] || 0}</span>
                                            <button onClick={() => handleManualScoreUpdate(disciplinaName === 'Fútbol' ? 'goles_'+tid : 'total_'+tid, (match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_'+tid : 'total_'+tid] || 0) + 1)} className="w-8 h-8 hover:bg-white/10 rounded-lg">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button className="w-full bg-white/5" onClick={() => setIsEditingScore(false)}>Cerrar</Button>
                        </Card>
                    </div>
                )}

                {confirmingDeletion && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <Card className="bg-zinc-900 border-rose-500/30 p-8 max-w-sm w-full text-center rounded-[2rem]">
                            <AlertCircle size={40} className="mx-auto mb-4 text-rose-500" />
                            <h3 className="text-lg font-black uppercase mb-6">Eliminar Acción</h3>
                            <p className="text-xs text-white/40 mb-8 px-4 font-bold">Si esta acción otorgó puntos, se restarán automáticamente del marcador.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="ghost" onClick={() => setConfirmingDeletion(null)}>No</Button>
                                <Button className="bg-rose-500 text-white font-bold" onClick={ejecutarEliminacion}>Sí, Eliminar</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
