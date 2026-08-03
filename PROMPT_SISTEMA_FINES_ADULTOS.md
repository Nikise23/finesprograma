# Prompt: Sistema de Gestión FINES — Modalidad Adultos

## Contexto

Necesito que diseñes y desarrolles un sistema web de gestión académica para la **modalidad de adultos** del programa **FINES** (Formación Integral de Nivel Secundario).

La estructura organizativa del programa es jerárquica:

```
CENS (Centro / Escuela)
  └── Sedes (ubicaciones físicas de cada escuela)
        └── Comisiones (grupos de cursada por sede)
              └── Estudiantes
```

Cada CENS tiene a cargo distintas sedes, y cada sede tiene distintas comisiones. Los docentes dictan en comisiones específicas. Los estudiantes pertenecen a una comisión.

---

## Roles y permisos

El sistema debe estar **dividido por rol** con autenticación, autorización y vistas diferenciadas.

### 1. Administrador

- Acceso total al sistema.
- Gestión de usuarios (crear, editar, desactivar administrativos y docentes).
- Aprobar o rechazar solicitudes de **baja de estudiantes** iniciadas por docentes.
- Configuración general del sistema (ciclos lectivos, parámetros, etc.).
- Auditoría de acciones críticas (altas, bajas, modificaciones sensibles).
- Puede realizar todas las acciones de los roles Administrativo y Docente.

### 2. Administrativo

- **Carga y gestión completa** de:
  - CENS
  - Sedes
  - Comisiones
  - Docentes
  - Estudiantes
- **CRUD completo** (crear, leer, actualizar, eliminar) sobre todas las entidades anteriores.
- Búsqueda avanzada de estudiantes, docentes y comisiones.
- Generación de reportes de: estudiantes, docentes, comisiones.
- **Carga masiva y gestión de Libros Matrices** mediante archivo Excel (ver sección específica más abajo).
- Asignación de docentes a comisiones.
- Exportación de datos en CSV/Excel según filtros.

### 3. Docente

- Ver únicamente las comisiones asignadas a él/ella.
- **Notas**: cargar y editar calificaciones de cada estudiante de sus comisiones.
- **Estudiantes**:
  - Agregar nuevos alumnos a su comisión.
  - Editar datos básicos del estudiante (nombre, DNI, contacto, etc. — definir campos editables).
  - **No puede eliminar** estudiantes directamente. Si necesita dar de baja a un alumno, debe **solicitar la baja**, que queda pendiente de aprobación por un Administrador.
- **Asistencia**: registrar y consultar asistencia por fecha y por estudiante.
- **Planificación**: subir archivos de planificación (PDF, DOC, DOCX u otros formatos definidos) asociados a su comisión o materia.
- **Exportar** lista de estudiantes de su comisión en formato CSV.
- **Generar reportes** de sus comisiones (notas, asistencia, listado de alumnos).

---

## Modelos de datos

### CENS

| Campo        | Tipo     | Obligatorio | Notas                    |
|-------------|----------|-------------|--------------------------|
| id          | UUID/int | Sí          | PK                       |
| nombre      | string   | Sí          | Nombre de la escuela     |
| direccion   | string   | Sí          |                          |
| contacto    | string   | Sí          | Teléfono y/o email       |
| directora   | string   | Sí          | Nombre de la directora   |
| activo      | boolean  | Sí          | Para baja lógica         |
| created_at  | datetime | Sí          |                          |
| updated_at  | datetime | Sí          |                          |

### Sede

| Campo        | Tipo     | Obligatorio | Notas                         |
|-------------|----------|-------------|-------------------------------|
| id          | UUID/int | Sí          | PK                            |
| cens_id     | FK       | Sí          | CENS al que pertenece         |
| nombre      | string   | Sí          | Nombre o identificador sede   |
| direccion   | string   | Sí          |                               |
| activo      | boolean  | Sí          |                               |

### Comisión

| Campo        | Tipo     | Obligatorio | Notas                              |
|-------------|----------|-------------|------------------------------------|
| id          | UUID/int | Sí          | PK                                 |
| sede_id     | FK       | Sí          | Sede a la que pertenece            |
| numero      | string   | Sí          | Número de comisión                 |
| direccion   | string   | Sí          | Dirección de la comisión           |
| referente   | string   | Sí          | Nombre del referente               |
| contactos   | string/json | Sí       | Teléfonos, emails (puede ser array)|
| ciclo_lectivo | string | Sí          | Ej: 2026                           |
| activo      | boolean  | Sí          |                                    |

### Estudiante

| Campo            | Tipo     | Obligatorio | Notas                                    |
|-----------------|----------|-------------|------------------------------------------|
| id              | UUID/int | Sí          | PK                                       |
| comision_id     | FK       | Sí          | Comisión actual                          |
| apellido        | string   | Sí          |                                          |
| nombre          | string   | Sí          |                                          |
| dni             | string   | Sí          | Único en el sistema                      |
| fecha_nacimiento| date     | No          |                                          |
| direccion       | string   | No          |                                          |
| telefono        | string   | No          |                                          |
| email           | string   | No          |                                          |
| libro_matriz_id | FK       | No          | Vinculación con libro matriz si existe   |
| estado          | enum     | Sí          | activo / baja_pendiente / inactivo       |
| created_at      | datetime | Sí          |                                          |
| updated_at      | datetime | Sí          |                                          |

