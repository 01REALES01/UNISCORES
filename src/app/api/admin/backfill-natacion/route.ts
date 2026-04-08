import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function normalizeName(name: string) {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, ' ');
}

function bestMatch(candidates: any[], searchName: string) {
    const sNorm = normalizeName(searchName);
    const sWords = sNorm.split(' ');
    let best: any = null;
    let bestScore = 0;

    for (const c of candidates) {
        const dbNorm = normalizeName(c.full_name || c.nombre || '');
        const dbWords = dbNorm.split(' ');
        
        // Exact match of normalized strings
        if (sNorm === dbNorm) return c;

        // Word overlap score
        const matched = sWords.filter(w => dbWords.includes(w)).length;
        const score = matched / Math.max(sWords.length, dbWords.length);
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    }
    return bestScore > 0.4 ? best : null;
}

async function findAthleteData(supabase: any, playerName: string) {
    if (!playerName) return { profile_id: null, jugador_id: null };
    const name = playerName.trim();
    const words = name.split(/\s+/).filter(w => w.length > 2);
    const queryWords = words.length > 0 ? words : name.split(/\s+/);
    const [w1, w2] = queryWords.sort((a,b) => b.length - a.length);

    let profile_id = null;
    let jugador_id = null;

    if (w1) {
        // 1. Try to find in jugadores (always exists if imported)
        let jBtn = supabase.from('jugadores').select('id, nombre, profile_id').ilike('nombre', `%${w1}%`);
        if (w2) jBtn = jBtn.ilike('nombre', `%${w2}%`);
        const { data: jugs } = await jBtn.limit(10);
        
        const bestJug = jugs ? bestMatch(jugs, name) : null;
        if (bestJug) {
            jugador_id = bestJug.id;
            profile_id = bestJug.profile_id;
        }

        // 2. If no profile_id found from jugadores, try searching profiles directly
        if (!profile_id) {
            let pBtn = supabase.from('profiles').select('id, full_name').ilike('full_name', `%${w1}%`);
            if (w2) pBtn = pBtn.ilike('full_name', `%${w2}%`);
            const { data: pros } = await pBtn.limit(10);
            
            const bestPro = pros ? bestMatch(pros, name) : null;
            if (bestPro) {
                profile_id = bestPro.id;
            }
        }
    }
    return { profile_id, jugador_id };
}

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
        );

        // Fetch all matches and filter in JS to avoid complex JSON query issues
        const { data: allMatches, error: fetchError } = await supabase
            .from('partidos')
            .select('id, marcador_detalle');

        const matches = allMatches?.filter(m => m.marcador_detalle?.tipo === 'carrera');

        if (fetchError) throw fetchError;

        let updated = 0;
        const results = [];

        for (const m of matches || []) {
            const md = m.marcador_detalle;
            if (!md || !Array.isArray(md.participantes)) continue;

            let changed = false;
            for (const p of md.participantes) {
                // Populate both if possible
                const { profile_id, jugador_id } = await findAthleteData(supabase, p.nombre);
                
                if (profile_id && p.profile_id !== profile_id) {
                    p.profile_id = profile_id;
                    changed = true;
                }
                if (jugador_id && p.jugador_id !== jugador_id) {
                    p.jugador_id = jugador_id;
                    changed = true;
                }
            }

            if (changed) {
                const { error: updateError } = await supabase
                    .from('partidos')
                    .update({ marcador_detalle: md })
                    .eq('id', m.id);
                
                if (!updateError) {
                    updated++;
                    results.push({ id: m.id, participants: md.participantes.length });
                } else {
                    console.error(`Error updating match ${m.id}:`, updateError);
                }
            }
        }

        return NextResponse.json({
            matchesFound: matches?.length || 0,
            updatedCount: updated,
            results
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
