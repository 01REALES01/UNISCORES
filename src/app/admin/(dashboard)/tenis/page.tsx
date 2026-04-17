"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Swords, AlertCircle, X, Search, Loader2, UserCircle, XCircle } from "lucide-react";

const PHASES = ['primera_ronda', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'] as const;
type Phase = typeof PHASES[number];

const PHASE_LABELS: Record<Phase, string> = {
    primera_ronda: '1ª Ronda',
    dieciseisavos: 'Dieciseisavos',
    octavos: 'Octavos',
    cuartos: 'Cuartos',
    semifinal: 'Semifinal',
    final: 'Final',
};

type Jugador = { id: number; nombre: string; carrera_id?: number | null };

type Partido = {
    id: number;
    equipo_a: string;
    equipo_b: string;
    fase: string | null;
    bracket_order: number | null;
    estado: string;
    marcador_detalle: any;
    genero: string;
    categoria: string;
    fecha: string;
    disciplinas?: { name: string };
};

// ── Athlete search input ──────────────────────────────────────────────────────
function PlayerSearch({
    label,
    value,
    onSelect,
    onClear,
}: {
    label: string;
    value: string;
    onSelect: (j: Jugador) => void;
    onClear: () => void;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Jugador[]>([]);
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // When value changes externally (openEdit), reset query
    useEffect(() => { setQuery(''); setResults([]); }, [value]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) { setResults([]); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            const tokens = q.split(/\s+/);
            let qb = supabase.from('jugadores').select('id, nombre, carrera_id');
            tokens.forEach(tok => { if (tok) qb = qb.ilike('nombre', `%${tok}%`); });
            const { data } = await qb.limit(8);
            setResults((data ?? []) as Jugador[]);
            setSearching(false);
        }, 300);
        return () => { clearTimeout(t); setSearching(false); };
    }, [query]);

    if (value && value !== 'TBD') {
        return (
            <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">{label}</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <UserCircle size={14} className="text-violet-400 shrink-0" />
                    <span className="text-sm font-semibold text-white flex-1 truncate">{value}</span>
                    <button onClick={onClear} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                        <XCircle size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">{label}</label>
            <div className="space-y-1">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar jugador..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                    />
                    {searching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 animate-spin" />}
                </div>
                {results.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#130e24] overflow-hidden shadow-xl">
                        {results.map(j => (
                            <button
                                key={j.id}
                                onClick={() => { onSelect(j); setQuery(''); setResults([]); }}
                                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-violet-500/10 transition-colors text-left border-b border-white/5 last:border-0">
                                <UserCircle size={14} className="text-white/30 shrink-0" />
                                <span className="text-sm text-white font-medium truncate">{j.nombre}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TenisBracketPage() {
    const [allMatches, setAllMatches] = useState<Partido[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoria, setCategoria] = useState<'intermedio' | 'avanzado'>('intermedio');
    const [genero, setGenero] = useState<'masculino' | 'femenino'>('masculino');
    const [search, setSearch] = useState('');

    // Modal state
    const [editing, setEditing] = useState<{ partido: Partido; isLoose: boolean } | null>(null);
    const [editA, setEditA] = useState('');
    const [editB, setEditB] = useState('');
    const [editEstado, setEditEstado] = useState('programado');
    const [editSetsA, setEditSetsA] = useState(0);
    const [editSetsB, setEditSetsB] = useState(0);
    const [editFase, setEditFase] = useState<Phase>('octavos');
    const [editSlot, setEditSlot] = useState(0);
    const [saving, setSaving] = useState(false);

    // Tenis de Mesa grupos import
    const [importingGrupos, setImportingGrupos] = useState(false);
    const [importGruposResult, setImportGruposResult] = useState<{ inserted: number; linked: number; roster_rows: number; errors: string[] } | null>(null);

    const handleImportGrupos = async () => {
        if (!confirm('¿Confirmar importación de los 32 grupos de Tenis de Mesa? Esta acción solo debe ejecutarse una vez.')) return;
        setImportingGrupos(true);
        try {
            const res = await fetch('/api/admin/import-tenis-mesa-grupos', { method: 'POST' });
            const json = await res.json();
            if (!res.ok) { toast.error(json.error ?? 'Error al importar grupos'); return; }
            setImportGruposResult(json);
            toast.success(json.message ?? `${json.inserted} partidos creados`);
        } catch (e: any) {
            toast.error('Error: ' + e.message);
        } finally {
            setImportingGrupos(false);
        }
    };

    // Direct query using disciplina_id FK (the only correct way to filter in PostgREST)
    const reload = useCallback(async () => {
        setLoading(true);
        // Step 1: get the disciplina_id for 'Tenis'
        const { data: disc } = await supabase
            .from('disciplinas')
            .select('id')
            .ilike('name', 'Tenis')
            .maybeSingle();
        if (!disc) { setLoading(false); return; }

        // Step 2: fetch all tennis matches by FK
        const { data, error } = await supabase
            .from('partidos')
            .select('id, equipo_a, equipo_b, fase, bracket_order, estado, marcador_detalle, genero, categoria, fecha, disciplinas:disciplina_id(name)')
            .eq('disciplina_id', disc.id)
            .order('fecha', { ascending: true });
        if (!error) setAllMatches((data ?? []) as unknown as Partido[]);
        setLoading(false);
    }, []);

    useEffect(() => { reload(); }, [reload]);

    // Realtime: refresh on any change to partidos
    useEffect(() => {
        const ch = supabase.channel('tenis-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => reload())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [reload]);

    const bracketMatches = useMemo(() =>
        allMatches
            .filter(m =>
                (m.genero || 'masculino') === genero &&
                (m.categoria || 'intermedio') === categoria &&
                m.fase != null && m.fase !== 'grupos'
            )
            .sort((a, b) => (a.bracket_order ?? 0) - (b.bracket_order ?? 0)),
        [allMatches, genero, categoria]);

    // Loose: unassigned = fase null OR empty string
    const looseMatches = useMemo(() =>
        allMatches.filter(m => !m.fase),
        [allMatches]);

    // Global search across ALL tennis matches (ignores genero/categoria/fase filters)
    const searchMatches = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (q.length < 2) return [];
        return allMatches.filter(m =>
            m.equipo_a?.toLowerCase().includes(q) ||
            m.equipo_b?.toLowerCase().includes(q)
        );
    }, [allMatches, search]);

    const openEdit = (partido: Partido, isLoose = false) => {
        const md = partido.marcador_detalle ?? {};
        setEditA(partido.equipo_a === 'TBD' ? '' : partido.equipo_a ?? '');
        setEditB(partido.equipo_b === 'TBD' ? '' : partido.equipo_b ?? '');
        setEditEstado(partido.estado ?? 'programado');
        setEditSetsA(md.sets_a ?? 0);
        setEditSetsB(md.sets_b ?? 0);
        // Initialize fase/slot from current match (so moving is pre-filled)
        setEditFase((partido.fase as Phase) ?? 'octavos');
        setEditSlot(partido.bracket_order ?? 0);
        setEditing({ partido, isLoose });
    };

    const save = async () => {
        if (!editing) return;
        setSaving(true);
        const { partido } = editing;
        const slotChanged = partido.fase !== editFase || partido.bracket_order !== editSlot;

        const md = { ...(partido.marcador_detalle ?? {}), sets_a: editSetsA, sets_b: editSetsB };
        const updates: Record<string, any> = {
            equipo_a: editA.trim() || 'TBD',
            equipo_b: editB.trim() || 'TBD',
            estado: editEstado,
            marcador_detalle: md,
            fase: editFase,
            bracket_order: editSlot,
            updated_at: new Date().toISOString(),
        };

        // If moving to a different slot, handle the target slot
        if (slotChanged) {
            const existing = bracketMatches.find(
                m => m.id !== partido.id && m.fase === editFase && m.bracket_order === editSlot
            );
            if (existing) {
                const slotIsTBD = (!existing.equipo_a || existing.equipo_a === 'TBD') &&
                                  (!existing.equipo_b || existing.equipo_b === 'TBD');
                if (!slotIsTBD) {
                    toast.error('Ese slot ya tiene jugadores asignados. Elige otro.');
                    setSaving(false);
                    return;
                }
                await supabase.from('partidos').delete().eq('id', existing.id);
            }
        }

        const { error } = await supabase.from('partidos').update(updates).eq('id', partido.id);
        if (error) { toast.error(error.message); setSaving(false); return; }

        toast.success('Guardado');
        setEditing(null);
        setSaving(false);
        reload();
    };

    const isTBD = (p: Partido) =>
        (!p.equipo_a || p.equipo_a === 'TBD') && (!p.equipo_b || p.equipo_b === 'TBD');

    const byFase = PHASES.reduce((acc, f) => {
        acc[f] = bracketMatches
            .filter(m => m.fase === f)
            .sort((a, b) => (a.bracket_order ?? 0) - (b.bracket_order ?? 0));
        return acc;
    }, {} as Record<Phase, Partido[]>);

    const hasAnyBracket = PHASES.some(f => byFase[f].length > 0);

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Swords size={18} className="text-violet-400" />
                <div>
                    <h1 className="text-base font-black tracking-tight text-white">Bracket de Tenis</h1>
                    <p className="text-[11px] text-white/30">Gestión de llaves y asignación de partidos</p>
                </div>
            </div>

            {/* Tenis de Mesa — Importar fase de grupos */}
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-cyan-300">Tenis de Mesa — Fase de Grupos (17 abril)</p>
                        <p className="text-[11px] text-white/30 mt-0.5">
                            Crea los 126 partidos round-robin de los 32 grupos del PDF. Enlaza jugadores, perfiles y carreras automáticamente.
                        </p>
                    </div>
                    <button
                        onClick={handleImportGrupos}
                        disabled={importingGrupos || !!importGruposResult}
                        className="shrink-0 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {importingGrupos && <Loader2 size={12} className="animate-spin" />}
                        {importingGrupos ? 'Importando...' : importGruposResult ? '✓ Importado' : 'Importar grupos'}
                    </button>
                </div>
                {importGruposResult && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/5 border border-white/5 py-2">
                            <p className="text-lg font-black text-white">{importGruposResult.inserted}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest">partidos</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/5 py-2">
                            <p className="text-lg font-black text-emerald-400">{importGruposResult.linked}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest">enlazados</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/5 py-2">
                            <p className="text-lg font-black text-violet-400">{importGruposResult.roster_rows}</p>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest">roster</p>
                        </div>
                    </div>
                )}
                {(importGruposResult?.errors?.length ?? 0) > 0 && (
                    <details className="text-[10px] text-amber-400/60">
                        <summary className="cursor-pointer">{importGruposResult.errors.length} jugadores sin enlazar (click para ver)</summary>
                        <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto pl-2">
                            {importGruposResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </details>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {(['intermedio', 'avanzado'] as const).map(c => (
                    <button key={c} onClick={() => setCategoria(c)}
                        className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                            categoria === c
                                ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                                : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/60")}>
                        {c}
                    </button>
                ))}
                <span className="w-px h-4 bg-white/10 mx-0.5" />
                {(['masculino', 'femenino'] as const).map(g => (
                    <button key={g} onClick={() => setGenero(g)}
                        className={cn("px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                            genero === g
                                ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                                : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/60")}>
                        {g === 'masculino' ? 'Masc' : 'Fem'}
                    </button>
                ))}
            </div>

            {/* Global search — finds any match regardless of genero/categoria/fase */}
            <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar partido por nombre de jugador..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                />
            </div>

            {/* Search results */}
            {search.trim().length >= 2 && (
                <div className="rounded-2xl bg-white/[0.025] border border-violet-500/20 overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Resultados</span>
                        <span className="text-[10px] text-white/20">{searchMatches.length} encontrado{searchMatches.length !== 1 ? 's' : ''}</span>
                    </div>
                    {searchMatches.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-white/20">Sin resultados.</p>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {searchMatches.map(m => (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                        <span className="text-sm font-medium text-white truncate">{m.equipo_a || '—'}</span>
                                        <span className="text-white/15 text-[10px] shrink-0">vs</span>
                                        <span className="text-sm font-medium text-white truncate">{m.equipo_b || '—'}</span>
                                    </div>
                                    <span className="text-[9px] text-white/20 font-mono shrink-0 hidden sm:block">
                                        {m.categoria ?? '—'} · {m.genero === 'femenino' ? 'F' : 'M'}
                                    </span>
                                    {m.fase ? (
                                        <span className="text-[9px] text-emerald-400/60 font-mono shrink-0">
                                            {PHASE_LABELS[m.fase as Phase] ?? m.fase} #{(m.bracket_order ?? 0) + 1}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-amber-400/60 font-mono shrink-0">sin llave</span>
                                    )}
                                    <button
                                        onClick={() => { setSearch(''); openEdit(m, !m.fase); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-violet-400 hover:text-violet-300 shrink-0 px-2 py-1 rounded-lg hover:bg-violet-500/10">
                                        {m.fase ? 'Mover' : 'Asignar →'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center gap-2 text-white/20 text-sm py-12">
                    <div className="w-4 h-4 border border-white/10 border-t-violet-400 rounded-full animate-spin" />
                    Cargando...
                </div>
            ) : (
                <>
                    {/* Bracket phases */}
                    {hasAnyBracket ? (
                        <div className="space-y-3">
                            {PHASES.map(fase => {
                                const rows = byFase[fase];
                                if (!rows.length) return null;
                                return (
                                    <div key={fase} className="rounded-2xl bg-white/[0.025] border border-white/5 overflow-hidden">
                                        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                                                {PHASE_LABELS[fase]}
                                            </span>
                                            <span className="text-[10px] text-white/20">
                                                {rows.length} llave{rows.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="divide-y divide-white/[0.04]">
                                            {rows.map(m => (
                                                <div key={m.id}
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                                                    <span className="text-[10px] text-white/15 w-4 shrink-0 text-right font-mono tabular-nums">
                                                        {(m.bracket_order ?? 0) + 1}
                                                    </span>
                                                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                                        <span className={cn("text-sm truncate",
                                                            isTBD(m) ? "text-white/20 italic" : "text-white font-medium")}>
                                                            {isTBD(m) ? 'Por definir' : m.equipo_a}
                                                        </span>
                                                        <span className="text-white/15 text-[10px] shrink-0">vs</span>
                                                        <span className={cn("text-sm truncate",
                                                            isTBD(m) ? "text-white/20 italic" : "text-white font-medium")}>
                                                            {isTBD(m) ? 'Por definir' : m.equipo_b}
                                                        </span>
                                                    </div>
                                                    {m.estado === 'finalizado' && !isTBD(m) && (
                                                        <span className="text-[11px] text-white/30 shrink-0 font-mono">
                                                            {m.marcador_detalle?.sets_a ?? 0}–{m.marcador_detalle?.sets_b ?? 0}
                                                        </span>
                                                    )}
                                                    <span className={cn(
                                                        "text-[9px] shrink-0 px-1.5 py-0.5 rounded font-black uppercase tracking-wider",
                                                        m.estado === 'finalizado' ? "bg-emerald-500/10 text-emerald-400" :
                                                        m.estado === 'en_vivo' ? "bg-rose-500/10 text-rose-400" :
                                                        "bg-white/5 text-white/15")}>
                                                        {m.estado === 'finalizado' ? 'Final' :
                                                         m.estado === 'en_vivo' ? 'Vivo' : '—'}
                                                    </span>
                                                    <button
                                                        onClick={() => openEdit(m)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-violet-400 hover:text-violet-300 shrink-0 px-2 py-1 rounded-lg hover:bg-violet-500/10">
                                                        Editar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-white/20 text-sm rounded-2xl border border-white/5 bg-white/[0.02]">
                            No hay llaves de bracket para esta combinación.
                        </div>
                    )}

                    {/* Loose matches */}
                    {looseMatches.length > 0 && (
                        <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/10 overflow-hidden">
                            <div className="px-4 py-2 border-b border-amber-500/10 flex items-center gap-2">
                                <AlertCircle size={11} className="text-amber-400 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                    Sin asignar
                                </span>
                                <span className="text-[10px] text-white/20">
                                    {looseMatches.length} partido{looseMatches.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="divide-y divide-white/[0.04]">
                                {looseMatches.map(m => (
                                    <div key={m.id}
                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                            <span className="text-sm font-medium text-white truncate">{m.equipo_a || '—'}</span>
                                            <span className="text-white/15 text-[10px] shrink-0">vs</span>
                                            <span className="text-sm font-medium text-white truncate">{m.equipo_b || '—'}</span>
                                        </div>
                                        <span className="text-[9px] text-white/20 font-mono shrink-0 hidden sm:block">
                                            {m.categoria ?? '—'} · {m.genero === 'femenino' ? 'F' : 'M'}
                                        </span>
                                        {m.estado === 'finalizado' && (
                                            <span className="text-[11px] text-white/30 font-mono shrink-0">
                                                {m.marcador_detalle?.sets_a ?? 0}–{m.marcador_detalle?.sets_b ?? 0}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => openEdit(m, true)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-amber-400 hover:text-amber-300 shrink-0 px-2 py-1 rounded-lg hover:bg-amber-500/10">
                                            Asignar →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit / Assign Modal */}
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
                    <div className="w-full max-w-sm rounded-2xl bg-[#1a1730] border border-white/10 shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <p className="text-sm font-bold text-white">
                                {editing.isLoose ? 'Asignar a llave' : 'Editar partido'}
                            </p>
                            <button onClick={() => setEditing(null)}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
                            {/* Fase + slot — always shown so any match can be moved */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Fase</label>
                                    <select value={editFase} onChange={e => setEditFase(e.target.value as Phase)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                                        {PHASES.map(f => (
                                            <option key={f} value={f} className="bg-[#1a1730]">{PHASE_LABELS[f]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Llave #</label>
                                    <input type="number" min={0} value={editSlot}
                                        onChange={e => setEditSlot(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                                </div>
                            </div>

                            {/* Players with autocomplete */}
                            <PlayerSearch
                                label="Jugador A"
                                value={editA}
                                onSelect={j => setEditA(j.nombre)}
                                onClear={() => setEditA('')}
                            />
                            <PlayerSearch
                                label="Jugador B"
                                value={editB}
                                onSelect={j => setEditB(j.nombre)}
                                onClear={() => setEditB('')}
                            />

                            {/* Estado + sets */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Estado</label>
                                    <select value={editEstado} onChange={e => setEditEstado(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                                        <option value="programado" className="bg-[#1a1730]">Prog.</option>
                                        <option value="en_vivo" className="bg-[#1a1730]">Vivo</option>
                                        <option value="finalizado" className="bg-[#1a1730]">Final</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Sets A</label>
                                    <input type="number" min={0} max={3} value={editSetsA}
                                        onChange={e => setEditSetsA(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Sets B</label>
                                    <input type="number" min={0} max={3} value={editSetsB}
                                        onChange={e => setEditSetsB(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
                                </div>
                            </div>
                        </div>

                        <div className="px-5 pb-5">
                            <button onClick={save} disabled={saving}
                                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
