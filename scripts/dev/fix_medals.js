require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const safeIncludes = (str1, str2) => {
    if (!str1 || !str2) return false;
    const s1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const s2 = str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return s1.includes(s2) || s2.includes(s1);
}

async function run() {
    const { data: matches } = await supabase
        .from('partidos')
        .select('*, disciplinas(*)')
        .eq('estado', 'finalizado');

    const { data: medalleroList } = await supabase.from('medallero').select('*');
            
    for(const t of medalleroList) {
        let pts = 0;
        let won=0, draw=0, lost=0;
        
        matches.forEach(m => {
            const isA = safeIncludes(m.equipo_a, t.equipo_nombre);
            const isB = safeIncludes(m.equipo_b, t.equipo_nombre);
            
            if(!isA && !isB) return;
            
            let scoreA = m.marcador_detalle?.goles_a ?? m.marcador_detalle?.sets_a ?? m.marcador_detalle?.total_a ?? m.marcador_detalle?.puntos_a ?? m.marcador_detalle?.juegos_a ?? 0;
            let scoreB = m.marcador_detalle?.goles_b ?? m.marcador_detalle?.sets_b ?? m.marcador_detalle?.total_b ?? m.marcador_detalle?.puntos_b ?? m.marcador_detalle?.juegos_b ?? 0;
            
            const myScore = isA ? scoreA : scoreB;
            const theirScore = isA ? scoreB : scoreA;
            
            if (myScore > theirScore) {
                pts += 3;
                won++;
            } else if (myScore < theirScore) {
                lost++;
            } else {
                pts += 1;
                draw++;
            }
        });
        
        if (pts !== t.puntos) {
             console.log(`Updating ${t.equipo_nombre}: from ${t.puntos} to ${pts} pts (W:${won} D:${draw} L:${lost})`);
             await supabase.from('medallero').update({ puntos: pts }).eq('id', t.id);
        }
    }
    console.log("Done");
}

run().catch(console.error);
