import { Avatar } from "@/components/ui-primitives";
import { Diamond } from "lucide-react";

interface QuinielaHeaderProps {
  user: any;
  profile: any;
  points: number;
}

export const QuinielaHeader = ({ user, profile, points }: QuinielaHeaderProps) => {
  return (
    <div className="flex items-center justify-between py-8 px-2">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <Avatar name={profile?.full_name || user?.email} src={profile?.avatar_url} size="lg" className="relative border-2 border-zinc-950 ring-1 ring-white/10 shadow-2xl scale-110" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-zinc-950 flex items-center justify-center shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] leading-none mb-1.5 font-sans">HOLA,</p>
          <p className="text-2xl font-black text-white tracking-tight leading-none font-sans">
            {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "Usuario"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-2 pr-5 rounded-[2rem] shadow-2xl group hover:bg-white/[0.08] transition-all cursor-default overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform relative z-10">
          <Diamond size={18} className="text-black fill-current" />
        </div>
        <div className="relative z-10">
          <span className="text-xl font-black text-white tabular-nums leading-none block font-sans">{points}</span>
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none block mt-0.5">Puntos</span>
        </div>
      </div>
    </div>
  );
};
