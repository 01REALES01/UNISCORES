import { createServerSupabase } from "@/lib/supabase-server";
import { NoticiasShell } from "./noticias-shell";
import { NewsFilters } from "./news-filters";
import type { Noticia } from "@/modules/news/types";

// ISR: Vercel regenera esta página cada 60 segundos
// Usuarios concurrentes reciben la versión cacheada del edge
export const revalidate = 60;

const NEWS_COLUMNS = `
  id, titulo, contenido, imagen_url, categoria, created_at, published, autor_nombre, carrera,
  partidos(equipo_a, equipo_b, marcador_detalle, disciplinas(name),
    carrera_a:carreras!carrera_a_id(nombre),
    carrera_b:carreras!carrera_b_id(nombre)),
  news_reactions(emoji)
`;

async function fetchNoticias(): Promise<Noticia[]> {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
        .from("noticias")
        .select(NEWS_COLUMNS)
        .eq("published", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching noticias:", error);
        return [];
    }
    return (data || []) as unknown as Noticia[];
}

export default async function NoticiasPage() {
    const noticias = await fetchNoticias();

    return (
        <NoticiasShell>
            <NewsFilters noticias={noticias} />
        </NoticiasShell>
    );
}
