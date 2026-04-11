import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
    try {
        const { userId } = await request.json()
        if (!userId) {
            return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
        }

        const cookieStore = await cookies()
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
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // Safe to ignore in edge cases
                        }
                    },
                },
            }
        )

        // 1. Verificar que el solicitante sea Administrador
        const { data: { user: requester }, error: authError } = await supabase.auth.getUser()
        if (authError || !requester) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', requester.id)
            .single()

        if (!profile?.roles?.includes('admin')) {
            return NextResponse.json({ error: 'Privilegios de administrador necesarios' }, { status: 403 })
        }

        // 2. Evitar auto-eliminación
        if (userId === requester.id) {
            return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta de administrador' }, { status: 400 })
        }

        // 3. Inicializar Cliente Admin (Service Role)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 4. Desvincular Atletas (jugadores) preventivamente
        // Esto asegura que el historial de partidos se mantenga pero sin el link al perfil borrado
        await supabaseAdmin
            .from('jugadores')
            .update({ profile_id: null })
            .eq('profile_id', userId)

        // 5. Eliminar de Auth (dispara cascada a profiles y tablas relacionadas)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
            console.error('[Delete User] Supabase Auth Error:', deleteError)
            return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Cuenta de usuario y perfil eliminados correctamente' 
        })

    } catch (err: any) {
        console.error('[API Admin Delete User] Error crítico:', err.message)
        return NextResponse.json({ 
            error: 'Error interno del servidor', 
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 })
    }
}
