# Documento de Arquitectura — Intranet Educativa
**Versión:** 2.0 — Definitiva  
**Contexto:** Sistema para instituto educativo en Perú. 3 clases por semana, 2 ciclos de 4 meses al año. Meta: ~200 usuarios simultáneos. Plazo de madurez: 3 años.  
**Este documento es la fuente de verdad para cualquier IA que implemente este proyecto. No debe suponerse nada que no esté aquí escrito.**

---

## PARTE 1 — CAMBIOS Y CORRECCIONES RESPECTO A LA ARQUITECTURA ORIGINAL

Los siguientes puntos fueron corregidos o añadidos porque faltaban o tenían errores conceptuales:

**1. CDN y Seguridad Perimetral se fusionan en una sola capa (Cloudflare)**
En la arquitectura original aparecían separados. En la práctica, Cloudflare hace ambas cosas desde la misma plataforma. Separar CDN de Seguridad Perimetral implicaría contratar dos servicios distintos innecesariamente. Cloudflare (plan gratuito) maneja: HTTPS, Firewall, Rate Limiting, Anti-DDoS y entrega de archivos estáticos (CDN).

**2. Se agrega Redis como capa de caché explícita**
El documento original mencionaba "caché" como concepto pero no lo incluía como componente. Redis es el estándar para almacenar sesiones de usuario, resultados de exámenes temporales y datos frecuentes (como el menú del sistema). Sin Redis, cada petición consulta la base de datos, lo que degrada el rendimiento bajo carga.

**3. Se agrega Bull Queue como capa de tareas asíncronas**
El documento original mencionaba "colas de tareas (Queues)" como concepto pero no especificaba la librería. Bull Queue (Node.js) es el estándar. Gestiona: envío de emails, procesamiento de videos subidos, generación de reportes de notas, compresión de archivos.

**4. "try/captcha" corregido a "try/catch"**
Error de terminología. "try/catch" es el bloque de manejo de errores en programación. "Captcha" es una verificación anti-bot. Son conceptos completamente distintos.

**5. Se agrega sistema de Monitoreo como componente obligatorio**
El documento original no lo incluía. Herramientas: Sentry (errores de código en tiempo real) + UptimeRobot (disponibilidad del servidor). Ambas tienen plan gratuito suficiente para este proyecto.

**6. Se agrega pipeline CI/CD con entornos Dev y Prod**
El documento original mencionaba "dos versiones" sin especificar cómo implementarlas. La solución concreta es: dos repositorios de código en GitHub (o dos ramas: `main` para producción, `dev` para desarrollo) + GitHub Actions para despliegue automático.

**7. Nginx se especifica como capa separada, no como parte de Cloudflare**
Cloudflare actúa antes de que el tráfico llegue al servidor. Nginx actúa dentro del servidor. Cloudflare filtra tráfico malicioso a nivel de red; Nginx distribuye las peticiones legítimas entre los procesos de la aplicación.

---

## PARTE 2 — ARQUITECTURA COMPLETA: LAS 8 CAPAS

### CAPA 1 — USUARIOS (Estudiantes, Profesores, Administradores)

**Qué es:** Los humanos que usan el sistema.  
**Cómo acceden:** Únicamente a través de un navegador web (Chrome, Firefox, Safari, Edge). No se instala ninguna aplicación. El sistema funciona en computadoras y teléfonos móviles.  
**Capacidad objetivo:** 200 usuarios simultáneos.  
**Roles que existen en el sistema (definidos aquí, implementados en Capa 6):**
- `admin` — Acceso total. Gestión de usuarios, cursos y configuración.
- `profesor` — Puede crear exámenes, subir material, ver y editar notas de sus cursos.
- `estudiante` — Puede rendir exámenes, ver su material, ver sus propias notas.

**Restricción crítica:** Ningún usuario toca directamente la base de datos ni el backend. Todo pasa por la interfaz visual (Frontend) que a su vez habla con el Backend a través de la API.

---

### CAPA 2 — CLOUDFLARE (Seguridad Perimetral + CDN)

**Qué es:** Servicio externo gratuito (plan Free) que se interpone entre los usuarios e Internet, y el servidor real.  
**Costo:** $0/mes (plan gratuito cubre este caso de uso).  
**Qué hace exactamente:**

