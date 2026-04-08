import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Complete bracket data from CUADROS OLIMPIADAS UN.xlsx ──────────────────
// Source: Extracted via Python from Excel files, 2026-04-05
// Each entry is in correct bracket_order from the CUADROS draw.
// 'BYE' entries = seeds who advance automatically.
// All entries go into fase='primera_ronda' for correct visual bracket display.

type BracketEntry = { a: string; b: string };

// INTERMEDIO MASCULINO — 32 bracket positions (27 matches + 5 seeds)
const BRACKET_INT_M: BracketEntry[] = [
  /* 0 */ { a: 'E. CABRERA JANER', b: 'BYE' },
  /* 1 */ { a: 'SANTIAGO ZAPATA', b: 'JUAN SEBASTIAN GOMEZ' },
  /* 2 */ { a: 'SANTIAGO GOMEZ ANGEL', b: 'LUIS ANGEL OCAMPO' },
  /* 3 */ { a: 'SAMUEL SALAZAR', b: 'BYE' },
  /* 4 */ { a: 'RUBEN ESGUERRA', b: 'BYE' },
  /* 5 */ { a: 'JUAN MIGUEL BARRIGAS', b: 'SANTIAGO TORO' },
  /* 6 */ { a: 'PABLO RAMIREZ GOMEZ', b: 'ALEJANDRO RAMIREZ' },
  /* 7 */ { a: 'MATEO CHANG NOGUERA', b: 'SANTIAGO SERNA' },
  /* 8 */ { a: 'JOSHUA ALFONSO SOTO', b: 'NICOLAS VELEZ ARTEAGA' },
  /* 9 */ { a: 'ALEJANDRO CARDONA', b: 'MATIAS GOMEZ M' },
  /*10 */ { a: 'SANTIAGO TORRES', b: 'MATIAS QUINTERO' },
  /*11 */ { a: 'JUAN PABLO BUSTILLO', b: 'BYE' },
  /*12 */ { a: 'SAMUEL ARBOLEDA', b: 'ESTEBAN HERRERA Q' },
  /*13 */ { a: 'ALEJANDRO LOPEZ Q', b: 'SANTIAGO CHICA R' },
  /*14 */ { a: 'DAVID MOLINA CASTRO', b: 'SEBASTIAN CASTAÑEDA' },
  /*15 */ { a: 'SEBASTIAN RODRIGUEZ', b: 'JUAN SEBASTIAN OSORNO' },
  /*16 */ { a: 'SANTIAGO GOMEZ', b: 'JUAN SEBASTIAN OROZCO' },
  /*17 */ { a: 'ALEJANDRO HENRIQUEZ', b: 'JULIAN FERNANDEZ T' },
  /*18 */ { a: 'DUVAN OCHOA MOLINA', b: 'DANIEL FERNANDEZ N' },
  /*19 */ { a: 'ESTEBAN CACERES', b: 'SANTIAGO LOPEZ A' },
  /*20 */ { a: 'ALVARO CUMPLIDO D', b: 'ANDRES HOYOS GOMEZ' },
  /*21 */ { a: 'CARLOS PORTO TORRES', b: 'CESAR BARRIOS C' },
  /*22 */ { a: 'JUAN DAVID PRIETO', b: 'RICARDO RAMOS GARCIA' },
  /*23 */ { a: 'NICOLAS MUVDI RDZ', b: 'LUIS DAVID ROBLES' },
  /*24 */ { a: 'ALEJANDRO CIENFUEGOS', b: 'JUAN CARRASQUILLA E' },
  /*25 */ { a: 'OSKLEIDERBETH VASQUEZ', b: 'SEBASTIAN SILVERA P' },
  /*26 */ { a: 'JUAN CALDERON ARROYO', b: 'ALEJANDRO HERNANDEZ' },
  /*27 */ { a: 'KAREL SILVA ACUÑA', b: 'LUIS ANTONIO RUIZ F' },
  /*28 */ { a: 'VICTOR MEDINA M', b: 'VICTOR PUGLIESE M' },
  /*29 */ { a: 'SAMUEL COLLAZOS H', b: 'ALEJANDRO AGUILERA D' },
  /*30 */ { a: 'CRISTIAN FAJARDO', b: 'ALFREDO LAMBRAÑO L' },
  /*31 */ { a: 'MAX LORDUY', b: 'BYE' },
];

