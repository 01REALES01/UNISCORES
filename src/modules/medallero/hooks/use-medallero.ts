"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useEffect, useRef } from "react";
import { mutate as globalMutate } from "swr";
import type { MedalEntry } from "@/modules/medallero/types";

const SAMPLE_DATA: MedalEntry[] = [
    { id: 1, equipo_nombre: "Ingeniería Civil",        oro: 8, plata: 4, bronce: 2, puntos: 54 },
    { id: 2, equipo_nombre: "Medicina",                oro: 6, plata: 7, bronce: 3, puntos: 54 },
    { id: 3, equipo_nombre: "Ingeniería Mecánica",     oro: 5, plata: 5, bronce: 1, puntos: 41 },
    { id: 4, equipo_nombre: "Derecho",                 oro: 4, plata: 2, bronce: 5, puntos: 31 },
    { id: 5, equipo_nombre: "Arquitectura",            oro: 2, plata: 5, bronce: 6, puntos: 31 },
    { id: 6, equipo_nombre: "Ingeniería de Sistemas",  oro: 1, plata: 3, bronce: 4, puntos: 18 },
    { id: 7, equipo_nombre: "Psicología",              oro: 0, plata: 4, bronce: 2, puntos: 14 },
    { id: 8, equipo_nombre: "Comunicación Social",     oro: 0, plata: 1, bronce: 5, puntos:  8 },
].sort((a, b) => b.puntos - a.puntos);

// ─── Business logic (pure) ─────────────────────────────────────────────────────

type CarreraLookup = { id: number; nombre: string; escudo_url?: string | null };

function computeMedallero(
    rawMatches: unknown[],
    carreras: CarreraLookup[],
    activeSport: string,
    activeGender: string,
): MedalEntry[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches = (rawMatches as any[])
        .map(m => ({
            ...m,
            disciplinas: Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas,
            estado_norm: (m.estado || '').toLowerCase().trim(),
        }))
        .filter(m => m.estado_norm === 'finalizado');

    // Key careerStats by numeric ID — works for solo careers and fusions
    const careerStats: Record<number, MedalEntry> = {};
    carreras.forEach((c, idx) => {
        careerStats[c.id] = {
            id: idx,
            equipo_nombre: c.nombre,
            oro: 0, plata: 0, bronce: 0, puntos: 0,
            won: 0, draw: 0, lost: 0, played: 0,
        };
    });

    const filtered = matches.filter(m => {
        if (activeSport !== 'todos' && m.disciplinas?.name !== activeSport) return false;
        if (activeGender !== 'todos' && (m.genero || 'masculino') !== activeGender) return false;
        return true;
    });

    // Helper: apply a result to every career in an ID array
    const credit = (ids: number[], fn: (entry: MedalEntry) => void) => {
        (ids || []).forEach(id => {
            if (careerStats[id]) fn(careerStats[id]);
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered.forEach((m: any) => {
        const det = m.marcador_detalle || {};
        const faseNorm = (m.fase || '').toLowerCase().trim();
        const isFinal = faseNorm.includes('final');
        const isTercero = faseNorm.includes('tercer') || faseNorm.includes('3er') || faseNorm.includes('3º');

        const idsA: number[] = m.carrera_a_ids ?? [];
        const idsB: number[] = m.carrera_b_ids ?? [];

        // Race-type matches: medals from participantes array, no score-based logic
        if (det.tipo === 'carrera') {
            const participantes: any[] = det.participantes ?? det.resultados ?? [];
            participantes.forEach((res: any) => {
                const resIds: number[] = res.carrera_ids ?? (res.carrera_id ? [res.carrera_id] : []);
                credit(resIds, entry => {
                    entry.played!++;
                    if (res.puesto === 1) entry.oro++;
                    else if (res.puesto === 2) entry.plata++;
                    else if (res.puesto === 3) entry.bronce++;
                });
            });
            return;
        }

        // Regular team matches
        if (idsA.length === 0 && idsB.length === 0) return; // unassigned fixture shell

        const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? 0;
        const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? 0;

        credit(idsA, e => e.played!++);
        credit(idsB, e => e.played!++);

        if (scoreA > scoreB) {
            credit(idsA, e => { e.won!++; e.puntos += 3; });
            credit(idsB, e => e.lost!++);
            if (isFinal)    { credit(idsA, e => e.oro++);    credit(idsB, e => e.plata++); }
            else if (isTercero) { credit(idsA, e => e.bronce++); }
        } else if (scoreB > scoreA) {
            credit(idsB, e => { e.won!++; e.puntos += 3; });
            credit(idsA, e => e.lost!++);
            if (isFinal)    { credit(idsB, e => e.oro++);    credit(idsA, e => e.plata++); }
            else if (isTercero) { credit(idsB, e => e.bronce++); }
        } else {
            credit(idsA, e => { e.draw!++; e.puntos += 1; });
            credit(idsB, e => { e.draw!++; e.puntos += 1; });
        }
    });

    return Object.values(careerStats)
        .filter(c => c.played! > 0 || c.oro > 0 || c.plata > 0 || c.bronce > 0)
        .sort((a, b) => {
            if (b.oro !== a.oro) return b.oro - a.oro;
            if (b.plata !== a.plata) return b.plata - a.plata;
            if (b.bronce !== a.bronce) return b.bronce - a.bronce;
            return b.puntos - a.puntos;
        });
}

// ─── Realtime (singleton) ─────────────────────────────────────────────────────
let isMedalleroSubscribed = false;

function subscribeToMedallero(swrKey: string) {
    if (typeof window === 'undefined') return;
    if (isMedalleroSubscribed) return;
    isMedalleroSubscribed = true;

    let debounce: ReturnType<typeof setTimeout> | null = null;

    supabase
        .channel('global:medallero:changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(() => globalMutate(swrKey), 1000);
        })
        .subscribe();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMedallero(activeSport: string = 'todos', activeGender: string = 'todos') {
    const swrKey = `medallero:${activeSport}:${activeGender}`;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data, error, isLoading } = useSWR(
        swrKey,
        async () => {
            const [matchesResult, carrerasResult] = await Promise.all([
                safeQuery(
                    supabase.from('partidos').select(
                        'id, estado, genero, fase, marcador_detalle, carrera_a_ids, carrera_b_ids, disciplinas(name)'
                    ),
                    'medallero-fetch'
                ),
                supabase.from('carreras').select('id, nombre, escudo_url'),
            ]);

            if (matchesResult.error || !matchesResult.data) return SAMPLE_DATA;
            const carreras: CarreraLookup[] = carrerasResult.data ?? [];
            const result = computeMedallero(matchesResult.data, carreras, activeSport, activeGender);
            return result.length > 0 ? result : SAMPLE_DATA;
        },
        { dedupingInterval: 15000, keepPreviousData: true }
    );

    useEffect(() => {
        subscribeToMedallero(swrKey);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    // swrKey changes when filters change — no need to re-subscribe the singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        medallero: data || [],
        loading: isLoading,
        error,
    };
}
