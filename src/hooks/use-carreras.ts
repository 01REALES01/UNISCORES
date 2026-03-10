"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";

export type Carrera = {
    id: number;
    nombre: string;
};

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

        return (data || []) as Carrera[];
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
