import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// createBrowserClient automatically uses cookies for session storage 
// and avoids the Navigator.locks deadlocks that occur with localStorage in Next.js
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
