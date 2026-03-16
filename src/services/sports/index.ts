// ─────────────────────────────────────────────────────────────────────────────
// Backwards-compat shim — delega al registry centralizado en modules/sports
// Mantiene el export getSportService() que usan los importadores legacy
// ─────────────────────────────────────────────────────────────────────────────

export { getSportService } from '@/modules/sports/index';
export type { ISportService } from '@/modules/sports/types';
