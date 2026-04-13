
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMatch() {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .or('equipo_a.ilike.%Oskleiderbeth%,equipo_b.ilike.%Oskleiderbeth%')
    .or('equipo_a.ilike.%Padron%,equipo_b.ilike.%Padron%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

findMatch();
