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
                <div className="rounded-[2rem] bg-background border border-white/5 p-8 relative overflow-hidden group hover:border-red-500/20 transition-colors">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                                <Heart size={20} className="fill-current" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black font-sans uppercase tracking-wider text-white">Top Programas</h3>
                                <p className="text-[10px] font-black tracking-widest text-white/30 uppercase">Carreras más apoyadas</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4">
                        {topCareers.map((carrera, i) => (
                            <Link key={carrera.id} href={`/carrera/${carrera.id}`}>
                                <div className={cn(
                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-white/[0.04]",
                                    i === 0 ? "bg-red-500/5 border-red-500/30" : "bg-white/[0.02] border-white/5"
                                )}>
                                    <div className="font-black text-white/20 text-lg w-5 text-center font-sans">
                                        {i + 1}
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {carrera.escudo_url ? (
                                            <img src={carrera.escudo_url} alt={carrera.nombre} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-xs font-black text-white/20">{carrera.nombre.substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <h4 className="text-sm font-bold truncate text-white group-hover:text-red-400 transition-colors">
                                            {carrera.nombre}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-widest text-red-400">
                                            {carrera.followers_count} Seguidores
                                        </div>
                                    </div>
                                    {i === 0 && <Crown size={18} className="text-amber-500" />}
                                    <ArrowUpRight size={16} className="text-white/20 shrink-0" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Users Regulares / Atletas Rank */}
            {topUsers.length > 0 && (
                <div className="rounded-[2rem] bg-background border border-white/5 p-8 relative overflow-hidden group hover:border-indigo-500/20 transition-colors">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/5 blur-3xl rounded-full -translate-y-1/2 -translate-x-1/2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black font-sans uppercase tracking-wider text-white">Top Perfiles</h3>
                                <p className="text-[10px] font-black tracking-widest text-white/30 uppercase">Usuarios más seguidos</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col gap-4">
                        {topUsers.map((user, i) => (
                            <Link key={user.id} href={`/perfil/${user.id}`}>
                                <div className={cn(
                                    "flex items-center gap-4 p-4 rounded-2xl border transition-all hover:bg-white/[0.04]",
                                    i === 0 ? "bg-indigo-500/5 border-indigo-500/30" : "bg-white/[0.02] border-white/5"
                                )}>
                                    <div className="font-black text-white/20 text-lg w-5 text-center font-sans">
                                        {i + 1}
                                    </div>
                                    <Avatar
                                        name={user.full_name}
                                        src={user.avatar_url}
                                        className="w-12 h-12 rounded-full border border-white/10 shrink-0"
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <h4 className="text-sm font-bold truncate text-white group-hover:text-indigo-400 transition-colors">
                                            {user.full_name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                            {user.followers_count} Seguidores
                                        </div>
                                    </div>
                                    {i === 0 && <Star size={18} className="text-amber-500 fill-amber-500" />}
                                    <ArrowUpRight size={16} className="text-white/20 shrink-0" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
