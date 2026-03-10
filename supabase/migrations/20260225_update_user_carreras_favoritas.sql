-- 1. Agregamos la nueva columna como llave foránea
ALTER TABLE public.user_carreras_favoritas 
ADD COLUMN IF NOT EXISTS carrera_id bigint references public.carreras(id);

-- 2. Migramos los datos existentes (hacemos match del texto con el nombre de la carrera)
UPDATE public.user_carreras_favoritas ucf
SET carrera_id = c.id
FROM public.carreras c
WHERE ucf.carrera = c.nombre;

-- 3. Limpiamos registros huérfanos que no hicieron match con nada y que, por tanto, tendrían NULL
DELETE FROM public.user_carreras_favoritas WHERE carrera_id IS NULL;

-- 4. Hacemos la columna not null
ALTER TABLE public.user_carreras_favoritas ALTER COLUMN carrera_id SET NOT NULL;

-- 5. Borramos la columna vieja de texto
ALTER TABLE public.user_carreras_favoritas DROP COLUMN IF EXISTS carrera;

-- 6. Agregamos una restricción unique para evitar duplicados
-- (Usamos gen_random_uuid si no existe, o si ya hay un id primario, simplemente añadimos el constraint sobre las columnas)
ALTER TABLE public.user_carreras_favoritas 
DROP CONSTRAINT IF EXISTS user_carreras_unique;
ALTER TABLE public.user_carreras_favoritas 
ADD CONSTRAINT user_carreras_unique UNIQUE(user_id, carrera_id);

-- 7. Activar RLS en caso de no estarlo y agregar las políticas base
ALTER TABLE public.user_carreras_favoritas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propias carreras" ON public.user_carreras_favoritas;
CREATE POLICY "Usuarios pueden ver sus propias carreras"
    ON public.user_carreras_favoritas FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios pueden insertar sus propias carreras" ON public.user_carreras_favoritas;
CREATE POLICY "Usuarios pueden insertar sus propias carreras"
    ON public.user_carreras_favoritas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propias carreras" ON public.user_carreras_favoritas;
CREATE POLICY "Usuarios pueden eliminar sus propias carreras"
    ON public.user_carreras_favoritas FOR DELETE
    USING (auth.uid() = user_id);
