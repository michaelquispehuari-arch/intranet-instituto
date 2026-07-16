# Infraestructura

## Nginx

Archivo base:

```text
infra/nginx/intranet.conf
```

Antes de usarlo en produccion:

```text
1. Cambiar instituto.example.com por el dominio real.
2. Confirmar que el frontend escucha en 3000 y el backend en 4000.
3. Mantener client_max_body_size en 500m para coincidir con el limite de materiales.
4. Usar Cloudflare con SSL/TLS Full Strict delante del servidor.
```

## CI

Archivo base:

```text
.github/workflows/ci.yml
```

El pipeline valida backend y frontend en cada push o pull request hacia `dev` y `main`.
El deploy real queda pendiente hasta definir proveedor y credenciales seguras.

## Despliegue en Railway

Guia operativa:

```text
infra/DEPLOY_DEMO.md
```

Usar esa guia para configurar Railway (backend + frontend + PostgreSQL + Redis), Cloudflare R2, SMTP y el worker sin documentar secretos reales.
