import http from 'k6/http';
import { check, sleep, group } from 'k6';

// FASE 1: WARM-UP LOCAL
// Ejecutar: k6 run scripts/load-test-phase1.js

export const options = {
  stages: [
    { duration: '20s', target: 10 },  // Ramp a 10 VUs
    { duration: '1m', target: 20 },   // Mantener 20 VUs
    { duration: '20s', target: 0 },   // Bajada
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  group('Home', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'Home 200': (r) => r.status === 200,
      'TTFB < 200ms': (r) => r.timings.waiting < 200,
    });
  });

  sleep(1);

  group('Calendario', () => {
    const res = http.get(`${BASE_URL}/calendario`);
    check(res, {
      'Calendario 200': (r) => r.status === 200,
      'TTFB < 300ms': (r) => r.timings.waiting < 300,
    });
  });

  sleep(1);

  group('Noticias', () => {
    const res = http.get(`${BASE_URL}/noticias`);
    check(res, {
      'Noticias 200': (r) => r.status === 200,
    });
  });

  sleep(2);
}
