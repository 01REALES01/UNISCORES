import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Reusing the scoring logic from the importer
function bestMatch(candidates: any[], searchName: string) {
    const searchWords = searchName.toUpperCase().split(/\s+/);
    let best: any = null;
    let bestScore = 0;
    for (const c of candidates) {
        const dbWords = (c.nombre || '').toUpperCase().split(/\s+/);
        const matched = searchWords.filter((w: string) => dbWords.some((d: string) => d === w)).length;
        const score = matched / Math.max(searchWords.length, dbWords.length);
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore > 0.35 ? best : null; // Threshold lowered to find more matches
}

async function findJugador(supabase: any, playerName: string) {
    if (!playerName || ['BYE', 'TBD', 'GANADOR', 'PERDEDOR'].includes(playerName.toUpperCase())) {
        return null;
    }

    const name = playerName.trim();
    const words = name.split(/\s+/).sort((a: string, b: string) => b.length - a.length);
    const [w1, w2] = words;

    const cols = 'id, nombre, profile_id, carrera_id';

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

    if (w1) {
        const { data } = await supabase
            .from('jugadores')
            .select(cols)
            .ilike('nombre', `%${w1}%`)
            .limit(10);
        if (data?.length) return bestMatch(data, name);
    }

    // 3. Fallback: search profiles table directly by name (word based)
    if (w1 && w2) {
        const { data: pros } = await supabase
            .from('profiles')
            .select('id, full_name')
            .ilike('full_name', `%${w1}%`)
            .ilike('full_name', `%${w2}%`)
            .limit(5);
        if (pros?.length === 1) return { profile_id: pros[0].id };
        if (pros?.length > 1) {
            const best = bestMatch(pros.map((p: any) => ({ ...p, nombre: p.full_name })), name);
            if (best) return { profile_id: best.id };
        }
    }

    return null;
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        );

        // Identify individual disciplines (Tenis, Tenis de Mesa, Ajedrez)
        const { data: discs } = await supabase
            .from('disciplinas')
            .select('id, name')
            .or('name.ilike.Tenis,name.ilike.Tenis de Mesa,name.ilike.Ajedrez');
        
        const discIds = discs?.map(d => d.id) || [];
        if (discIds.length === 0) throw new Error("Individual disciplines not found");

        // Fetch all matches for these disciplines where IDs are missing
        const { data: matches, error: fetchError } = await supabase
            .from('partidos')
            .select('id, equipo_a, equipo_b, athlete_a_id, athlete_b_id, carrera_a_id, carrera_b_id')
            .in('disciplina_id', discIds)
            .or('athlete_a_id.is.null,athlete_b_id.is.null,carrera_a_id.is.null,carrera_b_id.is.null');

        if (fetchError) throw fetchError;

        let updated = 0;
        const results = [];

        for (const m of matches || []) {
            const updates: any = {};
            
            // Link A
            if (!m.athlete_a_id || !m.carrera_a_id) {
                const jugadorA = await findJugador(supabase, m.equipo_a);
                if (jugadorA) {
                    if (jugadorA.profile_id) updates.athlete_a_id = jugadorA.profile_id;
                    if (jugadorA.carrera_id) updates.carrera_a_id = String(jugadorA.carrera_id);
                }
            }

            // Link B
            if (!m.athlete_b_id || !m.carrera_b_id) {
                const jugadorB = await findJugador(supabase, m.equipo_b);
                if (jugadorB) {
                    if (jugadorB.profile_id) updates.athlete_b_id = jugadorB.profile_id;
                    if (jugadorB.carrera_id) updates.carrera_b_id = String(jugadorB.carrera_id);
                }
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('partidos')
                    .update(updates)
                    .eq('id', m.id);
                
                if (!updateError) {
                    updated++;
                    results.push({ id: m.id, updates });
                }
            }
        }

        return NextResponse.json({
            matchesFound: matches?.length || 0,
            updatedCount: updated,
            results: results.slice(0, 50)
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
