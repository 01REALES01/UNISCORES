# Arquitectura del Sistema — Giga Olympics UNINORTE 2026

> Última actualización: 2026-03-18

---

## 1. Visión General del Sistema

```mermaid
flowchart TB
    subgraph CLIENT["Cliente (Browser / PWA)"]
        REACT["React 19 + TypeScript"]
        SWR["SWR (Cache + Revalidation)"]
        RT_CLIENT["Supabase Realtime (WebSocket)"]
        SW["Service Worker (Push)"]
    end

    subgraph EDGE["Vercel Edge Network"]
        CDN["CDN Global (Static + ISR)"]
        SSR["Next.js 16 App Router"]
        API_ROUTES["API Routes (/auth/callback, /api/push/send)"]
    end

    subgraph SUPABASE["Supabase Platform"]
        POSTGREST["PostgREST (REST API)"]
        REALTIME["Realtime (WebSocket Broadcast)"]
        AUTH["Auth (Microsoft OAuth + Magic Link)"]
        STORAGE["Storage (Avatars + Escudos)"]
        subgraph DB["PostgreSQL"]
            RLS["Row Level Security"]
            TRIGGERS["Triggers (Notificaciones, Scoring)"]
            TABLES["14+ Tablas"]
        end
    end

    REACT -->|fetch| SWR
    SWR -->|HTTP| POSTGREST
    RT_CLIENT -->|WebSocket| REALTIME
    REACT -->|navigate| CDN
    CDN -->|cache miss| SSR
    SSR -->|server fetch| POSTGREST
    API_ROUTES -->|auth| AUTH
    API_ROUTES -->|push| SW
    POSTGREST --> DB
    REALTIME --> DB
    AUTH --> DB
    STORAGE -.->|URLs| POSTGREST
    TRIGGERS -->|INSERT notifications| REALTIME
```

---

## 2. Estructura de Módulos Frontend

```mermaid
flowchart LR
    subgraph MODULES["src/modules/"]
        ADMIN["admin/\nPanel de Control"]
        MATCHES["matches/\nPartidos + Eventos"]
        SPORTS["sports/\nScoring Engine (7 deportes)"]
        USERS["users/\nPerfiles + Amigos"]
        NEWS["news/\nNoticias + Reacciones"]
        QUINIELA["quiniela/\nPredicciones + Ranking"]
        MEDALLERO["medallero/\nMedallero + Stats"]
    end

    subgraph SHARED["src/shared/"]
        COMPONENTS["components/\nNavbar, Calendar, UI Primitives"]
        HOOKS["hooks/\nuseAuth, use-carreras"]
        LIB["lib/\nSupabase, Constants, Utils"]
    end

    ADMIN -->|CRUD| MATCHES
    ADMIN -->|CRUD| NEWS
    ADMIN -->|roles| USERS
    MATCHES -->|scoring| SPORTS
    QUINIELA -->|predictions| MATCHES
    MEDALLERO -->|standings| MATCHES

    ADMIN --> LIB
    MATCHES --> LIB
    SPORTS --> LIB
    USERS --> LIB
    NEWS --> LIB
    QUINIELA --> LIB
    MEDALLERO --> LIB
```

Cada módulo sigue la estructura:
```
module/
├── types.ts          # Tipos TypeScript centralizados
├── hooks/            # SWR hooks + Realtime subscriptions
├── components/       # UI components del módulo
└── services/         # Lógica de negocio (solo sports/)
```

---

## 3. Rutas de la Aplicación

### Páginas Públicas (11)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `app/page.tsx` | Home — Hero slider, partidos en vivo, noticias recientes |
| `/calendario` | `app/calendario/page.tsx` | Calendario mensual + partidos por día |
| `/partidos` | `app/partidos/page.tsx` | Lista completa de partidos con filtros |
| `/partido/[id]` | `app/partido/[id]/page.tsx` | Detalle del partido — marcador en vivo, eventos, timeline |
| `/noticias` | `app/noticias/page.tsx` | Feed de noticias (ISR, revalidate=60s) |
| `/noticias/[id]` | `app/noticias/[id]/page.tsx` | Artículo completo con reacciones |
| `/medallero` | `app/medallero/page.tsx` | Tabla de medallas por carrera |
| `/clasificacion` | `app/clasificacion/page.tsx` | Rankings y clasificaciones |
| `/mapa` | `app/mapa/page.tsx` | Mapa interactivo del campus |
| `/tv` | `app/tv/page.tsx` | Vista de transmisión en vivo |
| `/quiniela` | `app/quiniela/page.tsx` | Sistema de predicciones y leaderboard |

