-- Activa las actualizaciones en tiempo real (Realtime) para la tabla olympics_eventos
-- Esto es necesario para que el "Minuto a Minuto" se actualice automáticamente sin refrescar la página.

BEGIN;

-- Insertar la tabla en la publicación de supabase_realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'olympics_eventos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.olympics_eventos;
    END IF;
END
$$;

COMMIT;
