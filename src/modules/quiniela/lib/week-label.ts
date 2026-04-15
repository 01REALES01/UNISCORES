/** Etiqueta legible del período de ranking (lun 00:00 – lun 00:00, America/Bogota). */
export function formatQuinielaWeekRangeEs(weekStartIso: string, weekEndIso: string): string {
    const opts: Intl.DateTimeFormatOptions = {
        timeZone: "America/Bogota",
        weekday: "short",
        day: "numeric",
        month: "short",
    };
    const start = new Date(weekStartIso);
    const endExclusive = new Date(weekEndIso);
    const endDisplay = new Date(endExclusive.getTime() - 60_000);
    const a = new Intl.DateTimeFormat("es-CO", opts).format(start);
    const b = new Intl.DateTimeFormat("es-CO", { ...opts, year: "numeric" }).format(endDisplay);
    return `${a} → ${b}`;
}
