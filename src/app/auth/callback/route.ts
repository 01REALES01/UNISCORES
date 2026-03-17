import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
            return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
        }

        // ── Ensure profile row exists (critical for new OAuth users) ─────────
        const user = data.session.user
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
        } catch (err: any) {
            console.error('[Auth Callback] Profile check/creation error:', err?.message)
        }
    }

    // ── Handle Magic Link callback (email OTP) ──────────────────────────────
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'magiclink' | 'email',
        })

        if (error) {
            console.error('[Auth Callback] verifyOtp failed:', error.message)
            return NextResponse.redirect(`${origin}/login?error=otp_failed`)
        }
    }

    return response
}
