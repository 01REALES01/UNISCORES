import { Avatar } from "@/components/ui-primitives";
import { Sparkles, Trophy } from "lucide-react";

interface QuinielaHeaderProps {
  user: any;
  profile: any;
  /** Puntos históricos (todas las semanas). */
  totalPoints: number;
  /** Puntos de la semana del ranking (lun 00:00 – lun 00:00, hora Colombia). */
  weeklyPoints: number;
}

export const QuinielaHeader = ({ user, profile, totalPoints, weeklyPoints }: QuinielaHeaderProps) => {
  return (
    <div className="space-y-5 py-6 px-1">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative group shrink-0">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400/50 to-amber-600/50 blur-md opacity-50 transition group-hover:opacity-80" />
          <Avatar name={profile?.full_name || user?.email} src={profile?.avatar_url} size="lg" className="relative border-2 border-zinc-950 ring-1 ring-white/10 shadow-xl scale-110" />
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-zinc-950 bg-emerald-500 shadow-lg">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Hola</p>
          <p className="truncate font-sans text-2xl font-bold tracking-tight text-white">
            {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Usuario"}
          </p>
        </div>
      </div>

      {/* Una sola tarjeta glass: dos métricas simétricas, sin cajas anidadas */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/50 shadow-xl shadow-black/40 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]" />

        <div className="relative grid gap-8 p-6 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-white/[0.06]">
          <section className="flex flex-col gap-4 sm:pr-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
                <Trophy className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Total acumulado</h2>
                <p className="mt-0.5 max-w-[220px] text-[11px] leading-snug text-white/35">
                  Todos tus puntos en Acierta y Gana; se mantienen entre semanas.
                </p>
              </div>
            </div>
            <p className="text-5xl font-bold tabular-nums tracking-tight text-white sm:text-[3.25rem]">{totalPoints}</p>
          </section>

          <section className="flex flex-col gap-4 sm:pl-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
                <Sparkles className="h-5 w-5 text-amber-400/90" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Ranking esta semana</h2>
                <p className="mt-0.5 text-[11px] leading-snug text-white/35">Lun 00:00 → lun 00:00 · hora Colombia</p>
              </div>
            </div>
            <p className="text-5xl font-bold tabular-nums tracking-tight text-white sm:text-[3.25rem]">{weeklyPoints}</p>
          </section>
        </div>
      </div>
    </div>
  );
};
