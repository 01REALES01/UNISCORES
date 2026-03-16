-- Migración: Limpieza de Carreras Académicas Ficticias
-- Fecha: 2026-03-16
-- Descripción: Elimina "carreras" que no pertenecen al catálogo oficial de Uninorte.

-- 1. Definir la lista oficial
CREATE TEMP TABLE official_carreras (nombre text);
INSERT INTO official_carreras (nombre) VALUES
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
('Egresados');

-- 2. Limpiar perfiles de referencias a carreras inexistentes (evitar errores de FK si existen)
-- Si careers_ids es una columna bigint[], eliminamos los IDs que van a desaparecer.
DO $$
DECLARE
    bad_id bigint;
BEGIN
    FOR bad_id IN (SELECT id FROM public.carreras WHERE nombre NOT IN (SELECT nombre FROM official_carreras)) LOOP
        -- Quitar el ID de los arrays de perfiles
        UPDATE public.profiles 
        SET carreras_ids = array_remove(carreras_ids, bad_id)
        WHERE bad_id = ANY(carreras_ids);

        -- Poner a NULL la columna carrera_id (si existe en esta versión del esquema)
        UPDATE public.profiles SET carrera_id = NULL WHERE carrera_id = bad_id;
        
        -- Poner a NULL en partidos
        UPDATE public.partidos SET carrera_a_id = NULL WHERE carrera_a_id = bad_id;
        UPDATE public.partidos SET carrera_b_id = NULL WHERE carrera_b_id = bad_id;

        -- ELIMINAR del medallero datos de carreras falsas
        DELETE FROM public.medallero WHERE carrera_id = bad_id;
    END LOOP;
END $$;

-- 3. Eliminar las carreras "sucias"
DELETE FROM public.carreras 
WHERE nombre NOT IN (SELECT nombre FROM official_carreras);

-- 4. Asegurar que las oficiales EXISTAN (por si faltaba alguna)
INSERT INTO public.carreras (nombre)
SELECT nombre FROM official_carreras
ON CONFLICT (nombre) DO NOTHING;

DROP TABLE official_carreras;
