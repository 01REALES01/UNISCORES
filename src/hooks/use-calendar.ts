"use client";

import { useState, useMemo } from "react";
import { useMatches } from "@/hooks/use-matches";
import type { PartidoWithRelations } from "@/modules/matches/types";

export function useCalendar() {
    const { matches, loading, error } = useMatches();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [sportFilter, setSportFilter] = useState('all');
    const [showLiveOnly, setShowLiveOnly] = useState(false);

    // Calendar logic
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    
    // 0 is Sunday, let's make Monday 0 for standard display
    let firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() - 1;
    if (firstDayOfMonth === -1) firstDayOfMonth = 6; // Sunday becomes 6

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Filtered data
    const filteredMatches = useMemo(() => {
        let list = (matches as unknown as PartidoWithRelations[]) || [];
        if (showLiveOnly) list = list.filter(m => m.estado === 'en_vivo');
        if (sportFilter !== 'all') list = list.filter(m => m.disciplinas?.name === sportFilter);
        return list;
    }, [matches, showLiveOnly, sportFilter]);

    // Matches for selected date
    const selectedDateMatches = useMemo(() => {
        return filteredMatches.filter(m => {
            const matchDate = new Date(m.fecha);
            return isSameDay(matchDate, selectedDate);
        });
    }, [filteredMatches, selectedDate]);

    // Match of the Day (First live or next upcoming overall, or last finished)
    const matchOfTheDay = useMemo(() => {
        const liveMatch = filteredMatches.find(m => m.estado === 'en_vivo');
        if (liveMatch) return liveMatch;
        const upcomingMatches = filteredMatches.filter(m => new Date(m.fecha) >= new Date() && m.estado === 'programado');
        if (upcomingMatches.length > 0) return upcomingMatches[0];

        // If no live or upcoming, show the most recently finished
        const finishedMatches = filteredMatches.filter(m => m.estado === 'finalizado').sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        return finishedMatches[0] || null;
    }, [filteredMatches]);

    // Matches strictly for the selected date minus the featured one
    const upcomingFixtures = useMemo(() => {
        let list = [...selectedDateMatches];
        if (matchOfTheDay) {
            list = list.filter(m => m.id !== matchOfTheDay.id);
        }
        return list;
    }, [selectedDateMatches, matchOfTheDay]);

    return {
        // State
        currentMonth,
        selectedDate,
        sportFilter,
        showLiveOnly,
        loading,
        error,

        // Actions
        setCurrentMonth,
        setSelectedDate,
        setSportFilter,
        setShowLiveOnly,
        prevMonth,
        nextMonth,

        // Data
        matches,
        filteredMatches,
        selectedDateMatches,
        matchOfTheDay,
        upcomingFixtures,

        // Utils
        isSameDay,
        daysInMonth,
        firstDayOfMonth
    };
}
