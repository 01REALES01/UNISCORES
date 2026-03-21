"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Badge, Button, Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { MatchCardSkeleton, NewsListSkeleton } from "@/components/skeletons";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, MapPin, ChevronRight, Calendar, Zap, LayoutGrid, MoveRight, Search, TrendingUp, Tv, ArrowRight, Home as HomeIcon, UserIcon, Navigation2, Play, PlayCircle, LogOut, BarChart3, Shield, Newspaper, AlertCircle, RefreshCw, Star, Crown, Handshake } from "lucide-react";

const HeroSlider = dynamic(() => import('@/components/hero-slider').then(mod => mod.HeroSlider), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] md:h-[450px] rounded-3xl bg-white/5 animate-pulse mb-8" />
});

const SuggestiveSearch = dynamic(() => import('@/components/ui/suggestive-search'), {
  ssr: false,
  loading: () => <div className="h-12 w-full rounded-2xl bg-white/5 animate-pulse" />
});
const NewsListCard = dynamic(() => import('@/components/news-card').then(mod => mod.NewsListCard), {
  ssr: false,
  loading: () => <NewsListSkeleton />
});

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI, SPORT_GRADIENT, SPORT_ACCENT, SPORT_BORDER, SPORT_GLOW } from "@/lib/constants";
import { getCurrentScore } from "@/lib/sport-scoring";
import { getDisplayName, getCarreraName, getCarreraSubtitle } from "@/lib/sport-helpers";
import { SportIcon } from "@/components/sport-icons";
import { MainNavbar } from "@/components/main-navbar";
import { toast } from "sonner";
import { SplashScreen } from "@/components/splash-screen";
import { useMatches } from "@/hooks/use-matches";
import { WelcomeHero } from "@/components/welcome-hero";
import { useNews } from "@/hooks/use-news";
import { useFavoritos } from "@/hooks/use-favoritos";
import { useCarreras } from "@/hooks/use-carreras";
import { supabase } from "@/lib/supabase";

import type { PartidoWithRelations as Partido } from '@/modules/matches/types';
import { LiveMatchCard, UpcomingMatchCard, ResultCard } from '@/modules/matches/components/match-card';
import { MatchFilters } from '@/modules/matches/components/match-filters';
import { LiveMatchesSection } from '@/modules/matches/components/live-matches-section';
import { AboutFooter } from '@/shared/components/about-footer';



// Modern gradients for each sport - INTENSIFIED


