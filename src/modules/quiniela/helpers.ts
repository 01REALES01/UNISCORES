// ─── Helper: Determine actual match result ───
export const getMatchResult = (match: any): 'A' | 'B' | 'DRAW' | null => {
  if (match.estado !== 'finalizado') return null;
  const md = match.marcador_detalle || {};
  const a = md.goles_a ?? md.total_a ?? md.sets_a ?? 0;
  const b = md.goles_b ?? md.total_b ?? md.sets_b ?? 0;
  if (a > b) return 'A';
  if (b > a) return 'B';
  return 'DRAW';
};
