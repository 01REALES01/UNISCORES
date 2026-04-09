import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Service-role client — bypasses RLS for jugador linking */
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;  // graceful fallback if not configured
    return createClient(url, key);
}

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const origin = requestUrl.origin

    const cookieStore = await cookies()
    
    // Create a base response so we can modify its cookies
    const response = NextResponse.redirect(`${origin}/`)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                            // CRITICAL for Next.js 15: Explicitly set on the redirect response
                            response.cookies.set(name, value, options)
                        })
                    } catch {
                        // Handle server component context
                    }
                },
            },
        }
    )

    // ── Handle OAuth callback (Microsoft / Google / etc.) ────────────────────
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error || !data.session) {
            console.error('[Auth Callback] exchangeCodeForSession failed:', error?.message)
            const errorType = error?.message?.includes('uninorte') ? 'domain_not_allowed' : 'auth_callback_failed'
            return NextResponse.redirect(`${origin}/login?error=${errorType}`)
        }

        // ── Domain Restriction Check ──────────────────────────────────────────
        const user = data.session.user
        const email = user.email || ''
        
        if (!email.endsWith('@uninorte.edu.co')) {
            console.warn('[Auth Callback] Forbidden domain:', email)
            // CRITICAL: Sign out the unauthorized user session immediately
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`)
        }

        // ── Ensure profile row exists (critical for new OAuth users) ─────────
        try {
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!existingProfile) {
                const fullName =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.user_metadata?.preferred_username ||
                    user.email?.split('@')[0] ||
                    'Usuario'

                const { error: insertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email || '',
                        full_name: fullName,
                        roles: ['public'],
                        is_public: true,
                        points: 0,
                    }, { onConflict: 'id' })

                if (insertError) {
                    console.error('[Auth Callback] Profile upsert failed:', insertError.message)
                }
            }

            // ── Auto-link jugador → profile (by email, then by name) ─────────
            // Uses service-role client to bypass RLS restrictions
            const admin = getSupabaseAdmin();
            if (admin) {
                let linked = false;

                // 1. Try email match
                if (user.email) {
                    const { data: byEmail } = await admin
                        .from('jugadores')
                        .update({ profile_id: user.id })
                        .eq('email', user.email)
                        .is('profile_id', null)
                        .select('id');
                    if (byEmail?.length) linked = true;
                }

                // 2. If no email match, try exact name match
                if (!linked) {
                    const fullName =
                        user.user_metadata?.full_name ||
                        user.user_metadata?.name || '';
                    if (fullName) {
                        const { data: byName } = await admin
                            .from('jugadores')
                            .select('id')
                            .ilike('nombre', fullName.trim())
                            .is('profile_id', null)
                            .limit(2);

                        // Only link if exactly 1 match (avoid ambiguity)
                        if (byName?.length === 1) {
                            await admin
                                .from('jugadores')
                                .update({ profile_id: user.id, email: user.email || null })
                                .eq('id', byName[0].id);
                            linked = true;
                        }
                    }
                }

                // 3. Sync profile data + propagate to partidos
                if (linked) {
                    const { data: jugadores } = await admin
                        .from('jugadores')
                        .select('id, carrera_id, disciplina_id')
                        .eq('profile_id', user.id);

                    if (jugadores?.length) {
                        // Collect unique carrera_ids and disciplina_ids from all linked jugadores
                        const carreraIds = [...new Set(jugadores.map((j: any) => j.carrera_id).filter(Boolean))];
                        const disciplinaIds = [...new Set(jugadores.map((j: any) => j.disciplina_id).filter(Boolean))];

                        // Sync carreras_ids to profile
                        if (carreraIds.length) {
                            const { data: prof } = await admin
                                .from('profiles')
                                .select('carreras_ids')
                                .eq('id', user.id)
                                .single();
                            const existing = prof?.carreras_ids || [];
                            const merged = [...new Set([...existing, ...carreraIds])];
                            await admin.from('profiles').update({ carreras_ids: merged }).eq('id', user.id);
                        }

                        // Add 'deportista' role
                        const { data: prof } = await admin
                            .from('profiles')
                            .select('roles')
                            .eq('id', user.id)
                            .single();
                        const roles: string[] = prof?.roles || [];
                        if (!roles.includes('deportista')) {
                            await admin.from('profiles').update({ roles: [...roles, 'deportista'] }).eq('id', user.id);
                        }

                        // Register disciplines in profile_disciplinas
                        if (disciplinaIds.length) {
                            await admin.from('profile_disciplinas').upsert(
                                disciplinaIds.map((did: any) => ({ profile_id: user.id, disciplina_id: did })),
                                { onConflict: 'profile_id,disciplina_id', ignoreDuplicates: true }
                            );
                        }

                        // Propagate athlete_X_id to partidos via roster
                        for (const jug of jugadores) {
                            const { data: roster } = await admin
                                .from('roster_partido')
                                .select('partido_id, equipo_a_or_b')
                                .eq('jugador_id', jug.id);

                            if (roster) {
                                for (const r of roster) {
                                    const col = r.equipo_a_or_b === 'equipo_a' ? 'athlete_a_id' : 'athlete_b_id';
                                    await admin
                                        .from('partidos')
                                        .update({ [col]: user.id })
                                        .eq('id', r.partido_id)
                                        .is(col, null);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('[Auth Callback] Profile check/creation error:', err?.message)
        }
    }

    // ── Handle Magic Link callback (email OTP) ──────────────────────────────
    if (token_hash && type) {
        const { data: otpData, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'magiclink' | 'email',
        })

        if (error) {
            console.error('[Auth Callback] verifyOtp failed:', error.message)
            return NextResponse.redirect(`${origin}/login?error=otp_failed`)
        }

        // ── Domain Restriction Check for OTP ────────────────────────────────
        const otpEmail = otpData?.user?.email || ''
        if (!otpEmail.endsWith('@uninorte.edu.co')) {
            console.warn('[Auth Callback] Forbidden domain (OTP):', otpEmail)
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`)
        }
    }

    return response
}
