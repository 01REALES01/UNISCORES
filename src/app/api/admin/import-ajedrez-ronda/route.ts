import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { parseScheduleExcel } from '@/lib/schedule-parser';
import type { ScheduleMatch } from '@/lib/schedule-parser';
import { parseAjedrezSimpleTable } from '@/lib/ajedrez-round-parser';
import { AjedrezService } from '@/modules/sports/services/ajedrez.service';

export const maxDuration = 120;

const ajedrezEngine = new AjedrezService();

function marcadorDetalleForRow(m: ScheduleMatch): Record<string, unknown> {
  const base = AjedrezService.initDetalle(1);
  if (!m.ajedrez_resultado) {
    return base as unknown as Record<string, unknown>;
  }
  const d = ajedrezEngine.setRondaResult(base, m.ajedrez_resultado) as {
    total_a: number;
    total_b: number;
    ronda_actual: number;
    total_rondas: number;
    rondas: Record<string, { resultado: string | null }>;
  };
  const resultado_final =
    d.total_a > d.total_b ? 'victoria_a' : d.total_b > d.total_a ? 'victoria_b' : 'empate';
  return { ...d, resultado_final } as Record<string, unknown>;
}

function bestMatch(candidates: { nombre: string }[], searchName: string) {
  const searchWords = searchName.toUpperCase().split(/\s+/).filter(Boolean);
  let best: (typeof candidates)[0] | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const dbWords = c.nombre.toUpperCase().split(/\s+/);
    const matched = searchWords.filter((w) => dbWords.some((d) => d === w)).length;
    const score = matched / Math.max(searchWords.length, dbWords.length);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore > 0.35 ? best : null;
}

