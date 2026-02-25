
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        // Bypass Navigator Lock API to prevent 10s timeout conflicts with
        // the PWA service worker. Both the SW and the main thread try to
        // acquire the same lock on the auth token, causing deadlocks.
        // This no-op lock just runs the callback directly without locking.
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn()
        },
        persistSession: true,
        autoRefreshToken: true,
    },
})
