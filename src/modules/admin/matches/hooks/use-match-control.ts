import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { invalidateCache } from "@/lib/supabase-query";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { stampAudit, stampEventAudit } from "@/lib/audit-helpers";
import {
  recalculateTotals,
  nextPeriod,
  removePoints,
  addPoints,
  isCountdownSport,
  getPeriodDuration,
  getCurrentPeriodNumber
} from "@/lib/sport-scoring";
import type { PartidoWithRelations as Partido, Evento, Jugador } from "@/modules/matches/types";

export function useMatchControl(matchId: string) {
    const { profile } = useAuth();
    const { logAction } = useAuditLogger();
    const [match, setMatch] = useState<Partido | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorCtx, setErrorCtx] = useState<string | null>(null);

    // Datos
    const [jugadoresA, setJugadoresA] = useState<Jugador[]>([]);
    const [jugadoresB, setJugadoresB] = useState<Jugador[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);

    // Cronómetro Lógico
    const [minutoActual, setMinutoActual] = useState(0);
    const [cronometroActivo, setCronometroActivo] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Presence
    const [activeEditors, setActiveEditors] = useState<any[]>([]);

    const auditDetalle = (detalle: any) => stampAudit(detalle, profile);

    const fetchEventos = useCallback(async () => {
        const { data } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:jugadores!jugador_id_normalized(*)')
            .eq('partido_id', matchId)
            .order('created_at', { ascending: false });
        if (data) setEventos(data);
    }, [matchId]);

    const fetchJugadores = useCallback(async () => {
        const { data } = await supabase
            .from('roster_partido')
            .select('*, jugador:jugadores(*)')
            .eq('partido_id', matchId);
        
        if (data) {
            // Transform roster data to look like simple players
            const transformed = data.map((r: any) => ({
                id: r.jugador?.id,
                roster_id: r.id, // we might need this for deletion
                nombre: r.jugador?.nombre,
                numero: r.jugador?.numero,
                equipo: r.equipo_a_or_b,
                profile_id: r.jugador?.profile_id
            }));
            setJugadoresA(transformed.filter((j: any) => j.equipo === 'equipo_a'));
            setJugadoresB(transformed.filter((j: any) => j.equipo === 'equipo_b'));
        }
    }, [matchId]);

    const fetchMatchDetails = useCallback(async () => {
        try {
            setLoading(true);
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 10000)
            );
            const query = supabase
                .from('partidos')
                .select(`*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)`)
                .eq('id', matchId)
                .single();

            const { data, error } = await Promise.race([query, timeout]);
            if (error) throw error;
            setMatch(data as Partido);

            const detalle = data.marcador_detalle || {};
            if (detalle.minuto_actual !== undefined) setMinutoActual(detalle.minuto_actual);
            if (detalle.estado_cronometro === 'corriendo') setCronometroActivo(true);

            await Promise.all([fetchJugadores(), fetchEventos()]);
        } catch (err: any) {
            console.error(err);
            setErrorCtx(err.message === 'TIMEOUT' ? 'Tiempo de espera agotado. Vuelve a intentarlo.' : err.message);
        } finally {
            setLoading(false);
        }
    }, [matchId, fetchJugadores, fetchEventos]);

    const actualizarMinutoEnDB = useCallback(async (minuto: number) => {
        if (!match || !profile) return;
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
        setMatch((prev: any) => prev ? ({ ...prev, marcador_detalle: nuevoDetalle }) : null);
    }, [match, profile, matchId]);

    const registrarEventoSistema = useCallback(async (tipo: string, desc: string, minOverride?: number, periodOverride?: number) => {
        if (!match) return;
        const periodo = periodOverride ?? getCurrentPeriodNumber(match.disciplinas?.name || "", match.marcador_detalle || {});
        await supabase.from('olympics_eventos').insert({
            partido_id: matchId,
            tipo_evento: tipo,
            minuto: minOverride ?? minutoActual,
            equipo: 'sistema',
            descripcion: stampEventAudit(desc, profile),
            periodo: periodo
        });
        fetchEventos();
    }, [match, matchId, minutoActual, profile, fetchEventos]);

    // Effects — split into two to avoid double-calling fetchMatchDetails when profile loads
    useEffect(() => {
        fetchMatchDetails();
    }, [matchId, fetchMatchDetails]);

    useEffect(() => {
        if (!profile) return;

        const sessionId = Math.random().toString(36).substring(7);
        const channel = supabase.channel(`match-presence-${matchId}`, {
            config: { presence: { key: `${profile.id}-${sessionId}` } },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const editors = Object.values(state).flat();
                setActiveEditors(editors.filter((e: any) => e.session_id !== sessionId));
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                const otherSession = newPresences.find((p: any) => p.session_id !== sessionId);
                if (otherSession) toast.info(`${otherSession.user_name || 'Alguien'} se ha unido a la edición`);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'partidos',
                filter: `id=eq.${matchId}`
            }, (payload: any) => {
                setMatch((prev: any) => prev ? ({ ...prev, ...payload.new }) : payload.new);
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

        return () => { supabase.removeChannel(channel); };
    }, [matchId, profile]);

    useEffect(() => {
        if (cronometroActivo) {
            const isCountdown = isCountdownSport(match?.disciplinas?.name || "");
            intervalRef.current = setInterval(() => {
                setMinutoActual(prev => {
                    const nuevo = isCountdown ? Math.max(0, prev - 1) : prev + 1;
                    actualizarMinutoEnDB(nuevo);
                    return nuevo;
                });
            }, 60000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [cronometroActivo, match?.disciplinas?.name, actualizarMinutoEnDB]);

    // Handlers
    const toggleCronometro = async () => {
        if (!match) return;
        try {
            const nuevoEstado = !cronometroActivo;
            setCronometroActivo(nuevoEstado);

            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle, estado')
                .eq('id', matchId)
                .single();
            const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

            const nuevoDetalle = {
                ...freshDetalle,
                estado_cronometro: nuevoEstado ? 'corriendo' : 'pausado',
                ultimo_update: new Date().toISOString()
            };

            const currentEstado = freshMatch?.estado || match.estado;
            if (nuevoEstado && currentEstado === 'programado') {
                const sportName = match.disciplinas?.name || "";
                const isCountdown = isCountdownSport(sportName);

                const startMinuto = isCountdown ? getPeriodDuration(sportName) : 0;
                nuevoDetalle.tiempo_inicio = new Date().toISOString();
                nuevoDetalle.minuto_actual = startMinuto;

                if (sportName === 'Baloncesto' && !nuevoDetalle.cuarto_actual) {
                    nuevoDetalle.cuarto_actual = 1;
                }

                const { error } = await supabase.from('partidos').update({
                    estado: 'en_curso',
                    marcador_detalle: auditDetalle(nuevoDetalle)
                }).eq('id', matchId);

                if (error) throw error;
                setMinutoActual(startMinuto);
                registrarEventoSistema('inicio', 'Inicio del partido', startMinuto, 1);
                
                // Log Action
                await logAction('UPDATE_MATCH', 'partido', matchId, {
                    nuevo_estado: 'en_curso',
                    info: 'El partido ha comenzado'
                });
            } else {
                const { error } = await supabase.from('partidos').update({
                    marcador_detalle: auditDetalle(nuevoDetalle),
                    last_edited_by: profile?.id
                }).eq('id', matchId);
                if (error) throw error;
            }
        } catch (err: any) {
            toast.error('Error con el cronómetro: ' + err.message);
            setCronometroActivo(cronometroActivo);
        }
    };

    const handleNuevoEvento = async (tipo: string, equipo: string, jugador_id: number | null) => {
        if (!match || !profile) return;
        const disciplinaName = match.disciplinas?.name || 'Deporte';

        if (match.estado !== 'en_curso') {
            if (!(match.estado === 'programado' && tipo === 'cambio')) {
                toast.error('Solo se pueden registrar eventos de juego en partidos EN CURSO.');
                return;
            }
        }

        const periodo = getCurrentPeriodNumber(disciplinaName, match.marcador_detalle || {});

        const { error } = await supabase.from('olympics_eventos').insert({
            partido_id: matchId,
            tipo_evento: tipo,
            minuto: minutoActual,
            equipo: equipo || 'sistema',
            jugador_id_normalized: jugador_id,
            periodo: periodo,
            descripcion: stampEventAudit(null, profile)
        });

        if (error) {
            toast.error('No se pudo guardar el evento: ' + error.message);
            return;
        }

        const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
        const currentDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};

        if (tipo.startsWith('gol') || tipo.startsWith('punto') || tipo.startsWith('set')) {
            let puntos = 1;
            if (tipo === 'punto_2') puntos = 2;
            if (tipo === 'punto_3') puntos = 3;
            const nuevoMarcador = addPoints(disciplinaName, currentDetalle, equipo as any, puntos);
            await supabase.from('partidos').update({ marcador_detalle: auditDetalle(nuevoMarcador) }).eq('id', matchId);

            await logAction('UPDATE_SCORE', 'partido', matchId, {
                tipo_evento: tipo,
                equipo: equipo,
                puntos: puntos,
                nuevo_marcador: nuevoMarcador
            });
        } else {
            await logAction('ADD_EVENT', 'evento', matchId, {
                tipo_evento: tipo,
                equipo: equipo,
                jugador_id: jugador_id
            });
        }
        fetchEventos();
    };

    const handleManualScoreUpdate = async (field: string, value: number) => {
        if (!match || !profile) return;
        const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
        const nuevoMarcador = { ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}) };
        nuevoMarcador[field] = value;
        const finalDetalle = recalculateTotals(match.disciplinas?.name || 'Fútbol', nuevoMarcador);
        await supabase.from('partidos').update({ 
            marcador_detalle: auditDetalle(finalDetalle),
            last_edited_by: profile.id
        }).eq('id', matchId);

        // Log Action
        await logAction('UPDATE_SCORE', 'partido', matchId, {
            campo_editado: field,
            nuevo_valor: value,
            marcador_completo: finalDetalle
        });
    };

    const handleCambiarPeriodo = async () => {
        if (!match || !profile) return;
        try {
            const disciplinaName = match.disciplinas?.name || 'Deporte';
            setCronometroActivo(false);

            const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
            const nuevoMarcador = nextPeriod(disciplinaName, freshMatch?.marcador_detalle || match.marcador_detalle || {});

            let nuevoMinuto = 0;
            let mensaje = '';

            if (disciplinaName === 'Fútbol') {
                nuevoMinuto = 45;
                mensaje = '2º Tiempo';
            } else if (disciplinaName === 'Baloncesto') {
                const c = nuevoMarcador.cuarto_actual || 1;
                nuevoMinuto = getPeriodDuration('Baloncesto');
                mensaje = c > 4 ? `Prórroga ${c - 4}` : `${c}º Cuarto`;
            } else if (disciplinaName === 'Voleibol') {
                nuevoMinuto = 0;
                const s = nuevoMarcador.set_actual || 1;
                mensaje = `Set ${s}`;
            }

            if (mensaje) {
                const detalleFinal = { ...nuevoMarcador, minuto_actual: nuevoMinuto, estado_cronometro: 'pausado' };
                await supabase.from('partidos').update({ marcador_detalle: auditDetalle(detalleFinal) }).eq('id', matchId);
                setMinutoActual(nuevoMinuto);
                registrarEventoSistema('periodo', mensaje);
                await logAction('CHANGE_PERIOD', 'partido', matchId, { mensaje });
                toast.success(mensaje);
            }
        } catch (err: any) {
            toast.error('Error al cambiar período: ' + err.message);
        }
    };

    const confirmarFinalizar = async () => {
        if (!match || !profile) return;
        setCronometroActivo(false);
        const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
        const nuevoDetalle = {
            ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}),
            estado_cronometro: 'detenido',
            minuto_actual: minutoActual,
            ultimo_update: new Date().toISOString()
        };

        const { error } = await supabase.from('partidos').update({
            estado: 'finalizado',
            marcador_detalle: auditDetalle(nuevoDetalle),
            last_edited_by: profile.id
        }).eq('id', matchId);

        if (!error) {
            invalidateCache('admin-partidos');
            registrarEventoSistema('fin', 'Partido finalizado oficialmente');
            
            // Log Action
            await logAction('UPDATE_MATCH', 'partido', matchId, {
                nuevo_estado: 'finalizado',
                marcador_final: nuevoDetalle
            });

            toast.success("Partido finalizado");
        }
    };

    const requestDeleteEvento = async (evento: Evento) => {
        if (!match || !profile) return;
        const disciplinaName = match.disciplinas?.name || 'Deporte';
        const tipo = evento.tipo_evento;
        if (tipo.startsWith('gol') || tipo.startsWith('punto')) {
            let puntos = 1;
            if (tipo === 'punto_2') puntos = 2;
            if (tipo === 'punto_3') puntos = 3;
            const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
            const nuevoMarcador = removePoints(disciplinaName, freshMatch?.marcador_detalle || match.marcador_detalle || {}, evento.equipo as any, puntos);
            await supabase.from('partidos').update({ marcador_detalle: auditDetalle(nuevoMarcador) }).eq('id', matchId);
        }
        await supabase.from('olympics_eventos').delete().eq('id', evento.id);

        // Log Action
        await logAction('DELETE_EVENT', 'evento', matchId, {
            tipo_evento: tipo,
            evento_id: evento.id,
            equipo: evento.equipo
        });

        fetchEventos();
    };

    return {
        match,
        loading,
        errorCtx,
        jugadoresA,
        jugadoresB,
        eventos,
        minutoActual,
        cronometroActivo,
        activeEditors,
        toggleCronometro,
        handleNuevoEvento,
        handleManualScoreUpdate,
        handleCambiarPeriodo,
        confirmarFinalizar,
        requestDeleteEvento,
        fetchJugadores,
        fetchEventos,
        fetchMatchDetails
    };
}
