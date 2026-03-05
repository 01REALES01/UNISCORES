-- Migración: Añadir soporte para Brackets y Fase de Grupos
-- Fecha: 2026-03-05

-- 1. Columna de fase del torneo
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS fase TEXT DEFAULT NULL;
-- Valores: 'grupos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'

-- 2. Columna de grupo (solo aplica cuando fase = 'grupos')
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS grupo TEXT DEFAULT NULL;
-- Valores: 'A', 'B', 'C', 'D'

-- 3. Orden dentro de la fase (para posicionar en el bracket visual)
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS bracket_order INT DEFAULT NULL;

-- 4. Comentario descriptivo
COMMENT ON COLUMN partidos.fase IS 'Etapa del torneo: grupos, cuartos, semifinal, tercer_puesto, final';
COMMENT ON COLUMN partidos.grupo IS 'Grupo asignado (A, B, C, D). Solo aplica cuando fase = grupos';
COMMENT ON COLUMN partidos.bracket_order IS 'Posición ordinal del partido dentro de su fase para el árbol visual';
