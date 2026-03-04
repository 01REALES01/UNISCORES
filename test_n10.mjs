import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('partidos')
      .select('id, carrera_a_id, carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)')
      .limit(5);
  console.log(error);
  console.log(JSON.stringify(data, null, 2));
}
test();
