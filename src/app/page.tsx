"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { MatchCardSkeleton } from "@/components/skeletons";
import { HeroSlider } from "@/components/hero-slider";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, MapPin, ChevronRight, Calendar, Zap, Flame, MoveRight, Search, Activity, TrendingUp, Tv, ArrowRight, Home as HomeIcon, UserIcon, Navigation2, Play, PlayCircle } from "lucide-react";
import SuggestiveSearch from "@/components/ui/suggestive-search";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI, SPORT_GRADIENT, SPORT_ACCENT, SPORT_BORDER, SPORT_GLOW } from "@/lib/constants";
import { getCurrentScore } from "@/lib/sport-scoring";
import { SportIcon } from "@/components/sport-icons";
import { ExpandableTabs, TabItem } from "@/components/ui/expandable-tabs";

type Partido = {
  id: number;
  equipo_a: string;
  equipo_b: string;
  fecha: string;
  estado: string;
  lugar?: string;
  genero?: string;
  marcador_detalle: any;
  disciplinas: {
    name: string;
    icon: string;
  };
};



// Modern gradients for each sport - INTENSIFIED


export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPartidos = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
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
    if (!isBackground) setLoading(false);
  };

  const getSortScore = (p: Partido) => {
    if (p.estado === 'en_vivo') return -10000000000; // Live always top
    if (p.estado === 'programado') return new Date(p.fecha).getTime(); // Soonest first
    return new Date(p.fecha).getTime() + 10000000000; // Finished last
  };

  useEffect(() => {
    fetchPartidos();

    // Realtime subscription
    const subscription = supabase
      .channel('public:partidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, (payload) => {
        console.log("Realtime update received:", payload);
        fetchPartidos(true); // Silent update
      })
      .subscribe();

    // Polling backup (every 10s) to ensure carousel updates
    const interval = setInterval(() => {
      fetchPartidos(true); // Silent update
    }, 10000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(interval);
    };
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
    <div className="min-h-screen bg-[#0a0805] text-white font-sans selection:bg-red-500/30">
      {/* Background Ambient Effects (Removed to keep deep black tone) */}
      <div className="fixed inset-0 pointer-events-none z-0">
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/5 bg-[#0a0805]/70">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 max-w-5xl mx-auto">
          {/* Logo Group + Nav */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 group cursor-default flex-shrink-0">
              <div className="relative flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <img src="/uninorte_logo.png" alt="Uninorte" className="h-14 w-auto object-contain flex-shrink-0" />
                <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <div>
                <h1 className="font-black text-lg sm:text-xl tracking-tight leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  OLIMPIADAS
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold text-red-500 uppercase tracking-[0.2em] leading-none mt-0.5">
                  Uninorte 2026
                </p>
              </div>
            </div>

            {/* Navigation Items (Expandable Tabs) */}
            <div className="hidden md:flex items-center">
              <ExpandableTabs
                activeColor="text-red-500"
                tabs={[
                  { title: "Inicio", icon: HomeIcon },
                  { title: "Mapa", icon: MapPin },
                  { title: "Medallería", icon: Trophy },
                  { type: "separator" },
                  { title: "TV", icon: Tv },
                  { title: "Admin", icon: Activity },
                ]}
                onChange={(index) => {
                  if (index === 0) router.push('/');
                  if (index === 1) router.push('/mapa');
                  if (index === 2) router.push('/medallero');
                  if (index === 4) window.open('/tv', '_blank');
                  if (index === 5) router.push('/admin/login');
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile simplified nav */}
            <div className="flex md:hidden items-center gap-2">
              <Link href="/mapa">
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 rounded-full">
                  <MapPin size={18} />
                </Button>
              </Link>
              <Link href="/medallero">
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 rounded-full">
                  <Trophy size={18} />
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10 rounded-full">
                  <Activity size={18} />
                </Button>
              </Link>
            </div>

            {/* User / Login Section (Far Right) */}
            {!user ? (
              <Link href="/login">
                <Button variant="outline" className="rounded-full border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 gap-2 hidden sm:flex">
                  <UserIcon size={16} />
                  Ingresar
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden text-orange-300">
                  <UserIcon size={20} />
                </Button>
              </Link>
            ) : (
              <Link href="/quiniela">
                <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-white/10">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hola,</p>
                    <p className="text-sm font-bold text-white">{user.email?.split('@')[0]}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white font-bold border-2 border-white/10 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                    {user.email?.substring(0, 2).toUpperCase()}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-24 space-y-10">

        {/* Hero / Filter Section */}
        <div className="flex flex-col gap-6">
          <div className="relative">
            <SuggestiveSearch
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={["Buscar equipo...", "Explorar fútbol...", "Deportes Uninorte...", "Resultados de tenis...", "Natación..."]}
              className="h-12 rounded-2xl bg-[#17130D] border border-white/10 focus-within:border-amber-500/50 focus-within:bg-white/5 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all shadow-sm w-full"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 md:justify-center px-2">
            <button
              onClick={() => setActiveFilter('todos')}
              className={cn(
                "group relative min-w-[90px] h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all duration-300 overflow-hidden shrink-0",
                activeFilter === 'todos'
                  ? "bg-red-600 text-white border-red-600 shadow-md scale-105"
                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Flame size={20} className={cn("transition-all drop-shadow-md", activeFilter === 'todos' ? 'text-rose-600 fill-rose-600' : 'group-hover:text-rose-400 group-hover:fill-rose-400/20')} />
              <span className="text-xs font-bold uppercase tracking-wider z-10">Todos</span>
              {activeFilter === 'todos' && (
                <Flame size={60} className="absolute -bottom-4 -right-4 text-slate-200/20" />
              )}
            </button>
            {allSports.map(sport => {
              const isActive = activeFilter === sport;
              const hasLive = partidos.some(p => p.disciplinas?.name === sport && p.estado === 'en_vivo');

              return (
                <button
                  key={sport}
                  onClick={() => setActiveFilter(isActive ? 'todos' : sport)}
                  className={cn(
                    "group relative min-w-[90px] h-20 rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all duration-300 overflow-hidden shrink-0",
                    isActive
                      ? `bg-[#17130D] ${SPORT_BORDER[sport]} text-white scale-105 ${SPORT_GLOW[sport].replace('hover:', '')} shadow-lg`
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {/* Watermark in filter */}
                  {isActive && (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sport]} opacity-50`} />
                      <div className="absolute -bottom-2 -right-2 pointer-events-none select-none">
                        <SportIcon sport={sport} size={60} className={cn("opacity-20", SPORT_ACCENT[sport])} />
                      </div>
                    </>
                  )}

                  <SportIcon
                    sport={sport}
                    size={22}
                    className={cn(
                      "transition-all z-10",
                      isActive ? `${SPORT_ACCENT[sport]} drop-shadow-[0_0_8px_currentColor]` : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-wider z-10">{sport.split(' ')[0]}</span>

                  {hasLive && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative rounded-full h-2 w-2 bg-rose-500 shadow-sm" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* HERO SLIDER */}
        {!loading && <HeroSlider matches={partidos} activeFilter={activeFilter} />}

        {/* QUINIELA CTA BANNER */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] group cursor-pointer mb-8 bg-[#0a0805]">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <TrendingUp size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-1 tracking-tight">HAGAN SUS PREDICCIONES</h3>
                <p className="text-amber-200/60 text-sm font-medium">Predice resultados y gana premios exclusivos.</p>
              </div>
            </div>

            <Link href="/quiniela" className="w-full md:w-auto">
              <Button className="w-full md:w-auto bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-black font-black uppercase tracking-widest px-8 py-6 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transform group-hover:scale-105 transition-all">
                Jugar Ahora <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Leaderboard Removed from here */}


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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liveMatches.map(partido => (
                <LiveMatchCard key={partido.id} partido={partido} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming / Recent Section */}
        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-100">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="text-orange-500" size={20} />
              {activeFilter === 'todos' ? 'Encuentros' : activeFilter}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <MatchCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mostrar Upcoming y Recent juntos si no hay filtro, o filtrados si hay */}
              {/* Nota: la lógica original separaba upcoming y recent. Aquí simplificamos para mostrar la grilla unificada */}

              {/* Próximos */}
              {upcomingMatches.length > 0 && (
                <>
                  <div className="col-span-full flex items-center gap-2 mt-2 mb-1">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Próximos</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  {[...upcomingMatches]
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map(partido => (
                      <UpcomingMatchCard key={partido.id} partido={partido} />
                    ))}
                </>
              )}

              {/* Finalizados */}
              {recentFinished.length > 0 && (
                <>
                  <div className="col-span-full flex items-center gap-2 mt-4 mb-1">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Finalizados</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  {[...recentFinished]
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map(partido => (
                      <ResultCard key={partido.id} partido={partido} />
                    ))}
                </>
              )}

              {/* Si no hay nada */}
              {upcomingMatches.length === 0 && recentFinished.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Trophy size={32} className="mb-2" />
                  <p>No hay partidos encontrados.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Empty State */}
        {!loading && filteredPartidos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Trophy size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sin partidos encontrados</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              No hay eventos que coincidan con tu búsqueda en este momento.
            </p>
            {activeFilter !== 'todos' && (
              <Button
                onClick={() => setActiveFilter('todos')}
                variant="outline"
                className="mt-6 border-white/10 hover:bg-white/5 text-orange-400"
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
    </div >
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function LiveMatchCard({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || 'Deporte';
  const { scoreA, scoreB, subScoreA, subScoreB, subLabel, extra } = getCurrentScore(sportName, partido.marcador_detalle || {});
  const genero = partido.genero || 'masculino';

  return (
    <Link href={`/partido/${partido.id}`} className="group block h-full">
      <div className={cn(
        "relative h-full overflow-hidden rounded-3xl border bg-[#17130D]/80 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
        SPORT_BORDER[sportName] || 'border-white/10',
        SPORT_GLOW[sportName] || 'hover:shadow-orange-500/10'
      )}>
        {/* Glowing Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-50 group-hover:opacity-70 transition-opacity`} />
        {/* Sport Icon Watermark */}
        <div className="absolute -bottom-6 -right-6 pointer-events-none select-none group-hover:scale-110 transition-transform duration-700 origin-bottom-right">
          <SportIcon sport={sportName} size={150} className={cn("opacity-[0.12] group-hover:opacity-[0.25] transition-all duration-500 drop-shadow-[0_0_30px_currentColor]", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        <div className="relative p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-full bg-[#17130D] flex items-center justify-center border border-white/10 shadow-[0_0_15px_currentColor]", SPORT_ACCENT[sportName])}>
                <SportIcon sport={sportName} size={18} className="drop-shadow-md" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-tight">{sportName}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-medium text-slate-700 leading-tight truncate max-w-[150px] sm:max-w-[200px]">{partido.lugar || 'Coliseo Central'}</span>
                  <span className={`text-white font-black px-1.5 py-0.5 rounded text-[10px] ${genero === 'femenino' ? 'bg-pink-400' :
                    genero === 'mixto' ? 'bg-purple-400' :
                      'bg-blue-400'
                    }`}>{genero === 'femenino' ? '♀' : genero === 'mixto' ? '⚤' : '♂'}</span>
                </div>
              </div>
            </div>
            <div className="z-10">
              <PublicLiveTimer detalle={partido.marcador_detalle || {}} />
            </div>
          </div>

          {/* Scores */}
          <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Team A */}
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={partido.equipo_a} size="lg" className="w-16 h-16 text-2xl border-2 border-white/10 shadow-lg bg-[#0a0805]" />
              <span className="text-xl font-bold text-white leading-tight line-clamp-2 px-2">{partido.equipo_a}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-2 font-black text-6xl text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <span>{scoreA}</span>
                <span className="text-slate-300 text-4xl -mt-2">:</span>
                <span>{scoreB}</span>
              </div>
              {subScoreA !== undefined && subScoreB !== undefined && (
                <div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-500">
                  <span className="text-slate-700">{subScoreA}</span>
                  <span className="text-slate-500">{subLabel}</span>
                  <span className="text-slate-700">{subScoreB}</span>
                </div>
              )}
              {extra && (
                <span className="mt-1 text-[11px] font-bold text-orange-300/60 bg-orange-500/10 px-2 py-0.5 rounded-full">{extra}</span>
              )}
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar name={partido.equipo_b} size="lg" className="w-16 h-16 text-2xl border-2 border-white/10 shadow-lg bg-[#0a0805]" />
              <span className="text-xl font-bold text-white leading-tight line-clamp-2 px-2">{partido.equipo_b}</span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center text-sm font-bold text-orange-400 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
            Ver Detalles <MoveRight size={12} className="ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Helper: relative date label
function getRelativeDate(fecha: string, includeTime = true) {
  const date = new Date(fecha);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  const time = date.toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' });

  if (diff === 0) return includeTime ? `Hoy, ${time}` : 'Hoy';
  if (diff === -1) return includeTime ? `Ayer, ${time}` : 'Ayer';
  if (diff === 1) return includeTime ? `Mañana, ${time}` : 'Mañana';
  return includeTime
    ? date.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString('es-CO', { day: 'numeric', month: 'short' });
}

function UpcomingMatchCard({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || 'Deporte';
  const genero = partido.genero || 'masculino';

  const generoBg = genero === 'femenino'
    ? 'bg-pink-500/15 border border-pink-400/20 backdrop-blur-md text-pink-400 shadow-[0_0_15px_currentColor]'
    : genero === 'mixto'
      ? 'bg-purple-500/15 border border-purple-400/20 backdrop-blur-md text-purple-400 shadow-[0_0_15px_currentColor]'
      : 'bg-blue-500/15 border border-blue-400/20 backdrop-blur-md text-blue-400 shadow-[0_0_15px_currentColor]';

  return (
    <Link href={`/partido/${partido.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#17130D] hover:bg-[#1f1911] shadow-sm transition-all duration-300 p-3 sm:p-4 hover:-translate-y-0.5">
        {/* Glowing Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />
        {/* Sport Icon Watermark */}
        <div className="absolute -bottom-3 -right-3 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">
          <SportIcon sport={sportName} size={70} className={cn("opacity-[0.12] group-hover:opacity-[0.20] transition-all duration-500", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        {/* Header: Sport icon on gender-colored bg + Date */}
        <div className="relative z-10 flex items-center justify-between mb-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", generoBg)}>
              <SportIcon sport={sportName} size={16} className="text-white" />
            </div>
            <span className="text-sm font-black text-white">
              {getRelativeDate(partido.fecha, true)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">Próximo</span>
        </div>

        {/* Teams */}
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">
              {partido.equipo_a.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-white truncate">{partido.equipo_a}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0">
              {partido.equipo_b.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-slate-400 truncate group-hover:text-white transition-colors">{partido.equipo_b}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ResultCard({ partido }: { partido: Partido }) {
  const sportName = partido.disciplinas?.name || 'Deporte';
  const { scoreA, scoreB } = getCurrentScore(sportName, partido.marcador_detalle || {});
  const winnerA = scoreA > scoreB;
  const isDraw = scoreA === scoreB;
  const genero = partido.genero || 'masculino';

  const generoBg = genero === 'femenino'
    ? 'bg-pink-500/15 border border-pink-400/20 backdrop-blur-md text-pink-400 shadow-[0_0_15px_currentColor]'
    : genero === 'mixto'
      ? 'bg-purple-500/15 border border-purple-400/20 backdrop-blur-md text-purple-400 shadow-[0_0_15px_currentColor]'
      : 'bg-blue-500/15 border border-blue-400/20 backdrop-blur-md text-blue-400 shadow-[0_0_15px_currentColor]';

  return (
    <Link href={`/partido/${partido.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#17130D] hover:bg-[#1f1911] shadow-sm transition-all duration-300 p-3 sm:p-4 hover:-translate-y-0.5">
        {/* Glowing Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${SPORT_GRADIENT[sportName]} opacity-30 group-hover:opacity-50 transition-opacity`} />
        {/* Sport Icon Watermark with sport color */}
        <div className="absolute -bottom-3 -right-3 pointer-events-none select-none group-hover:scale-110 transition-transform duration-500">
          <SportIcon sport={sportName} size={70} className={cn("opacity-[0.12] group-hover:opacity-[0.20] transition-all duration-500", SPORT_ACCENT[sportName] || 'text-white')} />
        </div>

        {/* Header: Sport icon on gender-colored bg + Date + Finalizado badge */}
        <div className="relative z-10 flex items-center justify-between mb-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", generoBg)}>
              <SportIcon sport={sportName} size={16} className="text-white" />
            </div>
            <span className="text-sm font-black text-white">
              {getRelativeDate(partido.fecha, false)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2.5 py-1 rounded-full uppercase tracking-wider">Finalizado</span>
        </div>

        {/* Teams */}
        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0")}>
                {partido.equipo_a.substring(0, 2).toUpperCase()}
              </div>
              <span className={cn("text-sm font-bold truncate", winnerA || isDraw ? "text-white" : "text-slate-500")}>
                {partido.equipo_a}
              </span>
            </div>
            <span className={cn("text-2xl font-black tabular-nums ml-3", winnerA ? "text-amber-400" : "text-slate-600")}>
              {scoreA}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 flex-shrink-0")}>
                {partido.equipo_b.substring(0, 2).toUpperCase()}
              </div>
              <span className={cn("text-sm font-bold truncate", !winnerA && scoreB > scoreA ? "text-white" : isDraw ? "text-white" : "text-slate-500")}>
                {partido.equipo_b}
              </span>
            </div>
            <span className={cn("text-2xl font-black tabular-nums ml-3", !winnerA && scoreB > scoreA ? "text-amber-400" : "text-slate-600")}>
              {scoreB}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
