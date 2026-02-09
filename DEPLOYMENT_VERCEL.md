# 🚀 Guía Completa: Desplegar a Vercel

## 🌐 ¿Qué es Vercel y Por Qué Usarlo?

**Vercel** es la plataforma de deployment **creada por el equipo de Next.js**. Es la mejor opción para tu proyecto porque:

- ✅ **Gratis** para proyectos personales y educativos
- ✅ **Súper rápido** (CDN global)
- ✅ **Deployment automático** cada vez que haces push a GitHub
- ✅ **HTTPS gratis** (seguridad)
- ✅ **Dominio gratis**: `tu-proyecto.vercel.app`
- ✅ **Optimizado para Next.js** (cero configuración)

---

## 📋 Paso a Paso: Desplegar tu Proyecto

### 1️⃣ Crear Cuenta en Vercel (2 minutos)

1. Ve a: <https://vercel.com/signup>
2. Click en **"Continue with GitHub"**
3. Autoriza a Vercel para acceder a tu GitHub
4. ¡Listo! Ya tienes cuenta

---

### 2️⃣ Importar tu Proyecto (3 minutos)

1. **En Vercel Dashboard**, click en **"Add New..."** → **"Project"**

2. **Conecta tu repositorio**:
   - Verás una lista de tus repos de GitHub
   - Busca: `project_olympics`
   - Click en **"Import"**

3. **Configura el proyecto**:

   ```
   Project Name: project-olympics (o el que prefieras)
   Framework Preset: Next.js (detectado automáticamente)
   Root Directory: ./ (dejar por defecto)
   ```

4. **NO hagas click en "Deploy" todavía** ⚠️
   (Primero debemos agregar las variables de entorno)

---

### 3️⃣ Configurar Variables de Entorno (5 minutos) ⭐ IMPORTANTE

Antes de desplegar, debes agregar tus credenciales de Supabase:

1. **En la página de configuración del proyecto en Vercel**, busca la sección:

   ```
   Environment Variables
   ```

2. **Agrega estas dos variables**:

   **Primera variable:**

   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://uhsslexvmoecwvcjiwit.supabase.co
   Environment: Production, Preview, Development (marca todas)
   ```

   Click **"Add"**

   **Segunda variable:**

   ```
   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoc3NsZXh2bW9lY3d2Y2ppd2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzEyNDgsImV4cCI6MjA4NTc0NzI0OH0.BrG3JYlWDmyJ0YLEhPLx3B2E9m8Xz16qLLidLEtuN5w
   Environment: Production, Preview, Development (marca todas)
   ```

   Click **"Add"**

3. **Verifica que aparezcan las dos variables** en la lista

---

### 4️⃣ Desplegar (1 minuto)

1. Click en el botón **"Deploy"**

2. **Espera** (1-2 minutos):

   ```
   Building...
   ████████████████████ 100%
   
   Deploying...
   ████████████████████ 100%
   
   ✓ Build Completed
   ✓ Deployment Complete
   ```

3. **¡Listo!** Verás un mensaje de éxito con confetti 🎉

---

### 5️⃣ Ver tu Proyecto en Vivo (¡Ya!)

Vercel te dará una URL como:

```
https://project-olympics.vercel.app
```

**Click en esa URL** y verás tu proyecto funcionando en internet! 🌐

---

## 🔗 URLs que Obtienes

Vercel te da **3 tipos de URLs**:

1. **Production** (principal):

   ```
   https://project-olympics.vercel.app
   ```

   Esta es la que compartes con el mundo

2. **Preview** (cada rama):

   ```
   https://project-olympics-git-feature-xyz.vercel.app
   ```

   Cada vez que alguien hace un PR, Vercel crea una URL de preview

3. **Development** (opcional):
   Para desarrollo local conectado a Vercel

---

## 🔄 Deployment Automático (La Magia)

**Cada vez que alguien del equipo haga push a GitHub**, Vercel automáticamente:

1. ✅ Detecta los cambios
2. ✅ Hace build del proyecto
3. ✅ Despliega la nueva versión
4. ✅ Actualiza la URL

**Ejemplo de flujo**:

```bash
# Tu compañero hace cambios
git add .
git commit -m "feat: add new feature"
git push origin main

