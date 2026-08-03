# Deploy en Render

Repo: https://github.com/Nikise23/finesprograma

La base de datos sigue en **Neon** (no hace falta Postgres de Render).
Hay dos servicios: **API** (Node) + **Frontend** (Static Site).

## 1. Subir el código a GitHub

Ya debería estar en el remoto. Si no:

```powershell
cd "c:\Proyecto fines"
git init
git add .
git commit -m "Initial commit: FINES Adultos listo para Render"
git branch -M main
git remote add origin https://github.com/Nikise23/finesprograma.git
git push -u origin main
```

## 2. API en Render (Web Service)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Conectá el repo `Nikise23/finesprograma`
3. Configuración:

| Campo | Valor |
|-------|--------|
| Name | `fines-api` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm run start:render` |
| Instance | Free |

4. **Environment** (Environment Variables):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Connection string de Neon (`sslmode=require`) |
| `JWT_SECRET` | Generá uno largo (o usá Generate) |
| `JWT_EXPIRES_IN` | `30m` |
| `FRONTEND_URL` | URL del frontend (la cargás en el paso 3; podés poner temporalmente `*` no — mejor la URL real) |
| `UPLOAD_DIR` | `./uploads` |
| `NODE_VERSION` | `22` |

5. Deploy. Cuando termine, copiá la URL tipo:
   `https://fines-api-xxxx.onrender.com`

Swagger: `https://fines-api-xxxx.onrender.com/api/docs`

> En el plan free el servicio se duerme tras inactividad; el primer request puede tardar ~30–60 s.

## 3. Frontend en Render (Static Site)

1. **New** → **Static Site**
2. Mismo repo
3. Configuración:

| Campo | Valor |
|-------|--------|
| Name | `fines-web` |
| Root Directory | `frontend` |
| Build Command | `npm install --include=dev && npm run build` |
| Publish Directory | `dist` |

4. **Environment** (build-time — Vite las embebe):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://fines-api-xxxx.onrender.com/api` |
| `NODE_VERSION` | `22` |

5. Rewrite SPA: **Redirects/Rewrites** → Source `/*` → Destination `/index.html` → Rewrite

6. Deploy. URL tipo: `https://fines-web-xxxx.onrender.com`

## 4. Cerrar el circuito CORS

En el servicio **fines-api**, editá:

```
FRONTEND_URL=https://fines-web-xxxx.onrender.com
```

Guardá → redeploy automático (o Manual Deploy).

Si necesitás más orígenes: `https://a.onrender.com,http://localhost:5173`

## 5. Probar

1. Abrí el frontend
2. Login: `admin@fines.gob.ar` / `Admin1234` (si usás la misma Neon ya seedada)
3. Si la DB es nueva vacía, desde tu PC:

```powershell
cd backend
# .env con DATABASE_URL de Neon
npm run db:seed
```

## Notas

- **No** subas `.env` ni `CREDENCIALES_DOCENTES.md` (están en `.gitignore`).
- Uploads de planificaciones en disco free de Render **se pierden** al redeploy; para producción real usar S3/R2.
- Blueprint opcional: `render.yaml` en la raíz (Blueprint en Render).
- Tras cambiar `VITE_API_URL` hay que **rebuild** el static site (no alcanza con restart).
