import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking olympics_eventos...");
    const { data: events, error } = await supabase.from('olympics_eventos').select('*').limit(1);
    if (error) console.error(error);
    else console.log("Columns:", Object.keys(events[0] || {}));

    console.log("Checking event types...");
    const { data: types } = await supabase.rpc('get_event_types_counts'); // If rpc not exists, try select
    if (!types) {
        const { data: sample } = await supabase.from('olympics_eventos').select('tipo_evento').limit(100);
        const counts = (sample || []).reduce((acc: any, e: any) => {
            acc[e.tipo_evento] = (acc[e.tipo_evento] || 0) + 1;
            return acc;
        }, {});
        console.log("Types sample:", counts);
    }
}
check();
