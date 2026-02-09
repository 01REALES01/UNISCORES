"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button, Badge, Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { ArrowLeft, Clock, MapPin, Trophy, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Partido = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    fecha: string;
    estado: string;
    marcador_detalle: any;
    disciplinas: { name: string };
};

type Evento = {
    id: number;
    tipo_evento: string;
    minuto: number;
    equipo: string;
    descripcion: string;
    jugadores: { nombre: string; numero: number } | null;
};

export default function PublicMatchDetail() {
    const params = useParams();
    const matchId = params.id as string;

    const [match, setMatch] = useState<Partido | null>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar datos
    const fetchData = async () => {
        // 1. Partido
        const { data: matchData } = await supabase
            .from('partidos')
            .select(`*, disciplinas(name)`)
            .eq('id', matchId)
            .single();

        if (matchData) setMatch(matchData);

        // 2. Eventos
        const { data: eventosData } = await supabase
            .from('olympics_eventos')
            .select('*, jugadores:olympics_jugadores(nombre, numero)')
            .eq('partido_id', matchId)
            .order('minuto', { ascending: false });

        if (eventosData) setEventos(eventosData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Suscripción Realtime
        const channel = supabase
            .channel(`match:${matchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos', filter: `id=eq.${matchId}` }, (payload) => {
                setMatch(payload.new as Partido);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'olympics_eventos', filter: `partido_id=eq.${matchId}` }, () => {
                fetchData(); // Recargar eventos si hay nuevos
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [matchId]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    if (!match) return <div className="p-8 text-center">Partido no encontrado</div>;

    const scoreA = match.marcador_detalle?.goles_a ?? match.marcador_detalle?.total_a ?? 0;
    const scoreB = match.marcador_detalle?.goles_b ?? match.marcador_detalle?.total_b ?? 0;
    const isLive = match.estado === 'en_vivo';

    return (
        <div className="min-h-screen pb-12 bg-background">
            {/* Header / Scoreboard */}
            <div className="relative bg-slate-900 border-b border-white/10 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-background to-purple-500/10" />

                <div className="relative max-w-lg mx-auto px-4 py-6">
                    <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-white mb-6">
                        <ArrowLeft size={16} className="mr-1" /> Volver
                    </Link>

                    {/* Match Status */}
                    <div className="flex justify-center mb-6">
                        {isLive ? (
                            <Badge variant="live" className="px-3 py-1 bg-red-500/20 border-red-500/30 text-red-400">
                                <span className="relative flex h-2 w-2 mr-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                EN VIVO
                            </Badge>
                        ) : (
                            <Badge variant="outline">{match.estado === 'finalizado' ? 'Finalizado' : 'Programado'}</Badge>
                        )}
                    </div>

                    {/* Teams & Score */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                        <div className="flex flex-col items-center gap-3">
                            <Avatar name={match.equipo_a} size="lg" className="w-20 h-20 text-2xl border-4 border-white/5" />
                            <h2 className="font-bold text-lg text-center leading-tight">{match.equipo_a}</h2>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="text-6xl font-black tabular-nums tracking-tighter text-white">
                                {scoreA}-{scoreB}
                            </div>
                            <div className="mt-2 text-primary font-mono font-bold text-lg px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
                                <PublicLiveTimer detalle={match.marcador_detalle || {}} />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <Avatar name={match.equipo_b} size="lg" className="w-20 h-20 text-2xl border-4 border-white/5" />
                            <h2 className="font-bold text-lg text-center leading-tight">{match.equipo_b}</h2>
                        </div>
                    </div>

                    <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                        <MapPin size={12} /> Coliseo Central • {match.disciplinas?.name}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-8 space-y-8">

                {/* Timeline */}
                <section>
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
                        <Clock className="text-primary" size={20} /> Eventos
                    </h3>

                    <div className="space-y-4 relative pl-4 border-l-2 border-border/50 ml-2">
                        {eventos.length === 0 && <p className="text-muted-foreground italic pl-4">El partido está comenzando...</p>}

                        {eventos.map((e) => (
                            <div key={e.id} className="relative pl-6 animate-in slide-in-from-left-2 fade-in duration-500">
                                {/* Dot */}
                                <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                </div>

                                <div className="glass p-3 rounded-xl border border-white/5 bg-muted/20">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-primary">{e.minuto}'</span>
                                        <Badge variant="secondary" className="text-[10px] h-5">{e.equipo === 'sistema' ? 'Juez' : e.equipo === 'equipo_a' ? match.equipo_a : match.equipo_b}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">
                                            {e.tipo_evento === 'gol' && '⚽'}
                                            {e.tipo_evento === 'tarjeta_amarilla' && '🟨'}
                                            {e.tipo_evento === 'tarjeta_roja' && '🟥'}
                                            {e.tipo_evento === 'inicio' && '🚀'}
                                            {e.tipo_evento === 'fin' && '🏁'}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-sm capitalize">{e.tipo_evento.replace('_', ' ')}</p>
                                            {e.jugadores && <p className="text-xs text-muted-foreground">{e.jugadores.nombre} (#{e.jugadores.numero})</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Stats (Placeholder for now) */}
                <section>
                    <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
                        <Trophy className="text-yellow-500" size={20} /> Estadísticas
                    </h3>
                    <div className="glass p-4 rounded-xl text-center text-sm text-muted-foreground">
                        Próximamente
                    </div>
                </section>
            </div>
        </div>
    );
}
