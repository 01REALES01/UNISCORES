import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

type JugRow = {
    id: number;
    profile_id: string | null;
    email: string | null;
    sexo: string | null;
    genero: string | null;
    delegacion_id: number | null;
    carrera_id: number | null;
};

function scoreJugador(j: JugRow): number {
    let s = 0;
    if (j.delegacion_id) s += 50;
    if (j.carrera_id) s += 25;
    if (j.email && j.email.trim()) s += 10;
    if (j.sexo && String(j.sexo).trim()) s += 5;
    if (j.genero && String(j.genero).trim()) s += 5;
    return s;
}

function pickBestJugador(rows: JugRow[]): JugRow {
    return [...rows].sort((a, b) => scoreJugador(b) - scoreJugador(a) || a.id - b.id)[0];
}

function sexoToProfile(raw: string | null): string | null {
    if (raw == null || !String(raw).trim()) return null;
    const u = String(raw).trim().toUpperCase();
    if (u === 'M' || u === 'F') return u;
    if (u === 'MASCULINO' || u === 'H' || u === 'HOMBRE') return 'M';
    if (u === 'FEMENINO' || u === 'MUJER') return 'F';
    return String(raw).trim().slice(0, 32);
}

function generoToProfile(raw: string | null): string | null {
    if (raw == null || !String(raw).trim()) return null;
    const g = String(raw).trim().toLowerCase();
    if (g === 'masculino' || g === 'femenino' || g === 'mixto') return g;
    return null;
}

/**
 * POST /api/admin/sync-profile-demographics
 *
 * Rellena profiles.sexo / profiles.genero desde filas de `jugadores` (actas / Excel),
 * sin depender de que el usuario rellene un formulario.
 *
 * Pasos:
 * 1) Agrupa por profile_id vinculado y elige la fila jugador “más completa”.
 * 2) Agrupa jugadores sin profile_id por email y cruza con profiles.email (mismo correo).
 *
 * Solo escribe en el perfil si el campo sigue vacío (no pisa lo que ya exista).
 *
 * Requiere: admin o data_entry + SUPABASE_SERVICE_ROLE_KEY.
 */
export async function POST() {
    const supabase = await createRouteSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single();
    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        return NextResponse.json(
            { error: 'SUPABASE_SERVICE_ROLE_KEY no configurado en el servidor.' },
            { status: 500 }
        );
    }

    const admin = createClient(url, serviceKey);

    const { data: jugs, error: jErr } = await admin
        .from('jugadores')
        .select('id, profile_id, email, sexo, genero, delegacion_id, carrera_id');

    if (jErr) {
        return NextResponse.json({ error: jErr.message }, { status: 500 });
    }

    const rows = (jugs || []) as JugRow[];

    const byProfile = new Map<string, JugRow[]>();
    const byEmail = new Map<string, JugRow[]>();

    for (const j of rows) {
        if (j.profile_id) {
            const pid = String(j.profile_id);
            if (!byProfile.has(pid)) byProfile.set(pid, []);
            byProfile.get(pid)!.push(j);
        }
        const em = j.email?.trim().toLowerCase();
        if (em && !j.profile_id) {
            if (!byEmail.has(em)) byEmail.set(em, []);
            byEmail.get(em)!.push(j);
        }
    }

    const { data: allProfiles, error: pErr } = await admin.from('profiles').select('id, email, sexo, genero');
    if (pErr) {
        return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const profMap = new Map((allProfiles || []).map((p) => [p.id as string, p]));
    const emailToProfileId = new Map<string, string>();
    for (const p of allProfiles || []) {
        const em = (p as { email?: string | null }).email?.trim().toLowerCase();
        if (em) emailToProfileId.set(em, p.id as string);
    }

    let patchedProfiles = 0;
    let sexoFilled = 0;
    let generoFilled = 0;

    async function applyPatch(profileId: string, j: JugRow) {
        const prof = profMap.get(profileId);
        if (!prof) return;

        const patch: Record<string, unknown> = {};
        const curSexo = (prof as { sexo?: string | null }).sexo;
        const curGenero = (prof as { genero?: string | null }).genero;

        if ((curSexo == null || String(curSexo).trim() === '') && j.sexo) {
            const sx = sexoToProfile(j.sexo);
            if (sx) patch.sexo = sx;
        }
        if ((curGenero == null || String(curGenero).trim() === '') && j.genero) {
            const gn = generoToProfile(j.genero);
            if (gn) patch.genero = gn;
        }

        if (Object.keys(patch).length === 0) return;

        patch.updated_at = new Date().toISOString();
        const { error: upErr } = await admin.from('profiles').update(patch).eq('id', profileId);
        if (upErr) {
            console.warn('[sync-profile-demographics]', profileId, upErr.message);
            return;
        }

        patchedProfiles++;
        if (patch.sexo != null) sexoFilled++;
        if (patch.genero != null) generoFilled++;

        const next = { ...prof, ...patch };
        profMap.set(profileId, next);
    }

    for (const [, list] of byProfile) {
        const best = pickBestJugador(list);
        await applyPatch(String(best.profile_id), best);
    }

    for (const [email, list] of byEmail) {
        const profileId = emailToProfileId.get(email);
        if (!profileId) continue;
        const best = pickBestJugador(list);
        await applyPatch(profileId, best);
    }

    return NextResponse.json({
        ok: true,
        message:
            'Edad no se puede inferir desde actas sin fecha de nacimiento en BD. Para edad masiva hace falta archivo del registro (CSV) o claims en Azure.',
        jugadoresRows: rows.length,
        profilesWithLinkedJugador: byProfile.size,
        orphanJugadoresByEmail: byEmail.size,
        profilesUpdated: patchedProfiles,
        sexoFilled,
        generoFilled,
    });
}
