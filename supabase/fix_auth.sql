-- ============================================
-- PASO 1: RECREAR TABLA PROFILES (SI ES NECESARIO)
-- ============================================

-- Primero, eliminar la tabla si existe (CUIDADO: esto borra datos)
drop table if exists profiles cascade;

-- Recrear el tipo enum
drop type if exists user_role cascade;
create type user_role as enum ('admin', 'data_entry', 'public');

-- Crear tabla profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role user_role default 'public',
  full_name text,
  assigned_discipline_id bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table profiles enable row level security;

-- Política: Todos pueden ver perfiles
create policy "Profiles are viewable by everyone" 
  on profiles for select 
  using (true);

-- Política: Los usuarios pueden actualizar su propio perfil
create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

-- ============================================
-- PASO 2: CREAR TRIGGER PARA AUTO-CREAR PERFIL
-- ============================================

-- Función que se ejecuta cuando se crea un usuario
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
    'public',
    now()
  );
  return new;
end;
$$;

-- Eliminar trigger anterior si existe
drop trigger if exists on_auth_user_created on auth.users;

-- Crear trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- PASO 3: FUNCIONES HELPER
-- ============================================

-- Promover usuario a admin
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

-- Asignar Data Entry
create or replace function assign_data_entry(user_email text, discipline_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update profiles
  set role = 'data_entry',
      assigned_discipline_id = discipline_id
  where email = user_email;
end;
$$;

-- ============================================
-- LISTO! Ahora puedes crear usuarios
-- ============================================
