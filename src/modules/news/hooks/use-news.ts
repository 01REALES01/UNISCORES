"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import type { Noticia } from "@/modules/news/types";

const NEWS_COLUMNS = `
  id, titulo, contenido, imagen_url, categoria, created_at, published, autor_nombre, carrera,
  partidos(equipo_a, equipo_b, marcador_detalle, disciplinas(name),
    carrera_a:carreras!carrera_a_id(nombre, escudo_url),
    carrera_b:carreras!carrera_b_id(nombre, escudo_url))
`.replace(/\s+/g, ' ').trim();

const fetchNews = async (): Promise<Noticia[]> => {
    const { data, error } = await supabase
        .from('noticias')
        .select(NEWS_COLUMNS)
        .eq('published', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Noticia[];
};

let isNewsSubscribed = false;

function subscribeToNews() {
    if (typeof window === 'undefined') return;
    if (isNewsSubscribed) return;
    isNewsSubscribed = true;

    supabase
        .channel('global:noticias:changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'noticias' }, () => {
            globalMutate('global:noticias');
        })
        .subscribe();
}

export function useNews(limit?: number) {
    const { data, error, isLoading, mutate } = useSWR(
        'global:noticias',
        fetchNews,
        {
            dedupingInterval: 60000,
            keepPreviousData: true,
        }
    );

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
