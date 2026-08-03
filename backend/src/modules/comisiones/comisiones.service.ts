import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignDocenteDto,
  CreateComisionDto,
  UpdateComisionDto,
} from './dto/comision.dto';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types/jwt-payload';

@Injectable()
export class ComisionesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async getDocenteComisionIds(docenteId?: string) {
    if (!docenteId) return [];
    const links = await this.prisma.docenteComision.findMany({
      where: { docenteId },
      select: { comisionId: true },
    });
    return links.map((l) => l.comisionId);
  }

  async findAll(user: JwtPayload, sedeId?: string, includeInactive = false) {
    const where: Record<string, unknown> = {
      ...(sedeId ? { sedeId } : {}),
      ...(includeInactive ? {} : { activo: true }),
    };

    if (user.rol === Rol.DOCENTE) {
      const ids = await this.getDocenteComisionIds(user.docenteId);
      where.id = { in: ids };
    }

    return this.prisma.comision.findMany({
      where,
      include: {
        sede: { include: { cens: true } },
        modulo: true,
        docentes: { include: { docente: true, materia: true } },
        _count: { select: { estudiantes: true } },
      },
      orderBy: [{ moduloId: 'asc' }, { numero: 'asc' }],
    });
  }

  async findOne(id: string, user?: JwtPayload) {
    const comision = await this.prisma.comision.findUnique({
      where: { id },
      include: {
        sede: { include: { cens: true } },
        modulo: { include: { materias: { where: { activo: true }, orderBy: { orden: 'asc' } } } },
        docentes: { include: { docente: true, materia: true } },
        estudiantes: true,
      },
    });
    if (!comision) throw new NotFoundException('Comisión no encontrada');

    if (user?.rol === Rol.DOCENTE) {
      const ids = await this.getDocenteComisionIds(user.docenteId);
      if (!ids.includes(id)) {
        throw new ForbiddenException('No tiene acceso a esta comisión');
      }
    }
    return comision;
  }

  async create(dto: CreateComisionDto, userId: string) {
    const modulo = await this.prisma.modulo.findUnique({ where: { id: dto.moduloId } });
    if (!modulo) throw new BadRequestException('Módulo inválido');

    const comision = await this.prisma.comision.create({
      data: { ...dto, contactos: dto.contactos },
      include: { modulo: true },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'CREATE',
      entidad: 'Comision',
      entidadId: comision.id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return comision;
  }

  async update(id: string, dto: UpdateComisionDto, userId: string) {
    await this.findOne(id);
    const comision = await this.prisma.comision.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'UPDATE',
      entidad: 'Comision',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return comision;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const comision = await this.prisma.comision.update({
      where: { id },
      data: { activo: false },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'SOFT_DELETE',
      entidad: 'Comision',
      entidadId: id,
    });
    return comision;
  }

  async assignDocente(comisionId: string, dto: AssignDocenteDto, userId: string) {
    const comision = await this.findOne(comisionId);
    if (!comision.moduloId) {
      throw new BadRequestException('La comisión debe tener un módulo asignado');
    }

    if (dto.materiaId) {
      const materia = await this.prisma.materia.findUnique({ where: { id: dto.materiaId } });
      if (!materia || materia.moduloId !== comision.moduloId) {
        throw new BadRequestException('La materia no pertenece al módulo de la comisión');
      }
      const taken = await this.prisma.docenteComision.findFirst({
        where: { comisionId, materiaId: dto.materiaId, NOT: { docenteId: dto.docenteId } },
      });
      if (taken) {
        throw new BadRequestException('Esa materia ya tiene docente asignado en esta comisión');
      }
    }

    const existing = await this.prisma.docenteComision.findFirst({
      where: {
        docenteId: dto.docenteId,
        comisionId,
        materiaId: dto.materiaId ?? null,
      },
    });

    if (existing) {
      await this.prisma.docenteComision.update({
        where: { id: existing.id },
        data: {
          materiaId: dto.materiaId ?? null,
          codigo: dto.codigo ?? existing.codigo,
          horario: dto.horario ?? existing.horario,
        },
      });
    } else {
      await this.prisma.docenteComision.create({
        data: {
          docenteId: dto.docenteId,
          comisionId,
          materiaId: dto.materiaId,
          codigo: dto.codigo,
          horario: dto.horario,
        },
      });
    }

    await this.audit.log({
      usuarioId: userId,
      accion: 'ASSIGN_DOCENTE',
      entidad: 'Comision',
      entidadId: comisionId,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return this.findOne(comisionId);
  }

  async unassignDocente(comisionId: string, docenteId: string, userId: string) {
    await this.prisma.docenteComision.deleteMany({
      where: { docenteId, comisionId },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'UNASSIGN_DOCENTE',
      entidad: 'Comision',
      entidadId: comisionId,
      detalle: { docenteId },
    });
    return { ok: true };
  }
}
