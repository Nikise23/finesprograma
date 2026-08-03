# Sistema FINES — Modalidad Adultos

Guía para levantar el proyecto **desde cero** y entender cómo está armado.

Sistema web de gestión académica del programa **FINES** (Formación Integral de Nivel Secundario), modalidad adultos: estructura CENS → sedes → comisiones, estudiantes, docentes, notas, asistencia, libros matriz, ficha/trayectoria histórica y reportes.

---

## 1. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + React Router 7 |
| Backend | NestJS 11 + TypeScript |
| ORM / DB | Prisma 6 + PostgreSQL 16 |
| Auth | JWT (Passport) + RBAC por rol |
| Archivos | Multer (planificaciones), ExcelJS / SheetJS (`xlsx`) |
| Reportes | CSV, Excel, PDF (PDFKit) |
| Docs API | Swagger en `/api/docs` |
| Infra local | Docker Compose (Postgres) |

La base puede ser **local (Docker)** o **Neon (cloud)**. El frontend llama a `/api` en local (proxy Vite); en producción usa `VITE_API_URL`.

**Deploy en Render:** ver [`DEPLOY_RENDER.md`](./DEPLOY_RENDER.md) · repo https://github.com/Nikise23/finesprograma

---

## 2. Dominio del negocio

### Jerarquía organizativa

```
CENS (escuela / centro)
  └── Sede (ubicación física)
        └── Comisión (grupo de cursada)
              ├── Estudiantes
              ├── Docentes (por materia)
              ├── Notas / Asistencia / Planificaciones
```

### Plan de estudios

En este plan, **módulo = cuatrimestre del trayecto** (hay 6):

| ID | Etiqueta | Significado |
|----|----------|-------------|
| 1 | `1°1C` | 1° año, 1° cuatrimestre |
| 2 | `1°2C` | 1° año, 2° cuatrimestre |
| 3 | `2°1C` | … |
| 4 | `2°2C` | … |
| 5 | `3°1C` | … |
| 6 | `3°2C` | … |

Cada comisión cursa **un** módulo y hereda sus materias. El catálogo vive en:

- `backend/src/common/constants/materias-fines.ts`
- tablas Prisma `Modulo` / `Materia` (seed)

Las **notas del ciclo en curso** van en `Nota` (por estudiante + comisión + materia + cuatrimestre 1–6).  
Las **notas históricas / egresadas** van en `NotaHistorica` y se ven en la **Ficha del estudiante**.

### Dos vistas de “estudiante”

| Pantalla | Qué es |
|----------|--------|
| **Estudiantes** | Alumnos operativos (activos en comisiones, altas, import CSV/Excel) |
| **Ficha del estudiante** (`/trayectorias`) | Historial por DNI: trayectoria + informes de notas históricas + notas actuales si hay |

---

## 3. Arquitectura

### Vista general

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  Frontend (Vite)    │  /api   │  Backend (NestJS)             │
│  React pages        │ ──────► │  Controllers → Services       │
│  AuthContext + JWT  │         │  Guards JWT + Roles           │
│  services/api.ts    │         │  PrismaService                │
└─────────────────────┘         └──────────────┬───────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  PostgreSQL         │
                                    │  (Docker o Neon)    │
                                    └─────────────────────┘
```

### Capas del backend (NestJS)

```
HTTP Request
    │
    ▼
Controller     → valida DTO (class-validator), ruta, rol
    │
    ▼
Service        → reglas de negocio, permisos por rol, orquestación
    │
    ├── PrismaService   → acceso a PostgreSQL
    └── AuditService    → bitácora de acciones sensibles
    │
    ▼
Response JSON / archivo (CSV, Excel, PDF, upload)
```

Patrón por módulo de dominio:

```
backend/src/modules/<nombre>/
  ├── <nombre>.module.ts
  ├── <nombre>.controller.ts
  ├── <nombre>.service.ts
  └── dto/
