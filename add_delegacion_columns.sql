-- Agregamos las columnas para poder calcular los puntos por carrera, 
-- incluso si es deporte individual (donde equipo_a guarda el nombre del atleta).

alter table public.partidos 
add column if not exists delegacion_a text,
add column if not exists delegacion_b text;

-- Opcional: poner un default igual al equipo si es nulo
update public.partidos set delegacion_a = equipo_a where delegacion_a is null;
update public.partidos set delegacion_b = equipo_b where delegacion_b is null;