### Páginas de Usuario (5)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/login` | `app/login/page.tsx` | Login (Microsoft OAuth / Magic Link) |
| `/perfil` | `app/perfil/page.tsx` | Perfil propio (editable) |
| `/perfil/[id]` | `app/perfil/[id]/page.tsx` | Perfil público de otro usuario |
| `/carrera/[id]` | `app/carrera/[id]/page.tsx` | Perfil de carrera universitaria |
| `/notificaciones` | `app/notificaciones/page.tsx` | Centro de notificaciones |

### Panel de Administración (9)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/admin` | `app/admin/(dashboard)/page.tsx` | Dashboard — stats en vivo, actividad |
| `/admin/partidos` | `app/admin/(dashboard)/partidos/page.tsx` | CRUD de partidos |
| `/admin/partidos/[id]` | `app/admin/(dashboard)/partidos/[id]/page.tsx` | Control de partido en vivo — scoreboard, eventos |
| `/admin/noticias` | `app/admin/(dashboard)/noticias/page.tsx` | Gestión de noticias |
| `/admin/noticias/nueva` | `app/admin/(dashboard)/noticias/nueva/page.tsx` | Crear noticia |
| `/admin/noticias/[id]` | `app/admin/(dashboard)/noticias/[id]/page.tsx` | Editar noticia |
| `/admin/usuarios` | `app/admin/(dashboard)/usuarios/page.tsx` | Gestión de usuarios y roles |
| `/admin/estadisticas` | `app/admin/(dashboard)/estadisticas/page.tsx` | Analytics y gráficas |
| `/admin/bitacora` | `app/admin/(dashboard)/bitacora/page.tsx` | Audit log de acciones admin |

### API Routes (2)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth callback — intercambia código por sesión |
| `/api/push/send` | `app/api/push/send/route.ts` | Envío de push notifications via Web Push API |

---

## 4. Modelo de Base de Datos

```mermaid
erDiagram
    profiles ||--o{ partidos : "responsable"
    profiles ||--o{ pronosticos : "predice"
    profiles ||--o{ friend_requests : "envía/recibe"
    profiles ||--o{ notifications : "recibe"
    profiles ||--|| notification_preferences : "configura"
    profiles ||--o{ push_subscriptions : "suscribe"
    profiles ||--o{ admin_audit_logs : "ejecuta"
    profiles ||--o{ news_reactions : "reacciona"

    disciplinas ||--o{ partidos : "categoriza"
    carreras ||--o{ partidos : "compite (A/B)"

    partidos ||--o{ eventos_partido : "tiene"
    partidos ||--o{ jugadores : "participan"
    partidos ||--o{ pronosticos : "sobre"
    partidos ||--o{ noticias : "cubre"

    jugadores ||--o{ eventos_partido : "protagoniza"

    noticias ||--o{ news_reactions : "recibe"

    profiles {
        uuid id PK
        text email
        text full_name
        text avatar_url
        text[] roles
        bigint[] carreras_ids
        text tagline
        text about_me
        int points
        int wins
        int losses
        bool is_public
        timestamptz created_at
    }

    partidos {
        int id PK
        int disciplina_id FK
        text equipo_a
        text equipo_b
        timestamptz fecha
        text estado
        jsonb marcador_detalle
        text lugar
        text genero
        text fase
        text grupo
        int carrera_a_id FK
        int carrera_b_id FK
        uuid responsable_id FK
    }

    disciplinas {
        int id PK
        text name
        text icon
    }

    carreras {
        int id PK
        text nombre
        text escudo_url
    }

    eventos_partido {
        int id PK
        int partido_id FK
        text tipo_evento
        int minuto
        int jugador_id FK
        text equipo
        text descripcion
    }

    jugadores {
        int id PK
        text nombre
        int numero
        text equipo
        int partido_id FK
        uuid profile_id FK
    }

    noticias {
        uuid id PK
        text titulo
        text contenido
        text imagen_url
        text categoria
        text autor_nombre
        int partido_id FK
        text carrera
        bool published
    }

    news_reactions {
        uuid id PK
        uuid noticia_id FK
        uuid user_id FK
        text emoji
    }

    pronosticos {
        uuid id PK
        uuid user_id FK
        int match_id FK
        int goles_a
        int goles_b
        text prediction_type
        text winner_pick
        int puntos_ganados
    }

    friend_requests {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        text status
    }

    notifications {
        uuid id PK
        uuid user_id FK
        text type
        text title
        text body
        jsonb metadata
        bool is_read
    }

    notification_preferences {
        uuid id PK
        uuid user_id FK
        bool match_start
        bool match_end
        bool score_updates
        bool friend_requests
        text[] followed_sports
    }

    push_subscriptions {
        uuid id PK
        uuid user_id FK
        text endpoint
        text p256dh
        text auth
    }

    admin_audit_logs {
        uuid id PK
        uuid admin_id FK
        text admin_name
        text admin_email
        text action_type
        text entity_type
        text entity_id
        jsonb details
        timestamptz created_at
    }
```

