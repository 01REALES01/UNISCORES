"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Avatar } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { safeQuery } from "@/lib/supabase-query";
import { Plus, Calendar, Zap, Trash2, Search, TrendingUp, Trophy, Loader2, AlertTriangle, X, Users } from "lucide-react";
import { toast } from "sonner";
import UniqueLoading from "@/components/ui/morph-loading";
import { CreateMatchModal } from "@/components/create-match-modal";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { cn } from "@/lib/utils";
import { SPORT_EMOJI } from "@/lib/constants";
import { getDisplayName, getCarreraName } from "@/lib/sport-helpers";

export default function PartidosPage() {
    const [partidos, setPartidos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('todos');
    const [sportFilter, setSportFilter] = useState('todos');
    const [genderFilter, setGenderFilter] = useState('todos');
    const [categoriaFilter, setCategoriaFilter] = useState('todos');
    const [dateFilter, setDateFilter] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [loadTimeout, setLoadTimeout] = useState(false);
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [importingTennis, setImportingTennis] = useState(false);
    const [importingNatacion, setImportingNatacion] = useState(false);
    const [backfillingNatacion, setBackfillingNatacion] = useState(false);
    const [deletingTennis, setDeletingTennis] = useState(false);
    const [matchToDelete, setMatchToDelete] = useState<any>(null);

    // Inline tenis de mesa sets editor
    const [editingTenisMesa, setEditingTenisMesa] = useState<number | null>(null);
    const [tenisSetsA, setTenisSetsA] = useState(0);
    const [tenisSetsB, setTenisSetsB] = useState(0);
    const [tenisEstado, setTenisEstado] = useState<string>('programado');
    const [savingTenis, setSavingTenis] = useState(false);
    const router = useRouter();
    const { isPeriodista } = useAuth();
    const { logAction } = useAuditLogger();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const natacionFileRef = useRef<HTMLInputElement>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (isPeriodista) {
            router.push('/admin/noticias');
        }
    }, [isPeriodista, router]);

    const fetchPartidos = useCallback(async () => {
        const { data } = await safeQuery(
            supabase.from('partidos').select(`*, disciplinas(name), delegacion_a, delegacion_b, carrera_a:carreras!carrera_a_id(nombre, escudo_url), carrera_b:carreras!carrera_b_id(nombre, escudo_url), delegacion_a_info:delegaciones!delegacion_a_id(escudo_url), delegacion_b_info:delegaciones!delegacion_b_id(escudo_url)`).order('fecha', { ascending: true }),
            'admin-partidos'
        );
        if (data) setPartidos(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        const q = searchParams.get('search');
        if (q !== null) setSearchQuery(q);
    }, [searchParams]);

    useEffect(() => {
        fetchPartidos();
    }, [fetchPartidos]);

    // Resonance Safety Net (8s)
    useEffect(() => {
        if (!loading) { setLoadTimeout(false); return; }
        const t = setTimeout(() => {
            if (loading) setLoadTimeout(true);
        }, 8000);
        return () => clearTimeout(t);
    }, [loading]);

    useEffect(() => {
        const setupChannel = () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            channelRef.current = supabase
                .channel('realtime-partidos')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => fetchPartidos(), 800);
                })
                .subscribe();
        };

        setupChannel();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setupChannel();
                fetchPartidos();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [fetchPartidos]);

    const confirmDelete = async () => {
        if (!matchToDelete) return;
        setDeletingId(matchToDelete.id);
        
        try {
            // 1. Clean related tables just in case DB cascade is missing
            await supabase.from('olympics_eventos').delete().eq('partido_id', matchToDelete.id);
            await supabase.from('roster_partido').delete().eq('partido_id', matchToDelete.id);
            await supabase.from('pronosticos').delete().eq('match_id', matchToDelete.id);
            await supabase.from('noticias').update({ partido_id: null }).eq('partido_id', matchToDelete.id);
            
            // 2. Delete Match (using .select() to confirm row removal)
            const { data, error } = await supabase.from('partidos').delete().eq('id', matchToDelete.id).select();
            
            if (error) {
                toast.error("Error BD: " + error.message);
            } else if (!data || data.length === 0) {
                toast.error("Alerta BBDD: Permisos insuficientes (RLS) para borrar, contacta soporte.");
            } else {
                toast.success("Partido eliminado permanentemente.");
                
                // Log Action
                await logAction('DELETE_MATCH', 'partido', matchToDelete.id, {
                    equipoA: matchToDelete.equipo_a,
                    equipoB: matchToDelete.equipo_b,
                    disciplina: matchToDelete.disciplinas?.name
                });

                await fetchPartidos();
            }
        } catch (err: any) {
            toast.error("Error al procesar: " + err.message);
        } finally {
            setDeletingId(null);
            setMatchToDelete(null);
        }
    };

    const deleteTennisBrackets = async () => {
        if (!confirm('⚠️ Esto eliminará TODOS los partidos de tenis creados.\n\nEsta acción no se puede deshacer. ¿Estás seguro?')) return;

        setDeletingTennis(true);
        try {
            const res = await fetch('/api/admin/delete-tennis-bracket', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success(`🗑️ ${data.deleted} partidos de tenis eliminados`);
            await fetchPartidos();
        } catch (err: any) {
            toast.error(err.message || 'Error eliminando brackets');
        } finally {
            setDeletingTennis(false);
        }
    };

    const importTennisBrackets = async () => {
        if (!confirm('⚠️ Esto importará todos los partidos de 1ra ronda de los archivos Excel.\n\n¿Estás seguro?')) return;

        setImportingTennis(true);
        try {
            const res = await fetch('/api/admin/import-tennis-bracket', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success(`✅ ${data.created} partidos creados • ${data.rosterLinked} jugadores vinculados`);
            await fetchPartidos();
        } catch (err: any) {
            toast.error(err.message || 'Error importando brackets');
        } finally {
            setImportingTennis(false);
        }
    };

    const deleteNatacionData = async () => {
        if (!confirm('⚠️ Esto eliminará TODAS las carreras de Natación creadas.\n\nEsta acción no se puede deshacer. ¿Estás seguro?')) return;

        setDeletingTennis(true); // Re-uso el estado de deleting para simplicidad
        try {
            const res = await fetch('/api/admin/delete-natacion', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success(`🗑️ ${data.deleted} carreras de natación eliminadas`);
            await fetchPartidos();
        } catch (err: any) {
            toast.error(err.message || 'Error eliminando natación');
        } finally {
            setDeletingTennis(false);
        }
    };

    const handleImportNatacion = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportingNatacion(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch('/api/admin/import-natacion', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success(`🏊‍♂️ ${data.jugadores_created} jugadores creados • ${data.partidos_created} carreras generadas`);
            if (data.warnings?.length > 0) {
                toast.warning(`⚠️ ${data.warnings.length} advertencias, revisa la consola`);
                console.warn("Natación import warnings:", data.warnings);
            }
            await fetchPartidos();
        } catch (err: any) {
            toast.error(err.message || 'Error importando nadadores');
        } finally {
            setImportingNatacion(false);
            if (natacionFileRef.current) natacionFileRef.current.value = '';
        }
    };

    const handleBackfillNatacion = async () => {
        if (!confirm('Esto va a buscar y vincular los perfiles de todos los nadadores existentes en los partidos.\n\n¿Continuar?')) return;
        setBackfillingNatacion(true);
        try {
            const res = await fetch('/api/admin/backfill-natacion');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`✅ ${data.updatedCount} partidos actualizados de ${data.matchesFound} encontrados`);
        } catch (err: any) {
            toast.error(err.message || 'Error en backfill');
        } finally {
            setBackfillingNatacion(false);
        }
    };

    const showCategoriaFilter = ['Tenis', 'Tenis de Mesa'].includes(sportFilter);

    const filteredPartidos = partidos.filter(p => {
        if (filter === 'en_curso' && p.estado !== 'en_curso') return false;
        if (filter === 'programados' && p.estado !== 'programado') return false;
        if (filter === 'finalizados' && p.estado !== 'finalizado') return false;
        if (sportFilter !== 'todos' && p.disciplinas?.name !== sportFilter) return false;
        if (genderFilter !== 'todos' && (p.genero || 'masculino') !== genderFilter) return false;
        if (categoriaFilter !== 'todos' && (p.categoria || null) !== categoriaFilter) return false;
        if (dateFilter) {
            const pDate = new Date(p.fecha).toISOString().slice(0, 10);
            if (pDate !== dateFilter) return false;
        }
        if (searchQuery) {
            const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
            const dispA = getDisplayName(p, 'a').toLowerCase();
            const dispB = getDisplayName(p, 'b').toLowerCase();
            const carA = getCarreraName(p, 'a').toLowerCase();
            const carB = getCarreraName(p, 'b').toLowerCase();
            const sport = (p.disciplinas?.name || '').toLowerCase();

            const matchAll = tokens.every(token => 
                dispA.includes(token) || 
                dispB.includes(token) || 
                carA.includes(token) || 
                carB.includes(token) ||
                sport.includes(token)
            );
            
            if (!matchAll) return false;
        }
        return true;
    });

    const liveCount = partidos.filter(p => p.estado === 'en_curso').length;
    const programadosCount = partidos.filter(p => p.estado === 'programado').length;
    const finalizadosCount = partidos.filter(p => p.estado === 'finalizado').length;
    const uniqueSports = Array.from(new Set(partidos.map(p => p.disciplinas?.name).filter(Boolean)));
    const uniqueDates = Array.from(new Set(partidos.map(p => new Date(p.fecha).toISOString().slice(0, 10)))).sort();

    const openTenisMesaEdit = (e: React.MouseEvent, partido: any) => {
        e.stopPropagation();
        const md = partido.marcador_detalle || {};
        setTenisSetsA(md.sets_a ?? md.sets_total_a ?? 0);
        setTenisSetsB(md.sets_b ?? md.sets_total_b ?? 0);
        setTenisEstado(partido.estado || 'programado');
        setEditingTenisMesa(partido.id);
    };

    const saveSetsResult = async (e: React.MouseEvent, partido: any) => {
        e.stopPropagation();
        setSavingTenis(true);
        try {
            const newDetalle = {
                ...(partido.marcador_detalle || {}),
                sets_a: tenisSetsA,
                sets_b: tenisSetsB,
                sets_total_a: tenisSetsA,
                sets_total_b: tenisSetsB,
                goles_a: tenisSetsA,
                goles_b: tenisSetsB,
            };
            if (tenisEstado === 'finalizado') {
                newDetalle.resultado_final = tenisSetsA > tenisSetsB ? 'victoria_a' : tenisSetsB > tenisSetsA ? 'victoria_b' : 'empate';
            }
            const { error } = await supabase.from('partidos').update({
                marcador_detalle: newDetalle,
                estado: tenisEstado,
            }).eq('id', partido.id);
            if (error) throw error;
            toast.success('Resultado guardado');
            setEditingTenisMesa(null);
            await fetchPartidos();
        } catch (err: any) {
            toast.error(err.message || 'Error al guardar');
        } finally {
            setSavingTenis(false);
        }
    };

    const getScore = (p: any) => {
        const md = p.marcador_detalle || {};
        return {
            a: md.goles_a ?? md.total_a ?? md.sets_a ?? 0,
            b: md.goles_b ?? md.total_b ?? md.sets_b ?? 0,
        };
    };

    const statsConfig = [
        {
            label: 'Total',
            value: partidos.length,
            icon: TrendingUp,
            gradient: 'from-red-500 to-orange-600',
            glowColor: 'red',
            filterKey: 'todos',
        },
        {
            label: 'En Curso',
            value: liveCount,
            icon: Zap,
            gradient: 'from-rose-500 to-orange-500',
            glowColor: 'rose',
            filterKey: 'en_curso',
            pulse: liveCount > 0,
        },
        {
            label: 'Programados',
            value: programadosCount,
            icon: Calendar,
            gradient: 'from-cyan-500 to-red-600',
            glowColor: 'cyan',
            filterKey: 'programados',
        },
        {
            label: 'Finalizados',
            value: finalizadosCount,
            icon: Trophy,
            gradient: 'from-emerald-500 to-teal-600',
            glowColor: 'emerald',
            filterKey: 'finalizados',
        },
    ];

    // Group matches by sport for list view
    const sportGroups = uniqueSports.map(sport => ({
        sport,
        matches: filteredPartidos.filter(p => p.disciplinas?.name === sport),
    })).filter(g => g.matches.length > 0);
    const ungrouped = filteredPartidos.filter(p => !p.disciplinas?.name);

    if (loading && partidos.length === 0) {
        if (loadTimeout) {
            return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] border border-white/5 rounded-3xl">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                        <Zap size={32} className="text-amber-500 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Sincronización Lenta</h3>
                    <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
                        No hemos podido recuperar los partidos recientes. Puede haber un retraso en la conexión con la base de datos.
                    </p>
                    <Button 
                        onClick={() => { setLoadTimeout(false); fetchPartidos(); }} 
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-lg shadow-amber-500/20"
                    >
                        Reintentar Conexión
                    </Button>
                </div>
            );
        }
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <UniqueLoading size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white">Partidos</h2>
                    <p className="text-xs text-slate-500">{partidos.length} en total</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-8 px-3 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white border-0 flex items-center gap-1.5"
                    >
                        <Plus size={13} /> Nuevo
                    </Button>
                </div>
            </div>

            {/* Stats — compact filter pills */}
            <div className="flex flex-wrap gap-2">
                {statsConfig.map((stat) => {
                    const isActive = filter === stat.filterKey;
                    const Icon = stat.icon;
                    return (
                        <button
                            key={stat.label}
                            onClick={() => setFilter(filter === stat.filterKey ? 'todos' : stat.filterKey)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                                isActive
                                    ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                                    : "border-white/8 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon size={12} className={isActive ? "text-violet-400" : "text-slate-500"} />
                            {stat.label}
                            <span className={cn("font-bold", isActive ? "text-white" : "text-slate-300")}>{stat.value}</span>
                            {stat.pulse && stat.value > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                {/* Search */}
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por equipo o jugador..."
                        className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/5 border border-white/8 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40"
                    />
                </div>

                {/* Sport + Gender in one row */}
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setSportFilter('todos')}
                        className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors", sportFilter === 'todos' ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:text-white")}
                    >
                        Todos
                    </button>
                    {uniqueSports.map(sport => (
                        <button
                            key={sport}
                            onClick={() => { setSportFilter(sportFilter === sport ? 'todos' : sport); setCategoriaFilter('todos'); }}
                            className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1", sportFilter === sport ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:text-white")}
                        >
                            {SPORT_EMOJI[sport]} {sport}
                        </button>
                    ))}
                    <div className="w-px bg-white/10 self-stretch mx-1" />
                    {[{ v: 'masculino', l: '♂' }, { v: 'femenino', l: '♀' }, { v: 'mixto', l: '⚤' }].map(g => (
                        <button
                            key={g.v}
                            onClick={() => setGenderFilter(genderFilter === g.v ? 'todos' : g.v)}
                            className={cn("px-2.5 py-1 rounded-md text-sm font-medium transition-colors", genderFilter === g.v ? "bg-violet-600 text-white" : "bg-white/5 text-slate-500 hover:text-white")}
                        >
                            {g.l}
                        </button>
                    ))}
                </div>

                {/* Date filter */}
                {uniqueDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
                        {uniqueDates.map(date => {
                            const d = new Date(date + 'T12:00:00');
                            const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
                            const isActive = dateFilter === date;
                            return (
                                <button
                                    key={date}
                                    onClick={() => setDateFilter(isActive ? '' : date)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize",
                                        isActive ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Category filter (conditional) */}
                {showCategoriaFilter && (
                    <div className="flex gap-1.5 pt-1 border-t border-white/5">
                        {[{ v: 'todos', l: 'Todos' }, { v: 'principiante', l: 'Principiante' }, { v: 'intermedio', l: 'Intermedio' }, { v: 'avanzado', l: 'Avanzado' }].map(c => (
                            <button
                                key={c.v}
                                onClick={() => setCategoriaFilter(c.v)}
                                className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors", categoriaFilter === c.v ? "bg-lime-700 text-white" : "bg-white/5 text-slate-400 hover:text-white")}
                            >
                                {c.l}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Utility actions — collapsed row */}
            <input type="file" accept=".xlsx,.xls" className="hidden" ref={natacionFileRef} onChange={handleImportNatacion} />
            <div className="flex flex-wrap gap-2">
                <button onClick={importTennisBrackets} disabled={importingTennis} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                    {importingTennis ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Brackets Tenis
                </button>
                <button onClick={() => natacionFileRef.current?.click()} disabled={importingNatacion} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                    {importingNatacion ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Importar Natación
                </button>
                <button onClick={handleBackfillNatacion} disabled={backfillingNatacion} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                    {backfillingNatacion ? <Loader2 size={11} className="animate-spin" /> : <Users size={11} />} Vincular Perfiles
                </button>
                <button onClick={deleteNatacionData} disabled={deletingTennis} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-colors disabled:opacity-50">
                    {deletingTennis ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Limpiar Natación
                </button>
                <button onClick={deleteTennisBrackets} disabled={deletingTennis} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-slate-500 hover:text-rose-400 hover:border-rose-500/20 transition-colors disabled:opacity-50">
                    {deletingTennis ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Limpiar Tenis
                </button>
            </div>

            {/* Match list grouped by sport */}
            {filteredPartidos.length === 0 ? (
                <div className="text-center py-16">
                    <Calendar size={28} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">Sin partidos</p>
                    <p className="text-xs text-slate-600 mt-1">
                        {searchQuery ? 'Sin resultados para tu búsqueda' : 'Crea el primer partido'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {(sportGroups.length > 0 ? sportGroups : [{ sport: '', matches: ungrouped }]).map(({ sport, matches }) => (
                        <div key={sport || 'sin-deporte'} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                            {/* Sport header */}
                            {sport && (
                                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{SPORT_EMOJI[sport] || '🏅'}</span>
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{sport}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-600">{matches.length} partido{matches.length !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                            {/* Match rows */}
                            <div className="divide-y divide-white/[0.04]">
                                {matches.map((partido) => {
                                    const isLive = partido.estado === 'en_curso';
                                    const isFinished = partido.estado === 'finalizado';
                                    const score = getScore(partido);
                                    const isCarrera = partido.marcador_detalle?.tipo === 'carrera';
                                    const isTenisMesa = partido.disciplinas?.name === 'Tenis de Mesa';
                                    const isEditingThis = editingTenisMesa === partido.id;
                                    return (
                                        <div key={partido.id}>
                                        <div
                                            onClick={() => !isEditingThis && router.push(`/admin/partidos/${partido.id}`)}
                                            className="group flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            {/* Status dot */}
                                            <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full", isLive ? "bg-rose-500 animate-pulse" : isFinished ? "bg-slate-600" : "bg-slate-700")} />

                                            {/* Teams/name */}
                                            <div className="flex-1 min-w-0">
                                                {isCarrera ? (
                                                    <p className="text-xs font-semibold text-slate-200 truncate">
                                                        {partido.marcador_detalle?.distancia && partido.marcador_detalle?.estilo
                                                            ? `${partido.marcador_detalle.distancia} ${partido.marcador_detalle.estilo}`
                                                            : partido.equipo_a}
                                                        {partido.marcador_detalle?.serie && <span className="text-slate-500 ml-1">Heat #{partido.marcador_detalle.serie}</span>}
                                                    </p>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Avatar name={getDisplayName(partido, 'a')} src={partido.carrera_a?.escudo_url || partido.delegacion_a_info?.escudo_url} size="sm" className="w-5 h-5 shrink-0 border border-white/10 bg-black/40" />
                                                        <p className="text-xs font-semibold text-slate-200 truncate">
                                                            {getDisplayName(partido, 'a')}
                                                            <span className="text-slate-600 mx-1.5">vs</span>
                                                            {getDisplayName(partido, 'b')}
                                                        </p>
                                                        <Avatar name={getDisplayName(partido, 'b')} src={partido.carrera_b?.escudo_url || partido.delegacion_b_info?.escudo_url} size="sm" className="w-5 h-5 shrink-0 border border-white/10 bg-black/40" />
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-600 mt-0.5">
                                                    {new Date(partido.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                    {partido.lugar && <span className="ml-1.5">{partido.lugar}</span>}
                                                    {partido.grupo && <span className="ml-1.5 text-slate-500">G{partido.grupo}</span>}
                                                    {partido.genero && partido.genero !== 'masculino' && <span className="ml-1.5 capitalize">{partido.genero}</span>}
                                                </p>
                                            </div>

                                            {/* Score / status */}
                                            <div className="shrink-0 text-right">
                                                {isCarrera ? (
                                                    <span className="text-[10px] text-slate-500">
                                                        {(partido.marcador_detalle?.participantes || []).length} competidores
                                                    </span>
                                                ) : isFinished || isLive ? (
                                                    <span className={cn("text-sm font-bold font-mono", isLive ? "text-rose-400" : "text-slate-400")}>
                                                        {score.a} – {score.b}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 uppercase">Prog.</span>
                                                )}
                                            </div>

                                            {/* Tenis de Mesa inline edit button */}
                                            {isTenisMesa && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); isEditingThis ? setEditingTenisMesa(null) : openTenisMesaEdit(e, partido); }}
                                                    className={cn(
                                                        "shrink-0 px-2 py-1 rounded-md text-[10px] font-bold transition-colors opacity-0 group-hover:opacity-100",
                                                        isEditingThis
                                                            ? "bg-white/10 text-white opacity-100"
                                                            : "text-cyan-400 hover:bg-cyan-500/10"
                                                    )}
                                                >
                                                    {isEditingThis ? 'Cerrar' : 'Editar'}
                                                </button>
                                            )}

                                            {/* Delete */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setMatchToDelete(partido); }}
                                                className="shrink-0 p-1.5 rounded-md text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                {deletingId === partido.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                            </button>
                                        </div>

                                        {/* Inline tenis de mesa sets editor */}
                                        {isEditingThis && isTenisMesa && (
                                            <div
                                                onClick={e => e.stopPropagation()}
                                                className="px-4 py-3 bg-cyan-500/[0.04] border-t border-cyan-500/10 space-y-3"
                                            >
                                                {/* Sets counters */}
                                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                                    {/* Team A */}
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-slate-400 truncate font-medium">{getDisplayName(partido, 'a')}</p>
                                                        <div className="flex items-center gap-1.5">
                                                            <button onClick={() => setTenisSetsA(Math.max(0, tenisSetsA - 1))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center transition-colors">−</button>
                                                            <span className="text-2xl font-black text-white w-8 text-center tabular-nums">{tenisSetsA}</span>
                                                            <button onClick={() => setTenisSetsA(Math.min(2, tenisSetsA + 1))} className="w-7 h-7 rounded-md bg-cyan-600/60 hover:bg-cyan-500/80 text-white font-bold text-sm flex items-center justify-center transition-colors">+</button>
                                                        </div>
                                                    </div>

                                                    <span className="text-slate-600 font-black text-sm">sets</span>

                                                    {/* Team B */}
                                                    <div className="space-y-1 text-right">
                                                        <p className="text-[10px] text-slate-400 truncate font-medium">{getDisplayName(partido, 'b')}</p>
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            <button onClick={() => setTenisSetsB(Math.max(0, tenisSetsB - 1))} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white font-bold text-sm flex items-center justify-center transition-colors">−</button>
                                                            <span className="text-2xl font-black text-white w-8 text-center tabular-nums">{tenisSetsB}</span>
                                                            <button onClick={() => setTenisSetsB(Math.min(2, tenisSetsB + 1))} className="w-7 h-7 rounded-md bg-cyan-600/60 hover:bg-cyan-500/80 text-white font-bold text-sm flex items-center justify-center transition-colors">+</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Estado selector */}
                                                <div className="flex gap-1.5">
                                                    {(['programado', 'en_curso', 'finalizado'] as const).map(e => (
                                                        <button
                                                            key={e}
                                                            onClick={() => setTenisEstado(e)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                                                                tenisEstado === e
                                                                    ? e === 'finalizado' ? "bg-emerald-600/80 text-white" : e === 'en_curso' ? "bg-rose-600/80 text-white" : "bg-slate-600 text-white"
                                                                    : "bg-white/5 text-slate-500 hover:text-white"
                                                            )}
                                                        >
                                                            {e === 'programado' ? 'Programado' : e === 'en_curso' ? 'En Curso' : 'Finalizado'}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => saveSetsResult(e, partido)}
                                                        disabled={savingTenis}
                                                        className="flex-1 h-8 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                    >
                                                        {savingTenis ? <Loader2 size={11} className="animate-spin" /> : null}
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setEditingTenisMesa(null); }}
                                                        className="px-3 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results Count */}
            {!loading && filteredPartidos.length > 0 && (
                <p className="text-center text-xs text-slate-600 pt-2 font-medium">
                    Mostrando {filteredPartidos.length} de {partidos.length} partidos
                </p>
            )}

            {/* Modal */}
            <CreateMatchModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchPartidos();
                }}
            />
            
            {/* DELETE MODAL */}
            {matchToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deletingId && setMatchToDelete(null)} />
                    <div className="relative bg-white/8 border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header bg */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-rose-500/20 to-transparent" />
                        
                        <button 
                            onClick={() => !deletingId && setMatchToDelete(null)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 z-20 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="p-8 pt-12 flex flex-col items-center text-center relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 relative">
                                <AlertTriangle size={32} />
                                <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full" />
                            </div>
                            
                            <h3 className="text-xl font-black text-white mb-2">¿Eliminar Partido?</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                Esta acción <strong className="text-rose-400">no se puede deshacer</strong>. Se perderán todos los eventos y estadísticas de este partido.
                            </p>

                            <div className="flex gap-3 w-full">
                                <Button 
                                    onClick={() => setMatchToDelete(null)}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold tracking-widest uppercase text-xs border border-white/10"
                                    disabled={deletingId !== null}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={confirmDelete}
                                    className="flex-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold tracking-widest uppercase text-xs border-none"
                                    disabled={deletingId !== null}
                                >
                                    {deletingId === matchToDelete.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        "Eliminar"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
