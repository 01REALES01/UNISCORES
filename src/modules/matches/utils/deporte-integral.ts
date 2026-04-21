export const BASELINE = 2000;

export const DI_RULES: Record<string, Record<string, number>> = {
  baloncesto: {
    falta_tecnica: -10,
    falta_tecnica_personal: -20,
    falta_antideportiva: -10,
    descalificacion_directa_jugador: -20,
    descalificacion_directa_personal: -40,
    sancion_adicional: -10,
    expulsion_torneo_jugador: -100,
    expulsion_torneo_personal: -200,
  },
};

export const DI_MANUAL_TYPES = new Set([
  'falta_tecnica_personal',
  'descalificacion_directa_jugador',
  'descalificacion_directa_personal',
  'sancion_adicional',
  'expulsion_torneo_jugador',
  'expulsion_torneo_personal',
]);

export const DI_REQUIRES_PLAYER = new Set([
  'descalificacion_directa_jugador',
  'expulsion_torneo_jugador',
]);

export interface DIRow {
  id: string;
  label: string;
  penalty: number;
  manual: boolean;
  requiresPlayer: boolean;
}

export function getDIRows(sport: string): DIRow[] {
  const rules = DI_RULES[sport.toLowerCase()];
  if (!rules) return [];
  return [
    { id: 'falta_tecnica', label: 'Falta técnica — jugador', penalty: rules.falta_tecnica, manual: false, requiresPlayer: false },
    { id: 'falta_tecnica_personal', label: 'Falta técnica — personal de apoyo', penalty: rules.falta_tecnica_personal, manual: true, requiresPlayer: false },
    { id: 'falta_antideportiva', label: 'Falta antideportiva', penalty: rules.falta_antideportiva, manual: false, requiresPlayer: false },
    { id: 'descalificacion_directa_jugador', label: 'Descalificación directa — jugador', penalty: rules.descalificacion_directa_jugador, manual: true, requiresPlayer: true },
    { id: 'descalificacion_directa_personal', label: 'Descalificación directa — personal de apoyo', penalty: rules.descalificacion_directa_personal, manual: true, requiresPlayer: false },
    { id: 'sancion_adicional', label: 'Fecha de sanción adicional', penalty: rules.sancion_adicional, manual: true, requiresPlayer: false },
    { id: 'expulsion_torneo_jugador', label: 'Expulsión del torneo — jugador', penalty: rules.expulsion_torneo_jugador, manual: true, requiresPlayer: true },
    { id: 'expulsion_torneo_personal', label: 'Expulsión del torneo — personal de apoyo', penalty: rules.expulsion_torneo_personal, manual: true, requiresPlayer: false },
  ];
}

export function calcularDI(
  eventos: Array<{ tipo_evento: string; equipo: string }>,
  sport: string
): { a: number; b: number } {
  const rules = DI_RULES[sport.toLowerCase()];
  if (!rules) return { a: BASELINE, b: BASELINE };
  let a = BASELINE;
  let b = BASELINE;
  for (const e of eventos) {
    const deduction = rules[e.tipo_evento];
    if (deduction === undefined) continue;
    if (e.equipo === 'equipo_a') a += deduction;
    else if (e.equipo === 'equipo_b') b += deduction;
  }
  return { a, b };
}

export function hasDIRules(sport: string): boolean {
  return sport.toLowerCase() in DI_RULES;
}
