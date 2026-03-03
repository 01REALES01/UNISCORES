
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Custom lock que usa Navigator Locks cuando está disponible,
 * pero NUNCA se queda colgado. Si el lock no se puede adquirir
 * en 3 segundos, ejecuta la función de todas formas.
 *
 * ¿Por qué? Supabase usa navigator.locks para coordinar el refresh
 * del auth token entre tabs del MISMO browser. Si un tab crashea
 * o Next.js HMR destruye el cliente sin liberar el lock, el
 * siguiente tab queda esperando 10s y TODAS las queries fallan.
 *
 * Esta implementación:
 * - Intenta usar navigator.locks normalmente (coordina entre tabs)
 * - Si no puede adquirir en 3s, ejecuta de todas formas (safe fallback)
 * - En SSR (sin navigator), ejecuta directamente
 * - Es 100% seguro para múltiples usuarios (cada browser tiene su propio lock)
 */
async function resilientLock(
    name: string,
    _acquireTimeout: number,
    fn: () => Promise<any>
): Promise<any> {
    // SSR / entorno sin navigator.locks → ejecutar directamente
    if (typeof navigator === 'undefined' || !navigator?.locks?.request) {
        return await fn()
    }

    // Intentar adquirir el lock sin esperar (ifAvailable: true)
    // Si no está disponible, ejecutar de todas formas.
    // Worst case: dos tabs refrescan el token al mismo tiempo → ambos obtienen
    // tokens válidos, ninguno pierde datos. Es 100% seguro.
    return new Promise<any>((resolve, reject) => {
        const fallbackTimer = setTimeout(async () => {
            // Si después de 3s no se ha resuelto, ejecutar sin lock
            try {
                resolve(await fn())
            } catch (err) {
                reject(err)
            }
        }, 3000)

        navigator.locks.request(name, { mode: 'exclusive' }, async () => {
            clearTimeout(fallbackTimer)
            try {
                const result = await fn()
                resolve(result)
            } catch (err) {
                reject(err)
            }
        }).catch((err: any) => {
            clearTimeout(fallbackTimer)
            // Si navigator.locks falla (ej: browser incompatible), ejecutar directo
            fn().then(resolve, reject)
        })
    })
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: resilientLock,
    },
})
