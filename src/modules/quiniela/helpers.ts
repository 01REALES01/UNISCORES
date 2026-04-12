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

  return 'DRAW';
};