- **HTTPS:** Todo el tráfico viaja cifrado. Las contraseñas nunca viajan en texto plano. Cloudflare gestiona el certificado SSL automáticamente. No se necesita configurar nada manual.
- **Firewall:** Bloquea IPs conocidas como maliciosas. Se puede configurar para bloquear acceso desde países específicos si se requiere.
- **Rate Limiting:** Si una IP hace más de N peticiones por minuto (número configurable), la bloquea temporalmente. Previene que alguien pruebe contraseñas por fuerza bruta.
- **Anti-DDoS:** Si alguien intenta tumbar el servidor enviando millones de peticiones falsas, Cloudflare las absorbe antes de que lleguen al servidor real.
- **CDN:** Los archivos que no cambian (imágenes del sistema, hojas de estilo CSS, código JavaScript del Frontend) se guardan en servidores de Cloudflare alrededor del mundo. Los usuarios reciben esos archivos desde el servidor más cercano a ellos, no desde el servidor principal en Lima.

**Qué NO hace Cloudflare:** No maneja la lógica de la aplicación, no guarda las notas de los alumnos, no procesa exámenes.

**Configuración mínima necesaria:**
1. Registrar el dominio del instituto en Cloudflare.
2. Activar el proxy (nube naranja) para que el tráfico pase por Cloudflare.
3. Habilitar HTTPS automático (SSL/TLS en modo "Full Strict").
4. Activar regla de Rate Limiting: máximo 100 peticiones por minuto por IP.

---

### CAPA 3 — NGINX (Balanceador de Carga / Proxy Inverso)

**Qué es:** Software que corre dentro del servidor (no es un servicio externo). Actúa como portero interno del servidor.  
**Costo:** $0 (software libre).  
**Qué hace exactamente:**

- Recibe las peticiones que ya pasaron Cloudflare.
- Las redirige al proceso de Node.js correcto (el Backend).
- Si hay múltiples procesos del Backend corriendo (escalado), distribuye la carga entre ellos.
- Sirve los archivos estáticos del Frontend directamente sin molestar a Node.js (más eficiente).
- Gestiona las conexiones HTTPS a nivel de servidor (complementa a Cloudflare).

**Configuración mínima necesaria en el archivo `nginx.conf`:**
```
server {
  listen 80;
  server_name dominio-del-instituto.com;

  # Archivos estáticos del Frontend (Next.js build)
  location /_next/static/ {
    alias /var/www/frontend/.next/static/;
    expires 1y;
  }

  # Todo lo demás va al Backend Node.js
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # Las rutas de la API van al Backend
  location /api/ {
    proxy_pass http://localhost:4000;
  }
}
```

---

### CAPA 4 — FRONTEND (Next.js + React)

**Qué es:** El código que genera la interfaz visual que ve el usuario en su navegador.  
**Tecnología:** Next.js 14 (que incluye React 18). Next.js añade a React: renderizado en el servidor (SSR), rutas automáticas basadas en carpetas, y optimización de rendimiento.  
**Costo:** $0 (software libre).  
**Puerto por defecto:** 3000.

**Responsabilidad exacta del Frontend:**
- Mostrar pantallas, botones, formularios, tablas.
- Enviar las acciones del usuario (clic en "Enviar examen") al Backend como peticiones HTTP.
- Mostrar los datos que devuelve el Backend.

**Lo que el Frontend NO debe hacer jamás:**
- Calcular promedios o notas (eso va en el Backend).
- Guardar contraseñas o claves de API en el código del Frontend (el código del Frontend es visible para cualquier usuario técnico).
- Decidir si un usuario tiene permiso para ver algo (esa validación SIEMPRE va en el Backend también).

**Rutas (páginas) que debe tener el sistema:**

