-- Catálogo académico: Enfermería (deportistas que compiten pero su programa no estaba en la sync olímpica).
INSERT INTO public.carreras (nombre)
VALUES ('Enfermería')
ON CONFLICT (nombre) DO NOTHING;