async function findJugadorAjedrez(
  supabase: Awaited<ReturnType<typeof createRouteSupabase>>,
  playerName: string,
  ajedrezDisciplinaId: number
) {
  const name = playerName.trim();
  const words = name.split(/\s+/).sort((a, b) => b.length - a.length);
  const [w1, w2] = words;
  const cols = 'id, nombre, profile_id, carrera_id';

  if (w1 && w2) {
    const { data } = await supabase
      .from('jugadores')
      .select(cols)
      .eq('disciplina_id', ajedrezDisciplinaId)
      .ilike('nombre', `%${w1}%`)
      .ilike('nombre', `%${w2}%`)
      .limit(8);
    if (data?.length === 1) return data[0];
    if (data && data.length > 1) return bestMatch(data, name);
  }

  if (w1 && w2) {
    const { data } = await supabase
      .from('jugadores')
      .select(cols)
      .ilike('nombre', `%${w1}%`)
      .ilike('nombre', `%${w2}%`)
      .limit(8);
    if (data?.length === 1) return data[0];
    if (data && data.length > 1) return bestMatch(data, name);
  }

  if (w1 && w2) {
    const { data: pros } = await supabase
      .from('profiles')
      .select('id, full_name, carrera_id')
      .ilike('full_name', `%${w1}%`)
      .ilike('full_name', `%${w2}%`)
      .limit(8);
    const pickProfile = (): { id: string; carrera_id: number | null } | null => {
      if (pros?.length === 1) return pros[0];
      if (pros && pros.length > 1) {
        const best = bestMatch(
          pros.map((p) => ({ nombre: p.full_name || '' })),
          name
        );
        if (best) {
          const p = pros.find((x) => x.full_name === best.nombre);
          if (p) return p;
        }
      }
      return null;
    };
    const prof = pickProfile();
    if (prof) {
      const { data: byProf } = await supabase
        .from('jugadores')
        .select(cols)
        .eq('disciplina_id', ajedrezDisciplinaId)
        .eq('profile_id', prof.id)
        .maybeSingle();
      if (byProf) return byProf;
      return { profile_id: prof.id, carrera_id: prof.carrera_id } as {
        profile_id: string;
        carrera_id: number | null;
      };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, roles')
      .eq('id', user.id)
      .single();

    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
      return NextResponse.json({ error: 'Sin permisos para importar' }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Error al leer el formulario' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'Solo se aceptan archivos .xlsx o .xls' }, { status: 400 });
    }

    const numeroRonda = Math.max(1, parseInt(String(formData.get('numero_ronda') || '1'), 10) || 1);
    const generoRaw = String(formData.get('genero') || 'masculino').toLowerCase();
    const genero: 'masculino' | 'femenino' | 'mixto' =
      generoRaw === 'femenino' ? 'femenino' : generoRaw === 'mixto' ? 'mixto' : 'masculino';
    const dryRun = formData.get('dry_run') === 'true';

    const buffer = Buffer.from(await file.arrayBuffer());

    const parsed = parseScheduleExcel(buffer);
    let chessMatches = parsed.matches.filter((m) => m.sport === 'Ajedrez');

    const simpleErrors: Array<{ sheet: string; row: number; message: string }> = [];
    if (chessMatches.length === 0) {
      const roundLabel = `Ronda ${numeroRonda}`;
      const { matches: simpleMatches, errors: se } = parseAjedrezSimpleTable(buffer, {
        genero,
        roundLabel,
        defaultVenue: 'Por definir',
        defaultTimestamp: '2026-04-17T09:00:00-05:00',
      });
      simpleErrors.push(...se);
      chessMatches = simpleMatches;
    }

    const parseErrors = [...parsed.errors, ...simpleErrors];

    if (chessMatches.length === 0) {
      return NextResponse.json(
        {
          error:
            'No se encontraron emparejamientos de Ajedrez. Usa el Calendario (hoja POR DIA GENERAL) o una tabla con columnas Blancas/Negras o White/Black (export emparejamientos).',
          parse_errors: parseErrors,
        },
        { status: 400 }
      );
    }

    const { data: discRow } = await supabase
      .from('disciplinas')
      .select('id')
      .eq('name', 'Ajedrez')
      .maybeSingle();

    if (!discRow?.id) {
      return NextResponse.json({ error: 'Disciplina Ajedrez no encontrada' }, { status: 400 });
    }
    const ajedrezId = discRow.id;

    const faseSwiss = `ronda_torneo_${numeroRonda}`;

    const first = chessMatches[0];
    const jornadaNombre = `Ronda ${numeroRonda}`;

    if (dryRun) {
      return NextResponse.json({
        dry_run: true,
        matches_found: chessMatches.length,
        numero_ronda: numeroRonda,
        genero,
        fase: faseSwiss,
        sample: chessMatches.slice(0, 5).map((m) => ({
          slot_a: m.slot_a,
          slot_b: m.slot_b,
          fecha: m.scheduled_at,
          lugar: m.venue,
          resultado_excel: m.ajedrez_resultado ?? null,
        })),
        parse_errors: parseErrors,
      });
    }

    // Reuse existing "Jornada Única" (mixto, numero=1) instead of creating per-round jornadas.
    // All ajedrez partidos appear there since the public page queries by disciplina_id only.
    const { data: existingJornada } = await supabase
      .from('jornadas')
      .select('id')
      .eq('disciplina_id', ajedrezId)
      .order('numero', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!existingJornada) {
      const { error: jornadaErr } = await supabase.from('jornadas').upsert(
        {
          disciplina_id: ajedrezId,
          genero: 'mixto',
          numero: 1,
          nombre: 'Jornada Única',
          scheduled_at: first.scheduled_at,
          lugar: first.venue || 'Por definir',
        },
        { onConflict: 'disciplina_id,genero,numero' }
      );
      if (jornadaErr) {
        return NextResponse.json({ error: `Jornada: ${jornadaErr.message}` }, { status: 500 });
      }
    }

    let created = 0;
    let skipped = 0;
    const commitErrors: string[] = [];
    const rosterErrors: string[] = [];
    let rosterRows = 0;
    let linkedProfiles = 0;

    for (const m of chessMatches) {
      const genInsert = genero;

      const { data: existing } = await supabase
        .from('partidos')
        .select('id')
        .eq('disciplina_id', ajedrezId)
        .eq('genero', genInsert)
        .eq('fecha', m.scheduled_at)
        .eq('equipo_a', m.slot_a)
        .eq('equipo_b', m.slot_b)
        .eq('fase', faseSwiss)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const conResultado = Boolean(m.ajedrez_resultado);
      const { data: inserted, error: insErr } = await supabase
        .from('partidos')
        .insert({
          disciplina_id: ajedrezId,
          genero: genInsert,
          equipo_a: m.slot_a,
          equipo_b: m.slot_b,
          fecha: m.scheduled_at,
          estado: conResultado ? 'finalizado' : 'programado',
          fase: faseSwiss,
          grupo: m.group_or_bracket || String(numeroRonda),
          lugar: m.venue || first.venue || 'Por definir',
          carrera_a_ids: [],
          carrera_b_ids: [],
          marcador_detalle: marcadorDetalleForRow(m),
        })
        .select('id, equipo_a, equipo_b')
        .single();

      if (insErr || !inserted) {
        commitErrors.push(`Fila ~${m.row}: ${insErr?.message || 'insert falló'}`);
        continue;
      }
      created++;

      const [ja, jb] = await Promise.all([
        findJugadorAjedrez(supabase, inserted.equipo_a, ajedrezId),
        findJugadorAjedrez(supabase, inserted.equipo_b, ajedrezId),
      ]);

      for (const [jugador, slot] of [
        [ja, 'equipo_a'],
        [jb, 'equipo_b'],
      ] as const) {
        if (jugador && 'id' in jugador && jugador.id) {
          const { error: rErr } = await supabase.from('roster_partido').upsert(
            {
              partido_id: inserted.id,
              jugador_id: jugador.id,
              equipo_a_or_b: slot,
            },
            { onConflict: 'partido_id,jugador_id,equipo_a_or_b' }
          );
          if (!rErr) rosterRows++;
          else rosterErrors.push(`Roster ${slot} partido ${inserted.id}: ${rErr.message}`);
        } else {
          const name = slot === 'equipo_a' ? inserted.equipo_a : inserted.equipo_b;
          rosterErrors.push(`${name}: jugador no encontrado`);
        }
      }

      const fk: Record<string, unknown> = {};
      if (ja && 'profile_id' in ja && ja.profile_id) fk.athlete_a_id = ja.profile_id;
      if (ja && 'carrera_id' in ja && ja.carrera_id) fk.carrera_a_id = String(ja.carrera_id);
      if (jb && 'profile_id' in jb && jb.profile_id) fk.athlete_b_id = jb.profile_id;
      if (jb && 'carrera_id' in jb && jb.carrera_id) fk.carrera_b_id = String(jb.carrera_id);

      if (Object.keys(fk).length > 0) {
        linkedProfiles++;
        const { error: uErr } = await supabase.from('partidos').update(fk).eq('id', inserted.id);
        if (uErr) rosterErrors.push(`FK partido ${inserted.id}: ${uErr.message}`);
      }
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      admin_name: profile?.full_name ?? '',
      admin_email: '',
      action_type: 'AJEDREZ_RONDA_IMPORT',
      entity_type: 'partidos',
      entity_id: String(numeroRonda),
      details: {
        filename: file.name,
        numero_ronda: numeroRonda,
        created,
        skipped,
        roster_rows: rosterRows,
      },
    });

    return NextResponse.json({
      success: true,
      partidos_creados: created,
      partidos_skipped: skipped,
      numero_ronda: numeroRonda,
      genero,
      fase: faseSwiss,
      roster_rows: rosterRows,
      perfiles_vinculados: linkedProfiles,
      parse_errors: parseErrors,
      commit_errors: commitErrors,
      roster_unlinked: rosterErrors.slice(0, 200),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('import-ajedrez-ronda', err);
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 });
  }
}
