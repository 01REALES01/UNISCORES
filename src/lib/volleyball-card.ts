/**
 * Línea legible de marcadores por set en tarjetas de voleibol (ej. "25–18 · 22–25 · 25–20").
 * Lee `marcador_detalle.sets` en orden numérico de set.
 */
export function formatVolleyballSetsLine(detalle: unknown): string | null {
    const d = detalle as Record<string, unknown> | null | undefined;
    if (!d || typeof d !== "object") return null;
    const sets = d.sets;
    if (!sets || typeof sets !== "object") return null;
    const keys = Object.keys(sets as object)
        .map((k) => parseInt(k, 10))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);
    if (keys.length === 0) return null;
    const parts: string[] = [];
    for (const k of keys) {
        const raw =
            (sets as Record<string, unknown>)[String(k)] ?? (sets as Record<string, unknown>)[k];
        if (!raw || typeof raw !== "object") continue;
        const s = raw as Record<string, unknown>;
        const pa = Number(s.puntos_a) || 0;
        const pb = Number(s.puntos_b) || 0;
        parts.push(`${pa}\u2013${pb}`);
    }
    return parts.length > 0 ? parts.join(" \u00B7 ") : null;
}
