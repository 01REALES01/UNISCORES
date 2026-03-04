import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const id = 'd64df97e-41e0-4693-bdf4-cb833197601c';
  const { data, error } = await supabase.from('noticias')
      .select('id, titulo, contenido, imagen_url, categoria, autor_nombre, partido_id, carrera, published, created_at, partidos(id, equipo_a, equipo_b, fecha, estado, lugar, marcador_detalle, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre))')
      .eq('id', id)
      .single();
  console.log('Error 1:', error);
  const { data: relatedData, error: error2 } = await supabase.from('noticias')
                        .select('id, titulo, contenido, imagen_url, categoria, created_at, published, partidos(equipo_a, equipo_b, disciplinas(name))')
                        .eq('published', true)
                        .neq('id', id)
                        .order('created_at', { ascending: false })
                        .limit(4);
  console.log('Error 2:', error2);
}
test();
