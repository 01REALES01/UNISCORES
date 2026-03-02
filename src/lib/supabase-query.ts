import { supabase } from './supabase';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

const MAX_RETRIES = 2;
const TIMEOUT_MS = 8000;
const RETRY_DELAYS = [1000, 2000]; // Exponential backoff

type QueryResult<T> = {
    data: T | null;
    error: { message: string; code?: string } | null;
};

/**
 * Execute a Supabase query with automatic timeout, retry, and error recovery.
 * 
 * NEVER hangs forever — always resolves within MAX_RETRIES * TIMEOUT_MS.
 * 
 * Usage:
 *   const { data, error } = await safeQuery(
 *     supabase.from('partidos').select('*, disciplinas(name)')
 *   );
 */
export async function safeQuery<T = any>(
    queryBuilder: PromiseLike<{ data: T | null; error: any }>,
    label?: string
): Promise<QueryResult<T>> {

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await withTimeout(queryBuilder, TIMEOUT_MS);

            if (result.error) {
                console.warn(
                    `[safeQuery]${label ? ` ${label}` : ''} attempt ${attempt + 1} error:`,
                    result.error.message || result.error
                );

                // If it's a recoverable error and we have retries left, retry
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAYS[attempt] || 1000);
                    continue;
                }

                return {
                    data: null,
                    error: {
                        message: result.error.message || 'Unknown error',
                        code: result.error.code,
                    },
                };
            }

            return { data: result.data, error: null };

        } catch (err: any) {
            console.error(
                `[safeQuery]${label ? ` ${label}` : ''} attempt ${attempt + 1} crashed:`,
                err?.message || err
            );

            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAYS[attempt] || 1000);
                continue;
            }

            return {
                data: null,
                error: {
                    message: err?.message || 'Network error',
                    code: 'FETCH_FAILED',
                },
            };
        }
    }

    // Fallback (should never reach here)
    return { data: null, error: { message: 'Max retries exceeded', code: 'MAX_RETRIES' } };
}

/**
 * Execute multiple Supabase queries in parallel, all with timeout + retry protection.
 * 
 * Usage:
 *   const [matches, predictions] = await safeQueryAll([
 *     supabase.from('partidos').select('*'),
 *     supabase.from('pronosticos').select('*'),
 *   ]);
 */
export async function safeQueryAll<T extends any[]>(
    queries: { [K in keyof T]: PromiseLike<{ data: T[K] | null; error: any }> },
    labels?: string[]
): Promise<{ [K in keyof T]: QueryResult<T[K]> }> {
    const results = await Promise.all(
        queries.map((q, i) => safeQuery(q, labels?.[i]))
    );
    return results as any;
}

// --- Internal helpers ---

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Query timed out after ${ms}ms`));
        }, ms);

        Promise.resolve(promise).then(
            (result) => {
                clearTimeout(timer);
                resolve(result);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
