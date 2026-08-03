-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'ADMINISTRATIVO', 'DOCENTE');

-- CreateEnum
CREATE TYPE "EstadoEstudiante" AS ENUM ('activo', 'baja_pendiente', 'inactivo');

-- CreateEnum
CREATE TYPE "EstadoSolicitudBaja" AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cens" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "directora" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "cens_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comisiones" (
    "id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "referente" TEXT NOT NULL,
    "contactos" JSONB NOT NULL,
    "ciclo_lectivo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docente_comision" (
    "docente_id" TEXT NOT NULL,
    "comision_id" TEXT NOT NULL,

    CONSTRAINT "docente_comision_pkey" PRIMARY KEY ("docente_id","comision_id")
);

-- CreateTable
CREATE TABLE "libros_matriz" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "apellido" TEXT,
    "nombre" TEXT,
    "numero_libro" TEXT,
    "folio" TEXT,
    "datos_adicionales" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libros_matriz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes" (
    "id" TEXT NOT NULL,
    "comision_id" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "libro_matriz_id" TEXT,
    "estado" "EstadoEstudiante" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "comision_id" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "nota" DECIMAL(4,2) NOT NULL,
    "observaciones" TEXT,
    "docente_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "comision_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "justificado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "docente_id" TEXT NOT NULL,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planificaciones" (
    "id" TEXT NOT NULL,
    "comision_id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_baja" (
    "id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "docente_id" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoSolicitudBaja" NOT NULL DEFAULT 'pendiente',
    "admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_at" TIMESTAMP(3),

    CONSTRAINT "solicitudes_baja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclos_lectivos" (
    "id" TEXT NOT NULL,
    "anio" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ciclos_lectivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditorias" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_usuario_id_key" ON "docentes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_dni_key" ON "docentes"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_email_key" ON "docentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "libros_matriz_dni_key" ON "libros_matriz"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_dni_key" ON "estudiantes"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "notas_estudiante_id_comision_id_materia_trimestre_key" ON "notas"("estudiante_id", "comision_id", "materia", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_estudiante_id_comision_id_fecha_key" ON "asistencias"("estudiante_id", "comision_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_lectivos_anio_key" ON "ciclos_lectivos"("anio");

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_cens_id_fkey" FOREIGN KEY ("cens_id") REFERENCES "cens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docentes" ADD CONSTRAINT "docentes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_comision" ADD CONSTRAINT "docente_comision_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "docente_comision" ADD CONSTRAINT "docente_comision_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_libro_matriz_id_fkey" FOREIGN KEY ("libro_matriz_id") REFERENCES "libros_matriz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificaciones" ADD CONSTRAINT "planificaciones_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja" ADD CONSTRAINT "solicitudes_baja_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja" ADD CONSTRAINT "solicitudes_baja_docente_id_fkey" FOREIGN KEY ("docente_id") REFERENCES "docentes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja" ADD CONSTRAINT "solicitudes_baja_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
