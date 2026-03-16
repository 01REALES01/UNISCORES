-- Migración: Sincronización de Carreras Académicas Oficiales
-- Fecha: 2026-03-17

-- 1. Limpiar la tabla de carreras para evitar duplicados y datos "sucios"
-- Usamos TRUNCATE si no tiene muchas Fks, o un DELETE limpio.
-- Nota: Si hay perfiles ya vinculados, el DELETE fallará. Usaremos una estrategia de "Upsert".

-- Asegurar que la tabla tiene una restricción de unicidad en el nombre
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carreras_nombre_unique') THEN
        ALTER TABLE public.carreras ADD CONSTRAINT carreras_nombre_unique UNIQUE (nombre);
    END IF;
END $$;

-- 2. Insertar las carreras oficiales de CARRERAS_UNINORTE
INSERT INTO public.carreras (nombre) VALUES
('Administración de Empresas'),
('Arquitectura'),
('Ciencia de Datos'),
('Ciencia Política y Gobierno'),
('Comunicación Social y Periodismo'),
('Contaduría Pública'),
('Derecho'),
('Diseño Gráfico'),
('Diseño Industrial'),
('Economía'),
('Geología'),
('Ingeniería Civil'),
('Ingeniería de Sistemas'),
('Ingeniería Eléctrica'),
('Ingeniería Industrial'),
('Ingeniería Mecánica'),
('Lenguas Modernas y Cultura'),
('Medicina'),
('Música'),
('Negocios Internacionales'),
('Odontología'),
('Psicología'),
('Relaciones Internacionales'),
('Funcionarios'),
('Egresados')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Opcional: Eliminar carreras que NO estén en la lista oficial y NO tengan vinculaciones
-- (Si quieres ser estricto, pero es peligroso si ya hay datos reales).
-- DELETE FROM public.carreras 
-- WHERE nombre NOT IN (...) 
-- AND id NOT IN (SELECT unnest(carreras_ids) FROM profiles WHERE carreras_ids IS NOT NULL);

-- 4. Notificar recarga de esquema (por si acaso se añadieron FKs o cambios)
NOTIFY pgrst, 'reload schema';
