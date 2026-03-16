// ─────────────────────────────────────────────────────────────────────────────
// Sports Registry — punto de entrada único para el engine de deportes
// Instancias singleton por deporte; clave = nombre canónico de la disciplina
// ─────────────────────────────────────────────────────────────────────────────

import type { ISportService } from './types';
import { FutbolService } from './services/futbol.service';
import { BaloncestoService } from './services/baloncesto.service';
import { VoleibolService } from './services/voleibol.service';
import { TenisService } from './services/tenis.service';
import { TenisMesaService } from './services/tenis-mesa.service';
import { AjedrezService } from './services/ajedrez.service';
import { NatacionService } from './services/natacion.service';

const registry: Record<string, ISportService> = {
  'Fútbol':        new FutbolService(),
  'Futsal':        new FutbolService(),   // mismo engine que fútbol
  'Baloncesto':    new BaloncestoService(),
  'Voleibol':      new VoleibolService(),
  'Tenis':         new TenisService(),
  'Tenis de Mesa': new TenisMesaService(),
  'Ajedrez':       new AjedrezService(),
  'Natación':      new NatacionService(),
};

/**
 * Devuelve el servicio de scoring para un deporte dado.
 * Retorna `undefined` si el deporte no está registrado.
 */
export function getSportService(deporte: string): ISportService | undefined {
  return registry[deporte];
}

// Re-exportar servicios concretos por si algún módulo los necesita directamente
export { FutbolService, BaloncestoService, VoleibolService, TenisService, TenisMesaService, AjedrezService, NatacionService };
export type { ISportService };
