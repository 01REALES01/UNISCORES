import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    console.log("Starting second query...");
    const start = Date.now();
    const id = 'd64df97e-41e0-4693-bdf4-cb833197601c';
    const result = await supabase.from('noticias')
        .select('*, partidos(equipo_a, equipo_b, disciplinas(name))')
        .eq('published', true)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(4);
    console.log(`Finished in ${Date.now() - start}ms`);
    console.log('Error:', result.error);
}
test();
