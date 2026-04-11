"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Save, Loader2, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { stampAudit } from "@/lib/audit-helpers";
import { recalculateTotals } from "@/lib/sport-scoring";
import { getDisplayName } from "@/lib/sport-helpers";
import { toast } from "sonner";
import { SPORT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface TenisEditorProps {
  match: any;
  profile: any;
  onSaved: () => void;
}

// A set score row
type SetScore = { a: number; b: number };

// Max sets — igual para ambos deportes
const MAX_SETS = 8;

// Is set complete/won — returns who won ('a' | 'b' | null)
function setWinner(sport: string, a: number, b: number): 'a' | 'b' | null {
  if (sport === 'Tenis') {
    // standard: 6-0..6-4, 7-5, 7-6
    const wonA = (a === 6 && b <= 4) || (a === 7 && (b === 5 || b === 6));
    const wonB = (b === 6 && a <= 4) || (b === 7 && (a === 5 || a === 6));
    if (wonA) return 'a';
    if (wonB) return 'b';
    return null;
  }
  if (sport === 'Tenis de Mesa') {
    if (a >= 11 && a - b >= 2) return 'a';
    if (b >= 11 && b - a >= 2) return 'b';
    return null;
  }
  return null;
}

export function TenisEditor({ match, profile, onSaved }: TenisEditorProps) {
  const sport = match.disciplinas?.name || '';
  const sportColor = SPORT_COLORS[sport] || '#84cc16';
  const isTenisField = sport === 'Tenis';
  const maxSets = MAX_SETS;
  // field names inside each set object
  const fieldA = isTenisField ? 'juegos_a' : 'puntos_a';
  const fieldB = isTenisField ? 'juegos_b' : 'puntos_b';

  const [sets, setSets] = useState<SetScore[]>([]);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'rapido' | 'detallado'>('rapido');
  const [directA, setDirectA] = useState(0);
  const [directB, setDirectB] = useState(0);

  useEffect(() => {
    const detalle = match.marcador_detalle || {};
    const existing = detalle.sets || {};
    const numSets = Math.max(detalle.set_actual || 1, ...Object.keys(existing).map(Number), 1);
    const loaded: SetScore[] = [];
    for (let i = 1; i <= numSets; i++) {
      loaded.push({
        a: existing[i]?.[fieldA] ?? 0,
        b: existing[i]?.[fieldB] ?? 0,
      });
    }
    setSets(loaded);
    // Cargar sets ganados para modo rápido
    setDirectA(detalle.sets_a ?? detalle.sets_total_a ?? 0);
    setDirectB(detalle.sets_b ?? detalle.sets_total_b ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, sport]);

  const updateSet = (idx: number, side: 'a' | 'b', value: number) => {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [side]: Math.max(0, value) } : s));
  };

  const deleteSet = (idx: number) => {
    setSets(prev => prev.filter((_, i) => i !== idx));
    toast.info(`Set ${idx + 1} eliminado — confirma para aplicar`);
  };

  const addSet = () => {
    if (sets.length >= MAX_SETS) { toast.warning(`Máximo ${MAX_SETS} sets`); return; }
    setSets(prev => [...prev, { a: 0, b: 0 }]);
  };

  const setsWonA = sets.filter((s, i) => setWinner(sport, s.a, s.b) === 'a').length;
  const setsWonB = sets.filter((s, i) => setWinner(sport, s.a, s.b) === 'b').length;

  const save = async () => {
    setSaving(true);
    try {
      const { data: fresh } = await supabase
        .from('partidos').select('marcador_detalle').eq('id', match.id).single();

      let newDetalle: any = { ...(fresh?.marcador_detalle || match.marcador_detalle || {}) };

      if (mode === 'rapido') {
        // Modo rápido: solo actualizar sets ganados, sin tocar sets por set
        newDetalle.sets_a = directA;
        newDetalle.sets_b = directB;
        newDetalle.sets_total_a = directA;
        newDetalle.sets_total_b = directB;
      } else {
        // Modo detallado: reconstruir sets object + recalcular
        const setsObj: Record<number, any> = {};
        sets.forEach((s, idx) => {
          setsObj[idx + 1] = {
            ...(newDetalle.sets?.[idx + 1] || {}),
            [fieldA]: s.a,
            [fieldB]: s.b,
            // keep the other pair (puntos/juegos) zeroed if not editing
            ...(isTenisField
              ? { puntos_a: newDetalle.sets?.[idx + 1]?.puntos_a ?? 0, puntos_b: newDetalle.sets?.[idx + 1]?.puntos_b ?? 0 }
              : {}),
          };
        });
        newDetalle.sets = setsObj;
        newDetalle.set_actual = sets.length || 1;
        newDetalle = recalculateTotals(sport, newDetalle);
      }

      const updates: Record<string, any> = {
        marcador_detalle: stampAudit(newDetalle, profile),
      };

      // If match is finalized, ensure result is reflected in the detail object
      if (match.estado === 'finalizado') {
        const finalSetsA = newDetalle.sets_a ?? newDetalle.sets_total_a ?? 0;
        const finalSetsB = newDetalle.sets_b ?? newDetalle.sets_total_b ?? 0;
        newDetalle.resultado_final = finalSetsA > finalSetsB ? 'victoria_a' : finalSetsB > finalSetsA ? 'victoria_b' : 'empate';
        updates.marcador_detalle = stampAudit(newDetalle, profile);
      }

      const { error } = await supabase.from('partidos').update(updates).eq('id', match.id);
      if (error) throw error;

      toast.success('Marcador de tenis actualizado');
      onSaved();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const nameA = getDisplayName(match, 'a');
  const nameB = getDisplayName(match, 'b');
  const scoreLabel = isTenisField ? 'juegos' : 'pts';

  return (
    <div className="space-y-3 py-2">
      {/* Sets won summary */}
      <div className="grid grid-cols-3 items-center py-3 px-4 rounded-2xl border border-white/5 bg-white/[0.03]">
        <div>
          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{nameA}</p>
          <span className="text-3xl font-black text-white tabular-nums">
            {mode === 'rapido' ? directA : setsWonA}
          </span>
          <span className="text-[8px] font-bold text-white/30 ml-1">sets</span>
        </div>
        <span className="text-white/10 font-black text-xl text-center">vs</span>
        <div className="text-right">
          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest truncate">{nameB}</p>
          <span className="text-3xl font-black text-white tabular-nums">
            {mode === 'rapido' ? directB : setsWonB}
          </span>
          <span className="text-[8px] font-bold text-white/30 mr-1">sets</span>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-1">
        <button
          onClick={() => setMode('rapido')}
          className={cn(
            "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
            mode === 'rapido'
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-white/40 hover:text-white/60"
          )}
        >
          Sets directos
        </button>
        <button
          onClick={() => setMode('detallado')}
          className={cn(
            "flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
            mode === 'detallado'
              ? "bg-indigo-600 text-white shadow-lg"
              : "text-white/40 hover:text-white/60"
          )}
        >
          Por set
        </button>
      </div>

      {/* Winner badge if one player leads */}
      {match.estado === 'finalizado' && (
        (mode === 'rapido' ? directA !== directB : setsWonA !== setsWonB)
      ) && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <Crown size={13} className="text-amber-400 shrink-0" />
          <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
            {(mode === 'rapido' ? directA : setsWonA) > (mode === 'rapido' ? directB : setsWonB) ? nameA : nameB} gana el partido
          </span>
          <span className="text-[9px] text-white/30 ml-auto">al guardar se actualizará en BD</span>
        </div>
      )}

      {/* MODO RÁPIDO: Sets directos */}
      {mode === 'rapido' && (
        <div className="space-y-3 py-2">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] px-1">Sets ganados</p>
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            {/* Team A */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/60 text-center">{nameA}</p>
              <div className="flex items-center justify-center gap-2 bg-white/[0.04] rounded-2xl border border-white/10 p-3">
                <button
                  onClick={() => setDirectA(Math.max(0, directA - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold"
                >−</button>
                <span className="text-4xl font-black text-white tabular-nums min-w-[48px] text-center">{directA}</span>
                <button
                  onClick={() => setDirectA(directA + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold"
                >+</button>
              </div>
            </div>

            {/* Team B */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-white/60 text-center">{nameB}</p>
              <div className="flex items-center justify-center gap-2 bg-white/[0.04] rounded-2xl border border-white/10 p-3">
                <button
                  onClick={() => setDirectB(Math.max(0, directB - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold"
                >−</button>
                <span className="text-4xl font-black text-white tabular-nums min-w-[48px] text-center">{directB}</span>
                <button
                  onClick={() => setDirectB(directB + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold"
                >+</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODO DETALLADO: Score por set */}
      {mode === 'detallado' && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[36px_1fr_1fr_28px_28px] gap-2 items-center px-1">
            <span />
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] text-center truncate">{nameA}</p>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] text-center truncate">{nameB}</p>
            <span />
            <span />
          </div>

          {/* Set rows */}
          {sets.map((s, idx) => {
            const winner = setWinner(sport, s.a, s.b);
            return (
              <div key={idx} className="grid grid-cols-[36px_1fr_1fr_28px_28px] gap-2 items-center">
                {/* Set label */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: `${sportColor}90` }}>
                    S{idx + 1}
                  </span>
                  {winner && (
                    <span className={cn(
                      "text-[7px] font-black mt-0.5",
                      winner === 'a' ? 'text-emerald-400' : 'text-blue-400'
                    )}>
                      {winner === 'a' ? '◀' : '▶'}
                    </span>
                  )}
                </div>

                {/* Team A stepper */}
                <Stepper
                  value={s.a}
                  onChange={(v) => updateSet(idx, 'a', v)}
                  color={sportColor}
                  highlight={winner === 'a'}
                />

                {/* Team B stepper */}
                <Stepper
                  value={s.b}
                  onChange={(v) => updateSet(idx, 'b', v)}
                  color={sportColor}
                  highlight={winner === 'b'}
                />

                {/* Score label */}
                <span className="text-[7px] text-white/20 font-bold text-center">{scoreLabel}</span>

                {/* Delete */}
                <button
                  onClick={() => deleteSet(idx)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          {/* Add set */}
          {sets.length < MAX_SETS && (
            <button
              onClick={addSet}
              className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-[10px] font-black text-white/30 hover:text-white/60 hover:border-white/20 uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={12} />
              Agregar Set {sets.length + 1}
            </button>
          )}
        </>
      )}

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full h-12 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        style={{ background: sportColor, boxShadow: `0 4px 20px ${sportColor}40` }}
      >
        {saving ? <Loader2 size={16} className="animate-spin text-black" /> : <Save size={16} />}
        {saving ? 'Guardando...' : 'Confirmar Marcador'}
      </button>
    </div>
  );
}

function Stepper({
  value, onChange, color, highlight,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
  highlight: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1 rounded-2xl border p-1 transition-colors"
      style={highlight
        ? { background: `${color}18`, borderColor: `${color}40` }
        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }
      }
    >
      <button
        onClick={() => onChange(value - 1)}
        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold shrink-0"
      >−</button>
      <span
        className="text-xl font-black tabular-nums min-w-[28px] text-center select-none"
        style={{ color: highlight ? color : 'white' }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 font-bold shrink-0"
        style={{ color, background: `${color}20` }}
      >+</button>
    </div>
  );
}
