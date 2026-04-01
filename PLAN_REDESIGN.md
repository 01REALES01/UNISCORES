# Plan de Redesign — Olimpiadas Deportivas 2026

## Identidad Visual Nueva (Híbrida: Institucional + Moderna)

**Paleta de colores:**
- Primary: `#7C3AED` (violet-600) — Morado principal
- Background: `#4C1D95` (violet-900) — Fondo oscuro morado
- Card: `rgba(255, 255, 255, 0.05)` / `bg-white/5` — Fondo base
- Card Blur (Elementos Flotantes): `bg-white/10 backdrop-blur-md`
- Foreground: `#F5F5DC` (beige claro) / `#FFFFFF` (blanco)
- Secondary/Accent: `#10B981` (emerald-500) — Verde
- Muted: `rgba(124, 58, 237, 0.3)` — Morado suave
- Border: `rgba(255, 255, 255, 0.1)` — Bordes sutiles blancos
- Success: `#10B981` | Warning: `#F59E0B` | Danger: `#EF4444`

**Tipografía Extendida (Reglas Híbridas Correctas):**
1. **Montserrat (400-900):** Tipografía para grandes bloques, **títulos (H1, H2)** y **subtítulos**. Aporta el peso y la seriedad principal a gran escala.
2. **Neulis (font-display):** Tipografía de acento deportivo reservada para **cosas pequeñas**, como links de navegación (Tabs/Navbar), badges sutiles, microinteracciones o detalles decorativos. (Aporta ligereza dinámica en espacios reducidos).

**Elementos Gráficos Decorativos:**
- Se integrarán recursos visuales de la suite `Olimpiadas elementos 2`.
- **Uso:** (Temporalmente Desactivados por revisión visual). Estos no reemplazarán a los íconos de Lucide de la UI funcional, sino que se evaluará su uso más adelante en zonas específicas donde no generen ruido.

**Reglas de estilo (Enfoque Híbrido):**
- **Base Sólida Institucional:** El morado oscuro (`bg-background`) y Montserrat otorgan seriedad.
- **Glassmorphism Estratégico:** Usar `backdrop-blur-*` SOLAMENTE en contenedores principales, elementos flotantes, navbars o modals. Listas internas deben ser planas (`bg-black/10` o `bg-white/5`).
- **Gradientes Estructurados:** Permitidos gradientes monocromáticos (`from-violet-600/20 to-transparent`) para generar direccionalidad e iluminación. NADA de arcoíris.
- **Iluminación Ambiental:** Orbes de fondos (`blur-[120px]`) estandarizados en violeta o toques esmeralda, siempre con baja opacidad o `mix-blend-screen`.
- **Glows/Resplandores Controlados:** Reservar `shadow-emerald-500` o `shadow-violet-500` para componentes ACTIVOS, seleccionados o "En Curso".
- **Limpieza de UI:** Reducir intensidad de bordes. Eliminar ruido visual excesivo (grain overlay pesado).

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

## FASE 0 — Fundamentos (COMPLETADA)

> Esto ya se ejecutó

### Tarea 0.1 — Tipografia (Hecho)
### Tarea 0.2 — Variables CSS y tema (Hecho)
### Tarea 0.3 — UI Primitives (Hecho)
### Tarea 0.4 — Constants (Hecho)
### Tarea 0.5 — PWA y Metadata (Hecho)

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
- Fondo navbar: `bg-background/80 backdrop-blur-xl` (glassmorphism híbrido).
- Logo: reemplazar con logo Olimpiadas cuando llegue la imagen.
- Tabs: texto blanco, activo con indicador sólido verde o morado brillante (sin glow excesivo).
- Profile dropdown: `bg-white/10 backdrop-blur-md` border-white/10.

#### 1.2 Home — Hero + Search
**Archivos:**
- `src/app/page.tsx` (secciones superiores)
- `src/shared/components/welcome-hero.tsx`
- `src/components/welcome-hero.tsx`

**Cambios:**
- Mantener ambient background limitado a esferas violetas difuminadas.
- Hero: glassmorphism sutil `bg-white/5 backdrop-blur-xl`.
- Search: input con borde de transición suave, focus glow institucional.

#### 1.3 Home — Match Cards + Hero Slider
**Cambios:**
- Cards de partido: híbridas (base plana, ligeros brillos al hacer hover).
- Score display: limpio, números rotundos.

#### 1.4 Home — News, Quiniela CTA, Footer
**Cambios:**
- News cards: Limpias, imagen y texto.
- Quiniela CTA: Llamamiento vibrante pero que respete el violeta/esmeralda.

#### 1.5 Partidos (`src/app/partidos/page.tsx`)
**Cambios:**
- Filter chips: violeta sólido activo, transparente inactivo.
- Cards con el nuevo estilo híbrido de calendario (bg-white/5 + gradients sutiles transparentes).
- Sticky filter bar: `backdrop-blur` permitido.

