-- Eliminar políticas previas si existen para evitar errores de duplicado
drop policy if exists "Admins can update any profile" on profiles;
drop policy if exists "Admins can update user roles" on profiles; -- Nombre alternativo que pude haber tenido
drop policy if exists "Users can update own profile" on profiles;

-- POLICY: Permitir a los administradores actualizar cualquier perfil (CRÍTICO para asignar roles)
create policy "Admins can update any profile"
  on profiles for update
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- POLICY: Permitir a los usuarios editar SU PROPIO perfil (nombre, etc.)
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- RECORDATORIO:
-- Si tu usuario actual NO es admin, necesitarás ejecutar esto manualmente una vez
-- para darte permisos a ti mismo (cambia el email por el tuyo):
-- update profiles set role = 'admin' where email = 'admin@uninorte.edu.co';
