# Changelog Redesign — Olimpiadas 2026

Tracking de cada cambio realizado durante el redesign.

---

## FASE 0 — Fundamentos

### Tarea 0.1 — Tipografia
- [x] `layout.tsx`: Reemplazar Inter + Outfit por Montserrat
- [x] `globals.css`: Actualizar --font-sans a Montserrat

### Tarea 0.2 — Variables CSS y tema
- [x] `globals.css`: Reescribir @theme con paleta morada (violet-400 a violet-900)
- [x] `globals.css`: Reescribir .dark con nuevos colores (bg: #4C1D95, primary: #7C3AED, secondary: #10B981)
- [x] `globals.css`: Reescribir :root identico a .dark (dark-first)
- [x] `globals.css`: Eliminar variables --glass-bg, --glass-border
- [x] `globals.css`: Eliminar clases .glass, .texture-grain, .glow-primary, .glow-success, .gradient-border
- [x] `globals.css`: Eliminar animaciones: gradient-shift, splashFlash, splashShake, splashRing
- [x] `globals.css`: Mantener animaciones: shimmer, live-pulse, wiggle, morph-0/1/2/3
- [x] `globals.css`: Actualizar scrollbar a white/20 y white/40

### Tarea 0.3 — UI Primitives
- [x] `ui-primitives.tsx`: Card → bg-white/8, sin bordes, sin blur, sin variantes (glass/gradient eliminadas)
- [x] `ui-primitives.tsx`: Button → violet-600/700, eliminar variante glass, focus ring violet
- [x] `ui-primitives.tsx`: Badge → colores solidos sin bordes (violet, red, emerald, white)
- [x] `ui-primitives.tsx`: Avatar → colores solidos (violet, emerald, amber, cyan, rose) sin gradientes
- [x] `ui-primitives.tsx`: Input → bg-white/8, sin bordes, focus ring violet
- [x] `ui-primitives.test.tsx`: Actualizar tests a nuevos estilos
- [x] Admin files: Limpiar variant="glass" en partidos/[id]/page.tsx y loading.tsx
- [x] Perfil [id]/loading.tsx: Limpiar variant="glass"

### Tarea 0.4 — Constants
- [x] `constants.ts`: SPORT_COLORS diferenciados (7 colores unicos por deporte)
- [x] `constants.ts`: SPORT_SOFT_BG, SPORT_ACCENT, SPORT_BORDER actualizados
- [x] `constants.ts`: SPORT_LIVE_TEXT, SPORT_LIVE_BG_WRAPPER, SPORT_LIVE_BAR actualizados
- [x] `constants.ts`: SPORT_GRADIENT y SPORT_GLOW → stubs vacios (deprecated, pendiente limpieza)

### Tarea 0.5 — PWA y Metadata
- [x] `manifest.json`: theme_color y background_color → #4C1D95
- [x] `layout.tsx`: viewport themeColor → #4C1D95
- [x] `layout.tsx`: metadata title → "Olimpiadas Deportivas | UNINORTE 2026"

### Build verification
- [x] `npx next build` — Compilacion exitosa sin errores

---

## FASE 1 — Paginas (se actualiza conforme se avanza)

*(Se iran agregando los cambios por pagina aqui)*
