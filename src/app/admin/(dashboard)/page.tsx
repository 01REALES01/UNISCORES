"use client";

import { Card } from "@/components/ui-primitives";
import { Activity, Calendar, Trophy, Users } from "lucide-react";

export default function AdminDashboard() {
    const stats = [
        { name: "Partidos en Vivo", value: "3", icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
        { name: "Total Partidos", value: "24", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
        { name: "Disciplinas", value: "7", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10" },
        { name: "Usuarios Activos", value: "12", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Resumen de la actividad de las Olimpiadas UNINORTE.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.name} className="flex items-center p-4 space-x-4 border-border/60 hover:border-border transition-colors">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                            <h3 className="text-2xl font-bold">{stat.value}</h3>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 p-6">
                    <h3 className="text-lg font-semibold mb-4">Actividad Reciente</h3>
                    <div className="space-y-4">
                        <div className="h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                            Gráfico de actividad (Próximamente)
                        </div>
                    </div>
                </Card>

                <Card className="col-span-3 p-6">
                    <h3 className="text-lg font-semibold mb-4">Partidos de Hoy</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">No hay partidos programados para hoy.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
