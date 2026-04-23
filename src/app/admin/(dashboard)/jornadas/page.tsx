"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CalendarDays, RefreshCw, ChevronRight, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";
import { AjedrezImportModal } from "@/modules/admin/matches/components/ajedrez-import-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Jornada {
    id: number;
    disciplina_id: number;
    genero: string;
    numero: number;
    nombre: string | null;
    scheduled_at: string;
    lugar: string | null;
    estado: 'programado' | 'en_curso' | 'finalizado';
    disciplinas: { name: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estadoBadge(estado: string) {
    if (estado === 'finalizado') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (estado === 'en_curso')   return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-white/5 text-white/40 border-white/10';
}

function estadoLabel(estado: string) {
    if (estado === 'finalizado') return 'Finalizado';
    if (estado === 'en_curso')   return 'En curso';
    return 'Programado';
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-CO', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JornadasPage() {
    const [jornadas, setJornadas] = useState<Jornada[]>([]);
    const [loading, setLoading] = useState(true);
    const [sportFilter, setSportFilter] = useState<string>('all');
    const [generoFilter, setGeneroFilter] = useState<string>('all');
    const [showImportModal, setShowImportModal] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('jornadas')
            .select('id, disciplina_id, genero, numero, nombre, scheduled_at, lugar, estado, disciplinas(name)')
            .order('scheduled_at', { ascending: true });
        setJornadas((data as any) ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function deleteJornada(e: React.MouseEvent, id: number, nombre: string) {
        e.preventDefault();
        if (!confirm(`¿Eliminar jornada "${nombre}"? Esta acción no se puede deshacer.`)) return;
        setDeletingId(id);
        await supabase.from('jornadas').delete().eq('id', id);
        setDeletingId(null);
        fetchData();
    }

    const sports = Array.from(new Set(jornadas.map(j => (j.disciplinas as any)?.name).filter(Boolean)));

    const filtered = jornadas.filter(j => {
        const name = (j.disciplinas as any)?.name ?? '';
        if (sportFilter !== 'all' && name !== sportFilter) return false;
        if (generoFilter !== 'all' && j.genero !== generoFilter) return false;
        return true;
    });

    // Group by sport
    const grouped = filtered.reduce<Record<string, Jornada[]>>((acc, j) => {
        const name = (j.disciplinas as any)?.name ?? 'Desconocido';
        if (!acc[name]) acc[name] = [];
        acc[name].push(j);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Import Modal */}
            {showImportModal && (
                <AjedrezImportModal
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => { setShowImportModal(false); fetchData(); }}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <CalendarDays size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-xl">Jornadas</h1>
                        <p className="text-white/30 text-xs">Ajedrez y Tenis de Mesa</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-xs font-bold transition-colors"
                    >
                        <Upload size={12} />
                        Importar Excel Ajedrez
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 text-xs font-bold transition-colors disabled:opacity-40"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSportFilter('all')}
                    className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                        sportFilter === 'all' ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70")}
                >
                    Todos
                </button>
                {sports.map(s => (
                    <button
                        key={s}
                        onClick={() => setSportFilter(sportFilter === s ? 'all' : s)}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                            sportFilter === s ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70")}
                    >
                        {SPORT_EMOJI[s] || ''} {s}
                    </button>
                ))}
                <div className="w-px h-6 bg-white/10 self-center mx-1" />
                {['masculino', 'femenino'].map(g => (
                    <button
                        key={g}
                        onClick={() => setGeneroFilter(generoFilter === g ? 'all' : g)}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize",
                            generoFilter === g ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/5 border-white/10 text-white/40 hover:text-white/70")}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-white/30 text-sm">
                    No hay jornadas registradas.{' '}
                    <span className="block mt-1 text-xs">Importa el fixture desde la sección <strong>Importar</strong>.</span>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([sport, items]) => (
                        <div key={sport}>
                            <h2 className="text-xs font-black uppercase tracking-widest text-white/30 mb-3 px-1">
                                {SPORT_EMOJI[sport] || ''} {sport}
                            </h2>
                            <div className="space-y-2">
                                {items.map(j => (
                                    <div key={j.id} className="relative group">
                                        <Link
                                            href={`/admin/jornadas/${j.id}`}
                                            className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-violet-500/30 hover:bg-white/5 transition-all group/link"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="text-2xl font-black text-white/20 w-8 text-center">
                                                    {j.numero}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">
                                                        {j.nombre ?? `Ronda ${j.numero}`}
                                                        <span className="ml-2 text-xs font-normal capitalize text-white/30">{j.genero}</span>
                                                    </p>
                                                    <p className="text-xs text-white/30 mt-0.5">
                                                        {formatDate(j.scheduled_at)}
                                                        {j.lugar ? ` · ${j.lugar}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border", estadoBadge(j.estado))}>
                                                    {estadoLabel(j.estado)}
                                                </span>
                                                <ChevronRight size={14} className="text-white/20 group-hover/link:text-white/50 transition-colors" />
                                            </div>
                                        </Link>
                                        <button
                                            onClick={(e) => deleteJornada(e, j.id, j.nombre ?? `Ronda ${j.numero}`)}
                                            disabled={deletingId === j.id}
                                            className="absolute right-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 disabled:opacity-30"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
