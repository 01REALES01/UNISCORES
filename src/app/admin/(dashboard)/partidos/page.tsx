"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { Plus, Calendar, Clock, Loader2 } from "lucide-react";
import { Card, Badge, Avatar, LiveIndicator } from "@/components/ui-primitives";
import { CreateMatchModal } from "@/components/create-match-modal";
import { useRouter } from "next/navigation";

export default function PartidosPage() {
    const [partidos, setPartidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todos');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchPartidos();

        const channel = supabase
            .channel('realtime-partidos')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                fetchPartidos();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchPartidos = async () => {
        const { data } = await supabase
            .from('partidos')
            .select(`*, disciplinas(name)`)
            .order('created_at', { ascending: false });

        if (data) setPartidos(data);
        setLoading(false);
    };

    const filteredPartidos = partidos.filter(p => {
        if (filter === 'todos') return true;
        if (filter === 'En_Vivo') return p.estado === 'en_vivo';
        if (filter === 'Programados') return p.estado === 'programado';
        if (filter === 'Finalizados') return p.estado === 'finalizado';
        return true;
    });

    const liveCount = partidos.filter(p => p.estado === 'en_vivo').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Partidos</h1>
                    <p className="text-muted-foreground mt-1">Administra marcadores y eventos en tiempo real</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-lg shadow-primary/25">
                    <Plus size={18} />
                    Nuevo Partido
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card variant="glass" className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">Partidos en Vivo</div>
                    <div className="mt-2 text-3xl font-bold text-primary flex items-center gap-2">
                        {liveCount}
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    </div>
                </Card>
                <Card variant="glass" className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">Programados Hoy</div>
                    <div className="mt-2 text-3xl font-bold">{partidos.filter(p => p.estado === 'programado').length}</div>
                </Card>
                <Card variant="glass" className="p-6">
                    <div className="text-sm font-medium text-muted-foreground">Finalizados</div>
                    <div className="mt-2 text-3xl font-bold text-muted-foreground">{partidos.filter(p => p.estado === 'finalizado').length}</div>
                </Card>
            </div>

            {/* Filters */}
            <Card variant="glass" className="p-1.5 inline-flex bg-muted/20 backdrop-blur-md border-white/5">
                {['todos', 'En_Vivo', 'Programados', 'Finalizados'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        {f === 'En_Vivo' && liveCount > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 mr-1.5 text-[10px] bg-white/20 rounded-full">{liveCount}</span>
                        )}
                        {f.replace('_', ' ')}
                    </button>
                ))}
            </Card>

            {/* Matches Grid */}
            {loading ? (
                <div className="flex justify-center p-16">
                    <Loader2 className="animate-spin text-primary" size={36} />
                </div>
            ) : partidos.length === 0 ? (
                <Card variant="glass" className="text-center p-16 border-dashed">
                    <Calendar size={40} className="mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">No hay partidos registrados</p>
                    <Button variant="secondary" className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={16} /> Crear Primer Partido
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPartidos.map((partido) => {
                        const isLive = partido.estado === 'en_vivo';
                        const isFinished = partido.estado === 'finalizado';
                        const scoreA = partido.marcador_detalle?.goles_a ?? partido.marcador_detalle?.total_a ?? 0;
                        const scoreB = partido.marcador_detalle?.goles_b ?? partido.marcador_detalle?.total_b ?? 0;

                        return (
                            <Card
                                key={partido.id}
                                variant={isLive ? "gradient" : "glass"}
                                className={`group overflow-hidden hover:border-primary/40 transition-all cursor-pointer ${isLive ? 'glow-primary' : ''}`}
                                onClick={() => router.push(`/admin/partidos/${partido.id}`)}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-center mb-4">
                                    <Badge variant="outline">{partido.disciplinas?.name || 'Deporte'}</Badge>
                                    {isLive && <LiveIndicator />}
                                    {isFinished && <Badge variant="outline">Final</Badge>}
                                </div>

                                {/* Teams & Scores */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={partido.equipo_a} size="sm" />
                                        <span className="font-semibold flex-1 truncate">{partido.equipo_a}</span>
                                        <span className="text-2xl font-black font-mono">{scoreA}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={partido.equipo_b} size="sm" />
                                        <span className="font-semibold flex-1 truncate text-muted-foreground group-hover:text-foreground transition-colors">{partido.equipo_b}</span>
                                        <span className="text-2xl font-black font-mono text-muted-foreground">{scoreB}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-5 pt-4 border-t border-border/30 flex justify-between items-center text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} />
                                        <span>
                                            {partido.marcador_detalle?.tiempo || (partido.estado === 'en_vivo' ? 'En Juego' : 'Programado')}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/admin/partidos/${partido.id}`);
                                        }}
                                    >
                                        Controlar
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            <CreateMatchModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchPartidos();
                }}
            />
        </div>
    );
}
