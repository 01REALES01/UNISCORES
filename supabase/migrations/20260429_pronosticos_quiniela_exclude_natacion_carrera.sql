-- Quiniela (pronosticos): no insert/update on Natación or marcador model "carrera"
-- (aligns RLS with product: A/B winner only).

CREATE OR REPLACE FUNCTION public.partido_participa_quiniela(p_partido_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT
        NOT (
          COALESCE(p.marcador_detalle->>'tipo', '') = 'carrera'
          OR lower(COALESCE(d.name, '')) LIKE '%natación%'
          OR lower(COALESCE(d.name, '')) LIKE '%natacion%'
        )
      FROM public.partidos p
      LEFT JOIN public.disciplinas d ON d.id = p.disciplina_id
      WHERE p.id = p_partido_id
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.partido_participa_quiniela(bigint) IS
  'True if the match accepts A/B quiniela predictions (excludes Natación and marcador_detalle.tipo = carrera).';

DROP POLICY IF EXISTS "Users can insert own predictions before match starts" ON public.pronosticos;
CREATE POLICY "Users can insert own predictions before match starts"
    ON public.pronosticos FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND public.partido_participa_quiniela(match_id)
        AND (
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'data_entry')
            OR EXISTS (
                SELECT 1 FROM public.partidos p
                WHERE p.id = match_id
                AND p.fecha > now()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update own predictions before match starts" ON public.pronosticos;
CREATE POLICY "Users can update own predictions before match starts"
    ON public.pronosticos FOR UPDATE
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id
        AND public.partido_participa_quiniela(match_id)
        AND (
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'data_entry')
            OR EXISTS (
                SELECT 1 FROM public.partidos p
                WHERE p.id = match_id
                AND p.fecha > now()
            )
        )
    );