### Docente (Usuario con rol docente)

| Campo       | Tipo     | Obligatorio | Notas                          |
|------------|----------|-------------|--------------------------------|
| id         | UUID/int | Sí          | PK                             |
| usuario_id | FK       | Sí          | Relación con tabla usuarios    |
| apellido   | string   | Sí          |                                |
| nombre     | string   | Sí          |                                |
| dni        | string   | Sí          |                                |
| email      | string   | Sí          | Para login y notificaciones    |
| telefono   | string   | No          |                                |
| activo     | boolean  | Sí          |                                |

### Relación Docente ↔ Comisión

| Campo        | Tipo | Notas                              |
|-------------|------|------------------------------------|
| docente_id  | FK   |                                    |
| comision_id | FK   | Un docente puede tener N comisiones|

### Nota / Calificación

| Campo         | Tipo     | Notas                                    |
|--------------|----------|------------------------------------------|
| id           | UUID/int | PK                                       |
| estudiante_id| FK       |                                          |
| comision_id  | FK       |                                          |
| materia      | string   |                                          |
| trimestre    | int/enum | 1, 2, 3                                  |
| nota         | decimal  |                                          |
| observaciones| text     | Opcional                                 |
| docente_id   | FK       | Quién cargó la nota                      |
| updated_at   | datetime |                                          |

### Asistencia

| Campo         | Tipo     | Notas                                    |
|--------------|----------|------------------------------------------|
| id           | UUID/int | PK                                       |
| estudiante_id| FK       |                                          |
| comision_id  | FK       |                                          |
| fecha        | date     |                                          |
| presente     | boolean  | true = presente, false = ausente         |
| justificado  | boolean  | Opcional                                 |
| observaciones| text     | Opcional                                 |
| docente_id   | FK       | Quién registró                           |

### Archivo de Planificación

| Campo       | Tipo     | Notas                              |
|------------|----------|------------------------------------|
| id         | UUID/int | PK                                 |
| comision_id| FK       |                                    |
| docente_id | FK       |                                    |
| nombre     | string   | Nombre del archivo                 |
| archivo_url| string   | Ruta en storage                    |
| tipo       | string   | MIME type                          |
| uploaded_at| datetime |                                    |

### Solicitud de Baja de Estudiante

| Campo          | Tipo     | Notas                                      |
|---------------|----------|--------------------------------------------|
| id            | UUID/int | PK                                         |
| estudiante_id | FK       |                                            |
| docente_id    | FK       | Quién solicitó                             |
| motivo        | text     |                                            |
| estado        | enum     | pendiente / aprobada / rechazada           |
| admin_id      | FK       | Quién resolvió (nullable)                  |
| created_at    | datetime |                                            |
| resuelto_at   | datetime |                                            |

### Libro Matriz

> **Nota**: La estructura exacta de columnas se definirá al recibir el archivo Excel de referencia. El sistema debe permitir importar, actualizar y buscar registros.

| Campo (provisional) | Tipo   | Notas                                      |
|--------------------|--------|--------------------------------------------|
| id                 | UUID   | PK                                         |
| ...                | ...    | Completar según Excel de libros matrices   |

Funcionalidades del módulo Libros Matrices:
- **Importar** Excel (crear registros nuevos y actualizar existentes según clave única, ej. DNI o número de libro).
- **Buscar** por cualquier campo relevante del libro matriz.
- **Editar** registros individuales desde la interfaz.
- **Exportar** a Excel los resultados filtrados.
- Validación de formato al importar (mostrar errores por fila sin abortar toda la carga).

---

## Módulos funcionales

### Autenticación y seguridad

- Login con email/usuario y contraseña.
- Contraseñas hasheadas (bcrypt o argon2).
- Sesiones con JWT o cookies httpOnly seguras.
- **RBAC** (Role-Based Access Control): cada endpoint y vista valida el rol del usuario.
- Rate limiting en login para prevenir fuerza bruta.
- Registro de auditoría en acciones sensibles: altas, bajas, cambios de notas, aprobaciones.
- Los docentes solo acceden a datos de sus comisiones asignadas (aislamiento por scope).
- HTTPS obligatorio en producción.
- Validación y sanitización de inputs en backend.
- Protección CSRF en formularios.
- Política de contraseñas (mínimo 8 caracteres, etc.).

### Dashboard por rol

- **Admin**: resumen de usuarios, solicitudes de baja pendientes, estadísticas generales.
- **Administrativo**: accesos rápidos a carga de datos, búsquedas y reportes.
- **Docente**: sus comisiones, acceso rápido a asistencia, notas y planificaciones.

### Gestión académica (Docente)