---

## 5. Flujos de Datos

### 5a. Autenticación (Microsoft OAuth)

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant NextJS as Next.js (Vercel)
    participant Supabase as Supabase Auth
    participant DB as PostgreSQL

    User->>Browser: Click "Iniciar Sesión"
    Browser->>Supabase: signInWithOAuth({ provider: 'azure' })
    Supabase->>Browser: Redirect → Microsoft Login
    Browser->>Supabase: Authorization code
    Supabase->>NextJS: Redirect → /auth/callback?code=xxx
    NextJS->>Supabase: exchangeCodeForSession(code)
    Supabase->>DB: INSERT auth.users
    DB->>DB: TRIGGER handle_new_user()
    DB->>DB: INSERT profiles (roles=['public'])
    Supabase-->>NextJS: Session + cookies
    NextJS-->>Browser: Redirect → / (Home)
```

### 5b. Marcador en Vivo (Realtime)

```mermaid
sequenceDiagram
    actor Admin
    participant AdminUI as Admin Panel
    participant Supabase as Supabase
    participant RT as Realtime (WebSocket)
    participant Fan1 as Fan Browser 1
    participant Fan2 as Fan Browser 2

    Admin->>AdminUI: Actualiza marcador
    AdminUI->>Supabase: UPDATE partidos SET marcador_detalle=...
    Supabase->>RT: Broadcast change event
    RT-->>Fan1: postgres_changes event
    RT-->>Fan2: postgres_changes event
    Fan1->>Fan1: SWR revalidate → UI actualiza
    Fan2->>Fan2: SWR revalidate → UI actualiza
    Note over Fan1,Fan2: Latencia < 500ms
```

### 5c. Sistema de Notificaciones

```mermaid
sequenceDiagram
    actor Admin
    participant DB as PostgreSQL
    participant Trigger as notify_on_match_state_change()
    participant RT as Realtime
    participant Bell as NotificationBell
    participant Push as /api/push/send
    participant Phone as Celular

    Admin->>DB: UPDATE partidos SET estado='en_vivo'
    DB->>Trigger: AFTER UPDATE trigger
    Trigger->>DB: INSERT notifications (x N usuarios suscritos)
    DB->>RT: Broadcast INSERT event
    RT-->>Bell: Nuevo badge (unread count++)
    DB->>Push: Webhook (Supabase → API route)
    Push->>Phone: Web Push notification
    Note over Phone: "Partido en vivo! Futbol: ING vs MED"
