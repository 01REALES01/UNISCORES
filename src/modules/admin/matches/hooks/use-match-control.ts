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
  setPoints,
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

    const fetchJugadores = useCallback(async (currentMatch?: Partido) => {
        const m = currentMatch || match;
        if (!m) return;

        const isColectivo = ['Fútbol', 'Baloncesto', 'Voleibol'].includes(m.disciplinas?.name || '');

        // 1. Fetch EXPLICIT Roster (From roster_partido table)
        const { data: explicitRoster } = await supabase
            .from('roster_partido')
            .select('*, jugador:jugadores(*)')
            .eq('partido_id', matchId);

        const explicitProcessed = (explicitRoster || []).map((r: any) => ({
            id: r.jugador?.id,
            roster_id: r.id, 
            nombre: r.jugador?.nombre,
            numero: r.jugador?.numero,
            equipo: r.equipo_a_or_b as 'equipo_a' | 'equipo_b',
            profile_id: r.jugador?.profile_id
        })).filter(j => j.id); // Filter out potential broken links

        if (!isColectivo) {
            setJugadoresA(explicitProcessed.filter(j => j.equipo === 'equipo_a'));
            setJugadoresB(explicitProcessed.filter(j => j.equipo === 'equipo_b'));
            return;
        }

        // 2. Colectivo: Complement with VIRTUAL Roster (Based on Career IDs)
        let idsA = m.carrera_a_id ? [m.carrera_a_id] : [];
        let idsB = m.carrera_b_id ? [m.carrera_b_id] : [];

        if (Array.isArray(m.carrera_a_ids) && m.carrera_a_ids.length > 0) {
            idsA = [...new Set([...idsA, ...m.carrera_a_ids])];
        }
        if (Array.isArray(m.carrera_b_ids) && m.carrera_b_ids.length > 0) {
            idsB = [...new Set([...idsB, ...m.carrera_b_ids])];
        }

        const delegAid = (m as Partido & { delegacion_a_id?: number | null }).delegacion_a_id;
        const delegBid = (m as Partido & { delegacion_b_id?: number | null }).delegacion_b_id;

        const [delegByIdA, delegByIdB] = await Promise.all([
            delegAid
                ? supabase.from('delegaciones').select('carrera_ids').eq('id', delegAid).maybeSingle()
                : Promise.resolve({ data: null as { carrera_ids?: number[] } | null }),
            delegBid
                ? supabase.from('delegaciones').select('carrera_ids').eq('id', delegBid).maybeSingle()
                : Promise.resolve({ data: null as { carrera_ids?: number[] } | null }),
        ]);

        if (delegByIdA.data?.carrera_ids?.length) {
            idsA = [...new Set([...idsA, ...delegByIdA.data.carrera_ids])];
        }
        if (delegByIdB.data?.carrera_ids?.length) {
            idsB = [...new Set([...idsB, ...delegByIdB.data.carrera_ids])];
        }

        const { data: delegARows } = await supabase.from('delegaciones').select('carrera_ids').ilike('nombre', m.equipo_a ?? '').limit(1);
        const { data: delegBRows } = await supabase.from('delegaciones').select('carrera_ids').ilike('nombre', m.equipo_b ?? '').limit(1);
        const delegA = delegARows?.[0];
        const delegB = delegBRows?.[0];

        if (delegA?.carrera_ids?.length) idsA = [...new Set([...idsA, ...delegA.carrera_ids])];
        if (delegB?.carrera_ids?.length) idsB = [...new Set([...idsB, ...delegB.carrera_ids])];

        // Si el nombre en `equipo_*` no matchea pero sí `delegacion_*` (texto mostrado en ficha)
        if (m.delegacion_a && m.delegacion_a.trim() !== (m.equipo_a ?? '').trim()) {
            const { data: dAlt } = await supabase
                .from('delegaciones')
                .select('carrera_ids')
                .ilike('nombre', m.delegacion_a.trim())
                .limit(1);
            if (dAlt?.[0]?.carrera_ids?.length) {
                idsA = [...new Set([...idsA, ...dAlt[0].carrera_ids])];
            }
        }
        if (m.delegacion_b && m.delegacion_b.trim() !== (m.equipo_b ?? '').trim()) {
            const { data: dAlt } = await supabase
                .from('delegaciones')
                .select('carrera_ids')
                .ilike('nombre', m.delegacion_b.trim())
                .limit(1);
            if (dAlt?.[0]?.carrera_ids?.length) {
                idsB = [...new Set([...idsB, ...dAlt[0].carrera_ids])];
            }
        }

        const allCarreraIds = [...new Set([...idsA, ...idsB])];

        /** Alineado con perfiles de equipo/carrera: género flexible en cliente */
        const matchesGeneroPartido = (j: { genero?: string | null; sexo?: string | null }) => {
            const targetGen = (m.genero || '').toLowerCase().trim();
            if (!targetGen) return true;
            const jg = (j.genero || j.sexo || '').toLowerCase().trim();
            if (!jg) return true;
            if (targetGen.startsWith('masc') && (jg.startsWith('masc') || jg === 'm')) return true;
            if (targetGen.startsWith('feme') && (jg.startsWith('feme') || jg === 'f')) return true;
            return jg === targetGen;
        };

        const toVirtualRow = (j: any, equipo: 'equipo_a' | 'equipo_b') => ({
            id: j.id,
            roster_id: null as number | null,
            nombre: j.nombre,
            numero: j.numero,
            equipo,
            profile_id: j.profile_id,
        });

        let virtualProcessed: any[] = [];

        // 2a Por carrera (varios intentos si la disciplina en BD no coincide con el partido)
        if (allCarreraIds.length > 0) {
            const runCarreraQuery = async (mode: 'strict_disc' | 'loose_disc' | 'any_disc') => {
                let q = supabase.from('jugadores').select('*').in('carrera_id', allCarreraIds);
                if (mode === 'strict_disc' && m.disciplina_id != null) {
                    q = q.eq('disciplina_id', m.disciplina_id);
                } else if (mode === 'loose_disc' && m.disciplina_id != null) {
                    q = q.or(`disciplina_id.eq.${m.disciplina_id},disciplina_id.is.null`);
                }
                const { data } = await q;
                return (data || []).filter(matchesGeneroPartido);
            };

            let rows = await runCarreraQuery('strict_disc');
            if (rows.length === 0 && m.disciplina_id != null) {
                rows = await runCarreraQuery('loose_disc');
            }
            if (rows.length === 0) {
                rows = await runCarreraQuery('any_disc');
            }

            virtualProcessed = rows.map((j) =>
                toVirtualRow(
                    j,
                    idsA.includes(j.carrera_id) ? 'equipo_a' : 'equipo_b'
                )
            );
        }

        // 2b Por delegacion_id en jugadores (misma fuente que plantilla del equipo — muchas filas solo tienen esto)
        const fetchVirtualByDelegacion = async (
            delegId: number | null | undefined,
            equipo: 'equipo_a' | 'equipo_b'
        ) => {
            if (!delegId) return [] as any[];
            let q = supabase.from('jugadores').select('*').eq('delegacion_id', delegId);
            if (m.disciplina_id != null) {
                q = q.or(`disciplina_id.eq.${m.disciplina_id},disciplina_id.is.null`);
            }
            const { data } = await q;
            return (data || []).filter(matchesGeneroPartido).map((j) => toVirtualRow(j, equipo));
        };

        const [virtDelegA, virtDelegB] = await Promise.all([
            fetchVirtualByDelegacion(delegAid, 'equipo_a'),
            fetchVirtualByDelegacion(delegBid, 'equipo_b'),
        ]);

        const seenVirt = new Set(virtualProcessed.map((x) => x.id));
        for (const row of [...virtDelegA, ...virtDelegB]) {
            if (!seenVirt.has(row.id)) {
                seenVirt.add(row.id);
                virtualProcessed.push(row);
            }
        }

        // 3. MERGE (Priority to Explicit)
        const finalA: any[] = explicitProcessed.filter(j => j.equipo === 'equipo_a');
        const finalB: any[] = explicitProcessed.filter(j => j.equipo === 'equipo_b');
        const seenIds = new Set(explicitProcessed.map(j => j.id));

        virtualProcessed.forEach(v => {
            if (!seenIds.has(v.id)) {
                if (v.equipo === 'equipo_a') finalA.push(v);
                else finalB.push(v);
            }
        });

        const sorter = (a: any, b: any) => a.nombre.localeCompare(b.nombre);
        setJugadoresA(finalA.sort(sorter));
        setJugadoresB(finalB.sort(sorter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

            await Promise.all([fetchJugadores(data as Partido), fetchEventos()]);
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
        const sportName = match.disciplinas?.name || 'Fútbol';
        const finalDetalle = recalculateTotals(sportName, nuevoDetalle);
        
        await supabase.from('partidos')
            .update({ 
                marcador_detalle: auditDetalle(finalDetalle)
            })
            .eq('id', matchId);
        const auditedMin = auditDetalle(finalDetalle);
        setMatch((prev: any) => prev ? ({ ...prev, marcador_detalle: auditedMin }) : null);
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

    // Keep a stable ref to the latest profile so the channel callback can read it
    // without profile being listed as a useEffect dependency (which caused the channel
    // to be torn down + recreated every time profile went null → cached → fresh).
    const profileRef = useRef(profile);
    useEffect(() => { profileRef.current = profile; }, [profile]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const sessionId = Math.random().toString(36).substring(7);
        // Unique channel name per mount — matchId only (not profile) prevents re-creation
        const channel = supabase.channel(`match-presence-${matchId}:${sessionId}`, {
            config: { presence: { key: `${sessionId}` } },
        });

        // Track which sessions we've already toasted so we never double-fire
        const seenJoins = new Set<string>();

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const editors = Object.values(state).flat();
                setActiveEditors(editors.filter((e: any) => e.session_id !== sessionId));
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                newPresences.forEach((p: any) => {
                    if (p.session_id === sessionId) return;        // own session
                    if (seenJoins.has(p.session_id)) return;       // already toasted
                    seenJoins.add(p.session_id);
                    toast.info(`${p.user_name || 'Alguien'} se ha unido a la edición`);
                });
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
                    const p = profileRef.current;
                    await channel.track({
                        user_id: p?.id ?? 'anon',
                        session_id: sessionId,
                        user_name: p?.full_name || (p as any)?.email || 'Staff',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchId]); // ← matchId only; profile is read via profileRef

    // Chronometer interval removed — matches no longer track time minute by minute

    // Handlers
    const toggleCronometro = async (modo: 'en_vivo' | 'asincronico' = 'en_vivo') => {
        if (!match) return;
        try {
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle, estado')
                .eq('id', matchId)
                .single();
            const freshDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};
            const currentEstado = freshMatch?.estado || match.estado;

            if (currentEstado === 'programado') {
                const sportName = match.disciplinas?.name || "";
                const nuevoDetalle = {
                    ...freshDetalle,
                    tiempo_inicio: new Date().toISOString(),
                    estado_cronometro: 'pausado',
                    modo_registro: modo,
                };

                if (sportName === 'Baloncesto' && !nuevoDetalle.cuarto_actual) {
                    nuevoDetalle.cuarto_actual = 1;
                }

                const { error } = await supabase.from('partidos').update({
                    estado: 'en_curso',
                    marcador_detalle: auditDetalle(recalculateTotals(sportName, nuevoDetalle))
                }).eq('id', matchId);

                if (error) throw error;
                registrarEventoSistema('inicio', `Inicio del partido (${modo})`, 0, 1);

                await logAction('UPDATE_MATCH', 'partido', matchId, {
                    nuevo_estado: 'en_curso',
                    modo_registro: modo,
                    info: `Partido iniciado en modo ${modo}`
                });
            }
        } catch (err: any) {
            toast.error('Error al iniciar: ' + err.message);
        }
    };

    const handleNuevoEvento = async (tipo: string, equipo: string, jugador_id: number | null, bypassFinalized = false, overrides?: { minuto?: number; periodo?: number }) => {
        if (!match || !profile) return;
        const disciplinaName = match.disciplinas?.name || 'Deporte';

        if (!bypassFinalized) {
            if (match.estado === 'finalizado' || match.estado === 'cancelado') {
                toast.error('No se pueden registrar eventos en partidos ya finalizados.');
                return;
            }

            if (match.estado !== 'en_curso') {
                if (!(match.estado === 'programado' && tipo === 'cambio')) {
                    toast.error('Solo se pueden registrar eventos de juego en partidos EN CURSO.');
                    return;
                }
            }
        }

        // Block events for expelled players (red card) in Fútbol y Voleibol
        if ((disciplinaName === 'Fútbol' || disciplinaName === 'Voleibol') && jugador_id) {
            const hasRedCard = eventos.some(
                e => e.tipo_evento === 'tarjeta_roja' && e.jugador_id_normalized === jugador_id
            );
            if (hasRedCard) {
                toast.error('Este jugador fue expulsado (tarjeta roja). No se le pueden asignar más eventos.');
                return;
            }
        }

        const periodo = overrides?.periodo ?? getCurrentPeriodNumber(disciplinaName, match.marcador_detalle || {});
        const minutoEvento = overrides?.minuto ?? minutoActual;

        const { error } = await supabase.from('olympics_eventos').insert({
            partido_id: matchId,
            tipo_evento: tipo,
            minuto: minutoEvento,
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

        if (tipo.startsWith('gol') || tipo.startsWith('punto')) {
            let puntos = 1;
            if (tipo === 'punto_2') puntos = 2;
            if (tipo === 'punto_3') puntos = 3;
            const nuevoMarcador = addPoints(disciplinaName, currentDetalle, equipo as any, puntos);
            const auditedPts = auditDetalle(nuevoMarcador);
            await supabase.from('partidos').update({ marcador_detalle: auditedPts }).eq('id', matchId);
            // Optimistic local update so scoreboard re-renders immediately
            setMatch((prev: any) => prev ? { ...prev, marcador_detalle: auditedPts } : null);

            await logAction('UPDATE_SCORE', 'partido', matchId, {
                tipo_evento: tipo,
                equipo: equipo,
                puntos: puntos,
                nuevo_marcador: nuevoMarcador
            });
        } else if (tipo === 'set') {
            // 'set' button = manually advance to next set/period
            const nuevoMarcador = nextPeriod(disciplinaName, currentDetalle);
            const auditedPeriod = auditDetalle(nuevoMarcador);
            await supabase.from('partidos').update({ marcador_detalle: auditedPeriod }).eq('id', matchId);
            setMatch((prev: any) => prev ? { ...prev, marcador_detalle: auditedPeriod } : null);

            await logAction('CHANGE_PERIOD', 'partido', matchId, {
                tipo_evento: 'set',
                equipo: equipo,
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
        const disciplinaName = match.disciplinas?.name || 'Fútbol';
        const equipo: 'equipo_a' | 'equipo_b' = field.endsWith('_a') ? 'equipo_a' : 'equipo_b';
        
        const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
        const currentDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};
        
        // Use the scoring engine to set points correctly according to the sport's structure
        const finalDetalle = setPoints(disciplinaName, currentDetalle, equipo, value);
        const auditedScore = auditDetalle(finalDetalle);

        await supabase.from('partidos').update({
            marcador_detalle: auditedScore
        }).eq('id', matchId);

        setMatch((prev: any) => prev ? ({ ...prev, marcador_detalle: auditedScore }) : null);

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
                const audited = auditDetalle(detalleFinal);
                
                const { error } = await supabase.from('partidos').update({ marcador_detalle: audited }).eq('id', matchId);
                
                if (error) {
                    toast.error("Error al guardar: " + error.message);
                    return;
                }

                setMatch((prev: any) => prev ? ({ ...prev, marcador_detalle: audited }) : null);
                setMinutoActual(nuevoMinuto);
                registrarEventoSistema('periodo', mensaje);
                await logAction('CHANGE_PERIOD', 'partido', matchId, { mensaje });
                toast.success(mensaje);
            }
        } catch (err: any) {
            toast.error('Error al cambiar período: ' + err.message);
        }
    };

    const handleCambiarFaseFutbol = async (fase: 'primer_tiempo' | 'entretiempo' | 'segundo_tiempo') => {
        if (!match || !profile) return;
        try {
            const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
            const detalle = { ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}) };

            let detalleFinal: any;
            let mensaje = '';

            if (fase === 'primer_tiempo') {
                detalleFinal = { ...detalle, tiempo_actual: 1, fase_futbol: 'primer_tiempo' };
                mensaje = '1º Tiempo';
            } else if (fase === 'entretiempo') {
                detalleFinal = { ...detalle, fase_futbol: 'entretiempo' };
                mensaje = 'Entretiempo';
            } else {
                detalleFinal = { ...detalle, tiempo_actual: 2, fase_futbol: 'segundo_tiempo' };
                mensaje = '2º Tiempo';
            }

            await supabase.from('partidos').update({ marcador_detalle: auditDetalle(detalleFinal) }).eq('id', matchId);
            setMatch((prev: any) => prev ? ({ ...prev, marcador_detalle: auditDetalle(detalleFinal) }) : null);
            registrarEventoSistema('periodo', mensaje);
            await logAction('CHANGE_PERIOD', 'partido', matchId, { mensaje });
            toast.success(mensaje);
        } catch (err: any) {
            toast.error('Error al cambiar fase: ' + err.message);
        }
    };

    const handleCambiarSetDirecto = async (setNum: number, puntosA: number, puntosB: number) => {
        if (!match || !profile) return;
        try {
            const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
            const detalle = { ...(freshMatch?.marcador_detalle || match.marcador_detalle || {}) };
            const currentSetNum = detalle.set_actual || 1;

            // Save confirmed scores for the set being closed
            const updatedSets = {
                ...(detalle.sets || {}),
                [currentSetNum]: { puntos_a: puntosA, puntos_b: puntosB }
            };

            // Recalculate sets won from all sets
            let sets_a = 0;
            let sets_b = 0;
            Object.values(updatedSets).forEach((s: any) => {
                if (s.puntos_a > s.puntos_b) sets_a++;
                else if (s.puntos_b > s.puntos_a) sets_b++;
            });

            detalle.sets = updatedSets;
            detalle.sets_a = sets_a;
            detalle.sets_b = sets_b;
            // Sync all score aliases so getCurrentScore (reads sets_total_a first)
            // and sport-helpers standings (reads goles_a first) both return the
            // correct winner regardless of any prior recalculateTotals call.
            detalle.sets_total_a = sets_a;
            detalle.sets_total_b = sets_b;
            // goles_a/b → standings winner: reflects the deciding set's final score
            // (in best-of-3 the deciding set winner == match winner, always)
            detalle.goles_a = puntosA;
            detalle.goles_b = puntosB;

            // If a team has won 2 sets, the match is over — finalize immediately
            if (sets_a >= 2 || sets_b >= 2) {
                detalle.estado_cronometro = 'detenido';
                const auditedFin = auditDetalle(detalle);
                await supabase.from('partidos').update({
                    estado: 'finalizado',
                    marcador_detalle: auditedFin
                }).eq('id', matchId);
                invalidateCache('admin-partidos');
                setMatch((prev: any) => (prev ? { ...prev, estado: 'finalizado', marcador_detalle: auditedFin } : null));
                registrarEventoSistema('fin', `Partido finalizado — ${sets_a}-${sets_b} en sets`);
                await logAction('UPDATE_MATCH', 'partido', matchId, {
                    nuevo_estado: 'finalizado',
                    marcador_final: detalle
                });
                toast.success(`¡Partido finalizado! ${sets_a}–${sets_b} en sets`);
                return;
            }

            // Otherwise advance to the next set
            detalle.set_actual = setNum;

            const auditedSet = auditDetalle(detalle);
            await supabase.from('partidos').update({ marcador_detalle: auditedSet }).eq('id', matchId);
            setMatch((prev: any) => (prev ? { ...prev, marcador_detalle: auditedSet } : null));
            registrarEventoSistema('periodo', `Set ${setNum}`);
            await logAction('CHANGE_PERIOD', 'partido', matchId, {
                mensaje: `Set ${setNum}`,
                set_cerrado: currentSetNum,
                puntos_a: puntosA,
                puntos_b: puntosB
            });
            toast.success(`Set ${setNum}`);
        } catch (err: any) {
            toast.error('Error al cambiar set: ' + err.message);
        }
    };

    const toggleModoRegistro = async () => {
        if (!match || !profile) return;
        try {
            const { data: freshMatch } = await supabase
                .from('partidos')
                .select('marcador_detalle')
                .eq('id', matchId)
                .single();
            const detalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};
            const currentMode = detalle.modo_registro || 'en_vivo';
            const newMode = currentMode === 'en_vivo' ? 'asincronico' : 'en_vivo';

            const nuevoDetalle = {
                ...detalle,
                modo_registro: newMode,
                ultimo_update: new Date().toISOString()
            };

            const auditedModo = auditDetalle(nuevoDetalle);
            await supabase.from('partidos').update({
                marcador_detalle: auditedModo
            }).eq('id', matchId);

            setMatch((prev: any) => prev ? ({ ...prev, marcador_detalle: auditedModo }) : null);
            registrarEventoSistema('modo_cambio', `Modo cambiado a ${newMode === 'en_vivo' ? 'En Vivo' : 'Asincrónico'}`);

            await logAction('UPDATE_MATCH', 'partido', matchId, {
                cambio: 'modo_registro',
                anterior: currentMode,
                nuevo: newMode
            });

            toast.success(`Modo cambiado a ${newMode === 'en_vivo' ? 'En Vivo 📡' : 'Asincrónico 🕐'}`);
        } catch (err: any) {
            toast.error('Error al cambiar modo: ' + err.message);
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

        const sportName = match.disciplinas?.name || 'Fútbol';
        // Skip recalculation for async matches — scores were set manually
        const finalDetalle = nuevoDetalle.modo_registro === 'asincronico'
            ? nuevoDetalle
            : recalculateTotals(sportName, nuevoDetalle);

        const { error } = await supabase.from('partidos').update({
            estado: 'finalizado',
            marcador_detalle: auditDetalle(finalDetalle)
        }).eq('id', matchId);

        if (!error) {
            invalidateCache('admin-partidos');
            registrarEventoSistema('fin', 'Partido finalizado oficialmente');

            // Log Action
            await logAction('UPDATE_MATCH', 'partido', matchId, {
                nuevo_estado: 'finalizado',
                marcador_final: finalDetalle
            });

            // Auto-advance: if all matches in this phase are now finalized, advance to next round
            try {
                const autoAdvRes = await fetch('/api/admin/auto-advance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        partido_id: matchId,
                        disciplina_id: match.disciplina_id,
                        genero: match.genero,
                    }),
                });
                const autoAdvData = await autoAdvRes.json();
                if (autoAdvData.advanced && autoAdvData.next_fase) {
                    toast.success(`🏆 ${autoAdvData.message}`);
                }
            } catch (advErr: any) {
                // Silently fail — match finalization already succeeded
                console.warn('Auto-advance failed (non-critical):', advErr.message);
            }

            toast.success("Partido finalizado");
            return true;
        } else {
            console.error("Match finalization error:", error);
            toast.error("Error al finalizar el partido: " + error.message);
            return false;
        }
    };

    const finalizarPorWO = async (equipo_ganador: 'equipo_a' | 'equipo_b') => {
        if (!match || !profile) return;

        const sportName = match.disciplinas?.name || 'Fútbol';
        const WO_SCORES: Record<string, any> = {
            'Fútbol': { winner: { goles_a: 3, goles_b: 0 }, loser: { goles_a: 0, goles_b: 3 } },
            'Baloncesto': { winner: { total_a: 20, total_b: 0 }, loser: { total_a: 0, total_b: 20 } },
            'Voleibol': {
                winner: { sets_a: 2, sets_b: 0, sets: { 1: { puntos_a: 25, puntos_b: 0 }, 2: { puntos_a: 25, puntos_b: 0 } } },
                loser: { sets_a: 0, sets_b: 2, sets: { 1: { puntos_a: 0, puntos_b: 25 }, 2: { puntos_a: 0, puntos_b: 25 } } }
            },
            'Tenis': {
                winner: { sets_a: 2, sets_b: 0, sets: { 1: { juegos_a: 6, juegos_b: 0 }, 2: { juegos_a: 6, juegos_b: 0 } } },
                loser: { sets_a: 0, sets_b: 2, sets: { 1: { juegos_a: 0, juegos_b: 6 }, 2: { juegos_a: 0, juegos_b: 6 } } }
            },
        };

        const woScores = WO_SCORES[sportName] || WO_SCORES['Fútbol'];
        const marcador_detalle = equipo_ganador === 'equipo_a' ? woScores.winner : woScores.loser;

        const { error } = await supabase.from('partidos').update({
            estado: 'finalizado',
            marcador_detalle: auditDetalle(marcador_detalle)
        }).eq('id', matchId);

        if (!error) {
            invalidateCache('admin-partidos');
            registrarEventoSistema('fin', `Partido finalizado por W.O. — ${equipo_ganador === 'equipo_a' ? match.equipo_a : match.equipo_b} gana`);

            await logAction('UPDATE_MATCH', 'partido', matchId, {
                nuevo_estado: 'finalizado',
                motivo: 'W.O.',
                ganador: equipo_ganador,
                marcador_final: marcador_detalle
            });

            toast.success(`Partido finalizado por W.O. — ${equipo_ganador === 'equipo_a' ? match.equipo_a : match.equipo_b} gana`);
            return true;
        } else {
            console.error("WO finalization error:", error);
            toast.error("Error al finalizar por W.O.: " + error.message);
            return false;
        }
    };

    const handleBulkBasketballStats = async (
        equipo: 'equipo_a' | 'equipo_b',
        jugador_id: number | null,
        totalPuntos: number,
        triples: number,
        dobles: number
    ) => {
        if (!match || !profile) return;

        const libres = totalPuntos - triples * 3 - dobles * 2;
        if (libres < 0) {
            toast.error('Los dobles y triples superan el total de puntos.');
            return;
        }
        if (totalPuntos === 0) {
            toast.error('Ingresa al menos 1 punto.');
            return;
        }

        const periodo = getCurrentPeriodNumber('Baloncesto', match.marcador_detalle || {});
        const baseEvent = {
            partido_id: matchId,
            minuto: 0,
            equipo,
            jugador_id_normalized: jugador_id,
            periodo,
            descripcion: stampEventAudit('Carga por lotes', profile),
        };

        const eventRows: any[] = [
            ...Array.from({ length: triples }, () => ({ ...baseEvent, tipo_evento: 'punto_3' })),
            ...Array.from({ length: dobles }, () => ({ ...baseEvent, tipo_evento: 'punto_2' })),
            ...Array.from({ length: libres }, () => ({ ...baseEvent, tipo_evento: 'punto_1' })),
        ];

        const { error: evErr } = await supabase.from('olympics_eventos').insert(eventRows);
        if (evErr) {
            toast.error('Error al registrar eventos: ' + evErr.message);
            return;
        }

        const { data: freshMatch } = await supabase.from('partidos').select('marcador_detalle').eq('id', matchId).single();
        const currentDetalle = freshMatch?.marcador_detalle || match.marcador_detalle || {};
        const nuevoMarcador = addPoints('Baloncesto', currentDetalle, equipo, totalPuntos);
        const auditedBulk = auditDetalle(nuevoMarcador);
        await supabase.from('partidos').update({ marcador_detalle: auditedBulk }).eq('id', matchId);
        setMatch((prev: any) => prev ? { ...prev, marcador_detalle: auditedBulk } : null);

        await logAction('UPDATE_SCORE', 'partido', matchId, {
            tipo_evento: 'bulk_basketball',
            equipo, jugador_id, totalPuntos, triples, dobles, libres,
        });

        fetchEventos();
        toast.success(`+${totalPuntos} pts — ${triples}×3, ${dobles}×2, ${libres}×1`);
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
        toggleModoRegistro,
        handleNuevoEvento,
        handleBulkBasketballStats,
        handleManualScoreUpdate,
        handleCambiarPeriodo,
        handleCambiarFaseFutbol,
        handleCambiarSetDirecto,
        confirmarFinalizar,
        finalizarPorWO,
        requestDeleteEvento,
        fetchJugadores,
        fetchEventos,
        fetchMatchDetails
    };
}
