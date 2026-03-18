"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { computeCareerStats, CareerStats } from "@/lib/sport-helpers";

// ─── Column Selections ──────────────────────────────────────────────────────

const MATCH_COLUMNS = `
  id, equipo_a, equipo_b, fecha, estado, lugar, genero, marcador_detalle,
  fase, grupo, bracket_order, delegacion_a, delegacion_b,
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

export type CarreraProfile = {
    carrera: { id: number; nombre: string; escudo_url?: string | null } | null;
    matches: any[];
    news: any[];
    athletes: any[];
    stats: CareerStats;
    loading: boolean;
    error: any;
    mutate: () => void;
};

// ─── Fetcher ────────────────────────────────────────────────────────────────

async function fetchCarreraProfile(carreraId: number) {
    // 1. Fetch the career itself
    const { data: carrera, error: carreraErr } = await supabase
        .from('carreras')
        .select('id, nombre, escudo_url')
        .eq('id', carreraId)
        .single();

    if (carreraErr || !carrera) {
        throw new Error('Carrera not found');
    }

    // 2. Fetch all matches where this carrera participates (either side)
    const [matchesA, matchesB] = await Promise.all([
        supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .eq('carrera_a_id', carreraId)
            .order('fecha', { ascending: false }),
        supabase
            .from('partidos')
            .select(MATCH_COLUMNS)
            .eq('carrera_b_id', carreraId)
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
        .order('created_at', { ascending: false });

    // 4. Fetch athletes that belong to this carrera
    const { data: athletesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, roles, athlete_disciplina_id, points, disciplina:disciplinas(name)')
        .contains('carreras_ids', [carreraId]);

    // 5. Compute stats
    const stats = computeCareerStats(matches, carrera.nombre);

    return {
        carrera,
        matches,
        news: newsData || [],
        athletes: (athletesData || []).filter((a: any) => a.roles?.includes('deportista')),
        stats,
    };
}

// ─── Realtime subscription (singleton per carrera) ──────────────────────────

const subscribedCarreras = new Set<number>();

function subscribeCarrera(carreraId: number, mutate: () => void) {
    if (typeof window === 'undefined') return;
    if (subscribedCarreras.has(carreraId)) return;
    subscribedCarreras.add(carreraId);

    let debounce: ReturnType<typeof setTimeout> | null = null;

    supabase
        .channel(`carrera-profile:${carreraId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(() => mutate(), 1000);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, () => {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(() => mutate(), 1000);
        })
        .subscribe();
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCarreraProfile(carreraId: number | null): CarreraProfile {
    const { data, error, isLoading, mutate } = useSWR(
        carreraId ? `carrera-profile:${carreraId}` : null,
        () => fetchCarreraProfile(carreraId!),
        {
            revalidateOnFocus: false,
            dedupingInterval: 15000,
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        if (carreraId) {
            subscribeCarrera(carreraId, () => mutate());
        }
    }, [carreraId, mutate]);

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
        loading: isLoading,
        error,
        mutate,
    };
}
