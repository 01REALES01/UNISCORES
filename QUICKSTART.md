# 🚀 Guía Rápida - Inicio para Nuevos Miembros

¡Bienvenido al equipo del proyecto Olympics! Esta guía te ayudará a estar listo en **menos de 10 minutos**.

## ✅ Checklist de Configuración

### 1️⃣ Prerrequisitos (2 min)

Asegúrate de tener instalado:

- [ ] Node.js 18+ ([Descargar](https://nodejs.org/))
- [ ] Git ([Descargar](https://git-scm.com/))
- [ ] Un editor de código (VS Code recomendado)

### 2️⃣ Clonar el Proyecto (1 min)

```bash
git clone https://github.com/01REALES01/project_olympics.git
cd project_olympics
```

### 3️⃣ Instalar Dependencias (2 min)

```bash
npm install
```

⏳ Esto puede tardar un par de minutos...

### 4️⃣ Configurar Variables de Entorno (2 min)

**📱 Contacta al líder del equipo** y pídele:

- URL de Supabase
- API Key de Supabase
- Credenciales de Admin (email y password)

Luego:

1. Duplica el archivo `.env.local.example` y renómbralo a `.env.local`
2. Pega las credenciales que te dieron:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5️⃣ Ejecutar el Proyecto (1 min)

```bash
npm run dev
```

Deberías ver algo como:

```
✓ Ready in 2s
○ Local:        http://localhost:3000
```

### 6️⃣ Probar que Funcione (1 min)

1. Abre [http://localhost:3000](http://localhost:3000)
2. Deberías ver la página principal del proyecto
3. Ve a [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
4. Ingresa con las credenciales de admin que te dio el líder
5. Si entras al panel → ✅ **¡Todo funciona!**

---

## 🎯 ¿Qué Hacer Ahora?

### Explora el Proyecto

**Vista Pública**:

- `/` - Página principal con partidos en vivo
- `/partido/[id]` - Detalle de un partido específico

**Panel Admin** (requiere login):

- `/admin/partidos` - Lista de todos los partidos
- `/admin/partidos/[id]` - Control de un partido específico

### Lee la Documentación

- `README.md` - Documentación general del proyecto
- `SETUP_DATABASE.md` - Detalles sobre la base de datos
- `CONTRIBUTING.md` - Flujo de trabajo y convenciones de Git

### Únete a la Comunicación del Equipo

Pregunta al líder por:

- [ ] Canal de Slack/Discord/WhatsApp del equipo
- [ ] Link al tablero de tareas (Trello, Notion, etc.)
- [ ] Siguiente reunión de equipo

---

## 🐛 Problemas Comunes

### Error: "Cannot find module 'next'"

**Solución**: Ejecuta `npm install` de nuevo

### Error: "Invalid API key"

**Solución**: Verifica que `.env.local` tenga las credenciales correctas (pídelas al líder)

### El sitio muestra error de conexión

**Solución**:

1. Confirma que copiaste bien las credenciales
2. Reinicia el servidor: Ctrl+C, luego `npm run dev`

### No veo datos/partidos

**Solución**: Normal si no hay partidos creados aún. Ve al admin y crea uno de prueba.

---

## 📞 Necesitas Ayuda?

1. **Revisa la documentación completa** en `README.md`
2. **Pregunta en el chat del equipo**
3. **Contacta al líder del proyecto**

---

## 🎉 ¡Listo para Contribuir

Ahora que todo funciona, lee `CONTRIBUTING.md` para aprender:

- Cómo crear ramas
- Convenciones de commits
- Flujo de Pull Requests

**¡Bienvenido al equipo! 🚀**
