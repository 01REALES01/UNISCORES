import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ParsedMatch {
  equipo_a: string;
  equipo_b: string;
  disciplina_id: number;
  genero: string;
  categoria: string;
  fase: string;
  grupo?: string;
  bracket_order: number;
}

function parseMatch(str: string): { a: string; b: string } | null {
  const parts = str.split(/\s+VS\s+/i);
  if (parts.length !== 2) return null;
  return {
    a: parts[0].trim(),
    b: parts[1].trim(),
  };
}

function getMarcadorTenis(isBye: boolean = false) {
  const marcador = {
    set_actual: 1,
    sets_a: 0,
    sets_b: 0,
    match_format: 'propset_8games',
    sets: {
      1: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
      2: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
      3: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
    },
    games_a: 0,
    games_b: 0,
    goles_a: 0,
    goles_b: 0,
  };

  if (isBye) {
    return {
      ...marcador,
      sets_a: 1,
      sets_b: 0,
      sets: {
        1: { juegos_a: 6, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
        2: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
        3: { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 },
      },
      games_a: 6,
      games_b: 0,
      goles_a: 6,
      goles_b: 0,
    };
  }

  return marcador;
}

export async function POST(req: NextRequest) {
  try {
    // Get Tenis disciplina
    const { data: discData, error: discError } = await supabase
      .from('disciplinas')
      .select('id')
      .ilike('name', 'Tenis')
      .single();

    if (discError || !discData) {
      return NextResponse.json({ error: 'Tenis disciplina not found' }, { status: 400 });
    }

    const disciplina_id = discData.id;

    // Read Excel files from project root
    const projectRoot = process.cwd();
    const programacionPath = path.join(projectRoot, 'PROGRAMACION PRIMERA RONDA.xlsx');

    if (!fs.existsSync(programacionPath)) {
      return NextResponse.json({ error: 'Excel file not found' }, { status: 400 });
    }

    const workbook = XLSX.readFile(programacionPath);
    const sheetMap: Record<string, { genero: string; categoria: string; fase: string; grupo?: string }> = {
      'PARTIDOS INT M': { genero: 'masculino', categoria: 'intermedio', fase: 'primera_ronda' },
      'PARTIDOS INT F': { genero: 'femenino', categoria: 'intermedio', fase: 'primera_ronda' },
      'PARTIDOS AVA M': { genero: 'masculino', categoria: 'avanzado', fase: 'primera_ronda' },
      'PARTIDOS AVA F': { genero: 'femenino', categoria: 'avanzado', fase: 'grupos', grupo: 'A' }, // Will determine grupo per match
    };

    const allMatches: ParsedMatch[] = [];
    let grupoIndex = 0;
    const grupoLetters = ['A', 'B', 'C'];

    for (const [sheetName, config] of Object.entries(sheetMap)) {
      if (!workbook.SheetNames.includes(sheetName)) continue;

      const ws = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as (string | number)[][];

      // For AVA F, reset grupo counter per sheet
      grupoIndex = 0;

      let matchOrder = 0;
      for (const row of data) {
        const matchText = String(row[1] || '').trim();
        if (!matchText || matchText.toLowerCase().includes('partidos')) continue;

        const parsed = parseMatch(matchText);
        if (!parsed) continue;

        let grupo = config.grupo;
        if (config.categoria === 'avanzado' && config.genero === 'femenino') {
          // Determine grupo based on match count (3 matches per grupo)
          if (matchOrder === 3) grupoIndex = 1;
          if (matchOrder === 6) grupoIndex = 2;
          grupo = grupoLetters[grupoIndex];
        }

        allMatches.push({
          equipo_a: parsed.a,
          equipo_b: parsed.b,
          disciplina_id,
          genero: config.genero,
          categoria: config.categoria,
          fase: config.fase,
          grupo: grupo,
          bracket_order: matchOrder,
        });

        matchOrder++;
      }
    }

    // Batch insert matches
    const baseDate = '2026-04-09T08:00:00';
    const partidosToInsert = allMatches.map((m, idx) => ({
      disciplina_id: m.disciplina_id,
      genero: m.genero,
      categoria: m.categoria,
      equipo_a: m.equipo_a,
      equipo_b: m.equipo_b,
      estado: 'programado',
      lugar: 'Canchas de Tenis',
      fecha: baseDate,
      fase: m.fase,
      grupo: m.grupo || null,
      bracket_order: m.bracket_order,
      marcador_detalle: getMarcadorTenis(),
    }));

    // Insert in chunks of 100
    const chunkSize = 100;
    let totalCreated = 0;

    for (let i = 0; i < partidosToInsert.length; i += chunkSize) {
      const chunk = partidosToInsert.slice(i, i + chunkSize);
      const { error: insertError } = await supabase.from('partidos').insert(chunk);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      totalCreated += chunk.length;
    }

    const result = {
      created: totalCreated,
      breakdown: {
        intermedio_m: allMatches.filter(m => m.categoria === 'intermedio' && m.genero === 'masculino').length,
        intermedio_f: allMatches.filter(m => m.categoria === 'intermedio' && m.genero === 'femenino').length,
        avanzado_m: allMatches.filter(m => m.categoria === 'avanzado' && m.genero === 'masculino').length,
        avanzado_f: allMatches.filter(m => m.categoria === 'avanzado' && m.genero === 'femenino').length,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Tennis bracket import error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