// INTERMEDIO FEMENINO — 15 bracket positions (8 matches + 7 seeds)
// Seeds use full names from CUADROS participant list for better DB matching.
// Match 14: CAMILA vs MARIA D from PROGRAMACION (replaces two BYE seeds in CUADROS).
const BRACKET_INT_F: BracketEntry[] = [
  /* 0 */ { a: 'ANTONELLA SHEEN GAMARRA', b: 'BYE' },
  /* 1 */ { a: 'SMUNI MARIANNE GECHEN', b: 'VALERIA GONZALEZ' },
  /* 2 */ { a: 'NATALY LOPEZ', b: 'BYE' },
  /* 3 */ { a: 'MARIANA G MARCHENA', b: 'MARIA CAMILA OSORNO' },
  /* 4 */ { a: 'ANGELINA PEREZ AHUMADA', b: 'BYE' },
  /* 5 */ { a: 'VALENTINA MAESTRE', b: 'DANIELA RODRIGUEZ' },
  /* 6 */ { a: 'ELAINE CRISTINA GONZALEZ MOLANO', b: 'BYE' },
  /* 7 */ { a: 'CATALINA M MARTINEZ', b: 'GABRIELA SOFIA YEPEZ' },
  /* 8 */ { a: 'JULIANA C VASQUEZ', b: 'AILEEN YULIETH FRANCO' },
  /* 9 */ { a: 'SARA SUSANA SALCEDO CUETO', b: 'BYE' },
  /*10 */ { a: 'MARIA GABRIELA REY', b: 'VALENTINA BATISTA' },
  /*11 */ { a: 'ISABELLA MORENO CAMARGO', b: 'BYE' },
  /*12 */ { a: 'LUISA F TORRES', b: 'LAURA DANIELA JINETE' },
  /*13 */ { a: 'ANA MARIA IDARRAGA ROCA', b: 'BYE' },
  /*14 */ { a: 'CAMILA DELGADO BELTRAN', b: 'MARIA D RESTREPO' },
];

// AVANZADO MASCULINO — 16 bracket positions (5 matches + 11 seeds)
const BRACKET_AVA_M: BracketEntry[] = [
  /* 0 */ { a: 'ANDRES RODRIGUEZ', b: 'BYE' },
  /* 1 */ { a: 'OSCAR PUPO', b: 'BRAYAM PADILLA' },
  /* 2 */ { a: 'LUCAS LLINAS', b: 'BYE' },
  /* 3 */ { a: 'ALVARO RAMIREZ', b: 'BYE' },
  /* 4 */ { a: 'DAVID BAENA', b: 'BYE' },
  /* 5 */ { a: 'JUAN RUIZ', b: 'JUAN ROMERO' },
  /* 6 */ { a: 'HERNANDO CONTRERAS', b: 'ALEJANDRO AMAYA' },
  /* 7 */ { a: 'YANNI MACRIDIS', b: 'BYE' },
  /* 8 */ { a: 'ANDRES ZAPATA', b: 'BYE' },
  /* 9 */ { a: 'FEDERICO ROJAS', b: 'SEBASTIAN POLANCO' },
  /*10 */ { a: 'DANIEL HERNANDEZ', b: 'DANIEL CORDOBA' },
  /*11 */ { a: 'JUAN PABLO SANCHEZ', b: 'BYE' },
  /*12 */ { a: 'JUAN POLO', b: 'BYE' },
  /*13 */ { a: 'SEBASTIAN VALLEJO', b: 'BYE' },
  /*14 */ { a: 'FERNANDO BARRIOS', b: 'BYE' },
  /*15 */ { a: 'MATEO GONZALEZ', b: 'BYE' },
];

