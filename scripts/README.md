# Scripts auxiliares (desarrollo)

Esta carpeta **no forma parte** del build de Next.js (`npm run build` no las usa). Sirven para pruebas locales, importaciones puntuales o mantenimiento de datos.

## `load-testing/`

Scripts para **k6** (carga / estrés HTTP). Ejecución típica:

```bash
k6 run scripts/load-testing/load-test.js
# Opcional: BASE_URL=https://tu-dominio.com
```

Archivos: `load-test.js`, `load-test-phase1.js`, `load-test-stress.js`.

## `dev/`

Scripts **Node.js** ad-hoc usados durante el desarrollo (probar parsers, Supabase, Excel, importaciones, etc.). Pueden requerir variables de entorno como en la app (por ejemplo credenciales Supabase).

| Área aproximada | Archivos |
|-----------------|----------|
| Pruebas DB / Supabase | `test_db*.js`, `test_supabase.js`, `test-db.js`, `check_data.js`, `check_profiles.js` |
| Parsers / Excel | `test_parser*.js`, `read_excel.js`, `import_jornadas.js` (importación) |
| Medallero / datos | `fix_medals.js`, `fix_medals2.js`, `clean_medallero.js` |
| Otros | `modify_stats.js`, `update_colors.js`, `light_mode.js`, `test_match.js`, `test_news.js` |
| Excel suelto (legado) | `scratch-search_excel.js` |

Antes de ejecutar uno, revisa las primeras líneas del archivo: suelen indicar dependencias o rutas esperadas.

## `dev/scratch-research/`

Utilidades muy puntuales: `find_match.mjs`, `find_match_2.mjs`, `fix_match_detail.py` (no entran en el flujo principal de la app).

---

Para el trabajo cotidiano del proyecto basta con **`src/`** (TypeScript) y **`npm run dev`**.
