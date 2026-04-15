const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('partidos')
    .select('*, disciplinas(name, icon), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)')
    .order('fecha', { ascending: true });
    
  console.log("Error:", error);
  console.log("Total matches:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("Sample 1:", data[0].fecha, data[0].disciplinas?.name);
    console.log("Sample 2:", data[data.length-1].fecha);
  }
}
check();
