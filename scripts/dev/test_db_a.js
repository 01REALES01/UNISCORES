const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: disc } = await supabase.from('disciplinas').select('id, name');
    const fID = disc.find(d => d.name === 'Fútbol')?.id;

    const { data, error } = await supabase
        .from('partidos')
        .select('*')
        .eq('disciplina_id', fID)
        .eq('genero', 'masculino')
        .eq('grupo', 'A');
        
    console.log("Matches in Group A:");
    data.forEach(m => {
        console.log(`[ID ${m.id}] ${m.equipo_a} Vs ${m.equipo_b} | Fecha: ${m.fecha} | Fase: ${m.fase}`);
    });
}
check();
