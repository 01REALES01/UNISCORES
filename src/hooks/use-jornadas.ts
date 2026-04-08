import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface JornadaResultado {
    jugador_id: number | null;
    carrera_id: number;
    posicion: number;
    puntos_olimpicos: number | null;
    jugadores: { nombre: string } | null;
    carreras: { nombre: string; escudo_url: string | null } | null;
}

export interface JornadaWithResults {
    id: number;
    disciplina_id: number;
    genero: string;
    numero: number;
    nombre: string | null;
    scheduled_at: string;
    lugar: string | null;
    estado: 'programado' | 'en_curso' | 'finalizado';
    disciplinas: { name: string } | null;
    jornada_resultados: JornadaResultado[];
}

export function useJornadas() {
    const [jornadas, setJornadas] = useState<JornadaWithResults[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function fetch() {
            const { data } = await supabase
                .from('jornadas')
                .select(`
                    id, disciplina_id, genero, numero, nombre,
                    scheduled_at, lugar, estado,
                    disciplinas(name),
                    jornada_resultados(
                        jugador_id, carrera_id, posicion, puntos_olimpicos,
                        jugadores(nombre),
                        carreras(nombre, escudo_url)
                    )
                `)
                .order('scheduled_at', { ascending: true });

            if (mounted) {
                setJornadas((data as any) ?? []);
                setLoading(false);
            }
        }

        fetch();

        // Realtime subscription
        const channel = supabase
            .channel('jornadas-public')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jornadas' }, fetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jornada_resultados' }, fetch)
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    return { jornadas, loading };
}
