/*
  Warnings:

  - You are about to drop the column `datos_adicionales` on the `libros_matriz` table. All the data in the column will be lost.
  - You are about to drop the column `folio` on the `libros_matriz` table. All the data in the column will be lost.
  - You are about to drop the column `numero_libro` on the `libros_matriz` table. All the data in the column will be lost.
  - Made the column `apellido` on table `libros_matriz` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nombre` on table `libros_matriz` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "libros_matriz" DROP COLUMN "datos_adicionales",
DROP COLUMN "folio",
DROP COLUMN "numero_libro",
ADD COLUMN     "libro_folio" TEXT,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "posicion" INTEGER,
ALTER COLUMN "apellido" SET NOT NULL,
ALTER COLUMN "nombre" SET NOT NULL;

-- CreateIndex
CREATE INDEX "libros_matriz_apellido_nombre_idx" ON "libros_matriz"("apellido", "nombre");
