"use client";

import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { Trophy, Timer } from "lucide-react";
/** Marcador en vivo (cambio de punto): rally en voleibol, total en baloncesto, goles en fútbol. */
function getToastScores(sport: string | undefined, detail: Record<string, unknown> | null | undefined): { a: number; b: number } {
    const d = (detail || {}) as Record<string, any>;
    if (!sport) {
        return {
            a: Number(d.goles_a ?? d.sets_a ?? d.total_a ?? d.puntos_a ?? 0),
            b: Number(d.goles_b ?? d.sets_b ?? d.total_b ?? d.puntos_b ?? 0),
        };
    }
    if (sport === "Fútbol" || sport === "Futsal") {
        return { a: Number(d.goles_a ?? 0), b: Number(d.goles_b ?? 0) };
    }
    if (sport === "Baloncesto") {
        return { a: Number(d.total_a ?? d.puntos_a ?? 0), b: Number(d.total_b ?? d.puntos_b ?? 0) };
    }
    if (sport === "Voleibol") {
        return { a: Number(d.total_a ?? d.puntos_a ?? 0), b: Number(d.total_b ?? d.puntos_b ?? 0) };
    }
    if (sport === "Tenis" || sport === "Tenis de Mesa") {
        const set = Number(d.set_actual ?? 1);
        const cur = (d.sets?.[set] ?? d.sets?.[String(set)] ?? {}) as Record<string, any>;
        return {
            a: Number(cur.juegos_a ?? d.games_a ?? d.total_a ?? 0),
            b: Number(cur.juegos_b ?? d.games_b ?? d.total_b ?? 0),
        };
    }
    return {
        a: Number(d.goles_a ?? d.sets_a ?? d.total_a ?? d.puntos_a ?? 0),
        b: Number(d.goles_b ?? d.sets_b ?? d.total_b ?? d.puntos_b ?? 0),
    };
}

/** Marcador al finalizar partido (sets en voleibol/tenis, no puntos del rally). */
function getFinalResultScores(sport: string | undefined, detail: Record<string, unknown> | null | undefined): { a: number; b: number } {
    const d = (detail || {}) as Record<string, any>;
    if (sport === "Voleibol" || sport === "Tenis" || sport === "Tenis de Mesa") {
        return {
            a: Number(d.sets_a ?? d.sets_total_a ?? d.goles_a ?? 0),
            b: Number(d.sets_b ?? d.sets_total_b ?? d.goles_b ?? 0),
        };
    }
    if (sport === "Baloncesto") {
        return { a: Number(d.total_a ?? d.puntos_a ?? 0), b: Number(d.total_b ?? d.puntos_b ?? 0) };
    }
    if (sport === "Fútbol" || sport === "Futsal") {
        return { a: Number(d.goles_a ?? 0), b: Number(d.goles_b ?? 0) };
    }
    const a = Number(d.goles_a ?? d.sets_a ?? d.total_a ?? d.puntos_a ?? 0);
    const b = Number(d.goles_b ?? d.sets_b ?? d.total_b ?? d.puntos_b ?? 0);
    return { a, b };
}

function toastMetaForSport(sport: string | undefined): { term: string; emoji: string } {
    switch (sport) {
        case "Fútbol":
        case "Futsal":
            return { term: "¡Gol", emoji: "⚽" };
        case "Baloncesto":
            return { term: "¡Anotación", emoji: "🏀" };
        case "Voleibol":
            return { term: "¡Punto", emoji: "🏐" };
        case "Tenis":
            return { term: "¡Punto", emoji: "🎾" };
        case "Tenis de Mesa":
            return { term: "¡Punto", emoji: "🏓" };
        default:
            return { term: "¡Punto", emoji: "✨" };
    }
}

