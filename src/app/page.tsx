"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { Trophy, Clock, MapPin, ChevronRight, Calendar, Zap, Flame, MoveRight, Search, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Partido = {
  id: number;
  equipo_a: string;
  equipo_b: string;
  fecha: string;
  estado: string;
  lugar?: string;
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

// Modern gradients for each sport
const SPORT_GRADIENT: Record<string, string> = {
  'Fútbol': 'from-emerald-500/20 to-emerald-900/5',
  'Baloncesto': 'from-orange-500/20 to-orange-900/5',
  'Voleibol': 'from-indigo-500/20 to-indigo-900/5',
  'Tenis': 'from-lime-500/20 to-lime-900/5',
  'Tenis de Mesa': 'from-rose-500/20 to-rose-900/5',
  'Ajedrez': 'from-slate-500/20 to-slate-900/5',
  'Natación': 'from-cyan-500/20 to-cyan-900/5',
};

const SPORT_ACCENT: Record<string, string> = {
  'Fútbol': 'text-emerald-400',
  'Baloncesto': 'text-orange-400',
  'Voleibol': 'text-indigo-400',
  'Tenis': 'text-lime-400',
  'Tenis de Mesa': 'text-rose-400',
  'Ajedrez': 'text-slate-400',
  'Natación': 'text-cyan-400',
};

