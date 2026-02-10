"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Avatar, ScoreDisplay, LiveIndicator } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { Trophy, Clock, MapPin, ChevronRight, Calendar, Zap, Filter, Flame, Medal } from "lucide-react";
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

const SPORT_EMOJI: Record<string, string> = {
  'Fútbol': '⚽', 'Baloncesto': '🏀', 'Voleibol': '🏐',
  'Tenis': '🎾', 'Tenis de Mesa': '🏓', 'Ajedrez': '♟️', 'Natación': '🏊',
};

const SPORT_COLOR: Record<string, string> = {
  'Fútbol': 'from-emerald-500 to-green-600',
  'Baloncesto': 'from-orange-500 to-amber-600',
  'Voleibol': 'from-blue-500 to-cyan-600',
  'Tenis': 'from-lime-500 to-green-500',
  'Tenis de Mesa': 'from-red-500 to-pink-600',
  'Ajedrez': 'from-slate-500 to-zinc-700',
  'Natación': 'from-cyan-500 to-blue-600',
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
    return p.disciplinas?.name === activeFilter;
  });

  const allSports = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];
  const activeSports = allSports.filter(s => partidos.some(p => p.disciplinas?.name === s));
  const liveMatches = filteredPartidos.filter(p => p.estado === 'en_vivo');
  const upcomingMatches = filteredPartidos.filter(p => p.estado === 'programado');
  const finishedMatches = filteredPartidos.filter(p => p.estado === 'finalizado');

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary via-primary to-orange-500 text-white shadow-lg shadow-primary/30 relative">
              <Trophy size={20} strokeWidth={2} />
              {liveMatches.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative rounded-full h-3 w-3 bg-red-500 border-2 border-background" />
                </span>
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Olimpiadas
              </h1>
              <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-[0.2em]">UNINORTE 2026</p>
            </div>
          </div>

          <Link href="/admin/login">
            <Button variant="glass" size="sm" className="text-xs font-bold">
              ⚡ Admin
            </Button>
          </Link>
        </div>

        {/* Sport Filter Pills */}
        <div className="px-4 pb-3 overflow-x-auto flex gap-2 no-scrollbar max-w-2xl mx-auto">
          <button
            onClick={() => setActiveFilter('todos')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${activeFilter === 'todos'
              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 scale-105'
              : 'bg-muted/20 border border-border/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
          >
            <Flame size={12} />
            Todo
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{partidos.length}</span>
          </button>
          {allSports.map(sport => {
            const count = partidos.filter(p => p.disciplinas?.name === sport).length;
            const hasLive = partidos.some(p => p.disciplinas?.name === sport && p.estado === 'en_vivo');
            if (count === 0) return null;
            return (
              <button
                key={sport}
                onClick={() => setActiveFilter(activeFilter === sport ? 'todos' : sport)}
                className={`relative px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${activeFilter === sport
                  ? `bg-gradient-to-r ${SPORT_COLOR[sport]} text-white shadow-lg scale-105`
                  : 'bg-muted/20 border border-border/20 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
              >
                <span>{SPORT_EMOJI[sport]}</span>
                {sport}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeFilter === sport ? 'bg-white/20' : 'bg-muted/30'}`}>{count}</span>
                {hasLive && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-8">

        {/* Live Section */}
        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <Zap size={14} className="text-red-500" />
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground/80">En Vivo</h2>
              <Badge variant="live" className="ml-1">
                <span className="relative flex h-1.5 w-1.5 mr-1">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-current opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-current" />
                </span>
                {liveMatches.length}
              </Badge>
            </div>

            <div className="space-y-4">
              {liveMatches.map(partido => (
                <LiveMatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Calendar size={14} className="text-blue-500" />
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground/80">Próximos Partidos</h2>
              <span className="text-xs text-muted-foreground ml-1 bg-muted/30 px-2 py-0.5 rounded-full">{upcomingMatches.length}</span>
            </div>

            <div className="space-y-3">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-muted/10 animate-pulse border border-border/10" />
                ))
              ) : (
                upcomingMatches.map(partido => (
                  <MatchCard key={partido.id} partido={partido} />
                ))
              )}
            </div>
          </section>
        )}

        {/* Finished Matches */}
        {finishedMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Medal size={14} className="text-emerald-500" />
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground/80">Resultados</h2>
              <span className="text-xs text-muted-foreground ml-1 bg-muted/30 px-2 py-0.5 rounded-full">{finishedMatches.length}</span>
            </div>

            <div className="space-y-3">
              {finishedMatches.map(partido => (
                <MatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && filteredPartidos.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex p-6 rounded-3xl bg-muted/10 border-2 border-dashed border-border/20 mb-4">
              <Trophy size={48} className="text-muted-foreground/15" />
            </div>
            <p className="font-bold text-lg">No hay partidos</p>
            <p className="text-muted-foreground text-sm mt-1">
              {activeFilter !== 'todos' ? `No hay partidos de ${activeFilter}` : 'Los partidos aparecerán aquí'}
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-muted/10 animate-pulse border border-border/10" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ===== LIVE MATCH CARD (Premium Featured) =====
function LiveMatchCard({ partido }: { partido: Partido }) {
  const md = partido.marcador_detalle || {};
  const scoreA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
  const scoreB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
  const sportName = partido.disciplinas?.name || '';
  const gradient = SPORT_COLOR[sportName] || 'from-primary to-secondary';

  return (
    <Link href={`/partido/${partido.id}`} className="block group">
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-[1px] shadow-2xl shadow-primary/20 group-hover:shadow-primary/30 transition-all duration-500`}>
        <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-[calc(1.5rem-1px)] p-6 backdrop-blur-xl overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-white/[0.03] to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/[0.02] to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />

          {/* Header */}
          <div className="relative flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{SPORT_EMOJI[sportName] || '🏅'}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">{sportName}</span>
            </div>
            <div className="flex items-center gap-2">
              <LiveIndicator />
            </div>
          </div>

          {/* Scoreboard */}
          <div className="relative grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="flex flex-col items-center gap-3">
              <Avatar name={partido.equipo_a} size="lg" className="h-16 w-16 text-xl ring-2 ring-white/20 shadow-xl" />
              <span className="text-sm font-extrabold text-center leading-tight text-white max-w-[100px] truncate">{partido.equipo_a}</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-black/30 backdrop-blur-sm px-7 py-3 rounded-2xl border border-white/10 mb-3 shadow-inner">
                <ScoreDisplay scoreA={scoreA} scoreB={scoreB} size="lg" className="text-white drop-shadow-lg" />
              </div>
              <div className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <PublicLiveTimer detalle={partido.marcador_detalle || {}} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Avatar name={partido.equipo_b} size="lg" className="h-16 w-16 text-xl ring-2 ring-white/20 shadow-xl" />
              <span className="text-sm font-extrabold text-center leading-tight text-white/70 max-w-[100px] truncate">{partido.equipo_b}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="relative mt-5 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <MapPin size={11} />
              <span>Coliseo Central</span>
            </div>
            <div className="flex items-center gap-1 text-white/80 font-bold group-hover:translate-x-1 transition-transform duration-300">
              Ver Detalles <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ===== REGULAR MATCH CARD =====
function MatchCard({ partido }: { partido: Partido }) {
  const md = partido.marcador_detalle || {};
  const scoreA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
  const scoreB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
  const isFinished = partido.estado === 'finalizado';
  const sportName = partido.disciplinas?.name || '';
  const winnerA = scoreA > scoreB && isFinished;
  const winnerB = scoreB > scoreA && isFinished;

  return (
    <Link href={`/partido/${partido.id}`} className="block group">
      <div className="relative rounded-2xl border border-border/15 bg-muted/5 hover:bg-muted/15 hover:border-border/30 transition-all duration-300 overflow-hidden">
        {/* Sport accent line */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${SPORT_COLOR[sportName] || 'from-primary to-secondary'} opacity-40 group-hover:opacity-80 transition-opacity`} />

        <div className="flex items-center gap-4 p-4 pl-5">
          {/* Sport emoji */}
          <div className="flex flex-col items-center gap-1 min-w-[40px]">
            <span className="text-2xl">{SPORT_EMOJI[sportName] || '🏅'}</span>
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider text-center leading-tight max-w-[50px]">
              {sportName}
            </span>
          </div>

          {/* Teams */}
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5">
              <Avatar name={partido.equipo_a} size="sm" className={`h-7 w-7 text-[10px] shrink-0 ${winnerA ? 'ring-2 ring-primary/50' : ''}`} />
              <span className={`text-sm font-bold flex-1 truncate ${winnerA ? 'text-primary' : ''}`}>
                {partido.equipo_a}
              </span>
              <span className={`text-xl font-black font-mono w-6 text-right ${winnerA ? 'text-primary' : ''}`}>
                {isFinished || scoreA > 0 ? scoreA : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Avatar name={partido.equipo_b} size="sm" className={`h-7 w-7 text-[10px] shrink-0 ${winnerB ? 'ring-2 ring-primary/50' : ''}`} />
              <span className={`text-sm font-semibold flex-1 truncate text-muted-foreground ${winnerB ? 'text-primary' : ''}`}>
                {partido.equipo_b}
              </span>
              <span className={`text-xl font-black font-mono w-6 text-right text-muted-foreground ${winnerB ? 'text-primary' : ''}`}>
                {isFinished || scoreB > 0 ? scoreB : '-'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border/20" />

          {/* Status */}
          <div className="text-center min-w-[56px] flex flex-col items-center">
            {isFinished ? (
              <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-lg bg-muted/30 text-muted-foreground/60 tracking-wider">
                Final
              </span>
            ) : (
              <>
                <p className="text-[8px] text-muted-foreground/40 uppercase font-bold mb-0.5">Inicia</p>
                <span className="text-xs font-black font-mono text-foreground/80">
                  {new Date(partido.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <p className="text-[8px] text-muted-foreground/30 mt-0.5">
                  {new Date(partido.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                </p>
              </>
            )}
          </div>

          {/* Arrow */}
          <ChevronRight size={16} className="text-muted-foreground/15 group-hover:text-muted-foreground/40 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>
    </Link>
  );
}
