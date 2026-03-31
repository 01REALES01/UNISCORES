"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    History, 
    Search, 
    Filter, 
    User, 
    Activity, 
    Calendar, 
    Layers, 
    Info, 
    ChevronRight, 
    Zap,
    Trash2,
    Plus,
    RotateCcw,
    ShieldCheck
} from "lucide-react";
import { Card, Badge, Avatar } from "@/components/ui-primitives";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import UniqueLoading from "@/components/ui/morph-loading";

interface AuditLog {
    id: string;
    created_at: string;
    admin_id: string;
    admin_name: string;
    admin_email: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    details: any;
    ip_address?: string;
}

const ACTION_COLORS: Record<string, string> = {
    'CREATE_MATCH': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'UPDATE_MATCH': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'DELETE_MATCH': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    'START_MATCH': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'FINALIZE_MATCH': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    'UPDATE_SCORE': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    'CHANGE_PERIOD': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    'ADD_EVENT': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'DELETE_EVENT': 'text-red-400 bg-red-500/10 border-red-500/20',
    'CREATE_NEWS': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    'UPDATE_NEWS': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'DELETE_NEWS': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    'TOGGLE_PUBLISH': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'UPDATE_ROLE': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const ACTION_ICONS: Record<string, any> = {
    'CREATE_MATCH': Plus,
    'UPDATE_MATCH': Activity,
    'DELETE_MATCH': Trash2,
    'START_MATCH': Zap,
    'FINALIZE_MATCH': ShieldCheck,
    'UPDATE_SCORE': Activity,
    'ADD_EVENT': Zap,
    'DELETE_EVENT': Trash2,
    'CREATE_NEWS': Plus,
    'UPDATE_NEWS': Activity,
    'DELETE_NEWS': Trash2,
    'TOGGLE_PUBLISH': Zap,
    'UPDATE_ROLE': ShieldCheck,
};

export default function BitacoraPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error("Error fetching logs:", error);
        } else {
            setLogs(data || []);
        }
        setLoading(false);
    }

    const filteredLogs = logs.filter(log => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            (log.admin_name || '').toLowerCase().includes(q) ||
            log.action_type.toLowerCase().includes(q) ||
            log.entity_type.toLowerCase().includes(q);
        
        const matchesType = filterType === "all" || log.entity_type === filterType;
        
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* ─── HERO HEADER ─── */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-background/60 backdrop-blur-2xl border border-white/5 p-10 group"
            >
                <div className="absolute top-[-30%] right-[-5%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                System Intelligence
                            </div>
                            <Badge variant="outline" className="text-primary border-primary/30">Admin Only</Badge>
                        </div>
                        
                        <div className="space-y-1">
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white leading-[0.9] flex flex-col">
                                <span className="text-primary/80">Bitácora de</span>
                                <span>Auditoría</span>
                            </h1>
                            <p className="text-zinc-400 text-sm font-medium tracking-tight max-w-md">
                                Registro inmutable de todas las acciones administrativas realizadas en la plataforma.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={fetchLogs}
                            className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                            <RotateCcw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* ─── FILTERS ─── */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por admin, acción o entidad..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 bg-zinc-900/40 border border-white/5 rounded-2xl pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'partido', 'evento', 'noticia', 'usuario'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={cn(
                                "px-6 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                filterType === t 
                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                                    : "bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:border-white/10"
                            )}
                        >
                            {t === 'all' ? 'Todos' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── LOGS LIST ─── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <UniqueLoading size="lg" />
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                    <History size={48} className="mx-auto text-zinc-700 mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No se encontraron registros</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredLogs.map((log, index) => {
                        const Icon = ACTION_ICONS[log.action_type] || Info;
                        const colorClass = ACTION_COLORS[log.action_type] || 'text-zinc-400 bg-white/5 border-white/10';
                        
                        return (
                            <motion.div
                                key={log.id}
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                className={cn(
                                    "group relative p-4 rounded-3xl border bg-zinc-900/40 hover:bg-zinc-800/40 transition-all cursor-pointer overflow-hidden",
                                    selectedLog?.id === log.id ? "border-primary/40 ring-1 ring-primary/20" : "border-white/5"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0", colorClass)}>
                                        <Icon size={20} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-black text-white">{log.admin_name}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                                                {new Date(log.created_at).toLocaleString('es-CO', { 
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest", colorClass)}>
                                                {log.action_type.replace('_', ' ')}
                                            </span>
                                            <p className="text-[11px] font-medium text-zinc-400 truncate">
                                                En <span className="text-zinc-200">{log.entity_type}</span> ID: <span className="font-mono text-primary/70">{log.entity_id || 'N/A'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <ChevronRight 
                                        size={20} 
                                        className={cn(
                                            "text-zinc-600 transition-transform duration-300", 
                                            selectedLog?.id === log.id ? "rotate-90 text-primary" : "group-hover:translate-x-1"
                                        )} 
                                    />
                                </div>

                                <AnimatePresence>
                                    {selectedLog?.id === log.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Detalles Técnicos</p>
                                                    <pre className="p-3 rounded-xl bg-black/40 border border-white/5 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2">Administrador</p>
                                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <Avatar name={log.admin_name} className="w-8 h-8 rounded-lg" />
                                                            <div>
                                                                <p className="text-xs font-bold text-white">{log.admin_name}</p>
                                                                <p className="text-[10px] text-zinc-500">{log.admin_email}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Entidad</p>
                                                            <p className="text-xs font-bold text-primary uppercase">{log.entity_type}</p>
                                                        </div>
                                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">IP Address</p>
                                                            <p className="text-xs font-mono text-zinc-400">{log.ip_address || '127.0.0.1'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
