import type { Profile } from '@/modules/users/types';

export type UltimaEdicion = {
    user_id: string;
    nombre: string;
    email: string;
    role: string; // We'll keep it as string for DB compatibility, store joined roles
    fecha: string;
};

/**
 * Stamps audit information onto marcador_detalle.
 * Returns a new detalle object with `ultima_edicion` set.
 * If profile is null/undefined, returns detalle unchanged (safety guard).
 */
export function stampAudit(
    currentDetalle: Record<string, any> | null | undefined,
    profile: Profile | null | undefined
): Record<string, any> {
    const detalle = currentDetalle || {};

    if (!profile) return detalle;

    return {
        ...detalle,
        ultima_edicion: {
            user_id: profile.id,
            nombre: profile.full_name || profile.email,
            email: profile.email,
            role: (profile.roles || ['public']).join(', '),
            fecha: new Date().toISOString(),
        } satisfies UltimaEdicion,
    };
}

export type UltimaEdicionDisplay = {
    nombre: string;
    fecha: string;
    relativo: string;
};

function relativoDesdeFecha(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Justo ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffH < 24) return `hace ${diffH}h`;
    if (diffD < 7) return `hace ${diffD}d`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function fechaLegibleEsCo(date: Date): string {
    return date.toLocaleString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formats the "last edited by" info for display.
 * Returns null if no audit data exists.
 */
export function formatUltimaEdicion(detalle: Record<string, any> | null | undefined): UltimaEdicionDisplay | null {
    const ue = detalle?.ultima_edicion as UltimaEdicion | undefined;
    if (!ue?.fecha) return null;

    const date = new Date(ue.fecha);
    if (Number.isNaN(date.getTime())) return null;

    return {
        nombre: ue.nombre,
        fecha: fechaLegibleEsCo(date),
        relativo: relativoDesdeFecha(date),
    };
}

/**
 * Admin partido: misma UI que antes del merge — prioriza `ultima_edicion` en JSON,
 * si no existe usa `ultimo_update` del marcador o `updated_at` de la fila `partidos`.
 */
export function formatUltimaEdicionAdmin(match: {
    marcador_detalle?: Record<string, any> | null;
    updated_at?: string | null;
}): UltimaEdicionDisplay | null {
    const fromDetalle = formatUltimaEdicion(match.marcador_detalle);
    if (fromDetalle) return fromDetalle;

    const ultimo = match.marcador_detalle?.ultimo_update;
    if (typeof ultimo === 'string' && ultimo.trim()) {
        const date = new Date(ultimo);
        if (!Number.isNaN(date.getTime())) {
            return {
                nombre: 'Marcador',
                fecha: fechaLegibleEsCo(date),
                relativo: relativoDesdeFecha(date),
            };
        }
    }

    const ua = match.updated_at;
    if (typeof ua === 'string' && ua.trim()) {
        const date = new Date(ua);
        if (!Number.isNaN(date.getTime())) {
            return {
                nombre: 'Partido',
                fecha: fechaLegibleEsCo(date),
                relativo: relativoDesdeFecha(date),
            };
        }
    }

    return null;
}
/**
 * Stamps audit info into a JSON string for the `descripcion` column in olympics_eventos.
 */
export function stampEventAudit(
    text: string | null | undefined,
    profile: Profile | null | undefined,
    extra?: Record<string, unknown>
): string {
    const auditObj = {
        autor: profile ? {
            nombre: profile.full_name || profile.email,
            email: profile.email,
            role: (profile.roles || ['public']).join(', '),
        } : null,
        fecha: new Date().toISOString(),
        texto: text || '',
        ...extra,
    };

    return JSON.stringify(auditObj);
}

/** Extrae coordenadas de tiro del campo `descripcion` de un evento. */
export function parseShotCoords(descripcion: string | null | undefined): { x: number; y: number; resultado: 'anotado' | 'fallado'; tipo_tiro: '2pt' | '3pt' | 'tl' } | null {
    if (!descripcion) return null;
    try {
        const parsed = JSON.parse(descripcion);
        if (parsed.x !== undefined && parsed.y !== undefined && parsed.resultado) {
            return { x: parsed.x, y: parsed.y, resultado: parsed.resultado, tipo_tiro: parsed.tipo_tiro || '2pt' };
        }
    } catch {}
    return null;
}

export type EventAudit = {
    autor: {
        nombre: string;
        email: string;
        role: string;
    } | null;
    fecha: string;
    texto: string;
};

/**
 * Safely parses event audit from the `descripcion` column.
 * Returns a semi-structured object even for legacy plain-text descriptions.
 */
export function parseEventAudit(descripcion: string | null | undefined): EventAudit {
    if (!descripcion) {
        return { autor: null, fecha: '', texto: '' };
    }

    try {
        // Check if it's a JSON string
        if (descripcion.trim().startsWith('{') && descripcion.trim().endsWith('}')) {
            const parsed = JSON.parse(descripcion);
            if (parsed.autor || parsed.fecha) {
                return parsed as EventAudit;
            }
        }
    } catch (e) {
        // Fallback to plain text
    }

    return {
        autor: null,
        fecha: '',
        texto: descripcion,
    };
}
