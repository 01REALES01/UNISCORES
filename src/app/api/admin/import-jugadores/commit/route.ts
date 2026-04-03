// POST /api/admin/import-jugadores/commit
// Batch upsert jugadores rows for performance

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ParsedJugador } from '../route';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as { rows: ParsedJugador[] };
    const rows = body.rows.filter(r => r.validation_status !== 'error' && r.nombre && r.carrera_id);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows to commit' }, { status: 400 });
    }

    // Fetch all existing jugadores by (nombre, carrera_id) in batch
    const searchKeys = rows.map(r => ({ nombre: r.nombre, carrera_id: r.carrera_id! }));
    const { data: existing } = await supabase
      .from('jugadores')
      .select('id, nombre, carrera_id')
      .limit(10000);

    const existingMap = new Map(
      (existing || []).map(j => [`${j.nombre}|${j.carrera_id}`, j.id])
    );

    // Split rows into inserts and updates
    const toInsert: any[] = [];
    const toUpdate: Array<{ id: number; payload: any }> = [];

    for (const row of rows) {
      const key = `${row.nombre}|${row.carrera_id}`;
      const payload = {
        numero: row.numero ?? null,
        email: row.email ?? null,
        profile_id: row.profile_id ?? null,
        disciplina_id: row.disciplina_id ?? null,
        genero: row.genero ?? null,
        sexo: row.sexo ?? null,
      };

      if (existingMap.has(key)) {
        toUpdate.push({ id: existingMap.get(key)!, payload });
      } else {
        toInsert.push({
          nombre: row.nombre,
          carrera_id: row.carrera_id,
          ...payload,
        });
      }
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Batch insert (max 1000 rows per call)
    if (toInsert.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('jugadores')
          .insert(batch);

        if (error) {
          console.error('[commit] Batch insert error:', error);
          errors += batch.length;
        } else {
          created += batch.length;
        }
      }
    }

    // Batch update (one call per row, but in parallel chunks)
    if (toUpdate.length > 0) {
      const PARALLEL_BATCH = 20;
      for (let i = 0; i < toUpdate.length; i += PARALLEL_BATCH) {
        const batch = toUpdate.slice(i, i + PARALLEL_BATCH);
        const results = await Promise.all(
          batch.map(({ id, payload }) =>
            supabase
              .from('jugadores')
              .update(payload)
              .eq('id', id)
          )
        );

        for (const result of results) {
          if (result.error) {
            console.error('[commit] Update error:', result.error);
            errors++;
          } else {
            updated++;
          }
        }
      }
    }

    const skipped = errors;
    return NextResponse.json({
      created,
      updated,
      skipped,
      total: rows.length,
    });
  } catch (err: any) {
    console.error('[import-jugadores-commit] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
