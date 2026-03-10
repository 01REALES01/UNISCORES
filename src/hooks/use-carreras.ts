"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { CARRERAS_UNINORTE } from "@/lib/constants";

export type Carrera = {
    id: number;
    nombre: string;
};

/**
 * Hook para obtener la lista de carreras VÁLIDAS.
 * Filtra contra CARRERAS_UNINORTE para evitar que nombres de deportistas
 * que fueron insertados por error en la tabla aparezcan como opciones.
 */
export function useCarreras() {
    const fetcher = async () => {
        const { data, error } = await supabase
            .from('carreras')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error fetching carreras:', error);
            throw error;
        }

        // Filtrar: solo devolver carreras que estén en la lista oficial
        const validCarreras = (data || []).filter(c =>
            CARRERAS_UNINORTE.includes(c.nombre)
        );

        return validCarreras as Carrera[];
    };

    const { data, error, isLoading } = useSWR(
        'carreras-list',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        carreras: data || [],
        loading: isLoading,
        error
    };
}
