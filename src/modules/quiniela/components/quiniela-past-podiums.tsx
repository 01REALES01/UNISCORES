"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { formatQuinielaWeekRangeEs, formatQuinielaWeekChipEs } from "@/modules/quiniela/lib/week-label";

export type QuinielaPodiumEntry = {
  place: number;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  weekly_points: number;
  points: number;
};

export type QuinielaPodiumWeek = {
  week_start: string;
  week_end: string;
  podium: QuinielaPodiumEntry[] | null;
};

interface QuinielaPastPodiumsProps {
  weeks: QuinielaPodiumWeek[];
}

const MEDAL = ["🥇", "🥈", "🥉"] as const;

export function QuinielaPastPodiums({ weeks }: QuinielaPastPodiumsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const sortedWeeks = useMemo(() => {
    return [...weeks]
      .filter((w) => Array.isArray(w.podium) && w.podium.length > 0)
      .sort(
        (a, b) =>
          new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
      );
  }, [weeks]);

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (sortedWeeks.length === 0) {
      if (activeIdx !== 0) setActiveIdx(0);
      return;
    }
    if (activeIdx >= sortedWeeks.length) {
      setActiveIdx(0);
    }
  }, [sortedWeeks.length, activeIdx]);

  useEffect(() => {
    const el = btnRefs.current[activeIdx];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeIdx, sortedWeeks.length]);

  const goPrev = () => {
    setActiveIdx((i) => (sortedWeeks.length ? Math.max(0, i - 1) : 0));
  };
  const goNext = () => {
    setActiveIdx((i) =>
      sortedWeeks.length ? Math.min(sortedWeeks.length - 1, i + 1) : 0
    );
  };

  const activeWeek = sortedWeeks[activeIdx] ?? null;
  const top =
    activeWeek && Array.isArray(activeWeek.podium) ? activeWeek.podium : [];

  if (sortedWeeks.length === 0) {
    return (
      <section
        className="overflow-hidden rounded-2xl border border-dashed border-amber-500/25 bg-gradient-to-b from-amber-500/[0.07] to-transparent"
        aria-labelledby="past-podiums-heading"
      >
        <div className="px-4 py-4 text-center sm:px-5 sm:py-5">
          <Crown
            className="mx-auto mb-2.5 h-7 w-7 text-amber-400/80"
            aria-hidden
          />
          <h2
            id="past-podiums-heading"
            className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400/95"
          >
            Podios de semanas pasadas
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Acá se guardan el top 3 de cada semana <strong className="text-white/80">ya cerrada</strong> (lun–dom,
            Colombia), para ver quién lideró aunque el ranking actual haya reiniciado.
          </p>
          <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-left text-[10px] font-medium leading-relaxed text-white/45">
            <span className="font-black text-violet-300/90">Supabase:</span> aplica la migración{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-[9px] text-amber-200/90">20260420120000_quiniela_weekly_podium</code>{" "}
            (o <code className="text-[9px]">supabase db push</code>). Al abrir <strong className="text-white/60">Ranking</strong> se
            genera el snapshot de semanas cerradas; con pronósticos puntuados ya verás las semanas arriba.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="past-podiums-title">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <Crown className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <h2
            id="past-podiums-title"
            className="min-w-0 text-[11px] font-black uppercase tracking-[0.2em] text-amber-400/90"
          >
            Semanas anteriores
          </h2>
        </div>
        <p className="text-[9px] font-bold tabular-nums text-white/40" aria-live="polite">
          {activeIdx + 1} / {sortedWeeks.length}
        </p>
      </div>

      <p className="px-0.5 text-[10px] font-medium leading-relaxed text-white/50 sm:text-[11px]">
        Tocá una semana o usá las flechas en el móvil; abajo se muestra el top 3 fijado de esa semana.
      </p>

      <div className="relative -mx-1 sm:mx-0">
        <div className="flex items-stretch justify-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIdx <= 0}
            className="flex h-12 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/80 transition-colors active:scale-[0.98] sm:h-[52px] sm:w-11 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={scrollRef}
            className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Elegir semana del podio"
          >
            {sortedWeeks.map((w, idx) => {
              const short =
                w.week_start && w.week_end
                  ? formatQuinielaWeekChipEs(w.week_start, w.week_end)
                  : "Semana";
              const isActive = idx === activeIdx;
              return (
                <button
                  key={w.week_start}
                  type="button"
                  ref={(el) => {
                    btnRefs.current[idx] = el;
                  }}
                  role="tab"
                  id={`week-podium-tab-${idx}`}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  aria-controls="past-podium-panel"
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "snap-center min-h-[48px] w-[min(9.5rem,42vw)] shrink-0 touch-manipulation rounded-2xl border-2 px-2.5 py-2 text-center transition-all active:scale-[0.99] sm:min-h-[52px] sm:w-auto sm:min-w-[7.25rem] sm:px-4",
                    isActive
                      ? "border-amber-400/90 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "border-white/12 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white/85"
                  )}
                >
                  <span className="block text-[7px] font-black uppercase tracking-widest text-white/40 sm:text-[8px]">
                    Top 3
                  </span>
                  <span className="mt-0.5 block line-clamp-1 text-[11px] font-bold leading-tight text-white/95 sm:text-sm">
                    {short}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={activeIdx >= sortedWeeks.length - 1}
            className="flex h-12 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/80 transition-colors active:scale-[0.98] sm:h-[52px] sm:w-11 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {activeWeek && top.length > 0 && (
        <div
          id="past-podium-panel"
          role="tabpanel"
          aria-labelledby={`week-podium-tab-${activeIdx}`}
          className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent"
        >
          <div className="flex items-start gap-2 border-b border-white/10 bg-black/25 px-3 py-2.5 sm:px-4">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/40">
                Podio fijado
              </p>
              <p className="text-[10px] font-bold leading-snug text-white/75 sm:text-xs">
                {formatQuinielaWeekRangeEs(activeWeek.week_start, activeWeek.week_end)} ·{" "}
                <span className="text-amber-400/90">Colombia</span>
              </p>
            </div>
          </div>
          <div
            className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4"
            aria-live="polite"
          >
            {top
              .slice()
              .sort((a, b) => a.place - b.place)
              .map((p) => {
                const idx = Math.min(Math.max(p.place, 1), 3) - 1;
                return (
                  <Link
                    key={`${activeWeek.week_start}-${p.id}`}
                    href={`/perfil/${p.id}`}
                    className="flex min-h-[44px] min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.04] p-2.5 text-center transition-colors active:scale-[0.99] hover:border-amber-500/35"
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {MEDAL[idx] ?? "·"}
                    </span>
                    <Avatar
                      name={p.display_name || "?"}
                      src={p.avatar_url}
                      className="h-12 w-12 border border-white/10 sm:h-14 sm:w-14"
                    />
                    <p
                      className="w-full truncate text-[10px] font-bold leading-tight text-white/85"
                      title={p.display_name || undefined}
                    >
                      {p.display_name?.split(" ")[0] || "—"}
                    </p>
                    <p className="text-[8px] font-black tabular-nums text-amber-400/90">
                      {p.weekly_points} pts semana
                    </p>
                    <span className="text-[7px] font-bold uppercase text-white/35">Total {p.points} pts</span>
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </section>
  );
}
