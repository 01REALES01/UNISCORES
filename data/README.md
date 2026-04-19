# Datos de ejemplo / importación

Aquí viven los **Excel** u otros archivos de datos que el equipo usa para pruebas o importaciones manuales.

No los consume Next.js en tiempo de ejecución: son referencia para scripts en `scripts/dev/` o para trabajo en Supabase / administración.

## Ajedrez — Excel por ronda (referencia de columnas)

Para **import-ajedrez-ronda** (panel Admin → fixture):

1. **Calendario General**: hoja `POR DIA GENERAL` con bloque deporte `Ajedrez`, ronda y filas `Vs` (mismo flujo que el fixture masivo).
2. **Tabla simple** (primera hoja): fila de encabezados con columnas para **Blancas** y **Negras** (o *Blanco* / *Negro*); opcional fecha y lugar. El parser rellena género según el formulario del admin.

Los nombres deben ser reconocibles respecto a `jugadores.nombre` (disciplina Ajedrez) o `profiles.full_name` si ya hay cuenta.

**Export tipo Swiss (Emparejamientos/Resultados):** fila de título con texto tipo `1. Ronda el 2026/04/17 a las 03:00 p.m.` (fecha y hora para el `partido`); tabla con columnas **White** / **Black** (o Blancas/Negras), opcional **M.** o **M** (mesa), **Resultado** (`1 - 0`, `0 - 1`, tablas). Los nombres `Apellido, Nombre` se convierten a `Nombre Apellido` al importar.
