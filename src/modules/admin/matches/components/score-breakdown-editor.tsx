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
      onSaved();
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
    <div className="space-y-3">
      {/* Column headers */}
      <div className="grid grid-cols-[44px_1fr_1fr_36px] gap-2 items-center px-1 mb-1">
        <span />
        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] text-center truncate">{nameA}</p>
        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] text-center truncate">{nameB}</p>
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
                onClick={() => deleteSet(num)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
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
          onClick={addSet}
          className="w-full py-3 rounded-2xl border border-dashed border-white/10 text-[10px] font-black text-white/30 hover:text-white/60 hover:border-white/20 uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={12} />
          Agregar Set {Object.keys(periods).length + 1}
        </button>
      )}

      {/* Totals */}
      <div className="grid grid-cols-[44px_1fr_1fr_36px] gap-2 items-center border-t border-white/5 pt-4">
        <div className="flex items-center justify-center">
          <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Total</span>
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

function Stepper({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex items-center justify-center gap-1 bg-white/[0.04] rounded-2xl border border-white/[0.06] p-1">
      <button
        onClick={() => onChange(value - 1)}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90 text-lg font-bold shrink-0"
      >−</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-12 text-xl font-black text-white tabular-nums text-center bg-transparent outline-none select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 font-bold shrink-0"
        style={{ color, background: `${color}20` }}
      >+</button>
    </div>
  );
}
