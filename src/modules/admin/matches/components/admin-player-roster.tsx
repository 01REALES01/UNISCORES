import { useState } from "react";
import { Avatar } from "@/components/ui-primitives";
import { Users, Plus, Trash2, ChevronDown, UserCheck } from "lucide-react";
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
    matchId,
    onPlayersUpdated,
    disciplinaName,
    onAddPlayer
}: AdminPlayerRosterProps) => {
    const [expanded, setExpanded] = useState(true);
    const [addingTeam, setAddingTeam] = useState<string | null>(null);

    const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';
    const isColectivo = ['Fútbol', 'Baloncesto', 'Voleibol'].includes(disciplinaName);


    const resetAddForm = () => {
        setAddingTeam(null);
    };

    const handleDelete = async (player: any) => {
        // Delete only from roster, NOT from jugadores base table
        const rosterId = player.roster_id;
        if (!rosterId) {
            toast.error("Error: ID de roster no encontrado");
            return;
        }

        const { error } = await supabase.from('roster_partido').delete().eq('id', rosterId);
        if (!error) {
            toast.success("Jugador eliminado del partido");
            onPlayersUpdated();
        } else {
            toast.error(`Error al eliminar: ${error.message}`);
        }
    };

    const TeamColumn = ({ players, side }: { players: any[], side: 'a' | 'b' }) => {
        const teamKey = side === 'a' ? 'equipo_a' : 'equipo_b';
        const isAdding = addingTeam === teamKey;

        return (
            <div className="flex-1 min-w-0">
                {/* Team Header */}
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b" style={{ borderColor: `${sportColor}15` }}>
                    <Avatar
                        name={getDisplayName(match, side)}
                        src={side === 'a' ? match.carrera_a?.escudo_url : match.carrera_b?.escudo_url}
                        className="w-7 h-7 shrink-0 border border-white/20"
                    />
                    <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/70 truncate block">
                            {getDisplayName(match, side)}
                        </span>
                        <span className="text-[9px] font-bold text-white/20">{players.length} jugadores</span>
                    </div>
                </div>

                {/* Player List */}
                <div className="space-y-1 mb-3">
                    {players.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-xl border group/p hover:bg-white/[0.04] transition-all"
                            style={{ borderColor: `${sportColor}08`, background: `${sportColor}03` }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-black shrink-0 border"
                                style={{ borderColor: `${sportColor}20`, background: `${sportColor}08`, color: `${sportColor}90`}}>
                                {p.numero || idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-bold text-white/70 truncate block">{p.nombre}</span>
                                {p.profile_id && (
                                    <span className="text-[8px] font-bold flex items-center gap-0.5" style={{ color: `${sportColor}80` }}>
                                        <UserCheck size={7} /> Perfil vinculado
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => handleDelete(p)}
                                className="p-1.5 rounded-lg text-white/0 group-hover/p:text-white/20 hover:!text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {players.length === 0 && (
                        <div className="py-6 text-center rounded-xl border border-dashed" style={{ borderColor: `${sportColor}10` }}>
                            <Users size={16} className="mx-auto mb-1.5 text-white/10" />
                            <p className="text-[9px] font-bold text-white/15">Sin jugadores</p>
                        </div>
                    )}
                </div>

                {/* Add Player */}
                {!isColectivo && (
                    isAdding ? (
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
                            onClick={() => { setAddingTeam(teamKey); }}
                            className="w-full py-2.5 rounded-xl border border-dashed text-[9px] font-black text-white/20 uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                            style={{ borderColor: `${sportColor}15` }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = `${sportColor}40`; e.currentTarget.style.color = sportColor; e.currentTarget.style.background = `${sportColor}08`; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = `${sportColor}15`; e.currentTarget.style.color = ''; e.currentTarget.style.background = ''; }}
                        >
                            <Plus size={10} /> Añadir Jugador
                        </button>
                    )
                )}
            </div>
        );
    };

    return (
        <div className="mt-8 rounded-[2rem] border overflow-hidden backdrop-blur-sm"
            style={{ borderColor: `${sportColor}10`, background: `linear-gradient(to bottom, ${sportColor}06, transparent)` }}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner border"
                        style={{ background: `${sportColor}15`, borderColor: `${sportColor}25` }}>
                        <Users size={16} style={{ color: sportColor }} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Plantilla de Jugadores</h3>
                        <p className="text-[9px] font-bold text-white/20 mt-0.5">{jugadoresA.length + jugadoresB.length} registrados</p>
                    </div>
                </div>
                <div className={cn("w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center transition-transform", expanded ? "rotate-180" : "")}>
                    <ChevronDown size={14} className="text-white/30" />
                </div>
            </button>

            {expanded && (
                <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t" style={{ borderColor: `${sportColor}08` }}>
                        <TeamColumn players={jugadoresA} side="a" />
                        <TeamColumn players={jugadoresB} side="b" />
                    </div>
                </div>
            )}
        </div>
    );
};
