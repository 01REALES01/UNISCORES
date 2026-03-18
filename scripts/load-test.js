import http from 'k6/http';
import { check, sleep, group } from 'k6';

// ─── CONFIGURACIÓN DE ESCENARIOS ─────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Calentamiento: 20 usuarios
    { duration: '1m', target: 50 },   // Carga sostenida moderada
    { duration: '30s', target: 150 }, // Ramp up al pico (Olimpiadas)
    { duration: '2m', target: 150 }, // Pico máximo sostenido
    { duration: '1m', target: 0 },   // Bajada gradual
  ],
  thresholds: {
    'http_req_duration': ['p(95)<600'], // 95% < 600ms (UX fluida)
    'http_req_failed': ['rate<0.01'],   // Menos del 1% de errores
  },
};

const BASE_URL = 'http://localhost:3000'; // CAMBIAR POR URL DE VERCEL (PRODUCCIÓN)

export default function () {
  // 1. Visita Home
  group('Navegación Principal', () => {
    let res = http.get(`${BASE_URL}/`);
    check(res, { 'Home carga OK (200)': (r) => r.status === 200 });
    sleep(Math.random() * 2 + 1); // El usuario mira el slider 1-3s

    // 2. Mira el Calendario
    res = http.get(`${BASE_URL}/calendario`);
    check(res, { 'Calendario carga OK': (r) => r.status === 200 });
    sleep(2);

    // 3. Revisa los Partidos del día
    res = http.get(`${BASE_URL}/partidos`);
    check(res, { 'Partidos carga OK': (r) => r.status === 200 });
    sleep(3);
  });

  // 4. Detalle de Partido (Simula ver una final)
  group('Marcador en Vivo', () => {
    // Simulamos que el usuario entra a ver un partido específico (ajustar ID si es necesario)
    let res = http.get(`${BASE_URL}/partido/1`); // Usar un ID real en el test final
    check(res, { 'Detalle Partido carga OK': (r) => r.status === 200 });
    
    // Aquí el usuario suele quedarse a ver el marcador (Realtime)
    // El script de k6 HTTP no simula el WebSocket en sí, pero simula la carga inicial de la página.
    sleep(10); 
  });

  // 5. Flujo de Noticias
  group('Lectura de Noticias', () => {
    let res = http.get(`${BASE_URL}/noticias`);
    check(res, { 'Noticias carga OK': (r) => r.status === 200 });
    sleep(1);
  });
}
