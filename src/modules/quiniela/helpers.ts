/** Disciplinas y modelos de marcador que no deben entrar en la quiniela (ganador A/B). */
export function isPartidoQuinielaEligible(match: any): boolean {
  if (!match) return false;
  const md = match.marcador_detalle;
  const tipo =
    md && typeof md === 'object' && 'tipo' in md
      ? String((md as { tipo?: unknown }).tipo ?? '')
      : '';
  if (tipo === 'carrera') return false;
  const raw = String(match.disciplinas?.name ?? '');
  const sport = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (sport.includes('natacion')) return false;
  return true;
}

// ─── Helper: Determine actual match result ───
/**
 * Detects the winner (Side A or Side B) across ALL sport models.
 * This is the source of truth for the public UI 'Victory Halo' and Quiniela feedback.
 */
export const getMatchResult = (match: any): 'A' | 'B' | 'DRAW' | null => {
  if (!match) return null;
  
  const md = match.marcador_detalle || {};
  const sportName = match.disciplinas?.name || '';
  
  // 1. Race Model (Natación, Atletismo)
  if (md.tipo === 'carrera') {
    const participantes = md.participantes || md.resultados || [];
    const winner = participantes.find((p: any) => p.puesto === 1 || p.posicion === 1);
    
    if (!winner) return 'DRAW'; // No winner declared yet in data
    
    // Matching logic to side A or B
    // equipo_a/b often carry the name of the participant in individual sports
    const targetA = (match.equipo_a || '').toLowerCase().trim();
    const targetB = (match.equipo_b || '').toLowerCase().trim();
    const winnerName = (winner.nombre || '').toLowerCase().trim();
    const winnerCarrera = (winner.carrera || '').toLowerCase().trim();

    if (winnerName === targetA || (winnerCarrera === targetA && winnerCarrera !== '')) return 'A';
    if (winnerName === targetB || (winnerCarrera === targetB && winnerCarrera !== '')) return 'B';
    
    return 'DRAW'; // Winner might be a 3rd party in a multi-competitor race
  }

  // Deportes a sets: el ganador del encuentro viene de sets_a / sets_b (igual que clasificación
  // y el trigger de quiniela en BD). `resultado_final` no se mantiene en voleibol y puede quedar
  // obsoleto y contradecer los sets — no debe mandar sobre el marcador.
  const setBasedSports = ['Voleibol', 'Tenis', 'Tenis de Mesa'] as const;
  if ((setBasedSports as readonly string[]).includes(sportName)) {
    const sa = Number(md.sets_a ?? md.sets_total_a ?? 0);
    const sb = Number(md.sets_b ?? md.sets_total_b ?? 0);
    if (match.estado === 'finalizado') {
      if (sa > sb) return 'A';
      if (sb > sa) return 'B';
      // 0–0 u empate raro: seguir con resultado_final / fallback
    } else {
      return null;
    }
  }

  // 2. Explicit outcome (Ajedrez, Tenis, Voleibol etc often set this on save)
  const rf = md.resultado_final;
  if (rf === 'victoria_a') return 'A';
  if (rf === 'victoria_b') return 'B';
  if (rf === 'empate') return 'DRAW';

  // 3. Fallback: Score based (Football, Basketball, Volleyball, Tennis)
  // We check score fields. Use || 0 to handle cases where a field is 0 but another has the real score
  const a = md.goles_a || md.total_a || md.sets_a || md.puntos_a || md.juegos_a || 0;
  const b = md.goles_b || md.total_b || md.sets_b || md.puntos_b || md.juegos_b || 0;

  if (a > b) return 'A';
  if (b > a) return 'B';

  // 4. Penalty shootout tiebreaker
  if (md.penales_a != null && md.penales_b != null) {
    if (md.penales_a > md.penales_b) return 'A';
    if (md.penales_b > md.penales_a) return 'B';
  }

  return 'DRAW';
};
