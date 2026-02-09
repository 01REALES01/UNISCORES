import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Por ahora, permitir todo el acceso
    // TODO: Implementar verificación de sesión correctamente
    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*']
}
