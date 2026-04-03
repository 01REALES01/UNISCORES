-- ─────────────────────────────────────────────────────────────────────────────
-- 20260402_add_biomed_carrera.sql
-- Agrega Ingeniería Biomédica al catálogo de carreras
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.carreras (nombre)
VALUES ('Ingeniería Biomédica')
ON CONFLICT (nombre) DO NOTHING;
