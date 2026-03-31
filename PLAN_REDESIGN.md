# Plan de Redesign — Olimpiadas Deportivas 2026

## Identidad Visual Nueva

**Paleta de colores:**
- Primary: `#7C3AED` (violet-600) — Morado principal
- Background: `#4C1D95` (violet-900) — Fondo oscuro morado
- Card: `rgba(255, 255, 255, 0.08)` — Cards semi-transparentes sin blur ni bordes
- Foreground: `#F5F5DC` (beige claro) / `#FFFFFF` (blanco)
- Secondary/Accent: `#10B981` (emerald-500) — Verde
- Muted: `rgba(124, 58, 237, 0.3)` — Morado suave
- Border: `rgba(255, 255, 255, 0.1)` — Bordes sutiles blancos
- Success: `#10B981` | Warning: `#F59E0B` | Danger: `#EF4444`

**Tipografia:** Montserrat (400, 500, 600, 700, 800, 900)

**Reglas de estilo:**
- NO gradientes
- NO bordes recargados
- NO glassmorphism (backdrop-blur)
- NO grain/texture overlays
- NO glow/shadow de color
- Cards semi-transparentes (`rgba(255,255,255,0.08)`) sin blur ni bordes
- Estilo limpio, aireado, flat

---

## Estrategia de Branches

```
main
 └── redesign (branch base)
      ├── redesign/orly    (Persona A)
      └── redesign/jeanpaul (Persona B)
```

Merge frecuente a `redesign`. Cuando una seccion este completa, PR a `redesign`.

---

## FASE 0 — Fundamentos (1 persona, ~1 hora)

> Esto lo hace UNA persona. La otra espera o avanza leyendo las paginas que le tocan.

### Tarea 0.1 — Tipografia
**Archivo:** `src/app/layout.tsx`
- Reemplazar `Inter` y `Outfit` por `Montserrat` de `next/font/google`
- Variable CSS: `--font-montserrat`
- Pesos: 400, 500, 600, 700, 800, 900

### Tarea 0.2 — Variables CSS y tema
**Archivo:** `src/app/globals.css`
- Reescribir el bloque `@theme` con nueva paleta morada
- Reescribir `.dark` con los nuevos colores
- Reescribir `:root` (light mode) — puede quedar igual que dark por ahora
- Eliminar variables `--glass-bg`, `--glass-border`
- Eliminar clases: `.glass`, `.texture-grain`, `.glow-primary`, `.glow-success`, `.gradient-border`
- Mantener animaciones utiles: `shimmer`, `live-pulse`, `wiggle`
- Eliminar animaciones: `gradient-shift`, `splash-flash`, `splash-shake`, `splash-ring`
- Actualizar scrollbar colors al morado

### Tarea 0.3 — UI Primitives
**Archivo:** `src/components/ui-primitives.tsx` + `src/shared/components/ui-primitives.tsx`
- **Card**: Eliminar variantes `glass` y `gradient`. Default = `bg-white/8`, sin bordes, sin blur
- **Button**:
  - `default` = `bg-violet-600 hover:bg-violet-700 text-white` (morado solido)
  - `outline` = `border border-white/20 text-white hover:bg-white/10`
  - `ghost` = `text-white hover:bg-white/10`
  - Eliminar variante `glass`
  - Sin sombras de color
- **Badge**: Simplificar, colores solidos sin glow
- **Avatar**: Mantener logica pero ajustar colores de gradiente al morado/verde
- **Input**: Fondo solido oscuro, sin glass

### Tarea 0.4 — Constants (colores de deporte)
**Archivo:** `src/lib/constants.ts`
- Actualizar `SPORT_COLORS` con colores que funcionen sobre morado:
  - Futbol: `#10B981` (verde esmeralda)
  - Baloncesto: `#F59E0B` (amarillo/naranja)
  - Voleibol: `#F97316` (naranja)
  - Tenis: `#22D3EE` (cyan)
  - Tenis de Mesa: `#EC4899` (rosa)
  - Ajedrez: `#F5F5DC` (beige/blanco)
  - Natacion: `#3B82F6` (azul)
