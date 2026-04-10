"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, UserX, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Avatar } from "@/components/ui-primitives";

interface MatchMetaEditorProps {
  match: any;
  profile: any;
  onClose: () => void;
  onSaved: () => void;
}

const INDIVIDUAL_SPORTS = ['Tenis', 'Tenis de Mesa', 'Ajedrez', 'Natación'];

type ProfileResult = { 
  id: string; 
  full_name: string; 
  avatar_url?: string | null; 
  carrera?: { nombre: string } | null;
  source?: 'profile' | 'jugador';
  badge?: string;
  realId?: number;
  profile_id?: string | null;
};

function AthletePicker({
  label,
  current,
  disciplinaId,
  onSelect,
}: {
  label: string;
  current: ProfileResult | null;
  disciplinaId?: number;
  onSelect: (p: ProfileResult | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      // Dual search: Profiles and Jugadores
      const [profilesRes, jugadoresRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, carrera:carrera_id(nombre)').ilike('full_name', `%${q}%`).limit(10),
        supabase.from('jugadores').select('id, nombre, profile_id').ilike('nombre', `%${q}%`).limit(10)
      ]);

      const profiles = profilesRes.data || [];
      const players = jugadoresRes.data || [];

      // Unified results format
      const unified: any[] = [];
      const seenProfileIds = new Set();

      // 1. Add Profiles (Registered Users)
      profiles.forEach(p => {
        unified.push({
          id: p.id, // profile UUID
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          carrera: (p as any).carrera,
          source: 'profile',
          badge: 'Cuenta Activa'
        });
        seenProfileIds.add(p.id);
      });

      // 2. Add Players who DON'T have a profile among the ones we already found
      players.forEach(j => {
        if (j.profile_id && seenProfileIds.has(j.profile_id)) return;
        
        unified.push({
          id: String(j.id), // converting to string for unified state but we'll know it's a number
          realId: j.id,
          full_name: j.nombre,
          avatar_url: null,
          carrera: null,
          source: 'jugador',
          badge: 'Solo Acta',
          profile_id: j.profile_id
        });
      });

      setResults(unified);
    } catch (err) {
      console.error("Search error in picker:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleInput = (val: string) => {
    setQuery(val);
    setOpen(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const select = (p: ProfileResult) => {
    onSelect(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{label}</p>

      {/* Current athlete display */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-white/[0.03]">
        {current ? (
          <>
            <Avatar src={current.avatar_url} name={current.full_name} size="sm" className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-white truncate">{current.full_name}</p>
              {(current as any).carrera?.nombre && (
                <p className="text-[9px] text-white/30 font-bold truncate">{(current as any).carrera.nombre}</p>
              )}
            </div>
            <button
              onClick={() => onSelect(null)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all shrink-0"
              title="Limpiar (BYE)"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <UserX size={14} className="text-white/20" />
            </div>
            <span className="text-[11px] font-bold text-white/20 italic">BYE / Sin asignar</span>
          </>
        )}
      </div>

      {/* Search input */}
      <div ref={ref} className="relative">
        <div className="flex items-center gap-2 h-10 bg-white/[0.04] border border-white/10 rounded-xl px-3 focus-within:border-indigo-500/50 transition-colors">
          {searching ? <Loader2 size={13} className="text-white/30 animate-spin shrink-0" /> : <Search size={13} className="text-white/30 shrink-0" />}
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => query && setOpen(true)}
            placeholder="Buscar atleta por nombre…"
            className="flex-1 bg-transparent text-[11px] text-white font-bold outline-none placeholder:text-white/20"
          />
        </div>

        {/* Dropdown results */}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0f0f1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto">
            {results.map(p => (
              <button
                key={`${p.source}-${p.id}`}
                onClick={() => select(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <Avatar src={p.avatar_url} name={p.full_name} size="sm" className="w-7 h-7 rounded-lg shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{p.full_name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/20">{p.badge}</span>
                    {p.carrera?.nombre && (
                      <span className="text-[7px] text-white/10 font-bold truncate">• {p.carrera.nombre}</span>
                    )}
                  </div>
                </div>
                {current?.id === p.id && <Check size={12} className="text-indigo-400 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {open && !searching && query && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0f0f1a] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl">
            <p className="text-[10px] text-white/20 font-bold">Sin resultados para &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MatchMetaEditor({ match, profile: _profile, onClose, onSaved }: MatchMetaEditorProps) {
  const sport = match.disciplinas?.name || '';
  const isIndividual = INDIVIDUAL_SPORTS.includes(sport);

  // Date/lugar
  const toLocalDT = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [fecha, setFecha] = useState(match.fecha ? toLocalDT(match.fecha) : '');
  const [lugar, setLugar] = useState(match.lugar || '');

  // Athlete state (individual sports)
  const [atletaA, setAtletaA] = useState<ProfileResult | null>(match.atleta_a || null);
  const [atletaB, setAtletaB] = useState<ProfileResult | null>(match.atleta_b || null);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        fecha: fecha ? new Date(fecha).toISOString() : match.fecha,
        lugar: lugar.trim() || null,
      };

      if (isIndividual) {
        // Atleta A
        if (atletaA?.source === 'jugador') {
           updates.athlete_a_id = (atletaA as any).profile_id || null;
        } else {
           updates.athlete_a_id = atletaA?.id ?? null;
        }
        updates.equipo_a = atletaA?.full_name ?? 'BYE';

        // Atleta B
        if (atletaB?.source === 'jugador') {
           updates.athlete_b_id = (atletaB as any).profile_id || null;
        } else {
           updates.athlete_b_id = atletaB?.id ?? null;
        }
        updates.equipo_b = atletaB?.full_name ?? 'BYE';
      }

      const { error } = await supabase.from('partidos').update(updates).eq('id', match.id);
      if (error) throw error;

      toast.success('Partido actualizado');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0d0d14] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Editar Partido</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Fecha y hora</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full h-11 bg-white/[0.04] border border-white/10 rounded-xl px-4 text-sm text-white font-bold outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Lugar */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Lugar / Cancha</label>
            <input
              type="text"
              value={lugar}
              onChange={e => setLugar(e.target.value)}
              placeholder="Ej: Cancha 3, Pabellón Norte…"
              className="w-full h-11 bg-white/[0.04] border border-white/10 rounded-xl px-4 text-sm text-white font-bold outline-none focus:border-indigo-500/50 transition-colors placeholder:text-white/20"
            />
          </div>

          {/* Athlete pickers — individual sports only */}
          {isIndividual && (
            <>
              <div className="border-t border-white/5 pt-4 space-y-5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Atletas</p>
                <AthletePicker
                  label={`Atleta A · ${match.equipo_a || 'BYE'}`}
                  current={atletaA}
                  disciplinaId={match.disciplina_id}
                  onSelect={setAtletaA}
                />
                <AthletePicker
                  label={`Atleta B · ${match.equipo_b || 'BYE'}`}
                  current={atletaB}
                  disciplinaId={match.disciplina_id}
                  onSelect={setAtletaB}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-[9px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
