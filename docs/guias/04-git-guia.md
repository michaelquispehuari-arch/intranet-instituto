# Git: subir cambios y volver atrás

Estado actual del repo (2026-07-01): una sola rama remota, `dev`, en GitHub (`origin`). No existe todavía una rama `main` separada — todo el trabajo va directo a `dev`. El pipeline de CI (`.github/workflows/ci.yml`) corre automáticamente en cada push a `dev` (o a `main`, cuando exista): typecheck, build, tests y `npm audit` de frontend y backend.

## Día a día: subir un cambio

```bash
git status                      # qué archivos cambiaron
git diff                        # qué cambió línea por línea (sin stage)
git add ruta/al/archivo.ts      # agregar archivos puntuales (evita "git add ." si no revisaste todo)
git commit -m "Mensaje corto describiendo el cambio"
git push                        # sube a origin/dev
```

Antes de hacer push, revisa que `npm run typecheck` y `npm run build` pasen en el/los paquete(s) que tocaste (`backend/` y/o `frontend/`) — si fallan localmente, van a fallar igual en CI.

## Ver el historial

```bash
git log --oneline -20           # últimos 20 commits, uno por línea
git log -p -1                   # qué cambió exactamente en el último commit
git show <hash>                 # ver un commit específico
```

## Deshacer cambios — según qué tan lejos llegaste

**1. Cambié un archivo pero no hice `git add` todavía:**
```bash
git restore ruta/al/archivo.ts   # descarta el cambio, vuelve a la última versión guardada
```

**2. Ya hice `git add` pero no `git commit`:**
```bash
git restore --staged ruta/al/archivo.ts   # lo saca del stage (el cambio en el archivo sigue ahí)
git restore ruta/al/archivo.ts            # y si además quieres descartarlo
```

**3. Ya hice `commit` pero NO `push` (el error solo existe en tu PC):**
```bash
git reset --soft HEAD~1     # deshace el último commit, deja los cambios listos para corregir y volver a commitear
# o, si quieres tirar el commit Y los cambios:
git reset --hard HEAD~1     # cuidado: esto borra el trabajo del último commit, no se puede recuperar fácil
```

**4. Ya hice `push` y el error ya está en GitHub (el caso normal cuando algo se rompió en producción):**

No reescribas historial ya subido (`git reset --hard` + push forzado) salvo que sepas exactamente qué haces y nadie más dependa de esa rama. La forma segura:
```bash
git revert <hash-del-commit-malo>   # crea un commit NUEVO que deshace ese commit, sin borrar historial
git push
```
Esto es seguro incluso si ya hay gente usando la rama, porque no reescribe nada, solo agrega un commit que revierte.

**5. Quiero ver cómo estaba TODO el proyecto en un commit anterior (sin cambiar nada todavía):**
```bash
git checkout <hash>          # te deja en un estado "desconectado" (detached HEAD), solo para mirar
git checkout dev             # y para volver a la rama normal
```

## Reglas prácticas para este proyecto

- Nunca hagas `git push --force` a `dev` sin avisar — puede borrar trabajo de otra sesión/commit que no viste.
- Nunca subas `backend/.env` ni `frontend/.env` (ya están en `.gitignore`, verifícalo con `git status` antes de un `git add .`).
- Si CI falla después de un push, corrige y sube un commit nuevo — no reescribas el commit que ya está en GitHub.
