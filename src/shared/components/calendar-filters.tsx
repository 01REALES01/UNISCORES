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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap items-center gap-3">
                {SPORTS_FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => onFilterChange(filter.id)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 border",
                            activeFilter === filter.id
                                ? "bg-indigo-500/20 border-indigo-500/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        {filter.icon ? <filter.icon size={16} /> : <SportIcon sport={filter.id} size={16} />}
                        {filter.label}
                    </button>
                ))}
            </div>

            <button
                onClick={() => onFilterChange('live')}
                className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all",
                    activeFilter === 'live'
                        ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20"
                )}
            >
                <Activity size={16} className={cn(activeFilter === 'live' ? "animate-bounce" : "animate-pulse")} />
                En Vivo
            </button>
        </div>
    );
}
