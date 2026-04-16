import { supabase } from "@/lib/supabase";
async function run() {
  const { data: carreras } = await supabase.from('carreras').select('id, nombre').ilike('nombre', '%ciencia%datos%');
  console.log('Carreras:', carreras);
  
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').ilike('full_name', '%Mateo%');
  console.log('Profiles with Mateo:', profiles);

  const { data: jugadores } = await supabase.from('jugadores').select('id, nombre').ilike('nombre', '%Mateo%');
  console.log('Jugadores with Mateo:', jugadores);
}
run();
