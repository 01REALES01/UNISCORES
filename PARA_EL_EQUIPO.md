# 🏆 INFORMACIÓN COMPLETA DEL PROYECTO OLYMPICS - PARA EL EQUIPO

¡Bienvenidos al proyecto! Aquí tienen toda la información que necesitan para empezar a trabajar.

---

## 📦 PASO 1: CLONAR E INSTALAR (5 minutos)

### Clonar el repositorio

```bash
git clone https://github.com/01REALES01/project_olympics.git
cd project_olympics
npm install
```

Esperen a que se instalen todas las dependencias (puede tardar 2-3 minutos).

---

## 🔐 PASO 2: CONFIGURAR CREDENCIALES

### A. Crear archivo `.env.local`

En la raíz del proyecto, creen un archivo llamado `.env.local` con este contenido:

```env
NEXT_PUBLIC_SUPABASE_URL=[PEGA AQUÍ LA URL QUE TE DOY ABAJO]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PEGA AQUÍ LA KEY QUE TE DOY ABAJO]
```

### B. Credenciales de Supabase (Copiar y Pegar)

**⚠️ IMPORTANTE: Estas credenciales son PRIVADAS, no las compartan fuera del equipo**

```
URL de Supabase:
https://uhsslexvmoecwvcjiwit.supabase.co

API Key (Anon/Public):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoc3NsZXh2bW9lY3d2Y2ppd2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzEyNDgsImV4cCI6MjA4NTc0NzI0OH0.BrG3JYlWDmyJ0YLEhPLx3B2E9m8Xz16qLLidLEtuN5w
```

**¿Dónde encontrar estas credenciales?**
El líder del proyecto las tiene. Si eres el líder:

1. Ve a <https://supabase.com/dashboard>
2. Selecciona tu proyecto
3. Settings → API
4. Copia "Project URL" y "anon public" key

### C. Credenciales de Administrador

Para acceder al panel de admin (`http://localhost:3000/admin/login`):

```
Email: admin@uninorte.edu.co
Password: admin123!
```

---

## 🚀 PASO 3: EJECUTAR EL PROYECTO

```bash
npm run dev
```

Luego abran: **<http://localhost:3000>**

Si ven la página principal → ✅ ¡Todo funciona!

---

## 📂 ESTRUCTURA DEL PROYECTO

```
project_olympics/
├── src/
│   ├── app/                      # Páginas de Next.js
│   │   ├── page.tsx             # Página principal (pública)
│   │   ├── partido/[id]/        # Detalle de partido (público)
│   │   └── admin/               # Panel de administración
│   │       ├── login/           # Login de admin
│   │       └── (dashboard)/     # Dashboard principal
│   ├── components/              # Componentes reutilizables
│   │   ├── ui-primitives.tsx   # Componentes UI base
│   │   ├── public-live-timer.tsx
│   │   └── create-match-modal.tsx
│   ├── lib/
│   │   └── supabase.ts         # Cliente de Supabase
│   └── middleware.ts            # Protección de rutas
├── supabase/
│   ├── schema.sql              # Schema principal de DB
│   └── auth_setup.sql          # Configuración de auth
└── db_setup.sql                # Tablas auxiliares
```

---

## 🎮 FUNCIONALIDADES DEL PROYECTO

### Vista Pública

- `/` - Ver partidos en vivo y programados
- `/partido/[id]` - Ver detalles de un partido en tiempo real

### Panel Admin (requiere login)

- `/admin/login` - Iniciar sesión
- `/admin/partidos` - Lista y creación de partidos
- `/admin/partidos/[id]` - Control total del partido:
  - ⏱️ Cronómetro (iniciar/pausar/finalizar)
  - ⚽ Registrar eventos (goles, tarjetas, puntos)
  - 👥 Agregar jugadores sobre la marcha
  - 📊 Ver historial de eventos

### Deportes Soportados

- ⚽ Fútbol (Goles)
- 🏀 Baloncesto (Puntos +1, +2, +3)
- 🏐 Voleibol (Puntos)
- 🎾 Tenis (Puntos)
- 🏓 Tenis de Mesa (Puntos)

---

## 🔄 FLUJO DE TRABAJO CON GIT

### Antes de empezar una nueva tarea

```bash
# Actualizar main
git checkout main
git pull origin main

# Crear nueva rama para tu feature
git checkout -b feature/nombre-de-tu-tarea
```

### Mientras trabajas

```bash
# Ver cambios
git status

# Agregar cambios
git add .

# Hacer commit (mensaje descriptivo)
git commit -m "feat: descripción de lo que hiciste"
```

### Cuando termines

```bash
# Subir tu rama
git push origin feature/nombre-de-tu-tarea
```

Luego en GitHub:

1. Ve al repositorio
2. Verás un botón "Compare & pull request"
3. Crea el Pull Request
4. Espera revisión del equipo
5. Haz merge cuando sea aprobado

---

## 📝 CONVENCIONES DE COMMITS

