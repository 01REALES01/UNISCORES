"use client";

import { useEffect, useState } from "react";
import { CampusMapInteractive } from "@/components/campus-map-interactive";
import { supabase } from "@/lib/supabase";
import { Button, Badge } from "@/components/ui-primitives";
import { ArrowLeft, MapPin, Activity, Calendar } from "lucide-react";
import Link from "next/link";
import { LUGARES_OLIMPICOS } from "@/lib/constants";

export default function CampusMapPage() {
    const [loading, setLoading] = useState(true);
    const [matches, setMatches] = useState<any[]>([]);

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);

            // Traemos partidos en vivo o programados (no finalizados, o finalizados hoy)
            // Para simplificar, traemos todo y filtramos en cliente lo relevante
            const { data, error } = await supabase
                .from('partidos')
                .select(`*, disciplinas ( name, icon )`)
                .order('fecha', { ascending: false })
                .limit(50);

            if (data && !error) {
                // DEBUG: Ver qué llega de Supabase
                console.log("🔍 [DEBUG MAPA] Partidos RAW:", data);
                const lugaresEnBD = [...new Set(data.map((m: any) => m.lugar))];
                console.log("📍 [DEBUG MAPA] Lugares encontrados en BD:", lugaresEnBD);
                console.log("✅ [DEBUG MAPA] Lugares esperados (constantes):", LUGARES_OLIMPICOS);

                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

                const relevantMatches = data;

                console.log("🎯 [DEBUG MAPA] Partidos FILTRADOS:", relevantMatches);
                setMatches(relevantMatches);
            }
            setLoading(false);
        };

        fetchMatches();

        // Realtime updates
        const subscription = supabase
            .channel('public:mapa')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => fetchMatches())
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-900/20 via-black to-black pointer-events-none" />

            <div className="w-full px-4 py-8 relative z-10 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                                <ArrowLeft />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                                <MapPin className="text-blue-500" /> Mapa del Campus
                            </h1>
                            <p className="text-zinc-400 text-sm">
                                Visualización en tiempo real de las sedes olímpicas.
                            </p>
                        </div>
                    </div>

                    {/* Leyenda */}
                    <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/5">
                        <div className="flex items-center gap-1.5 px-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-zinc-300">En Vivo</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5 px-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-zinc-300">Programado</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5 px-2">
                            <span className="w-2 h-2 rounded-full bg-zinc-600" />
                            <span className="text-xs font-bold text-zinc-500">Inactivo</span>
                        </div>
                    </div>
                </div>

                {/* Main Map Component */}
                <div className="w-full h-[75vh] min-h-[500px] mx-auto my-6 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative bg-zinc-900/50">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <Activity className="animate-spin text-blue-500" size={32} />
                                <span className="text-xs font-mono text-blue-500 uppercase tracking-widest">Cargando Satélite...</span>
                            </div>
                        </div>
                    ) : (
                        <CampusMapInteractive matches={matches} />
                    )}
                </div>

                {/* Upcoming Schedule Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 max-w-7xl mx-auto">
                    {LUGARES_OLIMPICOS.map(venue => {
                        const venueMatches = matches.filter(m => m.lugar?.includes(venue));
                        const live = venueMatches.find(m => m.estado === 'en_vivo');

                        return (
                            <div key={venue} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 hover:bg-white/5 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-zinc-300 group-hover:text-white transition-colors">{venue}</h3>
                                    {live && <Badge className="bg-red-500/20 text-red-500 border-red-500/20 animate-pulse">LIVE</Badge>}
                                </div>

                                {venueMatches.length > 0 ? (
                                    <div className="space-y-2">
                                        {venueMatches.slice(0, 2).map(m => (
                                            <Link href={`/partido/${m.id}`} key={m.id} className="block text-xs bg-black/20 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                <div className="flex justify-between font-mono text-zinc-400 mb-1">
                                                    <span>{new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>{m.disciplinas.emoji}</span>
                                                </div>
                                                <div className="font-bold text-zinc-200">
                                                    {m.delegacion_a || m.equipo_a} vs {m.delegacion_b || m.equipo_b}
                                                </div>
                                            </Link>
                                        ))}
                                        {venueMatches.length > 2 && (
                                            <p className="text-[10px] text-center text-zinc-600">+{venueMatches.length - 2} más</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-zinc-600 italic py-4 text-center">Sin actividad hoy</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
