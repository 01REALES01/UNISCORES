import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, Badge } from "@/components/ui-primitives";
import { Star } from "lucide-react";

interface QuinielaRankingItemProps {
  profile: any;
  rank: number;
  isMe: boolean;
}

export const QuinielaRankingItem = ({ profile, rank, isMe }: QuinielaRankingItemProps) => {
  return (
    <Link
      href={`/perfil/${profile.id}`}
      className={cn(
        "group relative flex items-center justify-between p-4 mb-3 rounded-3xl transition-all duration-500 overflow-hidden",
        isMe
          ? "bg-amber-500/10 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/20"
          : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/[0.01] pointer-events-none" />

      <div className="flex items-center gap-5 relative z-10">
        <div className="w-8 flex justify-center">
          <span className={cn(
            "text-lg font-black font-outfit italic",
            rank <= 3 ? "text-amber-500/50" : "text-white/10"
          )}>
            #{rank}
          </span>
        </div>

        <div className="relative">
          <Avatar
            name={profile.display_name || profile.email}
            className="w-12 h-12 border border-white/10 group-hover:scale-110 transition-transform duration-500"
          />
          {isMe && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-zinc-950 flex items-center justify-center">
              <Star size={8} className="text-black fill-current" />
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="font-black text-sm text-white flex items-center gap-2 font-outfit group-hover:text-red-500 transition-colors">
            {profile.display_name || "Usuario"}
            {isMe && <Badge className="bg-amber-400 text-black border-0 text-[8px] font-black h-4 px-1.5 rounded-md">TÚ</Badge>}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] truncate max-w-[140px]">
            {profile.email?.split('@')[0] || "Uninorte"}
          </p>
        </div>
      </div>

      <div className="text-right pr-2 relative z-10">
        <div className="flex items-baseline justify-end gap-1">
          <span className="text-2xl font-black text-white tabular-nums font-outfit">
            {profile.points || 0}
          </span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pts</span>
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-1">
          <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500/50" style={{ width: `${Math.min(100, (profile.points || 0) / 5)}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
};
