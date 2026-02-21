"use client";

import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { Zap, Trophy, Timer } from "lucide-react";

export function ToastProvider() {
    const pathname = usePathname();
    // Evitar toasts en admin para no spamear al operador
    const isAdmin = pathname?.startsWith("/admin");

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

                    // Si no hay oldItem completo (REPLICA IDENTITY DEFAULT), no podemos comparar
                    // Pero intentemos inferir o mostrar mensaje genérico si es importante.

                    // Caso 1: Cambio de estado
                    if (newItem.estado !== oldItem.estado) {
                        if (newItem.estado === 'en_vivo') {
                            toast.success(`¡Comenzó el partido!`, {
                                description: `${newItem.equipo_a} vs ${newItem.equipo_b}`,
                                icon: <Timer className="w-5 h-5" />,
                                duration: 5000
                            });
                        } else if (newItem.estado === 'finalizado') {
                            toast.info(`Partido Finalizado`, {
                                description: `Ganador: ${newItem.ganador || 'Empate'}`,
                                icon: <Trophy className="w-5 h-5 text-[#FFC000]" />,
                                duration: 8000
                            });
                        }
                        return; // Prioridad al cambio de estado
                    }

                    // Caso 2: Cambio de marcador (Solo si tenemos datos viejos para comparar, o si asumimos que UPDATE = cambio)
                    // Si activamos REPLICA IDENTITY FULL, oldItem tendrá todo.
                    // Si no, oldItem solo tiene ID.

                    const oldDetail = oldItem?.marcador_detalle || {};
                    const newDetail = newItem?.marcador_detalle || {};

                    // Detectar Goles/Puntos (Genérico)
                    // Asumimos estructura { goles_a, goles_b } o { sets_a, sets_b } o { total_a, total_b }
                    const scoreA_Old = oldDetail.goles_a || oldDetail.sets_a || oldDetail.total_a || 0;
                    const scoreA_New = newDetail.goles_a || newDetail.sets_a || newDetail.total_a || 0;

                    const scoreB_Old = oldDetail.goles_b || oldDetail.sets_b || oldDetail.total_b || 0;
                    const scoreB_New = newDetail.goles_b || newDetail.sets_b || newDetail.total_b || 0;

                    if (scoreA_New > scoreA_Old) {
                        toast(`¡Punto para ${newItem.equipo_a}!`, {
                            description: `Marcador: ${scoreA_New} - ${scoreB_New}`,
                            icon: <Zap className="w-5 h-5 text-[#FFC000]" />,
                            style: { borderColor: 'rgba(234, 179, 8, 0.5)' }
                        });
                    } else if (scoreB_New > scoreB_Old) {
                        toast(`¡Punto para ${newItem.equipo_b}!`, {
                            description: `Marcador: ${scoreA_New} - ${scoreB_New}`,
                            icon: <Zap className="w-5 h-5 text-[#FFC000]" />,
                            style: { borderColor: 'rgba(234, 179, 8, 0.5)' }
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isAdmin]);

    return <Toaster position="top-right" theme="dark" richColors closeButton />;
}
