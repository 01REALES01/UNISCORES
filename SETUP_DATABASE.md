# 🗄️ Configuración de Base de Datos - Supabase

Esta guía te ayudará a configurar la base de datos de Supabase para el proyecto Olympics.

## 📋 Prerequisitos

1. Crea una cuenta en [Supabase](https://supabase.com) (es gratis)
2. Crea un nuevo proyecto:
   - Nombre: `olympics-project` (o el que prefieras)
   - Database Password: **Guárdalo en un lugar seguro**
   - Region: Elige la más cercana a tu ubicación

## 🔧 Pasos de Configuración

### 1️⃣ Ejecutar Scripts SQL

Ve a tu proyecto de Supabase → **SQL Editor** (icono de base de datos en el menú lateral)

#### Script 1: Schema Principal

1. Crea una nueva Query
2. Copia y pega el contenido de `supabase/schema.sql`
3. Click en **"Run"** o presiona `Ctrl/Cmd + Enter`

Este script crea:

- ✅ Tabla `disciplinas` (deportes disponibles)
- ✅ Tabla `partidos` (matches)
- ✅ Políticas RLS (Row Level Security)
- ✅ Datos iniciales (deportes predefinidos)

#### Script 2: Tablas Auxiliares

1. Crea otra nueva Query
2. Copia y pega el contenido de `db_setup.sql`
3. Click en **"Run"**

Este script crea:

- ✅ Tabla `olympics_jugadores` (players)
- ✅ Tabla `olympics_eventos` (events: goals, cards, etc.)
- ✅ Políticas RLS básicas

### 2️⃣ Verificar que Todo Funcione

Ve a **Table Editor** en Supabase y verifica que existan:

- `disciplinas` (debería tener 5 registros: Fútbol, Baloncesto, etc.)
- `partidos` (vacía por ahora)
- `olympics_jugadores` (vacía)
- `olympics_eventos` (vacía)

### 3️⃣ Configurar Realtime

1. Ve a **Database** → **Replication**
2. Asegúrate de que las siguientes tablas tengan **Realtime activado**:
   - ✅ `partidos`
   - ✅ `olympics_eventos`
   - ✅ `olympics_jugadores`

Si no está activado:

- Click en la tabla
- Toggle "Enable Realtime"

### 4️⃣ Obtener Credenciales

1. Ve a **Settings** → **API**
2. Copia estos valores:

```
Project URL: https://xxxxxxxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJl...
```

1. Pégalos en tu archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 👤 Crear Usuario Administrador

### Opción 1: Desde Supabase Dashboard

1. Ve a **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Completa:
   - Email: `admin@olympics.com`
   - Password: Elige una contraseña segura
   - **Auto Confirm User**: ✅ Activar (importante)
4. Click **"Create user"**

### Opción 2: Desde SQL Editor

```sql
-- Ejecuta este SQL en Supabase
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'admin@olympics.com',
  crypt('TuPasswordSeguro123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

## 🔐 Seguridad (Row Level Security - RLS)

Las políticas RLS ya están configuradas en los scripts SQL.

**Resumen de permisos:**

| Tabla | Lectura Pública | Escritura | Admin |
|-------|----------------|-----------|-------|
| `disciplinas` | ✅ | ❌ | ✅ |
| `partidos` | ✅ | ❌ | ✅ (autenticado) |
| `olympics_jugadores` | ✅ | ❌ | ✅ |
| `olympics_eventos` | ✅ | ❌ | ✅ |

Esto significa:

- **Todos** pueden ver los datos (para la vista pública)
- Solo **usuarios autenticados** (admin) pueden crear/modificar

## 🧪 Probar la Conexión

Después de configurar todo:

1. Ejecuta el proyecto localmente: `npm run dev`
2. Ve a `http://localhost:3000`
3. Si ves la página principal sin errores → ✅ **Conexión exitosa**
4. Si hay error de conexión → Revisa las credenciales en `.env.local`

## 🔄 Para Colaboradores del Equipo

### Opción A: Compartir el Mismo Proyecto de Supabase

**Ventajas**: Una sola base de datos, todos ven los mismos datos.

1. El líder del proyecto comparte:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Todos crean su propio `.env.local` con esos valores
3. **IMPORTANTE**: Solo una persona ejecuta los scripts SQL (la primera vez)

### Opción B: Cada Uno con su Propio Proyecto

**Ventajas**: Desarrollo independiente, sin conflictos.

1. Cada miembro crea su propio proyecto en Supabase
2. Cada uno ejecuta los scripts SQL en su proyecto
3. Cada uno usa sus propias credenciales en `.env.local`

**Recomendación**: Opción A para producción, Opción B para desarrollo individual.

## ❗ Troubleshooting

### Error: "relation 'olympics_jugadores' does not exist"

**Solución**: Ejecuta `db_setup.sql` en SQL Editor

### Error: "new row violates row-level security policy"

**Solución**: Asegúrate de estar logueado como admin en `/admin/login`

### Error: "JWT expired" o "Invalid API key"

**Solución**:

1. Ve a Supabase → Settings → API
2. Copia nuevamente las credenciales
3. Actualiza `.env.local`
4. Reinicia el servidor (`npm run dev`)

### Las actualizaciones en tiempo real no funcionan

**Solución**: Activa Realtime en Database → Replication para todas las tablas

## 📊 Schema Visual

```
┌─────────────────┐
│   disciplinas   │
│  (Deportes)     │
└────────┬────────┘
         │
         │ FK: disciplina_id
         │
┌────────▼────────┐      ┌──────────────────┐
│    partidos     │◄─────┤ olympics_eventos │
│   (Matches)     │      │    (Events)      │
└────────┬────────┘      └──────────────────┘
         │
         │ FK: partido_id
         │
┌────────▼─────────────┐
│ olympics_jugadores   │
│     (Players)        │
└──────────────────────┘
```

## 🎓 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

**¿Problemas?** Contacta al equipo o abre un issue en GitHub.
