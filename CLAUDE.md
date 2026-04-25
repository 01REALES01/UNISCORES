# CLAUDE.md — Olympics Project

## Qué es este proyecto

**Sistema de gestión de Olimpiadas universitarias** (Universidad del Norte, Barranquilla).
Registra y transmite partidos en tiempo real, gestiona fixtures, brackets, clasificaciones, medallero, quinielas y perfiles de atletas.
Es una app pública + panel admin, desplegada en Vercel con Supabase como backend.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS v4 |
| Backend/DB | Supabase (PostgreSQL + Realtime + Auth) |
| Deploy | Vercel (prod) / Docker (OpenLab) |
| Testing | Jest + Testing Library |
| Animaciones | Framer Motion |
| Charts | Recharts |

Dev server: `npm run dev` → puerto 3001
Build: `npm run build`
Tests: `npm test`

---

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router — páginas y API routes
│   ├── admin/(dashboard)/  # Panel admin (protegido): fixture, partidos, sorteo, etc.
│   ├── api/admin/          # API routes admin (import-excel, bracket, calcular-posiciones…)
│   ├── partido/[id]/       # Vista pública del partido en vivo
│   ├── partidos/           # Lista de partidos con filtros
│   ├── clasificacion/      # Tabla de clasificación general
│   ├── medallero/          # Medallero por carrera/delegación
│   ├── bracket/            # Árbol de brackets por disciplina
│   └── …                   # calendario, noticias, quiniela, tv, mapa, etc.
│
├── modules/                # Lógica de negocio organizada por dominio
│   ├── matches/            # Tipos base (Partido, Jugador, Evento), hooks, componentes
│   ├── sports/             # Engine de scoring por deporte (servicio + tipos)
│   │   └── services/       # Un archivo por deporte: futbol, baloncesto, voleibol…
│   ├── admin/matches/      # Componentes y hooks exclusivos del panel admin
│   ├── quiniela/           # Sistema de pronósticos
│   ├── medallero/          # Lógica y componentes del medallero
│   ├── news/               # Noticias y publicaciones
│   └── …                   # estadisticas, careers, teams, users, puntos
│
├── shared/
│   ├── components/         # Componentes globales reutilizables (navbar, skeletons, etc.)
│   └── hooks/              # Hooks de autenticación y datos compartidos
│
├── hooks/                  # Hooks de datos a nivel app (use-matches, use-calendar, etc.)
├── lib/                    # Helpers y utilidades core
│   ├── constants.ts        # DEPORTES_*, CARRERAS_UNINORTE, SPORT_COLORS, EQUIPO_NOMBRE_TO_CARRERAS
│   ├── supabase.ts         # Cliente Supabase (browser)
│   ├── supabase-server.ts  # Cliente Supabase (server components)
│   ├── bracket-config.ts   # Configuración de brackets por deporte
│   ├── schedule-parser.ts  # Parser del Excel de fixture
│   └── excel-import.ts     # Importación de datos desde Excel (.xlsx)
│
└── services/               # Servicios externos (push notifications, sports legacy)

