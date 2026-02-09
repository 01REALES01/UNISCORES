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

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime + Auth)
- **Deployment**: Vercel (recomendado)

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn/pnpm
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

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
```

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

Abre [http://localhost:3000](http://localhost:3000)

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
└── .env.local.example         # Plantilla de variables de entorno
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

### Para nuevos desarrolladores:

1. Clona el repo
2. Sigue los pasos de "Configuración Inicial"
3. **NO compartas** tu `.env.local` (cada uno usa sus propias credenciales de Supabase)
4. Si todos usan el mismo proyecto de Supabase, compartan la URL y Key del proyecto

### Recomendación:
- **Desarrollo**: Cada miembro puede usar su propio proyecto de Supabase (gratuito)
- **Producción**: Un solo proyecto de Supabase compartido

## 🚢 Deployment (Vercel)

1. Sube el código a GitHub
2. Ve a [Vercel](https://vercel.com) → `Import Project`
3. Conecta tu repo de GitHub
4. Agrega las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy 🚀

## 🐛 Troubleshooting

### "Could not find the table 'public.olympics_jugadores'"
→ Ejecuta `db_setup.sql` en Supabase SQL Editor

### "Invalid API key"
→ Verifica que `.env.local` tenga las credenciales correctas

### El cronómetro no avanza
→ Asegúrate de que `marcador_detalle` contenga `ultimo_update` (revisa que hayas guardado cambios en admin)

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
