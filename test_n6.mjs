import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  console.log("Starting query...");
  const start = Date.now();
  const result = await supabase.from('noticias')
    .select('*, partidos(id, equipo_a, equipo_b, fecha, estado, lugar, marcador_detalle, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre))')
    .limit(1)
    .single();
  console.log(`Finished in ${Date.now() - start}ms`);
  console.log('Error:', result.error);
}
test();