#### 1.6 Partido Detail (`src/app/partido/[id]/page.tsx`)
**Cambios:**
- Limpiar timelines. Avatares con bordes sólidos según quién ganó o perdió.
- Score muy visible y contrastado.

#### 1.7 Clasificacion + Medallero
**Cambios:**
- Tablas: filas en bg-black/10 o bg-white/5 alternadas.

#### 1.8 Estadisticas (`src/app/estadisticas/page.tsx`)
**Cambios:**
- Contratos de color de gráficas actualizados a morado y verde.
- Cards: `bg-white/5 backdrop-blur-md`.

#### 1.9 Mapa (`src/app/mapa/page.tsx`)
**Cambios:**
- Legend simple. Cards flotantes.

#### 1.10 TV Page (`src/app/tv/page.tsx`)
**Cambios:**
- Fondo limpio, números inmensos, estilo estadio LED usando glows esmeralda controlados.

---

### JEAN PAUL — Login, perfiles, secciones secundarias y compartidas

#### 2.1 Login (`src/app/login/page.tsx`) **(EN PROGRESO/RESTRINGIDO)**
**Cambios:**
- Flujo reestringido a solo Microsoft.
- Fondo: morado sólido o efecto premium tenue.

#### 2.2 Skeletons y Loaders
**Cambios:**
- Skeletons: violeta sutil pulsante.

#### 2.3 Notificaciones (`src/components/notification-bell.tsx`)
**Cambios:**
- Bell dropdown: glassmorphism estructurado sin blur exagerado.

#### 2.4 Splash Screen + Offline
**Cambios:**
- Offline: tonos morados/grises.

#### 2.5 Calendario (`src/app/calendario/page.tsx`) **(FINALIZADO - ESTILO HÍBRIDO)**
**Resultados aplicados:**
- Ambient lighting morado y estructurado.
- Tarjetas flotantes con `backdrop-blur-xl`. Grid interno `bd-background/40`.
- Lista de partidos jerarquizada (teams en bg-black/10 y contenedores bg-white/5).

#### 2.6 Perfil (`src/app/perfil/[id]/page.tsx`)
**Cambios:**
- UI limpia para la info del alumno. Avatares sin glow, solo border-emerald si amerita.

#### 2.7 Lideres + Puntos
**Cambios:**
- Filas alternadas. Resaltar top 3 con medallas doradas, plata y bronce.

#### 2.8 Quiniela (`src/app/quiniela/page.tsx`)
**Cambios:**
- Botoncitos de la predicción en colores sólidos.

#### 2.9 Noticias (`src/app/noticias/page.tsx`)
**Cambios:**
- Consistencia del grid de cards publicadas.

#### 2.10 Carrera Detail (`src/app/carrera/[id]/page.tsx`)
**Cambios:**
- Cabezal premium institucional para la carrera con escudo e info clave flotando sobre blur.

---

## FASE 2 — Polish y QA (~2 horas, ambos)

| # | Tarea | Quien |
|---|-------|-------|
| 1 | Review cruzado: Orly revisa paginas de Jean Paul y viceversa | Ambos |
| 2 | Verificar responsive en mobile (iPhone SE, iPhone 14) | Ambos |
| 3 | Verificar consistencia de colores y reglas híbridas | Ambos |
| 4 | Integrar logo Olimpiadas cuando llegue la imagen | Quien este libre |
| 5 | Integrar antorcha SVG en PWA icon cuando llegue | Quien este libre |
| 6 | Merge final a `redesign` → PR a `main` | Ambos |

---

## Archivos que NO se tocan (admin)

Todas las paginas bajo `src/app/admin/` se dejan para despues.

---

## Checklist de Eliminacion y Regulación Global

Buscar uniformar los estilos en TODOS los archivos publicos:
- [ ] `backdrop-blur`: Solo en Navbars, Modals y Contenedores principales (Hero/Tarjetas Base). No anidar.
- [ ] `bg-gradient-to-*` / `from-*`: Restringir a monocromáticos (purple to dark_purple, white/10 to white/5). Eliminar arcoíris (amber -> orange -> red).
- [ ] `shadow-*-500/`: (Glows/Neon) Exclusivo para estados Activos/En curso (Verde `emerald-500` o morado `violet-500`).
- [ ] Colores random: `bg-[#17130D]` -> `bg-background` o `bg-black/20`.
- [ ] `text-yellow-*` / `text-red-*`: Sustituir donde haya choque visual con el violeta `violet-600` o verde `emerald-500`.

---

## Resumen de Tiempos Estimados

| Fase | Duracion | Personas |
|------|----------|----------|
| Fase 0 — Fundamentos | Primera sesion | 1 persona |
| Fase 1 — Paginas | Grueso del trabajo | 2 en paralelo |
| Fase 2 — Polish + QA | Cierre | 2 personas |