/** Si aún no cargó el mapa de disciplinas, infiere por forma del marcador (sin usar solo `goles_a`). */
function inferSportFromDetail(detail: Record<string, unknown> | null | undefined): string | undefined {
    const d = (detail || {}) as Record<string, any>;
    if (d.cuartos && typeof d.cuartos === "object" && Object.keys(d.cuartos).length > 0) return "Baloncesto";
    if (d.tiempos && typeof d.tiempos === "object" && Object.keys(d.tiempos).length > 0) return "Fútbol";
    const sets = d.sets;
    if (sets && typeof sets === "object") {
        const firstKey = Object.keys(sets).sort((a, b) => Number(a) - Number(b))[0];
        const first = firstKey ? sets[firstKey] : null;
        if (first && typeof first === "object" && ("juegos_a" in first || "juegos_b" in first)) {
            return "Tenis";
        }
        if (first && typeof first === "object" && ("puntos_a" in first || "puntos_b" in first)) return "Voleibol";
    }
    if (d.fase_futbol !== undefined || (d.goles_a !== undefined && !d.sets && !d.cuartos)) return "Fútbol";
    return undefined;
}

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
    const disciplineNamesRef = useRef<Map<string, string>>(new Map());

    // Request notification permission once
    useEffect(() => {
        if (!hasRequested.current) {
            hasRequested.current = true;
            requestNotificationPermission();
        }
    }, []);

    useEffect(() => {
        if (isAdmin) return;

        let cancelled = false;
        void supabase
            .from("disciplinas")
            .select("id, name")
            .then(({ data }) => {
                if (cancelled || !data) return;
                const m = new Map<string, string>();
                for (const row of data as { id: string; name: string }[]) {
                    m.set(row.id, row.name);
                }
                disciplineNamesRef.current = m;
            });

        const resolveSport = (disciplinaId: string | undefined) => {
            if (!disciplinaId) return undefined;
            return disciplineNamesRef.current.get(disciplinaId);
        };

        const channel = supabase
            .channel("global_alerts")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "partidos" },
                (payload) => {
                    const newItem = payload.new as Record<string, any>;
                    const oldItem = payload.old as Record<string, any>;

                    // Caso 1: Cambio de estado
                    if (newItem.estado !== oldItem.estado) {
                        if (newItem.estado === "en_curso") {
                            const title = `¡Comenzó el partido!`;
                            const body = `${newItem.equipo_a} vs ${newItem.equipo_b}`;
                            toast.success(title, {
                                description: body,
                                icon: <Timer className="w-5 h-5" />,
                                duration: 5000,
                            });
                            sendNativeNotification(title, body);
                        } else if (newItem.estado === "finalizado") {
                            const md = newItem.marcador_detalle || {};
                            const sport =
                                resolveSport(newItem.disciplina_id) ?? inferSportFromDetail(md);
                            const { a: sA, b: sB } = getFinalResultScores(sport, md);
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
                                duration: 8000,
                            });
                            sendNativeNotification(title, body);
                        }
                        return;
                    }

                    // Caso 2: Cambio de marcador
                    if (newItem.estado === "finalizado") return;

                    const oldDetail = oldItem?.marcador_detalle || {};
                    const newDetail = newItem?.marcador_detalle || {};
                    const sport =
                        resolveSport(newItem.disciplina_id) ??
                        inferSportFromDetail(newDetail) ??
                        inferSportFromDetail(oldDetail);

                    const { a: scoreA_Old, b: scoreB_Old } = getToastScores(sport, oldDetail);
                    const { a: scoreA_New, b: scoreB_New } = getToastScores(sport, newDetail);

                    const { term, emoji } = toastMetaForSport(sport);

                    if (scoreA_New > scoreA_Old) {
                        const title = `${term} para ${newItem.equipo_a}!`;
                        const body = `Marcador: ${scoreA_New} - ${scoreB_New}`;
                        toast(title, {
                            description: body,
                            icon: <span className="text-xl">{emoji}</span>,
                            style: { borderColor: "rgba(234, 179, 8, 0.5)" },
                        });
                        sendNativeNotification(title, body);
                    } else if (scoreB_New > scoreB_Old) {
                        const title = `${term} para ${newItem.equipo_b}!`;
                        const body = `Marcador: ${scoreA_New} - ${scoreB_New}`;
                        toast(title, {
                            description: body,
                            icon: <span className="text-xl">{emoji}</span>,
                            style: { borderColor: "rgba(234, 179, 8, 0.5)" },
                        });
                        sendNativeNotification(title, body);
                    }
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [isAdmin]);

    return <Toaster position="top-right" theme="dark" richColors closeButton />;
}

