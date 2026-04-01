import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui-primitives";
import { Award } from "lucide-react";

interface QuinielaPodiumProps {
  top3: any[];
}

export const QuinielaPodium = ({ top3 }: QuinielaPodiumProps) => {
  const podiumSlots = [
    { pos: 2, profile: top3[1], color: 'text-slate-300', trophy: '🥈', accent: 'bg-slate-500', glow: 'shadow-slate-500/20' },
    { pos: 1, profile: top3[0], color: 'text-yellow-400', trophy: '🥇', accent: 'bg-amber-500', glow: 'shadow-amber-500/40' },
    { pos: 3, profile: top3[2], color: 'text-orange-600', trophy: '🥉', accent: 'bg-orange-600', glow: 'shadow-orange-600/20' }
  ];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-6 pt-20 pb-12 px-2 relative min-h-[320px]">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-orange-500/10 to-transparent blur-3xl -z-10" />

      {podiumSlots.map((slot, idx) => {
        if (!slot.profile) return <div key={idx} className="flex-1 opacity-0" />;

        const isWinner = slot.pos === 1;
        const points = slot.profile.points || 0;

        return (
          <Link
            key={idx}
            href={`/perfil/${slot.profile.id}`}
            className={cn(
              "flex flex-col items-center flex-1 transition-all duration-1000 ease-out animate-in fade-in slide-in-from-bottom-12 group/p-item",
              isWinner ? "pb-8 scale-125 z-20" : "opacity-90 scale-100 z-10"
            )}
            style={{ animationDelay: `${idx * 200}ms` }}
          >
            <div className="relative mb-5 group">
              {isWinner && (
                <>
                  <div className="absolute -inset-4 border-2 border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute -inset-8 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Award className="text-amber-500 fill-amber-500/20 animate-bounce" size={24} />
                  </div>
                </>
              )}

              <div className="relative">
                <Avatar
                  name={slot.profile.display_name || slot.profile.email}
                  className={cn(
                    "shadow-2xl transition-all duration-500 border-2",
                    isWinner
                      ? "w-24 h-24 border-amber-400 group-hover:ring-4 ring-amber-400/20"
                      : "w-16 h-16 border-white/10 group-hover:border-white/30"
                  )}
                />
                <div className={cn(
                  "absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-2xl rotate-45 transform bg-zinc-950 border border-white/20",
                  slot.color
                )}>
                  <span className="-rotate-45">{slot.pos}</span>
                </div>
              </div>
            </div>

            <div className="text-center relative">
              <p className={cn(
                "text-[11px] font-black truncate max-w-[80px] uppercase tracking-wider mb-1 font-display group-hover/p-item:text-amber-400 transition-colors",
                isWinner ? "text-white" : "text-slate-400"
              )}>
                {slot.profile.display_name?.split(' ')[0] || "Invitado"}
              </p>
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-black font-sans flex items-center gap-1 shadow-lg",
                isWinner ? "bg-amber-500 text-black" : "bg-white/5 text-slate-300 border border-white/5"
              )}>
                {points} <span className="text-[8px] opacity-70">PTS</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
