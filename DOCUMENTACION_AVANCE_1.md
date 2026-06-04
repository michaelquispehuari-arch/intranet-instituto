# Documentacion de avance - Intranet Instituto

## Estado actual

El proyecto esta en fase de preparacion del entorno. Aun no se ha programado codigo de frontend ni backend.

La arquitectura oficial del proyecto esta en:

```text
C:\Users\micha\Downloads\arquitectura_intranet_educativa.md
```

Ese documento debe tratarse como fuente de verdad antes de implementar cualquier modulo.

## Carpeta correcta del proyecto

```text
C:\intranet-instituto
```

Esta carpeta esta fuera de OneDrive. Esto es correcto porque evita bloqueos de sincronizacion, archivos duplicados y problemas con `node_modules`.

Carpeta incorrecta para programar este proyecto:

```text
C:\Users\micha\OneDrive\Documentos\INTRANET ESTUDIANTES
```

Esa carpeta solo fue el workspace inicial de Codex, pero no debe usarse para construir el proyecto.

## Git local

Repositorio Git inicializado en:

```text
C:\intranet-instituto
```

Rama actual:

```text
dev
```

Ramas planeadas segun la arquitectura:

```text
main -> Produccion
 dev -> Desarrollo
```

Todavia no hay commits.

## GitHub remoto

Repositorio remoto configurado:

```text
https://github.com/michaelquispehuari-arch/intranet-instituto.git
```

Configuracion local del autor para este proyecto:

```text
user.name  = Michael Bryan
user.email = michael.quispehuari@gmail.com
```

Esta configuracion es local del repositorio, no global. Eso ayuda a no mezclar esta cuenta nueva con otra cuenta GitHub instalada en la PC.

## Comprobaciones realizadas

Se valido lo siguiente:

```text
C:\intranet-instituto existe: si
Proyecto fuera de OneDrive: si
Git inicializado: si
Rama actual: dev
Remoto GitHub: configurado
Remoto GitHub: accesible
Autor local Git: configurado
Primer commit: pendiente
Primer push: pendiente
```

El comando `git ls-remote --heads origin` no devolvio ramas porque el repositorio remoto aun esta vacio. Eso es normal antes del primer push.

## Importante sobre credenciales

No se debe escribir ni guardar aqui:

```text
contrasenas de GitHub
tokens personales
claves privadas
JWT_SECRET real
NEXTAUTH_SECRET real
credenciales reales de base de datos
credenciales reales de R2, SMTP o Sentry
```

Las credenciales reales iran en archivos `.env`, que nunca deben subirse a GitHub.

El archivo que si se subira sera `.env.example`, porque solo contendra nombres de variables y valores de ejemplo.

## Siguiente paso recomendado

Abrir una nueva sesion de Codex desde VS Code apuntando a:

```text
C:\intranet-instituto
```

Luego continuar con el Paso 1 de la arquitectura:

1. Crear `.env.example`.
2. Crear `.gitignore`.
3. Hacer el primer commit en `dev`.
4. Subir la rama `dev` a GitHub.

Comandos esperados para comprobar antes de programar:

```powershell
git status
git branch --show-current
git remote -v
git config user.name
git config user.email
```

Resultado esperado:

```text
branch actual: dev
remote: https://github.com/michaelquispehuari-arch/intranet-instituto.git
user.name: Michael Bryan
user.email: michael.quispehuari@gmail.com
```

## Stack definido por la arquitectura

Frontend:

```text
Next.js 14
React 18
TypeScript
NextAuth.js
Puerto 3000
```

Backend:

```text
Node.js
Express 4
TypeScript
Prisma
Zod
JWT
bcrypt
cors
helmet
Puerto 4000
```

Base de datos y servicios:

```text
PostgreSQL
Redis
Bull Queue
Cloudflare R2
Resend o SMTP
Sentry
UptimeRobot
Cloudflare
Nginx
GitHub Actions
```

## Orden de construccion segun la arquitectura

1. Repositorio y entornos.
2. Base de datos con Prisma.
3. Backend: autenticacion.
4. Backend: cursos, examenes, materiales y calificaciones.
5. Frontend.
6. Servicios de soporte.
7. Cloudflare y Nginx.
8. CI/CD y backups.
9. Lanzamiento.
10. Post-lanzamiento.

## Nota para otra IA o nuevo chat

No crear codigo antes de confirmar que el workspace activo es:

```text
C:\intranet-instituto
```

No usar la carpeta de OneDrive para el proyecto.

No asumir detalles fuera del documento de arquitectura. Si falta una decision tecnica, advertirlo antes de implementar.
