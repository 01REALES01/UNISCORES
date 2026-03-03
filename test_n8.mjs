import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    console.log("Starting test...");
    const id = 'd64df97e-41e0-4693-bdf4-cb833197601c';
    const { data, error } = await supabase.from('noticias')
        .select('*, partidos(id, equipo_a, equipo_b, fecha, estado, lugar, marcador_detalle, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre))')
        .eq('id', id)
        .single();
    console.log('Error:', error);
    console.dir(data, { depth: null });
}
test();
