# Despliegue en OpenLab (UniNorte) y entrega al profesor

Guía breve para servir la app detrás del dominio `.uninorte.edu.co` con Docker y Supabase.

## Checklist Supabase (dominio de producción)

Antes o justo después de publicar la URL final:

1. En **Supabase Dashboard** → **Authentication** → **URL configuration**:
   - **Site URL:** `https://<subdominio>.uninorte.edu.co` (la URL canónica que verán los usuarios).
   - **Redirect URLs:** incluye al menos:
     - `https://<subdominio>.uninorte.edu.co/**`
     - `https://<subdominio>.uninorte.edu.co/auth/callback` (o la ruta exacta de callback OAuth que use el proyecto).
   - Si OpenLab expone también una variante (por ejemplo `www`), añádela explícitamente.

2. Si cambias de **proyecto** de Supabase (otra URL u otro bucket de imágenes), revisa `images.remotePatterns` en `next.config.ts` para el hostname de almacenamiento/imágenes.

3. No subas claves al repositorio: solo [`.env.example`](../.env.example) con placeholders. El archivo `.env` con valores reales va por **canal privado** al profesor o a la máquina de despliegue.

## Docker y OpenLab

- El contenedor documentado escucha **3000** por defecto (`PORT`). El proxy de OpenLab debe enrutar el tráfico HTTPS al proceso Docker en el puerto acordado (típicamente `host:3000` → contenedor `3000`).
- Reconstruye la imagen si cambias `NEXT_PUBLIC_*` (van al bundle en `docker build`).

## Plantilla de correo al profesor

Puedes copiar y completar los campos entre `<…>`.

**Asunto:** Despliegue Docker + OpenLab — Proyecto Olympics (puerto y variables)

**Cuerpo:**

Hola profe `<Nombre>`,

Le escribo para coordinar el despliegue de **Olympics** (Next.js) en el entorno **OpenLab** bajo `<subdominio>.uninorte.edu.co`.

- Objetivo: servir la aplicación detrás de HTTPS del dominio institucional.
- En el repositorio hay una imagen Docker lista (`Dockerfile`, salida `standalone`) y el contenedor escucha por defecto el puerto **3000** (o el que definamos con `PORT`).
- Adjunto o envío por canal privado un archivo **`.env`** con las credenciales de **Supabase** y variables opcionales (push); el repo solo incluye `.env.example` sin secretos.

**Responsabilidades OpenLab / infra:** proxy inverso HTTPS, apuntar al host/puerto del contenedor, certificado TLS, reglas de firewall si aplican.

**Ya incluido en el repo:** `Dockerfile`, `.dockerignore`, `docker-compose.yml` (prueba local), `.env.example`, y documentación en `README.md` y este archivo.

Quedo atento/a a confirmar puerto público y URL final para actualizar **Site URL** y **Redirect URLs** en Supabase Auth.

Saludos,  
`<Tu nombre>`

## Invitar al profesor al repositorio (GitHub)

1. En GitHub, abre el repositorio del proyecto.
2. **Settings** → **Collaborators** (repo privado) u **Organization** → **Teams**, según corresponda.
3. **Add people** e introduce el correo institucional del profesor.
4. Elige el rol acorde a la política del curso: **Read** si solo revisa o despliega; **Write** o **Maintain** si debe integrar cambios. Confirma la invitación por correo.

No hace falta cambiar código para esto; es un paso operativo en GitHub.

## Verificación sugerida

- `docker build` / `docker run` o `docker compose up --build` con un `.env` válido: carga la home y el flujo de login no falla por URLs de redirect.
- Tras el despliegue, comprobar inicio de sesión en la URL `https://<subdominio>.uninorte.edu.co` y que coincida lo configurado en Supabase.
