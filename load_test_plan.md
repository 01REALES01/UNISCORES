# Plan de Pruebas de Carga: Olimpiadas UNINORTE 2026

**Objetivo crítico:** Determinar el máximo de usuarios concurrentes que soporta la plataforma sin degradación de rendimiento (< 2s por request, < 1% de errores).

---

## Fase 0: Diagnóstico de Base de Datos (30 min)

**Antes de cualquier prueba de carga, debemos identificar cuellos de botella en Supabase.**

Ejecutar en Supabase SQL Editor:

```sql
-- 1. Ver índices en tablas críticas
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('partidos', 'noticias', 'profiles')
ORDER BY tablename, indexname;

-- 2. Analizar planes de ejecución
EXPLAIN ANALYZE SELECT * FROM partidos WHERE estado = 'en_vivo' LIMIT 100;
EXPLAIN ANALYZE SELECT * FROM noticias WHERE published = true ORDER BY created_at DESC LIMIT 20;
EXPLAIN ANALYZE SELECT * FROM profiles WHERE roles @> ARRAY['admin'];

-- 3. Ver conexiones actuales a la DB
SELECT datname, usename, count(*) as connections
FROM pg_stat_activity
GROUP BY datname, usename
ORDER BY connections DESC;

-- 4. Ver tamaño de tablas
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Si ves "Seq Scan" en lugar de "Index Scan"**, crear índices inmediatamente:

```sql
-- Índices críticos para queries de lectura
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partidos_estado ON partidos(estado) WHERE estado IN ('en_vivo', 'próximo');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_noticias_published ON noticias(published, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marcador_detalle_partido ON partidos(id) WHERE marcador_detalle IS NOT NULL;
ANALYZE partidos; ANALYZE noticias;
```

---

## Fase 1: Warm-Up Local (1h)

### 1.1 Ejecutar k6 en `localhost:3000` con 20-50 VUs

```bash
k6 run scripts/load-test.js --vus 20 --duration 2m
```

**Qué medir:**
- ¿TTFB promedio? (debe estar < 200ms en local)
- ¿Algún error 404 o 500?
- ¿SWR está cachéando? (segundo request debe ser < 50ms)

### 1.2 Monitorear logs en tiempo real

En otra terminal:
```bash
npm run dev  # Observa si hay warnings de Supabase, slow queries, o memory leaks
```

---

## Fase 2: Staging/Vercel Preview (2h)

### 2.1 Ejecutar k6 contra la URL de preview deployment

```bash
# Cambiar BASE_URL en scripts/load-test.js a la URL de preview
# k6 run scripts/load-test.js --vus 50 --duration 5m
```

**Qué medir:**
- ¿Vercel Edge está cacheando? (compara con local)
- ¿Cuánta latencia agrega el Edge?
- ¿Los endpoints de Supabase (`/rest/v1/...`) son los cuellos de botella?

### 2.2 Inspeccionar headers en Supabase

```bash
curl -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  "https://${SUPABASE_URL}/rest/v1/partidos?estado=eq.en_vivo&select=*" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

---

## Fase 3: Test de Realtime (WebSocket) — 1.5h

**El JavaScript HTTP de k6 no prueba WebSocket.** Necesitamos:

### Opción A: Script de k6 mejorado con ws (experimental)

```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // 10 conexiones WS
    { duration: '2m', target: 50 },   // Hasta 50 conexiones simultáneas
    { duration: '1m', target: 0 },    // Bajada
  ],
  thresholds: {
    'ws_connecting': ['p(95)<1000'],  // Conexión < 1s
    'ws_session_duration': ['p(95)<120000'], // Sesión < 2min
  },
};

export default function () {
  const url = `wss://${SUPABASE_URL}/realtime/v1?apikey=${SUPABASE_ANON_KEY}`;

  const res = ws.connect(url, (socket) => {
    socket.on('open', () => {
      // Subscribe a canal de partidos en vivo
      socket.send(JSON.stringify({
        type: 'subscribe',
        payload: {
          topic: 'public:partidos:estado=eq.en_vivo',
          event: '*'
        }
      }));
    });

    socket.on('message', (data) => {
      check(data, {
        'Mensaje recibido': (msg) => msg.length > 0,
      });
    });

    socket.on('close', () => {});
    socket.setTimeout(() => socket.close(), 120000); // 2 minutos
  });

  check(res, { 'WS conectó': (r) => r.status === 101 });
}
```

Guardar como `scripts/load-test-realtime.js` y ejecutar:
```bash
k6 run scripts/load-test-realtime.js --vus 50 --duration 10m
```

### Opción B: Load Testing directo a Supabase Realtime (sin k6)

Usar [Artillery.io](https://artillery.io/) que soporta WebSocket nativamente:

```yaml
# load-test-realtime.yml
config:
  target: "wss://{{ $processEnvironment.SUPABASE_URL }}/realtime/v1"
  phases:
    - duration: 60, arrivalRate: 5, rampTo: 20  # Llegar a 20 conexiones en 1 min
    - duration: 120, arrivalRate: 20             # Mantener 20 conexiones x 2 min
    - duration: 30, arrivalRate: 0               # Bajada

