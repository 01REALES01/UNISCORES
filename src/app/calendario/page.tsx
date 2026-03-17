"use client";

import { cn } from "@/lib/utils";
import { Navbar } from "@/shared/components/navbar";
import { useCalendar } from "@/hooks/use-calendar";
import { CalendarFilters } from "@/shared/components/calendar-filters";
import { CalendarGrid } from "@/shared/components/calendar-grid";
import { MatchFeaturedCard } from "@/shared/components/match-featured-card";
import { CalendarMatchList } from "@/shared/components/calendar-match-list";

export default function CalendarioPage() {
    const {
        loading,
        currentMonth,
        selectedDate,
        sportFilter,
        showLiveOnly,
        filteredMatches,
        matchOfTheDay,
        daysInMonth,
        prevMonth,
        nextMonth,
        setSelectedDate,
        setSportFilter,
        setShowLiveOnly,
        isSameDay
    } = useCalendar();

    return (
        <div className="min-h-screen bg-[#0a0805] selection:bg-indigo-500/30">
            <Navbar />
            
            <main className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
                {/* Background effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                <div className="relative z-10 flex flex-col gap-8 lg:gap-12">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Calendario Oficial</span>
                            </div>
                            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter leading-none">
                                GIGA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-rose-400">OLYMPICS</span>
                            </h1>
                            <p className="text-white/40 text-sm sm:text-base max-w-xl font-bold leading-relaxed">
                                No te pierdas ni un segundo de la acción. Sigue todos los encuentros, resultados y transmisiones en vivo.
                            </p>
                        </div>

                        <CalendarFilters 
                            sportFilter={sportFilter}
                            showLiveOnly={showLiveOnly}
                            setSportFilter={setSportFilter}
                            setShowLiveOnly={setShowLiveOnly}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                        {/* Featured & List Section */}
                        <div className="lg:col-span-8 space-y-8 flex flex-col h-full">
                            {matchOfTheDay && !loading && (
                                <MatchFeaturedCard match={matchOfTheDay} />
                            )}
                            
                            <CalendarMatchList 
                                loading={loading}
                                selectedDate={selectedDate}
                                matches={filteredMatches}
                                isSameDay={isSameDay}
                            />
                        </div>

                        {/* Calendar Grid Section */}
                        <div className="lg:col-span-4 space-y-6">
                            <CalendarGrid 
                                currentMonth={currentMonth}
                                selectedDate={selectedDate}
                                daysInMonth={daysInMonth}
                                prevMonth={prevMonth}
                                nextMonth={nextMonth}
                                setSelectedDate={setSelectedDate}
                                isSameDay={isSameDay}
                                matches={filteredMatches}
                            />

                            {/* Info Card */}
                            <div className="bg-gradient-to-br from-indigo-500/10 to-rose-500/10 rounded-3xl border border-white/10 p-6 backdrop-blur-md">
                                <h4 className="text-white font-black text-sm uppercase tracking-widest mb-3">Información</h4>
                                <ul className="space-y-2 text-xs text-white/50 font-bold">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        Puntos indica partidos En Vivo
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        El círculo indica eventos el día seleccionado
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        Los horarios son en formato 24h
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
