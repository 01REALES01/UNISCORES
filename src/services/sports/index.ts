import { FutbolService } from "./futbol-service";
import { ISportService } from "./types";

const services: Record<string, ISportService> = {
    "Fútbol": new FutbolService(),
    // Los demás deportes se irán añadiendo aquí...
};

/**
 * Obtiene el servicio correspondiente a un deporte.
 * Si no existe un servicio específico, devuelve null.
 */
export function getSportService(deporte: string): ISportService | null {
    return services[deporte] || null;
}

// Exportar instancias individuales para acceso directo si es necesario
export const futbolService = new FutbolService();
