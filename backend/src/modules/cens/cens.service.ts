import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCensDto, UpdateCensDto } from './dto/cens.dto';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class CensService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll(includeInactive = false) {
    return this.prisma.cens.findMany({
      where: includeInactive ? undefined : { activo: true },
      include: { sedes: { where: includeInactive ? undefined : { activo: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const cens = await this.prisma.cens.findUnique({
      where: { id },
      include: { sedes: true },
    });
    if (!cens) throw new NotFoundException('CENS no encontrado');
    return cens;
  }

  async create(dto: CreateCensDto, userId: string) {
    const cens = await this.prisma.cens.create({ data: dto });
    await this.audit.log({
      usuarioId: userId,
      accion: 'CREATE',
      entidad: 'Cens',
      entidadId: cens.id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return cens;
  }

  async update(id: string, dto: UpdateCensDto, userId: string) {
    await this.findOne(id);
    const cens = await this.prisma.cens.update({ where: { id }, data: dto });
    await this.audit.log({
      usuarioId: userId,
      accion: 'UPDATE',
      entidad: 'Cens',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return cens;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const cens = await this.prisma.cens.update({
      where: { id },
      data: { activo: false },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'SOFT_DELETE',
      entidad: 'Cens',
      entidadId: id,
    });
    return cens;
  }
}