```

### 5d. Quiniela (Predicciones)

```mermaid
sequenceDiagram
    actor User
    participant UI as Quiniela Page
    participant DB as PostgreSQL
    actor Admin

    User->>UI: Selecciona predicción (3-1)
    UI->>DB: INSERT pronosticos (goles_a=3, goles_b=1)
    Note over DB: Partido aún no empieza

    Admin->>DB: UPDATE partidos SET estado='finalizado'
    DB->>DB: TRIGGER calcula_puntos()
    DB->>DB: UPDATE pronosticos SET puntos_ganados=X
    DB-->>UI: SWR revalidate → Leaderboard actualiza
    Note over UI: Usuario sube/baja en ranking
```

---

## 6. Sports Scoring Engine

```mermaid
classDiagram
    class ISportService {
        <<interface>>
        +getInitialState() MarcadorDetalle
        +addPoints(state, team, pointType) MarcadorDetalle
        +removePoints(state, team, pointType) MarcadorDetalle
        +getCurrentScore(state) ScoreInfo
        +getDefaultPointTypes() PointType[]
    }

    class FutbolService {
        +addPoints() goles_a/goles_b ++
        +getCurrentScore() goles totales
    }

    class BaloncestoService {
        +addPoints() puntos por cuarto (1/2/3 pts)
        +getCurrentScore() total acumulado
        +changePeriod() cuarto_actual++
    }

    class VoleibolService {
        +addPoints() puntos del set actual
        +getCurrentScore() sets ganados
        +autoNewSet() al llegar a 25 (o 15 en 5to)
    }

    class TenisService {
        +addPoints() juegos del set actual
        +getCurrentScore() sets ganados
        +tiebreak() al 6-6
    }

    class TenisMesaService {
        +addPoints() puntos del set (hasta 11)
        +getCurrentScore() sets ganados (best of 5)
    }

    class AjedrezService {
        +addPoints() total_a/total_b ++ por ronda
        +getCurrentScore() puntos acumulados
    }

    class NatacionService {
        +setParticipantTime() tiempo por nadador
        +getResults() ordenado por tiempo ASC
        +addPoints() no-op (modelo carrera)
    }

    ISportService <|.. FutbolService
    ISportService <|.. BaloncestoService
    ISportService <|.. VoleibolService
    ISportService <|.. TenisService
    ISportService <|.. TenisMesaService
    ISportService <|.. AjedrezService
    ISportService <|.. NatacionService
