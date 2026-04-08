"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { Badge, Button, Avatar } from "@/components/ui-primitives";
import { PublicLiveTimer } from "@/components/public-live-timer";
import { MatchCardSkeleton, NewsListSkeleton } from "@/components/skeletons";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, MapPin, ChevronRight, Calendar, Zap, LayoutGrid, MoveRight, Search, TrendingUp, Tv, ArrowRight, Home as HomeIcon, UserIcon, Navigation2, Play, PlayCircle, LogOut, BarChart3, Shield, Newspaper, AlertCircle, RefreshCw, Star, Crown, Handshake } from "lucide-react";

const HeroSlider = dynamic(() => import('@/components/hero-slider').then(mod => mod.HeroSlider), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] md:h-[450px] rounded-[2rem] bg-white/5 backdrop-blur-md animate-pulse mb-8" />
});

const SuggestiveSearch = dynamic(() => import('@/components/ui/suggestive-search'), {
  ssr: false,
  loading: () => <div className="h-12 w-full rounded-2xl bg-white/5 backdrop-blur-md animate-pulse" />
});
const NewsListCard = dynamic(() => import('@/components/news-card').then(mod => mod.NewsListCard), {
  ssr: false,
  loading: () => <NewsListSkeleton />
});

const NewsCompactHero = dynamic(() => import('@/components/news-card').then(mod => mod.NewsCompactHero), {
  ssr: false,
  loading: () => <NewsListSkeleton />
});

