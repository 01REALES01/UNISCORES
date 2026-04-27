import { useState } from "react";
import { Avatar } from "@/components/ui-primitives";
import { Users, Plus, Trash2, ChevronDown, UserCheck, Star } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { SPORT_COLORS } from "@/lib/constants";
import { PlayerSearchForm } from "./player-search-form";

interface AdminPlayerRosterProps {
    match: any;
    jugadoresA: any[];
    jugadoresB: any[];
    matchId: string;
    onPlayersUpdated: () => void;
    disciplinaName: string;
    onAddPlayer?: (team: string, data: any) => Promise<number | null>;
}

export const AdminPlayerRoster = ({
    match,
    jugadoresA,
    jugadoresB,
    matchId: _matchId,
    onPlayersUpdated,
    disciplinaName,
    onAddPlayer,
}: AdminPlayerRosterProps) => {
    void _matchId;
    const [expanded, setExpanded] = useState(true);
    const [addingTeam, setAddingTeam] = useState<string | null>(null);

    const sportColor = SPORT_COLORS[disciplinaName] || "#6366f1";
    const isColectivo = ["Fútbol", "Baloncesto", "Voleibol"].includes(disciplinaName);

    const resetAddForm = () => {
        setAddingTeam(null);
    };

    const handleToggleTitular = async (player: any) => {
        const rosterId = player.roster_id;
        if (!rosterId) return;
        const { error } = await supabase
            .from("roster_partido")
            .update({ es_titular: !player.es_titular })
            .eq("id", rosterId);
        if (!error) {
            onPlayersUpdated();
        } else {
            toast.error(`Error: ${error.message}`);
        }
    };

    const handleDelete = async (player: any) => {
        const rosterId = player.roster_id;
        if (!rosterId) {
            toast.error("Error: ID de roster no encontrado");
            return;
        }

        const { error } = await supabase.from("roster_partido").delete().eq("id", rosterId);
        if (!error) {
            toast.success("Jugador eliminado del partido");
            onPlayersUpdated();
        } else {
            toast.error(`Error al eliminar: ${error.message}`);
        }
    };

    const TeamColumn = ({ players, side }: { players: any[]; side: "a" | "b" }) => {
        const teamKey = side === "a" ? "equipo_a" : "equipo_b";
        const isAdding = addingTeam === teamKey;

        return (
            <div className="min-w-0 flex-1">
                <div
                    className="mb-4 flex items-center gap-2.5 border-b pb-3"
                    style={{ borderColor: `${sportColor}15` }}
                >
                    <Avatar
                        name={getDisplayName(match, side)}
                        src={side === "a" ? match.carrera_a?.escudo_url : match.carrera_b?.escudo_url}
                        className="h-7 w-7 shrink-0 border border-white/20"
                    />
                    <div className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-black uppercase tracking-wider text-white/70">
                            {getDisplayName(match, side)}
                        </span>
                        <span className="text-[9px] font-bold text-white/20">{players.length} jugadores</span>
                    </div>
                </div>

                <div className="mb-3 space-y-1">
                    {players.map((p, idx) => (
                        <div
                            key={p.id}
                            className="group/p flex items-center gap-2 rounded-xl border px-3 py-2 transition-all hover:bg-white/[0.04]"
                            style={{ borderColor: `${sportColor}08`, background: `${sportColor}03` }}
                        >
                            <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-black"
                                style={{
                                    borderColor: `${sportColor}20`,
                                    background: `${sportColor}08`,
                                    color: `${sportColor}90`,
                                }}
                            >
                                {p.numero || idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="block truncate text-[11px] font-bold text-white/70">{p.nombre}</span>
                                {p.profile_id && (
                                    <span
                                        className="flex items-center gap-0.5 text-[8px] font-bold"
                                        style={{ color: `${sportColor}80` }}
                                    >
                                        <UserCheck size={7} /> Perfil vinculado
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                title={p.es_titular ? "Quitar titular" : "Marcar titular"}
                                onClick={() => void handleToggleTitular(p)}
                                className={cn(
                                    "shrink-0 rounded-lg p-1.5 transition-all",
                                    p.es_titular
                                        ? "text-emerald-400 hover:text-emerald-300"
                                        : "text-white/0 group-hover/p:text-white/20 hover:!text-white/50"
                                )}
                            >
                                <Star size={12} className={p.es_titular ? "fill-current" : ""} />
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDelete(p)}
                                className="shrink-0 rounded-lg p-1.5 text-white/0 transition-all hover:bg-rose-500/10 group-hover/p:text-white/20 hover:!text-rose-500"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div
                            className="rounded-xl border border-dashed py-6 text-center"
                            style={{ borderColor: `${sportColor}10` }}
                        >
                            <Users size={16} className="mx-auto mb-1.5 text-white/10" />
                            <p className="text-[9px] font-bold text-white/15">Sin jugadores</p>
                        </div>
                    )}
                </div>

                {!isColectivo &&
                    (isAdding ? (
                        <div className="animate-in fade-in zoom-in-95 duration-200">
                            <PlayerSearchForm
                                match={match}
                                team={teamKey}
                                sportColor={sportColor}
                                onSelect={async (data) => {
                                    await onAddPlayer?.(teamKey, data);
                                    resetAddForm();
                                }}
                                onCancel={resetAddForm}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAddingTeam(teamKey)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-[9px] font-black uppercase tracking-widest text-white/20 transition-all"
                            style={{ borderColor: `${sportColor}15` }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = `${sportColor}40`;
                                e.currentTarget.style.color = sportColor;
                                e.currentTarget.style.background = `${sportColor}08`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = `${sportColor}15`;
                                e.currentTarget.style.color = "";
                                e.currentTarget.style.background = "";
                            }}
                        >
                            <Plus size={10} /> Añadir Jugador
                        </button>
                    ))}
            </div>
        );
    };

    return (
        <div
            className="mt-8 overflow-hidden rounded-[2rem] border backdrop-blur-sm"
            style={{
                borderColor: `${sportColor}10`,
                background: `linear-gradient(to bottom, ${sportColor}06, transparent)`,
            }}
        >
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl border shadow-inner"
                        style={{ background: `${sportColor}15`, borderColor: `${sportColor}25` }}
                    >
                        <Users size={16} style={{ color: sportColor }} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
                            Plantilla de Jugadores
                        </h3>
                        <p className="mt-0.5 text-[9px] font-bold text-white/20">
                            {jugadoresA.length + jugadoresB.length} registrados
                            {" · "}
                            {[...jugadoresA, ...jugadoresB].filter(j => j.es_titular).length} titulares
                        </p>
                    </div>
                </div>
                <div
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 transition-transform",
                        expanded ? "rotate-180" : ""
                    )}
                >
                    <ChevronDown size={14} className="text-white/30" />
                </div>
            </button>

            {expanded && (
                <div className="animate-in fade-in slide-in-from-top-1 px-6 pb-6 duration-200">
                    <div
                        className="grid grid-cols-1 gap-6 border-t pt-2 sm:grid-cols-2"
                        style={{ borderColor: `${sportColor}08` }}
                    >
                        <TeamColumn players={jugadoresA} side="a" />
                        <TeamColumn players={jugadoresB} side="b" />
                    </div>
                </div>
            )}
        </div>
    );
};
