import http from 'k6/http';
import { check, sleep, group } from 'k6';

// FASE 4: STRESS TEST PROGRESIVO
// Usar: k6 run scripts/load-test-stress.js --vus 50 --duration 5m
//       k6 run scripts/load-test-stress.js --vus 100 --duration 5m
//       k6 run scripts/load-test-stress.js --vus 150 --duration 5m

export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<600', 'p(99)<1500'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_KEY = __ENV.SUPABASE_KEY || '';

export default function () {
  // Simular usuario navegando y viendo partidos
  group('Browse Public', () => {
    // 1. Home
    let res = http.get(`${BASE_URL}/`);
    check(res, { 'Home 200': (r) => r.status === 200 });
    sleep(Math.random() * 2 + 1);

    // 2. Calendario
    res = http.get(`${BASE_URL}/calendario`);
    check(res, {
      'Calendario 200': (r) => r.status === 200,
      'TTFB < 600ms': (r) => r.timings.waiting < 600,
    });
    sleep(2);

    // 3. Ver un partido (ID 1 como default, ajustar si es necesario)
    res = http.get(`${BASE_URL}/partido/1`);
    check(res, {
      'Partido detail 200': (r) => r.status === 200,
      'P95 Latencia < 1s': (r) => r.timings.duration < 1000,
    });
    sleep(3);

    // 4. Noticias
    res = http.get(`${BASE_URL}/noticias`);
    check(res, { 'Noticias 200': (r) => r.status === 200 });
    sleep(1);
  });

  // Simular peticiones directas a Supabase REST (si está disponible)
  if (SUPABASE_URL && SUPABASE_KEY) {
    group('Supabase REST', () => {
      const headers = {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      };

      // Fetch partidos en vivo
      let res = http.get(`${SUPABASE_URL}/rest/v1/partidos?estado=eq.en_curso&limit=20`, { headers });
      check(res, {
        'Partidos API 200': (r) => r.status === 200,
        'API < 500ms': (r) => r.timings.duration < 500,
      });

      // Fetch noticias publicadas
      res = http.get(`${SUPABASE_URL}/rest/v1/noticias?published=eq.true&order=created_at.desc&limit=10`, { headers });
      check(res, { 'Noticias API 200': (r) => r.status === 200 });
    });
  }
}
