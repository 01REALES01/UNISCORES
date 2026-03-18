"use client";

import { MainNavbar } from "@/shared/components/main-navbar";
import { useAuth } from "@/hooks/useAuth";
import { useCalendar } from "@/hooks/use-calendar";
import { CalendarFilters } from "@/shared/components/calendar-filters";
import { CalendarGrid } from "@/shared/components/calendar-grid";
import { MatchFeaturedCard } from "@/shared/components/match-featured-card";
import { CalendarMatchList } from "@/shared/components/calendar-match-list";

export default function CalendarioPage() {
    const { user, profile, isStaff } = useAuth();
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
        isSameDay,
        firstDayOfMonth
    } = useCalendar();

    const selectedDayCount = filteredMatches.filter(m =>
        isSameDay(new Date(m.fecha), selectedDate)
    ).length;

    return (
        <div className="min-h-screen bg-[#0a0805] text-white selection:bg-indigo-500/30">
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-indigo-600/6 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/6 rounded-full blur-[140px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 pt-10 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1400px] mx-auto">

                    {/* Page header + filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] mb-2">Calendario de Partidos</p>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-none">
                                GIGA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">OLYMPICS</span>
                            </h1>
                        </div>
                        <CalendarFilters
                            activeFilter={showLiveOnly ? 'live' : sportFilter}
                            onFilterChange={(id) => {
                                if (id === 'live') {
                                    setShowLiveOnly(!showLiveOnly);
                                    if (!showLiveOnly) setSportFilter('all');
                                } else {
                                    setSportFilter(id);
                                    setShowLiveOnly(false);
                                }
                            }}
                        />
                    </div>

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* MAIN GRID: Calendario IZQUIERDA (grande) | Panel DERECHA */}
                    {/* ─────────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 xl:gap-8 items-start">

                        {/* ── IZQUIERDA: Calendario en grande ── */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-[2rem] overflow-hidden backdrop-blur-sm">
                            <CalendarGrid
                                currentDate={currentMonth}
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                onPrevMonth={prevMonth}
                                onNextMonth={nextMonth}
                                daysInMonth={daysInMonth}
                                firstDayOfMonth={firstDayOfMonth}
                                filteredMatches={filteredMatches}
                                isSameDay={isSameDay}
                            />
                        </div>

                        {/* ── DERECHA: Partido destacado + lista del día ── */}
                        <div className="flex flex-col gap-5 xl:sticky xl:top-28">

                            {/* Partido Destacado */}
                            {matchOfTheDay && !loading && (
                                <div>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Partido destacado</p>
                                    <MatchFeaturedCard match={matchOfTheDay} />
                                </div>
                            )}

                            {/* Partidos de la fecha seleccionada */}
                            <div className="bg-white/[0.03] border border-white/8 rounded-[1.5rem] overflow-hidden">
                                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
                                    <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                        {selectedDayCount} {selectedDayCount === 1 ? 'partido' : 'partidos'}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <CalendarMatchList
                                        loading={loading}
                                        selectedDate={selectedDate}
                                        matches={filteredMatches}
                                        isSameDay={isSameDay}
                                    />
                                </div>
                            </div>

                            {/* Leyenda */}
                            <div className="flex items-center gap-5 px-1 text-[10px] font-black text-white/25 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />En vivo
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400/50" />Próximo
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-white/15" />Final
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
