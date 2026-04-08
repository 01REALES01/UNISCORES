import { motion } from "framer-motion";
import { Users, Heart, Star, Crown, ArrowUpRight } from "lucide-react";
import { Avatar } from "@/components/ui-primitives";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type TopCareer = {
    id: number;
    nombre: string;
    escudo_url?: string | null;
    followers_count: number;
};

export type TopUser = {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    followers_count: number;
};

interface PopularityRankingProps {
    topCareers: TopCareer[];
    topUsers: TopUser[];
}

export function PopularityRanking({ topCareers, topUsers }: PopularityRankingProps) {
    if (topCareers.length === 0 && topUsers.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Careers Rank */}
            {topCareers.length > 0 && (
                <div className="rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 p-8 relative overflow-hidden group hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all duration-500 flex flex-col h-full">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-violet-500/15 rounded-[1.25rem] text-violet-400 border border-violet-500/30 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]">
                                <Heart size={22} className="fill-violet-400/20" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black font-sans tracking-tight text-white leading-none mb-1.5">Top Programas</h3>
                                <p className="text-[10px] font-display font-black tracking-[0.2em] text-white/40 uppercase">Programas más apoyados</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                        {topCareers.map((carrera, i) => (
                            <Link key={carrera.id} href={`/carrera/${carrera.id}`}>
                                <div className={cn(
                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                                    i === 0 ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                                )}>
                                    <div className={cn(
                                        "font-black text-xl w-6 text-center font-display drop-shadow-md",
                                        i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-white/20"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                        {carrera.escudo_url ? (
                                            <img src={carrera.escudo_url} alt={carrera.nombre} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-xs font-black font-display text-white/20">{carrera.nombre.substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <h4 className="text-sm font-bold truncate text-white group-hover:text-violet-300 transition-colors">
                                            {carrera.nombre}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-display font-black tracking-widest text-violet-400">
                                            {carrera.followers_count} Seguidores
                                        </div>
                                    </div>
                                    {i === 0 && <Crown size={18} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
                                    {i !== 0 && <ArrowUpRight size={16} className="text-white/20 shrink-0 group-hover:text-white/60 transition-colors" />}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Users Regulares / Atletas Rank */}
            {topUsers.length > 0 && (
                <div className="rounded-[2.5rem] bg-black/40 backdrop-blur-3xl border border-white/10 p-8 relative overflow-hidden group hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] transition-all duration-500 flex flex-col h-full">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-600/10 blur-[80px] rounded-full -translate-y-1/2 -translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-emerald-500/15 rounded-[1.25rem] text-emerald-400 border border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
                                <Users size={22} className="fill-emerald-400/20" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black font-sans tracking-tight text-white leading-none mb-1.5">Top Perfiles</h3>
                                <p className="text-[10px] font-display font-black tracking-[0.2em] text-white/40 uppercase">Usuarios más seguidos</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                        {topUsers.map((user, i) => (
                            <Link key={user.id} href={`/perfil/${user.id}`}>
                                <div className={cn(
                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                                    i === 0 ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                                )}>
                                    <div className={cn(
                                        "font-black text-xl w-6 text-center font-display drop-shadow-md",
                                        i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-white/20"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <Avatar
                                        name={user.full_name}
                                        src={user.avatar_url}
                                        className="w-12 h-12 rounded-[1rem] border border-white/10 shrink-0 shadow-inner"
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <h4 className="text-sm font-bold truncate text-white group-hover:text-emerald-300 transition-colors">
                                            {user.full_name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-display font-black tracking-widest text-emerald-400">
                                            {user.followers_count} Seguidores
                                        </div>
                                    </div>
                                    {i === 0 && <Star size={18} className="text-amber-500 fill-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
                                    {i !== 0 && <ArrowUpRight size={16} className="text-white/20 shrink-0 group-hover:text-white/60 transition-colors" />}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
