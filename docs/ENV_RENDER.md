# Variables de entorno — FINES Adultos

## Backend (`fines-api` en Render / `backend/.env` local)

| Variable | ¿Obligatoria? | Ejemplo / notas |
|---|---|---|
| `DATABASE_URL` | Sí | Connection string de Neon (Postgres). En Render: sync from Neon o pegar URL con `sslmode=require`. |
| `JWT_SECRET` | Sí | String largo aleatorio. En Render se puede “Generate”. |
| `JWT_EXPIRES_IN` | No | Default `30m` |
| `PORT` | No | Render lo setea solo. Local: `3000` |
| `FRONTEND_URL` | Sí (prod) | URL del front, ej. `https://fines-web.onrender.com`. Puede ser lista separada por comas. Local: `http://localhost:5173` |
| `UPLOAD_DIR` | No | Default `./uploads` (planificaciones). |
| `GEMINI_API_KEY` | No* | Key de [Google AI Studio](https://aistudio.google.com/). Sin esto, la carga de notas por foto sigue a mano. |
| `GEMINI_MODEL` | No | Default/recomendado: `gemini-3.5-flash-lite` |

\* Obligatoria solo si querés el botón **Leer con Gemini**.

## Frontend (`fines-web` en Render / build Vite)

| Variable | ¿Obligatoria? | Ejemplo / notas |
|---|---|---|
| `VITE_API_URL` | Sí en Render | URL pública de la API **con** `/api`, ej. `https://fines-api.onrender.com/api` |
| (local) | — | En local podés dejarla vacía: Vite proxea `/api` → `localhost:3000` |

**Importante:** `VITE_*` se hornea en el **build**. Si cambiás la URL de la API, hay que **redeploy** el static site.

## Orden al configurar Render

1. Deploy / crear `fines-api` con `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (podés poner temporalmente `*` o la URL que Render asigne al front después).
2. Anotá la URL del API, ej. `https://fines-api.onrender.com`.
3. Deploy `fines-web` con `VITE_API_URL=https://fines-api.onrender.com/api`.
4. Volvé a `fines-api` y seteá `FRONTEND_URL=https://fines-web.onrender.com` (CORS).
5. Opcional: en `fines-api` agregá `GEMINI_API_KEY` (y `GEMINI_MODEL` si querés otro modelo).

## Checklist rápido

- [ ] API responde en `/api/docs`
- [ ] Front abre login y puede autenticarse
- [ ] CORS: sin error en consola del browser
- [ ] Gemini (opcional): en ficha → Cargar foto / libro → Leer con Gemini
