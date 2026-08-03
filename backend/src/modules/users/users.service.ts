import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(opts?: { rol?: Rol; q?: string }) {
    const q = opts?.q?.trim();
    const where: Prisma.UsuarioWhereInput = {
      ...(opts?.rol ? { rol: opts.rol } : {}),
      ...(q ? { email: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [items, total, activos, inactivos] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: {
          id: true,
          email: true,
          rol: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
          docente: { select: { id: true, apellido: true, nombre: true, dni: true } },
        },
        orderBy: { email: 'asc' },
      }),
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.count({ where: { ...where, activo: true } }),
      this.prisma.usuario.count({ where: { ...where, activo: false } }),
    ]);

    return { items, total, activos, inactivos };
  }

  async create(dto: CreateUserDto, adminId: string) {
    const email = dto.email.toLowerCase();
    const exists = await this.prisma.usuario.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.usuario.create({
      data: { email, passwordHash, rol: dto.rol, activo: true },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await this.audit.log({
      usuarioId: adminId,
      accion: 'CREATE',
      entidad: 'Usuario',
      entidadId: user.id,
      detalle: { email, rol: dto.rol },
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, adminId: string) {
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const dup = await this.prisma.usuario.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (dup) throw new ConflictException('Ya existe un usuario con ese email');
    }

    const data: Prisma.UsuarioUpdateInput = {};
    if (dto.activo !== undefined) data.activo = dto.activo;
    if (dto.email) data.email = dto.email.toLowerCase();
    if (dto.rol) data.rol = dto.rol;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await this.audit.log({
      usuarioId: adminId,
      accion: 'UPDATE',
      entidad: 'Usuario',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return user;
  }

  async remove(id: string, adminId: string) {
    if (id === adminId) {
      throw new BadRequestException('No podés eliminar tu propio usuario');
    }
    const existing = await this.prisma.usuario.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.usuario.delete({ where: { id } });
    await this.audit.log({
      usuarioId: adminId,
      accion: 'DELETE',
      entidad: 'Usuario',
      entidadId: id,
      detalle: { email: existing.email, rol: existing.rol },
    });
    return { ok: true };
  }
}
