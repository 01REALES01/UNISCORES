-- ─────────────────────────────────────────────────────────────────────────────
-- 20260402_add_disciplina_genero_to_jugadores.sql
-- Agrega disciplina_id, genero y sexo a la tabla jugadores
-- para vincular automáticamente atletas a su deporte desde el Excel
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jugadores
    ADD COLUMN IF NOT EXISTS disciplina_id BIGINT REFERENCES public.disciplinas(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS genero        TEXT CHECK (genero IN ('masculino', 'femenino', 'mixto')),
    ADD COLUMN IF NOT EXISTS sexo          TEXT CHECK (sexo IN ('M', 'F'));

COMMENT ON COLUMN public.jugadores.disciplina_id IS 'Deporte al que pertenece el atleta (del Excel de inscripciones)';
COMMENT ON COLUMN public.jugadores.genero        IS 'Rama del evento: masculino/femenino/mixto';
COMMENT ON COLUMN public.jugadores.sexo          IS 'Sexo del atleta: M/F';

-- Índice para filtrar jugadores por deporte+rama rápidamente (útil en AdminPlayerRoster)
CREATE INDEX IF NOT EXISTS idx_jugadores_disciplina_genero
    ON public.jugadores (disciplina_id, genero)
    WHERE disciplina_id IS NOT NULL;
