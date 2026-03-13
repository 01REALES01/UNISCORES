-- Migración para Auditoría y Concurrencia
-- Fecha: 2026-03-12

-- 1. Añadir columnas a partidos
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id);
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at ON partidos;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON partidos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 3. Habilitar RLS para que se puedan ver las actualizaciones
-- (Ya habilitado, pero aseguramos)
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN partidos.last_edited_by IS 'UUID del último usuario admin/data_entry que modificó el partido';
COMMENT ON COLUMN partidos.updated_at IS 'Fecha y hora de la última modificación';