const NewsGridCard = dynamic(() => import('@/components/news-card').then(mod => mod.NewsGridCard), {
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
import { LiveMatchCard, UpcomingMatchCard, ResultCard, JornadaCard } from '@/modules/matches/components/match-card';
import { MatchFilters } from '@/modules/matches/components/match-filters';
import { useJornadas } from '@/hooks/use-jornadas';
import { LiveMatchesSection } from '@/modules/matches/components/live-matches-section';
import { AboutFooter } from '@/shared/components/about-footer';
import { InstitutionalBanner } from '@/shared/components/institutional-banner';

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
  const { jornadas } = useJornadas();
  const { news: latestNews, loading: newsLoading } = useNews(2);
  const { favoriteIds, loading: favoritosLoading, mutate: mutateFavoritos } = useFavoritos(user?.id);
  const { carreras, loading: carrerasLoading } = useCarreras();

  // delegaciones: nombre → Set<carrera_id> — used for ID-based favorites filtering in team sports
  const { data: delegacionesData } = useSWR('delegaciones:carrera_ids', async () => {
    const { data } = await supabase.from('delegaciones').select('nombre, carrera_ids');
    return data ?? [];
  }, { revalidateOnFocus: false, dedupingInterval: 300000 });

  const delegacionCarreraMap = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const map = new Map<string, Set<number>>();
    for (const d of delegacionesData ?? []) {
      if (d.nombre && Array.isArray(d.carrera_ids)) {
        map.set(norm(d.nombre), new Set((d.carrera_ids as number[]).map(Number)));
      }
    }
    return map;
  }, [delegacionesData]);
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

    if (currentFavorites.size === 0 && newFavorites.size === 0) {
      setIsSelectingCareers(false);
      return;
    }

    const toAdd = selectedNums.filter(id => !currentFavorites.has(id));
    const toRemove = currentFavoriteNums.filter(id => !newFavorites.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      setIsSelectingCareers(false);
      return;
    }

    try {
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_carreras_favoritas')
          .delete()
          .eq('user_id', user.id)
          .in('carrera_id', toRemove);

        if (deleteError) throw new Error(`Error BD (Delete): ${deleteError.message}`);
      }

      if (toAdd.length > 0) {
        const inserts = toAdd.map(carreraId => ({
          user_id: user.id,
          carrera_id: carreraId
        }));

        const { error: insertError } = await supabase
          .from('user_carreras_favoritas')
          .insert(inserts);

        if (insertError) throw new Error(`Error BD (Insert): ${insertError.message}`);
      }

      await mutateFavoritos();
      setIsSelectingCareers(false);
      toast.success("Tus preferencias fueron actualizadas", { className: "bg-background text-emerald-500 border border-emerald-500/30 font-medium" });
    } catch (error: any) {
      console.error('[Favoritos] Error saving careers:', error);
      toast.error(error.message || "Error al guardar carreras");
      setErrorModal({ show: true, message: error.message || "Ocurrió un error al guardar tus carreras." });
    }
  };

  const renderSelectionGrid = () => (
    <div className="w-full mt-4 animate-in fade-in zoom-in-95 duration-300 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="text-sm font-black text-violet-400 tracking-[0.1em] uppercase">Selecciona tus carreras</h4>
        <Button variant="ghost" size="sm" onClick={() => setIsSelectingCareers(false)} className="text-slate-400 hover:text-white h-8 text-xs hover:bg-white/10">
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
                    e.stopPropagation();
                    toggleCareerSelection(Number(carrera.id));
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 text-xs font-bold border p-3.5 rounded-xl transition-all w-full text-left relative overflow-hidden group",
                    isSelected
                      ? "bg-violet-600/20 text-violet-300 border-violet-500/50 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                      : "bg-black/20 text-slate-300 border-white/5 hover:border-violet-500/30 hover:bg-violet-600/10 hover:text-violet-300"
                  )}
                >
                  <span className="truncate w-full z-10">{carrera.nombre}</span>
                  {isSelected && (
                    <div className="absolute top-0 right-0 p-1 bg-violet-600 rounded-bl-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/FavoritosIcono.png" alt="" className="w-2 h-2 object-contain" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2 border-t border-white/10">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveCareers();
              }}
              className="bg-white hover:bg-[#F5F5DC] text-violet-900 font-black uppercase tracking-widest px-6 shadow-md border-none transition-all"
            >
              Aceptar
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const filteredPartidos = partidos.filter(p => {
    if (activeFilter !== 'todos' && activeFilter !== 'favoritos' && p.disciplinas?.name !== activeFilter) return false;
    if (activeFilter === 'favoritos' && favoriteIds.length > 0) {
      const favSet = new Set(favoriteIds);
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Individual sports: carrera_a_id set directly on the match
      const idA = p.carrera_a_id != null ? Number(p.carrera_a_id) : null;
      const idB = p.carrera_b_id != null ? Number(p.carrera_b_id) : null;
      if ((idA !== null && favSet.has(idA)) || (idB !== null && favSet.has(idB))) return true;

      // Team sports: look up carrera_ids from the delegaciones map by team name
      const idsA = delegacionCarreraMap.get(norm(p.equipo_a || ''));
      const idsB = delegacionCarreraMap.get(norm(p.equipo_b || ''));
      if (idsA && [...idsA].some(id => favSet.has(id))) return true;
      if (idsB && [...idsB].some(id => favSet.has(id))) return true;

      return false;
    }
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

  const filteredJornadas = jornadas.filter(j => {
    const sportName = (j.disciplinas as any)?.name ?? '';
    if (activeFilter !== 'todos' && activeFilter !== 'favoritos' && sportName !== activeFilter) return false;
    if (activeFilter === 'favoritos' && favoriteNames.length > 0) {
      const jornadaCarreras = (j.jornada_resultados ?? []).map((r: any) => (r.carreras as any)?.nombre).filter(Boolean);
      if (!jornadaCarreras.some((c: string) => favoriteNames.includes(c))) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return sportName.toLowerCase().includes(q) || (j.nombre ?? '').toLowerCase().includes(q);
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
    return true;
  });

  // In favorites mode: 5 closest non-finished matches across all sports
  const displayPartidos = useMemo(() => {
    if (activeFilter !== 'favoritos') return filteredPartidos;

    const live     = filteredPartidos.filter(p => p.estado === 'en_curso');
    const upcoming = [...filteredPartidos.filter(p => p.estado === 'programado')]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    return [...live, ...upcoming].slice(0, 5);
  }, [filteredPartidos, activeFilter]);

  const liveMatches = displayPartidos.filter(p => p.estado === 'en_curso');
  const upcomingMatches = displayPartidos.filter(p => p.estado === 'programado');
  const finishedMatches = displayPartidos.filter(p => p.estado === 'finalizado');
  const recentFinished = [...finishedMatches].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-violet-500/30">
      <SplashScreen />


      <MainNavbar user={user} profile={profile} isStaff={isStaff} />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-24 space-y-10">

        <div className="flex flex-col gap-6">
          <WelcomeHero />

          <div className="relative">
            <SuggestiveSearch
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={["Buscar equipo...", "Explorar fútbol...", "Deportes Uninorte...", "Resultados de tenis...", "Natación..."]}
              className="h-12 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 focus-within:border-violet-500/50 focus-within:bg-black/20 focus-within:ring-4 focus-within:ring-violet-500/20 transition-all w-full text-white placeholder-white/50"
            />
          </div>

          <MatchFilters
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            matches={partidos}
          />
        </div>

        {hideMatches ? (
          <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-xl group my-8 bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl animate-in slide-in-from-bottom-8 fade-in duration-700">
            <div className="absolute inset-0 bg-background mix-blend-overlay opacity-30" />

            <div className="relative z-10 flex flex-col items-center justify-center p-10 text-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden backdrop-blur-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/FavoritosIcono.png" alt="Favoritos" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Carreras favoritas</h3>
                <p className="text-white/60 text-sm max-w-md mx-auto">
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
                  className="w-full md:w-auto mt-2 block"
                >
                  <Button className="w-full md:w-auto bg-white hover:bg-[#F5F5DC] text-violet-900 font-black uppercase tracking-widest px-8 py-6 rounded-2xl shadow-lg transform hover:-translate-y-1 transition-all outline-none border-none">
                    {showLoginPrompt ? "Ingresar a mi cuenta" : "Escoger Carreras"} <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-8">
            {(() => {
              const sliderMatches = activeFilter === 'todos'
                ? partidos
                : activeFilter === 'favoritos'
                  ? filteredPartidos
                  : partidos.filter(m => m.disciplinas?.name === activeFilter);

              return (
                <div>
                  <HeroSlider matches={activeFilter === 'favoritos' ? displayPartidos : partidos} activeFilter={activeFilter} />
                </div>
              );
            })()}

            {/* QUINIELA CTA BANNER - HYBRID */}
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group cursor-pointer mb-8 bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl">
              <div className="absolute inset-0 bg-background mix-blend-overlay opacity-50" />
              {/* Emerald Accent Lighting */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center text-emerald-400 shadow-md backdrop-blur-sm">
                    <TrendingUp size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-1 tracking-tight">Acierta y gana</h3>
                    <p className="font-display text-white/60 text-sm font-medium">Lidera el tablero y gana premios exclusivos.</p>
                  </div>
                </div>

                <Link href="/quiniela" className="w-full md:w-auto block">
                  <Button className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest px-8 py-6 rounded-2xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transform hover:scale-105 transition-all outline-none border-none">
                    Jugar Ahora <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* MANEJA TUS PREFERENCIAS */}
            {activeFilter === 'favoritos' && !hideMatches && (
              <div
                className={cn(
                  "relative rounded-[2rem] overflow-hidden border border-white/10 shadow-xl group mb-8 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl transition-all",
                  isSelectingCareers ? "cursor-default border-violet-500/30" : "cursor-pointer hover:border-violet-500/30"
                )}
                onClick={() => {
                  if (!isSelectingCareers) {
                    openSelectionMode();
                  }
                }}
              >
                <div className="absolute inset-0 bg-background mix-blend-overlay opacity-60 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center justify-between p-6 md:p-8 gap-6">
                  <div className="flex flex-col md:flex-row items-center gap-6 w-full md:justify-between">
                    <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
                      <div className="w-16 h-16 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center shadow-md backdrop-blur-sm shrink-0">
                        <Star size={32} className="text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white mb-1 tracking-tight">Maneja tus preferencias</h3>
                        <p className="text-white/50 text-sm font-medium">Modifica o elimina tus carreras favoritas.</p>
                      </div>
                    </div>

                    {!isSelectingCareers && (
                      <Button className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest px-6 rounded-xl border border-white/10 backdrop-blur-sm transition-all">
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

        {!hideMatches && liveMatches.length > 0 && (
          <LiveMatchesSection matches={liveMatches} />
        )}

        {/* ━━━ JORNADAS (Ajedrez / Tenis de Mesa) ━━━ */}
        {!hideMatches && filteredJornadas.length > 0 && (
          <section className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">
              Jornadas · Deportes Individuales
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredJornadas.map(j => (
                <JornadaCard key={j.id} jornada={j} />
              ))}
            </div>
          </section>
        )}

        {/* ━━━ INSTITUTIONAL BRAND BREAK ━━━ */}
        <div className="mt-8 mb-20 relative z-0">
          <InstitutionalBanner />
        </div>

        {/* ÚLTIMAS NOTICIAS - HYBRID */}
        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000 bg-white/[0.12] rounded-3xl p-6 border border-white/10">
          <div className="flex flex-col gap-1 mb-8 px-1">
            <p className="font-display text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-[0.3em]">
              Últimas del campus
            </p>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
                Noticias
              </h2>
              <Link href="/noticias">
                <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/10 uppercase tracking-widest text-[10px] font-bold transition-all border border-white/5 rounded-xl">
                  Ver Todas <ChevronRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {loading || newsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {[1, 2].map(i => <NewsListSkeleton key={i} />)}
            </div>
          ) : filteredNews.length > 0 ? (
            <div className={cn(
              "relative z-10 grid gap-4 sm:gap-6",
              filteredNews.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
              {filteredNews.length === 1 ? (
                <NewsCompactHero noticia={filteredNews[0]} />
              ) : (
                filteredNews.map(noticia => (
                  <NewsGridCard key={noticia.id} noticia={noticia} />
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-black/20 border border-white/5 rounded-2xl relative z-10 backdrop-blur-sm">
              <p className="text-sm text-white/40 font-bold uppercase tracking-widest">
                {activeFilter === 'favoritos' ? 'No hay noticias recientes para tus carreras' : 'No hay noticias publicadas aún'}
              </p>
            </div>
          )}
        </section>

        {!hideMatches && loading && (
          <div className="space-y-8 relative z-10">
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map(i => <div key={i} className="h-48 rounded-[2rem] bg-white/5 backdrop-blur-sm animate-pulse border border-white/5" />)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-white/5 backdrop-blur-sm animate-pulse border border-white/5" />)}
            </div>
          </div>
        )}

        {/* Custom Error Modal - Cleaned up to match Institutional Theme */}
        {errorModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setErrorModal({ show: false, message: "" })}
            />
            <div className="relative bg-background border border-rose-500/30 shadow-xl rounded-3xl p-6 md:p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
              <button
                onClick={() => setErrorModal({ show: false, message: "" })}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                aria-label="Cerrar modal"
              >
                <div className="text-xl leading-none">&times;</div>
              </button>

              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <AlertCircle size={32} className="text-rose-500" />
              </div>

              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Atención</h3>
              <p className="text-slate-300 text-sm font-medium">{errorModal.message}</p>

              <Button
                onClick={() => setErrorModal({ show: false, message: "" })}
                className="w-full mt-6 bg-white hover:bg-rose-50 text-rose-600 font-black uppercase tracking-widest border-none transition-colors"
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
