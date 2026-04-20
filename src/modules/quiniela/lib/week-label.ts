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

/** Etiqueta corta para chips (móvil): "20–26 abr" en hora Colombia. */
export function formatQuinielaWeekChipEs(weekStartIso: string, weekEndIso: string): string {
    const start = new Date(weekStartIso);
    const endExclusive = new Date(weekEndIso);
    const endIncl = new Date(endExclusive.getTime() - 60_000);
    const d1 = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
    }).format(start);
    const d2 = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        day: "numeric",
    }).format(endIncl);
    const mon = new Intl.DateTimeFormat("es-CO", {
        timeZone: "America/Bogota",
        month: "short",
    }).format(endIncl);
    return `${d1}–${d2} ${mon}`.replace(/\s+/g, " ").trim();
}
