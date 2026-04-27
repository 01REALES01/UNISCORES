import { supabase } from "./supabase";
import type { Profile } from "@/modules/users/types";

export type AuditAction =
    | 'CREATE_MATCH' | 'UPDATE_MATCH' | 'DELETE_MATCH' | 'START_MATCH' | 'FINALIZE_MATCH'
    | 'UPDATE_SCORE' | 'CHANGE_PERIOD'
    | 'ADD_EVENT' | 'DELETE_EVENT'
    | 'ADD_PLAYER'
    | 'CREATE_NEWS' | 'UPDATE_NEWS' | 'DELETE_NEWS' | 'TOGGLE_PUBLISH' | 'CREATE_IG_POST'
    | 'UPDATE_ROLE' | 'UPDATE_ATHLETE_SPORT' | 'DELETE_USER'
    | 'IMPORT_EXCEL' | 'SET_CLASIFICACION'
    | 'OTHER';

export type AuditEntity = 'partido' | 'evento' | 'usuario' | 'noticia' | 'jugador' | 'config';

export interface AuditLogPayload {
    admin_id: string;
    admin_name: string;
    admin_email: string;
    action_type: AuditAction;
    entity_type: AuditEntity;
    entity_id?: string;
    details?: Record<string, any>;
    ip_address?: string;
}

/**
 * Low-level function to log an admin action to Supabase.
 */
export async function logAdminAction(payload: AuditLogPayload) {
    try {
        const { error } = await supabase
            .from('admin_audit_logs')
            .insert(payload);
        
        if (error) {
            console.error('[logAdminAction] error:', error.message);
        }
    } catch (err) {
        console.error('[logAdminAction] crash:', err);
    }
}

/**
 * Helper to prepare a payload from an active profile.
 */
export function createAuditPayload(
    profile: Profile,
    action: AuditAction,
    entity: AuditEntity,
    entityId?: string,
    details?: Record<string, any>
): AuditLogPayload {
    return {
        admin_id: profile.id,
        admin_name: profile.full_name || profile.email,
        admin_email: profile.email,
        action_type: action,
        entity_type: entity,
        entity_id: entityId,
        details: details || {},
    };
}
