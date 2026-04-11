"use client";

import { useState, useRef, useEffect } from 'react';
import { X, Search, Loader2, UserX, Check, Plus, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui-primitives';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MatchMetaEditorProps {
  match: any;
  profile: any;
  onClose: () => void;
  onSaved: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Crear Atleta Rápido (para MatchMetaEditor)
// ─────────────────────────────────────────────────────────────────────────────

function ModalCrearAtleta({ 
  initialName, 
  onClose, 
  onCreated 
}: { 
  initialName: string, 
  onClose: () => void, 
  onCreated: (p: ProfileResult) => void 
}) {
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState(initialName);
  const [carreras, setCarreras] = useState<any[]>([]);
  const [carreraId, setCarreraId] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('carreras').select('id, nombre').order('nombre').then(({ data }) => {
      if (data) setCarreras(data);
    });
  }, []);

  const handleCreate = async () => {
    if (!nombre.trim()) return toast.error('El nombre es obligatorio');
    if (!carreraId) return toast.error('El programa es obligatorio');

    setLoading(true);
    try {
      const { data, error } = await supabase.from('jugadores').insert({
        nombre: nombre.trim(),
        carrera_id: carreraId,
      }).select('*, carrera:carrera_id(nombre)').single();

      if (error) throw error;
      
      const newAtleta: ProfileResult = {
        id: String(data.id),
        realId: data.id,
        full_name: data.nombre,
        avatar_url: null,
        carrera: data.carrera,
        source: 'jugador',
        badge: 'Solo Acta',
        profile_id: null
      };

      toast.success('Deportista creado y seleccionado');
      onCreated(newAtleta);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs bg-[#0b0b14] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Nuevo Deportista</h3>
          <button onClick={onClose} className="text-white/20 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white font-bold outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Programa / Carrera</label>
            <select
              value={carreraId || ''}
              onChange={e => setCarreraId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-2 text-xs text-white font-bold outline-none focus:border-violet-500/50"
            >
              <option value="">Seleccionar...</option>
              {carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Guardando...' : 'Crear y Seleccionar'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [showCreate, setShowCreate] = useState(false);
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
      const tokens = q.trim().split(/\s+/);
      
      let pQuery = supabase.from('profiles').select('id, full_name, avatar_url, carrera:carrera_id(nombre)');
      let jQuery = supabase.from('jugadores').select('id, nombre, profile_id');

      tokens.forEach(token => {
          pQuery = pQuery.ilike('full_name', `%${token}%`);
          jQuery = jQuery.ilike('nombre', `%${token}%`);
      });

      const [profilesRes, jugadoresRes] = await Promise.all([
        pQuery.limit(10),
        jQuery.limit(10)
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
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0f0f1a] border border-white/10 rounded-2xl px-4 py-3 shadow-2xl space-y-3">
            <p className="text-[10px] text-white/20 font-bold">Sin resultados para &quot;{query}&quot;</p>
            <button 
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-xl text-[10px] font-black text-violet-400 uppercase tracking-widest transition-all"
            >
              <Plus size={12} /> Agregar como nuevo deportista
            </button>
          </div>
        )}

        {showCreate && (
          <ModalCrearAtleta 
            initialName={query}
            onClose={() => setShowCreate(false)}
            onCreated={(newP) => {
              select(newP);
              setShowCreate(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Helpers: normalize athlete from match join data ─────────────────────────
function normalizarAtleta(match: any, side: 'a' | 'b'): ProfileResult | null {
  const joined = side === 'a' ? match.atleta_a : match.atleta_b;
  const athleteId = side === 'a' ? match.athlete_a_id : match.athlete_b_id;
  const name = side === 'a' ? match.equipo_a : match.equipo_b;

  if (joined?.id) {
    return {
      id: joined.id,
      full_name: joined.full_name || name || '',
      avatar_url: joined.avatar_url ?? null,
      carrera: joined.carrera ?? null,
      source: 'profile',
      badge: 'Cuenta Activa',
    };
  }
  if (athleteId && name && name !== 'BYE') {
    return {
      id: athleteId,
      full_name: name,
      avatar_url: null,
      carrera: null,
      source: 'profile',
      badge: 'Cuenta Activa',
    };
  }
  return null;
}

async function resolverCarreraId(atleta: ProfileResult | null): Promise<number | null> {
  if (!atleta) return null;
  if ((atleta.carrera as any)?.id) return (atleta.carrera as any).id;
  if (atleta.source === 'profile') {
    // Fetch both carrera_id (scalar) and carreras_ids (array) — use whichever is available
    const { data } = await supabase
      .from('profiles')
      .select('carrera_id, carreras_ids')
      .eq('id', atleta.id)
      .maybeSingle();
    return data?.carrera_id ?? data?.carreras_ids?.[0] ?? null;
  }
  if (atleta.source === 'jugador' && atleta.realId) {
    const { data } = await supabase.from('jugadores').select('carrera_id').eq('id', atleta.realId).maybeSingle();
    return data?.carrera_id ?? null;
  }
  return null;
}


async function resolverDelegacionId(carreraId: number | null, match: any): Promise<number | null> {
  if (!carreraId || !match.disciplina_id) return null;
  let query = supabase
    .from('delegaciones')
    .select('id')
    .contains('carrera_ids', [carreraId])
    .eq('disciplina_id', match.disciplina_id);
  if (match.genero) query = query.eq('genero', match.genero);
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
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

  // Athlete state (individual sports) — properly normalized from join data
  const [atletaA, setAtletaA] = useState<ProfileResult | null>(() => normalizarAtleta(match, 'a'));
  const [atletaB, setAtletaB] = useState<ProfileResult | null>(() => normalizarAtleta(match, 'b'));

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        fecha: fecha ? new Date(fecha).toISOString() : match.fecha,
        lugar: lugar.trim() || null,
      };

      if (isIndividual) {
        // Resolve carrera + delegacion for both sides in parallel
        const [carreraAId, carreraBId] = await Promise.all([
          resolverCarreraId(atletaA),
          resolverCarreraId(atletaB)
        ]);
        const [delegAId, delegBId] = await Promise.all([
          resolverDelegacionId(carreraAId, match),
          resolverDelegacionId(carreraBId, match)
        ]);

        // Atleta A
        updates.athlete_a_id = atletaA?.source === 'jugador'
          ? (atletaA.profile_id || null)
          : (atletaA?.id ?? null);
        updates.equipo_a = atletaA?.full_name ?? 'BYE';
        if (carreraAId) {
          updates.carrera_a_id = carreraAId;
          updates.carrera_a_ids = [carreraAId];
        } else {
          updates.carrera_a_id = null;
          updates.carrera_a_ids = null;
        }
        if (delegAId) updates.delegacion_a_id = delegAId;

        // Atleta B
        updates.athlete_b_id = atletaB?.source === 'jugador'
          ? (atletaB.profile_id || null)
          : (atletaB?.id ?? null);
        updates.equipo_b = atletaB?.full_name ?? 'BYE';
        if (carreraBId) {
          updates.carrera_b_id = carreraBId;
          updates.carrera_b_ids = [carreraBId];
        } else {
          updates.carrera_b_id = null;
          updates.carrera_b_ids = null;
        }
        if (delegBId) updates.delegacion_b_id = delegBId;
      }

      const { error } = await supabase.from('partidos').update(updates).eq('id', match.id);
      if (error) throw error;

      // ─── Sync Roster (for individual athletes' visibility in their profiles) ───
      // We sync roster_partido to ensure the nominal player profile displays this match.
      const syncRoster = async (side: 'equipo_a' | 'equipo_b', athlete: ProfileResult | null) => {
        // 1. Always clear existing for this side to avoid residuals when swapping/clearing
        await supabase.from('roster_partido').delete().eq('partido_id', match.id).eq('equipo_a_or_b', side);

        // 2. Add current if it's a nominal athlete
        if (athlete?.source === 'jugador' && athlete.realId) {
          await supabase.from('roster_partido').insert({
            partido_id: match.id,
            jugador_id: athlete.realId,
            equipo_a_or_b: side
          });
        }
      };

      await Promise.all([
        syncRoster('equipo_a', atletaA),
        syncRoster('equipo_b', atletaB)
      ]);

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
                  label={`Atleta A · ${atletaA?.full_name || 'BYE'}`}
                  current={atletaA}
                  disciplinaId={match.disciplina_id}
                  onSelect={setAtletaA}
                />
                <AthletePicker
                  label={`Atleta B · ${atletaB?.full_name || 'BYE'}`}
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
