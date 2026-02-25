import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
    // Only protect admin routes
    if (!request.nextUrl.pathname.startsWith('/admin')) {
        return NextResponse.next()
    }

    // Allow the admin login page itself
    if (request.nextUrl.pathname === '/admin/login') {
        return NextResponse.next()
    }

    // Check for Supabase auth token in cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.next()
    }

    // Get the auth token from cookies
    const authCookieName = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
    const authCookie = request.cookies.get(authCookieName)?.value
        || request.cookies.get('sb-access-token')?.value

    if (!authCookie) {
        // No session found — redirect to admin login
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Verify the token is valid by checking with Supabase
    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: { Authorization: `Bearer ${authCookie}` }
            }
        })

        const { data: { user }, error } = await supabase.auth.getUser(authCookie)

        if (error || !user) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }

        // Optionally check role from profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || (profile.role !== 'admin' && profile.role !== 'data_entry')) {
            // Not authorized — redirect to home
            return NextResponse.redirect(new URL('/', request.url))
        }

    } catch {
        // On any error, allow through (fail open) to avoid locking out admins
        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}
