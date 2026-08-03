import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSedeDto, UpdateSedeDto } from './dto/sede.dto';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class SedesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll(censId?: string, includeInactive = false) {
    return this.prisma.sede.findMany({
      where: {
        ...(censId ? { censId } : {}),
        ...(includeInactive ? {} : { activo: true }),
      },
      include: { cens: true, comisiones: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const sede = await this.prisma.sede.findUnique({
      where: { id },
      include: { cens: true, comisiones: true },
    });
    if (!sede) throw new NotFoundException('Sede no encontrada');
    return sede;
  }

  async create(dto: CreateSedeDto, userId: string) {
    const sede = await this.prisma.sede.create({ data: dto });
    await this.audit.log({
      usuarioId: userId,
      accion: 'CREATE',
      entidad: 'Sede',
      entidadId: sede.id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return sede;
  }

  async update(id: string, dto: UpdateSedeDto, userId: string) {
    await this.findOne(id);
    const sede = await this.prisma.sede.update({ where: { id }, data: dto });
    await this.audit.log({
      usuarioId: userId,
      accion: 'UPDATE',
      entidad: 'Sede',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return sede;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const sede = await this.prisma.sede.update({
      where: { id },
      data: { activo: false },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'SOFT_DELETE',
      entidad: 'Sede',
      entidadId: id,
    });
    return sede;
  }
}
