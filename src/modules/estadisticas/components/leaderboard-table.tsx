"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, Target, ShieldAlert, ChevronRight, FileText, UserCheck } from "lucide-react";
import { Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SportIcon } from "@/components/sport-icons";

export interface LeaderboardEntry {
    id: number | string;
    rank: number;
    nombre: string;
    avatar_url?: string | null;
    profile_id?: string | null;
    equipo?: string; // Career name
    escudo_url?: string | null;
    value: number; // Primary stat (goals or total points)
    secondaryStats?: {
        label: string;
        value: number | string;
    }[];
}

interface LeaderboardTableProps {
    title: string;
    icon: any;
    entries: LeaderboardEntry[];
    sportName: string;
    accentColor: string;
    valueLabel: string;
}

export function LeaderboardTable({ 
    title, 
    icon: Icon, 
    entries, 
    sportName, 
    accentColor, 
    valueLabel 
}: LeaderboardTableProps) {
    if (entries.length === 0) return null;

    return (
        <div className="relative rounded-[2rem] border border-white/5 bg-[#0A0A0B]/40 backdrop-blur-3xl overflow-hidden shadow-2xl group/table">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="relative px-4 py-5 sm:px-8 sm:py-7 border-b border-white/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                    <div 
                        className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl relative group-hover/table:scale-105 transition-transform duration-500 shrink-0"
                        style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
                    >
                        <div className="absolute inset-0 blur-lg opacity-20" style={{ backgroundColor: accentColor }} />
                        <Icon size={26} className="relative z-10" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white font-display leading-tight break-words">{title}</h3>
                        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                            <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-1.5 shadow-sm max-w-full">
                                <SportIcon sport={sportName} size={11} className="text-white/40 shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 truncate">{sportName}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="hidden sm:flex flex-col items-end opacity-20 grayscale brightness-150">
                     <span className="text-[10px] font-black tracking-[0.5em] uppercase text-white leading-none mb-1">LEADERBOARD</span>
                     <div className="h-[1px] w-24 bg-gradient-to-l from-white/30 to-transparent" />
                </div>
            </div>

            {/* List with Scroll */}
            <div className="relative p-2 sm:p-4 overflow-y-auto max-h-[580px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-1 sm:pr-2 group/list select-none overflow-x-hidden">
                <div className="space-y-1.5 relative z-10 min-w-0">
                    {entries.map((player, idx) => {
                        const isTop3 = idx < 3;
                        const targetUrl = player.profile_id ? `/perfil/${player.profile_id}` : `/jugador/${player.id}`;
                        const isProfile = !!player.profile_id;
                        
                        const RowContent = (
                            <div
                                className={cn(
                                    "relative flex items-center gap-2 min-w-0 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all duration-500 pr-14 sm:pr-4",
                                    "group-hover/row:bg-white/[0.04] sm:group-hover/row:translate-x-1 border border-transparent group-hover/row:border-white/5",
                                    isTop3 && "bg-gradient-to-r from-white/[0.02] to-transparent shadow-sm"
                                )}
                            >
                                {/* Rank */}
                                <div className="w-8 sm:w-10 flex justify-center shrink-0">
                                    {idx === 0 ? (
                                        <div className="relative">
                                            <Trophy size={24} className="text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                                            <div className="absolute -inset-2 bg-[#FFD700]/20 blur-xl rounded-full" />
                                        </div>
                                    ) : idx === 1 ? (
                                        <Medal size={22} className="text-[#E5E7EB]" />
                                    ) : idx === 2 ? (
                                        <Medal size={22} className="text-[#D97706]" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                                          <span className="text-[10px] font-black font-mono text-white/30">{idx + 1}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Player Identity — min-w-0 + pr on row so name can use full width minus value column */}
                                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                    <div className="relative shrink-0">
                                        <Avatar 
                                            src={player.avatar_url} 
                                            name={player.nombre} 
                                            className={cn(
                                                "w-10 h-10 sm:w-12 sm:h-12 border border-white/10 shadow-md transition-transform duration-500 group-hover/row:scale-105",
                                                isProfile ? "ring-2 ring-violet-500/20" : "opacity-80 grayscale-[0.3]"
                                            )} 
                                        />
                                        {player.escudo_url ? (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0A0A0B] border border-white/20 p-0.5 sm:p-1 shadow-lg">
                                                <img src={player.escudo_url} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0A0A0B] border border-white/20 flex items-center justify-center">
                                                <SportIcon sport={sportName} size={9} className="opacity-40 sm:w-[10px] sm:h-[10px]" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <div className="flex items-start gap-1.5 sm:gap-2 mb-0.5 min-w-0">
                                            <p className="text-sm sm:text-base font-black text-white group-hover/row:text-violet-400 transition-colors tracking-tight break-words [overflow-wrap:anywhere] leading-snug flex-1 min-w-0">
                                                {player.nombre}
                                            </p>
                                            {isProfile ? (
                                                <UserCheck size={12} className="text-violet-400 drop-shadow-glow shrink-0 mt-0.5" />
                                            ) : (
                                                <div className="px-1.5 py-0.5 rounded-[4px] bg-white/5 border border-white/10 flex items-center gap-1 shrink-0 mt-0.5">
                                                    <FileText size={8} className="text-white/20" />
                                                    <span className="hidden sm:inline text-[7px] font-black text-white/15 tracking-tighter uppercase">ACTA</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-white/25 uppercase tracking-[0.12em] sm:tracking-[0.15em] break-words [overflow-wrap:anywhere] leading-snug line-clamp-2">
                                            {player.equipo || "Independiente"}
                                        </p>
                                    </div>
                                </div>

                                {/* Extra Stats (Desktop only) */}
                                <div className="hidden lg:flex items-center gap-10 shrink-0 px-6">
                                    {player.secondaryStats?.map((stat, sIdx) => (
                                        <div key={sIdx} className="text-right">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/15 mb-0.5">{stat.label}</p>
                                            <p className="text-sm font-black font-mono text-white/50 tabular-nums">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Primary Value — compact on mobile */}
                                <div className="shrink-0 text-right w-[3rem] sm:min-w-[4.5rem] flex flex-col items-end justify-center">
                                    <motion.p 
                                        initial={false}
                                        animate={{ scale: isTop3 ? [1, 1.05, 1] : 1 }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tighter tabular-nums drop-shadow-2xl leading-none mb-0.5 sm:mb-1" 
                                        style={{ color: isTop3 ? accentColor : 'white' }}
                                    >
                                        {player.value}
                                    </motion.p>
                                    <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-[0.25em] text-white/10 leading-tight text-right line-clamp-2 max-w-[3.5rem] sm:max-w-none">{valueLabel}</p>
                                </div>

                                {/* Link indicator: absolute so it never steals horizontal space from the name on mobile */}
                                <div
                                    className={cn(
                                        "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5",
                                        "opacity-40 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity duration-300"
                                    )}
                                    aria-hidden
                                >
                                    <div
                                        className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border",
                                            isProfile
                                                ? "bg-violet-500/15 border-violet-500/35 text-violet-400"
                                                : "bg-white/5 border-white/10 text-white/35"
                                        )}
                                    >
                                        <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                                    </div>
                                    <span
                                        className={cn(
                                            "hidden sm:block text-[8px] font-black uppercase tracking-tighter",
                                            isProfile ? "text-violet-400/50" : "text-white/20"
                                        )}
                                    >
                                        {isProfile ? "PERFIL" : "FICHA"}
                                    </span>
                                </div>
                            </div>
                        );

                        return (
                            <motion.div
                                key={player.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: Math.min(idx * 0.04, 0.4) }}
                                className="group/row"
                            >
                                <Link href={targetUrl} className="block no-underline min-w-0">
                                    {RowContent}
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Glow Hint */}
            <div className="absolute bottom-[4.5rem] left-4 right-4 sm:left-8 sm:right-8 h-[2px] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

            {/* Footer decoration */}
            <div className="relative px-3 py-4 sm:p-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-center gap-2 sm:gap-3">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent min-w-0" />
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-white/5 text-center leading-tight max-w-[min(100%,14rem)] sm:max-w-none sm:whitespace-nowrap">Torneo Oficial · Datos Certificados</p>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/5 to-transparent min-w-0" />
            </div>
        </div>
    );
}
