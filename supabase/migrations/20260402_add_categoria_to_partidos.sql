-- ─────────────────────────────────────────────────────────────────────────────
-- 20260402_add_categoria_to_partidos.sql
-- Agrega columna `categoria` a la tabla partidos para diferenciar
-- niveles en Tenis, Tenis de Mesa y Natación
-- Valores: 'principiante' | 'intermedio' | 'avanzado' | NULL
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.partidos
    ADD COLUMN IF NOT EXISTS categoria TEXT
        CHECK (categoria IN ('principiante', 'intermedio', 'avanzado'));

COMMENT ON COLUMN public.partidos.categoria IS
    'Nivel del partido. Aplica a Tenis, Tenis de Mesa y Natación. NULL para otros deportes.';

-- Índice para filtrar por deporte+categoría eficientemente
CREATE INDEX IF NOT EXISTS idx_partidos_disciplina_categoria
    ON public.partidos (disciplina_id, categoria)
    WHERE categoria IS NOT NULL;
