import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";
import { logAdminAction, type AuditAction, type AuditEntity } from "@/lib/audit-logger";

/**
 * Hook to simplify logging actions from the admin panel.
 * Automatically injects the current user's profile information.
 */
export function useAuditLogger() {
    const { profile } = useAuth();

    const logAction = useCallback(async (
        action: AuditAction,
        entity: AuditEntity,
        entityId?: string | number,
        details?: Record<string, any>
    ) => {
        if (!profile) return;

        await logAdminAction({
            admin_id: profile.id,
            admin_name: profile.full_name || profile.email,
            admin_email: profile.email,
            action_type: action,
            entity_type: entity,
            entity_id: entityId?.toString(),
            details: details || {},
        });
    }, [profile]);

    return { logAction };
}