Usa estos prefijos para commits claros:

- `feat:` Nueva funcionalidad
  - Ejemplo: `feat: add basketball scoring system`
- `fix:` Corrección de bugs
  - Ejemplo: `fix: timer synchronization issue`
- `style:` Cambios de UI/CSS
  - Ejemplo: `style: improve match card design`
- `refactor:` Refactorización de código
  - Ejemplo: `refactor: simplify event registration`
- `docs:` Documentación
  - Ejemplo: `docs: update README`

---

## 📚 DOCUMENTACIÓN DISPONIBLE

Lean estos archivos para más información:

1. **QUICKSTART.md** - Guía rápida de inicio (¡léanlo primero!)
2. **README.md** - Documentación completa del proyecto
3. **SETUP_DATABASE.md** - Detalles sobre Supabase
4. **CONTRIBUTING.md** - Flujo de trabajo y convenciones

---

## 🧪 CÓMO PROBAR QUE TODO FUNCIONA

### 1. Vista Pública

```bash
# Con el servidor corriendo (npm run dev)
http://localhost:3000
```

Deberías ver la página principal (puede estar vacía si no hay partidos)

### 2. Panel Admin

```bash
http://localhost:3000/admin/login
```

Ingresa con las credenciales de admin → Deberías entrar al dashboard

### 3. Crear un Partido de Prueba

1. Login como admin
2. Click en "Crear Partido"
3. Llena el formulario (ej: Fútbol, Equipo A vs Equipo B)
4. Guarda
5. Haz click en el partido → Deberías ver el panel de control

### 4. Tiempo Real

1. Abre dos ventanas del navegador
2. Ventana 1: Panel admin (`/admin/partidos/[id]`)
3. Ventana 2: Vista pública (`/partido/[id]`)
4. En admin, inicia el cronómetro o agrega un evento
5. En la vista pública deberías ver los cambios instantáneamente ✨

---

## 🐛 PROBLEMAS COMUNES

### "Cannot find module"

**Solución**: `npm install`

### "Invalid API key"

**Solución**: Verifica que `.env.local` tenga las credenciales correctas

### No veo cambios en tiempo real

**Solución**:

1. Verifica que Realtime esté activado en Supabase (Settings → Replication)
2. Recarga la página

### Error al hacer login como admin

**Solución**: Confirma las credenciales con el líder del proyecto

---

## 🎯 PRIMERAS TAREAS SUGERIDAS

Para familiarizarse con el proyecto:

1. **Explorar el código**: Navega por `src/app/` y `src/components/`
2. **Crear un partido de prueba**: Via panel admin
3. **Revisar componentes UI**: Abre `src/components/ui-primitives.tsx`
4. **Probar tiempo real**: Simula un partido en vivo

### Ideas de Features para Desarrollar

- [ ] Tabla de posiciones automática
- [ ] Estadísticas de jugadores
- [ ] Modo oscuro/claro
- [ ] Exportar resultados a PDF
- [ ] Notificaciones push
- [ ] Responsive design mejorado
- [ ] Sistema de comentarios en vivo
- [ ] Galería de fotos del partido

---

## 👥 COMUNICACIÓN DEL EQUIPO

### Canales Recomendados

- **GitHub Issues**: Para bugs y features
- **Pull Requests**: Para revisión de código
- **[Slack/Discord/WhatsApp]**: Chat diario del equipo

### Daily Sync (Opcional)

Cada día, compartan brevemente:

1. ¿Qué hice ayer?
2. ¿Qué haré hoy?
3. ¿Algún bloqueador?

---

## 🚢 DEPLOYMENT (Producción)

Cuando estén listos para publicar:

1. Ve a [Vercel](https://vercel.com)
2. Conecta el repo de GitHub
3. Agrega las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy automático 🚀

---

## ⚠️ REGLAS IMPORTANTES

❌ **NO HACER**:

- Hacer commit directo a `main`
- Subir archivos `.env.local` a GitHub
- Compartir credenciales públicamente
- Commits con mensajes vagos ("fix", "changes")

✅ **SÍ HACER**:

- Crear ramas para cada feature
- Escribir commits descriptivos
- Hacer Pull Requests para revisión
- Comunicarse con el equipo
- Probar antes de hacer push

---

## 📞 ¿NECESITAS AYUDA?

1. Revisa la documentación en los archivos `.md`
2. Pregunta en el chat del equipo
3. Abre un Issue en GitHub
4. Contacta al líder del proyecto

---

## 🎉 ¡BIENVENIDOS AL EQUIPO

Estamos construyendo algo increíble. ¡A codear! 💪🚀

**Proyecto**: Olympics Management System  
**Repositorio**: <https://github.com/01REALES01/project_olympics.git>  
**Stack**: Next.js 15 + Supabase + TypeScript + Tailwind CSS  

---

**Última actualización**: 9 de Febrero 2026  
**Mantenedor**: Jean Paul Reales
