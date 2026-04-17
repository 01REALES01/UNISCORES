import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Group data from TENIS-MESA.PROG.pdf (17 abril 2026) ─────────────────────
// Grupos 1-22: 3 jugadores → 3 partidos c/u
// Grupos 23-32: 4 jugadores → 6 partidos c/u
// Total: 22×3 + 10×6 = 126 partidos

type Group = { numero: number; hora: string; jugadores: string[] };

const GRUPOS: Group[] = [
  { numero: 1,  hora: '13:00', jugadores: ['NICOLAS PEREZ PADILLA', 'Alfredo Luis Lambraño Lopez', 'SAMUEL CATAÑO GIL'] },
  { numero: 2,  hora: '13:00', jugadores: ['ALVARO USECHE ARIAS', 'DANIEL SANTIAGO ESPINOSA CARDENAS', 'DANIEL ENRIQUE PERTUZ LOZANO'] },
  { numero: 3,  hora: '13:00', jugadores: ['MANUEL ANTONIO YEPES GALVAN', 'SANTIAGO ROA TORRES', 'JUAN DANIEL RIVERA GARCIA'] },
  { numero: 4,  hora: '13:00', jugadores: ['ALEJANDRO TORO PINEDO', 'CARLOS DANIEL LUNA ROMERO', 'SAMUEL ANDRES GARCIA NUÑEZ'] },
  { numero: 5,  hora: '13:00', jugadores: ['EFRAIN ANDRES RADA SANZ', 'RAFAEL AUGUSTO ROVIRA MELO', 'JOSE ALEJANDRO CHAPMAN ABELLO'] },
  { numero: 6,  hora: '13:00', jugadores: ['JORGE DANIEL SILVA TAPIA', 'DAVID IRIARTE BARRETO', 'ANGEL SEBASTIAN RAMIREZ PINEDA'] },
  { numero: 7,  hora: '13:00', jugadores: ['KEIVER DE JESUS MIRANDA LEMUS', 'Damian Alfonso Sierra Herrera', 'LEONARDO LEONARDO GOMEZ ROCA'] },
  { numero: 8,  hora: '13:20', jugadores: ['SANDRO DANIEL TORRES GUTIERREZ', 'ALEJANDRO ORTIZ ZABALETA', 'VICTOR MANUEL PEDROZO DIAZ'] },
  { numero: 9,  hora: '13:20', jugadores: ['GABRIEL ELIAS PALENCIA CURE', 'EISSER ALFREDO GOMEZ DIAZ', 'JASON CRUZ CARMONA'] },
  { numero: 10, hora: '13:20', jugadores: ['JUAN PABLO ALVAREZ PETRO', 'JAVIER ESTEBAN DE LA HOZ CASTRO', 'GUSTAVO ADOLFO GOMEZ RANGEL'] },
  { numero: 11, hora: '13:20', jugadores: ['SAMUEL DAVID TILANO MAJJUL', 'SAMUEL DAVID DE LA CRUZ JABIB', 'JUAN PABLO ROMERO PINTO'] },
  { numero: 12, hora: '13:20', jugadores: ['SAMUEL ANDRES OROZCO GALLEGO', 'CARLOS ERNESTO VARGAS ECHEVERRIA', 'DANIEL FRANCO PIRELA'] },
  { numero: 13, hora: '13:20', jugadores: ['JUAN MIGUEL CARRASQUILLA ESCOBAR', 'JOSE ANTONIO SEGEBRE ABUDINEN', 'SEBASTIAN POLANCO SANCHEZ'] },
  { numero: 14, hora: '13:20', jugadores: ['Alberto Ignacio Aponte Juliao', 'SANTIAGO ANDRES DIAZ PEÑA', 'CAMILO ANDRES CHAVES AREVALO'] },
  { numero: 15, hora: '13:40', jugadores: ['ANDRES DAVID ISSA CAMARGO', 'JAVIER ALFONSO CHINCHILLA GUERRERO', 'CARLOS DANIEL BARRIOS SANCHEZ'] },
  { numero: 16, hora: '13:40', jugadores: ['NICOLAS ANDRES MUVDI RODRIGUEZ', 'ANDRES CAMILO VERGARA GALVIS', 'JUAN PABLO RUBIANO GAMERO'] },
  { numero: 17, hora: '13:40', jugadores: ['JHOSEP RICARDO VARELA REGALADO', 'ALVARO ARTURO CUMPLIDO DONADO', 'SANTIAGO JOSE BECERRA VEGA'] },
  { numero: 18, hora: '13:40', jugadores: ['Ivan Ricardo Manjarrez Masco', 'JUAN PABLO MARTINEZ SIERRA', 'ISAAC DAVID TABOADA OSORIO'] },
  { numero: 19, hora: '13:40', jugadores: ['DANIEL ALFONSO GARCIA NARVAEZ', 'ALEJANDRO ANDRES HUERFANO CELIS', 'ANDRES MANUEL DE LA CERDA BERDEJO'] },
  { numero: 20, hora: '13:40', jugadores: ['DANIEL DAVID MONTERROZA BARRIOS', 'CARLOS EDUARDO CORRALES URHAN', 'ALEXIS RAFAEL INSIGNARES CUETO'] },
  { numero: 21, hora: '13:40', jugadores: ['Juan Felipe Arrieta Coley', 'ALEX EDUARDO DURAN GALINDO', 'ROBERTO JOSE SOLANO VALENCIA'] },
  { numero: 22, hora: '14:00', jugadores: ['MANUEL DAVID POLO SALGADO', 'SERGIO LUIS DANGON PACHECO', 'ALEJANDRO MANUEL DIAZ GRANADOS BLANCO'] },
  { numero: 23, hora: '14:00', jugadores: ['Alejandro Amaya Soto', 'LUIS MARIO LLERENA DORIA', 'JUNIOR ANDRES ROMERO LEON', 'CARLOS DANIEL ACEVEDO QUINTERO'] },
  { numero: 24, hora: '14:00', jugadores: ['ALVARO ANDRES CABALLERO VITAL', 'ALFREDO DAVID PORRAS SARMIENTO', 'JUAN JOSE GONZALEZ IGLESIAS', 'ALAN DAVID CORTINA AYCARDI'] },
  { numero: 25, hora: '14:00', jugadores: ['ALEJANDRO JOSE MAURELLO NAVARRO', 'JACOBO GARCIA CARVAJAL', 'Diego Fernando Vesga Sandoval', 'STIVENS SAMUEL RUIZ MUNERA'] },
  { numero: 26, hora: '14:00', jugadores: ['SAMUEL JOSE CABALLERO ACOSTA', 'ALEJANDRO BARAKE HEILBRON', 'JUAN DIEGO ACEVEDO QUINTERO', 'ENGEL DAVID MUÑOZ REALES'] },
  { numero: 27, hora: '14:00', jugadores: ['SALOMON MALOOF MARTINEZ', 'ANDRES FELIPE ZAPATA MARZAN', 'JUAN FELIPE PADRON ROBAYO', 'DANIEL JOSE ORTEGA MORA'] },
  { numero: 28, hora: '14:00', jugadores: ['SEBASTIAN ENRIQUE AVILA NIEBLES', 'NELSON ANDRES MARTELO COVO', 'DAVID ALEJANDRO HIDALGO MORENO', 'ERWIN DAVID PERTUZ LOZANO'] },
  { numero: 29, hora: '14:40', jugadores: ['JUAN DAVID LLANOS AVILA', 'HENRY MATTHEW HENAO MEUCCI', 'SEBASTIAN DAVID MENDOZA ALGARIN', 'SAMUEL DAVID BERMUDEZ ARENAS'] },
  { numero: 30, hora: '14:40', jugadores: ['Alvaro Andres Ramirez galvan', 'Simon Cataño Gil', 'EISSER ANDRES GOMEZ DIAZ', 'JUAN DAVID FLOREZ MEZA'] },
  { numero: 31, hora: '14:40', jugadores: ['ANDRES DAVID POLO ROA', 'ALEJANDRO ENRIQUE GARCIA NARVAEZ', 'ANTHONY JAVIER ALTAMAR OROZCO', 'JOSE MARIA GUINOVART PAEZ'] },
  { numero: 32, hora: '14:40', jugadores: ['ALEJANDRO AGUILERA DORADO', 'JUAN GUILLERMO ESPINOSA VERGARA', 'DANIEL EDUARDO GARCIA NUÑEZ', 'THOMAS ESTEBAN ROBAYO OLARTE'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePairings(jugadores: string[]): { a: string; b: string }[] {
  const pairs: { a: string; b: string }[] = [];
  for (let i = 0; i < jugadores.length; i++) {
    for (let j = i + 1; j < jugadores.length; j++) {
      pairs.push({ a: jugadores[i], b: jugadores[j] });
    }
  }
  return pairs;
}

function buildMarcadorTenisMesa() {
  return {
    set_actual: 1,
    sets_a: 0,
    sets_b: 0,
    sets: { 1: { puntos_a: 0, puntos_b: 0 } },
  };
}

function bestMatch(candidates: any[], searchName: string) {
  const searchWords = searchName.toUpperCase().split(/\s+/);
  let best: any = null;
  let bestScore = 0;
  for (const c of candidates) {
    const dbWords = c.nombre.toUpperCase().split(/\s+/);
    const matched = searchWords.filter((w: string) => dbWords.some((d: string) => d === w)).length;
    const score = matched / Math.max(searchWords.length, dbWords.length);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore > 0.35 ? best : null;
}

// Search jugadores filtered by Tenis de Mesa disciplina first, then fallback.
async function findJugadorTenisMesa(supabase: any, playerName: string, tenisMesaId: number) {
  const name = playerName.trim();
  const words = name.split(/\s+/).sort((a: string, b: string) => b.length - a.length);
  const [w1, w2] = words;
  const cols = 'id, nombre, profile_id, carrera_id';

  // 1. Search filtered by Tenis de Mesa disciplina + 2 longest words
  if (w1 && w2) {
    const { data } = await supabase
      .from('jugadores')
      .select(cols)
      .eq('disciplina_id', tenisMesaId)
      .ilike('nombre', `%${w1}%`)
      .ilike('nombre', `%${w2}%`)
      .limit(5);
    if (data?.length === 1) return data[0];
    if (data?.length > 1) return bestMatch(data, name);
  }

  // 2. Fallback: all jugadores (any disciplina) with 2 longest words
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

  // 3. Fallback: profiles table by full_name
  if (w1 && w2) {
    const { data: pros } = await supabase
      .from('profiles')
      .select('id, full_name, carrera_id')
      .ilike('full_name', `%${w1}%`)
      .ilike('full_name', `%${w2}%`)
      .limit(5);
    if (pros?.length === 1) return { profile_id: pros[0].id, carrera_id: pros[0].carrera_id };
    if (pros?.length > 1) {
      const best = bestMatch(pros.map((p: any) => ({ ...p, nombre: p.full_name })), name);
      if (best) return { profile_id: best.id, carrera_id: best.carrera_id };
    }
  }

  return null;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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

    // Resolve Tenis de Mesa disciplina_id
    const { data: disc, error: discError } = await supabase
      .from('disciplinas')
      .select('id')
      .ilike('name', '%mesa%')
      .single();

    if (discError || !disc) {
      return NextResponse.json({ error: 'Disciplina "Tenis de Mesa" no encontrada en la DB' }, { status: 400 });
    }

    const tenisMesaId: number = disc.id;
    const lugar = 'Cancha de Tenis de Mesa';
    const DATE = '2026-04-17';

    // Build all partidos to insert
    const toInsert: object[] = [];

    for (const grupo of GRUPOS) {
      const pairs = generatePairings(grupo.jugadores);
      const fecha = `${DATE}T${grupo.hora}:00-05:00`;

      for (let pairIdx = 0; pairIdx < pairs.length; pairIdx++) {
        const { a, b } = pairs[pairIdx];
        toInsert.push({
          disciplina_id: tenisMesaId,
          categoria: 'intermedio',
          genero: 'masculino',
          fase: 'grupos',
          grupo: String(grupo.numero),
          bracket_order: pairIdx,
          estado: 'programado',
          fecha,
          lugar,
          equipo_a: a,
          equipo_b: b,
          marcador_detalle: buildMarcadorTenisMesa(),
        });
      }
    }

    // Batch insert + roster/FK linking
    const CHUNK = 50;
    let inserted = 0;
    let linked = 0;
    let rosterRows = 0;
    const rosterErrors: string[] = [];

    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);

      const { data: createdPartidos, error: insertError } = await supabase
        .from('partidos')
        .insert(chunk)
        .select('id, equipo_a, equipo_b');

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

      inserted += createdPartidos?.length ?? 0;

      if (!createdPartidos) continue;

      for (const partido of createdPartidos) {
        const [jugadorA, jugadorB] = await Promise.all([
          findJugadorTenisMesa(supabase, partido.equipo_a, tenisMesaId),
          findJugadorTenisMesa(supabase, partido.equipo_b, tenisMesaId),
        ]);

        // roster_partido
        for (const [jugador, slot] of [[jugadorA, 'equipo_a'], [jugadorB, 'equipo_b']] as const) {
          if (jugador?.id) {
            const { error } = await supabase.from('roster_partido').upsert(
              { partido_id: partido.id, jugador_id: jugador.id, equipo_a_or_b: slot },
              { onConflict: 'partido_id,jugador_id,equipo_a_or_b' }
            );
            if (!error) rosterRows++;
            else rosterErrors.push(`roster ${slot} partido ${partido.id}: ${error.message}`);
          } else {
            const name = slot === 'equipo_a' ? partido.equipo_a : partido.equipo_b;
            rosterErrors.push(`${name}: jugador no encontrado en DB`);
          }
        }

        // FK update on partidos
        const fkUpdate: Record<string, any> = {};
        if (jugadorA?.profile_id) fkUpdate.athlete_a_id = jugadorA.profile_id;
        if (jugadorA?.carrera_id) fkUpdate.carrera_a_id = String(jugadorA.carrera_id);
        if (jugadorB?.profile_id) fkUpdate.athlete_b_id = jugadorB.profile_id;
        if (jugadorB?.carrera_id) fkUpdate.carrera_b_id = String(jugadorB.carrera_id);

        if (Object.keys(fkUpdate).length > 0) {
          linked++;
          const { error } = await supabase.from('partidos').update(fkUpdate).eq('id', partido.id);
          if (error) rosterErrors.push(`FK update partido ${partido.id}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      inserted,
      linked,
      unlinked: inserted - linked,
      roster_rows: rosterRows,
      errors: rosterErrors.slice(0, 50),
      message: `✅ ${inserted} partidos de grupos creados · ${linked} enlazados a perfiles · ${rosterRows} filas en roster`,
    });
  } catch (err: any) {
    console.error('Tenis Mesa grupos import error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