export default function Home() {
  const { user, profile, isStaff, signOut } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isSelectingCareers, setIsSelectingCareers] = useState(false);
  const [selectedCareers, setSelectedCareers] = useState<number[]>([]);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // ─── SWR Hooks — cached, deduplicated, realtime-enabled ──────────────────
  const { matches: rawMatches, loading: matchesLoading } = useMatches();
  const { news: latestNews, loading: newsLoading } = useNews(4);
  const { favoriteIds, loading: favoritosLoading, mutate: mutateFavoritos } = useFavoritos(user?.id);
  const { carreras, loading: carrerasLoading } = useCarreras();
  const loading = matchesLoading || (activeFilter === 'favoritos' && favoritosLoading);

  const favoriteNames = useMemo(() => {
    return carreras
      .filter(c => favoriteIds.includes(c.id))
      .map(c => c.nombre);
  }, [carreras, favoriteIds]);

  const getSortScore = (p: Partido) => {
    if (p.estado === 'en_curso') return -10000000000;
    if (p.estado === 'programado') return new Date(p.fecha).getTime();
    return new Date(p.fecha).getTime() + 10000000000;
  };

  // Sort matches: live first, then programmed by date, then finished
  const partidos = useMemo(() => {
    return [...rawMatches].sort((a: Partido, b: Partido) => {
      return getSortScore(a) - getSortScore(b);
    });
  }, [rawMatches]);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers for scrolling to results when loading finished or hash changes
  useEffect(() => {
    if (!loading) {
      const handleHashScroll = () => {
        const hash = window.location.hash;
        if (hash === '#finalizados') {
          // Small delay to ensure the DOM has settled after loading state change
          setTimeout(() => {
            const el = document.getElementById('finalizados');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      };

      handleHashScroll();
      window.addEventListener('hashchange', handleHashScroll);
      return () => window.removeEventListener('hashchange', handleHashScroll);
    }
  }, [loading]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await signOut();
    router.push('/');
  };

  const toggleCareerSelection = (id: number) => {
    const numId = Number(id); // Ensure always a number, not a bigint string
    setSelectedCareers(prev => {
      if (prev.map(Number).includes(numId)) {
        return prev.filter(c => Number(c) !== numId);
      }
      if (prev.length >= 3) {
        setErrorModal({ show: true, message: "No se pueden seleccionar más de tres carreras." });
        return prev;
      }
      return [...prev, numId];
    });
  };

  const openSelectionMode = () => {
    setSelectedCareers(favoriteIds);
    setIsSelectingCareers(true);
  };

  const handleSaveCareers = async () => {
    // If we're on the empty state banner and they select nothing, error out
    if (selectedCareers.length === 0 && hideMatches) {
      setErrorModal({ show: true, message: "Debes escoger al menos una carrera." });
      return;
    }

    if (!user) {
      setErrorModal({ show: true, message: "Error interno: Usuario no autenticado." });
      return;
    }

    // Normalize IDs to numbers to avoid bigint-as-string type mismatch from Supabase
    const currentFavoriteNums = favoriteIds.map(Number);
    const selectedNums = selectedCareers.map(Number);

    const currentFavorites = new Set(currentFavoriteNums);
    const newFavorites = new Set(selectedNums);

    // Si ambos son cero, no hay cambios
    if (currentFavorites.size === 0 && newFavorites.size === 0) {
      setIsSelectingCareers(false);
      return;
    }

    const toAdd = selectedNums.filter(id => !currentFavorites.has(id));
    const toRemove = currentFavoriteNums.filter(id => !newFavorites.has(id));

    console.log('[Favoritos] currentFavorites:', currentFavoriteNums, '| newSelection:', selectedNums);
    console.log('[Favoritos] toAdd:', toAdd, '| toRemove:', toRemove);

    // Si las selecciones son idénticas, cerramos sin llamadas a db
    if (toAdd.length === 0 && toRemove.length === 0) {
      setIsSelectingCareers(false);
      return;
    }

    try {
      // 1. Borrar los que ya no están seleccionados
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_carreras_favoritas')
          .delete()
          .eq('user_id', user.id)
          .in('carrera_id', toRemove);

        if (deleteError) throw new Error(`Error BD (Delete): ${deleteError.message}`);
      }

      // 2. Insertar los nuevos
      if (toAdd.length > 0) {
        const inserts = toAdd.map(carreraId => ({
          user_id: user.id,
          carrera_id: carreraId
        }));

        console.log('[Favoritos] Inserting:', inserts);
        const { error: insertError } = await supabase
          .from('user_carreras_favoritas')
          .insert(inserts);

        if (insertError) throw new Error(`Error BD (Insert): ${insertError.message}`);
      }

      await mutateFavoritos();
      setIsSelectingCareers(false);
      toast.success("Tus preferencias fueron actualizadas", { className: "bg-[#17130D] text-amber-500 border border-amber-500/30" });
    } catch (error: any) {
      console.error('[Favoritos] Error saving careers:', error);
      toast.error(error.message || "Error al guardar carreras");
      setErrorModal({ show: true, message: error.message || "Ocurrió un error al guardar tus carreras." });
    }
  };

  const renderSelectionGrid = () => (
    <div className="w-full mt-4 animate-in fade-in zoom-in-95 duration-300 border-t border-white/5 pt-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="text-sm font-black text-amber-500 tracking-[0.1em] uppercase">Selecciona tus carreras</h4>
        <Button variant="ghost" size="sm" onClick={() => setIsSelectingCareers(false)} className="text-slate-400 hover:text-white h-8 text-xs">
          Cancelar
        </Button>
      </div>
      {carrerasLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 text-left p-1 mb-4 custom-scrollbar">
            {carreras.map(carrera => {
              const isSelected = selectedCareers.map(Number).includes(Number(carrera.id));
              return (
                <button
                  key={carrera.id}
                  onClick={(e) => {
                    e.stopPropagation(); // Evitar que el click cierre el div contenedor si tiene evento click
                    toggleCareerSelection(Number(carrera.id));
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 text-xs font-bold border p-3.5 rounded-xl transition-all w-full text-left relative overflow-hidden",
                    isSelected
                      ? "bg-amber-500/10 text-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                      : "bg-[#221c13] text-slate-300 border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-400"
                  )}
                >
                  <span className="truncate w-full z-10">{carrera.nombre}</span>
                  {isSelected && (
                    <div className="absolute top-0 right-0 p-1 bg-amber-500 rounded-bl-lg">
                      <Star size={10} className="text-[#17130D] fill-current" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2 border-t border-white/5">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveCareers();
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest px-6 shadow-[0_0_20px_rgba(245,158,11,0.2)] border-none"
            >
              Aceptar
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const filteredPartidos = partidos.filter(p => {
    // Sport filter
    if (activeFilter !== 'todos' && activeFilter !== 'favoritos' && p.disciplinas?.name !== activeFilter) return false;

    // Favoritos filter — always compare by CARRERA (not athlete name)
    if (activeFilter === 'favoritos' && favoriteNames.length > 0) {
      const carA = getCarreraName(p, 'a');
      const carB = getCarreraName(p, 'b');
      if (!favoriteNames.includes(carA) && !favoriteNames.includes(carB)) {
        return false;
      }
    }

    // Search filter — search by display name AND carrera
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const dispA = getDisplayName(p, 'a');
      const dispB = getDisplayName(p, 'b');
      const carA = getCarreraName(p, 'a');
      const carB = getCarreraName(p, 'b');
      return dispA.toLowerCase().includes(q) || dispB.toLowerCase().includes(q) || carA.toLowerCase().includes(q) || carB.toLowerCase().includes(q) || p.disciplinas?.name.toLowerCase().includes(q);
    }
    return true;
  });

  const showLoginPrompt = activeFilter === 'favoritos' && !user;
  const showEmptyFavoritesPrompt = activeFilter === 'favoritos' && user && favoriteIds.length === 0;
  const hideMatches = showLoginPrompt || showEmptyFavoritesPrompt;

  const filteredNews = latestNews.filter(news => {
    if (activeFilter === 'favoritos' && favoriteNames.length > 0) {
      return news.carrera && favoriteNames.includes(news.carrera);
    }
    return true; // Si es 'todos' u otro filtro, mostramos todas. (O se podría filtrar por deporte si las noticias tuvieran disciplina)
  });

  const allSports = ['Fútbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];
  const liveMatches = filteredPartidos.filter(p => p.estado === 'en_curso');
  const upcomingMatches = filteredPartidos.filter(p => p.estado === 'programado');
  const finishedMatches = filteredPartidos.filter(p => p.estado === 'finalizado'); // We'll reverse logic in render for recent finished

  // Reverse finished matches to show most recent first
  const recentFinished = [...finishedMatches].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="min-h-screen bg-[#0a0816] text-white font-sans selection:bg-indigo-500/30">
      {/* Splash Screen - Solo se muestra 1 vez */}
      <SplashScreen />
      {/* Ambient Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header / Navbar */}
      <MainNavbar user={user} profile={profile} isStaff={isStaff} />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-24 space-y-10">

        {/* Hero / Filter Section */}
        <div className="flex flex-col gap-6">
          {/* Hero Section */}
          <WelcomeHero />

          <div className="relative">
            <SuggestiveSearch
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={["Buscar equipo...", "Explorar fútbol...", "Deportes Uninorte...", "Resultados de tenis...", "Natación..."]}
              className="h-12 rounded-2xl bg-[#1a1625] border border-white/10 focus-within:border-indigo-500/50 focus-within:bg-[#1f1b2e] focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-sm w-full"
            />
          </div>

          <MatchFilters
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            matches={partidos}
          />
        </div>

        {/* Resto del contenido */}
        {hideMatches ? (
          <div className="relative rounded-[2rem] overflow-hidden border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] group my-8 bg-[#17130D] animate-in slide-in-from-bottom-8 fade-in duration-700">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-transparent" />

            <div className="relative z-10 flex flex-col items-center justify-center p-10 text-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/10 to-orange-600/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] overflow-hidden">
                <Star size={40} className="text-amber-500 drop-shadow-[0_0_12px_currentColor]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">CARRERAS FAVORITAS</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  {showLoginPrompt
                    ? "Ingresa a tu cuenta o regístrate para escoger hasta tres carreras favoritas."
                    : "Aún no has seleccionado ninguna carrera. Escoge hasta tres carreras para seguir sus resultados de cerca."}
                </p>
              </div>

              {isSelectingCareers && !showLoginPrompt ? (
                renderSelectionGrid()
              ) : (
                <Link
                  href={showLoginPrompt ? "/login" : "#"}
                  onClick={(e) => {
                    if (!showLoginPrompt) {
                      e.preventDefault();
                      openSelectionMode();
                    }
                  }}
                  className="w-full md:w-auto mt-2"
                >
                  <Button className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-[0.2em] px-8 py-6 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transform group-hover:scale-105 transition-all outline-none border-none">
                    {showLoginPrompt ? "Ingresar a mi cuenta" : "Escoger Carreras"} <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-8">
            {/* Live / Featured Slider */}
            {(() => {
              const sliderMatches = activeFilter === 'todos'
                ? partidos
                : activeFilter === 'favoritos'
                  ? filteredPartidos
                  : partidos.filter(m => m.disciplinas?.name === activeFilter);

              const hasLive = sliderMatches.some(m => m.estado === 'en_curso');
              const hasProgrammed = sliderMatches.some(m => m.estado === 'programado');

              return (
                <div className="space-y-4">
                  {/* Sin encabezado en favoritos */}
                  {activeFilter !== 'favoritos' && (
                    <div className="flex items-center gap-3 px-2">
                      {hasLive ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                          <h2 className="text-sm font-black text-white uppercase tracking-widest">En Curso ahora</h2>
                        </>
                      ) : hasProgrammed ? (
                        <>
                          <Calendar size={14} className="text-orange-400" />
                          <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest">Próximos Partidos</h2>
                        </>
                      ) : (
                        <>
                          <Zap size={14} className="text-amber-500" />
                          <h2 className="text-sm font-black text-amber-500/80 uppercase tracking-widest">Próximamente</h2>
                        </>
                      )}
                    </div>
                  )}
                  <HeroSlider matches={activeFilter === 'favoritos' ? filteredPartidos : partidos} activeFilter={activeFilter} />
                </div>
              );
            })()}

            {/* QUINIELA CTA BANNER */}
            <div className="relative rounded-[2rem] overflow-hidden border border-red-600/30 shadow-[0_0_40px_rgba(220,38,38,0.15)] group cursor-pointer mb-8 bg-[#120e08]">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                    <TrendingUp size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight uppercase">ACIERTA Y GANA</h3>
                    <p className="text-orange-200/60 text-sm font-medium">Lidera el tablero y gana premios exclusivos.</p>
                  </div>
                </div>

                <Link href="/quiniela" className="w-full md:w-auto">
                  <Button className="w-full md:w-auto bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-black uppercase tracking-[0.2em] px-8 py-6 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] transform group-hover:scale-105 transition-all outline-none border-none">
                    Jugar Ahora <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* MANEJA TUS PREFERENCIAS (Only visible when activeFilter is 'favoritos' and user has favorites selected) */}
            {activeFilter === 'favoritos' && !hideMatches && (
              <div
                className={cn(
                  "relative rounded-[2rem] overflow-hidden border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] group mb-8 bg-[#17130D] transition-all",
                  isSelectingCareers ? "cursor-default" : "cursor-pointer hover:border-amber-500/50"
                )}
                onClick={() => {
                  if (!isSelectingCareers) {
                    openSelectionMode();
                  }
                }}
              >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-transparent" />

                <div className="relative z-10 flex flex-col items-center justify-between p-6 md:p-8 gap-6">
                  <div className="flex flex-col md:flex-row items-center gap-6 w-full md:justify-between">
                    <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/10 to-orange-600/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] overflow-hidden shrink-0">
                        <Star size={32} className="text-amber-500 drop-shadow-[0_0_12px_currentColor]" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-1 tracking-tight">MANEJA TUS PREFERENCIAS</h3>
                        <p className="text-amber-200/60 text-sm font-medium">Modifica o elimina tus carreras favoritas.</p>
                      </div>
                    </div>

                    {!isSelectingCareers && (
                      <Button className="w-full md:w-auto bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 font-black uppercase tracking-widest px-6 rounded-2xl border-none">
                        Modificar
                      </Button>
                    )}
                  </div>

                  {isSelectingCareers && (
                    <div className="w-full" onClick={(e) => e.stopPropagation()}>
                      {renderSelectionGrid()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Section */}
        {!hideMatches && liveMatches.length > 0 && (
          <LiveMatchesSection matches={liveMatches} />
        )}

        {/* ÚLTIMAS NOTICIAS */}
        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="text-xl font-black text-white tracking-widest flex items-center gap-2 uppercase">
              <Newspaper className="text-red-500" size={24} />
              Últimas Noticias
            </h2>
            <Link href="/noticias">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-red-500 hover:bg-red-500/10 uppercase tracking-[0.2em] text-[10px] font-black transition-all">
                Ver Todas <ChevronRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>

          {loading || newsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => <NewsListSkeleton key={i} />)}
            </div>
          ) : filteredNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
              {filteredNews.map(noticia => (
                <NewsListCard key={noticia.id} noticia={noticia} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-[#17130D]/50 border border-white/5 rounded-2xl">
              <p className="text-sm text-white/30 font-bold uppercase tracking-widest">
                {activeFilter === 'favoritos' ? 'No hay noticias recientes para tus carreras' : 'No hay noticias publicadas aún'}
              </p>
            </div>
          )}
        </section>

        {/* Loading Skeleton */}
        {!hideMatches && loading && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map(i => <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse" />)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          </div>
        )}

        {/* Custom Error Modal */}
        {errorModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setErrorModal({ show: false, message: "" })}
            />
            <div className="relative bg-[#17130D] border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)] rounded-3xl p-6 md:p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
              <button
                onClick={() => setErrorModal({ show: false, message: "" })}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <div className="text-xl leading-none">&times;</div>
              </button>

              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertCircle size={32} className="text-red-500" />
              </div>

              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Atención</h3>
              <p className="text-slate-300 text-sm font-medium">{errorModal.message}</p>

              <Button
                onClick={() => setErrorModal({ show: false, message: "" })}
                className="w-full mt-6 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest border-none"
              >
                Entendido
              </Button>
            </div>
          </div>
        )}
        
        <AboutFooter />
      </main>
    </div >
  );
}


