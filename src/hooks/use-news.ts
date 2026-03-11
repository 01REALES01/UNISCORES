"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { Noticia } from "@/components/news-card";

// ─── Column Selection ────────────────────────────────────────────────────────
const NEWS_COLUMNS = `
  id, titulo, contenido, imagen_url, categoria, created_at, published, autor_nombre, carrera,
  partidos(equipo_a, equipo_b, disciplinas(name),
    carrera_a:carreras!carrera_a_id(nombre),
    carrera_b:carreras!carrera_b_id(nombre))
`.replace(/\s+/g, ' ').trim();

// ─── SWR Fetcher ─────────────────────────────────────────────────────────────
const fetchNews = async (): Promise<Noticia[]> => {
    const { data, error } = await supabase
        .from('noticias')
        .select(NEWS_COLUMNS)
        .eq('published', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Noticia[];
};

// ─── Global Realtime Subscription ────────────────────────────────────────────
let isNewsSubscribed = false;

function subscribeToNews() {
    if (typeof window === 'undefined') return;
    if (isNewsSubscribed) return;
    isNewsSubscribed = true;

    console.log('[DEBUG] 🔵 global: Iniciando suscripción Realtime SINGLETON para noticias');

    supabase
        .channel('global:noticias:changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, () => {
            console.log('[DEBUG] 🟢 global: Cambio en noticias detectado (Realtime), invalidando caché...');
            globalMutate('global:noticias');
        })
        .subscribe();
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useNews(limit?: number) {
    const { data, error, isLoading, mutate } = useSWR(
        'global:noticias',
        fetchNews,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,    // News changes less frequently (60s deduplication)
            keepPreviousData: true,
        }
    );

    // ─── Realtime subscription ───────────────────────────────────────────────
    useEffect(() => {
        subscribeToNews();
    }, []);

    const news = limit ? (data || []).slice(0, limit) : (data || []);

    return {
        news,
        allNews: data || [],
        loading: isLoading,
        error,
        mutate,
    };
}