- Eliminar `SPORT_GRADIENT` (no gradientes)
- Eliminar `SPORT_GLOW` (no glows)
- Simplificar `SPORT_SOFT_BG`, `SPORT_BORDER`, `SPORT_ACCENT` a la nueva paleta

### Tarea 0.5 — PWA y Metadata
**Archivos:** `public/manifest.json`, `src/app/layout.tsx`
- `theme_color` → `#4C1D95`
- `background_color` → `#4C1D95`
- Metadata title → mantener
- Cuando llegue el logo nuevo, actualizar favicon/icons

---

## FASE 1 — Paginas Publicas (en paralelo, ~6-8 horas por persona)

### ORLY — Paginas de navegacion principal y partidos

#### 1.1 Navbar + Tabs
**Archivos:**
- `src/components/main-navbar.tsx`
- `src/shared/components/main-navbar.tsx`
- `src/components/ui/expandable-tabs.tsx`
- `src/shared/components/ui/expandable-tabs.tsx`

**Cambios:**
- Fondo navbar: solido morado oscuro (sin backdrop-blur)
- Logo: reemplazar con logo Olimpiadas cuando llegue la imagen
- Tabs: texto blanco, activo con indicador solido (sin glow)
- Profile dropdown: fondo semi-transparente (white/8) morado, sin gradientes
- Eliminar ambient blobs/gradients del fondo

#### 1.2 Home — Hero + Search
**Archivos:**
- `src/app/page.tsx` (secciones superiores)
- `src/shared/components/welcome-hero.tsx`
- `src/components/welcome-hero.tsx`
- `src/components/ui/suggestive-search.tsx`
- `src/shared/components/ui/suggestive-search.tsx`

**Cambios:**
- Eliminar ambient background gradients (los divs con blur-[120px])
- Hero: fondo morado limpio, texto blanco, sin gradiente de texto
- Search: input solido con borde sutil blanco/20
- Badges/chips: solidos, morado + blanco

#### 1.3 Home — Match Cards + Hero Slider
**Archivos:**
- `src/components/hero-slider.tsx`
- `src/shared/components/hero-slider.tsx`
- `src/shared/components/match-featured-card.tsx`

**Cambios:**
- Cards de partido: fondo semi-transparente (white/8) (violet-700), sin glass, sin glow
- Colores de deporte como acento en icono/badge, no en toda la card
- Hero slider: fondo semi-transparente (white/8), sin gradientes de deporte
- Score display: limpio, numeros grandes, sin efectos

#### 1.4 Home — News, Quiniela CTA, Footer
**Archivos:**
- `src/components/news-card.tsx`
- `src/shared/components/about-footer.tsx`
- `src/shared/components/welcome-notice.tsx`
- `src/components/welcome-notice.tsx`

**Cambios:**
- News cards: fondo semi-transparente (white/8), imagen + texto, sin bordes pesados
- Quiniela CTA: boton morado solido sobre fondo mas claro
- Footer: simplificar, morado oscuro

#### 1.5 Partidos
**Archivo:** `src/app/partidos/page.tsx`

**Cambios:**
- Eliminar ambient backgrounds
- Header: titulo blanco sobre morado, limpio
- Filter chips: morado activo, blanco/transparente inactivo
- Match cards: aplicar nuevo estilo de cards (ya hecho en 1.3)
- Date headers: texto beige/blanco
- Sticky filter bar: fondo semi-transparente (white/8) morado sin blur

#### 1.6 Partido Detail
**Archivo:** `src/app/partido/[id]/page.tsx`

**Cambios:**
- Score display grande: numeros blancos, fondo morado
- Team avatars: sin glow ni sombra de color
- Sport badge: color del deporte como bg solido
- Timeline/stats: tablas limpias sobre fondo card

#### 1.7 Clasificacion + Medallero
**Archivos:**
- `src/app/clasificacion/page.tsx`
- `src/app/medallero/page.tsx`
- `src/components/group-stage-table.tsx`
- `src/components/bracket-tree.tsx`
- `src/components/medalleria-board.tsx`

**Cambios:**
- Tablas: filas alternas con violet-700/violet-800, texto blanco
- Bracket tree: lineas blancas/beige, cards solidas
- Medals: iconos dorado/plata/bronce sin glow
- Limpiar bordes y gradientes