// Avanzado Femenino — Round Robin (no bracket, just group matches)
const AVANZADO_FEMENINO_GRUPOS: { match: string; grupo: string }[] = [
  { match: 'MARIANA ARZUAGA VS ISABELLA GAONA', grupo: 'A' },
  { match: 'ADRIANA GARCIA VS STEFANY LOPEZ', grupo: 'B' },
  { match: 'NATALIA GUTIERREZ VS MARIA CAMARGO', grupo: 'C' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMatch(str: string): { a: string; b: string } | null {
  const parts = str.split(/\s+VS\s+/i);
  if (parts.length !== 2) return null;
  return { a: parts[0].trim(), b: parts[1].trim() };
}

function buildMarcador() {
  return {
    set_actual: 1,
    sets_a: 0, sets_b: 0,
    match_format: 'propset_8games',
    sets: {
      1: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
      2: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
      3: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
    },
    games_a: 0, games_b: 0, goles_a: 0, goles_b: 0,
  };
}

function bestMatch(candidates: any[], searchName: string) {
  const searchWords = searchName.toUpperCase().split(/\s+/);
  let best: any = null;
  let bestScore = 0;
  for (const c of candidates) {
    const dbWords = c.nombre.toUpperCase().split(/\s+/);
    const matched = searchWords.filter((w: string) => dbWords.some((d: string) => d === w)).length;
    // Normalize by the larger word count to penalize names with extra words
    // "ANDRES RODRIGUEZ" vs "NICOLAS ANDRES MUVDI RODRIGUEZ" → 2/4 = 0.5
    // "ANDRES RODRIGUEZ" vs "ANDRES RODRIGUEZ"               → 2/2 = 1.0
    const score = matched / Math.max(searchWords.length, dbWords.length);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore > 0 ? best : null;
}

// Find jugador by name — uses two longest words as AND filter, then scores.
// Returns { id, nombre, profile_id, carrera_id } for FK linking on partidos.
async function findJugador(supabase: any, playerName: string, _discId: number) {
  if (!playerName || playerName.toUpperCase() === 'BYE' || playerName === 'TBD') {
    return null;
  }

  const name = playerName.trim();
  const words = name.split(/\s+/).sort((a: string, b: string) => b.length - a.length);
  const [w1, w2] = words;

  const cols = 'id, nombre, profile_id, carrera_id';

  // 1. Try AND search with 2 longest words
  if (w1 && w2) {
    const { data } = await supabase
      .from('jugadores')
      .select(cols)
      .ilike('nombre', `%${w1}%`)
      .ilike('nombre', `%${w2}%`)
      .limit(5);
    if (data?.length === 1) return data[0];
    if (data?.length > 1) return bestMatch(data, name);
  }

  // 2. Fallback: just longest word, pick best scoring match
  if (w1) {
    const { data } = await supabase
      .from('jugadores')
      .select(cols)
      .ilike('nombre', `%${w1}%`)
      .limit(10);
    if (data?.length) return bestMatch(data, name);
  }

  return null;
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get Tenis disciplina_id
    const { data: disc, error: discError } = await supabase
      .from('disciplinas')
      .select('id')
      .ilike('name', 'Tenis')
      .single();

    if (discError || !disc) {
      return NextResponse.json({ error: 'Disciplina "Tenis" no encontrada en la DB' }, { status: 400 });
    }

    const disciplina_id = disc.id;
    const lugar = 'Canchas de Tenis';
    const fecha = '2026-04-09T08:00:00';

    // Build all matches to insert
    const toInsert: object[] = [];

    // Push full bracket into toInsert — creates ALL rounds upfront so auto-advance
    // has pre-existing slots to fill. Rounds after octavos start as TBD.
    //
    // primera_ronda: ALL entries (seeds=finalizado, real matches=programado)
    // octavos:       pre-filled with seed names where applicable, rest TBD
    // cuartos:       all TBD
    // semifinal:     all TBD
    // final:         1 TBD slot
    function pushBracketWithOctavos(bracket: BracketEntry[], genero: string, categoria: string) {
      const octavosCount  = Math.ceil(bracket.length / 2);
      const cuartosCount  = Math.ceil(octavosCount / 2);
      const semifinalCount = Math.ceil(cuartosCount / 2);

      // Step 1: All primera_ronda entries (seeds auto-finalized)
      bracket.forEach((entry, idx) => {
        const isSeed = entry.b.toUpperCase() === 'BYE';
        toInsert.push({
          disciplina_id, genero, categoria,
          equipo_a: entry.a, equipo_b: entry.b,
          estado: isSeed ? 'finalizado' : 'programado',
          lugar, fecha,
          fase: 'primera_ronda',
          bracket_order: idx,
          marcador_detalle: isSeed
            ? { ...buildMarcador(), sets_a: 2, sets_b: 0 }
            : buildMarcador(),
        });
      });

      // Step 2: Octavos — pre-fill seeds that already advanced, rest TBD
      for (let i = 0; i < octavosCount; i++) {
        const slotA = bracket[i * 2];
        const slotB = bracket[i * 2 + 1];
        const seedA = slotA?.b.toUpperCase() === 'BYE' ? slotA.a : 'TBD';
        const seedB = slotB?.b.toUpperCase() === 'BYE' ? slotB.a : 'TBD';
        toInsert.push({
          disciplina_id, genero, categoria,
          equipo_a: seedA, equipo_b: seedB || 'TBD',
          estado: 'programado', lugar, fecha,
          fase: 'octavos', bracket_order: i,
          marcador_detalle: buildMarcador(),
        });
      }

      // Step 3: Cuartos — all TBD (auto-advance fills from octavos winners)
      for (let i = 0; i < cuartosCount; i++) {
        toInsert.push({
          disciplina_id, genero, categoria,
          equipo_a: 'TBD', equipo_b: 'TBD',
          estado: 'programado', lugar, fecha,
          fase: 'cuartos', bracket_order: i,
          marcador_detalle: buildMarcador(),
        });
      }

      // Step 4: Semifinal — all TBD
      for (let i = 0; i < semifinalCount; i++) {
        toInsert.push({
          disciplina_id, genero, categoria,
          equipo_a: 'TBD', equipo_b: 'TBD',
          estado: 'programado', lugar, fecha,
          fase: 'semifinal', bracket_order: i,
          marcador_detalle: buildMarcador(),
        });
      }

      // Step 5: Final — 1 TBD slot
      toInsert.push({
        disciplina_id, genero, categoria,
        equipo_a: 'TBD', equipo_b: 'TBD',
        estado: 'programado', lugar, fecha,
        fase: 'final', bracket_order: 0,
        marcador_detalle: buildMarcador(),
      });
    }

    // ── Intermedio Masculino (32 → 16 octavos) ─────────────────────────────
    pushBracketWithOctavos(BRACKET_INT_M, 'masculino', 'intermedio');

    // ── Intermedio Femenino (15 → 8 octavos) ─────────────────────────────────
    pushBracketWithOctavos(BRACKET_INT_F, 'femenino', 'intermedio');

    // ── Avanzado Masculino (16 → 8 octavos) ─────────────────────────────────
    pushBracketWithOctavos(BRACKET_AVA_M, 'masculino', 'avanzado');

    // ── Avanzado Femenino (Round Robin grupos) ───────────────────────────────
    AVANZADO_FEMENINO_GRUPOS.forEach(({ match: raw, grupo }, idx) => {
      const m = parseMatch(raw);
      if (!m) return;
      toInsert.push({
        disciplina_id, genero: 'femenino', categoria: 'avanzado',
        equipo_a: m.a, equipo_b: m.b,
        estado: 'programado', lugar, fecha,
        fase: 'grupos', grupo, bracket_order: idx,
        marcador_detalle: buildMarcador(),
      });
    });

    // ── Batch insert + roster linking ─────────────────────────────────────────
    const CHUNK = 100;
    let created = 0;
    let rosterLinked = 0;
    const rosterErrors: string[] = [];

    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);

      const { data: inserted, error: insertError } = await supabase
        .from('partidos')
        .insert(chunk)
        .select('id, equipo_a, equipo_b');

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

      created += inserted?.length || 0;

      // Link players to matches via roster_partido + set athlete/career FKs on partidos
      if (inserted) {
        for (const partido of inserted) {
          const skipB = partido.equipo_b?.toUpperCase() === 'BYE' || partido.equipo_b?.toUpperCase() === 'TBD';
          const skipA = partido.equipo_a?.toUpperCase() === 'BYE' || partido.equipo_a?.toUpperCase() === 'TBD';

          // Resolve both players in parallel
          const [jugadorA, jugadorB] = await Promise.all([
            skipA ? Promise.resolve(null) : findJugador(supabase, partido.equipo_a, disciplina_id),
            skipB ? Promise.resolve(null) : findJugador(supabase, partido.equipo_b, disciplina_id),
          ]);

          // Link equipo_a player to roster_partido
          if (jugadorA) {
            const { error: rosterError } = await supabase.from('roster_partido').upsert(
              { partido_id: partido.id, jugador_id: jugadorA.id, equipo_a_or_b: 'equipo_a' },
              { onConflict: 'partido_id,jugador_id,equipo_a_or_b' }
            );
            if (!rosterError) rosterLinked++;
            else rosterErrors.push(`${partido.equipo_a}: ${rosterError.message}`);
          } else if (!skipA) {
            rosterErrors.push(`${partido.equipo_a}: jugador not found in DB`);
          }

          // Link equipo_b player to roster_partido
          if (jugadorB) {
            const { error: rosterError } = await supabase.from('roster_partido').upsert(
              { partido_id: partido.id, jugador_id: jugadorB.id, equipo_a_or_b: 'equipo_b' },
              { onConflict: 'partido_id,jugador_id,equipo_a_or_b' }
            );
            if (!rosterError) rosterLinked++;
            else rosterErrors.push(`${partido.equipo_b}: ${rosterError.message}`);
          } else if (!skipB) {
            rosterErrors.push(`${partido.equipo_b}: jugador not found in DB`);
          }

          // Set athlete_a_id / carrera_a_id / athlete_b_id / carrera_b_id on the partido row
          // so /partido/[id] can show profile name, avatar, and career
          const fkUpdate: Record<string, string> = {};
          if (jugadorA?.profile_id) fkUpdate.athlete_a_id = jugadorA.profile_id;
          if (jugadorA?.carrera_id) fkUpdate.carrera_a_id = String(jugadorA.carrera_id);
          if (jugadorB?.profile_id) fkUpdate.athlete_b_id = jugadorB.profile_id;
          if (jugadorB?.carrera_id) fkUpdate.carrera_b_id = String(jugadorB.carrera_id);

          if (Object.keys(fkUpdate).length > 0) {
            const { error: updateError } = await supabase
              .from('partidos')
              .update(fkUpdate)
              .eq('id', partido.id);
            if (updateError) {
              rosterErrors.push(`FK update partido ${partido.id}: ${updateError.message}`);
            }
          }
        }
      }
    }

    const bracketSlots = (b: BracketEntry[]) => {
      const oct  = Math.ceil(b.length / 2);
      const qtr  = Math.ceil(oct / 2);
      const semi = Math.ceil(qtr / 2);
      return {
        primera_ronda: b.length,
        matches_reales: b.filter(e => e.b.toUpperCase() !== 'BYE').length,
        seeds: b.filter(e => e.b.toUpperCase() === 'BYE').length,
        octavos: oct,
        cuartos: qtr,
        semifinal: semi,
        final: 1,
        total: b.length + oct + qtr + semi + 1,
      };
    };

    return NextResponse.json({
      created,
      rosterLinked,
      rosterErrors: rosterErrors.slice(0, 30),
      message: '✅ Tennis bracket imported with all rounds pre-created. Auto-advance fills slots as winners emerge.',
      breakdown: {
        intermedio_m: bracketSlots(BRACKET_INT_M),
        intermedio_f: bracketSlots(BRACKET_INT_F),
        avanzado_m:   bracketSlots(BRACKET_AVA_M),
        avanzado_f_grupos: AVANZADO_FEMENINO_GRUPOS.length,
      },
    });
  } catch (err: any) {
    console.error('Tennis bracket import error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
