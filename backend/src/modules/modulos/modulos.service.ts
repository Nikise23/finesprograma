import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModulosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.modulo.findMany({
      include: {
        materias: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.modulo.findUnique({
      where: { id },
      include: {
        materias: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  findMaterias(moduloId?: number) {
    return this.prisma.materia.findMany({
      where: {
        activo: true,
        ...(moduloId ? { moduloId } : {}),
      },
      include: { modulo: true },
      orderBy: [{ moduloId: 'asc' }, { orden: 'asc' }],
    });
  }
}
