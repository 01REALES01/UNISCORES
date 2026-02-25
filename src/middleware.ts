import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Auth is handled client-side by useAuth hook
    // Server-side protection requires @supabase/ssr (cookie-based auth)
    // TODO: Migrate to @supabase/ssr for proper server-side auth protection
    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}
