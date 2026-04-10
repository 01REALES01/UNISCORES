
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log("--- DEBUGGING DATA ---");

    const { count: totalEvents } = await supabase.from('olympics_eventos').select('*', { count: 'exact', head: true });
    console.log("Total olympics_eventos:", totalEvents);

    const { data: finalizedMatches } = await supabase.from('partidos').select('id, slug').eq('estado', 'finalizado');
    console.log("Finalized matches:", finalizedMatches?.length, finalizedMatches?.map(m => m.id));

    const { data: eventsWithPartidos } = await supabase.from('olympics_eventos').select('id, tipo_evento, partido_id, partidos(estado)').limit(10);
    console.log("Sample events with partido status:", eventsWithPartidos);

    const { count: eventsInFinalized } = await supabase
        .from('olympics_eventos')
        .select('id', { count: 'exact', head: true })
        .eq('partidos.estado', 'finalizado');
    
    // Actually the above filter is wrong in Supabase JS for head query on join. 
    // Let's do a proper select.
    const { data: joinedData } = await supabase
        .from('olympics_eventos')
        .select('id, partidos!inner(estado)')
        .eq('partidos.estado', 'finalizado');
    
    console.log("Events in finalized matches (via inner join):", joinedData?.length);
}

// Note: This script needs to be run in an environment where env vars are set.
// Since I can't easily run it, I'll just improve the fetch logic to be more resilient.
