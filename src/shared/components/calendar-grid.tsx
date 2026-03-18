"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SportIcon } from "@/shared/components/sport-icons";
import type { PartidoWithRelations } from "@/modules/matches/types";

interface CalendarGridProps {
    currentDate: Date;
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    daysInMonth: number;
    firstDayOfMonth: number;
    filteredMatches: PartidoWithRelations[];
    isSameDay: (d1: Date, d2: Date) => boolean;
}

export function CalendarGrid({
    currentDate,
    selectedDate,
    onDateSelect,
    onPrevMonth,
    onNextMonth,
    daysInMonth,
    firstDayOfMonth,
    filteredMatches,
    isSameDay
}: CalendarGridProps) {
    return (
        <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl sm:text-3xl font-black text-white capitalize">
                    {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={onPrevMonth}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
                    >
                        <ChevronLeft size={20} className="text-white/70" />
                    </button>
                    <button
                        onClick={onNextMonth}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
                    >
                        <ChevronRight size={20} className="text-white/70" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1">
                {/* Days of week */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map((day) => (
                        <div key={day} className="text-center text-[10px] sm:text-xs font-black text-white/30 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-7 bg-[#0a0805]/50 rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden divide-x divide-y divide-white/5">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square bg-transparent border-transparent" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                        const isSelected = isSameDay(selectedDate, dayDate);
                        const isToday = isSameDay(new Date(), dayDate);

                        // Check events for this day
                        const eventsToday = filteredMatches.filter(m => isSameDay(new Date(m.fecha), dayDate));
                        const hasEvents = eventsToday.length > 0;

                        // Group events by sport to only show one icon per sport, maintaining status priority
                        const uniqueSportsMap = new Map<string, string>();
                        eventsToday.forEach(e => {
                            const sportName = e.disciplinas?.name;
                            if (!sportName) return;
                            const currentStatus = uniqueSportsMap.get(sportName);
                            // Prioritize status: en_vivo > programado > finalizado
                            if (!currentStatus) {
                                uniqueSportsMap.set(sportName, e.estado);
                            } else if (e.estado === 'en_vivo') {
                                uniqueSportsMap.set(sportName, 'en_vivo');
                            } else if (e.estado === 'programado' && currentStatus === 'finalizado') {
                                uniqueSportsMap.set(sportName, 'programado');
                            }
                        });
                        const uniqueSportsEvents = Array.from(uniqueSportsMap.entries()).map(([name, estado]) => ({ name, estado }));

                        return (
                            <button
                                key={i}
                                onClick={() => onDateSelect(dayDate)}
                                className={cn(
                                    "aspect-square flex flex-col items-center justify-start py-1 sm:py-3 transition-all relative group focus:outline-none",
                                    isSelected
                                        ? "bg-indigo-500/20 z-20 shadow-[inset_0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-inset ring-indigo-500/50"
                                        : (isToday
                                            ? "bg-rose-500/10 z-10 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)] ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20"
                                            : "hover:bg-white/5 hover:z-10")
                                )}
                            >
                                <span className={cn(
                                    "text-[11px] sm:text-lg font-bold z-10 transition-colors",
                                    isSelected ? "text-indigo-400" : (isToday ? "text-rose-400 font-black" : "text-white/60 group-hover:text-white")
                                )}>
                                    {i + 1}
                                </span>

                                {/* Event Indicators */}
                                {hasEvents && !isSelected && (
                                    <div className="absolute bottom-0.5 sm:bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 sm:gap-1 w-[90%] flex-wrap cursor-pointer" title={`${eventsToday.length} eventos en total`}>
                                        {uniqueSportsEvents.slice(0, 3).map((s, idx) => (
                                            <div key={idx} className={cn(
                                                "w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center bg-[#0a0805] border",
                                                s.estado === 'en_vivo' ? 'border-rose-500/50 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                    s.estado === 'finalizado' ? 'border-white/10 text-white/30' : 'border-indigo-500/30 text-indigo-400'
                                            )}>
                                                <SportIcon sport={s.name} size={10} className="scale-[0.6] sm:scale-100 transition-transform" />
                                            </div>
                                        ))}
                                        {uniqueSportsEvents.length > 3 && (
                                            <div className="text-[7px] sm:text-[9px] font-black text-white/50 pl-0.5">
                                                +{uniqueSportsEvents.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isSelected && hasEvents && (
                                    <div className="absolute bottom-1 sm:bottom-2 bg-[#0a0805] px-1 py-0 sm:py-0.5 rounded-md border border-indigo-500/30 text-[7px] sm:text-[9px] font-mono font-black text-indigo-400 z-10">
                                        {eventsToday.length} EVTS
                                    </div>
                                )}

                                {isSelected && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
