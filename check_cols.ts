import { supabase } from './src/lib/supabase';
async function run() {
  const { data, error } = await supabase.from('partidos').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in partidos:', Object.keys(data[0]));
  } else {
    console.log('No data in partidos, error:', error);
  }
}
run();
