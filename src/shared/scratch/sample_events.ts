import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function sample() {
    const { data: events } = await supabase
        .from('olympics_eventos')
        .select('*, jugadores(id, nombre), partidos(id, estado, disciplinas(name))')
        .limit(50);
    
    console.log(JSON.stringify(events, null, 2));
}

sample();
