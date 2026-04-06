-- ─────────────────────────────────────────────────────────────────────────────
-- 20260405_backfill_jugador_profiles.sql
-- Vincula retroactivamente todos los jugadores a sus profiles existentes.
-- Corre una sola vez para usuarios que ya se registraron antes de que
-- existiera el auto-link.
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO 1: Vincular jugadores por email (match exacto, case-insensitive)
UPDATE public.jugadores j
SET profile_id = p.id
FROM public.profiles p
WHERE LOWER(j.email) = LOWER(p.email)
  AND j.profile_id IS NULL
  AND j.email IS NOT NULL
  AND j.email <> '';

-- PASO 2: Vincular jugadores por nombre exacto (para los que no tienen email o no matcheó)
UPDATE public.jugadores j
SET profile_id = p.id,
    email = COALESCE(j.email, p.email)
FROM public.profiles p
WHERE UPPER(TRIM(j.nombre)) = UPPER(TRIM(p.full_name))
  AND j.profile_id IS NULL
  AND p.full_name IS NOT NULL
  AND p.full_name <> '';

-- PASO 3: Propagar profile_id a partidos via roster_partido (equipo_a)
UPDATE public.partidos p
SET athlete_a_id = j.profile_id
FROM public.roster_partido rp
JOIN public.jugadores j ON j.id = rp.jugador_id
WHERE rp.equipo_a_or_b = 'equipo_a'
  AND rp.partido_id = p.id
  AND j.profile_id IS NOT NULL
  AND p.athlete_a_id IS NULL;

-- PASO 4: Propagar profile_id a partidos via roster_partido (equipo_b)
UPDATE public.partidos p
SET athlete_b_id = j.profile_id
FROM public.roster_partido rp
JOIN public.jugadores j ON j.id = rp.jugador_id
WHERE rp.equipo_a_or_b = 'equipo_b'
  AND rp.partido_id = p.id
  AND j.profile_id IS NOT NULL
  AND p.athlete_b_id IS NULL;

-- Verificación: cuántos jugadores quedaron vinculados
SELECT
  COUNT(*) FILTER (WHERE profile_id IS NOT NULL) AS vinculados,
  COUNT(*) FILTER (WHERE profile_id IS NULL)     AS sin_vincular,
  COUNT(*)                                        AS total
FROM public.jugadores;