- Vista de lista de estudiantes por comisión.
- Formulario de carga/edición de notas (por materia y trimestre).
- Calendario o selector de fecha para tomar asistencia (marcar presente/ausente en lote).
- Subida de archivos de planificación con listado y descarga.
- Botón "Solicitar baja" en ficha de estudiante (con campo motivo).
- Exportar CSV de estudiantes de la comisión.

### Reportes

| Reporte                    | Roles que lo generan      | Formato      |
|---------------------------|---------------------------|--------------|
| Listado de estudiantes    | Docente, Administrativo   | CSV / PDF    |
| Notas por comisión        | Docente, Administrativo   | PDF / Excel  |
| Asistencia por período    | Docente, Administrativo   | PDF / Excel  |
| Listado de docentes       | Administrativo, Admin     | PDF / Excel  |
| Listado de comisiones     | Administrativo, Admin     | PDF / Excel  |
| Libros matrices           | Administrativo, Admin     | Excel        |

Los reportes deben permitir filtros por: CENS, sede, comisión, ciclo lectivo, rango de fechas.

### Flujo de baja de estudiante (solicitud docente → aprobación admin)

```
Docente solicita baja → estado estudiante = "baja_pendiente"
                      → notificación al Administrador
Administrador revisa → Aprueba: estado = "inactivo"
                     → Rechaza: estado vuelve a "activo", se notifica al docente
```

---

## Requisitos técnicos sugeridos

### Stack recomendado (ajustable según preferencia)

- **Frontend**: React + TypeScript (o Next.js) con UI moderna y responsive.
- **Backend**: Node.js (Express/NestJS) o Python (FastAPI/Django).
- **Base de datos**: PostgreSQL.
- **Autenticación**: JWT con refresh tokens o sesiones seguras.
- **Storage de archivos**: almacenamiento local o S3-compatible para planificaciones.
- **Importación Excel**: librería como `xlsx` / `exceljs` (Node) o `openpyxl` / `pandas` (Python).

### Estructura de carpetas sugerida

```
/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── cens/
│   │   │   ├── sedes/
│   │   │   ├── comisiones/
│   │   │   ├── estudiantes/
│   │   │   ├── docentes/
│   │   │   ├── notas/
│   │   │   ├── asistencia/
│   │   │   ├── planificaciones/
│   │   │   ├── libros-matrices/
│   │   │   ├── reportes/
│   │   │   └── solicitudes-baja/
│   │   ├── middleware/   (auth, rbac, audit)
│   │   └── common/
│   └── migrations/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── administrativo/
│   │   │   └── docente/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/   (API clients)
└── docs/
```

---

## Criterios de aceptación

1. Un administrativo puede crear un CENS, agregar sedes, crear comisiones con todos sus datos, cargar docentes y estudiantes.
2. Un docente solo ve sus comisiones y puede cargar notas, tomar asistencia y subir planificaciones.
3. Un docente puede agregar un alumno pero no eliminarlo; la baja requiere aprobación del administrador.
4. Un administrativo puede buscar, modificar y eliminar cualquier registro.
5. Se puede importar un Excel de libros matrices, buscar y actualizar registros.
6. Los reportes se generan correctamente con filtros.
7. La exportación CSV de estudiantes funciona desde la vista del docente.
8. El sistema rechaza accesos no autorizados entre roles (ej: docente no accede a datos de otra comisión).
9. Las contraseñas no se almacenan en texto plano.
10. Existe registro de auditoría para acciones críticas.

---

## Entregables esperados

1. Aplicación web funcional con los tres roles implementados.
2. Base de datos con migraciones y datos de prueba (seed).
3. API REST documentada (Swagger/OpenAPI).
4. README con instrucciones de instalación y despliegue.
5. Tests básicos de autenticación, permisos y flujos críticos.

---

## Pendiente de definir

- [ ] **Archivo Excel de Libros Matrices**: adjuntar el archivo de referencia para mapear columnas exactas y clave única de actualización.
- [ ] Campos exactos editables por el docente en la ficha del estudiante.
- [ ] Escala de notas (numérica 1-10, conceptual, etc.).
- [ ] Materias por comisión o catálogo global de materias.
- [ ] Si hay múltiples ciclos lectivos y cómo se maneja el historial.
- [ ] Hosting y dominio de producción.

---

## Instrucción para el agente

Comenzá por:
1. Definir el esquema de base de datos completo con migraciones.
2. Implementar autenticación y RBAC.
3. Crear los CRUD de CENS → Sedes → Comisiones → Estudiantes → Docentes (en ese orden de dependencia).
4. Implementar el módulo de docente (notas, asistencia, planificaciones, solicitud de baja).
5. Implementar reportes y exportación CSV/Excel.
6. Implementar el módulo de Libros Matrices una vez que se reciba el Excel de referencia.
7. Agregar auditoría y tests de seguridad.

Priorizá código limpio, tipado fuerte, validaciones en backend y una interfaz clara y usable para usuarios no técnicos (administrativos y docentes).
