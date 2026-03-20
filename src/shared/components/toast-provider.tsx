"use client";

import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { Zap, Trophy, Timer } from "lucide-react";

/**
 * Send a native browser notification (only when tab is not active).
 * Falls back silently if permission is not granted.
 */
function sendNativeNotification(title: string, body: string, icon?: string) {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    // Only send native notification when tab is NOT focused
    if (document.visibilityState === "visible") return;

    try {
        new Notification(title, {
            body,
            icon: icon || "/uninorte_logo.png",
            badge: "/icon-192.png",
            tag: `olimpiadas-${Date.now()}`,
        });
    } catch {
        // Silent fail (e.g. iOS restrictions)
    }
}

/**
 * Request notification permission once.
 * Only asks if the user hasn't been prompted yet.
 */
function requestNotificationPermission() {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
        // Small delay so page loads first
        setTimeout(() => {
            Notification.requestPermission();
        }, 5000);
    }
}

export function ToastProvider() {
    const pathname = usePathname();
    // Evitar toasts en admin para no spamear al operador
    const isAdmin = pathname?.startsWith("/admin");
    const hasRequested = useRef(false);

    // Request notification permission once
    useEffect(() => {
        if (!hasRequested.current) {
            hasRequested.current = true;
            requestNotificationPermission();
        }
    }, []);

    useEffect(() => {
        if (isAdmin) return;

        console.log("🔔 Iniciando sistema de notificaciones en tiempo real...");

        const channel = supabase
            .channel('global_alerts')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'partidos' },
                (payload) => {
                    const newItem = payload.new as any;
                    const oldItem = payload.old as any;

                    // Caso 1: Cambio de estado
                    if (newItem.estado !== oldItem.estado) {
                        if (newItem.estado === 'en_curso') {
                            const title = `¡Comenzó el partido!`;
                            const body = `${newItem.equipo_a} vs ${newItem.equipo_b}`;
                            toast.success(title, {
                                description: body,
                                icon: <Timer className="w-5 h-5" />,
                                duration: 5000
                            });
                            sendNativeNotification(title, body);
                        } else if (newItem.estado === 'finalizado') {
                            const md = newItem.marcador_detalle || {};
                            const sA = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
                            const sB = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
                            let winnerText: string;
                            if (sA > sB) {
                                winnerText = `${newItem.equipo_a} ganó ${sA}-${sB}`;
                            } else if (sB > sA) {
                                winnerText = `${newItem.equipo_b} ganó ${sB}-${sA}`;
                            } else {
                                winnerText = `Empate ${sA}-${sB}`;
                            }
                            const title = `Partido Finalizado`;
                            const body = `${newItem.equipo_a} vs ${newItem.equipo_b} — ${winnerText}`;
                            toast.info(title, {
                                description: body,
                                icon: <Trophy className="w-5 h-5 text-[#FFC000]" />,
                                duration: 8000
                            });
                            sendNativeNotification(title, body);
                        }
                        return;
                    }

                    // Caso 2: Cambio de marcador
                    const oldDetail = oldItem?.marcador_detalle || {};
                    const newDetail = newItem?.marcador_detalle || {};

                    const scoreA_Old = oldDetail.goles_a || oldDetail.sets_a || oldDetail.total_a || 0;
                    const scoreA_New = newDetail.goles_a || newDetail.sets_a || newDetail.total_a || 0;

                    const scoreB_Old = oldDetail.goles_b || oldDetail.sets_b || oldDetail.total_b || 0;
                    const scoreB_New = newDetail.goles_b || newDetail.sets_b || newDetail.total_b || 0;

                    if (scoreA_New > scoreA_Old) {
                        const title = `¡Punto para ${newItem.equipo_a}!`;
                        const body = `Marcador: ${scoreA_New} - ${scoreB_New}`;
                        toast(title, {
                            description: body,
                            icon: <Zap className="w-5 h-5 text-[#FFC000]" />,
                            style: { borderColor: 'rgba(234, 179, 8, 0.5)' }
                        });
                        sendNativeNotification(title, body);
                    } else if (scoreB_New > scoreB_Old) {
                        const title = `¡Punto para ${newItem.equipo_b}!`;
                        const body = `Marcador: ${scoreA_New} - ${scoreB_New}`;
                        toast(title, {
                            description: body,
                            icon: <Zap className="w-5 h-5 text-[#FFC000]" />,
                            style: { borderColor: 'rgba(234, 179, 8, 0.5)' }
                        });
                        sendNativeNotification(title, body);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isAdmin]);

    return <Toaster position="top-right" theme="dark" richColors closeButton />;
}