# 2 minutos después...
# ¡Nueva versión live automáticamente! 🚀
```

---

## 🎯 Compartir con el Mundo

Una vez desplegado, puedes:

### Opción 1: Dominio de Vercel (Gratis)

```
https://project-olympics.vercel.app
```

Comparte este link directamente

### Opción 2: Dominio Custom (Opcional)

Si tienes un dominio propio (`olympics.tuescuela.com`):

1. Ve a Project Settings → Domains
2. Click "Add"
3. Ingresa tu dominio
4. Sigue las instrucciones de DNS
5. ¡Listo! Tu proyecto en tu dominio

---

## 📊 Dashboard de Vercel

En tu dashboard verás:

**Analytics** (Gratis):

- 📈 Visitas
- 🌍 Países de tus usuarios
- ⚡ Performance

**Deployments**:

- Lista de todos los deployments
- Logs de build
- Errores (si los hay)

**Settings**:

- Variables de entorno
- Dominios
- Integraciones

---

## 🐛 Troubleshooting

### Error: "Build Failed"

**Solución**: Verifica que el proyecto compile localmente:

```bash
npm run build
```

Si funciona local, el problema puede ser:

- Variables de entorno faltantes
- Dependencias incorrectas

### Error: "Cannot connect to Supabase"

**Solución**:

1. Verifica las variables de entorno en Vercel
2. Asegúrate de que sean exactamente iguales a tu `.env.local`
3. Redeploy el proyecto

### La página carga pero muestra errores

**Solución**:

1. Ve a Vercel Dashboard → tu proyecto → "Deployments"
2. Click en el deployment actual
3. Ve a la pestaña "Runtime Logs"
4. Busca errores en rojo

---

## 🔐 Seguridad en Producción

### Supabase RLS (Row Level Security)

**IMPORTANTE**: Asegúrate de que tus políticas RLS en Supabase estén configuradas correctamente.

Si no lo están, cualquiera podría modificar tu base de datos.

**Verifica**:

1. Ve a Supabase → Authentication → Policies
2. Asegúrate de que solo usuarios autenticados puedan modificar datos
3. Los datos públicos deben ser de solo lectura

### URLs Permitidas en Supabase

1. Ve a: <https://supabase.com/dashboard/project/uhsslexvmoecwvcjiwit/auth/url-configuration>

2. Agrega tu URL de Vercel en **"Site URL"**:

   ```
   https://project-olympics.vercel.app
   ```

3. Agrega también en **"Redirect URLs"**:

   ```
   https://project-olympics.vercel.app/**
   ```

---

## 📱 Responsive & Performance

Vercel automáticamente:

- ✅ Optimiza imágenes
- ✅ Minifica CSS/JS
- ✅ Habilita GZIP/Brotli
- ✅ CDN global (tu sitio carga rápido en todo el mundo)
- ✅ HTTPS automático

---

## 👥 Compartir con tu Equipo

### Agregar Colaboradores en Vercel

1. Ve a Project Settings → Team
2. Click "Invite"
3. Ingresa el email de tu compañero
4. Rol: "Member" o "Viewer"

**Esto les permite**:

- Ver deployments
- Ver analytics
- Hacer rollback a versiones anteriores

---

## 🎓 Para tu Profesor/Presentación

Cuando presentes el proyecto:

```
🌐 URL del Proyecto:
https://project-olympics.vercel.app

👨‍💼 Panel Admin:
https://project-olympics.vercel.app/admin/login

Email: admin@uninorte.edu.co
Password: admin123!

📱 Vista Pública:
https://project-olympics.vercel.app
(crear un partido en vivo para demostración)
```

---

## 💡 Tips Pro

### 1. Preview Deployments

Cada Pull Request crea una preview automática:

- Perfecto para **revisar cambios** antes de mergear
- URL única para cada PR
- Se borra automáticamente al mergear

### 2. Rollback Instantáneo

¿Algo salió mal? En Vercel:

1. Ve a "Deployments"
2. Busca la versión anterior que funcionaba
3. Click en "..." → "Promote to Production"
4. ¡Listo! Volviste a la versión anterior en segundos

### 3. Logs en Tiempo Real

```
Vercel Dashboard → Functions → Runtime Logs
```

Ve errores en tiempo real mientras los usuarios usan tu app

---

## 📊 Resumen: Local vs Vercel

| Característica | Local (localhost:3000) | Vercel (Producción) |
|---------------|------------------------|---------------------|
| Acceso | Solo tú | Todo el mundo 🌍 |
| URL | localhost:3000 | project-olympics.vercel.app |
| HTTPS | ❌ | ✅ |
| Performance | Depende de tu PC | CDN Global ⚡ |
| Deployment | Manual (npm run dev) | Automático 🚀 |
| Costo | Gratis | Gratis ✅ |

---

## ✅ Checklist de Deployment

Antes de desplegar:

- [ ] Proyecto funciona localmente (`npm run build` exitoso)
- [ ] Variables de entorno configuradas en Vercel
- [ ] RLS habilitado en Supabase
- [ ] URL de Vercel agregada en Supabase Auth

Después de desplegar:

- [ ] Probaste la URL de producción
- [ ] Login de admin funciona
- [ ] Creaste un partido de prueba
- [ ] Verificaste que tiempo real funcione
- [ ] Compartiste la URL con el equipo

---

## 🎉 ¡Listo

Tu proyecto ahora está:

- ✅ En vivo en internet
- ✅ Con HTTPS seguro
- ✅ Deployment automático
- ✅ Performance optimizada
- ✅ Listo para mostrar al mundo

**URL de tu proyecto**:

```
https://project-olympics.vercel.app
(aparecerá después de desplegar)
```

---

## 📞 ¿Problemas?

- **Documentación de Vercel**: <https://vercel.com/docs>
- **Soporte de Vercel**: Chat en vivo en el dashboard
- **Comunidad**: Discord de Vercel

---

**¡Felicidades! Tu proyecto ya está en producción.** 🚀🎉

**Fecha de creación**: 9 de Febrero 2026
