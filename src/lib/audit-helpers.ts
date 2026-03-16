import type { Profile } from '@/hooks/useAuth';

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

/**
 * Formats the "last edited by" info for display.
 * Returns null if no audit data exists.
 */
export function formatUltimaEdicion(detalle: Record<string, any> | null | undefined): {
    nombre: string;
    fecha: string;
    relativo: string;
} | null {
    const ue = detalle?.ultima_edicion as UltimaEdicion | undefined;
    if (!ue?.fecha) return null;

    const date = new Date(ue.fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    let relativo: string;
    if (diffMin < 1) relativo = 'Justo ahora';
    else if (diffMin < 60) relativo = `hace ${diffMin}m`;
    else if (diffH < 24) relativo = `hace ${diffH}h`;
    else if (diffD < 7) relativo = `hace ${diffD}d`;
    else relativo = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

    return {
        nombre: ue.nombre,
        fecha: date.toLocaleString('es-CO', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }),
        relativo,
    };
}
/**
 * Stamps audit info into a JSON string for the `descripcion` column in olympics_eventos.
 */
export function stampEventAudit(
    text: string | null | undefined,
    profile: Profile | null | undefined
): string {
    const auditObj = {
        autor: profile ? {
            nombre: profile.full_name || profile.email,
            email: profile.email,
            role: (profile.roles || ['public']).join(', '),
        } : null,
        fecha: new Date().toISOString(),
        texto: text || '',
    };

    return JSON.stringify(auditObj);
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