```

**Registry:**
```typescript
// src/modules/sports/index.ts
getSportService('Fútbol')      → FutbolService
getSportService('Baloncesto')  → BaloncestoService
getSportService('Voleibol')    → VoleibolService
getSportService('Tenis')       → TenisService
getSportService('Tenis de Mesa') → TenisMesaService
getSportService('Ajedrez')     → AjedrezService
getSportService('Natación')    → NatacionService
```

---

## 7. Seguridad — Roles y Row Level Security (RLS)

### Roles del Sistema

| Rol | Descripción | Asignación |
|-----|-------------|------------|
| `public` | Usuario registrado base | Automático al registrarse |
| `deportista` | Atleta/participante | Asignado por admin |
| `periodista` | Puede publicar noticias | Asignado por admin |
| `data_entry` | Puede gestionar partidos y eventos | Asignado por admin |
| `admin` | Acceso total al sistema | Asignado manualmente |

### Matriz de Permisos (RLS)

| Tabla | `public` | `deportista` | `periodista` | `data_entry` | `admin` |
|-------|----------|-------------|-------------|-------------|---------|
| **profiles** | SELECT (public) | SELECT (public) | SELECT (public) | SELECT (public) | ALL |
| **partidos** | SELECT | SELECT | SELECT | INSERT/UPDATE/DELETE | ALL |
| **eventos_partido** | SELECT | SELECT | SELECT | INSERT/DELETE | ALL |
| **noticias** | SELECT (published) | SELECT (published) | ALL | SELECT (published) | ALL |
| **pronosticos** | Own CRUD | Own CRUD | Own CRUD | Own CRUD | ALL |
| **notifications** | Own SELECT/UPDATE/DELETE | Own SELECT/UPDATE/DELETE | Own SELECT/UPDATE/DELETE | Own SELECT/UPDATE/DELETE | ALL |
| **friend_requests** | Own CRUD | Own CRUD | Own CRUD | Own CRUD | ALL |
| **admin_audit_logs** | --- | --- | --- | --- | SELECT + INSERT |
| **push_subscriptions** | Own CRUD | Own CRUD | Own CRUD | Own CRUD | ALL |

**Función helper:** `public.has_role(auth.uid(), 'admin')` — verifica si el usuario tiene un rol específico en el array `profiles.roles`.

---

## 8. Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Next.js | 16.1.6 | Framework (App Router, ISR, SSR) |
| React | 19.2.3 | UI Library |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 4.x | Styling |
| SWR | 2.4.1 | Data Fetching + Cache |
| Framer Motion | latest | Animaciones |
| Recharts | 3.7.0 | Gráficas (Estadísticas) |
| Lucide React | latest | Iconografía |
| Sonner | latest | Toast Notifications |

### Backend (Supabase)
| Servicio | Uso |
|----------|-----|
| PostgreSQL | Base de datos relacional con RLS |
| PostgREST | REST API automática |
| Realtime | WebSocket para marcadores en vivo |
| Auth | Microsoft OAuth + Magic Link |
| Storage | Avatares y escudos de carreras |

### DevOps & Testing
| Herramienta | Uso |
|------------|-----|
| Vercel | Hosting (Edge CDN + Serverless) |
| k6 | Load Testing (hasta 150 VUs) |
| Jest | 30.2.0 | Unit Tests |
| ESLint | 9.x | Linting |
| Web Push API | Push Notifications (PWA) |

### Resultados de Load Test (150 VUs, producción)
```
p95 latencia:     14.2ms
p99 latencia:     106ms
Error rate:       0.00%
Throughput:       73.5 req/s
Data transferida: 766 MB / 5 min
Checks pasados:   100%
```

---

## Diagrama de Directorios

```
project_olympics/
├── docs/
│   └── ARCHITECTURE.md          ← Este archivo
├── public/
│   └── manifest.json            # PWA manifest
├── scripts/
│   └── load-test.js             # k6 load test script
├── src/
│   ├── app/                     # 29 páginas (Next.js App Router)
│   │   ├── admin/(dashboard)/   # 9 páginas admin
│   │   ├── api/push/send/       # Push notification endpoint
│   │   ├── auth/callback/       # OAuth callback
│   │   ├── calendario/          # Calendario de partidos
│   │   ├── carrera/[id]/        # Perfil de carrera
│   │   ├── clasificacion/       # Rankings
│   │   ├── login/               # Login page
│   │   ├── mapa/                # Mapa interactivo
│   │   ├── medallero/           # Medal board
│   │   ├── noticias/            # Noticias (ISR)
│   │   ├── notificaciones/      # Centro de notificaciones
│   │   ├── partido/[id]/        # Detalle de partido
│   │   ├── partidos/            # Lista de partidos
│   │   ├── perfil/              # Perfiles de usuario
│   │   ├── quiniela/            # Predicciones
│   │   └── tv/                  # Vista transmisión
│   ├── hooks/                   # Hooks globales (useAuth, useNotifications)
│   ├── lib/                     # Utilidades (supabase, scoring, constants)
│   ├── modules/                 # 7 módulos de dominio
│   │   ├── admin/               # matches/components, matches/hooks
│   │   ├── matches/             # types, hooks, components
│   │   ├── medallero/           # types, hooks, components
│   │   ├── news/                # types, hooks, components
│   │   ├── quiniela/            # types, hooks, helpers, components
│   │   ├── sports/              # types, services (7 deportes), index
│   │   └── users/               # types, hooks, components (friends)
│   └── shared/                  # Componentes y utilidades compartidas
│       └── components/          # Navbar, Calendar, UI Primitives, Sport Icons
├── supabase/
│   └── migrations/              # SQL migrations (schema + RLS + triggers)
└── package.json
```