| Ruta URL | Qué muestra | Roles que pueden verla |
|---|---|---|
| `/login` | Formulario de inicio de sesión | Todos (sin sesión) |
| `/dashboard` | Panel principal según rol | admin, profesor, estudiante |
| `/exams` | Lista de exámenes disponibles | profesor, estudiante |
| `/exams/[id]` | Examen individual en curso | estudiante |
| `/exams/[id]/results` | Resultados del examen | profesor, estudiante (sus propios) |
| `/exams/create` | Crear nuevo examen | solo profesor |
| `/content` | Biblioteca de materiales | profesor, estudiante |
| `/content/upload` | Subir nuevo archivo | solo profesor |
| `/grades` | Registro de notas | admin, profesor, estudiante (sus propias) |
| `/users` | Gestión de usuarios | solo admin |
| `/settings` | Configuración del sistema | solo admin |

**Cómo proteger las rutas:** Next.js Middleware (`middleware.ts`) intercepta cada petición antes de renderizar la página. Lee el token JWT de la sesión. Si el token no existe o el rol no tiene permiso, redirige a `/login`. Esta validación en el Frontend es solo para comodidad del usuario. La validación real de seguridad ocurre en el Backend.

**Estado global de la sesión:** Usar NextAuth.js (ver Autenticación). NextAuth guarda el token JWT en una cookie HttpOnly (no accesible desde JavaScript), que es más segura que `localStorage`.

---

### CAPA 5 — BACKEND / API (Node.js + Express)

**Qué es:** El servidor de aplicación. El cerebro del sistema. Nunca lo ve el usuario directamente.  
**Tecnología:** Node.js 20 LTS + Express 4. Se recomienda TypeScript para evitar errores de tipos.  
**Costo:** $0 (software libre).  
**Puerto por defecto:** 4000.

**Responsabilidad exacta del Backend:**
- Recibir peticiones HTTP del Frontend.
- Verificar que el usuario tiene sesión válida y el rol correcto (autenticación + autorización).
- Validar que los datos recibidos son correctos y seguros.
- Ejecutar la lógica de negocio (calcular promedio, verificar respuestas de examen).
- Leer y escribir en la base de datos.
- Devolver una respuesta JSON al Frontend.

**Estructura de carpetas del Backend:**
```
/backend
  /src
    /routes         → Definición de endpoints de la API
    /controllers    → Lógica de cada endpoint
    /services       → Lógica de negocio reutilizable
    /models         → Definición de tablas (con ORM Prisma)
    /middleware     → Verificación de JWT, roles, validación
    /queues         → Tareas asíncronas con Bull
    /utils          → Funciones auxiliares
  /tests            → Pruebas automatizadas
  .env              → Variables de entorno (NUNCA subir a GitHub)
  .env.example      → Plantilla de variables (SÍ subir a GitHub)
```

**Variables de entorno obligatorias (archivo `.env`):**
```
DATABASE_URL=postgresql://usuario:contraseña@host:5432/nombre_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=cadena-aleatoria-de-al-menos-32-caracteres
NEXTAUTH_SECRET=otra-cadena-aleatoria-diferente
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
SENTRY_DSN=...
NODE_ENV=development   ← cambiar a "production" en el servidor real
```

**Reglas de seguridad obligatorias en el Backend:**

1. **Validación de entrada:** Todo dato que llega del Frontend debe validarse antes de usarse. Usar la librería `zod` para definir esquemas. Si el dato no cumple el esquema, devolver error 400 sin procesar nada.

2. **Verificación JWT en cada ruta protegida:** Crear un middleware `authMiddleware` que lea el token JWT del header `Authorization: Bearer <token>` o de la cookie. Si el token es inválido o expirado, devolver 401.

3. **Verificación de roles:** Crear un middleware `requireRole('profesor')` que, después de verificar la sesión, comprueba que el rol del usuario coincide con el requerido. Si no, devolver 403.

