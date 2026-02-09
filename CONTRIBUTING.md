# 🤝 Guía de Colaboración para el Equipo

## 🚀 Primeros Pasos (Para Nuevos Miembros)

### 1. Clonar el Repositorio

```bash
git clone <URL_DEL_REPO>
cd project_olympics
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

**Opción A: Usar el Proyecto de Supabase del Equipo (Recomendado)**

1. Pídele al líder del equipo las credenciales de Supabase
2. Crea `.env.local` basándote en `.env.local.example`
3. Pega las credenciales compartidas

**Opción B: Crear tu Propio Proyecto de Supabase (Para desarrollo local)**

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un proyecto nuevo
3. Sigue las instrucciones en `SETUP_DATABASE.md`
4. Usa tus propias credenciales en `.env.local`

### 4. Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📝 Flujo de Trabajo con Git

### Antes de Empezar a Trabajar

```bash
# Asegúrate de estar en main y actualizado
git checkout main
git pull origin main

# Crea una nueva rama para tu feature
git checkout -b feature/nombre-de-tu-feature
```

### Mientras Trabajas

```bash
# Ver qué archivos cambiaste
git status

# Agregar cambios
git add .

# Hacer commit (mensajes claros y descriptivos)
git commit -m "feat: descripción de lo que hiciste"
```

### Cuando Termines tu Feature

```bash
# Subir tu rama a GitHub
git push origin feature/nombre-de-tu-feature
```

Luego en GitHub:

1. Ve al repositorio
2. Verás un botón "Compare & pull request"
3. Crea un **Pull Request (PR)**
4. Espera revisión del equipo
5. Haz merge cuando sea aprobado

---

## 📋 Convención de Commits

Usa estos prefijos para commits claros:

- `feat:` Nueva funcionalidad
  - Ejemplo: `feat: add basketball scoring system`
- `fix:` Corrección de bugs
  - Ejemplo: `fix: timer synchronization issue`
- `style:` Cambios de UI/CSS (sin lógica)
  - Ejemplo: `style: improve match card design`
- `refactor:` Refactorización de código
  - Ejemplo: `refactor: simplify event registration logic`
- `docs:` Cambios en documentación
  - Ejemplo: `docs: update README with deployment steps`
- `test:` Agregar o modificar tests
  - Ejemplo: `test: add unit tests for timer component`

---

## 🌿 Estructura de Ramas

```
main (producción)
  ├── develop (desarrollo)
  │   ├── feature/basketball-stats
  │   ├── feature/notifications
  │   └── fix/timer-bug
```

**Reglas:**

- ✅ `main` siempre debe funcionar (producción)
- ✅ `develop` es para integrar features antes de ir a `main`
- ✅ Crea ramas `feature/*` desde `develop`
- ✅ Crea ramas `fix/*` para bugs urgentes

---

## 🔍 División de Tareas (Ejemplo)

### Frontend

- **Persona 1**: Estadísticas de jugadores
- **Persona 2**: Tabla de posiciones
- **Persona 3**: Sistema de notificaciones

### Backend/DB

- **Persona 4**: Optimizar queries de Supabase
- **Persona 5**: Agregar más validaciones RLS

### UI/UX

- **Persona 6**: Responsive design mobile
- **Persona 7**: Modo oscuro/claro

---

## 🐛 Resolución de Conflictos

Si al hacer `git pull` hay conflictos:

```bash
# Git marcará los archivos con conflictos
# Ábrelos y busca estas marcas:

<<<<<<< HEAD
Tu código
=======
Código del otro
>>>>>>> branch-name

# Decide qué código mantener, elimina las marcas
# Luego:

git add .
git commit -m "fix: resolve merge conflicts"
```

---

## 📞 Comunicación del Equipo

### Daily Standup (Opcional pero recomendado)

Cada día, comparte brevemente:

1. ¿Qué hice ayer?
2. ¿Qué haré hoy?
3. ¿Tengo algún bloqueador?

### Code Reviews

Al revisar un Pull Request:

- ✅ Verifica que el código funcione
- ✅ Sugiere mejoras con respeto
- ✅ Aprueba o pide cambios

---

## 🚫 Qué NO Hacer

- ❌ **NO** hagas commit directo a `main`
- ❌ **NO** subas archivos `.env.local` a GitHub
- ❌ **NO** hagas commits con mensajes vagos ("fix", "changes", "update")
- ❌ **NO** trabajes días sin sincronizar con el equipo
- ❌ **NO** hagas push de `node_modules/`

---

## ✅ Checklist Antes de Hacer Push

- [ ] El código compila sin errores
- [ ] Probé localmente que funciona
- [ ] No hay `console.log()` innecesarios
- [ ] Mi commit tiene un mensaje descriptivo
- [ ] No estoy subiendo archivos sensibles

---

## 🆘 Ayuda

**¿Problemas?**

1. Pregunta en el chat del equipo
2. Revisa la documentación (`README.md`, `SETUP_DATABASE.md`)
3. Busca en GitHub Issues si alguien ya lo reportó
4. Crea un nuevo Issue con detalles del problema

---

**¡A construir algo increíble juntos! 🚀**