#### 1.8 Estadisticas
**Archivos:**
- `src/app/estadisticas/page.tsx`
- `src/components/charts.tsx`
- `src/shared/components/charts.tsx`

**Cambios:**
- Charts: colores morado/verde/beige
- Cards de stats: fondo semi-transparente (white/8)
- Sin ambient backgrounds

#### 1.9 Mapa
**Archivos:**
- `src/app/mapa/page.tsx`
- `src/components/campus-map-interactive.tsx`
- `src/shared/components/campus-map-interactive.tsx`

**Cambios:**
- Venue indicators: colores morado/verde
- Cards de instalacion: fondo semi-transparente (white/8)
- Legend: simplificada

#### 1.10 TV Page
**Archivo:** `src/app/tv/page.tsx`

**Cambios:**
- Fondo morado oscuro solido
- Score gigante blanco
- Barra de progreso verde o morado claro

---

### JEAN PAUL — Login, perfiles, secciones secundarias y componentes compartidos

#### 2.1 Login
**Archivos:**
- `src/app/login/page.tsx`
- `src/components/ui/login-form.tsx`
- `src/shared/components/ui/login-form.tsx`
- `src/components/ui/sign-in-flo.tsx`
- `src/shared/components/ui/sign-in-flo.tsx`

**Cambios:**
- Eliminar smokey/WebGL background
- Fondo: morado solido o con imagen de campus como fondo
- Card del form: fondo violet-700, sin glass
- Inputs: fondo semi-transparente (white/8) oscuro, borde sutil
- Boton submit: morado solido (o blanco sobre morado)
- Microsoft OAuth button: mantener pero adaptar estilo
- Logo: reemplazar cuando llegue el nuevo
- Password strength: barras con colores de la nueva paleta

#### 2.2 Skeletons y Loaders
**Archivos:**
- `src/components/skeletons.tsx`
- `src/shared/components/skeletons.tsx`
- `src/components/ui/orbital-loader.tsx`
- `src/shared/components/ui/orbital-loader.tsx`
- `src/components/ui/morph-loading.tsx`
- `src/shared/components/ui/morph-loading.tsx`

**Cambios:**
- Skeleton base: `bg-white/5` → `bg-white/10` sobre morado
- Shimmer: ajustar colores al morado
- Loaders: colores morado/blanco/verde

#### 2.3 Notificaciones
**Archivos:**
- `src/components/notification-bell.tsx`
- `src/app/notificaciones/page.tsx`

**Cambios:**
- Bell dropdown: fondo semi-transparente (white/8) violet-800, sin glass
- Notification items: hover bg-white/10
- Badge count: verde o blanco sobre morado
- Tabs: estilo consistente con nueva paleta
- Friend request cards: fondo semi-transparente (white/8)

#### 2.4 Splash Screen + Offline
**Archivos:**
- `src/components/splash-screen.tsx`
- `src/shared/components/splash-screen.tsx`
- `src/app/offline/page.tsx`

**Cambios:**
- Splash: fondo morado, mantener animacion de frames si se ve bien
- Offline: fondo morado, iconos blancos, boton retry morado/verde
- Eliminar ambient gradients rojos/ambar

#### 2.5 Calendario
**Archivos:**
- `src/app/calendario/page.tsx`
- `src/shared/components/calendar-filters.tsx`
- `src/shared/components/calendar-grid.tsx`
- `src/shared/components/calendar-match-list.tsx`

**Cambios:**
- Calendar grid: celdas con fondo violet-700, activa en verde o blanco
- Navigation mes: flechas blancas
- Match indicators en dias: puntos de color del deporte
- Cards de partido del dia: fondo semi-transparente (white/8)

#### 2.6 Perfil (propio, editar, publico)
**Archivos:**
- `src/app/perfil/page.tsx`
- `src/app/perfil/editar/page.tsx`
- `src/app/perfil/[id]/page.tsx`

**Cambios:**
- Avatar grande: sin glow
- Name color picker: mantener funcionalidad
- Tabs: morado activo, transparente inactivo
- Stats cards: fondo semi-transparente (white/8)
- Friends list: items limpios sin bordes pesados
- Edit form: inputs solidos