scenarios:
  - name: "Realtime subscription"
    flow:
      - think: 1
      - send:
          payload: |
            {"type":"subscribe","payload":{"topic":"public:partidos:estado=eq.en_vivo","event":"*"}}
      - think: 120  # Esperar 2 minutos (simula usuario viendo el marcador)
      - think: 1
```

Ejecutar:
```bash
artillery run load-test-realtime.yml
```

---

## Fase 4: Stress Test Progresivo (2-3h)

Aumentar VUs gradualmente hasta encontrar el punto de ruptura.

### 4.1: Test Base (50 VUs, 5 min)

```bash
k6 run scripts/load-test.js --vus 50 --duration 5m --out json=results-50vu.json
```

**Límites de éxito:**
- p95 < 600ms
- Errores < 1%
- Tasa de requests: ~50 req/s (debe estar en logs)

### 4.2: Test Medio (100 VUs, 5 min)

```bash
k6 run scripts/load-test.js --vus 100 --duration 5m --out json=results-100vu.json
```

### 4.3: Test Pico (150+ VUs, 5 min)

```bash
k6 run scripts/load-test.js --vus 150 --duration 5m --out json=results-150vu.json
```

**Si ves timeout o p95 > 2s:**
- Pausar aquí
- Inspeccionar Supabase logs para "Hot Partitions" o conexiones agotadas
- Aplicar índices faltantes
- Reintentar con los mismos VUs

### 4.4: Análisis de Resultados

```bash
# Generar reporte HTML
k6 run scripts/load-test.js --vus 100 --duration 5m --out json=results.json
# Luego convertir con herramienta como:
# npx k6-reporter results.json
```

Esperamos ver:
| VUs | p95 Latencia | Error Rate | Req/s |
|-----|-------------|-----------|-------|
| 50  | < 400ms    | < 0.5%    | ~50   |
| 100 | < 800ms    | < 1%      | ~100  |
| 150 | < 1500ms   | 1-2%      | ~150  |
| 200+ | > 2s      | > 5%      | ❌ FAIL |

---

## Fase 5: Identificar y Fijar Bottlenecks (variable)

Si el test falla antes de 100 VUs:

### Checklist:

- [ ] **¿Pool de conexiones de Supabase agotado?**
  ```sql
  SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';
  ```
  Si > 50: Aumentar `max_connections` en Supabase settings (Pro plan necesario).

- [ ] **¿Rate limit de Supabase?**
  Observar headers en respuestas: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

- [ ] **¿Queries lentas?**
  ```sql
  SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC LIMIT 10;
  ```

- [ ] **¿Memory leak en Next.js?**
  Monitorear con `npm run dev` y herramientas como `node --inspect`.

---

## Fase 6: Configuración de Producción (según resultados)

**Si pasamos 150 VUs con p95 < 1s:**
- ✅ Plan Free es suficiente (revisado regularmente)

**Si 150 VUs muestra p95 > 1.5s:**
- 🚀 Upgrade a Supabase Pro ($25/mes): más conexiones, mejor soporta picos

**Si > 200 VUs es objetivo y fallamos:**
- 🔧 Implementar cache en Edge (Vercel KV o Redis)
- 🔧 Implementar Rate Limiting en API routes

---

## Ejecución Inmediata (Hoy)

1. **Ahora:** Ejecutar diagnóstico de DB (5 min)
2. **Ahora +5min:** Crear índices si es necesario (10 min)
3. **Ahora +15min:** Warm-up local con k6 (20 min)
4. **Ahora +35min:** Test contra Vercel preview (30 min)
5. **Ahora +65min:** Test de Realtime (30 min)
6. **Ahora +95min:** Stress test progresivo (100+ min)

**Reportar:** Máximo de VUs sostenibles, punto de ruptura, recomendación de plan.

