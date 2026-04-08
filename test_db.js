const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: disc } = await supabase.from('disciplinas').select('id, name');
    const fID = disc.find(d => d.name === 'Fútbol')?.id;
    console.log("Fútbol ID:", fID);

    const { data, error } = await supabase
        .from('partidos')
        .select('*')
        .eq('disciplina_id', fID)
        .eq('genero', 'masculino');
        
    console.log("Total Futbol Masculino matches in DB:", data?.length);

    if (data) {
        const byGroup = {};
        data.forEach(m => {
            const g = m.grupo || 'NO_GROUP';
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(m);
        });
        
        for (const g in byGroup) {
            console.log(`\nGroup ${g}: ${byGroup[g].length} matches`);
            if (g !== 'NO_GROUP') {
               const teams = new Set();
               byGroup[g].forEach(m => {
                   teams.add(m.equipo_a);
                   teams.add(m.equipo_b);
               });
               console.log("Teams in", g, ":", Array.from(teams));
            }
        }
    }
}
check();
