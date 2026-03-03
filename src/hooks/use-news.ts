"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";
import { Noticia } from "@/components/news-card";

// ─── Column Selection ────────────────────────────────────────────────────────
const NEWS_COLUMNS = `
  id, titulo, contenido, imagen_url, categoria, created_at, published,
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

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useNews(limit?: number) {
    const { data, error, isLoading, mutate } = useSWR(
        'global:noticias',
        fetchNews,
        {
            revalidateOnFocus: false,
            dedupingInterval: 10000,    // News changes less frequently
            keepPreviousData: true,
        }
    );

    // ─── Realtime subscription ───────────────────────────────────────────────
    const mutateRef = useRef(mutate);
    mutateRef.current = mutate;

    useEffect(() => {
        const channel = supabase
            .channel('swr:noticias')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, () => {
                mutateRef.current();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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