4. **Regla CORS:** El Backend solo acepta peticiones del dominio del Frontend. Configuración:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL, // solo el dominio propio
     credentials: true
   }));
   ```

5. **Idempotencia en envío de exámenes:** Al recibir el envío de un examen, verificar primero si ya existe un registro de envío para ese `(usuarioId, examenId)`. Si ya existe, devolver los resultados guardados sin procesar de nuevo. Esto evita doble procesamiento si el estudiante hace clic varias veces.

6. **Try/Catch en todos los controladores:** Cada función de controlador debe estar envuelta en try/catch. Si ocurre un error inesperado, capturarlo, registrarlo en Sentry y devolver al usuario un mensaje genérico (error 500) sin exponer detalles internos.

---

### CAPA 6 — MÓDULOS DE SERVICIO

Son las 4 áreas funcionales del sistema. Cada una se implementa como un conjunto de rutas, controladores y servicios dentro del Backend.

#### MÓDULO A: Autenticación

**Tecnología:** NextAuth.js (gestiona el flujo de login/logout en el Frontend y emite el token JWT).  
**Flujo completo de login:**
1. El usuario escribe email y contraseña en el Frontend.
2. El Frontend envía `POST /api/auth/login` con `{ email, password }`.
3. El Backend busca el usuario en PostgreSQL por email.
4. Si no existe: devuelve error 401 (mensaje genérico: "Credenciales incorrectas").
5. Si existe: compara la contraseña con el hash guardado usando `bcrypt.compare()`. Nunca se guarda la contraseña en texto plano, solo su hash.
6. Si el hash coincide: genera un JWT firmado con `JWT_SECRET` que contiene `{ userId, email, role, exp: 24h }`.
7. El Frontend guarda el JWT en una cookie `HttpOnly` (NextAuth lo hace automáticamente).
8. En cada petición posterior, el JWT se envía automáticamente en la cookie.

**Recuperación de contraseña:**
1. Usuario solicita reset con su email.
2. Backend genera un token temporal (válido 1 hora), lo guarda en Redis con la clave `reset:${token}` y envía un email con el enlace.
3. Usuario hace clic en el enlace, ingresa nueva contraseña.
4. Backend verifica el token en Redis, actualiza el hash en PostgreSQL, borra el token de Redis.

#### MÓDULO B: Exámenes

**Flujo de creación (profesor):**
1. Profesor completa el formulario en `/exams/create`.
2. Frontend envía `POST /api/exams` con `{ titulo, cursoId, duracionMinutos, preguntas: [{texto, opciones, respuestaCorrecta}] }`.
3. Backend valida el esquema con `zod`, verifica que el profesor pertenece al curso, guarda en PostgreSQL.

**Flujo de rendición (estudiante):**
1. Estudiante abre el examen. Backend verifica que no lo ha rendido antes.
2. Frontend muestra el temporizador (cuenta regresiva en el cliente). El Backend también registra la hora de inicio.
3. Al terminar (por tiempo o envío manual), Frontend envía `POST /api/exams/:id/submit` con las respuestas.
4. Backend verifica idempotencia (¿ya fue enviado?), calcula el puntaje, guarda el resultado, devuelve el detalle al Frontend.

**Regla crítica:** El Backend recalcula el puntaje siempre a partir de las respuestas almacenadas. El Frontend nunca envía el puntaje calculado; siempre envía las respuestas y el Backend calcula.

#### MÓDULO C: Contenido

**Flujo de subida de archivos (profesor):**
1. Profesor selecciona un archivo en `/content/upload`.
2. Frontend envía el archivo al Backend como `multipart/form-data`.
3. Backend usa la librería `@aws-sdk/client-s3` (compatible con R2) para subir el archivo a Cloudflare R2.
4. Backend guarda en PostgreSQL: `{ nombre, descripcion, cursoId, urlR2, tipoArchivo, tamanoBytes, profesorId }`.
5. Frontend muestra el archivo en la biblioteca del curso.

**Flujo de descarga (estudiante):**
1. Estudiante hace clic en el archivo.
2. Frontend solicita `GET /api/content/:id/download`.
3. Backend verifica que el estudiante pertenece al curso, genera una URL firmada (presigned URL) de Cloudflare R2 con expiración de 15 minutos.
4. Frontend redirige al estudiante a esa URL temporal. El archivo nunca pasa por el servidor del instituto.

**Tipos de archivo permitidos:** PDF, MP4, MP3, DOCX, PPTX, XLSX, JPG, PNG. Tamaño máximo: 500 MB por archivo. Validar en el Backend, no solo en el Frontend.

#### MÓDULO D: Calificaciones

**Datos que gestiona:** Notas de exámenes (automáticas, generadas por el Módulo B), notas manuales (el profesor las ingresa directamente), asistencia (presente/ausente/tardanza por fecha y estudiante).

**Cálculo de promedio:** El Backend lo calcula con una fórmula configurable por el admin (por ejemplo: promedio simple de todas las notas, o pesos distintos para exámenes y tareas). La fórmula se guarda en la tabla `configuracion_curso`.

**Visualización:** Un estudiante solo puede ver sus propias notas. Un profesor puede ver las notas de todos los estudiantes de sus cursos. Un admin puede ver todo.

---

### CAPA 7 — ALMACENAMIENTO (Tres Componentes)

#### PostgreSQL — Base de datos principal

**Qué guarda:** Todo dato estructurado: usuarios, cursos, inscripciones, exámenes, preguntas, respuestas, notas, asistencias, configuraciones.  
**Hosting:** Railway o Render (incluyen PostgreSQL gestionado en sus planes de ~$20/mes).  
**ORM:** Prisma (permite escribir el esquema de la base de datos en un archivo `.prisma` y genera el código de consultas automáticamente).

**Transacciones ACID:** Cuando una operación implica múltiples pasos (ej: registrar el envío del examen Y calcular y guardar la nota), usar transacciones de Prisma (`prisma.$transaction([...])`) para garantizar que o se guardan todos los datos o no se guarda ninguno.

**Evitar problema N+1:** Nunca hacer un bucle que haga una consulta por cada elemento. Usar `include` de Prisma para traer datos relacionados en una sola consulta.
```javascript
// MAL: N+1
const estudiantes = await prisma.estudiante.findMany();
for (const e of estudiantes) {
  e.notas = await prisma.nota.findMany({ where: { estudianteId: e.id } });
}

