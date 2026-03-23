"use client";

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { useEffect, useRef } from "react";
import { mutate as globalMutate } from "swr";
import { CARRERAS_UNINORTE } from "@/lib/constants";
import { getCarreraName } from "@/lib/sport-helpers";
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

function normalize(str: string) {
    return str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function computeMedallero(
    rawMatches: unknown[],
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

    const careerStats: Record<string, MedalEntry> = {};
    CARRERAS_UNINORTE.forEach((name, idx) => {
        careerStats[name] = { id: idx, equipo_nombre: name, oro: 0, plata: 0, bronce: 0, puntos: 0, won: 0, draw: 0, lost: 0, played: 0 };
    });

    const getMatchedCareer = (name: string): string => {
        const normName = normalize(name);
        if (careerStats[name]) return name;
        return (
            Object.keys(careerStats).find(k => normalize(k) === normName) ||
            Object.keys(careerStats).find(k => normalize(k).includes(normName) || normName.includes(normalize(k))) ||
            name
        );
    };

    const filtered = matches.filter(m => {
        if (activeSport !== 'todos' && m.disciplinas?.name !== activeSport) return false;
        if (activeGender !== 'todos' && (m.genero || 'masculino') !== activeGender) return false;
        return true;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered.forEach((m: any) => {
        const det = m.marcador_detalle || {};
        const faseNorm = (m.fase || '').toLowerCase().trim();
        const isFinal = faseNorm.includes('final');
        const isTercero = faseNorm.includes('tercer') || faseNorm.includes('3er') || faseNorm.includes('3º');

        const carreraA = getMatchedCareer(getCarreraName(m, 'a'));
        const carreraB = getMatchedCareer(getCarreraName(m, 'b'));

        const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? 0;
        const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? 0;

        if (careerStats[carreraA]) careerStats[carreraA].played!++;
        if (careerStats[carreraB]) careerStats[carreraB].played!++;

        if (scoreA > scoreB) {
            if (careerStats[carreraA]) { careerStats[carreraA].won!++; careerStats[carreraA].puntos += 3; }
            if (careerStats[carreraB]) careerStats[carreraB].lost!++;
            if (det.tipo !== 'carrera') {
                if (isFinal) { if (careerStats[carreraA]) careerStats[carreraA].oro++; if (careerStats[carreraB]) careerStats[carreraB].plata++; }
                else if (isTercero) { if (careerStats[carreraA]) careerStats[carreraA].bronce++; }
            }
        } else if (scoreB > scoreA) {
            if (careerStats[carreraB]) { careerStats[carreraB].won!++; careerStats[carreraB].puntos += 3; }
            if (careerStats[carreraA]) careerStats[carreraA].lost!++;
            if (det.tipo !== 'carrera') {
                if (isFinal) { if (careerStats[carreraB]) careerStats[carreraB].oro++; if (careerStats[carreraA]) careerStats[carreraA].plata++; }
                else if (isTercero) { if (careerStats[carreraB]) careerStats[carreraB].bronce++; }
            }
        } else {
            if (careerStats[carreraA]) { careerStats[carreraA].draw!++; careerStats[carreraA].puntos += 1; }
            if (careerStats[carreraB]) { careerStats[carreraB].draw!++; careerStats[carreraB].puntos += 1; }
        }

        // Race-specific medals
        if (det.tipo === 'carrera' && det.resultados) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (det.resultados as any[]).forEach(res => {
                const name = res.equipo_nombre || res.equipo || res.delegacion;
                if (!name) return;
                const c = getMatchedCareer(name);
                if (!careerStats[c]) return;
                if (res.puesto === 1) careerStats[c].oro++;
                else if (res.puesto === 2) careerStats[c].plata++;
                else if (res.puesto === 3) careerStats[c].bronce++;
                careerStats[c].played!++;
            });
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
            const { data: rawMatches, error } = await safeQuery(
                supabase.from('partidos').select(
                    '*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url)'
                ),
                'medallero-fetch'
            );

            if (error || !rawMatches) return SAMPLE_DATA;
            const result = computeMedallero(rawMatches, activeSport, activeGender);
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
