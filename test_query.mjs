import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const vars = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) vars[key.trim()] = val.join('=').trim();
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: matches } = await supabase.from('partidos').select('id').limit(1);
if (!matches?.length) { console.log('No matches'); process.exit(0); }
const testId = matches[0].id;
console.log('Match ID:', testId);

console.log('\n--- Test 1: Full query with carreras ---');
const { data: d1, error: e1 } = await supabase
  .from('partidos')
  .select(`*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre), carrera_b:carreras!carrera_b_id(nombre)`)
  .eq('id', testId)
  .single();
if (e1) console.error('FAIL:', e1.message, e1.code, e1.details, e1.hint);
else console.log('OK, keys:', Object.keys(d1));

console.log('\n--- Test 2: Without carreras ---');
const { data: d2, error: e2 } = await supabase
  .from('partidos')
  .select(`*, disciplinas(name)`)
  .eq('id', testId)
  .single();
if (e2) console.error('FAIL:', e2.message, e2.code);
else console.log('OK, keys:', Object.keys(d2));

console.log('\n--- Test 3: Eventos ---');
const { data: d3, error: e3 } = await supabase
  .from('olympics_eventos')
  .select('*, jugadores:olympics_jugadores(nombre, numero)')
  .eq('partido_id', testId)
  .order('minuto', { ascending: false });
if (e3) console.error('FAIL:', e3.message, e3.code);
else console.log('OK, count:', d3?.length);

console.log('\n--- Test 4: Pronosticos ---');
const { data: d4, error: e4 } = await supabase
  .from('pronosticos')
  .select('winner_pick, prediction_type')
  .eq('match_id', testId);
if (e4) console.error('FAIL:', e4.message, e4.code);
else console.log('OK, count:', d4?.length);

console.log('\nDone');
process.exit(0);