#### 2.7 Lideres + Puntos
**Archivos:**
- `src/app/lideres/page.tsx`
- `src/app/puntos/page.tsx`

**Cambios:**
- Leaderboard rows: filas alternas violet-700/violet-800
- Rank badges (1, 2, 3): dorado, plata, bronce (sin glow)
- Expandable rows: fondo ligeramente mas claro al expandir
- Filter buttons: estilo consistente

#### 2.8 Quiniela
**Archivo:** `src/app/quiniela/page.tsx`

**Cambios:**
- Disclaimer modal: fondo semi-transparente (white/8), sin glass
- Stats cards (3 metricas): fondo semi-transparente (white/8) con icono
- Tabs: estilo consistente
- Prediction cards: botones de equipo morado/verde
- Ranking tab: tabla limpia

#### 2.9 Noticias
**Archivos:**
- `src/app/noticias/page.tsx`
- `src/app/noticias/[id]/page.tsx`
- `src/components/news-card.tsx`
- `src/components/news-reactions.tsx`

**Cambios:**
- News cards: imagen arriba, contenido abajo, fondo card
- Filters: chips morado/blanco
- Article view: texto beige/blanco sobre morado, imagen hero
- Related news: grid limpio

#### 2.10 Carrera Detail
**Archivo:** `src/app/carrera/[id]/page.tsx`

**Cambios:**
- Header con shield: fondo morado, nombre blanco
- Tabs: estilo consistente
- Athlete cards: fondo semi-transparente (white/8), avatar sin glow
- Sport summary cards: acento con color del deporte

---

## FASE 2 — Polish y QA (~2 horas, ambos)

| # | Tarea | Quien |
|---|-------|-------|
| 1 | Review cruzado: Orly revisa paginas de Jean Paul y viceversa | Ambos |
| 2 | Verificar responsive en mobile (iPhone SE, iPhone 14) | Ambos |
| 3 | Verificar consistencia de colores entre todas las paginas | Ambos |
| 4 | Integrar logo Olimpiadas cuando llegue la imagen | Quien este libre |
| 5 | Integrar antorcha SVG en PWA icon cuando llegue | Quien este libre |
| 6 | Merge final a `redesign` → PR a `main` | Ambos |

---

## Archivos que NO se tocan (admin)

Todas las paginas bajo `src/app/admin/` se dejan para despues:
- `/admin/(dashboard)/page.tsx`
- `/admin/(dashboard)/partidos/`
- `/admin/(dashboard)/noticias/`
- `/admin/(dashboard)/usuarios/`
- `/admin/(dashboard)/estadisticas/`
- `/admin/(dashboard)/bitacora/`
- `/admin/(dashboard)/importar/`
- `/admin/(dashboard)/puntos/`

---

## Checklist de Eliminacion Global

Buscar y eliminar en TODOS los archivos publicos:
- [ ] `backdrop-blur` / `backdrop-filter`
- [ ] `bg-gradient-to-*` / `from-*` / `via-*` / `to-*` (gradientes)
- [ ] `shadow-*-500/` (sombras de color / glow)
- [ ] `border-white/5` → simplificar o eliminar
- [ ] `blur-[120px]` / `blur-[100px]` (ambient blobs)
- [ ] `.glass` / `.texture-grain` / `.gradient-border`
- [ ] `bg-[#17130D]` / `bg-[#0a0805]` → reemplazar con `bg-background` o `bg-card`
- [ ] `text-yellow-*` / `text-red-*` como acentos → reemplazar con `text-violet-*` o `text-white`
- [ ] Referencias a `#FFC000` (gold) y `#DB1406` (red) como brand colors

---

## Resumen de Tiempos Estimados

| Fase | Duracion | Personas |
|------|----------|----------|
| Fase 0 — Fundamentos | Primera sesion | 1 persona |
| Fase 1 — Paginas (1.1-1.10 y 2.1-2.10) | Grueso del trabajo | 2 en paralelo |
| Fase 2 — Polish + QA | Cierre | 2 personas |
