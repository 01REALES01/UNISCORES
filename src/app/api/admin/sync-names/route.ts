import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/sync-names
 *
 * Updates profiles.full_name from jugadores.nombre for all users
 * that have a linked jugador (profile_id set) and whose current
 * full_name has no spaces (i.e. is still just the email username).
 *
 * Requires: admin role. Uses the authenticated session client (no service role needed)
 * since profiles RLS already allows admins to update any profile.
 */
export async function POST() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch { /* safe to ignore */ }
                    },
                },
            }
        );

        // Auth check
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', user.id)
            .single();

        if (!profile?.roles?.includes('admin')) {
            return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
        }

        // Fetch all jugadores with a linked profile
        const { data: jugadores, error: jugErr } = await supabase
            .from('jugadores')
            .select('profile_id, nombre')
            .not('profile_id', 'is', null);

        if (jugErr || !jugadores) {
            return NextResponse.json({ error: `Error al leer jugadores: ${jugErr?.message}` }, { status: 500 });
        }

        // Build a map: profile_id → nombre (first jugador wins if multiple)
        const nameMap = new Map<string, string>();
        for (const j of jugadores) {
            if (j.profile_id && j.nombre && !nameMap.has(j.profile_id)) {
                nameMap.set(j.profile_id, j.nombre);
            }
        }

        if (nameMap.size === 0) {
            return NextResponse.json({ updated: 0, message: 'No hay jugadores vinculados a perfiles.' });
        }

        // Fetch profiles in chunks: .in() con cientos de UUIDs puede dejar un URL de PostgREST
        // demasiado largo y fallar con "TypeError: fetch failed" (no es un error de RLS clásico).
        const profileIds = Array.from(nameMap.keys());
        const IN_CHUNK = 100;
        const profiles: { id: string; full_name: string | null }[] = [];
        for (let i = 0; i < profileIds.length; i += IN_CHUNK) {
            const batch = profileIds.slice(i, i + IN_CHUNK);
            const { data: chunk, error: profErr } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', batch);

            if (profErr) {
                console.error('[sync-names] batch profiles', i, profErr);
                return NextResponse.json(
                    { error: `Error al leer profiles: ${profErr.message}` },
                    { status: 500 }
                );
            }
            if (chunk?.length) profiles.push(...chunk);
        }

        // Only update profiles whose full_name has no space (= still a username)
        const toUpdate = profiles.filter(
            (p: any) => !p.full_name || !p.full_name.includes(' ')
        );

        if (toUpdate.length === 0) {
            return NextResponse.json({ updated: 0, message: 'Todos los nombres ya están actualizados.' });
        }

        // Apply updates sequentially to avoid RLS issues with concurrent requests
        let updated = 0;
        const errors: string[] = [];

        for (const p of toUpdate) {
            const newName = nameMap.get(p.id);
            if (!newName) continue;
            const { error: upErr } = await supabase
                .from('profiles')
                .update({ full_name: newName })
                .eq('id', p.id);
            if (upErr) {
                errors.push(`${p.id}: ${upErr.message}`);
            } else {
                updated++;
            }
        }

        return NextResponse.json({
            updated,
            message: updated > 0
                ? `${updated} nombre${updated !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''} correctamente.`
                : 'Todos los nombres ya están actualizados.',
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        });

    } catch (err: unknown) {
        const e = err as { message?: string; cause?: unknown };
        const detail = e?.cause != null ? `${e.message || 'Error'} — ${String(e.cause)}` : (e?.message || 'Error desconocido');
        console.error('[sync-names]', err);
        return NextResponse.json({ error: 'Error interno del servidor', details: detail }, { status: 500 });
    }
}
