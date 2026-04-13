import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getMatchResult } from "@/modules/quiniela/helpers";
import { enrichPartidosCarreraShieldsFromDb } from "@/lib/match-carrera-shields";
import type { PartidoWithRelations } from "@/modules/matches/types";

export function useQuiniela() {
    const { user, profile } = useAuth();
    const [matches, setMatches] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [allPredictions, setAllPredictions] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userPublicProfile, setUserPublicProfile] = useState<any>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const [matchesRes, predsRes, allPredsRes, rankingRes, userPubRes] = await Promise.all([
            safeQuery(supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url), delegacion_a_info:delegaciones!delegacion_a_id(escudo_url), delegacion_b_info:delegaciones!delegacion_b_id(escudo_url), atleta_a:profiles!athlete_a_id(full_name, avatar_url), atleta_b:profiles!athlete_b_id(full_name, avatar_url), roster_partido(equipo_a_or_b, jugador:jugadores(nombre))').order('fecha', { ascending: true }), 'quiniela-matches'),
            safeQuery(supabase.from('pronosticos').select('*').eq('user_id', user.id), 'quiniela-preds'),
            safeQuery(supabase.from('pronosticos').select('match_id, winner_pick, prediction_type'), 'quiniela-allPreds'),
            safeQuery(supabase.from('public_profiles').select('*, display_name, avatar_url, points, current_streak, max_streak, total_predictions, correct_predictions').order('points', { ascending: false }).limit(50), 'quiniela-ranking'),
            safeQuery(supabase.from('public_profiles').select('*').eq('id', user.id).single(), 'user-public-profile'),
        ]);

        if (matchesRes.data) {
            const enriched = await enrichPartidosCarreraShieldsFromDb(
                supabase,
                matchesRes.data as PartidoWithRelations[]
            );
            setMatches(enriched.filter((m) => m.disciplinas?.name !== 'Natación'));
        }
        if (predsRes.data) setPredictions(predsRes.data);
        if (allPredsRes.data) setAllPredictions(allPredsRes.data);
        if (rankingRes.data) setRanking(rankingRes.data);
        if (userPubRes.data) setUserPublicProfile(userPubRes.data);

        setLoading(false);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchData();

        const channel = supabase
            .channel('quiniela-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pronosticos' }, async () => {
                const { data } = await safeQuery(supabase.from('pronosticos').select('match_id, winner_pick, prediction_type'), 'rt-allPreds');
                if (data) setAllPredictions(data);
                // Also refresh user predictions if needed
                const { data: userPreds } = await supabase.from('pronosticos').select('*').eq('user_id', user.id);
                if (userPreds) setPredictions(userPreds);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, async () => {
                const { data } = await safeQuery(supabase.from('partidos').select('*, disciplinas(name), carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url), delegacion_a_info:delegaciones!delegacion_a_id(escudo_url), delegacion_b_info:delegaciones!delegacion_b_id(escudo_url), atleta_a:profiles!athlete_a_id(full_name, avatar_url), atleta_b:profiles!athlete_b_id(full_name, avatar_url), roster_partido(equipo_a_or_b, jugador:jugadores(nombre))').order('fecha', { ascending: true }), 'rt-matches');
                if (data) {
                    const enriched = await enrichPartidosCarreraShieldsFromDb(
                        supabase,
                        data as PartidoWithRelations[]
                    );
                    setMatches(enriched.filter((m) => m.disciplinas?.name !== 'Natación'));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, fetchData]);

    const handlePredict = async (matchId: any, data: any) => {
        if (!user) return;

        const targetMatch = matches.find(m => m.id === matchId);
        if (targetMatch) {
            const isPast = new Date(targetMatch.fecha) < new Date();
            if (targetMatch.estado !== 'programado' || isPast) {
                toast.error("Este partido ya no acepta predicciones");
                return;
            }
        }

        return toast.promise(
            async () => {
                // Ensure public profile exists
                const { error: profileError } = await supabase.from('public_profiles').upsert(
                    { id: user.id, email: user.email },
                    { onConflict: 'id' }
                );

                if (profileError) console.error("Profile auto-creation failed:", profileError);

                const existing = predictions.find(p => p.match_id === matchId);
                const payload = { user_id: user.id, match_id: matchId, ...data };

                let error;
                if (existing) {
                    const { error: e } = await supabase.from('pronosticos').update(payload).eq('id', existing.id);
                    error = e;
                } else {
                    const { error: e } = await supabase.from('pronosticos').insert(payload);
                    error = e;
                }

                if (error) throw error;

                // Refresh state
                const [userPreds, allPreds] = await Promise.all([
                    supabase.from('pronosticos').select('*').eq('user_id', user.id),
                    supabase.from('pronosticos').select('match_id, winner_pick, prediction_type'),
                ]);
                if (userPreds.data) setPredictions(userPreds.data);
                if (allPreds.data) setAllPredictions(allPreds.data);
            },
            {
                loading: 'Guardando acierto...',
                success: '¡Acierto guardado! 🔥',
                error: (e) => `Error: ${e.message}`
            }
        );
    };

    const stats = useMemo(() => {
        const totalPredictions = predictions.length;
        const correctPredictions = predictions.filter(p => {
            const m = matches.find(match => match.id === p.match_id);
            if (!m || m.estado !== 'finalizado') return false;
            const result = getMatchResult(m);
            if (!result) return false;
            if (p.winner_pick) return p.winner_pick === result;
            return false;
        }).length;
        const finishedWithPrediction = predictions.filter(p => {
            const m = matches.find(match => match.id === p.match_id);
            return m && m.estado === 'finalizado';
        }).length;
        const accuracy = finishedWithPrediction > 0 ? Math.round((correctPredictions / finishedWithPrediction) * 100) : 0;

        return { totalPredictions, correctPredictions, accuracy };
    }, [matches, predictions]);

    return {
        matches,
        predictions,
        allPredictions,
        ranking,
        loading,
        userPublicProfile,
        handlePredict,
        stats,
        refresh: fetchData
    };
}
