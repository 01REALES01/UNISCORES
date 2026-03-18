"use client";

import { Trophy, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/shared/components/sport-icons";

const SPORTS_FILTERS = [
    { id: 'all', label: 'Todos', icon: Trophy },
    { id: 'Fútbol', label: 'Fútbol' },
    { id: 'Baloncesto', label: 'Baloncesto' },
    { id: 'Tenis', label: 'Tenis' },
    { id: 'Voleibol', label: 'Voleibol' },
    { id: 'Natación', label: 'Natación' }
];

interface CalendarFiltersProps {
    activeFilter: string;
    onFilterChange: (id: string) => void;
}

export function CalendarFilters({ activeFilter, onFilterChange }: CalendarFiltersProps) {
    return (
        <div className="flex flex-col gap-6 mb-8 w-full">
            {/* Sport Icons Row - Scrollable on mobile */}
            <div className="relative group">
                <div className="flex overflow-x-auto no-scrollbar items-center gap-3 pb-2 -mx-2 px-2 mask-linear-fade">
                    {SPORTS_FILTERS.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => onFilterChange(filter.id)}
                            className={cn(
                                "flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 border",
                                activeFilter === filter.id
                                    ? "bg-indigo-500/20 border-indigo-500/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-105"
                                    : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                            title={filter.label}
                        >
                            {filter.icon ? <filter.icon size={22} /> : <SportIcon sport={filter.id} size={22} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Live Filter Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onFilterChange('live')}
                    className={cn(
                        "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group",
                        activeFilter === 'live'
                            ? "bg-rose-500/20 text-rose-500 border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.25)]"
                            : "bg-rose-500/10 border border-rose-500/10 text-rose-500/40 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/20"
                    )}
                >
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer",
                        activeFilter === 'live' && "hidden"
                    )} />
                    <Activity size={16} className={cn(activeFilter === 'live' ? "animate-bounce" : "animate-pulse")} />
                    En Vivo
                </button>
                {activeFilter !== 'all' && activeFilter !== 'live' && (
                    <span className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                        Filtrando por {activeFilter}
                    </span>
                )}
            </div>
        </div>
    );
}
