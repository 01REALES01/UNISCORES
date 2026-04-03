-- Agregar rol 'deportista' a delaasuncionp@uninorte.edu.co (ya es admin)
-- Ejecutar en el SQL Editor de Supabase

UPDATE public.profiles
SET 
  roles = ARRAY['admin', 'deportista'],
  updated_at = NOW()
WHERE email = 'delaasuncionp@uninorte.edu.co';

-- Verificar el resultado
SELECT id, email, roles, athlete_disciplina_id 
FROM public.profiles 
WHERE email = 'delaasuncionp@uninorte.edu.co';
