"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Save, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { stampAudit } from "@/lib/audit-helpers";
import { recalculateTotals } from "@/lib/sport-scoring";
import { getDisplayName } from "@/lib/sport-helpers";
import { toast } from "sonner";
import { SPORT_COLORS } from "@/lib/constants";

interface ScoreBreakdownEditorProps {
  match: any;
  profile: any;
  onSaved: () => void;
}

export function ScoreBreakdownEditor({ match, profile, onSaved }: ScoreBreakdownEditorProps) {
  const sport = match.disciplinas?.name || '';
  const sportColor = SPORT_COLORS[sport] || '#6366f1';
  const detalle = match.marcador_detalle || {};

  type PeriodScore = { puntos_a: number; puntos_b: number };

  const [periods, setPeriods] = useState<Record<number, PeriodScore>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sport === 'Voleibol') {
      const existing = detalle.sets || {};
      const maxSet = Math.max(detalle.set_actual || 1, ...Object.keys(existing).map(Number), 1);
      const normalized: Record<number, PeriodScore> = {};
      for (let i = 1; i <= maxSet; i++) {
        normalized[i] = { puntos_a: existing[i]?.puntos_a ?? 0, puntos_b: existing[i]?.puntos_b ?? 0 };
      }
      setPeriods(normalized);
    } else if (sport === 'Baloncesto') {
      const existing = detalle.cuartos || {};
      const normalized: Record<number, PeriodScore> = {};
      for (let i = 1; i <= 4; i++) {
        normalized[i] = { puntos_a: existing[i]?.puntos_a ?? 0, puntos_b: existing[i]?.puntos_b ?? 0 };
      }
      setPeriods(normalized);
    }
  }, [match.id, sport]);

  const updatePeriod = (num: number, field: 'puntos_a' | 'puntos_b', value: number) => {
    setPeriods(prev => ({
      ...prev,
      [num]: { ...prev[num], [field]: Math.max(0, value) },
    }));
  };

  const deleteSet = (num: number) => {
    setPeriods(prev => {
      const keys = Object.keys(prev).map(Number).sort((a, b) => a - b);
      if (keys.length <= 1) {
        toast.error('No se puede eliminar el único set');
        return prev;
      }
      
      const entries = Object.entries(prev)
        .map(([k, v]) => [Number(k), v] as [number, PeriodScore])
        .filter(([k]) => k !== num)
        .sort(([a], [b]) => a - b);
      
      const renumbered: Record<number, PeriodScore> = {};
      entries.forEach(([, v], idx) => { renumbered[idx + 1] = v; });
      return renumbered;
    });
    toast.info(`Set ${num} eliminado — se han renumerado los sets posteriores`);
  };

  const addSet = () => {
    const nums = Object.keys(periods).map(Number);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    if (next > 5) { toast.warning('Máximo 5 sets'); return; }
    setPeriods(prev => ({ ...prev, [next]: { puntos_a: 0, puntos_b: 0 } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: fresh } = await supabase
        .from('partidos').select('marcador_detalle').eq('id', match.id).single();

      let newDetalle = { ...(fresh?.marcador_detalle || detalle) };

      if (sport === 'Voleibol') {
        newDetalle.sets = periods;
        const sortedNums = Object.keys(periods).map(Number).sort((a, b) => a - b);
        // Ensure set_actual is not pointing to a deleted set index
        const lastSet = sortedNums[sortedNums.length - 1] || 1;
        newDetalle.set_actual = Math.min(newDetalle.set_actual || 1, lastSet);
        if ((newDetalle.set_actual || 1) < 1) newDetalle.set_actual = 1;
        
        newDetalle = recalculateTotals(sport, newDetalle);
      } else if (sport === 'Baloncesto') {
        newDetalle.cuartos = periods;
        newDetalle = recalculateTotals(sport, newDetalle);
      }

      const { error } = await supabase
        .from('partidos')
        .update({ marcador_detalle: stampAudit(newDetalle, profile) })
        .eq('id', match.id);

      if (error) throw error;
      toast.success('Marcador actualizado correctamente');
      await onSaved?.();
    } catch (err: any) {
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (sport !== 'Voleibol' && sport !== 'Baloncesto') return null;

  const nameA = getDisplayName(match, 'a');
  const nameB = getDisplayName(match, 'b');
  const isVoleibol = sport === 'Voleibol';
  const periodLabel = isVoleibol ? 'Set' : 'Q';

  const totalA = Object.values(periods).reduce((s, p) => s + (p.puntos_a || 0), 0);
  const totalB = Object.values(periods).reduce((s, p) => s + (p.puntos_b || 0), 0);

  const sortedPeriods = Object.entries(periods)
    .map(([k, v]) => [Number(k), v] as [number, PeriodScore])
    .sort(([a], [b]) => a - b);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-500/40 bg-slate-800/40 p-3 sm:p-4">
      <p className="text-xs leading-snug text-slate-200">
        {isVoleibol ? (
          <>
            <span className="font-black uppercase tracking-wide text-[10px] block mb-1" style={{ color: sportColor }}>Voleibol — puntos por set</span>
            Editá el rally de cada set (25/15, diferencia de 2). El sistema calcula <span className="text-white font-bold">sets ganados</span> para el marcador grande del partido.
            Podés <span className="text-white font-bold">agregar o borrar sets</span>. <span className="text-white font-bold">Confirmar marcador</span> guarda y actualiza el tablero del admin.
          </>
        ) : (
          <>
            <span className="font-black uppercase tracking-wide text-[10px] block mb-1" style={{ color: sportColor }}>Baloncesto — puntos por cuarto</span>
            Ajustá cada cuarto con − / + o escribiendo. <span className="text-white font-bold">Confirmar marcador</span> guarda y actualiza el tablero principal del admin.
          </>
        )}
      </p>
      {/* Column headers */}
      <div className="grid grid-cols-[44px_1fr_1fr_36px] gap-2 items-center px-1 mb-1">
        <span />
        <p className="text-[11px] sm:text-xs font-black text-slate-100 uppercase tracking-wide text-center truncate">{nameA}</p>
        <p className="text-[11px] sm:text-xs font-black text-slate-100 uppercase tracking-wide text-center truncate">{nameB}</p>
        <span />
      </div>

      {/* Period rows */}
      {sortedPeriods.map(([num, p]) => (
        <div key={num} className="grid grid-cols-[44px_1fr_1fr_36px] gap-2 items-center">
          {/* Period label */}
          <div className="flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: `${sportColor}80` }}>
              {periodLabel}{num}
            </span>
          </div>

          {/* Team A stepper */}
          <Stepper
            value={p.puntos_a}
            onChange={(v) => updatePeriod(num, 'puntos_a', v)}
            color={sportColor}
          />

          {/* Team B stepper */}
          <Stepper
            value={p.puntos_b}
            onChange={(v) => updatePeriod(num, 'puntos_b', v)}
            color={sportColor}
          />

          {/* Delete (Voleibol only) */}
          <div className="flex items-center justify-center">
            {isVoleibol ? (
              <button
                type="button"
                onClick={() => deleteSet(num)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/15 transition-all active:scale-95 touch-manipulation"
              >
                <Trash2 size={14} />
              </button>
            ) : <span />}
          </div>
        </div>
      ))}

      {/* Add set (Voleibol only) */}
      {isVoleibol && Object.keys(periods).length < 5 && (
        <button
          type="button"
          onClick={addSet}
          className="w-full min-h-[48px] py-3 rounded-2xl border-2 border-dashed border-white/25 text-sm font-black text-white/80 hover:text-white hover:border-white/35 uppercase tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation"
        >
          <Plus size={12} />
          Agregar Set {Object.keys(periods).length + 1}
        </button>
      )}

      {/* Totals — en voleibol es suma de puntos del rally (no sets ganados); sets van en el tablero principal */}
      <div className="grid grid-cols-[44px_1fr_1fr_36px] gap-2 items-center border-t border-white/5 pt-4">
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">
            {isVoleibol ? 'Pts sumados' : 'Total'}
          </span>
          {isVoleibol && (
            <span className="text-[7px] font-bold text-slate-500 normal-case tracking-normal text-center px-0.5">(todos los sets)</span>
          )}
        </div>
        <div className="text-center">
          <span className="text-3xl font-black text-white tabular-nums">{totalA}</span>
        </div>
        <div className="text-center">
          <span className="text-3xl font-black text-white tabular-nums">{totalB}</span>
        </div>
        <span />
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full min-h-[52px] rounded-2xl font-black text-sm uppercase tracking-wide text-zinc-950 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 touch-manipulation"
        style={{ background: sportColor, boxShadow: `0 4px 20px ${sportColor}40` }}
      >
        {saving ? <Loader2 size={16} className="animate-spin text-black" /> : <Save size={16} />}
        {saving ? 'Guardando...' : 'Confirmar Marcador'}
      </button>
    </div>
  );
}

function Stepper({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex items-center justify-center gap-0.5 sm:gap-1 bg-slate-900/60 rounded-2xl border border-slate-500/40 p-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-white/80 transition-all active:scale-95 text-lg font-bold shrink-0 touch-manipulation"
      >−</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-11 sm:w-12 text-lg sm:text-xl font-black text-white tabular-nums text-center bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-xl transition-all active:scale-95 font-bold text-white shrink-0 touch-manipulation"
        style={{ background: `${color}45`, border: `1px solid ${color}70` }}
      >+</button>
    </div>
  );
}
