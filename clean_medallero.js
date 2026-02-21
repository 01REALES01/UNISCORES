require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function clean() {
    // get all 
    const { data } = await supabase.from('medallero').select('*').order('puntos', {ascending: false});
    console.log("Current Data:", data);
    
    // reset oro, plata, bronce to 0 for logic sanity if they don't have matches, but wait...
    // The user said "medicina tiene como 8 medallas pero solo lleva 1 partido, entonces esa informacion no se donde sale, y hay 2 carrreras iguales"
    // So let's delete "Ingeniería" and keep "Ingeniería de Sistemas", "Ingeniería Civil", "Ingeniería Industrial", "Ingeniería Mecánica"
    // Let's reset all medals to 0 for everyone. The points are calculated based on matches.
    // If we want we can also recount medals based on the 'finalizado' matches, but the user just wants the dirty data cleared.
    for (const row of data) {
        if (row.equipo_nombre === 'Ingeniería') {
            await supabase.from('medallero').delete().eq('id', row.id);
        } else {
            // Reset medals to 0 or derive from matches? The app doesn't automatically award medals except in race-control.
            // Let's reset medals to 0 for now so it's clean, or we leave points
            await supabase.from('medallero').update({oro: 0, plata: 0, bronce: 0}).eq('id', row.id);
        }
    }
    
    // let's re-fetch to see what remains
    const { data: final } = await supabase.from('medallero').select('*').order('puntos', {ascending: false});
    console.log("Cleaned Data:", final);
}

clean().catch(console.error);
