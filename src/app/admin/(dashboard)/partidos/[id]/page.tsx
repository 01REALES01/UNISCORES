"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Badge, Avatar, Card } from "@/components/ui-primitives";
import { ArrowLeft, Clock, Play, Pause, Square, AlertCircle, Plus, Save, Users, Trophy, ChevronRight, Activity, Check, Trash2, Edit2, Edit3, Terminal, RotateCcw, X, Crown, Handshake } from "lucide-react";
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
            await fetchDeportistas();
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

    const fetchDeportistas = async () => {
        setLoadingDeportistas(true);
        // Obtenemos todos los perfiles para filtrar localmente (evita problemas con enums/arrays en query)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, roles, email, athlete_disciplina_id');
        
        if (error) {
            console.error("Error fetching profiles:", error);
            return;
        }

        if (data) {
            // Filtramos los deportistas (usando el array de roles)
            const filtered = data.filter(p => 
                p.roles && Array.isArray(p.roles) && p.roles.includes('deportista')
            );
            
            // Priorizamos los que pertenecen a la disciplina del partido
            const currentDiscId = match?.disciplina_id;

            // Ordenamos alfabéticamente por nombre o email si no hay nombre
            filtered.sort((a, b) => {
                // 1. Prioridad por disciplina
                if (currentDiscId) {
                    const matchesA = a.athlete_disciplina_id === currentDiscId;
                    const matchesB = b.athlete_disciplina_id === currentDiscId;
                    if (matchesA && !matchesB) return -1;
                    if (!matchesA && matchesB) return 1;
                }

                // 2. Orden alfabético
                const nameA = a.full_name || a.email || '';
                const nameB = b.full_name || b.email || '';
                return nameA.localeCompare(nameB);
            });
            setDeportistas(filtered);
        }
        setLoadingDeportistas(false);
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
                // Invalidar cachés para que home y dashboard reflejen que hay un partido en vivo
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
            // Revert local state if DB failed
            setCronometroActivo(cronometroActivo);
        }
    };

    const handleFinalizarClick = () => {
        setIsEndingMatch(true);
    };

    const handleCambiarPeriodo = async () => {
        try {
            const disciplinaName = match.disciplinas?.name || 'Deporte';

            // Pausar cronómetro localmente para el nuevo período
            setCronometroActivo(false);

            // Fetch latest from DB to avoid overwriting score
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
                // Iniciar 2º tiempo en 45'
                if (nuevoMarcador.tiempo_actual === 2) nuevoMinuto = 45;
            } else if (disciplinaName === 'Baloncesto') {
                const cuartoActual = nuevoMarcador.cuarto_actual || 1;
                if (cuartoActual < 4) {
                    nuevoMarcador = cambiarCuartoBasket(nuevoMarcador);
                    mensaje = `Cambio al ${nuevoMarcador.cuarto_actual}º cuarto`;
                    nuevoMinuto = getPeriodDuration('Baloncesto'); // NBA: 12 min
                }
            }

            if (mensaje) {
                nuevoMarcador.minuto_actual = nuevoMinuto;
                nuevoMarcador.estado_cronometro = 'pausado'; // Forzar pausa en DB
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

        // Fetch latest from DB to preserve score
        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', matchId)
            .single();
        const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

        // Calcular minuto final si estaba corriendo
        let finalMinute = minutoActual;
        if (cronometroActivo) {
            const lastUpdate = freshDetalle.ultimo_update ? new Date(freshDetalle.ultimo_update).getTime() : new Date().getTime();
            const now = new Date().getTime();
            const diffMinutes = Math.floor((now - lastUpdate) / 60000);
            finalMinute += diffMinutes;
        }

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
            // Invalidar cachés para que home y dashboard reflejen el partido finalizado
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


    // Helper: ¿Ya existe resultado terminal en ajedrez?
    const chessHasTerminalResult = () => {
        const det = match?.marcador_detalle || {};
        return !!det.resultado_final; // 'victoria_a', 'victoria_b', o 'empate'
    };

    const handleNuevoEvento = async (eventOverride?: any) => {
        const stateToUse = eventOverride || nuevoEvento;
        const disciplinaName = match.disciplinas?.name || 'Deporte';

        // Bloquear si el partido no está en vivo (excepto para añadir jugadores/cambios en programado)
        if (match.estado !== 'en_vivo') {
            const isSetupAction = stateToUse.tipo === 'cambio';
            if (!(match.estado === 'programado' && isSetupAction)) {
                toast.error('Solo se pueden registrar eventos de juego en partidos EN VIVO.');
                return;
            }
        }

        // Bloquear eventos terminales duplicados en ajedrez
        if (disciplinaName === 'Ajedrez' && (stateToUse.tipo === 'victoria' || stateToUse.tipo === 'empate')) {
            if (chessHasTerminalResult()) {
                toast.error('Este partido ya tiene un resultado final registrado.');
                setNuevoEvento({ tipo: '', equipo: '', jugador_id: null });
                return;
            }
        }

        // Deportes individuales (ajedrez, tenis, etc.) no requieren selección de jugador
        const isIndividualSport = ['Ajedrez', 'Tenis', 'Tenis de Mesa', 'Voleibol'].includes(disciplinaName);
        const isPlayerRequired = !isIndividualSport;

        // Para empate de ajedrez no se requiere equipo
        const requiresTeam = !(disciplinaName === 'Ajedrez' && stateToUse.tipo === 'empate');

        if (!stateToUse.tipo) return;
        if (requiresTeam && !stateToUse.equipo) return;
        if (isPlayerRequired && !stateToUse.jugador_id) return;

        // Use stateToUse instead of nuevoEvento for values below
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
            // IMPORTANT: Always fetch the latest marcador_detalle from the DB
            // to avoid stale state when the timer is running
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle')
                .eq('id', matchId)
                .single();
            const currentDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

            // --- Lógica especial para AJEDREZ: resultado terminal ---
            if (disciplinaName === 'Ajedrez' && (tipo === 'victoria' || tipo === 'empate')) {
                let resultadoFinal = '';
                let scoreA = 0;
                let scoreB = 0;

                if (tipo === 'empate') {
                    resultadoFinal = 'empate';
                    scoreA = 0.5;
                    scoreB = 0.5;
                } else {
                    // victoria
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

                // Guardar marcador y finalizar partido
                await supabase.from('partidos').update({
                    marcador_detalle: auditDetalle(nuevoMarcador),
                    estado: 'finalizado'
                }).eq('id', matchId);

                setCronometroActivo(false);
                setMatch((prev: any) => ({ ...prev, estado: 'finalizado', marcador_detalle: nuevoMarcador }));
                invalidateCache('home-partidos');
                invalidateCache('admin-dashboard');
                invalidateCache('admin-partidos');
                toast.success(
                    tipo === 'empate'
                        ? 'Empate registrado. Partido finalizado.'
                        : `Victoria registrada para ${getDisplayName(match, equipo === 'equipo_a' ? 'a' : 'b')}. Partido finalizado.`
                );
            }
            // --- Natación ---
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
                        marcador_detalle: auditDetalle(nuevoMarcador),
                        last_edited_by: profile?.id
                    }).eq('id', matchId);
                    setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
                }
            }
            else if (tipo.startsWith('gol') || tipo.startsWith('punto') || tipo.startsWith('set')) {
                let puntos = 1;
                if (tipo === 'punto_2') puntos = 2;
                if (tipo === 'punto_3') puntos = 3;

                const nuevoMarcador = addPoints(
                    disciplinaName,
                    currentDetalle,
                    equipo as 'equipo_a' | 'equipo_b',
                    puntos
                );

                await supabase.from('partidos').update({ 
                    marcador_detalle: auditDetalle(nuevoMarcador),
                    last_edited_by: profile?.id
                }).eq('id', matchId);
                setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
            } else {
                // For non-scoring events (tarjetas, cambios, faltas), just sync local state
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

        // 1. Revertir Puntos si aplica
        const tipo = evento.tipo_evento;
        if (tipo.startsWith('gol') || tipo.startsWith('punto')) {
            let puntos = 1;
            if (tipo === 'punto_2') puntos = 2;
            if (tipo === 'punto_3') puntos = 3;

            // Fetch latest from DB to avoid stale state
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle')
                .eq('id', matchId)
                .single();
            const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

            const equipoKey = match.equipo_a === evento.equipo || evento.equipo === 'equipo_a' ? 'equipo_a' : 'equipo_b';
            const nuevoMarcador = removePoints(
                disciplinaName,
                freshDetalle,
                equipoKey as 'equipo_a', // Type assertion safe here
                puntos
            );

            await supabase.from('partidos').update({ 
                marcador_detalle: auditDetalle(nuevoMarcador),
                last_edited_by: profile?.id
            }).eq('id', matchId);
            setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
        }

        // 2. Eliminar de DB
        const { error } = await supabase.from('olympics_eventos').delete().eq('id', evento.id);

        if (!error) {
            fetchEventos();
        } else {
            alert("Error al eliminar evento: " + error.message);
        }
        setDeletingEventId(null);
    };

    const handleManualScoreUpdate = async (field: string, value: number) => {
        // Fetch latest from DB to avoid overwriting other fields
        const { data: freshMatch } = await supabase
            .from('partidos')
            .select('marcador_detalle')
            .eq('id', matchId)
            .single();
        const nuevoMarcador = { ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}) };

        const oldVal = nuevoMarcador[field] || 0;
        nuevoMarcador[field] = value;

        const { error } = await supabase.from('partidos').update({ marcador_detalle: auditDetalle(nuevoMarcador) }).eq('id', matchId);
        if (!error) {
            setMatch((prev: any) => ({ ...prev, marcador_detalle: nuevoMarcador }));
            registrarEventoSistema('ajuste', `Ajuste manual marquador: ${field.replace('_', ' ')} de ${oldVal} a ${value}`);
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

    // Dynamic styles
    const disciplinaName = match.disciplinas?.name || 'Deporte';
    const bgGradient = DISCIPLINES_COLORS[disciplinaName] || 'from-slate-700 to-slate-900';
    const actions = GET_SPORT_ACTIONS(disciplinaName);

    // Obtener marcador según deporte
    const { scoreA, scoreB, subScoreA, subScoreB, extra, subLabel } = getCurrentScore(disciplinaName, match.marcador_detalle || {});

    return (
        <div className="min-h-screen bg-[#070504] pb-24 text-white selection:bg-primary/30">
            <div className="relative overflow-hidden">
                {/* Background Dynamic Layer */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-1000",
                    bgGradient,
                    "opacity-40"
                )} />
                
                <motion.div 
                    animate={{ 
                        backgroundPosition: ["0% 0%", "100% 100%"],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200%_200%] mix-blend-overlay pointer-events-none"
                />

                {/* Cyber Orbs */}
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-orange-600/20 rounded-full blur-[120px]" />

                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-16">
                    {/* Top Navigation & Status */}
                    <motion.div 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
                    >
                        <div className="flex items-center gap-4">
                            <Link href="/admin/partidos">
                                <motion.button
                                    whileHover={{ x: -4 }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <ArrowLeft size={14} /> Panel de Control
                                </motion.button>
                            </Link>
                            <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Broadcasting:</span>
                                <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-black text-[10px] tracking-widest px-3 py-1">
                                    {disciplinaName}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <AnimatePresence mode="wait">
                                {match.estado === 'en_vivo' ? (
                                    <motion.div
                                        key="live-pill"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                                        </span>
                                        On Air
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="status-pill"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-black tracking-[0.2em] uppercase"
                                    >
                                        {match.estado}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Badge className={cn(
                                "border-none font-black text-[10px] tracking-widest px-3 py-1",
                                (match.genero || 'masculino') === 'femenino' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                                (match.genero || 'masculino') === 'mixto' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            )}>
                                {(match.genero || 'masculino') === 'femenino' ? '♀ FEM' : (match.genero || 'masculino') === 'mixto' ? '⚤ MIX' : '♂ MAS'}
                            </Badge>
                        </div>
                    </motion.div>

                    {/* Operational Sync & Presence */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                        {/* Audit Info */}
                        {(() => {
                            const auditInfo = formatUltimaEdicion(match.marcador_detalle);
                            if (!auditInfo) return <div />;
                            return (
                                <motion.div 
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                                        <Activity size={16} className="text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sync Status</span>
                                        <span className="text-[11px] font-bold text-white/70">
                                            Editado por <span className="text-primary">{auditInfo.nombre}</span> · {auditInfo.relativo}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })()}

                        {/* Presence Area */}
                        {activeEditors.length > 0 && (
                            <motion.div 
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]"
                            >
                                <div className="flex -space-x-2">
                                    {activeEditors.slice(0, 3).map((editor, i) => (
                                        <motion.div 
                                            key={i} 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-emerald-500/30 flex items-center justify-center text-[10px] font-black text-emerald-400 shadow-inner"
                                        >
                                            {editor.user_name?.substring(0, 1).toUpperCase()}
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Live Editors</span>
                                    <span className="text-[11px] font-black text-emerald-400">
                                        {activeEditors.length} Colaboradores
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* ─── THE SCOREBOARD DISPLAY ─── */}
                    {match.marcador_detalle?.tipo === 'carrera' ? (
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="w-full max-w-5xl mx-auto rounded-[3rem] bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 relative shadow-2xl overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                            <RaceControl
                                matchId={matchId}
                                detalle={match.marcador_detalle}
                                onUpdate={fetchMatchDetails}
                                isLocked={match.estado === 'finalizado'}
                                profile={profile}
                            />
                        </motion.div>
                    ) : (
                        <div className="max-w-6xl mx-auto">
                            <motion.div 
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-12"
                            >
                                {/* TEAM ALPHA */}
                                <div className="flex flex-col items-center gap-6 group">
                                    <div className="relative">
                                        <motion.div 
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 4, repeat: Infinity }}
                                            className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-60" 
                                        />
                                        <div className="relative z-10 w-20 h-20 md:w-36 md:h-36 rounded-[1.5rem] md:rounded-[2.5rem] bg-zinc-950/60 backdrop-blur-md border-2 border-white/10 p-1 group-hover:border-primary/50 transition-colors duration-500 shadow-2xl">
                                            <div className="w-full h-full rounded-[1.25rem] md:rounded-[2.25rem] overflow-hidden border border-white/5">
                                                <Avatar name={getDisplayName(match, 'a')} size="lg" className="h-full w-full object-cover" />
                                            </div>
                                            {disciplinaName === 'Ajedrez' && match.marcador_detalle?.resultado_final === 'victoria_a' && (
                                                <div className="absolute -top-4 -right-4 bg-primary p-2.5 rounded-2xl shadow-[0_10px_20px_rgba(239,68,68,0.4)] rotate-12 z-20">
                                                    <Trophy size={20} className="text-white fill-current" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white drop-shadow-md group-hover:text-primary transition-colors">
                                            {getDisplayName(match, 'a')}
                                        </h2>
                                        {getCarreraSubtitle(match, 'a') && (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{getCarreraSubtitle(match, 'a')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CENTER BROADCAST MODULE */}
                                <div className="flex flex-col items-center gap-3 md:gap-8 min-w-[280px] md:min-w-[300px]">
                                    {/* CHESS SPECIAL MODULE */}
                                    {disciplinaName === 'Ajedrez' ? (
                                        <div className="relative flex flex-col items-center gap-4">
                                            <div className="px-10 py-6 rounded-[2rem] bg-zinc-950/60 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-8">
                                                <AnimatePresence mode="wait">
                                                    {match.marcador_detalle?.resultado_final === 'empate' ? (
                                                        <motion.span 
                                                            key="empate"
                                                            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                            className="text-3xl md:text-5xl font-black tracking-[0.3em] uppercase text-zinc-400 italic"
                                                        >
                                                            Draw
                                                        </motion.span>
                                                    ) : (
                                                        <motion.span 
                                                            key="vs"
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                            className="text-4xl md:text-6xl font-black text-white/5 italic select-none"
                                                        >
                                                            VS
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6">
                                            {/* MAIN SCORE UNIT */}
                                            <div className="relative group/score">
                                                {match.estado === 'en_vivo' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setIsEditingScore(true)}
                                                        className="absolute -top-12 left-1/2 -translate-x-1/2 p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 opacity-0 group-hover/score:opacity-100 transition-all z-20"
                                                    >
                                                        <Edit2 size={16} strokeWidth={3} />
                                                    </motion.button>
                                                )}
                                                
                                                <div className="relative flex items-center justify-center gap-4 md:gap-8 px-8 md:px-12 py-4 md:py-8 rounded-[2.5rem] md:rounded-[3.5rem] bg-zinc-950/60 backdrop-blur-3xl border border-white/10 shadow-2xl">
                                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[inherit] pointer-events-none" />
                                                        <motion.span 
                                                        key={`scoreA-${scoreA}`}
                                                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                                        className="text-5xl md:text-9xl font-black tabular-nums tracking-tighter"
                                                    >
                                                        {scoreA}
                                                    </motion.span>
                                                    <span className="text-2xl md:text-6xl font-black text-white/10">:</span>
                                                    <motion.span 
                                                        key={`scoreB-${scoreB}`}
                                                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                                        className="text-5xl md:text-9xl font-black tabular-nums tracking-tighter"
                                                    >
                                                        {scoreB}
                                                    </motion.span>
                                                </div>
                                            </div>

                                            {/* SUB-RESULTS UNIT */}
                                            {subScoreA !== undefined && subScoreB !== undefined && (
                                                <motion.div 
                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="flex items-center gap-4 px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner"
                                                >
                                                    <span className="text-xl md:text-2xl font-black tabular-nums text-white/80">{subScoreA}</span>
                                                    <div className="h-4 w-[1px] bg-white/10" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{subLabel || 'Points'}</span>
                                                    <div className="h-4 w-[1px] bg-white/10" />
                                                    <span className="text-xl md:text-2xl font-black tabular-nums text-white/80">{subScoreB}</span>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}

                                    {/* CHRONO & PERIOD MODULE */}
                                    <div className="w-full space-y-4 md:space-y-6">
                                        <div className="flex flex-col items-center gap-4">
                                            {/* Period Selector Dynamic */}
                                            <div className="relative w-full max-w-[200px]">
                                                {disciplinaName === 'Baloncesto' ? (
                                                    <div className="group relative">
                                                        <select
                                                            className="w-full bg-zinc-900/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest text-center appearance-none cursor-pointer hover:bg-zinc-800 transition-all focus:ring-2 focus:ring-primary/40 outline-none"
                                                            value={match.marcador_detalle?.cuarto_actual || 1}
                                                            disabled={match.estado !== 'en_vivo'}
                                                            onChange={async (e) => {
                                                                const newQ = parseInt(e.target.value);
                                                                const newDetalle = { ...match.marcador_detalle, cuarto_actual: newQ };
                                                                await supabase.from('partidos').update({ marcador_detalle: auditDetalle(newDetalle) }).eq('id', matchId);
                                                                setMatch({ ...match, marcador_detalle: newDetalle });
                                                                registrarEventoSistema('periodo', `Corrección Manual: ${newQ}º Cuarto`);
                                                            }}
                                                        >
                                                            {[1, 2, 3, 4].map(q => <option key={q} value={q} className="bg-zinc-950">{q}º Cuarto</option>)}
                                                            <option value={5} className="bg-zinc-950">Prórroga 1</option>
                                                            <option value={6} className="bg-zinc-950">Prórroga 2</option>
                                                        </select>
                                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-white/20 pointer-events-none" size={14} />
                                                    </div>
                                                ) : ['Tenis', 'Tenis de Mesa', 'Voleibol'].includes(disciplinaName) ? (
                                                    <div className="group relative">
                                                        <select
                                                            className="w-full bg-zinc-900/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-xs font-black uppercase tracking-widest text-center appearance-none cursor-pointer hover:bg-zinc-800 transition-all focus:ring-2 focus:ring-primary/40 outline-none"
                                                            value={extra || 'Set 1'}
                                                            disabled={match.estado !== 'en_vivo'}
                                                            onChange={async (e) => {
                                                                const setNum = parseInt(e.target.value.replace(/\D/g, ''));
                                                                const newDetalle = { ...match.marcador_detalle, set_actual: setNum };
                                                                await supabase.from('partidos').update({ marcador_detalle: auditDetalle(newDetalle) }).eq('id', matchId);
                                                                setMatch({ ...match, marcador_detalle: newDetalle });
                                                            }}
                                                        >
                                                            {[1, 2, 3, 4, 5].map(s => <option key={s} value={`Set ${s}`} className="bg-zinc-950">Set {s}</option>)}
                                                        </select>
                                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-white/20 pointer-events-none" size={14} />
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-zinc-900/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-center text-white/60">
                                                        {extra || (match.marcador_detalle?.tiempo_actual ? `${match.marcador_detalle.tiempo_actual}º Tiempo` : 'Match Active')}
                                                    </div>
                                                )}
                                            </div>

                                            {/* THE LIVE TIMER */}
                                            <div className="relative group/timer py-4">
                                                <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full group-hover/timer:bg-primary/10 transition-all" />
                                                <PublicLiveTimer detalle={match.marcador_detalle} deporte={match.disciplinas?.name} />
                                            </div>

                                            {/* MASTER CONTROLS PANEL */}
                                            <div className="flex items-center gap-4 bg-zinc-900/40 backdrop-blur-md p-2 rounded-[1.75rem] border border-white/10 shadow-2xl">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={toggleCronometro}
                                                    className={cn(
                                                        "flex-1 h-12 md:h-14 min-w-[100px] md:min-w-[120px] rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-500",
                                                        cronometroActivo 
                                                            ? "bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20" 
                                                            : "bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:bg-emerald-600 border-0"
                                                    )}
                                                >
                                                    {cronometroActivo ? (
                                                        <> <Pause size={18} fill="currentColor" /> Pause </>
                                                    ) : (
                                                        <> <Play size={18} fill="currentColor" /> Start </>
                                                    )}
                                                </motion.button>

                                                <div className="flex gap-2">
                                                    {match.estado !== 'finalizado' && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(244,63,94,0.1)' }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={handleFinalizarClick}
                                                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-rose-500 hover:border-rose-500/40 transition-all"
                                                        >
                                                            <Square size={18} fill="currentColor" />
                                                        </motion.button>
                                                    )}
                                                    
                                                    {match.estado === 'en_vivo' && (disciplinaName === 'Fútbol' || disciplinaName === 'Baloncesto') && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            disabled={
                                                                (disciplinaName === 'Fútbol' && (match.marcador_detalle?.tiempo_actual || 1) >= 2) ||
                                                                (disciplinaName === 'Baloncesto' && (match.marcador_detalle?.cuarto_actual || 1) >= 4)
                                                            }
                                                            onClick={handleCambiarPeriodo}
                                                            className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/40 disabled:opacity-20 transition-all"
                                                        >
                                                            <RotateCcw size={18} />
                                                        </motion.button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* TEAM OMEGA */}
                                <div className="flex flex-col items-center gap-6 group">
                                    <div className="relative">
                                        <motion.div 
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                                            className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-60" 
                                        />
                                        <div className="relative z-10 w-20 h-20 md:w-36 md:h-36 rounded-[1.5rem] md:rounded-[2.5rem] bg-zinc-950/60 backdrop-blur-md border-2 border-white/10 p-1 group-hover:border-primary/50 transition-colors duration-500 shadow-2xl">
                                            <div className="w-full h-full rounded-[1.25rem] md:rounded-[2.25rem] overflow-hidden border border-white/5">
                                                <Avatar name={getDisplayName(match, 'b')} size="lg" className="h-full w-full object-cover" />
                                            </div>
                                            {disciplinaName === 'Ajedrez' && match.marcador_detalle?.resultado_final === 'victoria_b' && (
                                                <div className="absolute -top-4 -left-4 bg-primary p-2.5 rounded-2xl shadow-[0_10px_20px_rgba(239,68,68,0.4)] -rotate-12 z-20">
                                                    <Trophy size={20} className="text-white fill-current" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-lg md:text-3xl font-black tracking-tighter text-white drop-shadow-md group-hover:text-primary transition-colors">
                                            {getDisplayName(match, 'b')}
                                        </h2>
                                        {getCarreraSubtitle(match, 'b') && (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{getCarreraSubtitle(match, 'b')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
                {/* ─── PREMIUM SCORE BREAKDOWN & ADVANCED EDIT ─── */}
                {(disciplinaName === 'Fútbol' || disciplinaName === 'Baloncesto' || disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        className="mb-12"
                    >
                        <Card variant="glass" className="overflow-hidden border-white/5 bg-zinc-950/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl">
                            {/* Header Section */}
                            <div className="bg-white/5 px-8 py-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3" id="score-breakdown-title">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                                    {disciplinaName === 'Fútbol' && 'Marcador Parcial por Tiempos'}
                                    {disciplinaName === 'Baloncesto' && 'Análisis por Cuartos'}
                                    {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && 'Distribución de Sets'}
                                </h3>
                                <div className="px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                                    Official Stats
                                </div>
                            </div>

                            {/* Table Section */}
                            <div className="p-8 overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left pb-4 font-black text-[10px] uppercase tracking-widest text-white/20 px-4">Competidor</th>
                                            {disciplinaName === 'Fútbol' && (
                                                <>
                                                    <th className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-white/20 px-4">1º T</th>
                                                    <th className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-white/20 px-4">2º T</th>
                                                    <th className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-primary px-4 bg-primary/5 rounded-t-xl">Total</th>
                                                </>
                                            )}
                                            {disciplinaName === 'Baloncesto' && (
                                                <>
                                                    {[1, 2, 3, 4].map(q => (
                                                        <th key={q} className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-white/20 px-4">Q{q}</th>
                                                    ))}
                                                    <th className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-primary px-4 bg-primary/5 rounded-t-xl">Total</th>
                                                </>
                                            )}
                                            {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                                                <>
                                                    {[1, 2, 3, 4, 5].filter(s => disciplinaName === 'Voleibol' || s <= 3).map(s => (
                                                        <th key={s} className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-white/20 px-4">Set {s}</th>
                                                    ))}
                                                    <th className="text-center pb-4 font-black text-[10px] uppercase tracking-widest text-primary px-4 bg-primary/5 rounded-t-xl">Match Sets</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {/* Row Team A */}
                                        <tr className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                                    <span className="font-black tracking-tight text-white group-hover:text-primary transition-colors">{getDisplayName(match, 'a')}</span>
                                                </div>
                                            </td>
                                            {disciplinaName === 'Fútbol' && (
                                                <>
                                                    <td className="text-center py-6 px-4 font-bold tabular-nums text-white/60">{match.marcador_detalle?.tiempos?.[1]?.goles_a || 0}</td>
                                                    <td className="text-center py-6 px-4 font-bold tabular-nums text-white/60">{match.marcador_detalle?.tiempos?.[2]?.goles_a || 0}</td>
                                                    <td className="text-center py-6 px-4 font-black tabular-nums text-2xl text-primary bg-primary/5">{match.marcador_detalle?.goles_a || 0}</td>
                                                </>
                                            )}
                                            {disciplinaName === 'Baloncesto' && (
                                                <>
                                                    {[1, 2, 3, 4].map(q => (
                                                        <td key={q} className="text-center py-6 px-4 font-bold tabular-nums text-white/60">{match.marcador_detalle?.cuartos?.[q]?.puntos_a || 0}</td>
                                                    ))}
                                                    <td className="text-center py-6 px-4 font-black tabular-nums text-2xl text-primary bg-primary/5">{match.marcador_detalle?.total_a || 0}</td>
                                                </>
                                            )}
                                            {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                                                <>
                                                    {[1, 2, 3, 4, 5].filter(s => disciplinaName === 'Voleibol' || s <= 3).map(s => (
                                                        <td key={s} className="text-center py-6 px-4 font-bold tabular-nums text-white/60">
                                                            {disciplinaName === 'Voleibol'
                                                                ? (match.marcador_detalle?.sets?.[s]?.puntos_a || 0)
                                                                : (match.marcador_detalle?.sets?.[s]?.juegos_a || 0)
                                                            }
                                                        </td>
                                                    ))}
                                                    <td className="text-center py-6 px-4 font-black tabular-nums text-2xl text-primary bg-primary/5">{match.marcador_detalle?.sets_a || 0}</td>
                                                </>
                                            )}
                                        </tr>
                                        {/* Row Team B */}
                                        <tr className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1.5 h-6 bg-white/20 rounded-full group-hover:bg-white/40 transition-colors" />
                                                    <span className="font-black tracking-tight text-white/80 group-hover:text-white transition-colors">{getDisplayName(match, 'b')}</span>
                                                </div>
                                            </td>
                                            {disciplinaName === 'Fútbol' && (
                                                <>
                                                    <td className="text-center py-6 px-4 font-bold tabular-nums text-white/60">{match.marcador_detalle?.tiempos?.[1]?.goles_b || 0}</td>
                                                    <td className="text-center py-6 px-4 font-bold tabular-nums text-white/60">{match.marcador_detalle?.tiempos?.[2]?.goles_b || 0}</td>
                                                    <td className="text-center py-6 px-4 font-black tabular-nums text-2xl text-primary bg-primary/5">{match.marcador_detalle?.goles_b || 0}</td>
                                                </>
                                            )}
                                            {disciplinaName === 'Baloncesto' && (
                                                <>
                                                    {[1, 2, 3, 4].map(q => (
                                                        <td key={q} className="text-center py-6 px-4 font-bold tabular-nums text-white/60">{match.marcador_detalle?.cuartos?.[q]?.puntos_b || 0}</td>
                                                    ))}
                                                    <td className="text-center py-6 px-4 font-black tabular-nums text-2xl text-primary bg-primary/5">{match.marcador_detalle?.total_b || 0}</td>
                                                </>
                                            )}
                                            {(disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa') && (
                                                <>
                                                    {[1, 2, 3, 4, 5].filter(s => disciplinaName === 'Voleibol' || s <= 3).map(s => (
                                                        <td key={s} className="text-center py-6 px-4 font-bold tabular-nums text-white/60">
                                                            {disciplinaName === 'Voleibol'
                                                                ? (match.marcador_detalle?.sets?.[s]?.puntos_b || 0)
                                                                : (match.marcador_detalle?.sets?.[s]?.juegos_b || 0)
                                                            }
                                                        </td>
                                                    ))}
                                                    <td className="text-center py-6 px-4 font-black tabular-nums text-2xl text-primary bg-primary/5">{match.marcador_detalle?.sets_b || 0}</td>
                                                </>
                                            )}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Advanced Edit Section */}
                            {match.estado === 'en_vivo' && (
                                <div className="p-8 border-t border-white/5 bg-black/20">
                                    {!showAdvancedEdit ? (
                                        <motion.button 
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={openAdvancedEdit}
                                            aria-label="Abrir modo de edición manual avanzado"
                                            className="w-full group relative overflow-hidden rounded-[1.5rem] p-[1px] transition-all duration-300 shadow-lg hover:shadow-primary/10"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-white/10 to-primary/40 bg-[length:200%_100%] animate-[gradient-shift_4s_ease_infinite]" />
                                            <div className="relative flex items-center justify-center gap-4 rounded-[1.45rem] bg-zinc-950 px-8 py-5 transition-colors group-hover:bg-zinc-900">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <Edit3 size={20} />
                                                </div>
                                                <div className="flex flex-col items-start translate-y-[1px]">
                                                    <span className="font-black text-xs uppercase tracking-[0.2em] text-white">Manual Override Mode</span>
                                                    <span className="text-[10px] font-bold text-white/40 tracking-wider">Ajuste técnico de marcador absoluto</span>
                                                </div>
                                                <div className="ml-auto p-2 rounded-full border border-white/5 group-hover:border-primary/30 transition-colors">
                                                    <Plus size={14} className="group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>
                                        </motion.button>
                                    ) : (() => {
                                        const isFutbol = disciplinaName === 'Fútbol';
                                        const isBasket = disciplinaName === 'Baloncesto' || disciplinaName === 'Futsal';
                                        const periods = isFutbol ? [1, 2] : isBasket ? [1, 2, 3, 4] : [1, 2, 3, 4, 5];
                                        const periodLabel = isFutbol ? 'Tiempo' : isBasket ? 'Cuarto' : 'Set';
                                        const periodShort = isFutbol ? 'T' : isBasket ? 'Q' : 'S';
                                        const fieldA = isFutbol ? 'goles_a' : isBasket ? 'puntos_a' : (disciplinaName === 'Tenis' ? 'juegos_a' : 'puntos_a');
                                        const fieldB = isFutbol ? 'goles_b' : isBasket ? 'puntos_b' : (disciplinaName === 'Tenis' ? 'juegos_b' : 'puntos_b');
                                        const hasTimer = isFutbol || isBasket;
                                        const colCount = periods.length;

                                        return (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="rounded-[2.5rem] overflow-hidden border border-primary/20 bg-zinc-950 shadow-2xl"
                                            >
                                                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-primary/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-2xl bg-primary text-black shadow-lg shadow-primary/20">
                                                            <Terminal size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-sm uppercase tracking-widest text-white">Advanced Tactical Editor</h4>
                                                            <p className="text-[10px] font-bold text-primary/60 tracking-wider uppercase">Direct Score Manipulation</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowAdvancedEdit(false)} className="p-3 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                                                    <div className="overflow-x-auto pb-4 custom-scrollbar">
                                                        <div className="grid gap-6 min-w-[500px] md:min-w-full">
                                                        {/* Team Headers */}
                                                        <div className="grid gap-4 items-center min-w-[300px]" style={{ gridTemplateColumns: `minmax(100px, 1.5fr) repeat(${colCount}, 1fr)` }}>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Broadcast Entities</div>
                                                            {periods.map(s => <div key={s} className="text-center text-[10px] font-black text-white/40 uppercase tracking-widest bg-white/5 py-2 rounded-lg">{periodShort}{s}</div>)}
                                                        </div>

                                                        {/* Team A Input Row */}
                                                        <div className="grid gap-4 items-center min-w-[300px]" style={{ gridTemplateColumns: `minmax(100px, 1.5fr) repeat(${colCount}, 1fr)` }}>
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black text-xs shrink-0">A</div>
                                                                <span className="font-black text-xs text-white/80 truncate uppercase tracking-tight">{getDisplayName(match, 'a')}</span>
                                                            </div>
                                                            {periods.map(p => (
                                                                <input key={`a-${p}`} type="number"
                                                                    aria-label={`${periodLabel} ${p}, equipo A`}
                                                                    value={advancedData[p]?.[fieldA] ?? ''}
                                                                    onChange={(e) => handleAdvChange(p, fieldA, e.target.value)}
                                                                    className={cn(
                                                                        "h-14 text-center rounded-[1.25rem] text-xl font-black tabular-nums transition-all border outline-none min-w-[50px]",
                                                                        advancedPeriod === p ? "bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]" : "bg-white/5 border-white/5 text-white/60 focus:border-white/20"
                                                                    )} 
                                                                />
                                                            ))}
                                                        </div>

                                                        <div className="h-px bg-white/5 w-full my-2" />

                                                        {/* Team B Input Row */}
                                                        <div className="grid gap-4 items-center min-w-[300px]" style={{ gridTemplateColumns: `minmax(100px, 1.5fr) repeat(${colCount}, 1fr)` }}>
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 font-black text-xs shrink-0">B</div>
                                                                <span className="font-black text-xs text-white/60 truncate uppercase tracking-tight">{getDisplayName(match, 'b')}</span>
                                                            </div>
                                                            {periods.map(p => (
                                                                <input key={`b-${p}`} type="number"
                                                                    aria-label={`${periodLabel} ${p}, equipo B`}
                                                                    value={advancedData[p]?.[fieldB] ?? ''}
                                                                    onChange={(e) => handleAdvChange(p, fieldB, e.target.value)}
                                                                    className={cn(
                                                                        "h-14 text-center rounded-[1.25rem] text-xl font-black tabular-nums transition-all border outline-none min-w-[50px]",
                                                                        advancedPeriod === p ? "bg-white/10 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "bg-white/5 border-white/5 text-white/60 focus:border-white/20"
                                                                    )} 
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col md:flex-row gap-4 md:gap-8 pt-6 md:pt-8 border-t border-white/5 items-center">
                                                        <div className="flex flex-col gap-3 flex-1 w-full">
                                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Current Active {periodLabel}</label>
                                                            <div className="flex gap-2">
                                                                {periods.map(s => (
                                                                    <button key={s} onClick={() => setAdvancedPeriod(s)}
                                                                        className={cn(
                                                                            "flex-1 h-12 rounded-xl text-xs font-black transition-all",
                                                                            advancedPeriod === s ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10"
                                                                        )}
                                                                    > {s} </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {hasTimer && (
                                                            <div className="flex flex-col gap-3 w-full md:w-auto">
                                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Clock Sync (Min)</label>
                                                                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                                                                    <input type="number" value={advancedMinuto}
                                                                        onChange={e => setAdvancedMinuto(Math.max(0, parseInt(e.target.value) || 0))}
                                                                        className="w-20 bg-transparent text-center font-black text-2xl text-primary outline-none" 
                                                                    />
                                                                    <div className="h-6 w-px bg-white/10" />
                                                                    <span className="text-xl font-black text-white/20 pr-4 italic">min</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <motion.button 
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={saveAdvancedEdit} 
                                                            className="w-full md:w-auto md:min-w-[200px] h-14 bg-white text-black rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary transition-colors flex items-center justify-center gap-3"
                                                        >
                                                            <Save size={18} /> Sync Global Score
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })()}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}

                {/* ERROR ALERT */}
                {errorCtx && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 flex items-center gap-3">
                        <AlertCircle /> {errorCtx}
                    </div>
                )}

                <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
                    
                    {/* SECCIÓN ESPECIAL: GESTIÓN DE ALINEACIONES (Solo en Programado) */}
                    {match.estado === 'programado' && !['Ajedrez', 'Tenis', 'Tenis de Mesa'].includes(disciplinaName) && (
                        <Card variant="glass" className="lg:col-span-2 p-6 md:p-8 border-primary/20 bg-primary/5 overflow-hidden relative group/roster">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="space-y-8 relative z-10">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="space-y-2 text-center md:text-left">
                                        <h3 className="text-2xl font-black tracking-tight text-white flex items-center gap-3 justify-center md:justify-start">
                                            <Users className="text-primary" size={28} />
                                            Gestión de Alineaciones
                                        </h3>
                                        <p className="text-sm text-white/50 font-bold max-w-md">
                                            Configura los jugadores de cada equipo antes de iniciar el cronómetro. Esto facilitará el registro de eventos durante el partido.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-4">
                                        <Button 
                                            onClick={() => {
                                                setAddingPlayerTeam('equipo_a');
                                                setNuevoEvento(prev => ({ ...prev, tipo: 'cambio', equipo: 'equipo_a' }));
                                            }}
                                            className="h-14 md:h-16 px-6 md:px-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1 flex-1 md:flex-none min-w-[140px] md:min-w-[200px]"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Añadir Jugador</span>
                                            <span className="text-sm font-black text-white">{match.equipo_a}</span>
                                        </Button>
                                        
                                        <Button 
                                            onClick={() => {
                                                setAddingPlayerTeam('equipo_b');
                                                setNuevoEvento(prev => ({ ...prev, tipo: 'cambio', equipo: 'equipo_b' }));
                                            }}
                                            className="h-14 md:h-16 px-6 md:px-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-1 flex-1 md:flex-none min-w-[140px] md:min-w-[200px]"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Añadir Jugador</span>
                                            <span className="text-sm font-black text-white">{match.equipo_b}</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                    {/* Rosters Section */}
                                    {[
                                        { key: 'equipo_a', name: match.equipo_a, list: jugadoresA },
                                        { key: 'equipo_b', name: match.equipo_b, list: jugadoresB }
                                    ].map((team) => (
                                        <div key={team.key} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">{team.name}</h4>
                                                <Badge variant="outline" className="text-[9px] font-bold opacity-50 bg-white/5 border-white/10 px-2 py-0.5">
                                                    {team.list.length} / {disciplinaName === 'Fútbol' ? '11+' : '5+'} jugadores
                                                </Badge>
                                            </div>
                                            <div className="grid gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                {team.list.map(j => (
                                                    <div key={j.id} className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group/p shadow-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center font-black text-xs border border-white/10 text-white group-hover/p:border-primary/30 transition-colors">
                                                                {j.numero || <Users size={14} className="opacity-30" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-white/90 group-hover/p:text-primary transition-colors">{j.nombre}</span>
                                                                {j.profile_id && (
                                                                    <Link 
                                                                        href={`/perfil/${j.profile_id}`} 
                                                                        target="_blank"
                                                                        className="text-[10px] font-bold text-primary/60 hover:text-primary flex items-center gap-1.5 mt-0.5"
                                                                    >
                                                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                                        Perfil Deportista
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDeletePlayer(j.id)}
                                                            className="p-2.5 rounded-xl hover:bg-red-500/10 text-white/10 hover:text-red-500 transition-all group-hover/p:opacity-100 md:opacity-0"
                                                            title="Eliminar jugador"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {team.list.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-10 opacity-20 border-2 border-dashed border-white/10 rounded-3xl">
                                                        <Users size={32} className="mb-2" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">Lista Vacía</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* LEFT: ACTIONS CONTROLLER */}
                    <div className="space-y-6">
                        <Card variant="glass" className="p-0 border-white/10 bg-zinc-900/50 overflow-hidden relative group">

                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                            {/* Bloqueo si partido está finalizado */}
                            {match.estado === 'finalizado' && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm rounded-[inherit]">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Trophy size={28} className="text-amber-500" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 text-center px-8">
                                        El partido ha <span className="text-amber-400">FINALIZADO</span>.
                                    </p>
                                    <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">
                                        Auditoría Cerrada
                                    </p>
                                </div>
                            )}

                            {/* Aviso Modo Preparación */}
                            {match.estado === 'programado' && (
                                <div className="absolute inset-0 z-20 pointer-events-none">
                                    <div className="absolute top-4 right-4 animate-in fade-in slide-in-from-top-2">
                                        <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-[9px] tracking-widest px-3 py-1 uppercase shadow-2xl backdrop-blur-md">
                                            Modo Preparación
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Activity size={20} />
                                    </div>
                                    Registrar Evento
                                </h3>
                                {(() => {
                                    // Calcular paso actual según deporte
                                    const isChess = disciplinaName === 'Ajedrez';
                                    const isEmpate = nuevoEvento.tipo === 'empate';
                                    const isVictoria = nuevoEvento.tipo === 'victoria';
                                    let stepText = '';

                                    if (isChess && isEmpate) {
                                        stepText = nuevoEvento.tipo ? '1/1' : '';
                                    } else if (isChess && isVictoria) {
                                        stepText = nuevoEvento.equipo ? '2/2' : '1/2';
                                    } else if (['Ajedrez', 'Tenis', 'Tenis de Mesa'].includes(disciplinaName)) {
                                        stepText = nuevoEvento.equipo ? '2/2' : '1/2';
                                    } else {
                                        stepText = nuevoEvento.equipo ? (nuevoEvento.jugador_id ? '3/3' : '2/3') : '1/3';
                                    }

                                    return nuevoEvento.tipo && stepText ? (
                                        <Badge variant="outline" className="animate-in fade-in zoom-in bg-primary/10 text-primary border-primary/20">
                                            Paso {stepText}
                                        </Badge>
                                    ) : null;
                                })()}
                            </div>

                            <div className="p-6 space-y-8">
                                {/* 1. ACTIONS GRID */}
                                {(() => {
                                    const isChess = disciplinaName === 'Ajedrez';
                                    const hasTerminal = isChess && chessHasTerminalResult();
                                    return (
                                        <div>
                                            <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider ml-1">1. Selecciona Acción</p>
                                            {hasTerminal && (
                                                <div className="mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                                                    <Trophy size={18} className="text-amber-400 flex-shrink-0" />
                                                    <p className="text-xs font-bold text-amber-300">
                                                        Este partido ya tiene resultado final: <span className="uppercase text-white">{match.marcador_detalle?.resultado_final?.replace('_', ' ')}</span>
                                                    </p>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {actions.map(action => {
                                                    const isSelected = nuevoEvento.tipo === action.value;
                                                    const isTerminalAction = action.value === 'victoria' || action.value === 'empate';
                                                    const isScoringAction = action.value.startsWith('gol') || action.value.startsWith('punto') || action.value.startsWith('tarjeta');
                                                    
                                                    // Permitir 'cambio' (registro de jugador) en modo programado
                                                    const isBannedInProgramado = match.estado === 'programado' && action.value !== 'cambio';
                                                    
                                                    const isDisabled = (hasTerminal && isTerminalAction) || isBannedInProgramado;

                                                    let activeColors = "from-slate-700 to-slate-900 border-slate-600";
                                                    let iconColor = "text-slate-400";

                                                    if (action.style === 'pill-green') { activeColors = "from-emerald-600 to-emerald-800 border-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"; iconColor = "text-emerald-400"; }
                                                    else if (action.style === 'card-yellow') { activeColors = "from-yellow-500 to-amber-600 border-yellow-300 shadow-[0_0_20px_-5px_rgba(234,179,8,0.5)]"; iconColor = "text-yellow-400"; }
                                                    else if (action.style === 'card-red') { activeColors = "from-red-600 to-red-800 border-red-500 shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]"; iconColor = "text-red-500"; }
                                                    else if (action.style.includes('orange')) { activeColors = "from-orange-500 to-red-600 border-orange-400 shadow-[0_0_20px_-5px_rgba(249,115,22,0.5)]"; iconColor = "text-orange-400"; }
                                                    else if (action.style === 'pill-blue') { activeColors = "from-red-600 to-red-700 border-red-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]"; iconColor = "text-red-400"; }
                                                    else if (action.style === 'pill-gold') { activeColors = "from-amber-500 to-yellow-600 border-amber-400 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)]"; iconColor = "text-amber-400"; }
                                                    else if (action.style === 'pill-neutral') { activeColors = "from-slate-600 to-slate-800 border-slate-400 shadow-[0_0_20px_-5px_rgba(148,163,184,0.3)]"; iconColor = "text-slate-400"; }

                                                    return (
                                                        <button
                                                            key={action.value}
                                                            disabled={isDisabled}
                                                            aria-label={`${action.label}${isDisabled ? ' (Deshabilitado)' : ''}`}
                                                            onClick={() => {
                                                                if (isDisabled) return;
                                                                setNuevoEvento({ ...nuevoEvento, tipo: action.value });
                                                            }}
                                                            className={`relative h-24 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 group/btn overflow-hidden ${isDisabled
                                                                ? 'opacity-30 cursor-not-allowed bg-zinc-900/20 border-white/5'
                                                                : isSelected
                                                                    ? `bg-gradient-to-br ${activeColors} text-white scale-[1.02] z-10 ring-2 ring-white/10`
                                                                    : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-white/5 active:scale-95"
                                                                }`}
                                                        >
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
                                    );
                                })()}

                                {/* 2. TEAM & PLAYER SELECTOR (Animated Reveal) */}
                                <div className={`space-y-6 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${nuevoEvento.tipo ? 'opacity-100 translate-y-0 filter-none' : 'opacity-30 translate-y-8 blur-sm pointer-events-none'}`}>

                                    {/* TEAM / COMPETITOR SELECTOR — solo si no es empate de ajedrez */}
                                    {!(disciplinaName === 'Ajedrez' && nuevoEvento.tipo === 'empate') && (
                                    <div>
                                        <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider ml-1">
                                            {disciplinaName === 'Ajedrez' && nuevoEvento.tipo === 'victoria'
                                                ? '2. ¿Quién ganó?'
                                                : '2. ¿Para qué equipo?'
                                            }
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { id: 'equipo_a', name: getDisplayName(match, 'a'), subtitle: getCarreraSubtitle(match, 'a') },
                                                { id: 'equipo_b', name: getDisplayName(match, 'b'), subtitle: getCarreraSubtitle(match, 'b') }
                                            ].map(team => {
                                                const isSelected = nuevoEvento.equipo === team.id;
                                                return (
                                                    <button
                                                        key={team.id}
                                                        onClick={() => {
                                                            const isIndividual = ['Ajedrez', 'Tenis', 'Tenis de Mesa'].includes(disciplinaName);

                                                            if (isIndividual && disciplinaName !== 'Ajedrez') {
                                                                // Non-chess individual sports: auto-submit
                                                                const eventState = { ...nuevoEvento, equipo: team.id, jugador_id: null };
                                                                setNuevoEvento(eventState);
                                                                handleNuevoEvento(eventState);
                                                            } else {
                                                                // Chess + collective: just set the equipo
                                                                setNuevoEvento({ ...nuevoEvento, equipo: team.id, jugador_id: null });
                                                            }
                                                        }}
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
                                                                {team.subtitle || (team.id === 'equipo_a' ? 'Local' : 'Visitante')}
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
                                    )}

                                    {/* --- CHESS CONFIRMATION BUTTON --- */}
                                    {disciplinaName === 'Ajedrez' && (
                                        <div className="mt-4">
                                            {nuevoEvento.tipo === 'empate' ? (
                                                <Button
                                                    size="lg"
                                                    className="w-full h-14 rounded-xl text-lg font-black tracking-wide shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black shadow-emerald-500/20"
                                                    onClick={() => handleNuevoEvento({ tipo: 'empate', equipo: '', jugador_id: null })}
                                                >
                                                    <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                                        <Check strokeWidth={3} className="w-5 h-5" /> CONFIRMAR EMPATE
                                                    </span>
                                                </Button>
                                            ) : nuevoEvento.tipo === 'victoria' && nuevoEvento.equipo ? (
                                                <Button
                                                    size="lg"
                                                    className="w-full h-14 rounded-xl text-lg font-black tracking-wide shadow-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-amber-500/20"
                                                    onClick={() => handleNuevoEvento()}
                                                >
                                                    <span className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                                        <Check strokeWidth={3} className="w-5 h-5" /> CONFIRMAR VICTORIA
                                                    </span>
                                                </Button>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* PLAYER SELECTOR — Solo para deportes colectivos que requieren jugador */}
                                    {!['Ajedrez', 'Tenis', 'Tenis de Mesa'].includes(disciplinaName) && (
                                        <div className={`transition-all duration-500 delay-100 ${nuevoEvento.equipo ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4 pointer-events-none'}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">3. Selecciona Jugador</p>
                                                {!addingPlayerTeam && (
                                                    <button
                                                        onClick={() => setAddingPlayerTeam(nuevoEvento.equipo)}
                                                        className="text-[10px] font-bold uppercase flex items-center gap-1.5 text-primary hover:text-white px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary transition-all border border-primary/20"
                                                    >
                                                        <Plus size={12} /> Nuevo Jugador
                                                    </button>
                                                )}
                                            </div>

                                            {addingPlayerTeam ? (
                                                <div className="bg-zinc-900 border border-primary/50 p-4 rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                                                    <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                                                    <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                                                        <Users size={14} /> Crear Nuevo Jugador
                                                    </h4>
                                                    <div className="space-y-3 mb-3">
                                                        <input
                                                            autoFocus
                                                            placeholder="Nombre del Jugador"
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                                            value={newPlayerForm.nombre}
                                                            onChange={e => setNewPlayerForm({ ...newPlayerForm, nombre: e.target.value })}
                                                        />
                                                        <div className="flex gap-3">
                                                            <input
                                                                placeholder="#"
                                                                type="number"
                                                                className="w-20 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-center font-mono text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                                                value={newPlayerForm.numero}
                                                                onChange={e => setNewPlayerForm({ ...newPlayerForm, numero: e.target.value })}
                                                            />
                                                            <select 
                                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-white/70"
                                                                value={newPlayerForm.profile_id}
                                                                onChange={e => {
                                                                    const pid = e.target.value;
                                                                    setNewPlayerForm(prev => ({ ...prev, profile_id: pid }));
                                                                    // Autocompletar nombre si se selecciona un perfil
                                                                    if (pid) {
                                                                        const p = deportistas.find(d => d.id === pid);
                                                                        if (p) setNewPlayerForm(prev => ({ ...prev, nombre: p.full_name }));
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">
                                                                    {loadingDeportistas ? "Cargando perfiles..." : "Vincular Perfil (Opcional)"}
                                                                </option>
                                                                {deportistas.length === 0 && !loadingDeportistas && (
                                                                    <option value="" disabled>No se encontraron deportistas</option>
                                                                )}
                                                                {deportistas.map(d => {
                                                                    const isMatch = d.athlete_disciplina_id === match?.disciplina_id;
                                                                    return (
                                                                        <option key={d.id} value={d.id} className={isMatch ? "text-primary font-bold" : ""}>
                                                                            {isMatch ? '⭐ ' : ''}{d.full_name || d.email || d.id.substring(0, 8)} {isMatch ? '(Especialidad)' : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>
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
                                                                    <div className="flex flex-col min-w-0 pr-2">
                                                                        <span className="truncate text-xs font-bold leading-tight">{j.nombre}</span>
                                                                        {j.profile_id && <span className="text-[8px] uppercase tracking-tighter text-primary/70 font-black">Con Perfil</span>}
                                                                    </div>
                                                                    {j.profile_id && (
                                                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                                                                    )}
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
                                                            onClick={() => handleNuevoEvento()}
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
                                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-black tabular-nums text-white/40 ring-4 ring-[#070504]" aria-label={`Minuto ${e.minuto}`}>
                                            {e.minuto}&apos;
                                        </div>
                                        {e.periodo && (
                                            <div className="mt-1 text-[9px] font-black text-[#FFC000] bg-[#FFC000]/10 px-1 rounded-sm border border-[#FFC000]/20" aria-label={`Periodo ${e.periodo}`}>
                                                {disciplinaName === 'Fútbol' ? 'T' : (disciplinaName === 'Baloncesto' || disciplinaName === 'Futsal' ? 'Q' : 'S')}{e.periodo}
                                            </div>
                                        )}
                                        <div className="w-0.5 flex-1 bg-slate-800/50 my-1" aria-hidden="true" />
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <div className={`p-3 rounded-xl border ${e.equipo === 'sistema' ? 'bg-slate-900 border-slate-800' : 'bg-white/5 border-white/5 hover:bg-white/10'} transition-colors`}>
                                            <div className="flex justify-between items-start">
                                                <span className="text-xl mr-4 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 border border-white/5">
                                                    {e.tipo_evento === 'gol' && '⚽'}
                                                    {e.tipo_evento === 'punto_1' && <span className="text-[10px] font-black font-mono">+1</span>}
                                                    {e.tipo_evento === 'punto_2' && <span className="text-[10px] font-black font-mono">+2</span>}
                                                    {e.tipo_evento === 'punto_3' && <span className="text-[10px] font-black font-mono">+3</span>}
                                                    {e.tipo_evento === 'punto' && '🏐'}
                                                    {e.tipo_evento === 'falta' && '⛔'}
                                                    {e.tipo_evento === 'set' && '🏆'}
                                                    {e.tipo_evento === 'tarjeta_amarilla' && <div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm" />}
                                                    {e.tipo_evento === 'tarjeta_roja' && <div className="w-2.5 h-3.5 bg-red-500 rounded-sm" />}
                                                    {e.tipo_evento === 'cambio' && <span className="text-emerald-400 text-[14px]">⇄</span>}
                                                    {e.tipo_evento === 'inicio' && '🚀'}
                                                    {e.tipo_evento === 'fin' && '🏁'}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm capitalize mb-0.5">
                                                        {(() => {
                                                            const audit = parseEventAudit(e.descripcion);
                                                            return audit.texto || e.tipo_evento.replace(/_/g, ' ').replace('punto', 'Punto');
                                                        })()}
                                                    </p>
                                                    {e.jugadores && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {e.jugadores.profile_id ? (
                                                                <Link 
                                                                    href={`/perfil/${e.jugadores.profile_id}`}
                                                                    className="hover:text-primary transition-colors cursor-pointer"
                                                                >
                                                                    {e.jugadores.nombre}
                                                                </Link>
                                                            ) : (
                                                                e.jugadores.nombre
                                                            )}
                                                            <span className="opacity-50 ml-1">#{e.jugadores.numero}</span>
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-1">
                                                        {e.equipo !== 'sistema' && (
                                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                                                                {e.equipo === 'equipo_a' ? (match.carrera_a?.nombre || match.equipo_a) : (match.carrera_b?.nombre || match.equipo_b)}
                                                            </p>
                                                        )}
                                                        {(() => {
                                                            const audit = parseEventAudit(e.descripcion);
                                                            if (!audit.autor) return null;
                                                            return (
                                                                <span className="text-[9px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10" title={`Añadido por: ${audit.autor.nombre} (${audit.autor.email})`}>
                                                                    ✍️ {audit.autor.nombre.split(' ')[0]}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => requestDeleteEvento(e)}
                                                    className={`ml-2 p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors ${deletingEventId === e.id ? 'animate-pulse text-red-500' : ''}`}
                                                    title="Eliminar evento (Revertir cambios)"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div >
                </div >
                {/* --- PREMIUM END MATCH MODAL --- */}
                {
                    isEndingMatch && (
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
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 truncate max-w-full">{match.carrera_a?.nombre || match.equipo_a}</span>
                                                <span className="text-4xl font-black text-white tracking-tighter">{scoreA}</span>
                                            </div>

                                            <div className="h-8 w-px bg-white/10 mx-2" />

                                            <div className="flex flex-col items-center w-1/3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 truncate max-w-full">{match.carrera_b?.nombre || match.equipo_b}</span>
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
                    )
                }

                {/* --- MANUAL SCORE EDIT MODAL --- */}
                {
                    isEditingScore && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEditingScore(false)} />
                            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                                <h3 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
                                    <Edit2 size={20} className="text-primary" /> Ajuste Manual
                                </h3>

                                <div className="flex items-center justify-between gap-4 mb-8">
                                    {/* Team A */}
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">{match.carrera_a?.nombre || match.equipo_a}</span>
                                        <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/5">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={() => handleManualScoreUpdate(disciplinaName === 'Fútbol' ? 'goles_a' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_a' : 'total_a'), Math.max(0, (match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_a' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_a' : 'total_a')] || 0) - 1))}>
                                                <span className="text-xl">-</span>
                                            </Button>
                                            <span className="text-2xl font-black tabular-nums w-8 text-center">
                                                {match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_a' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_a' : 'total_a')] || 0}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={() => handleManualScoreUpdate(disciplinaName === 'Fútbol' ? 'goles_a' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_a' : 'total_a'), (match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_a' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_a' : 'total_a')] || 0) + 1)}>
                                                <Plus size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Team B */}
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">{match.carrera_b?.nombre || match.equipo_b}</span>
                                        <div className="flex items-center gap-2 bg-black/40 rounded-xl p-1 border border-white/5">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={() => handleManualScoreUpdate(disciplinaName === 'Fútbol' ? 'goles_b' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_b' : 'total_b'), Math.max(0, (match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_b' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_b' : 'total_b')] || 0) - 1))}>
                                                <span className="text-xl">-</span>
                                            </Button>
                                            <span className="text-2xl font-black tabular-nums w-8 text-center">
                                                {match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_b' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_b' : 'total_b')] || 0}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={() => handleManualScoreUpdate(disciplinaName === 'Fútbol' ? 'goles_b' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_b' : 'total_b'), (match.marcador_detalle?.[disciplinaName === 'Fútbol' ? 'goles_b' : (disciplinaName === 'Voleibol' || disciplinaName === 'Tenis' || disciplinaName === 'Tenis de Mesa' ? 'sets_b' : 'total_b')] || 0) + 1)}>
                                                <Plus size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-zinc-500 text-center mb-6 max-w-[200px] mx-auto">
                                    * Esto modifica el marcador final directament. Úsalo para corregir errores manuales.
                                </p>

                                <Button className="w-full bg-white/10 hover:bg-white/20" onClick={() => setIsEditingScore(false)}>
                                    Cerrar Panel
                                </Button>
                            </div>
                        </div>
                    )
                }

                {/* --- DELETE CONFIRMATION MODAL --- */}
                {
                    confirmingDeletion && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setConfirmingDeletion(null)} />

                            <div className="relative bg-zinc-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] animate-in zoom-in-95 overflow-hidden">
                                {/* Decorative Background */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 shadow-lg shadow-red-500/10">
                                        <AlertCircle size={32} className="text-red-500" />
                                    </div>

                                    <h3 className="text-xl font-black text-white mb-2">¿Eliminar Evento?</h3>

                                    <div className="bg-white/5 rounded-xl p-4 w-full mb-6 border border-white/5">
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <Badge variant="outline" className="border-white/10 text-zinc-400">Min {confirmingDeletion.minuto}'</Badge>
                                            <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10">
                                                {confirmingDeletion.tipo_evento.replace(/_/g, ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                    <p className="text-zinc-300 font-medium">
                                        {confirmingDeletion.jugadores ? (
                                            confirmingDeletion.jugadores.profile_id ? (
                                                <Link 
                                                    href={`/perfil/${confirmingDeletion.jugadores.profile_id}`}
                                                    className="hover:text-red-400 transition-colors cursor-pointer"
                                                    target="_blank"
                                                >
                                                    {confirmingDeletion.jugadores.nombre}
                                                </Link>
                                            ) : (
                                                confirmingDeletion.jugadores.nombre
                                            )
                                        ) : 'Evento de equipo'}
                                    </p>
                                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                                            {confirmingDeletion.equipo === 'equipo_a' ? (match.carrera_a?.nombre || match.equipo_a) : (match.carrera_b?.nombre || match.equipo_b)}
                                        </p>
                                    </div>

                                    <p className="text-zinc-400 text-xs mb-6 px-4">
                                        Esta acción es irreversible. Si el evento otorgó puntos (goles, sets), <span className="text-red-400 font-bold">se restarán automáticamente</span> del marcador.
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setConfirmingDeletion(null)}
                                            className="rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={ejecutarEliminacion}
                                            className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-900/20 border-t border-white/10"
                                        >
                                            Sí, Eliminar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