export default function Home() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPartidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partidos')
      .select(`*, disciplinas ( name, icon )`)
      .order('fecha', { ascending: true });

    if (!error && data) {
      const sorted = (data as any).sort((a: Partido, b: Partido) => {
        // Live first, then by date desc (newest first for regular matches? no, usually upcoming is asc, past is desc)
        // Let's just put Live first, then Programado asc (soonest first), then Finalizado desc (recent first)
        const scoreA = getSortScore(a);
        const scoreB = getSortScore(b);
        return scoreA - scoreB;
      });
      setPartidos(sorted);
    }
    setLoading(false);
  };

  const getSortScore = (p: Partido) => {
    if (p.estado === 'en_vivo') return -10000000000; // Live always top
    if (p.estado === 'programado') return new Date(p.fecha).getTime(); // Soonest first
    return new Date(p.fecha).getTime() + 10000000000; // Finished last
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
    // Sport filter
    if (activeFilter !== 'todos' && p.disciplinas?.name !== activeFilter) return false;
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.equipo_a.toLowerCase().includes(q) || p.equipo_b.toLowerCase().includes(q) || p.disciplinas?.name.toLowerCase().includes(q);
    }
    return true;
  });

  const allSports = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];
  const liveMatches = filteredPartidos.filter(p => p.estado === 'en_vivo');
  const upcomingMatches = filteredPartidos.filter(p => p.estado === 'programado');
  const finishedMatches = filteredPartidos.filter(p => p.estado === 'finalizado'); // We'll reverse logic in render for recent finished

  // Reverse finished matches to show most recent first
  const recentFinished = [...finishedMatches].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="min-h-screen bg-[#030711] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen opacity-50" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen opacity-30" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen opacity-40" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5 bg-[#030711]/70">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Trophy size={20} className="text-white relative z-10" strokeWidth={2.5} />
              <div className="absolute inset-0 bg-white/20 rounded-xl blur-md opacity-50 animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-lg sm:text-xl tracking-tight leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                OLIMPIADAS
              </h1>
              <p className="text-[9px] sm:text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] leading-none mt-0.5">
                Uninorte 2026
              </p>
            </div>
          </div>

          <Link href="/admin/login">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold hover:text-white transition-all hover:border-indigo-500/50"
            >
              Area Administrativa
            </Button>
            <Button size="icon" variant="ghost" className="sm:hidden text-muted-foreground p-0">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Activity size={16} />
              </div>
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-24 space-y-10">

        {/* Hero / Filter Section */}
        <div className="flex flex-col gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar equipo o deporte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-sm font-medium placeholder:text-slate-500 text-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear">
            <button
              onClick={() => setActiveFilter('todos')}
              className={cn(
                "group relative px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 border",
                activeFilter === 'todos'
                  ? "bg-white text-[#030711] border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Flame size={14} className={activeFilter === 'todos' ? 'text-indigo-600 fill-indigo-600' : 'group-hover:text-indigo-400'} />
              Todos
            </button>
            {allSports.map(sport => {
              const isActive = activeFilter === sport;
              const hasLive = partidos.some(p => p.disciplinas?.name === sport && p.estado === 'en_vivo');

              return (
                <button
                  key={sport}
                  onClick={() => setActiveFilter(isActive ? 'todos' : sport)}
                  className={cn(
                    "group relative px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 border",
                    isActive
                      ? "bg-[#0a0f1c] border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="text-base leading-none filter drop-shadow-sm">{SPORT_EMOJI[sport]}</span>
                  {sport}
                  {hasLive && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative rounded-full h-2.5 w-2.5 bg-rose-500 shadow-sm" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Section */}
        {liveMatches.length > 0 && (
          <section className="animate-in slide-in-from-bottom-6 fade-in duration-700">
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="relative">
                <div className="absolute inset-0 bg-rose-500 blur-lg opacity-20" />
                <div className="relative p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Zap size={18} fill="currentColor" />
                </div>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">EN VIVO AHORA</h2>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                LIVE
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {liveMatches.map(partido => (
                <LiveMatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Section */}
        {upcomingMatches.length > 0 && (
          <section className="animate-in slide-in-from-bottom-10 fade-in duration-700 delay-100">
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calendar size={18} />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Próximos Encuentros</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map(partido => (
                <UpcomingMatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Results Section */}
        {recentFinished.length > 0 && (
          <section className="animate-in slide-in-from-bottom-10 fade-in duration-700 delay-200">
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="p-2 rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
                <Activity size={18} />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Resultados Recientes</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentFinished.map(partido => (
                <ResultCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && filteredPartidos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Trophy size={40} className="text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sin partidos encontrados</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              No hay eventos que coincidan con tu búsqueda en este momento.
            </p>
            {activeFilter !== 'todos' && (
              <Button
                onClick={() => setActiveFilter('todos')}
                variant="outline"
                className="mt-6 border-white/10 hover:bg-white/5 text-indigo-400"
              >
                Ver todos los deportes
              </Button>
            )}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map(i => <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse" />)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function LiveMatchCard({ partido }: { partido: Partido }) {
  const md = partido.marcador_detalle || {};
  const scoreA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
  const scoreB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
  const sportName = partido.disciplinas?.name || 'Deporte';

  return (
    <Link href={`/partido/${partido.id}`} className="group block h-full">
      <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1c]/80 backdrop-blur-xl transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
        {/* Glowing Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />

        <div className="relative p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg backdrop-blur-md border border-white/10">
                {SPORT_EMOJI[sportName]}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-tight">{sportName}</span>
                <span className="text-[10px] font-medium text-white/80 leading-tight truncate max-w-[100px] sm:max-w-[150px]">{partido.lugar || 'Coliseo Central'}</span>
              </div>
            </div>
            <div className="px-2 py-1 rounded-md bg-rose-500/20 border border-rose-500/30">
              <PublicLiveTimer detalle={partido.marcador_detalle || {}} />
            </div>
          </div>

          {/* Scores */}
          <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Team A */}
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={partido.equipo_a} size="lg" className="w-14 h-14 text-xl border-2 border-white/10 shadow-lg bg-[#030711]" />
              <span className="text-sm font-bold text-white leading-tight line-clamp-2">{partido.equipo_a}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-2 font-black text-4xl text-white tracking-tighter tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <span>{scoreA}</span>
                <span className="text-white/20 text-2xl -mt-2">:</span>
                <span>{scoreB}</span>
              </div>
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={partido.equipo_b} size="lg" className="w-14 h-14 text-xl border-2 border-white/10 shadow-lg bg-[#030711]" />
              <span className="text-sm font-bold text-white leading-tight line-clamp-2">{partido.equipo_b}</span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center text-xs font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
            Ver Detalles <MoveRight size={12} className="ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function UpcomingMatchCard({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || 'Deporte';
  const accentColor = SPORT_ACCENT[sportName] || 'text-slate-400';

  return (
    <Link href={`/partido/${partido.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 hover:border-white/10 p-4 flex items-center gap-4">
        {/* Date Box */}
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 leading-none mb-0.5">
            {new Date(partido.fecha).toLocaleString('es-CO', { month: 'short' }).replace('.', '')}
          </span>
          <span className="text-xl font-black text-white leading-none">
            {new Date(partido.fecha).getDate()}
          </span>
          <span className="text-[9px] font-medium text-slate-500 leading-none mt-0.5">
            {new Date(partido.fecha).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("text-[9px] font-black uppercase tracking-wider", accentColor)}>
              {sportName}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-[9px] text-slate-500 truncate">{partido.lugar || 'Por definir'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={partido.equipo_a} size="sm" className="w-5 h-5 text-[9px] border border-white/10" />
                <span className="text-sm font-bold text-slate-200 truncate">{partido.equipo_a}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={partido.equipo_b} size="sm" className="w-5 h-5 text-[9px] border border-white/10" />
                <span className="text-sm font-bold text-slate-400 truncate group-hover:text-slate-200 transition-colors">{partido.equipo_b}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors cursor-pointer">
          <ChevronRight size={14} />
        </div>
      </div>
    </Link>
  );
}

function ResultCard({ partido }: { partido: Partido }) {
  const md = partido.marcador_detalle || {};
  const scoreA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
  const scoreB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
  const sportName = partido.disciplinas?.name || 'Deporte';
  const winnerA = scoreA > scoreB;

  return (
    <Link href={`/partido/${partido.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all duration-300 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{sportName}</span>
          <span className="text-[10px] text-slate-600">Finalizado</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={partido.equipo_a} size="sm" className={cn("w-6 h-6 text-[10px] border", winnerA ? "border-indigo-500/50" : "border-white/10 opacity-70")} />
              <span className={cn("text-sm font-bold truncate", winnerA ? "text-white" : "text-slate-400")}>
                {partido.equipo_a}
              </span>
            </div>
            <span className={cn("text-lg font-black font-mono", winnerA ? "text-indigo-400" : "text-slate-600")}>
              {scoreA}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={partido.equipo_b} size="sm" className={cn("w-6 h-6 text-[10px] border", !winnerA && scoreB > scoreA ? "border-indigo-500/50" : "border-white/10 opacity-70")} />
              <span className={cn("text-sm font-bold truncate", !winnerA && scoreB > scoreA ? "text-white" : "text-slate-400")}>
                {partido.equipo_b}
              </span>
            </div>
            <span className={cn("text-lg font-black font-mono", !winnerA && scoreB > scoreA ? "text-indigo-400" : "text-slate-600")}>
              {scoreB}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
