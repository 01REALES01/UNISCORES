/**
 * supabase-cache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Caché en memoria simple para queries de Supabase.
 *
 * Estrategia: "Stale-While-Revalidate"
 *   1. Si hay datos en caché frescos (< TTL) → devuelve de inmediato.
 *   2. Si hay datos stale → devuelve el stale al instante Y revalida en BG.
 *   3. Si no hay nada → ejecuta la query normalmente (primera carga).
 *
 * NOTA DE SEGURIDAD: No hay deduplicación de requests in-flight para evitar
 * deadlocks. Si dos llamadas llegan al mismo tiempo sin caché, ambas hacen
 * su propia query. Eso es perfectamente aceptable y seguro.
 */

const DEFAULT_TTL_MS = 30_000; // 30 segundos

type CacheEntry<T> = {
    data: T;
    fetchedAt: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();

type CachedQueryOptions = {
    /** Tiempo en ms que los datos se consideran "frescos". Default: 30_000 (30s) */
    ttl?: number;
};

type CachedQueryResult<T> = {
    data: T | null;
    error: { message: string; code?: string } | null;
    /** true si los datos vienen del caché y ya se lanzó una revalidación en background */
    stale: boolean;
};

/**
 * Ejecuta o reutiliza una query de Supabase con caché stale-while-revalidate.
 *
 * @param queryFn  Función que ejecuta la query y devuelve { data, error }.
 * @param cacheKey Clave única para identificar esta query en el caché.
 * @param options  Opciones del caché (ttl).
 */
export async function cachedQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    cacheKey: string,
    options: CachedQueryOptions = {}
): Promise<CachedQueryResult<T>> {
    const { ttl = DEFAULT_TTL_MS } = options;

    const now = Date.now();
    const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;

    // ── CASO 1: Datos frescos en caché ────────────────────────────────────────
    if (entry && (now - entry.fetchedAt) < ttl) {
        return { data: entry.data, error: null, stale: false };
    }

    // ── CASO 2: Datos stale en caché → devolver stale + revalidar en BG ───────
    if (entry) {
        // Fire-and-forget: revalidación silenciosa en background
        // Marcamos la entrada como "reciente" antes de lanzar el fetch para
        // que múltiples renders simultáneos no lancen fetch múltiple.
        cache.set(cacheKey, { ...entry, fetchedAt: now });

        queryFn().then(result => {
            if (result.data !== null && result.data !== undefined) {
                cache.set(cacheKey, { data: result.data, fetchedAt: Date.now() });
            }
        }).catch(() => {
            // Si falla la revalidación silenciosa, restaurar fetchedAt original
            // para que el próximo intento vuelva a intentar.
            const current = cache.get(cacheKey);
            if (current) {
                cache.set(cacheKey, { ...current, fetchedAt: entry.fetchedAt });
            }
        });

        return { data: entry.data, error: null, stale: true };
    }

    // ── CASO 3: Sin caché → ejecutar query fresca (primera carga) ─────────────
    const result = await queryFn();

    if (result.data !== null && result.data !== undefined) {
        cache.set(cacheKey, { data: result.data, fetchedAt: Date.now() });
        return { data: result.data, error: null, stale: false };
    }

    // La query falló o devolvió null — NO guardar en caché
    return {
        data: null,
        error: result.error ?? { message: 'No data returned' },
        stale: false,
    };
}

/**
 * Invalida una entrada del caché por su clave.
 * Úsala después de mutations para forzar un re-fetch fresco en la próxima visita.
 *
 * @example
 *   invalidateCache('home-partidos');
 *   invalidateCache('admin-dashboard');
 */
export function invalidateCache(cacheKey: string): void {
    cache.delete(cacheKey);
}

/**
 * Invalida todas las entradas. Útil al cerrar sesión.
 */
export function invalidateAllCache(): void {
    cache.clear();
}

/**
 * Devuelve el número de entradas en caché (para debugging).
 */
export function getCacheSize(): number {
    return cache.size;
}
