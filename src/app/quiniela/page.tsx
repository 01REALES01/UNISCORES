"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Badge } from "@/components/ui-primitives";
import { Trophy, Clock, Lock, CheckCircle, AlertTriangle, ArrowLeft, TrendingUp, Loader2, Gauge, HandMetal } from "lucide-react";
import Link from "next/link";
import { SPORT_EMOJI } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// --- Components ---
const PredictionCard = ({ match, prediction, onPredict, locked, mode }: { match: any, prediction: any, onPredict: (matchId: any, data: any) => void, locked: boolean, mode: 'score' | 'winner' }) => {
    // Score Mode State
    const [scoreA, setScoreA] = useState(prediction?.goles_a ?? "");
    const [scoreB, setScoreB] = useState(prediction?.goles_b ?? "");

    // Winner Mode State (A, B, DRAW)
    const [winnerPick, setWinnerPick] = useState(prediction?.winner_pick ?? null);

    // Sync state if prediction prop updates
    useEffect(() => {
        if (mode === 'score') {
            setScoreA(prediction?.goles_a ?? "");
            setScoreB(prediction?.goles_b ?? "");
        } else {
            setWinnerPick(prediction?.winner_pick ?? null);
        }
    }, [prediction, mode]);

    const handleSave = () => {
        if (mode === 'score') {
            if (scoreA === "" || scoreB === "") return;
            onPredict(match.id, {
                prediction_type: 'score',
                goles_a: parseInt(scoreA),
                goles_b: parseInt(scoreB),
                winner_pick: null
            });
        } else {
            if (!winnerPick) return;
            onPredict(match.id, {
                prediction_type: 'winner',
                goles_a: null,
                goles_b: null,
                winner_pick: winnerPick
            });
        }
    };

    const isPredicted = prediction !== undefined && prediction !== null;
    const isLocked = locked || match.estado !== 'programado';

    return (
        <div className={`relative p-5 rounded-3xl border transition-all duration-300 ${isPredicted ? 'bg-red-900/10 border-red-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]' : 'bg-white/5 border-white/5 hover:bg-white/[0.07]'}`}>
            {isLocked && (
                <div className="absolute top-3 right-3 text-white/60 bg-black/40 p-1.5 rounded-full backdrop-blur-sm">
                    <Lock size={12} />
                </div>
            )}

            <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-white/70 uppercase">
                    <span className="text-base">{SPORT_EMOJI[match.disciplinas.name] || '🏆'}</span>
                    <span>{new Date(match.fecha).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(match.fecha).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {isPredicted && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5">
                        <CheckCircle size={10} className="mr-1" />
                        Guardado
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 text-center font-bold text-sm leading-tight">{match.equipo_a}</div>
                <div className="text-[10px] font-bold text-white/40 uppercase">VS</div>
                <div className="flex-1 text-center font-bold text-sm leading-tight">{match.equipo_b}</div>
            </div>

            {/* INPUT AREA */}
            <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                {mode === 'score' ? (
                    <div className="flex items-center justify-center gap-3">
                        <input
                            type="number"
                            className="w-14 h-12 bg-white/5 border border-white/10 rounded-xl text-center font-mono text-2xl font-black focus:border-red-500 focus:bg-red-500/10 focus:ring-0 outline-none transition-all placeholder:text-white/10"
                            value={scoreA}
                            onChange={(e) => setScoreA(e.target.value)}
                            disabled={isLocked}
                            placeholder="0"
                        />
                        <span className="text-white/50 font-black">-</span>
                        <input
                            type="number"
                            className="w-14 h-12 bg-white/5 border border-white/10 rounded-xl text-center font-mono text-2xl font-black focus:border-red-500 focus:bg-red-500/10 focus:ring-0 outline-none transition-all placeholder:text-white/10"
                            value={scoreB}
                            onChange={(e) => setScoreB(e.target.value)}
                            disabled={isLocked}
                            placeholder="0"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setWinnerPick('A')}
                            disabled={isLocked}
                            className={cn(
                                "py-3 px-2 rounded-lg text-xs font-black tracking-wide transition-all border",
                                winnerPick === 'A'
                                    ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20"
                                    : "bg-white/5 border-transparent text-white/70 hover:bg-white/10"
                            )}
                        >
                            Gana {match.equipo_a.substring(0, 3).toUpperCase()}
                        </button>
                        <button
                            onClick={() => setWinnerPick('DRAW')}
                            disabled={isLocked}
                            className={cn(
                                "py-3 px-2 rounded-lg text-xs font-black tracking-wide transition-all border",
                                winnerPick === 'DRAW'
                                    ? "bg-slate-600 border-slate-500 text-white shadow-lg"
                                    : "bg-white/5 border-transparent text-white/70 hover:bg-white/10"
                            )}
                        >
                            Empate
                        </button>
                        <button
                            onClick={() => setWinnerPick('B')}
                            disabled={isLocked}
                            className={cn(
                                "py-3 px-2 rounded-lg text-xs font-black tracking-wide transition-all border",
                                winnerPick === 'B'
                                    ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-500/20"
                                    : "bg-white/5 border-transparent text-white/70 hover:bg-white/10"
                            )}
                        >
                            Gana {match.equipo_b.substring(0, 3).toUpperCase()}
                        </button>
                    </div>
                )}
            </div>

            {!isLocked && (
                <div className="mt-4 flex justify-end">
                    <Button
                        size="sm"
                        className={cn("w-full rounded-xl text-xs font-black tracking-wide tracking-wide transition-all", isPredicted ? "bg-red-600 hover:bg-red-700" : "bg-white hover:bg-slate-200 text-black")}
                        onClick={handleSave}
                        disabled={mode === 'score' ? (scoreA === "" || scoreB === "") : (!winnerPick)}
                    >
                        {isPredicted ? "Actualizar Predicción" : "Guardar Predicción"}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default function QuinielaPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'play' | 'ranking'>('play');
    const [matches, setMatches] = useState<any[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]);
    const [ranking, setRanking] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bettingMode, setBettingMode] = useState<'score' | 'winner'>('winner'); // Default to winner (easier)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);

            // 1. Matches
            const { data: matchesData } = await supabase
                .from('partidos')
                .select('*, disciplinas(name)')
                .order('fecha', { ascending: true })
                .gte('fecha', new Date().toISOString());

            // 2. Predictions
            const { data: predsData } = await supabase
                .from('pronosticos')
                .select('*')
                .eq('user_id', user.id);

            // 3. Ranking
            const { data: rankingData } = await supabase
                .from('public_profiles')
                .select('*')
                .order('points', { ascending: false })
                .limit(50);

            if (matchesData) setMatches(matchesData);
            if (predsData) setPredictions(predsData);
            if (rankingData) setRanking(rankingData);

            setLoading(false);
        };

        fetchData();
    }, [user]);

    const handlePredict = async (matchId: any, data: any) => {
        if (!user) return;

        toast.promise(
            async () => {
                // FIX: Ensure user profile exists to satisfy FK constraint
                const { error: profileError } = await supabase.from('public_profiles').upsert(
                    { id: user.id, email: user.email },
                    { onConflict: 'id' }
                );

                if (profileError) {
                    console.error("Profile auto-creation failed:", profileError);
                    // Don't throw here, try to proceed, maybe it exists
                }

                const existing = predictions.find(p => p.match_id === matchId);
                const payload = {
                    user_id: user.id,
                    match_id: matchId,
                    ...data
                };

                let error;
                if (existing) {
                    const { error: e } = await supabase.from('pronosticos').update(payload).eq('id', existing.id);
                    error = e;
                } else {
                    const { error: e } = await supabase.from('pronosticos').insert(payload);
                    error = e;
                }

                if (error) {
                    console.error("Betting error:", error);
                    throw error;
                }

                const { data: newData } = await supabase.from('pronosticos').select('*').eq('user_id', user.id);
                if (newData) setPredictions(newData);
            },
            {
                loading: 'Guardando...',
                success: '¡Guardado!',
                error: (e) => `Error: ${e.message}`
            }
        );
    };

    if (authLoading || !user) return <div className="min-h-screen bg-[#0a0805] flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="min-h-screen bg-[#0a0805] text-white font-sans pb-20">
            {/* Simple Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0805]/80 backdrop-blur-md z-40">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div className="text-center">
                    <h1 className="text-2xl font-black italic tracking-tighter text-white">
                        PREDICCIONES
                    </h1>
                    <p className="text-[10px] text-white/70 font-bold tracking-widest uppercase">Olimpiadas 2026</p>
                </div>
                <div className="w-10"></div>
            </div>

            <div className="max-w-xl mx-auto p-4 space-y-8">

                {/* Mode Switcher */}
                {activeTab === 'play' && (
                    <div className="flex justify-center">
                        <div className="inline-flex bg-white/5 p-1 rounded-full border border-white/10">
                            <button
                                onClick={() => setBettingMode('winner')}
                                className={cn("px-4 py-1.5 rounded-full text-xs font-black tracking-wide transition-all flex items-center gap-2", bettingMode === 'winner' ? "bg-red-600 text-white shadow-lg" : "text-white/70 hover:text-white")}
                            >
                                <HandMetal size={12} />
                                Ganador
                            </button>
                            <button
                                onClick={() => setBettingMode('score')}
                                className={cn("px-4 py-1.5 rounded-full text-xs font-black tracking-wide transition-all flex items-center gap-2", bettingMode === 'score' ? "bg-rose-600 text-white shadow-lg" : "text-white/70 hover:text-white")}
                            >
                                <Gauge size={12} />
                                Marcador Exacto
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl mb-6">
                    <button
                        onClick={() => setActiveTab('play')}
                        className={`py-3 rounded-lg text-sm font-black tracking-wide transition-all ${activeTab === 'play' ? 'bg-white text-black shadow-xl' : 'text-white/70 hover:text-white'}`}
                    >
                        Jugar
                    </button>
                    <button
                        onClick={() => setActiveTab('ranking')}
                        className={`py-3 rounded-lg text-sm font-black tracking-wide transition-all ${activeTab === 'ranking' ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'text-white/70 hover:text-white'}`}
                    >
                        Ranking
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'play' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Clock size={16} className="text-red-400" />
                            <h2 className="font-bold text-sm">Próximos Partidos</h2>
                        </div>

                        {matches.length === 0 ? (
                            <div className="text-center py-20 text-white/60 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                                <AlertTriangle className="mx-auto mb-4 opacity-50 w-12 h-12" />
                                <p className="font-medium">No hay partidos habilitados para hoy.</p>
                            </div>
                        ) : (
                            matches.map(m => (
                                <PredictionCard
                                    key={m.id}
                                    match={m}
                                    prediction={predictions.find(p => p.match_id === m.id)}
                                    onPredict={handlePredict}
                                    locked={false}
                                    mode={bettingMode}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
                        <div className="p-6 bg-red-600/10 border-b border-red-600/10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                                <Trophy size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="font-black text-xl text-red-500 tracking-tight">TABLA DE LÍDERES</h2>
                                <p className="text-xs text-red-500/70 font-bold uppercase tracking-widest">Top Analistas</p>
                            </div>
                        </div>

                        <div className="divide-y divide-white/5">
                            {ranking.map((profile, idx) => (
                                <div key={profile.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 ${idx < 3 ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/10 text-white'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white">{profile.display_name?.split('@')[0] || 'Usuario'}</p>
                                            <p className="text-[10px] text-white/60 truncate max-w-[150px] font-medium">{profile.email}</p>
                                        </div>
                                    </div>
                                    <div className="font-mono font-black text-lg text-red-400 tabular-nums">
                                        {profile.points}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
