-- AlterEnum
ALTER TYPE "EstadoEstudiante" ADD VALUE 'historico';

-- DropForeignKey
ALTER TABLE "estudiantes" DROP CONSTRAINT "estudiantes_comision_id_fkey";

-- AlterTable
ALTER TABLE "estudiantes" ALTER COLUMN "comision_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notas_historicas" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "comision_numero" TEXT NOT NULL,
    "comision_id" TEXT,
    "distrito" TEXT,
    "periodo_label" TEXT NOT NULL,
    "orientacion" TEXT,
    "materia" TEXT NOT NULL,
    "nota" TEXT,
    "libro" TEXT,
    "folio" TEXT,
    "estado_final" TEXT,
    "fuente_archivo" TEXT NOT NULL,
    "fecha_nacimiento" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_historicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notas_historicas_dni_idx" ON "notas_historicas"("dni");

-- CreateIndex
CREATE INDEX "notas_historicas_apellido_nombre_idx" ON "notas_historicas"("apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "notas_historicas_dni_comision_numero_periodo_label_materia_key" ON "notas_historicas"("dni", "comision_numero", "periodo_label", "materia");

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_historicas" ADD CONSTRAINT "notas_historicas_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
