import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkMedallero() {
  const { data, error } = await supabase.from('medallero').select('*');
  console.log('Medallero data:', data);
  if (error) console.error('Error fetching medallero:', error);
}

checkMedallero();
