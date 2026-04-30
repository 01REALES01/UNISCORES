import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetMatch() {
  const MATCH_ID = 1630;

  // First show current state
  const { data: current } = await supabase
    .from('partidos')
    .select('id, equipo_a, equipo_b, estado, marcador_detalle, genero, fase')
    .eq('id', MATCH_ID)
    .single();

  console.log('Estado actual:', JSON.stringify(current, null, 2));

  // Reset marcador_detalle to null (match is still "programado")
  const { data, error } = await supabase
    .from('partidos')
    .update({ marcador_detalle: null })
    .eq('id', MATCH_ID)
    .select('id, equipo_a, equipo_b, estado, marcador_detalle, genero, fase');

  if (error) {
    console.error('Error al restaurar:', error);
    return;
  }

  console.log('\nRestaurado correctamente:', JSON.stringify(data?.[0] ?? data, null, 2));
}

resetMatch();