```

### Capas del frontend

```
pages/           → pantallas (una por dominio / flujo)
components/      → Layout, Sidebar, BackNav
context/         → AuthContext (token + usuario en localStorage)
services/api.ts  → único cliente HTTP hacia /api
App.tsx          → rutas + PrivateRoute + RoleRoute
```

Flujo de auth:

1. `POST /api/auth/login` → `accessToken` + `user`
2. Token en `Authorization: Bearer …`
3. Guards globales en Nest: `JwtAuthGuard` + `RolesGuard` + rate limit

---

## 4. Roles y permisos

| Rol | Alcance típico |
|-----|----------------|
| **ADMIN** | Todo + usuarios + aprobación de bajas |
| **ADMINISTRATIVO** | Estructura, docentes, libros matriz, importaciones, reportes |
| **DOCENTE** | Solo sus comisiones: notas, asistencia, planificaciones, alta de alumnos, solicitar baja |

Las rutas del frontend se filtran en `App.tsx` / `Sidebar.tsx`. En el backend cada endpoint declara `@Roles(...)`.

---

## 5. Estructura del repositorio

```
Proyecto fines/
├── README.md                 ← esta guía
├── docker-compose.yml        ← PostgreSQL local
├── PROMPT_SISTEMA_FINES_ADULTOS.md   ← especificación funcional original
├── CREDENCIALES_DOCENTES.md  ← passwords docentes (no versionar / sensible)
│
├── backend/
│   ├── .env / .env.example
│   ├── prisma/
│   │   ├── schema.prisma     ← modelo de datos
│   │   ├── migrations/
│   │   ├── seed.ts
│   │   └── seed-materias.ts / import-*.ts
│   ├── prisma.config.ts
│   ├── uploads/              ← planificaciones subidas
│   └── src/
│       ├── main.ts           ← bootstrap, CORS, ValidationPipe, Swagger
│       ├── app.module.ts     ← registra módulos + guards globales
│       ├── prisma/           ← PrismaModule / PrismaService
│       ├── common/           ← guards, decorators, audit, utils, constants
│       └── modules/          ← un módulo Nest por dominio
│           ├── auth/
│           ├── users/
│           ├── cens/ sedes/ comisiones/ modulos/
│           ├── estudiantes/ docentes/
│           ├── notas/ asistencia/ planificaciones/
│           ├── libros-matrices/
│           ├── trayectorias/   ← ficha + import egresadas + pegar notas
│           ├── solicitudes-baja/
│           ├── reportes/
│           └── dashboard/
│
└── frontend/
    ├── vite.config.ts        ← proxy /api → :3000
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── context/AuthContext.tsx
        ├── services/api.ts
        ├── components/
        └── pages/
```

### Módulos API principales

| Prefijo | Responsabilidad |
|---------|-----------------|
| `/api/auth` | Login JWT |
| `/api/cens`, `/sedes`, `/comisiones`, `/modulos` | Estructura académica |
| `/api/estudiantes` | CRUD + import Excel/CSV |
| `/api/docentes` | Docentes y asignación a comisiones |
| `/api/notas`, `/asistencia`, `/planificaciones` | Gestión de cursada |
| `/api/libros-matrices` | Padrón / libro folio |
| `/api/trayectorias` | Ficha, import egresadas, pegar calificaciones texto |
| `/api/reportes` | Export CSV / Excel / PDF |
| `/api/users` | Usuarios (admin) |
| `/api/dashboard` | Contadores e inicio |

Swagger interactivo: `http://localhost:3000/api/docs`

---

## 6. Modelo de datos (resumen)

Entidades clave en `backend/prisma/schema.prisma`:

- **Usuario** — email, password hash, rol (`ADMIN` \| `ADMINISTRATIVO` \| `DOCENTE`)
- **Cens / Sede / Comision** — estructura; `Comision.moduloId` → cuatrimestre del plan
- **Modulo / Materia** — catálogo de 6 cuatrimestres y ~31 materias
- **Docente** + **DocenteComision** — vínculo docente–comisión–materia
- **Estudiante** — DNI único, comisión opcional, estado (`activo`, `historico`, …)
- **Nota** — calificaciones del ciclo actual
- **Asistencia / Planificacion / SolicitudBajaEstudiante**
- **LibroMatriz** — padrón por DNI
- **TrayectoriaEstudiante** — períodos regulares históricos
- **NotaHistorica** — calificaciones de informes egresados / carga manual a ficha
- **Auditoria** — log de acciones

---

## 7. Requisitos previos

- **Node.js 22+** y npm  
- **Docker Desktop** (si usás Postgres local)  
- (Opcional) cuenta **Neon** si la DB va en la nube  
- Git  

---

## 8. Instalación desde cero

### Opción A — PostgreSQL local (recomendada para desarrollo)

#### 1) Clonar / abrir el repo

```bash
cd "Proyecto fines"
```

#### 2) Base de datos

```bash
docker compose up -d
```

Esto levanta Postgres en `localhost:5432`:

- DB: `fines_adultos`
- User / pass: `fines` / `fines123`

#### 3) Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

- API: http://localhost:3000/api  
- Swagger: http://localhost:3000/api/docs  

