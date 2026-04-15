# 🏆 Olympics Project - Sistema de Gestión Deportiva en Tiempo Real

Sistema completo de gestión de eventos deportivos con transmisión en vivo, panel de administración y vista pública interactiva.

## ✨ Características

- 🔴 **Transmisión en Vivo**: Actualizaciones en tiempo real usando Supabase Realtime
- ⚽🏀🏐 **Multi-Deporte**: Soporte para Fútbol, Baloncesto, Voleibol, Tenis y Tenis de Mesa
- 👨‍💼 **Panel Admin**: Control total del partido (cronómetro, eventos, jugadores)
- 👥 **Vista Pública**: Interfaz espectacular para visualizar partidos en vivo
- ⏱️ **Cronómetro Sincronizado**: Tiempo real con precisión de segundos en cliente y servidor
- 📊 **Registro de Eventos**: Goles, tarjetas, puntos (+1/+2/+3 para basketball)
- 🎨 **UI Premium**: Diseño moderno con glassmorphism, gradientes dinámicos y animaciones

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Despliegue**: [Vercel](https://vercel.com) (recomendado) o **Docker** (OpenLab / servidor propio; ver más abajo)

## 📋 Requisitos Previos

- Node.js **20+** recomendado (coincide con la imagen `node:20-alpine` del `Dockerfile`; 18+ suele funcionar en local)
- Cuenta de Supabase (gratuita)
- Git

## 🚀 Configuración Inicial

### 1. Clonar el Repositorio

```bash
git clone <URL_DE_TU_REPO>
cd project_olympics
```

### 2. Instalar Dependencias

```bash
npm install
# o
yarn install
# o
pnpm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` (o `.env`) en la raíz del proyecto. Usa [`.env.example`](./.env.example) como plantilla: copia el archivo y reemplaza los valores.

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
```

En producción suele hacer falta también `SUPABASE_SERVICE_ROLE_KEY` (OAuth y rutas admin); está documentado en `.env.example`.

**¿Dónde obtener estos valores?**

1. Ve a tu proyecto de Supabase: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Ve a `Settings` → `API`
3. Copia `Project URL` y `anon/public` key

### 4. Configurar Base de Datos

**IMPORTANTE**: Debes ejecutar los scripts SQL en Supabase antes de usar la app.

Ve a tu proyecto de Supabase → `SQL Editor` y ejecuta **en orden**:

1. **`supabase/schema.sql`** - Crea las tablas principales
2. **`db_setup.sql`** - Crea las tablas auxiliares (jugadores, eventos)

📖 Lee `SETUP_DATABASE.md` para instrucciones detalladas.

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

El script usa el **puerto 3001**. Abre [http://localhost:3001](http://localhost:3001).

`npm run start` (producción local sin Docker) usa por defecto el **puerto 3000** salvo que definas `PORT`.

## 🔌 Puertos y entornos (referencia)

| Contexto | Comando / plataforma | Puerto por defecto | Cómo cambiarlo |
|----------|----------------------|--------------------|----------------|
| Desarrollo local | `npm run dev` ([`package.json`](./package.json)) | **3001** | Edita el script (`next dev -p …`) o usa `next dev -p 4000` manualmente. |
| Producción local (sin Docker) | `npm run start` → `next start` | **3000** | Variable de entorno `PORT` (ej. `PORT=8080 npm run start`). |
| Imagen Docker (este repo) | `node server.js` en el contenedor | **3000** | Al **arrancar** el contenedor: `-e PORT=8080` (y mapear el host al **mismo** puerto interno). El `Dockerfile` define `ENV PORT=3000` por defecto. |
| Docker Compose (prueba local) | `docker compose up` | Publica **3000** en el host → **3000** en el contenedor | En [`docker-compose.yml`](./docker-compose.yml), clave `ports`: `"HOST:CONTAINER"` (ej. `"8080:3000"` si el proceso sigue escuchando 3000 dentro). |
| Vercel | Despliegue gestionado | *No aplica* un puerto fijo tuyo | HTTPS y enrutamiento los gestiona Vercel; no interfiere con el puerto interno del contenedor Docker. |

**Importante:** el **3000 del Docker** es el puerto **dentro del contenedor** (lo que escucha Node). En el servidor suele usarse un mapeo `PUERTO_HOST:PUERTO_CONTENEDOR` (ejemplo: `docker run -p 8443:3000 …` → en el navegador entras por `https://servidor:8443` o, más habitual, el proxy HTTPS termina en `8443` del host y reenvía al `3000` interno). OpenLab / infra elige el puerto del **host**; lo que debe coincidir es el **destino** del mapeo con el `PORT` del proceso dentro del contenedor.

## 🔐 Acceso de Administrador

### Crear Usuario Admin (Primera vez)

1. Ve a Supabase → `Authentication` → `Users`
2. Click en `Add user` → `Create new user`
3. Email: `admin@olympics.com` (o el que prefieras)
4. Password: Créalo y guárdalo de forma segura
5. Confirma el email automáticamente (toggle en Supabase)

### Login Admin

- Ruta: `/admin/login`
- Email y contraseña creados arriba

## 📁 Estructura del Proyecto

```
project_olympics/
├── src/
│   ├── app/                    # Rutas de Next.js
│   │   ├── page.tsx           # Página pública (Home)
│   │   ├── partido/[id]/      # Detalle público del partido
│   │   └── admin/             # Panel de administración
│   ├── components/            # Componentes reutilizables
│   │   ├── ui-primitives.tsx  # Sistema de diseño (Card, Button, etc.)
│   │   └── public-live-timer.tsx
│   ├── lib/
│   │   └── supabase.ts        # Cliente de Supabase
│   └── middleware.ts          # Protección de rutas admin
├── supabase/
│   ├── schema.sql             # Schema principal de DB
│   └── auth_setup.sql         # Configuración de autenticación
├── db_setup.sql               # Tablas auxiliares (jugadores, eventos)
├── Dockerfile                 # Imagen producción (Next standalone)
├── docker-compose.yml         # Prueba local Docker
├── .dockerignore
├── .env.example               # Plantilla de variables (sin secretos; versionada)
└── docs/
    └── DEPLOY_OPENLAB.md      # Puntero OpenLab + colaboradores GitHub
```

## 🎮 Uso

### Como Administrador

1. Login en `/admin/login`
2. Crear partido desde el panel
3. Seleccionar partido para controlarlo
4. Iniciar cronómetro, registrar eventos (goles, tarjetas, etc.)
5. Agregar jugadores sobre la marcha

### Como Espectador

1. Ve a la página principal (`/`)
2. Haz clic en cualquier partido EN VIVO
3. Observa actualizaciones en tiempo real

## 🔄 Colaboración en Equipo

### ✅ Estrategia Recomendada: Base de Datos Compartida

**Todos los miembros del equipo deben usar el MISMO proyecto de Supabase** para colaborar efectivamente.

### Para el líder del proyecto

1. Crea el proyecto en Supabase (si no lo has hecho)
2. Ejecuta los scripts SQL (`supabase/schema.sql` y `db_setup.sql`)
3. **Comparte con el equipo** (por canal seguro):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Credenciales de admin (email y password)

### Para nuevos miembros del equipo

1. Clona el repositorio:

   ```bash
   git clone https://github.com/01REALES01/project_olympics.git
   cd project_olympics
   npm install
   ```

2. Crea `.env.local` con las credenciales compartidas por el líder

3. Ejecuta el proyecto:

   ```bash
   npm run dev
   ```

4. ¡Listo! Todos verán los mismos datos en tiempo real 🔴

### Seguridad

- ✅ Las credenciales están en `.gitignore` (no se suben a GitHub)
- ✅ Compártelas solo con tu equipo por canales privados
- ✅ Si alguien nuevo se une, el líder le comparte las credenciales

## 🚢 Despliegue en Vercel

Vercel y Docker son **caminos distintos**: puedes seguir usando Vercel para producción “rápida” y usar Docker solo para OpenLab / servidor propio. No hay conflicto de puertos: en Vercel no expones `3000` manualmente.

1. Sube el código a GitHub.
2. En [Vercel](https://vercel.com) → **Import Project** → conecta el repo.
3. En **Settings → Environment Variables**, define al menos:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Para OAuth, rutas admin y APIs que usen clave privilegiada, añade también `SUPABASE_SERVICE_ROLE_KEY` (y las opcionales de push si las usas). Lista alineada con [`.env.example`](./.env.example).
5. Deploy. El dominio puede ser `*.vercel.app` o un dominio custom (configuración en Vercel).

`output: "standalone"` en [`next.config.ts`](./next.config.ts) sirve principalmente para **contenerizar** la app; Vercel sigue construyendo el proyecto con su flujo habitual.

## 🐳 Despliegue con Docker (OpenLab / servidor propio)

### Qué incluye el repo

| Archivo | Rol |
|---------|-----|
| [`Dockerfile`](./Dockerfile) | Multi-stage: dependencias → `next build` → imagen mínima que ejecuta `node server.js`. |
| [`.dockerignore`](./.dockerignore) | Reduce contexto de build y evita copiar `node_modules`, `.git`, `.env*`, etc. |
| [`docker-compose.yml`](./docker-compose.yml) | Prueba local: `build` + `ports` + `env_file: .env`. |
| [`next.config.ts`](./next.config.ts) | `output: "standalone"` para generar `.next/standalone`. |

### Build (`docker build`)

- En el **stage builder**, las variables **`NEXT_PUBLIC_*`** deben existir durante `npm run build`, porque Next las incrusta en el bundle del cliente.
- En este `Dockerfile` están declaradas como **`ARG` / `ENV`**: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Ejemplo explícito con build args:

```bash
docker build -t project-olympics \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_anon_key" \
  .
```

- Si construyes con **Compose**, los mismos valores se leen del entorno (típicamente un `.env` en la raíz **no commiteado**) porque `docker-compose.yml` pasa `args` desde `${NEXT_PUBLIC_SUPABASE_URL}` y `${NEXT_PUBLIC_SUPABASE_ANON_KEY}`.

**Regla:** si cambias URL o anon key públicos, **reconstruye** la imagen (`docker build` de nuevo). No basta con reiniciar el contenedor.

### Run (`docker run`)

- Variables **solo de servidor** (p. ej. `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_WEBHOOK_SECRET`) pueden ir en **runtime**; no hace falta recompilar por ellas.
- Ejemplo mapeando el puerto del host **8080** al interno **3000** (el proceso sigue escuchando 3000 dentro del contenedor):

```bash
docker run --rm -p 8080:3000 --env-file .env project-olympics
```

- Si **dentro** del contenedor debes usar otro puerto (poco habitual), por ejemplo **4000**:

```bash
docker run --rm -p 8080:4000 -e PORT=4000 --env-file .env project-olympics
```

Aquí el segundo número de `-p` debe coincidir con `PORT`.

- Ejemplo “todo en 3000” en máquina local (host y contenedor 3000):

```bash
docker run --rm -p 3000:3000 --env-file .env project-olympics
```

### Docker Compose

- Requiere un archivo **`.env`** en la raíz (no versionado) con al menos las `NEXT_PUBLIC_*` para que el **build** reciba los `args`. Si no existe, crea uno a partir de [`.env.example`](./.env.example); sin él Compose suele fallar al resolver `env_file`.
- Por defecto publica `3000:3000`. Para otro puerto en el host, por ejemplo `8443:3000`:

```yaml
ports:
  - "8443:3000"
```

```bash
docker compose up --build
```

### OpenLab (`.uninorte.edu.co`) y proxy

- Infraestructura suele colocar un **reverse proxy TLS** delante del contenedor. El proxy debe reenviar al **socket donde escucha Docker** (host:puerto) y ese destino debe coincidir con el **mapeo** `hostPort:containerPort`.
- Coordina con **infraestructura / OpenLab**: **URL pública HTTPS**, **puerto o socket en el host** donde escucha el contenedor y certificados.
- **Firewall:** abrir solo lo necesario entre proxy y contenedor.

### Variables de entorno (detalle)

Plantilla versionada: [`.env.example`](./.env.example). Resumen:

| Variable | Build Docker | Run (runtime) | Uso |
|----------|----------------|---------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí (obligatoria) | Opcional duplicado | Cliente y servidor. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí (obligatoria) | Opcional duplicado | Cliente y servidor. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Sí si usas esas rutas | OAuth callback, admin, push con privilegios. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No* | Sí si usas push | API push. |
| `VAPID_PRIVATE_KEY` | No | Sí | API push. |
| `PUSH_WEBHOOK_SECRET` | No | Sí | API push. |

\*Solo haría falta en build si algún componente **cliente** importara esa variable; en este proyecto el uso principal es en rutas API.

### Supabase y dominio de producción (HTTPS)

Cuando la app tenga una **URL pública definitiva** (por ejemplo `https://<subdominio>.uninorte.edu.co` u otra que defina el hosting):

1. **Supabase Dashboard** → **Authentication** → **URL configuration**:
   - **Site URL:** la URL canónica pública (HTTPS).
   - **Redirect URLs:** incluye patrones que cubran la app, por ejemplo:
     - `https://<subdominio>.uninorte.edu.co/**`
     - `https://<subdominio>.uninorte.edu.co/auth/callback` (callback OAuth / magic link de este proyecto).
   - Si existen variantes (`www`, otro host), añádelas explícitamente.
2. Si cambias de **proyecto** Supabase (otro dominio de proyecto / storage), revisa `images.remotePatterns` en [`next.config.ts`](./next.config.ts) para que coincida el hostname de imágenes.
3. **Secretos:** nunca en Git; solo `.env.example`. El `.env` real va en el servidor (archivo no versionado, secret store del orquestador, etc.).

### Verificación sugerida (Docker)

1. `docker build` con los `--build-arg` correctos.
2. `docker run` o `docker compose up` con `--env-file` / `.env` que incluya `SUPABASE_SERVICE_ROLE_KEY` si pruebas login admin u OAuth.
3. Abrir la URL mapeada, comprobar home y flujo de auth sin errores de redirect.

## 🐛 Troubleshooting

### "Could not find the table 'public.olympics_jugadores'"

→ Ejecuta `db_setup.sql` en Supabase SQL Editor

### "Invalid API key"

→ Verifica que `.env.local` tenga las credenciales correctas

### El cronómetro no avanza

→ Asegúrate de que `marcador_detalle` contenga `ultimo_update` (revisa que hayas guardado cambios en admin)

### Docker / Compose no arranca o el build no ve `NEXT_PUBLIC_*`

→ Comprueba que exista `.env` en la raíz con esas variables (Compose las pasa como `build.args`). Para `docker build` manual, usa `--build-arg` como en la sección anterior.

## 📝 Tareas Futuras

- [ ] Tabla de posiciones automática
- [ ] Estadísticas de jugadores
- [ ] Sistema de notificaciones
- [ ] Exportar resultados a PDF
- [ ] Modo oscuro/claro toggle

## 👥 Equipo

- **Desarrollador Principal**: [Tu Nombre]
- **Colaboradores**: [Nombres de tu equipo]

## 📄 Licencia

MIT License - Proyecto educativo

---

**¿Preguntas?** Abre un issue en GitHub o contacta al equipo.
