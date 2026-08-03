-- CreateTable
CREATE TABLE "trayectorias_estudiantes" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodo" INTEGER NOT NULL,
    "tipo" TEXT,
    "distrito" TEXT,
    "comision_numero" TEXT NOT NULL,
    "comision_id" TEXT,
    "fecha_nacimiento" DATE,
    "sexo" TEXT,
    "libro_matriz_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trayectorias_estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trayectorias_estudiantes_dni_idx" ON "trayectorias_estudiantes"("dni");

-- CreateIndex
CREATE INDEX "trayectorias_estudiantes_apellido_nombre_idx" ON "trayectorias_estudiantes"("apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "trayectorias_estudiantes_dni_periodo_key" ON "trayectorias_estudiantes"("dni", "periodo");

-- AddForeignKey
ALTER TABLE "trayectorias_estudiantes" ADD CONSTRAINT "trayectorias_estudiantes_comision_id_fkey" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trayectorias_estudiantes" ADD CONSTRAINT "trayectorias_estudiantes_libro_matriz_id_fkey" FOREIGN KEY ("libro_matriz_id") REFERENCES "libros_matriz"("id") ON DELETE SET NULL ON UPDATE CASCADE;