// BIEN: una sola consulta
const estudiantes = await prisma.estudiante.findMany({
  include: { notas: true }
});
```

**Backups:** Railway y Render hacen backups automáticos diarios. Verificar que esté activado antes del lanzamiento. Guardar además un backup manual semanal en un lugar externo (Google Drive del admin).

#### Redis — Caché y sesiones

**Qué guarda:** Datos temporales de alta velocidad.
- Sesiones de usuario activas (token JWT → datos del usuario). Expiración: 24 horas.
- Token de reset de contraseña. Expiración: 1 hora.
- Resultado del menú de navegación (no cambia frecuentemente). Expiración: 1 hora.
- Progreso temporal de un examen en curso (por si el estudiante cierra el navegador). Expiración: duración del examen + 5 minutos.

**Costo:** Redis gratuito incluido en Railway y Render. Para escala mayor, Upstash tiene plan gratuito de 10,000 comandos/día.

#### Cloudflare R2 — Archivos pesados

**Qué guarda:** PDFs, videos, presentaciones, imágenes de contenido educativo.  
**Por qué no PostgreSQL para archivos:** PostgreSQL guarda texto y números eficientemente. Los archivos binarios grandes degradan el rendimiento y el costo de la base de datos.  
**Costo:** $0.015 por GB almacenado/mes. Para un instituto pequeño con 50 GB de materiales: $0.75/mes.  
**Acceso:** Nunca exponer las URLs directas de R2 al público. Siempre generar URLs firmadas temporales desde el Backend (ver Módulo C).

---

### CAPA 8 — INFRAESTRUCTURA DE SOPORTE

Son servicios adicionales que no son parte de la lógica del sistema pero son necesarios para que el sistema sea estable y profesional.

#### Email SMTP

**Para qué:** Enviar emails de bienvenida, reset de contraseña, notificación de notas publicadas.  
**Servicio recomendado:** Resend (plan gratuito: 3,000 emails/mes, suficiente para este caso).  
**Librería en Node.js:** `nodemailer` o el SDK de Resend.  
**Regla:** Los emails se envían siempre desde una Bull Queue (no de forma síncrona) para no bloquear la respuesta al usuario.

#### Bull Queue (Tareas asíncronas)

**Para qué:** Ejecutar tareas que toman tiempo sin bloquear el servidor.  
**Ejemplos de tareas en Bull Queue:**
- Enviar email de bienvenida al registrar un usuario.
- Generar y enviar un reporte de notas en PDF.
- Comprimir un video subido a R2.
- Notificar a los estudiantes cuando se publica un nuevo examen.

**Cómo funciona:** El Backend añade un "trabajo" a la cola de Redis. Un proceso separado (Worker) lee la cola y ejecuta el trabajo en segundo plano. El usuario recibe respuesta inmediata del Backend sin esperar a que el trabajo termine.

#### Monitoreo

**Sentry:** Se integra en el Backend con 2 líneas de código (`Sentry.init()`). Captura automáticamente cualquier error no manejado. Envía alerta por email. Plan gratuito incluye 5,000 errores/mes.

**UptimeRobot:** Verifica cada 5 minutos que la URL del sistema devuelve respuesta. Si no responde, envía alerta por email y WhatsApp (si se configura). Plan gratuito incluye 50 monitores.

**Configuración mínima de Sentry en el Backend:**
```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // registra el 10% de las peticiones para análisis de rendimiento
});
```

#### CI/CD y Entornos

**Dos entornos separados:**

| | Desarrollo (Dev) | Producción (Prod) |
|---|---|---|
| Rama GitHub | `dev` | `main` |
| URL | `dev.instituto.com` | `instituto.com` |
| Base de datos | PostgreSQL separada (datos de prueba) | PostgreSQL real (datos reales) |
| Deploy automático | Sí, al hacer push a `dev` | Sí, solo al hacer merge a `main` |
| Acceso | Solo el equipo técnico | Todos los usuarios |

**GitHub Actions (CI/CD):** Al hacer push a `main`, se ejecuta automáticamente: instalar dependencias → ejecutar pruebas → construir el proyecto → desplegar en Railway/Render. Si algún paso falla, el deploy se cancela y llega una notificación.

---

## PARTE 3 — ESQUEMA DE BASE DE DATOS (PostgreSQL con Prisma)

```prisma
model Usuario {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  nombre       String
  apellido     String
  rol          Rol      @default(ESTUDIANTE)
  activo       Boolean  @default(true)
  creadoEn     DateTime @default(now())
  
  cursosComoProfesor Curso[]        @relation("ProfesorCurso")
  inscripciones      Inscripcion[]
  examenesSub        ExamenEnvio[]
  notasManuales      NotaManual[]
  asistencias        Asistencia[]
}

