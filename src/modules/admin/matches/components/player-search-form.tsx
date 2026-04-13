"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Loader2, Check } from "lucide-react";
import { Avatar, Button } from "@/components/ui-primitives";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface PlayerSearchFormProps {
  match: any;
  team: string; // 'equipo_a' | 'equipo_b'
  sportColor: string;
  onSelect: (player: { nombre: string; numero: string; profile_id: string }) => Promise<void>;
  onCancel: () => void;
  title?: string;
  autoFocus?: boolean;
}

export const PlayerSearchForm = ({
  match,
  team,
  sportColor,
  onSelect,
  onCancel,
  title,
  autoFocus = true,
}: PlayerSearchFormProps) => {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [form, setForm] = useState({ nombre: '', numero: '', profile_id: '' });
  const [loading, setLoading] = useState(false);

  // Debounced search logic
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const tokens = q.split(/\s+/);
        let pQuery = supabase.from('profiles').select('id, full_name, avatar_url');
        let jQuery = supabase.from('jugadores').select('id, nombre, profile_id');

        tokens.forEach(token => {
          if (token) {
            pQuery = pQuery.ilike('full_name', `%${token}%`);
            jQuery = jQuery.ilike('nombre', `%${token}%`);
          }
        });

        const [profilesRes, jugadoresRes] = await Promise.all([
          pQuery.limit(8),
          jQuery.limit(8)
        ]);

        const profiles = profilesRes.data || [];
        const players = jugadoresRes.data || [];

        const unified: any[] = [];
        const seenProfileIds = new Set();

        profiles.forEach(p => {
          unified.push({
            id: p.id,
            name: p.full_name,
            avatar: p.avatar_url,
            source: 'profile',
            badge: 'Cuenta Activa'
          });
          seenProfileIds.add(p.id);
        });

        players.forEach(j => {
          if (j.profile_id && seenProfileIds.has(j.profile_id)) return;
          unified.push({
            id: j.id,
            name: j.nombre,
            avatar: null,
            source: 'jugador',
            badge: 'Solo Acta',
            profile_id: j.profile_id
          });
        });

        setSearchResults(unified);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (item: any) => {
    setSelectedProfile(item);
    setForm(prev => ({
      ...prev,
      nombre: item.name,
      profile_id: item.source === 'profile' ? item.id : (item.profile_id || '')
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleConfirm = async () => {
    const finalNombre = mode === 'manual' ? form.nombre : (selectedProfile?.name || form.nombre);
    if (!finalNombre || loading) return;

    setLoading(true);
    try {
      await onSelect({
        nombre: finalNombre,
        numero: form.numero,
        profile_id: form.profile_id
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-4 rounded-xl border animate-in fade-in zoom-in-95 duration-200 space-y-3"
      style={{ borderColor: `${sportColor}25`, background: `${sportColor}05` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${sportColor}60` }}>
          {title || `Nuevo jugador — ${match[team === 'equipo_a' ? 'equipo_a' : 'equipo_b'] || 'Equipo'}`}
        </p>
        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            onClick={() => { setMode('search'); setSelectedProfile(null); }}
            className={cn(
              "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
              mode === 'search' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            Buscar en BD
          </button>
          <button
            type="button"
            onClick={() => { setMode('manual'); setSelectedProfile(null); }}
            className={cn(
              "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
              mode === 'manual' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
            )}
          >
            Manual
          </button>
        </div>
      </div>

      {mode === 'search' ? (
        <div className="space-y-2">
          {selectedProfile ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/5 animate-in slide-in-from-top-2 duration-200">
              <Avatar name={selectedProfile.name} src={selectedProfile.avatar} className="w-8 h-8 shrink-0 border border-white/10" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-white block truncate">{selectedProfile.name}</span>
                <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{selectedProfile.badge}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white"
              >×</button>
            </div>
          ) : (
            <div className="relative">
              <input
                placeholder="Escribe nombre para buscar..."
                className="w-full bg-black/20 border rounded-lg px-3 py-2.5 text-[11px] font-bold focus:outline-none transition-all placeholder:text-white/15 text-white"
                style={{ borderColor: `${sportColor}20` }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus={autoFocus}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {searching ? (
                  <Loader2 size={12} className="animate-spin text-white/30" />
                ) : (
                  <Search size={12} className="text-white/15" />
                )}
              </div>
            </div>
          )}

          {!selectedProfile && searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {searchResults.map((item, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectResult(item)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-white/5 hover:bg-white/5 transition-all text-left group"
                >
                  <Avatar name={item.name} src={item.avatar} className="w-7 h-7 shrink-0 border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-white/80 truncate block">{item.name}</span>
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/20">{item.badge}</span>
                  </div>
                  <Plus size={12} className="text-white/10 group-hover:text-white/40 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <input
          placeholder="Nombre del nuevo jugador"
          className="w-full bg-black/20 border rounded-lg px-3 py-2.5 text-[11px] font-bold focus:outline-none transition-all placeholder:text-white/15 text-white"
          style={{ borderColor: `${sportColor}20` }}
          value={form.nombre}
          onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
          autoFocus={autoFocus}
        />
      )}

      <div className="flex gap-2">
        <div className="relative w-16 shrink-0">
          <input
            placeholder="#"
            className="w-full bg-black/20 border rounded-lg px-2 py-2.5 text-[11px] text-center font-mono font-black focus:outline-none text-white placeholder:text-white/15"
            style={{ borderColor: `${sportColor}20` }}
            value={form.numero}
            onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          />
        </div>
        <Button
          onClick={handleConfirm}
          disabled={(!selectedProfile && !form.nombre) || loading}
          className="flex-1 h-9 font-black text-[9px] uppercase tracking-widest text-black"
          style={{ background: sportColor }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Registrar'}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center text-white/25 hover:text-white text-xs transition-all active:scale-90 border border-white/5"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
