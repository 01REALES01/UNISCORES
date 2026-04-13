"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, Button } from "@/components/ui-primitives";
import { getDisplayName } from "@/lib/sport-helpers";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { PlayerSearchForm } from "./player-search-form";

const ORANGE = '#f97316';

interface BasketballBulkStatsProps {
  match: any;
  onSubmit: (
    equipo: 'equipo_a' | 'equipo_b',
    jugadorId: number,
    total: number,
    triples: number,
    dobles: number
  ) => Promise<void>;
  onAddPlayer: (team: string, data: { nombre: string; numero: string; profile_id: string }) => Promise<number | null>;
}

export const BasketballBulkStats = ({
  match,
  onSubmit,
  onAddPlayer,
}: BasketballBulkStatsProps) => {
  const [equipo, setEquipo] = useState<'equipo_a' | 'equipo_b'>('equipo_a');
  const [jugadorId, setJugadorId] = useState<number | null>(null);
  const [total, setTotal] = useState('');
  const [triples, setTriples] = useState('');
  const [dobles, setDobles] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Internal player lists — fetched without disciplina/genero filter so all
  // roster players appear regardless of how they were created.
  const [jugadoresA, setJugadoresA] = useState<any[]>([]);
  const [jugadoresB, setJugadoresB] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // New player form state
  const [addingPlayer, setAddingPlayer] = useState(false);

  const totalNum = parseInt(total) || 0;
  const triplesNum = parseInt(triples) || 0;
  const doblesNum = parseInt(dobles) || 0;
  const libres = totalNum - triplesNum * 3 - doblesNum * 2;
  const libresError = totalNum > 0 && libres < 0;

  const jugadores = equipo === 'equipo_a' ? jugadoresA : jugadoresB;
  // Validate that the selected player is actually in the visible list
  const selectedInList = jugadorId !== null && jugadores.some(j => j.id === jugadorId);
  const isValid = totalNum > 0 && selectedInList && !libresError;

  // ── Internal player fetch (carrera_id only — no disciplina/genero filter) ──
  // ── Internal player fetch (carrera_id + roster_partido) ──
  const fetchLocalPlayers = useCallback(async () => {
    setLoadingPlayers(true);
    try {
      // 1. Fetch EXPLICIT Roster (From roster_partido)
      const { data: explicitRoster } = await supabase
        .from('roster_partido')
        .select('*, jugador:jugadores(*)')
        .eq('partido_id', match.id);

      const explicitA = (explicitRoster || [])
        .filter(r => r.equipo_a_or_b === 'equipo_a' && r.jugador)
        .map(r => ({ ...r.jugador }));
      
      const explicitB = (explicitRoster || [])
        .filter(r => r.equipo_a_or_b === 'equipo_b' && r.jugador)
        .map(r => ({ ...r.jugador }));

      const seenIds = new Set((explicitRoster || []).map(r => r.jugador_id));

      // 2. Fetch VIRTUAL Roster (By Career IDs)
      let idsA: number[] = match.carrera_a_id ? [match.carrera_a_id] : [];
      let idsB: number[] = match.carrera_b_id ? [match.carrera_b_id] : [];

      const [{ data: delegA }, { data: delegB }] = await Promise.all([
        supabase.from('delegaciones').select('carrera_ids').ilike('nombre', match.equipo_a).maybeSingle(),
        supabase.from('delegaciones').select('carrera_ids').ilike('nombre', match.equipo_b).maybeSingle(),
      ]);

      if (delegA?.carrera_ids?.length) idsA = [...new Set([...idsA, ...delegA.carrera_ids])];
      if (delegB?.carrera_ids?.length) idsB = [...new Set([...idsB, ...delegB.carrera_ids])];

      const allIds = [...new Set([...idsA, ...idsB])];
      
      let finalA = [...explicitA];
      let finalB = [...explicitB];

      if (allIds.length > 0) {
        let query = supabase.from('jugadores').select('*').in('carrera_id', allIds);
        if (match.disciplina_id) query = query.eq('disciplina_id', match.disciplina_id);
        if (match.genero) query = query.eq('genero', match.genero);
        
        const { data: virtualPlayers } = await query;
        if (virtualPlayers) {
          virtualPlayers.forEach(v => {
            if (!seenIds.has(v.id)) {
              if (idsA.includes(v.carrera_id)) finalA.push(v);
              else if (idsB.includes(v.carrera_id)) finalB.push(v);
            }
          });
        }
      }

      const sorter = (a: any, b: any) => a.nombre.localeCompare(b.nombre);
      setJugadoresA(finalA.sort(sorter));
      setJugadoresB(finalB.sort(sorter));
    } finally {
      setLoadingPlayers(false);
    }
  }, [match]);

  useEffect(() => {
    fetchLocalPlayers();
  }, [fetchLocalPlayers]);

  const handleEquipoChange = (eq: 'equipo_a' | 'equipo_b') => {
    setEquipo(eq);
    setJugadorId(null);
    setAddingPlayer(false);
  };

  const reset = () => {
    setTotal('');
    setTriples('');
    setDobles('');
    setJugadorId(null);
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(equipo, jugadorId!, totalNum, triplesNum, doblesNum);
      reset();
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div
      className="rounded-[2rem] border overflow-hidden"
      style={{ borderColor: `${ORANGE}15`, background: `linear-gradient(to bottom, ${ORANGE}06, transparent)` }}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: `${ORANGE}08` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl">🏀</div>
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
            Puntos por Jugador
          </h3>
          <p className="text-[9px] font-bold text-white/20 mt-0.5">
            Asigna el total anotado sin registrar evento a evento
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Step 1: Team */}
        <div>
          <p className="text-[9px] font-black uppercase text-white/25 mb-3 tracking-[0.25em]">
            1. Equipo
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['equipo_a', 'equipo_b'] as const).map(tid => (
              <button
                key={tid}
                onClick={() => handleEquipoChange(tid)}
                className="py-3 px-3 rounded-xl border-2 transition-all flex items-center gap-2"
                style={
                  equipo === tid
                    ? { borderColor: `${ORANGE}40`, background: `${ORANGE}12` }
                    : { borderColor: `${ORANGE}10`, background: `${ORANGE}03` }
                }
              >
                <Avatar
                  name={getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}
                  src={tid === 'equipo_a' ? match.carrera_a?.escudo_url : match.carrera_b?.escudo_url}
                  className="w-7 h-7 border border-white/10 shrink-0"
                />
                <span
                  className={cn(
                    'font-black text-[10px] uppercase tracking-tight truncate',
                    equipo === tid ? 'text-white/90' : 'text-white/40'
                  )}
                >
                  {getDisplayName(match, tid === 'equipo_a' ? 'a' : 'b')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Player */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black uppercase text-white/25 tracking-[0.25em]">
              2. Jugador
            </p>
            <button
              onClick={() => setAddingPlayer(true)}
              className="text-[9px] font-black uppercase text-orange-500/60 hover:text-orange-500 transition-colors"
            >
              + Nuevo
            </button>
          </div>

          {addingPlayer && (
            <div className="mb-4">
              <PlayerSearchForm
                match={match}
                team={equipo}
                sportColor={ORANGE}
                onSelect={async (data) => {
                  const newId = await onAddPlayer(equipo, data);
                  await fetchLocalPlayers();
                  setAddingPlayer(false);
                  if (newId) setJugadorId(newId);
                }}
                onCancel={() => setAddingPlayer(false)}
              />
            </div>
          )}

          {/* Player list */}
          {loadingPlayers ? (
            <div className="py-6 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-orange-500/40" />
              <span className="text-[9px] font-black text-white/15 uppercase tracking-widest">Cargando...</span>
            </div>
          ) : jugadores.length === 0 ? (
            <div
              className="py-5 text-center rounded-xl border border-dashed"
              style={{ borderColor: `${ORANGE}12` }}
            >
              <p className="text-[9px] font-black text-white/15 uppercase tracking-widest">
                Sin jugadores — usa &ldquo;+ Nuevo&rdquo; para agregar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
              {jugadores.map(j => (
                <button
                  key={j.id}
                  onClick={() => setJugadorId(j.id === jugadorId ? null : j.id)}
                  className="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all"
                  style={
                    jugadorId === j.id
                      ? { background: ORANGE, color: '#000', borderColor: ORANGE }
                      : { borderColor: `${ORANGE}08`, background: `${ORANGE}03` }
                  }
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[9px] font-black border shrink-0"
                    style={
                      jugadorId === j.id
                        ? { background: 'rgba(0,0,0,0.3)', borderColor: 'transparent', color: '#fff' }
                        : { background: `${ORANGE}10`, borderColor: `${ORANGE}15`, color: `${ORANGE}70` }
                    }
                  >
                    {j.numero || '?'}
                  </div>
                  <span className="truncate text-[10px] font-black uppercase tracking-tight">
                    {j.nombre}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Stats */}
        <div>
          <p className="text-[9px] font-black uppercase text-white/25 mb-3 tracking-[0.25em]">
            3. Estadísticas
          </p>
          <div className="grid grid-cols-4 gap-2">
            {/* Total Pts */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Pts</span>
              <input
                type="number"
                min="0"
                value={total}
                onChange={e => setTotal(e.target.value)}
                placeholder="0"
                className="w-full bg-black/20 border rounded-lg px-2 py-2.5 text-center text-sm font-black tabular-nums focus:outline-none transition-all"
                style={{ borderColor: `${ORANGE}30`, color: ORANGE }}
              />
            </div>
            {/* Triples */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                Triples <span className="text-white/15">×3</span>
              </span>
              <input
                type="number"
                min="0"
                value={triples}
                onChange={e => setTriples(e.target.value)}
                placeholder="0"
                className="w-full bg-black/20 border rounded-lg px-2 py-2.5 text-center text-sm font-black tabular-nums focus:outline-none transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              />
            </div>
            {/* Dobles */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                Dobles <span className="text-white/15">×2</span>
              </span>
              <input
                type="number"
                min="0"
                value={dobles}
                onChange={e => setDobles(e.target.value)}
                placeholder="0"
                className="w-full bg-black/20 border rounded-lg px-2 py-2.5 text-center text-sm font-black tabular-nums focus:outline-none transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              />
            </div>
            {/* Tiros Libres — computed, read-only */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                Libres <span className="text-white/15">×1</span>
              </span>
              <div
                className={cn(
                  'w-full border rounded-lg px-2 py-2.5 text-center text-sm font-black tabular-nums select-none',
                  libresError
                    ? 'border-red-500/30 text-red-400 bg-red-500/10'
                    : 'border-white/5 text-white/30 bg-white/[0.03]'
                )}
              >
                {totalNum > 0 ? libres : '—'}
              </div>
            </div>
          </div>

          {libresError && (
            <p className="mt-2 text-[9px] font-bold text-red-400">
              ⚠ Los dobles y triples superan el total de puntos.
            </p>
          )}
          {isValid && (
            <p className="mt-2 text-[9px] font-bold text-white/20">
              Se crearán: {triplesNum}×+3, {doblesNum}×+2, {libres}×+1 = {totalNum} pts
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2"
          style={
            isValid && !submitting
              ? { background: ORANGE, color: '#000', boxShadow: `0 8px 25px ${ORANGE}25` }
              : {
                  background: `${ORANGE}08`,
                  color: `${ORANGE}30`,
                  border: `1px solid ${ORANGE}10`,
                  cursor: 'not-allowed',
                }
          }
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} strokeWidth={3} />
          )}
          {submitting
            ? 'Registrando...'
            : selectedInList
            ? `Registrar ${totalNum > 0 ? totalNum + ' pts' : ''}`
            : 'Selecciona un jugador'}
        </button>
      </div>
    </div>
  );
};