enum Rol {
  ADMIN
  PROFESOR
  ESTUDIANTE
}

model Curso {
  id          String   @id @default(cuid())
  nombre      String
  descripcion String?
  ciclo       Int      // 1 o 2
  anio        Int
  profesorId  String
  activo      Boolean  @default(true)
  
  profesor     Usuario       @relation("ProfesorCurso", fields: [profesorId], references: [id])
  inscripciones Inscripcion[]
  examenes     Examen[]
  materiales   Material[]
  config       ConfigCurso?
}

model Inscripcion {
  id          String   @id @default(cuid())
  estudianteId String
  cursoId      String
  creadoEn     DateTime @default(now())
  
  estudiante  Usuario @relation(fields: [estudianteId], references: [id])
  curso       Curso   @relation(fields: [cursoId], references: [id])
  
  @@unique([estudianteId, cursoId])
}

model Examen {
  id               String   @id @default(cuid())
  titulo           String
  descripcion      String?
  cursoId          String
  duracionMinutos  Int
  publicadoEn      DateTime?
  disponibleDesde  DateTime?
  disponibleHasta  DateTime?
  activo           Boolean  @default(true)
  creadoEn         DateTime @default(now())
  
  curso     Curso       @relation(fields: [cursoId], references: [id])
  preguntas Pregunta[]
  envios    ExamenEnvio[]
}

model Pregunta {
  id              String   @id @default(cuid())
  examenId        String
  texto           String
  tipo            TipoPregunta @default(OPCION_MULTIPLE)
  opciones        Json     // Array de strings: ["opción A", "opción B", ...]
  respuestaCorrecta String  // El texto de la opción correcta
  puntaje         Float    @default(1)
  orden           Int
  
  examen     Examen      @relation(fields: [examenId], references: [id])
  respuestas RespuestaEstudiante[]
}

enum TipoPregunta {
  OPCION_MULTIPLE
  VERDADERO_FALSO
}

