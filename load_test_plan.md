# Estrategia de Pruebas de Carga: Olimpiadas UNINORTE 2026

Este documento detalla el plan para determinar la capacidad máxima de usuarios concurrentes de la plataforma y garantizar la estabilidad durante los picos de tráfico (ej. finales de Fútbol o Baloncesto).

## 1. Objetivos del Test

- **Límite de Concurrencia:** Determinar el número de usuarios simultáneos antes de que los tiempos de respuesta excedan los 2 segundos.
- **Resiliencia de Supabase Realtime:** Verificar cuántas conexiones simultáneas de Realtime puede sostener el plan actual (Free vs Pro).
- **Carga de Base de Datos:** Identificar cuellos de botella en las consultas de `partidos` y `noticias`.

## 2. Escenarios de Prueba

| Escenario | Descripción | Carga Objetivo |
| :--- | :--- | :--- |
| **Flujo Público** | Usuarios navegando por Inicio, Calendario y Noticias. | 500 - 1000 usuarios |
| **Marcador en Vivo** | Usuarios en la página de un partido específico con Realtime activo. | 200 - 500 usuarios |
| **Pico de Quiniela** | Usuarios enviando pronósticos simultáneamente antes de un partido. | 100 transacciones/seg |

## 3. Configuración Técnica (k6)

Utilizaremos **k6** para simular usuarios reales. El script [scripts/load-test.js](file:///Users/reales/Desktop/project_olympics/scripts/load-test.js) se ha diseñado para:

1. Navegar por las rutas principales (`/`, `/partidos`, `/noticias`).
2. Simular "tiempo de pensamiento" humano (2-5 segundos entre clics).
3. Monitorear el tiempo de respuesta del primer byte (TTFB).

### Métricas de Éxito (KPIs)

- **Tiempos de Respuesta:** 95% de las peticiones < 500ms.
- **Tasa de Errores:** < 1% de errores HTTP 5xx o 429.
- **Conexiones Realtime:** Sin desconexiones masivas durante el pico.

## 4. Consideraciones de Infraestructura

> [!IMPORTANT]
> **Supabase Free vs Pro Plan**
>
> - El plan gratuito limita a **200 conexiones Realtime concurrentes**. Si esperamos >500 usuarios viendo un marcador en vivo, es mandatorio subir al plan Pro ($25/mes) que ofrece límites mucho más altos y escalables.

> [!WARNING]
> **Vercel Edge Caching**
>
> - Para las páginas de `/noticias` y `/calendario`, debemos asegurar que los datos estén cacheados en el Edge para evitar golpear la base de datos en cada visita.

## 5. Próximos Pasos

- [ ] Definir URL de Producción final para el test.
- [ ] Ejecutar prueba de "Warm up" (50 usuarios).
- [ ] Ejecutar "Stress Test" (pico de 500+ usuarios).
- [ ] Revisar logs de Supabase para detectar `Hot Partitions` o consultas lentas.