supabase/                   # Migraciones SQL y schema
data/                       # Archivos Excel de fixture e importación
scripts/                    # Utilidades Node/SQL de desarrollo
```

---

## Dominio: Deportes Soportados

| Deporte | Tipo | Características especiales |
|---------|------|---------------------------|
| Fútbol | Colectivo, bracket | Goles, tarjetas, tiempos |
| Baloncesto | Colectivo, bracket | Puntos +1/+2/+3, cuartos |
| Voleibol | Colectivo, bracket | Sets, puntos por set, tarjetas |
| Tenis | Individual, bracket, categorías | Sets, games, categoría (principiante/intermedio/avanzado) |
| Tenis de Mesa | Individual, bracket, jornadas | Sets por jornada, formato grupo |
| Ajedrez | Individual, jornadas | Rondas, tabla de posiciones por puntos |
| Natación | Individual, carrera | Estilos (Libre/Pecho/Espalda/Mariposa), distancias, tiempos |

**Constantes clave** en `src/lib/constants.ts`:
- `DEPORTES_INDIVIDUALES` — sin equipo, atleta vs atleta
- `DEPORTES_CON_BRACKET` — generan árbol de eliminación
- `JORNADA_SPORTS` — ['Ajedrez', 'Tenis de Mesa'] — usan jornadas en lugar de partidos 1v1
- `RACE_SPORTS` — ['Natación'] — múltiples competidores, resultados por tiempo
- `EQUIPO_NOMBRE_TO_CARRERAS` — mapeo equipo → carreras para puntos olímpicos
- `CARRERAS_UNINORTE` — lista completa de programas académicos participantes

---

## Entidades Principales (Supabase / TypeScript)

### `Partido` (`src/modules/matches/types.ts`)
```ts
{
  id, equipo_a, equipo_b, fecha,
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado',
  marcador_detalle: any,   // union MarcadorDetalle por deporte (ver modules/sports/types.ts)
  fase, grupo, bracket_order,
  disciplina_id, carrera_a_id, carrera_b_id,
  genero, categoria,
  stream_url,              // YouTube embed para transmisión en vivo
}
```

### `MarcadorDetalle` (`src/modules/sports/types.ts`)
Union discriminada por deporte: `FutbolMarcador`, `BaloncestoMarcador`, `VoleibolMarcador`, `TenisMarcador`, `TenisMesaMarcador`, etc.

### Roles de usuario
- `admin` / `creator` — acceso total al panel
- `data_entry` — puede cargar resultados de partidos asignados
- `periodista` — crea noticias
- usuario público — ve clasificaciones, vota quiniela, sigue partidos

---

## Engine de Scoring (`src/modules/sports/`)

Patrón Strategy: cada deporte tiene su propio servicio que implementa `BaseSportService`.

```
modules/sports/services/
  base-sport.service.ts   ← interfaz base (addPoints, removePoints, isFinished…)
  futbol.service.ts
  baloncesto.service.ts
  voleibol.service.ts
  tenis.service.ts
  tenis-mesa.service.ts
  ajedrez.service.ts
  natacion.service.ts
```

Fachada pública: `src/modules/sports/scoring.ts` (también hay shim de compatibilidad en `src/lib/sport-scoring.ts`).

---

## API Routes Admin Clave

| Ruta | Función |
|------|---------|
| `/api/admin/import-excel` | Importa fixture desde Excel |
| `/api/admin/calcular-posiciones` | Recalcula standings de grupo |
| `/api/admin/auto-advance` | Avanza bracket automáticamente |
| `/api/admin/sorteo` | Genera sorteo de grupos |
| `/api/admin/import-tenis-mesa-grupos` | Importa grupos de tenis de mesa |
| `/api/admin/import-tennis-bracket` | Importa bracket de tenis |
| `/api/admin/deporte-integral` | Calcula puntos Deporte Integral |
| `/api/admin/fair-play-adjustment` | Ajuste de puntos fair play |

---

## Convenciones de Código

- **TypeScript estricto** — no `any` salvo en `Partido.marcador_detalle` (por compatibilidad UI)
- **No comentarios de explicación** — solo comentarios cuando el WHY no es obvio
- **Módulos por dominio** — no archivos sueltos en `/lib` para lógica de negocio
- **Hooks de datos** — `use-matches.ts`, `use-calendar.ts`, etc. usan SWR o Supabase directo
- **Server vs Client** — `supabase-server.ts` para Server Components / Route Handlers; `supabase.ts` para hooks del cliente
- **Imports** — `@/` apunta a `src/`

---

## Instrucciones para Agentes Especializados

Cuando se me asigne una tarea compleja, debo orquestar así:

1. **Exploración** → Agente `Explore` para mapear archivos relevantes antes de tocar código
2. **Arquitectura** → Agente `architect` si hay decisiones de diseño no triviales
3. **Planificación** → Agente `Plan` para tareas con múltiples pasos
4. **Implementación** → Yo ejecuto los cambios
5. **Seguridad** → Agente `security-reviewer` si hay API routes, auth, o datos de usuario

Ejecutar en **paralelo** cuando los agentes no tienen dependencias entre sí.

### Dominio que los agentes deben conocer
- Los partidos son la entidad central: todo gira alrededor de `Partido` y su `marcador_detalle`
- Cada deporte tiene su servicio en `modules/sports/services/`
- La lógica de puntos olímpicos (quién gana medallas) está en `modules/matches/utils/standings.ts` y `deporte-integral.ts`
- Los brackets se generan/resuelven en `lib/bracket-config.ts` y la API `/api/admin/auto-advance`
- Supabase Realtime impulsa las actualizaciones en vivo del partido

---

## Variables de Entorno Necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # requerido en API routes admin
VAPID_PUBLIC_KEY=               # push notifications
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```