model ExamenEnvio {
  id           String   @id @default(cuid())
  estudianteId String
  examenId     String
  iniciadoEn   DateTime @default(now())
  enviadoEn    DateTime?
  puntajeTotal Float?
  completado   Boolean  @default(false)
  
  estudiante  Usuario   @relation(fields: [estudianteId], references: [id])
  examen      Examen    @relation(fields: [examenId], references: [id])
  respuestas  RespuestaEstudiante[]
  
  @@unique([estudianteId, examenId]) // Idempotencia: un envío por estudiante por examen
}

model RespuestaEstudiante {
  id          String @id @default(cuid())
  envioId     String
  preguntaId  String
  respuesta   String
  esCorrecta  Boolean
  puntajeObtenido Float
  
  envio     ExamenEnvio @relation(fields: [envioId], references: [id])
  pregunta  Pregunta    @relation(fields: [preguntaId], references: [id])
}

model Material {
  id          String   @id @default(cuid())
  nombre      String
  descripcion String?
  cursoId     String
  profesorId  String
  urlR2       String   // Clave del objeto en Cloudflare R2 (no URL pública)
  tipoArchivo String   // "pdf", "mp4", "docx", etc.
  tamanoBytes BigInt
  creadoEn    DateTime @default(now())
  
  curso   Curso @relation(fields: [cursoId], references: [id])
}

model NotaManual {
  id           String   @id @default(cuid())
  estudianteId String
  cursoId      String
  profesorId   String
  valor        Float
  descripcion  String?
  fecha        DateTime @default(now())
  
  estudiante  Usuario @relation(fields: [estudianteId], references: [id])
}

model Asistencia {
  id           String   @id @default(cuid())
  estudianteId String
  cursoId      String
  fecha        DateTime
  estado       EstadoAsistencia
  
  estudiante  Usuario @relation(fields: [estudianteId], references: [id])
  
  @@unique([estudianteId, cursoId, fecha])
}

enum EstadoAsistencia {
  PRESENTE
  AUSENTE
  TARDANZA
}

