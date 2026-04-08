-- ============================================================
-- fix_followers_count.sql
-- Recalcula los followers_count reales en `profiles` y `carreras`
-- basándose en las filas reales de user_followers y career_followers.
-- Ejecutar en el Editor SQL de Supabase Dashboard.
-- ============================================================

-- ── PASO 1: DIAGNÓSTICO ──────────────────────────────────────
-- Ver cuántos perfiles tienen followers_count desincronizado
SELECT
    p.id,
    p.full_name,
    p.email,
    p.followers_count AS count_actual,
    COUNT(uf.follower_id) AS count_real,
    (p.followers_count - COUNT(uf.follower_id)) AS diferencia
FROM public.profiles p
LEFT JOIN public.user_followers uf ON uf.following_profile_id = p.id
GROUP BY p.id, p.full_name, p.email, p.followers_count
HAVING p.followers_count <> COUNT(uf.follower_id)
ORDER BY diferencia DESC;

-- ── PASO 2: DIAGNÓSTICO CARRERAS ────────────────────────────
-- Ver cuántas carreras tienen followers_count desincronizado
SELECT
    c.id,
    c.nombre,
    c.followers_count AS count_actual,
    COUNT(cf.follower_id) AS count_real,
    (c.followers_count - COUNT(cf.follower_id)) AS diferencia
FROM public.carreras c
LEFT JOIN public.career_followers cf ON cf.career_id = c.id
GROUP BY c.id, c.nombre, c.followers_count
HAVING c.followers_count <> COUNT(cf.follower_id)
ORDER BY diferencia DESC;

-- ── PASO 3: CORRECCIÓN DE PROFILES ──────────────────────────
-- Sobrescribe followers_count con el conteo real de user_followers
UPDATE public.profiles p
SET followers_count = (
    SELECT COUNT(*)
    FROM public.user_followers uf
    WHERE uf.following_profile_id = p.id
);

-- ── PASO 4: CORRECCIÓN DE CARRERAS ──────────────────────────
-- Sobrescribe followers_count con el conteo real de career_followers
UPDATE public.carreras c
SET followers_count = (
    SELECT COUNT(*)
    FROM public.career_followers cf
    WHERE cf.career_id = c.id
);

-- ── PASO 5: VERIFICACIÓN FINAL ──────────────────────────────
-- Confirmar que ya no hay desincronizaciones en profiles
SELECT
    'profiles' AS tabla,
    COUNT(*) AS desincronizados
FROM public.profiles p
LEFT JOIN public.user_followers uf ON uf.following_profile_id = p.id
GROUP BY p.id, p.followers_count
HAVING p.followers_count <> COUNT(uf.follower_id)

UNION ALL

-- Confirmar que ya no hay desincronizaciones en carreras
SELECT
    'carreras' AS tabla,
    COUNT(*) AS desincronizados
FROM public.carreras c
LEFT JOIN public.career_followers cf ON cf.career_id = c.id
GROUP BY c.id, c.followers_count
HAVING c.followers_count <> COUNT(cf.follower_id);
