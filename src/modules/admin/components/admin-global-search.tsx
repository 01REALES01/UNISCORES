"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, Users, GraduationCap, ArrowRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui-primitives";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SearchResult = {
    id: string | number;
    type: 'profile' | 'jugador' | 'carrera';
    title: string;
    subtitle?: string;
    avatar?: string;
    href: string;
};

export function AdminGlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const tokens = q.split(/\s+/).filter(Boolean);
                
                let pQuery = supabase.from('profiles').select('id, full_name, avatar_url, carrera:carreras!carrera_id(nombre)');
                let jQuery = supabase.from('jugadores').select('id, nombre, profile_id, carrera:carreras!carrera_id(nombre)');
                let cQuery = supabase.from('carreras').select('id, nombre, escudo_url');

                tokens.forEach(t => {
                    pQuery = pQuery.ilike('full_name', `%${t}%`);
                    jQuery = jQuery.ilike('nombre', `%${t}%`);
                    cQuery = cQuery.ilike('nombre', `%${t}%`);
                });

                const [profiles, jugadores, carreras] = await Promise.all([
                    pQuery.limit(5),
                    jQuery.limit(5),
                    cQuery.limit(5)
                ]);

                const combined: SearchResult[] = [];

                // Profiles
                (profiles.data || []).forEach(p => {
                    combined.push({
                        id: p.id,
                        type: 'profile',
                        title: p.full_name,
                        subtitle: (p as any).carrera?.nombre || 'Usuario Registrado',
                        avatar: p.avatar_url,
                        href: `/admin/usuarios?search=${encodeURIComponent(p.full_name)}` // Or direct to profile if we had an admin profile view
                    });
                });

                // Jugadores
                (jugadores.data || []).forEach(j => {
                    // Skip if profile already added (if we had IDs to match)
                    combined.push({
                        id: j.id,
                        type: 'jugador',
                        title: j.nombre,
                        subtitle: (j as any).carrera?.nombre || 'Solo Acta',
                        href: `/admin/jugadores?search=${encodeURIComponent(j.nombre)}`
                    });
                });

                // Carreras
                (carreras.data || []).forEach(c => {
                    combined.push({
                        id: c.id,
                        type: 'carrera',
                        title: c.nombre,
                        subtitle: 'Programa Académico',
                        avatar: c.escudo_url,
                        href: `/admin/puntos?tab=clasificacion&carrera=${c.id}`
                    });
                });

                setResults(combined);
            } catch (err) {
                console.error("Global search error:", err);
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (href: string) => {
        router.push(href);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-md">
            <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Buscar deportistas, programas o usuarios..."
                    className="w-full h-10 pl-9 pr-10 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all"
                />
                {query && (
                    <button 
                        onClick={() => { setQuery(""); setResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && (query.length >= 2) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#12121c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2 space-y-1">
                        {searching && results.length === 0 && (
                            <div className="flex items-center gap-3 p-4">
                                <Loader2 size={16} className="animate-spin text-violet-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Buscando...</span>
                            </div>
                        )}

                        {!searching && results.length === 0 && (
                            <div className="p-8 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No se encontraron resultados</p>
                            </div>
                        )}

                        {results.map((res) => (
                            <button
                                key={`${res.type}-${res.id}`}
                                onClick={() => handleSelect(res.href)}
                                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                                    {res.avatar ? (
                                        <img src={res.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : res.type === 'profile' ? (
                                        <User size={14} className="text-violet-400/60" />
                                    ) : res.type === 'jugador' ? (
                                        <Users size={14} className="text-emerald-400/60" />
                                    ) : (
                                        <GraduationCap size={14} className="text-amber-400/60" />
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-white truncate">{res.title}</span>
                                        <span className={cn(
                                            "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                                            res.type === 'profile' ? "bg-violet-500/10 text-violet-400" :
                                            res.type === 'jugador' ? "bg-emerald-500/10 text-emerald-400" :
                                            "bg-amber-500/10 text-amber-400"
                                        )}>
                                            {res.type === 'profile' ? 'Atleta (Reg)' : res.type === 'jugador' ? 'Atleta (Acta)' : 'Carrera'}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 truncate">{res.subtitle}</p>
                                </div>

                                <ArrowRight size={12} className="text-white/0 group-hover:text-white/20 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        ))}
                    </div>

                    {query.length >= 2 && !searching && (
                        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">
                                Sugerencias para &quot;{query}&quot;
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
