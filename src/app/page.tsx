"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Avatar, ScoreDisplay, LiveIndicator } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { Trophy, Clock, MapPin, ChevronRight, Calendar, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Partido = {
  id: number;
  equipo_a: string;
  equipo_b: string;
  fecha: string;
  estado: string;
  marcador_detalle: any;
  disciplinas: {
    name: string;
    icon: string;
  };
};

export default function Home() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("todos");

  const fetchPartidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partidos')
      .select(`*, disciplinas ( name, icon )`)
      .order('fecha', { ascending: true });

    if (!error && data) {
      const sorted = (data as any).sort((a: Partido, b: Partido) => {
        if (a.estado === 'en_vivo' && b.estado !== 'en_vivo') return -1;
        if (a.estado !== 'en_vivo' && b.estado === 'en_vivo') return 1;
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      });
      setPartidos(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPartidos();
    const subscription = supabase
      .channel('public:partidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => fetchPartidos())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  const filteredPartidos = partidos.filter(p => {
    if (activeFilter === 'todos') return true;
    return p.disciplinas?.name.toLowerCase() === activeFilter.toLowerCase();
  });

  const uniqueDisciplinas = Array.from(new Set(partidos.map(p => p.disciplinas?.name))).filter(Boolean);
  const liveMatches = partidos.filter(p => p.estado === 'en_vivo');

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass border-b border-border/30">
        <div className="flex h-16 items-center justify-between px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30">
              <Trophy size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Olimpiadas</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">UNINORTE 2026</p>
            </div>
          </div>

          <Link href="/admin/login">
            <Button variant="glass" size="sm">
              Admin
            </Button>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="px-4 pb-3 overflow-x-auto flex gap-2 no-scrollbar max-w-lg mx-auto">
          <button
            onClick={() => setActiveFilter('todos')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === 'todos'
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25'
              : 'glass text-muted-foreground hover:text-foreground'
              }`}
          >
            ✨ Todo
          </button>
          {uniqueDisciplinas.map(d => (
            <button
              key={d}
              onClick={() => setActiveFilter(d)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeFilter === d
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25'
                : 'glass text-muted-foreground hover:text-foreground'
                }`}
            >
              {d}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-8">

        {/* Live Section */}
        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">En Vivo Ahora</h2>
              <Badge variant="live">
                <span className="relative flex h-1.5 w-1.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                </span>
                {liveMatches.length}
              </Badge>
            </div>

            <div className="space-y-3">
              {liveMatches.map(partido => (
                <LiveMatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* All Matches */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/80">Agenda y Resultados</h2>
          </div>

          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-2xl bg-muted/20 animate-pulse" />
              ))
            ) : filteredPartidos.filter(p => p.estado !== 'en_vivo').length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay partidos</p>
              </div>
            ) : (
              filteredPartidos.filter(p => p.estado !== 'en_vivo').map(partido => (
                <MatchCard key={partido.id} partido={partido} />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ===== LIVE MATCH CARD (Featured) =====
function LiveMatchCard({ partido }: { partido: Partido }) {
  const scoreA = partido.marcador_detalle?.goles_a ?? partido.marcador_detalle?.total_a ?? partido.marcador_detalle?.sets_a ?? 0;
  const scoreB = partido.marcador_detalle?.goles_b ?? partido.marcador_detalle?.total_b ?? partido.marcador_detalle?.sets_b ?? 0;

  return (
    <Link href={`/partido/${partido.id}`} className="block group">
      <Card variant="gradient" className="overflow-hidden group-hover:shadow-primary/20 transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className="bg-background/20 backdrop-blur-md border-white/10 text-white">
            {partido.disciplinas?.name}
          </Badge>
          <LiveIndicator />
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
          <div className="flex flex-col items-center gap-2">
            <Avatar name={partido.equipo_a} size="lg" className="h-16 w-16 text-xl ring-2 ring-white/20" />
            <span className="text-sm font-bold text-center leading-tight text-white">{partido.equipo_a}</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-black/20 backdrop-blur-sm px-6 py-2 rounded-2xl border border-white/10 mb-2">
              <ScoreDisplay scoreA={scoreA} scoreB={scoreB} size="lg" className="text-white drop-shadow-lg" />
            </div>
            {/* Live Timer Component */}
            <div className="px-3 py-1 bg-primary/20 rounded-full border border-primary/30">
              <PublicLiveTimer detalle={partido.marcador_detalle || {}} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Avatar name={partido.equipo_b} size="lg" className="h-16 w-16 text-xl ring-2 ring-white/20" />
            <span className="text-sm font-bold text-center leading-tight text-white">{partido.equipo_b}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-white/60">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>Coliseo Central</span>
          </div>
          <div className="flex items-center gap-1 text-white font-medium group-hover:translate-x-1 transition-transform">
            Ver Detalles <ChevronRight size={14} />
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ===== REGULAR MATCH CARD =====
function MatchCard({ partido }: { partido: Partido }) {
  const scoreA = partido.marcador_detalle?.goles_a ?? partido.marcador_detalle?.total_a ?? partido.marcador_detalle?.sets_a ?? 0;
  const scoreB = partido.marcador_detalle?.goles_b ?? partido.marcador_detalle?.total_b ?? partido.marcador_detalle?.sets_b ?? 0;
  const isFinished = partido.estado === 'finalizado';

  return (
    <Link href={`/partido/${partido.id}`} className="block">
      <Card variant="glass" className="hover:border-primary/50 transition-all hover:bg-muted/40 group">
        <div className="flex items-center gap-4">
          {/* Teams */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar name={partido.equipo_a} size="sm" />
              <span className={`text-sm font-semibold flex-1 ${scoreA > scoreB && isFinished ? 'text-primary' : ''}`}>
                {partido.equipo_a}
              </span>
              <span className={`text-lg font-bold font-mono w-8 text-right ${scoreA > scoreB && isFinished ? 'text-primary' : ''}`}>
                {scoreA}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar name={partido.equipo_b} size="sm" />
              <span className={`text-sm font-semibold flex-1 text-muted-foreground ${scoreB > scoreA && isFinished ? 'text-primary' : ''}`}>
                {partido.equipo_b}
              </span>
              <span className={`text-lg font-bold font-mono w-8 text-right text-muted-foreground ${scoreB > scoreA && isFinished ? 'text-primary' : ''}`}>
                {scoreB}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-12 w-px bg-border/50" />

          {/* Status */}
          <div className="text-center min-w-[60px]">
            {isFinished ? (
              <Badge variant="outline" className="text-[9px] border-transparent bg-muted/50 text-muted-foreground">Final</Badge>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Inicia</p>
                <Badge variant="secondary" className="font-mono text-xs">
                  {new Date(partido.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </>
            )}
            <p className="text-[9px] text-muted-foreground mt-1.5 opacity-60 truncate max-w-[60px]">
              {partido.disciplinas?.name}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
