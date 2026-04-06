import { useState, useEffect } from "react";
import { Avatar, Button } from "@/components/ui-primitives";
import { Users, Plus, Trash2, ChevronDown, Search, UserCheck, Loader2 } from "lucide-react";
import { getDisplayName } from "@/lib/sport-helpers";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { SPORT_COLORS } from "@/lib/constants";

interface AdminPlayerRosterProps {
    match: any;
    jugadoresA: any[];
    jugadoresB: any[];
    matchId: string;
    onPlayersUpdated: () => void;
    disciplinaName: string;
}

export const AdminPlayerRoster = ({
    match,
    jugadoresA,
    jugadoresB,
    matchId,
    onPlayersUpdated,
    disciplinaName
}: AdminPlayerRosterProps) => {
    const [expanded, setExpanded] = useState(true);
    const [addingTeam, setAddingTeam] = useState<string | null>(null);
    const [form, setForm] = useState({ nombre: '', numero: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [mode, setMode] = useState<'search' | 'manual'>('search');
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [profileNumero, setProfileNumero] = useState('');

    const sportColor = SPORT_COLORS[disciplinaName] || '#6366f1';
    const isColectivo = ['Fútbol', 'Baloncesto', 'Voleibol'].includes(disciplinaName);

    // Debounced search - same pattern as friends-list
    useEffect(() => {
        const q = searchQuery.trim();
        if (q.length < 2) { setSearchResults([]); return; }

        setSearching(true);
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, points')
                .ilike('full_name', `%${q}%`)
                .limit(8);
            setSearchResults(data ?? []);
            setSearching(false);
        }, 350);

        return () => { clearTimeout(timer); setSearching(false); };
    }, [searchQuery]);

    const handleAddFromProfile = async () => {
        if (!addingTeam || !selectedProfile) return;

        try {
            // 1. Find or Create player in 'jugadores'
            let jugador_id;
            const { data: existing } = await supabase
                .from('jugadores')
                .select('id')
                .eq('profile_id', selectedProfile.id)
                .maybeSingle();

            if (existing) {
                jugador_id = existing.id;
            } else {
                const { data: created, error: createError } = await supabase
                    .from('jugadores')
                    .insert({
                        nombre: selectedProfile.full_name,
                        numero: profileNumero ? parseInt(profileNumero) : null,
                        profile_id: selectedProfile.id,
                        carrera_id: addingTeam === 'equipo_a' ? match.carrera_a_id : match.carrera_b_id
                    })
                    .select()
                    .single();
                
                if (createError) throw createError;
                jugador_id = created.id;
            }

            // 2. Link to match in 'roster_partido'
            const { error: rosterError } = await supabase.from('roster_partido').insert({
                partido_id: parseInt(matchId),
                jugador_id: jugador_id,
                equipo_a_or_b: addingTeam
            });

            if (rosterError) throw rosterError;

            toast.success(`${selectedProfile.full_name} añadido`);
            onPlayersUpdated();
        } catch (error: any) {
            console.error("Error al añadir jugador (perfil):", error);
            toast.error(`Error: ${error.message}`);
        }
        resetAddForm();
    };

    const handleAddManual = async () => {
        if (!form.nombre || !addingTeam) return;

        try {
            // 1. Create base player
            const { data: created, error: createError } = await supabase
                .from('jugadores')
                .insert({
                    nombre: form.nombre,
                    numero: form.numero ? parseInt(form.numero) : null,
                    carrera_id: addingTeam === 'equipo_a' ? match.carrera_a_id : match.carrera_b_id
                })
                .select()
                .single();
            
            if (createError) throw createError;

            // 2. Link to match
            const { error: rosterError } = await supabase.from('roster_partido').insert({
                partido_id: parseInt(matchId),
                jugador_id: created.id,
                equipo_a_or_b: addingTeam
            });

            if (rosterError) throw rosterError;

            toast.success("Jugador añadido");
            onPlayersUpdated();
        } catch (error: any) {
            console.error("Error al añadir jugador (manual):", error);
            toast.error(`Error: ${error.message}`);
        }
        resetAddForm();
    };

    const resetAddForm = () => {
        setForm({ nombre: '', numero: '' });
        setAddingTeam(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedProfile(null);
        setProfileNumero('');
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
                        <div className="rounded-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ borderColor: `${sportColor}25`, background: `${sportColor}05` }}>
                            {/* Mode Tabs */}
                            <div className="flex border-b" style={{ borderColor: `${sportColor}10` }}>
                                <button
                                    onClick={() => { setMode('search'); setSelectedProfile(null); }}
                                    className={cn(
                                        "flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all",
                                        mode === 'search' ? "text-white/80" : "text-white/25 hover:text-white/40"
                                    )}
                                    style={mode === 'search' ? { background: `${sportColor}15`, color: sportColor } : {}}
                                >
                                    <Search size={10} className="inline mr-1 -translate-y-px" /> Buscar Perfil
                                </button>
                                <button
                                    onClick={() => { setMode('manual'); setSelectedProfile(null); }}
                                    className={cn(
                                        "flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all",
                                        mode === 'manual' ? "text-white/80" : "text-white/25 hover:text-white/40"
                                    )}
                                    style={mode === 'manual' ? { background: `${sportColor}15`, color: sportColor } : {}}
                                >
                                    <Plus size={10} className="inline mr-1 -translate-y-px" /> Manual
                                </button>
                            </div>

                            <div className="p-3">
                                {mode === 'search' ? (
                                    <div className="space-y-2">
                                        {selectedProfile ? (
                                            /* Profile selected → show confirm + jersey number */
                                            <div className="space-y-2 animate-in fade-in duration-200">
                                                <div className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: `${sportColor}30`, background: `${sportColor}08` }}>
                                                    <Avatar name={selectedProfile.full_name} src={selectedProfile.avatar_url} className="w-8 h-8 shrink-0 border border-white/20" />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[10px] font-bold text-white/80 block truncate">{selectedProfile.full_name}</span>
                                                        <span className="text-[8px] font-bold" style={{ color: `${sportColor}80` }}>Perfil encontrado ✓</span>
                                                    </div>
                                                    <button onClick={() => setSelectedProfile(null)} className="text-[9px] text-white/25 hover:text-white/50">✕</button>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <input
                                                        placeholder="# Camiseta"
                                                        className="w-20 bg-black/20 border rounded-lg px-2 py-2 text-[11px] text-center font-mono font-black focus:outline-none transition-all"
                                                        style={{ borderColor: `${sportColor}20` }}
                                                        value={profileNumero}
                                                        onChange={e => setProfileNumero(e.target.value)}
                                                        autoFocus
                                                        onKeyDown={e => e.key === 'Enter' && handleAddFromProfile()}
                                                    />
                                                    <Button size="sm" onClick={handleAddFromProfile}
                                                        className="flex-1 h-8 text-black font-black text-[9px] uppercase tracking-widest rounded-lg"
                                                        style={{ background: sportColor }}>
                                                        Registrar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Search input */
                                            <>
                                                <div className="relative">
                                                    <input
                                                        placeholder="Buscar por nombre..."
                                                        className="w-full bg-black/20 border rounded-lg px-3 py-2 text-[11px] font-bold focus:outline-none transition-all placeholder:text-white/15"
                                                        style={{ borderColor: `${sportColor}20` }}
                                                        value={searchQuery}
                                                        onChange={e => setSearchQuery(e.target.value)}
                                                        autoFocus
                                                    />
                                                    {searching && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Loader2 size={12} className="animate-spin text-white/30" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="max-h-[160px] overflow-y-auto space-y-1">
                                                    {searchResults.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => { setSelectedProfile(p); setSearchQuery(''); setSearchResults([]); }}
                                                            className="w-full flex items-center gap-2.5 p-2 rounded-lg border hover:border-opacity-50 transition-all text-left"
                                                            style={{ borderColor: `${sportColor}10`, background: `${sportColor}03` }}
                                                        >
                                                            <Avatar name={p.full_name} src={p.avatar_url} className="w-7 h-7 shrink-0 border border-white/10" />
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[10px] font-bold text-white/80 truncate block">{p.full_name}</span>
                                                            </div>
                                                            <Plus size={12} className="shrink-0" style={{ color: `${sportColor}60` }} />
                                                        </button>
                                                    ))}
                                                    {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                                                        <p className="text-[9px] text-white/15 text-center py-3">Sin resultados</p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            placeholder="Nombre del jugador"
                                            className="w-full bg-black/20 border rounded-lg px-3 py-2 text-[11px] font-bold focus:outline-none transition-all placeholder:text-white/15"
                                            style={{ borderColor: `${sportColor}20` }}
                                            value={form.nombre}
                                            onChange={e => setForm({ ...form, nombre: e.target.value })}
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                                        />
                                        <div className="flex gap-1.5">
                                            <input
                                                placeholder="#"
                                                className="w-14 bg-black/20 border rounded-lg px-2 py-2 text-[11px] text-center font-mono font-black focus:outline-none"
                                                style={{ borderColor: `${sportColor}20` }}
                                                value={form.numero}
                                                onChange={e => setForm({ ...form, numero: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && handleAddManual()}
                                            />
                                            <Button size="sm" onClick={handleAddManual}
                                                className="flex-1 h-8 text-black font-black text-[9px] uppercase tracking-widest rounded-lg"
                                                style={{ background: sportColor }}>
                                                Registrar
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={resetAddForm}
                                    className="w-full mt-2 py-1.5 text-[9px] font-bold text-white/20 hover:text-white/40 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setAddingTeam(teamKey); setForm({ nombre: '', numero: '' }); setMode('search'); }}
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
