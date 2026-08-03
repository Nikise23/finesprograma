import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocenteDto, UpdateDocenteDto } from './dto/docente.dto';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class DocentesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(filters: {
    q?: string;
    includeInactive?: boolean;
    comisionId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 25;

    const where = {
      ...(filters.includeInactive ? {} : { activo: true }),
      ...(filters.comisionId
        ? { comisiones: { some: { comisionId: filters.comisionId } } }
        : {}),
      ...(filters.q
        ? {
            OR: [
              { apellido: { contains: filters.q, mode: 'insensitive' as const } },
              { nombre: { contains: filters.q, mode: 'insensitive' as const } },
              { dni: { contains: filters.q } },
              { email: { contains: filters.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.docente.findMany({
        where,
        include: {
          comisiones: {
            include: { comision: { include: { sede: { include: { cens: true } } } } },
          },
        },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.docente.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const docente = await this.prisma.docente.findUnique({
      where: { id },
      include: {
        comisiones: { include: { comision: true } },
        usuario: { select: { id: true, email: true, activo: true, rol: true } },
      },
    });
    if (!docente) throw new NotFoundException('Docente no encontrado');
    return docente;
  }

  async create(dto: CreateDocenteDto, userId: string) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.usuario.findUnique({ where: { email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const docente = await this.prisma.docente.create({
      data: {
        apellido: dto.apellido,
        nombre: dto.nombre,
        dni: dto.dni,
        email,
        telefono: dto.telefono,
        usuario: {
          create: {
            email,
            passwordHash,
            rol: Rol.DOCENTE,
          },
        },
      },
      include: { usuario: true },
    });

    await this.audit.log({
      usuarioId: userId,
      accion: 'CREATE',
      entidad: 'Docente',
      entidadId: docente.id,
      detalle: { email, dni: dto.dni },
    });
    return docente;
  }

  async update(id: string, dto: UpdateDocenteDto, userId: string) {
    const current = await this.findOne(id);
    const data: Record<string, unknown> = {
      apellido: dto.apellido,
      nombre: dto.nombre,
      dni: dto.dni,
      telefono: dto.telefono,
      activo: dto.activo,
      email: dto.email?.toLowerCase(),
    };

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    if (dto.password) {
      await this.prisma.usuario.update({
        where: { id: current.usuarioId },
        data: { passwordHash: await bcrypt.hash(dto.password, 10) },
      });
    }

    if (dto.email) {
      await this.prisma.usuario.update({
        where: { id: current.usuarioId },
        data: { email: dto.email.toLowerCase() },
      });
    }

    if (dto.activo !== undefined) {
      await this.prisma.usuario.update({
        where: { id: current.usuarioId },
        data: { activo: dto.activo },
      });
    }

    const docente = await this.prisma.docente.update({
      where: { id },
      data,
      include: {
        comisiones: { include: { comision: true } },
      },
    });

    await this.audit.log({
      usuarioId: userId,
      accion: 'UPDATE',
      entidad: 'Docente',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return docente;
  }

  async remove(id: string, userId: string) {
    const docente = await this.findOne(id);
    await this.prisma.docente.update({ where: { id }, data: { activo: false } });
    await this.prisma.usuario.update({
      where: { id: docente.usuarioId },
      data: { activo: false },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'SOFT_DELETE',
      entidad: 'Docente',
      entidadId: id,
    });
    return { ok: true };
  }
}
