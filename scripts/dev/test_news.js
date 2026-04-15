require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('noticias')
    .select('id, titulo, partidos(equipo_a, equipo_b, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre))')
    .limit(1);
  console.log('Error:', error);
  console.dir(data, {depth: null});
}
test();
