import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware that refreshes the Supabase auth session on every request.
 * 
 * This is critical for preventing the intermittent auth failure where:
 * 1. User has a valid refresh token but expired access token
 * 2. Client-side `getSession()` returns null because the access token expired
 * 3. User appears "logged out" despite having a valid session
 * 
 * By refreshing the session server-side in middleware, we ensure the client
 * always receives fresh auth cookies before any page renders.
 */
export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Do NOT use getSession() here — it doesn't refresh the token.
    // getUser() validates and refreshes the token if needed, writing fresh
    // cookies back via setAll above.
    await supabase.auth.getUser()

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, icon.png (browser icons)
         * - public assets (images, sw.js, manifest)
         */
        '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|sw\\.js|manifest\\.json).*)',
    ],
}
