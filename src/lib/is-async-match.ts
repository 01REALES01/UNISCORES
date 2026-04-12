/**
 * Checks if a match is in asynchronous mode and should hide scores from the public.
 * Returns true only when the match is `en_curso` AND `modo_registro === 'asincronico'`.
 * Finalized matches always show their results regardless of the original mode.
 */
export function isAsyncMatch(partido: any): boolean {
  if (!partido) return false;
  return (
    partido.estado === 'en_curso' &&
    partido.marcador_detalle?.modo_registro === 'asincronico'
  );
}
