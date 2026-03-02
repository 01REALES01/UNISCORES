"use client";

import { useEffect, useState } from "react";
import { CampusMapInteractive } from "@/components/campus-map-interactive";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
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

            const { data, error } = await safeQuery(
                supabase.from('partidos').select(`*, disciplinas ( name, icon )`).order('fecha', { ascending: false }).limit(50),
                'mapa-matches'
            );

            if (data) {
                console.log("🔍 [DEBUG MAPA] Partidos RAW:", data);
                setMatches(data);
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
        <div className="min-h-screen bg-[#17130D] text-white relative overflow-hidden">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#FFC000]/10 via-[#17130D] to-[#17130D] pointer-events-none" />

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
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-white">
                                <MapPin className="text-[#FFC000]" /> Mapa del Campus
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
                <div className="w-full h-[75vh] min-h-[500px] mx-auto my-6 border border-white/5 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative bg-[#0a0805] ring-2 ring-white/5">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#0a0805]">
                            <div className="flex flex-col items-center gap-4">
                                <Activity className="animate-spin text-[#FFC000]" size={32} />
                                <span className="text-xs font-mono text-[#FFC000] uppercase tracking-widest">Cargando Satélite...</span>
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
                            <div key={venue} className="bg-[#0a0805]/80 border border-white/5 rounded-2xl p-4 hover:border-white/20 transition-all group shadow-2xl">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-white/70 group-hover:text-[#FFC000] transition-colors">{venue}</h3>
                                    {live && <Badge className="bg-[#DB1406]/20 text-[#DB1406] border-[#DB1406]/20 animate-pulse">LIVE</Badge>}
                                </div>

                                {venueMatches.length > 0 ? (
                                    <div className="space-y-2">
                                        {venueMatches.slice(0, 2).map(m => (
                                            <Link href={`/partido/${m.id}`} key={m.id} className="block text-xs bg-[#17130D] border border-white/5 p-2 rounded-lg hover:border-[#FFC000]/50 transition-colors">
                                                <div className="flex justify-between font-mono text-[#FFC000]/70 mb-1">
                                                    <span>{new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>{m.disciplinas.emoji}</span>
                                                </div>
                                                <div className="font-bold text-white/90">
                                                    {m.delegacion_a || m.equipo_a} vs {m.delegacion_b || m.equipo_b}
                                                </div>
                                            </Link>
                                        ))}
                                        {venueMatches.length > 2 && (
                                            <p className="text-[10px] text-center text-white/40">+{venueMatches.length - 2} más</p>
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
