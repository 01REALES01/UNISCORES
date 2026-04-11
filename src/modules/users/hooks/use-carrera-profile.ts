"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";
import { computeCareerStats, CareerStats } from "@/lib/sport-helpers";
import { EQUIPO_NOMBRE_TO_CARRERAS } from "@/lib/constants";

// ─── Column Selections ──────────────────────────────────────────────────────

const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order, delegacion_a, delegacion_b,
  carrera_a_ids, carrera_b_ids,
  disciplinas(name, icon),
  carrera_a:carreras!carrera_a_id(nombre, escudo_url),
  carrera_b:carreras!carrera_b_id(nombre, escudo_url),
  atleta_a:profiles!athlete_a_id(full_name, avatar_url),
  atleta_b:profiles!athlete_b_id(full_name, avatar_url)
`.replace(/\s+/g, ' ').trim();

const NEWS_COLUMNS = `
  id, titulo, contenido, imagen_url, categoria, created_at, published, autor_nombre, carrera,
  partidos(equipo_a, equipo_b, disciplinas(name),
    carrera_a:carreras!carrera_a_id(nombre, escudo_url),
    carrera_b:carreras!carrera_b_id(nombre, escudo_url))
`.replace(/\s+/g, ' ').trim();

// ─── Types ──────────────────────────────────────────────────────────────────

export type DeporteInscrito = {
    disciplina_id: number;
    delegacion_id: number;
    genero: string;
    equipo_nombre: string;
    disciplina_name: string;
    /** true when 2+ carreras share this delegación (combined team) */
    isCombined: boolean;
};

export type CarreraProfile = {
    carrera: { id: number; nombre: string; escudo_url?: string | null; followers_count?: number } | null;
    matches: any[];
    news: any[];
    athletes: any[];
    stats: CareerStats;
    deportesInscritos: DeporteInscrito[];
    loading: boolean;
    error: any;
    mutate: () => void;
};

// ─── Fetcher (with AbortController timeout) ─────────────────────────────────

async function fetchCarreraProfile(carreraId: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
        // 1. Fetch the career itself
        const { data: carrera, error: carreraErr } = await supabase
            .from('carreras')
            .select('id, nombre, escudo_url, followers_count')
            .eq('id', carreraId)
            .abortSignal(controller.signal)
            .single();

        if (carreraErr || !carrera) {
            throw new Error('Carrera not found');
        }

        // 2. Fetch all matches where this carrera participates (either side).
        // Uses GIN-indexed array containment so fusions are included automatically:
        // a match where the career appears in carrera_a_ids or carrera_b_ids is returned.
        const [matchesA, matchesB] = await Promise.all([
            supabase
                .from('partidos')
                .select(MATCH_COLUMNS)
                .contains('carrera_a_ids', [carreraId])
                .abortSignal(controller.signal)
                .order('fecha', { ascending: false }),
            supabase
                .from('partidos')
                .select(MATCH_COLUMNS)
                .contains('carrera_b_ids', [carreraId])
                .abortSignal(controller.signal)
                .order('fecha', { ascending: false }),
        ]);

        // Merge and deduplicate by id
        const allMatchesRaw = [...((matchesA.data || []) as any[]), ...((matchesB.data || []) as any[])];
        const seen = new Set<number>();
        const matches = allMatchesRaw.filter((m: any) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        }).sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // 3. Fetch news for this carrera
        const { data: newsData } = await supabase
            .from('noticias')
            .select(NEWS_COLUMNS)
            .eq('published', true)
            .eq('carrera', carrera.nombre)
            .abortSignal(controller.signal)
            .order('created_at', { ascending: false });

        // 4. Fetch athletes that belong to this carrera
        const { data: athletesData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, roles, athlete_disciplina_id, points, sexo, genero, disciplina:disciplinas(name)')
            .contains('carreras_ids', [carreraId])
            .abortSignal(controller.signal);

        // 5. Compute stats by ID (handles fusions via carrera_a_ids / carrera_b_ids)
        const stats = computeCareerStats(matches, carreraId);

        // 6. Fetch enrolled sports from delegaciones (carrera appears in carrera_ids[])
        // Strategy: Also search by name for known Escuela de Negocios teams if current career is one of them.
        const businessNames = ['ESCUELA DE NEGOCIOS', 'NEGOCIOS INT. / ADMÓN.'];
        const businessCareerIds = [1, 6, 20];
        const isBusiness = businessCareerIds.includes(carreraId);

        const { data: delegData } = await supabase
            .from('delegaciones')
            .select('id, disciplina_id, genero, nombre, carrera_ids, disciplinas(name)')
            .or(`carrera_ids.cs.{${carreraId}}` + (isBusiness ? `,nombre.in.("${businessNames.join('","')}")` : ''))
            .not('disciplina_id', 'is', null)
            .not('genero', 'is', null)
            .abortSignal(controller.signal);

        // Deduplicate by (disciplina_id, genero) — a carrera can appear in multiple
        // delegaciones for the same sport (e.g. DCPRI and a direct entry); keep the
        // one whose equipo_nombre differs most from the carrera name (i.e. prefer the
        // combined-team name over a solo entry).
        const deduped = new Map<string, DeporteInscrito>();
        for (const d of (delegData || []) as any[]) {
            const dname = Array.isArray(d.disciplinas) ? d.disciplinas[0]?.name : d.disciplinas?.name ?? '';
            const key = `${d.disciplina_id}_${d.genero}`;
            const memberCarreras = EQUIPO_NOMBRE_TO_CARRERAS[d.nombre] || [];
            const isCombinedByConfig = memberCarreras.length > 1;

            const entry: DeporteInscrito = {
                delegacion_id: d.id,
                disciplina_id: d.disciplina_id,
                genero: d.genero,
                equipo_nombre: d.nombre,
                disciplina_name: dname,
                isCombined: (d.carrera_ids?.length ?? 0) > 1 || isCombinedByConfig,
            };
            // Prefer combined-team names (longer / different from the carrera name)
            if (!deduped.has(key) || d.nombre !== carrera.nombre) {
                deduped.set(key, entry);
            }
        }
        const deportesInscritos: DeporteInscrito[] = Array.from(deduped.values());

        const result = {
            carrera,
            matches,
            news: newsData || [],
            athletes: (athletesData || []).filter((a: any) => a.roles?.includes('deportista')),
            stats,
            deportesInscritos,
        };

        // Persist to sessionStorage for instant fallback on return
        try {
            sessionStorage.setItem(`swr-carrera-${carreraId}`, JSON.stringify(result));
        } catch { /* quota exceeded — non-critical */ }

        return result;
    } finally {
        clearTimeout(timeout);
    }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCarreraProfile(carreraId: number | null): CarreraProfile {
    // Attempt to hydrate from sessionStorage so the user sees cached data instantly
    let fallbackData: any = undefined;
    if (carreraId && typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(`swr-carrera-${carreraId}`);
            if (raw) fallbackData = JSON.parse(raw);
        } catch { /* ignore parse errors */ }
    }

    const { data, error, isLoading, mutate } = useSWR(
        carreraId ? `carrera-profile:${carreraId}` : null,
        () => fetchCarreraProfile(carreraId!),
        {
            fallbackData,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 15000,
            keepPreviousData: true,
        }
    );

    // Stable ref for mutate to avoid stale closures in the channel callback
    const mutateRef = useRef(mutate);
    mutateRef.current = mutate;

    // ── Realtime subscription — properly scoped to component lifecycle ────────
    useEffect(() => {
        if (!carreraId || typeof window === 'undefined') return;

        let activeChannel: ReturnType<typeof supabase.channel> | null = null;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const debounced = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => mutateRef.current(), 1000);
        };

        const setup = () => {
            if (activeChannel) {
                supabase.removeChannel(activeChannel);
                activeChannel = null;
            }
            // Unique channel name per mount — prevents collision with stale singletons
            activeChannel = supabase
                .channel(`carrera-profile:${carreraId}:${Date.now()}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, debounced)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, debounced)
                .subscribe();
        };

        setup();

        // Listen for the global app:revalidate event (fired by VisibilityRevalidate
        // when the user returns to the tab). Recreate channel + revalidate SWR.
        const handleRevalidate = () => {
            mutateRef.current();
            // Recreate channel in case Supabase disconnected while tab was hidden
            setup();
        };

        window.addEventListener('app:revalidate', handleRevalidate);

        return () => {
            window.removeEventListener('app:revalidate', handleRevalidate);
            if (debounceTimer) clearTimeout(debounceTimer);
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, [carreraId]);

    return {
        carrera: data?.carrera || null,
        matches: data?.matches || [],
        news: data?.news || [],
        athletes: data?.athletes || [],
        stats: data?.stats || {
            oro: 0, plata: 0, bronce: 0, puntos: 0,
            won: 0, lost: 0, draw: 0, played: 0,
            byDiscipline: {},
        },
        deportesInscritos: data?.deportesInscritos || [],
        loading: isLoading,
        error,
        mutate,
    };
}
