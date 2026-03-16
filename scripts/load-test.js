import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. CONFIGURACIÓN DEL TEST
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Subida a 20 usuarios en 30s
    { duration: '1m', target: 50 },  // Mantener 50 usuarios por 1 min
    { duration: '30s', target: 100 }, // Subida a 100 usuarios en 30s
    { duration: '1m', target: 100 }, // Mantener 100 usuarios (pico institucional)
    { duration: '30s', target: 0 },   // Bajada gradual
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de las peticiones deben ser < 500ms
  },
};

// 2. LÓGICA DEL USUARIO VIRTUAL
export default function () {
  const BASE_URL = 'http://localhost:3000'; // CAMBIAR POR URL DE PRODUCCIÓN

  // Simular navegación por pestañas principales
  const responses = http.batch([
    ['GET', `${BASE_URL}/`],
    ['GET', `${BASE_URL}/partidos`],
    ['GET', `${BASE_URL}/clasificacion`],
  ]);

  check(responses[0], { 'Home status 200': (r) => r.status === 200 });
  check(responses[1], { 'Partidos status 200': (r) => r.status === 200 });
  check(responses[2], { 'Clasificación status 200': (r) => r.status === 200 });

  sleep(Math.random() * 3 + 2); // Esperar 2-5 segundos entre acciones (simula humano)

  // Simular entrada a un perfil público (ID aleatorio o específico de prueba)
  const resPerfil = http.get(`${BASE_URL}/perfil/TU_ID_DE_PRUEBA`);
  check(resPerfil, { 'Perfil status 200': (r) => r.status === 200 });

  sleep(5);
}
