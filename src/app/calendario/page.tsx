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
        <div className="min-h-screen bg-[#05040a] text-white selection:bg-indigo-500/30">
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-indigo-600/6 rounded-full blur-[160px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/6 rounded-full blur-[140px]" />
            </div>

            <MainNavbar user={user} profile={profile} isStaff={isStaff} />

            <main className="relative z-10 pt-10 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1440px] mx-auto">

                    {/* Page header + filters */}
                    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-10 mb-16">
                        <div className="max-w-md">
                            <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.4em] mb-3 sm:mb-4">Calendario de Eventos</p>
                            <h1 className="text-4xl sm:text-7xl font-black tracking-tighter text-white leading-none mb-8 sm:mb-10">
                                <span className="block opacity-20 text-2xl sm:text-4xl tracking-[0.1em] mb-1 sm:mb-2 font-black italic">PROGRAMA</span>
                                CALENDARIO
                            </h1>
                            <div className="bg-[#110e20]/40 p-5 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        </div>

                        {/* Partido Destacado (Hidden on mobile if not scrolled) - Moving to main grid for better balance */}
                        {matchOfTheDay && !loading && (
                            <div className="hidden lg:block w-full max-w-lg">
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">En el foco hoy</p>
                                    <div className="h-px flex-1 bg-white/5 mx-4" />
                                </div>
                                <MatchFeaturedCard match={matchOfTheDay} />
                            </div>
                        )}
                    </div>

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* MAIN GRID: Calendario IZQUIERDA (grande) | Panel DERECHA */}
                    {/* ─────────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 xl:gap-12 items-start">

                        {/* ── IZQUIERDA: Calendario en grande ── */}
                        <div className="w-full">
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

                        {/* ── DERECHA: Más partidos + Leyenda ── */}
                        <div className="flex flex-col gap-6 xl:sticky xl:top-28">
                            
                            {/* Partidos de la fecha seleccionada */}
                            <div className="bg-[#110e20]/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">
                                            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long' })}
                                        </p>
                                        <p className="text-lg font-black text-white">
                                            {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                        {selectedDayCount} {selectedDayCount === 1 ? 'evento' : 'eventos'}
                                    </span>
                                </div>
                                <div className="p-6">
                                    <CalendarMatchList
                                        loading={loading}
                                        selectedDate={selectedDate}
                                        matches={filteredMatches}
                                        isSameDay={isSameDay}
                                    />
                                </div>
                            </div>

                            {/* Leyenda */}
                            <div className="flex items-center justify-around p-5 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black text-white/30 uppercase tracking-[0.15em] shadow-lg">
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />En vivo
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.3)]" />Próximo
                                </span>
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />Finalizado
                                </span>
                            </div>

                            {/* Mobile Featured (Visible only on small screens) */}
                            {matchOfTheDay && !loading && (
                                <div className="lg:hidden mt-4">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 px-1">Partido destacado</p>
                                    <MatchFeaturedCard match={matchOfTheDay} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
