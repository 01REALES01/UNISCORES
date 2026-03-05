/**
 * supabase-query.ts
 * Wrapper simple y confiable para queries de Supabase.
 * Sin caché, sin magia — solo timeout para que nunca se cuelgue.
 */

const TIMEOUT_MS = 20000; // 20s — aumentado para redes lentas y cold starts

type QueryResult<T> = {
    data: T | null;
    error: { message: string; code?: string } | null;
};

/**
 * Ejecuta una query de Supabase con timeout.
 * Si no responde en 8s, devuelve error en vez de colgar el UI.
 */
export async function safeQuery<T = any>(
    queryBuilder: PromiseLike<{ data: T | null; error: any }>,
    label?: string
): Promise<QueryResult<T>> {
    try {
        const result = await withTimeout(queryBuilder, TIMEOUT_MS);

        if (result.error) {
            console.warn(`[safeQuery] ${label || ''} error:`, result.error.message);
            return {
                data: null,
                error: { message: result.error.message || 'Unknown error', code: result.error.code },
            };
        }

        return { data: result.data, error: null };
    } catch (err: any) {
        console.error(`[safeQuery] ${label || ''} timeout/crash:`, err?.message);
        return {
            data: null,
            error: { message: err?.message || 'Network error', code: 'FETCH_FAILED' },
        };
    }
}

/**
 * Ejecuta una mutación de Supabase con timeout. NO reintenta.
 */
export async function safeMutation<T = any>(
    queryBuilder: PromiseLike<{ data: T | null; error: any }>,
    label?: string
): Promise<QueryResult<T>> {
    try {
        const result = await withTimeout(queryBuilder, TIMEOUT_MS);

        if (result.error) {
            console.warn(`[safeMutation] ${label || ''} error:`, result.error.message);
            return {
                data: null,
                error: { message: result.error.message || 'Error en base de datos', code: result.error.code },
            };
        }

        return { data: result.data, error: null };
    } catch (err: any) {
        console.error(`[safeMutation] ${label || ''} crashed:`, err?.message);
        return {
            data: null,
            error: {
                message: err?.message?.includes('timed out')
                    ? 'La conexión está muy lenta (Timeout)'
                    : (err?.message || 'Error de red'),
                code: 'MUTATION_FAILED',
            },
        };
    }
}

// ─── Invalidación de caché (no-ops por ahora, para no romper imports) ────────
export function invalidateCache(_key: string): void { /* no-op */ }
export function invalidateAllCache(): void { /* no-op */ }

// ─── Helpers internos ────────────────────────────────────────────────────────

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Query timed out after ${ms}ms`));
        }, ms);

        Promise.resolve(promise).then(
            (result) => { clearTimeout(timer); resolve(result); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}
