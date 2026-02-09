-- ============================================
-- SCRIPT DE CONFIGURACIÓN DE AUTENTICACIÓN
-- ============================================

-- Este script crea un usuario administrador de prueba
-- IMPORTANTE: Ejecutar esto en Supabase SQL Editor

-- 1. Primero, crea el usuario en Supabase Dashboard:
--    - Ve a Authentication > Users > Add User
--    - Email: admin@uninorte.edu.co
--    - Password: Admin123! (cambiar en producción)
--    - Confirmar email automáticamente

-- 2. Luego ejecuta este SQL para asignar el rol:
-- Nota: Reemplaza 'USER_ID_AQUI' con el ID del usuario que acabas de crear

-- Ejemplo de cómo insertar el perfil de admin:
-- insert into profiles (id, email, role, created_at)
-- values (
--   'USER_ID_AQUI',  -- Copiar desde Authentication > Users
--   'admin@uninorte.edu.co',
--   'admin',
--   now()
-- );

-- ============================================
-- TRIGGER AUTOMÁTICO PARA NUEVOS USUARIOS
-- ============================================

-- Este trigger crea automáticamente un perfil cuando se registra un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, created_at)
  values (
    new.id,
    new.email,
    'public', -- Por defecto todos son público
    now()
  );
  return new;
end;
$$;

-- Eliminar trigger si existe
drop trigger if exists on_auth_user_created on auth.users;

-- Crear el trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FUNCIÓN PARA PROMOVER USUARIO A ADMIN
-- ============================================

create or replace function promote_to_admin(user_email text)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set role = 'admin'
  where email = user_email;
end;
$$;

-- Uso: select promote_to_admin('admin@uninorte.edu.co');

-- ============================================
-- FUNCIÓN PARA ASIGNAR DATA ENTRY
-- ============================================

create or replace function assign_data_entry(user_email text, discipline_name text)
returns void
language plpgsql
security definer
as $$
declare
  user_id uuid;
  disc_id int;
begin
  -- Obtener ID del usuario
  select id into user_id from profiles where email = user_email;
  
  -- Obtener ID de la disciplina
  select id into disc_id from disciplinas where name = discipline_name;
  
  -- Actualizar rol
  update profiles
  set role = 'data_entry',
      assigned_discipline_id = disc_id
  where id = user_id;
end;
$$;

-- Uso: select assign_data_entry('estudiante@uninorte.edu.co', 'Fútbol');