model ConfigCurso {
  id                   String @id @default(cuid())
  cursoId              String @unique
  pesoExamenes         Float  @default(0.7)  // 70% del promedio
  pesoNotasManuales    Float  @default(0.3)  // 30% del promedio
  notaAprobatoria      Float  @default(11)   // Nota mínima para aprobar
  
  curso Curso @relation(fields: [cursoId], references: [id])
}
```

---

## PARTE 4 — STACK TECNOLÓGICO COMPLETO Y COSTOS

| Componente | Tecnología | Versión recomendada | Costo |
|---|---|---|---|
| Frontend | Next.js + React | Next.js 14 / React 18 | $0 |
| Backend | Node.js + Express | Node.js 20 LTS / Express 4 | $0 |
| Lenguaje | TypeScript | 5.x | $0 |
| ORM | Prisma | 5.x | $0 |
| Base de datos | PostgreSQL | 15 | $0 (incluido en hosting) |
| Caché / Colas | Redis | 7.x | $0 (incluido en hosting) |
| Cola de tareas | Bull Queue | 4.x | $0 |
| Autenticación | NextAuth.js | 4.x | $0 |
| Validación | Zod | 3.x | $0 |
| Archivos | Cloudflare R2 | — | ~$0.75/mes (50 GB) |
| CDN + Seguridad | Cloudflare | Plan Free | $0 |
| Proxy / LB | Nginx | 1.25 | $0 |
| Email | Resend | — | $0 (hasta 3,000/mes) |
| Monitoreo errores | Sentry | — | $0 (hasta 5,000/mes) |
| Monitoreo uptime | UptimeRobot | — | $0 (plan free) |
| Hosting servidor | Railway o Render | — | ~$20/mes |
| CI/CD | GitHub Actions | — | $0 |
| **TOTAL** | | | **~$21/mes** |

---

## PARTE 5 — ORDEN DE CONSTRUCCIÓN (Paso a Paso)

Este es el orden correcto. No saltar pasos. Cada paso es la base del siguiente.

**Paso 1 — Repositorio y entornos (1 día)**
- Crear cuenta en GitHub.
- Crear repositorio `intranet-instituto` con dos ramas: `main` y `dev`.
- Crear cuenta en Railway (o Render).
- Configurar dos entornos en Railway: `intranet-prod` e `intranet-dev`.
- Crear el archivo `.env.example` con todas las variables listadas en Capa 5 (sin valores reales).

**Paso 2 — Base de datos (2-3 días)**
- Instalar Prisma en el proyecto Backend.
- Escribir el esquema completo de la Parte 3 en `prisma/schema.prisma`.
- Ejecutar `prisma migrate dev` para crear las tablas en la base de datos de desarrollo.
- Crear un archivo `prisma/seed.ts` con datos de prueba: 1 admin, 2 profesores, 10 estudiantes, 2 cursos, 1 examen de ejemplo.

**Paso 3 — Backend: Autenticación (2-3 días)**
- Instalar dependencias: `express`, `jsonwebtoken`, `bcrypt`, `zod`, `cors`, `helmet`.
- Crear las rutas: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Crear el middleware `authMiddleware` y `requireRole`.
- Probar con Postman o Insomnia antes de continuar.

**Paso 4 — Backend: Módulos de negocio (1-2 semanas)**
- Implementar módulo de Cursos (CRUD básico).
- Implementar módulo de Exámenes (crear, publicar, rendir, enviar, calificar).
- Implementar módulo de Materiales (subida a R2, generación de URL firmada).
- Implementar módulo de Calificaciones (registro, cálculo de promedio).

**Paso 5 — Frontend (1-2 semanas)**
- Instalar Next.js 14 con TypeScript.
- Instalar NextAuth.js y configurar proveedor de credenciales.
- Crear las páginas listadas en Capa 4.
- Conectar cada página con su endpoint del Backend usando `fetch` o la librería `axios`.

**Paso 6 — Servicios de soporte (2-3 días)**
- Configurar Bull Queue para el envío de emails.
- Configurar Resend para enviar emails reales.
- Integrar Sentry en el Backend.
- Configurar UptimeRobot apuntando a la URL de producción.

**Paso 7 — Seguridad y configuración de Cloudflare (1 día)**
- Registrar el dominio en Cloudflare.
- Configurar reglas de Firewall y Rate Limiting.
- Activar HTTPS automático.
- Configurar Nginx en el servidor con el bloque descrito en Capa 3.

**Paso 8 — CI/CD y backups (1 día)**
- Crear el archivo `.github/workflows/deploy.yml` con el pipeline de GitHub Actions.
- Verificar que Railway tiene backups automáticos activados.
- Hacer un primer deploy de prueba a `intranet-dev`.

**Paso 9 — Lanzamiento (1 día)**
- Ejecutar `prisma migrate deploy` en el entorno de producción.
- Ejecutar `prisma db seed` con los datos reales iniciales.
- Hacer merge de `dev` a `main`.
- Verificar que el pipeline de CI/CD despliega correctamente.
- Verificar que UptimeRobot y Sentry están activos.

**Paso 10 — Post-lanzamiento (continuo)**
- Revisar los errores en Sentry semanalmente.
- Escalar el plan de Railway si los tiempos de respuesta suben por encima de 1 segundo.
- Revisar el uso de almacenamiento en R2 mensualmente.

---

## PARTE 6 — CUMPLIMIENTO LEGAL (Perú)

El sistema maneja datos personales de menores de edad (DNI, nombre, notas, asistencia). Esto está regulado por la **Ley N° 29733 — Ley de Protección de Datos Personales** y su Reglamento (DS N° 003-2013-JUS).

**Obligaciones mínimas:**
1. Mostrar una Política de Privacidad en el Frontend con: qué datos se recopilan, para qué se usan, cuánto tiempo se guardan, quién tiene acceso.
2. Las contraseñas deben guardarse como hash con `bcrypt` (costo mínimo 12). Nunca en texto plano.
3. Los datos de menores requieren consentimiento del padre o tutor. Documentar este consentimiento al momento de inscribir al estudiante.
4. El instituto debe registrar el banco de datos ante la Autoridad Nacional de Protección de Datos Personales (ANPDP) si almacena datos de terceros de forma sistemática.

---

*Fin del documento. Versión 2.0 — Todos los componentes, tecnologías, versiones, flujos y reglas están especificados explícitamente. No se debe asumir ningún detalle de implementación que no esté en este documento.*
