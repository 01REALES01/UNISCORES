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
        <div className="xl:col-span-2 bg-[#110e20]/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-6 sm:p-10 shadow-3xl relative overflow-hidden flex flex-col min-h-[550px]">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl sm:text-4xl font-black text-white capitalize tracking-tight">
                    {currentDate.toLocaleString('es-ES', { month: 'long' })} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={onPrevMonth}
                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all hover:scale-110 shadow-xl"
                    >
                        <ChevronLeft size={24} className="text-white/70" />
                    </button>
                    <button
                        onClick={onNextMonth}
                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all hover:scale-110 shadow-xl"
                    >
                        <ChevronRight size={24} className="text-white/70" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1">
                {/* Days of week */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map((day) => (
                        <div key={day} className="text-center text-[11px] sm:text-xs font-black text-white/20 uppercase tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-7 bg-[#05040a] rounded-[2rem] border border-white/10 overflow-hidden divide-x divide-y divide-white/5 shadow-2xl">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square bg-transparent" />
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
                                    "aspect-square flex flex-col items-center justify-start py-2 sm:py-4 transition-all relative group focus:outline-none",
                                    isSelected
                                        ? "bg-indigo-600/40 z-20 shadow-[inset_0_0_25px_rgba(79,70,229,0.4)] ring-1 ring-inset ring-indigo-500/50"
                                        : (isToday
                                            ? "bg-rose-500/10 z-10 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)] ring-1 ring-inset ring-rose-500/30 hover:bg-white/5"
                                            : "hover:bg-white/5 hover:z-10")
                                )}
                            >
                                <span className={cn(
                                    "text-sm sm:text-xl font-bold z-10 transition-colors",
                                    isSelected ? "text-white" : (isToday ? "text-rose-400 font-black" : "text-white/40 group-hover:text-white")
                                )}>
                                    {i + 1}
                                </span>

                                {/* Event Indicators */}
                                {hasEvents && !isSelected && (
                                    <div className="absolute bottom-1 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 sm:gap-1.5 w-[95%] flex-wrap cursor-pointer">
                                        {uniqueSportsEvents.slice(0, isToday ? 2 : 3).map((s, idx) => (
                                            <div key={idx} className={cn(
                                                "w-2 h-2 sm:w-4 sm:h-4 rounded-full flex items-center justify-center bg-[#05040a] border transition-all",
                                                s.estado === 'en_vivo' ? 'border-rose-500/50 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] scale-110' :
                                                    s.estado === 'finalizado' ? 'border-white/10 text-white/30' : 'border-indigo-500/30 text-indigo-400'
                                            )}>
                                                <SportIcon sport={s.name} size={10} className="scale-[0.5] sm:scale-100" />
                                            </div>
                                        ))}
                                        {uniqueSportsEvents.length > (isToday ? 2 : 3) && (
                                            <div className="text-[7px] sm:text-[10px] font-black text-white/30 pl-0.5">
                                                +{uniqueSportsEvents.length - (isToday ? 2 : 3)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isSelected && hasEvents && (
                                    <div className="absolute bottom-1 sm:bottom-2 bg-black/60 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded-full border border-white/10 text-[7px] sm:text-[10px] font-black text-white z-10 uppercase tracking-widest shadow-lg">
                                        {eventsToday.length} EVTS
                                    </div>
                                )}

                                {isSelected && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent pointer-events-none" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