Variables importantes en `.env`:

```env
DATABASE_URL="postgresql://fines:fines123@localhost:5432/fines_adultos?schema=public"
JWT_SECRET="cambiar-en-produccion-clave-secreta-larga"
JWT_EXPIRES_IN="8h"
PORT=3000
FRONTEND_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
```

#### 4) Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173  

El proxy de Vite reenvía `/api` → `http://localhost:3000`.

---

### Opción B — Base en Neon (nube)

1. Creá un proyecto en [Neon](https://neon.tech) y copiá el connection string.  
2. En `backend/.env` poné:

```env
DATABASE_URL="postgresql://USER:PASS@HOST/neondb?sslmode=require&schema=public"
```

Preferí el host **pooler** para la app. Si `channel_binding=require` da problemas con Prisma/Node, sacalo y dejá `sslmode=require`.

3. Aplicá esquema y seed:

```bash
cd backend
npx prisma db push
# o: npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

4. Frontend igual que arriba.

> **Importante:** no commitees `.env` ni connection strings con password. Rotá credenciales si se filtraron.

---

## 9. Usuarios de prueba

Tras el seed:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin@fines.gob.ar` | `Admin1234` |
| Administrativo | `administrativo@fines.gob.ar` | `Admin1234` |

Docentes importados: ver `CREDENCIALES_DOCENTES.md` (archivo sensible; no subir a git público).

---

## 10. Comandos útiles

```bash
# Backend
cd backend
npm run start:dev          # API en watch
npm run build              # compilar
npx prisma studio          # UI de la DB
npx prisma migrate dev     # nueva migración
npm run db:seed            # datos iniciales

# Frontend
cd frontend
npm run dev                # Vite
npm run build              # build producción
```

Scripts de import / datos (según lo que haya en `backend/prisma/`):

- seed de materias del plan  
- import de informes globales / comisiones egresadas  

---

## 11. Funcionalidades principales

- CRUD de CENS, sedes, comisiones (con cuatrimestre/módulo), docentes, estudiantes  
- Import de estudiantes (Excel/CSV) por comisión  
- Libros matriz: import Excel, búsqueda, edición, export  
- Notas, asistencia y planificaciones por comisión  
- Solicitud / aprobación de baja de estudiantes  
- Reportes CSV / Excel / PDF  
- Ficha del estudiante (trayectoria + notas históricas)  
- Import de comisiones egresadas (Excel)  
- **Pegar notas** en texto desde la ficha (`Materia` + nota → `NotaHistorica`)  
- Gestión de usuarios (solo admin)  
- Auditoría de acciones críticas  

---

## 12. Convenciones para contribuir

1. **Un módulo Nest = un dominio**; no mezclar lógica de negocio en controllers.  
2. Validar entrada con DTOs + `ValidationPipe` (whitelist).  
3. Strings vacíos en opcionales: transformar a `undefined` (ver DTOs de estudiante).  
4. Frontend: llamadas solo vía `services/api.ts`.  
5. Permisos: declarar `@Roles` en backend **y** `RoleRoute` en frontend.  
6. No hardcodear secretos; usar `.env`.  
7. Ante cambios de esquema: migración Prisma + revisar seed si aplica.  

---

## 13. Troubleshooting rápido

| Problema | Qué revisar |
|----------|-------------|
| `EADDRINUSE :::3000` | Otro Node usando el puerto; matar el proceso o cambiar `PORT` |
| Prisma `EPERM` en Windows | Parar el backend antes de `prisma generate` |
| Frontend sin datos / 401 | Token vencido; volver a login |
| Import / email vacío falla | Ya contemplado en DTO; actualizar backend si tenés versión vieja |
| Neon no conecta | `sslmode=require`, URL pooler, firewall/red |

---

## 14. Documentación relacionada

- [`PROMPT_SISTEMA_FINES_ADULTOS.md`](./PROMPT_SISTEMA_FINES_ADULTOS.md) — requisitos funcionales originales  
- Swagger: `http://localhost:3000/api/docs`  
- Schema vivo: `backend/prisma/schema.prisma`  

---

## 15. Estado y próximos pasos típicos

**Listo para uso local / demo** con Neon o Docker.

Pendiente habitual de producto:

- Deploy permanente (Render / Railway + frontend estático)  
- Tests e2e ampliados  
- Hardening de secretos y rotación de JWT en producción  

Si tu compañero solo necesita **ver una demo**, alcanza con levantar backend + frontend y compartir acceso (túnel temporal o deploy). Si necesita **desarrollar**, seguir la sección 8 Opción A.
