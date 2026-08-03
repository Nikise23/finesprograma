import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateEstudianteDto,
  SolicitarBajaDto,
  UpdateEstudianteDto,
} from './dto/estudiante.dto';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types/jwt-payload';
import { ComisionesService } from '../comisiones/comisiones.service';

@Injectable()
export class EstudiantesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private comisionesService: ComisionesService,
  ) {}

  async findAll(
    user: JwtPayload,
    filters?: {
      comisionId?: string;
      q?: string;
      estado?: string;
    },
  ) {
    const where: Record<string, unknown> = {};

    if (filters?.comisionId) where.comisionId = filters.comisionId;
    if (filters?.estado) where.estado = filters.estado;
    else where.estado = { not: 'historico' };
    if (filters?.q) {
      where.OR = [
        { apellido: { contains: filters.q, mode: 'insensitive' } },
        { nombre: { contains: filters.q, mode: 'insensitive' } },
        { dni: { contains: filters.q } },
      ];
    }

    if (user.rol === Rol.DOCENTE) {
      const comisiones = await this.prisma.docenteComision.findMany({
        where: { docenteId: user.docenteId! },
        select: { comisionId: true },
      });
      const ids = comisiones.map((c) => c.comisionId);
      where.comisionId = filters?.comisionId
        ? ids.includes(filters.comisionId)
          ? filters.comisionId
          : '__none__'
        : { in: ids };
    }

    return this.prisma.estudiante.findMany({
      where,
      include: {
        comision: { include: { sede: { include: { cens: true } } } },
        libroMatriz: true,
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    });
  }

  async findOne(id: string, user?: JwtPayload) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id },
      include: {
        comision: { include: { sede: { include: { cens: true } } } },
        libroMatriz: true,
        notas: true,
        asistencias: { take: 30, orderBy: { fecha: 'desc' } },
      },
    });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    if (user?.rol === Rol.DOCENTE && estudiante.comisionId) {
      await this.comisionesService.findOne(estudiante.comisionId, user);
    }
    return estudiante;
  }

  async create(dto: CreateEstudianteDto, user: JwtPayload) {
    if (user.rol === Rol.DOCENTE) {
      if (!dto.comisionId) throw new ForbiddenException('Debe indicar comisión');
      await this.comisionesService.findOne(dto.comisionId, user);
    }

    const existing = await this.prisma.estudiante.findUnique({
      where: { dni: dto.dni },
    });
    if (existing) throw new ConflictException('Ya existe un estudiante con ese DNI');

    const estudiante = await this.prisma.estudiante.create({
      data: {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : undefined,
      },
    });
    await this.audit.log({
      usuarioId: user.sub,
      accion: 'CREATE',
      entidad: 'Estudiante',
      entidadId: estudiante.id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return estudiante;
  }

  async update(id: string, dto: UpdateEstudianteDto, user: JwtPayload) {
    const current = await this.findOne(id, user);

    if (user.rol === Rol.DOCENTE) {
      const allowed: (keyof UpdateEstudianteDto)[] = [
        'apellido',
        'nombre',
        'dni',
        'fechaNacimiento',
        'direccion',
        'telefono',
        'email',
      ];
      const keys = Object.keys(dto);
      if (keys.some((k) => !allowed.includes(k as keyof UpdateEstudianteDto))) {
        throw new ForbiddenException('El docente no puede modificar esos campos');
      }
    }

    if (dto.dni && dto.dni !== current.dni) {
      const dup = await this.prisma.estudiante.findUnique({ where: { dni: dto.dni } });
      if (dup) throw new ConflictException('Ya existe un estudiante con ese DNI');
    }

    const estudiante = await this.prisma.estudiante.update({
      where: { id },
      data: {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : undefined,
      },
    });
    await this.audit.log({
      usuarioId: user.sub,
      accion: 'UPDATE',
      entidad: 'Estudiante',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });
    return estudiante;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const estudiante = await this.prisma.estudiante.update({
      where: { id },
      data: { estado: 'inactivo' },
    });
    await this.audit.log({
      usuarioId: userId,
      accion: 'SOFT_DELETE',
      entidad: 'Estudiante',
      entidadId: id,
    });
    return estudiante;
  }

  async solicitarBaja(id: string, dto: SolicitarBajaDto, user: JwtPayload) {
    const estudiante = await this.findOne(id, user);
    if (!user.docenteId) {
      throw new ForbiddenException('Solo docentes pueden solicitar bajas');
    }

    await this.prisma.$transaction([
      this.prisma.estudiante.update({
        where: { id },
        data: { estado: 'baja_pendiente' },
      }),
      this.prisma.solicitudBajaEstudiante.create({
        data: {
          estudianteId: id,
          docenteId: user.docenteId,
          motivo: dto.motivo,
        },
      }),
    ]);

    await this.audit.log({
      usuarioId: user.sub,
      accion: 'SOLICITAR_BAJA',
      entidad: 'Estudiante',
      entidadId: id,
      detalle: dto as unknown as Record<string, unknown>,
    });

    return { ok: true, estudianteId: id, estado: 'baja_pendiente' };
  }

  async exportCsv(user: JwtPayload, comisionId?: string) {
    const estudiantes = await this.findAll(user, { comisionId });
    const header = 'apellido,nombre,dni,telefono,email,estado,comision';
    const rows = estudiantes.map((e) =>
      [
        e.apellido,
        e.nombre,
        e.dni,
        e.telefono ?? '',
        e.email ?? '',
        e.estado,
        e.comision?.numero ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  async importSpreadsheet(comisionId: string, buffer: Buffer, user: JwtPayload) {
    await this.comisionesService.findOne(comisionId, user);

    const XLSX = await import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const normHeader = (k: string) =>
      k
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        map[normHeader(String(k))] = String(v ?? '').trim();
      }

      const apellido =
        map.apellido || map.apellidos || map.surname || '';
      const nombre =
        map.nombre || map.nombres || map.name || map.firstname || '';
      const dniRaw =
        map.dni || map.documento || map.nrodocumento || map.doc || '';
      const dni = dniRaw.replace(/\D/g, '');
      const telefono = map.telefono || map.celular || map.tel || undefined;
      const email = map.email || map.correo || undefined;

      if (!dni || !apellido || !nombre) {
        skipped++;
        errors.push(`Fila ${i + 2}: faltan apellido/nombre/dni`);
        continue;
      }

      try {
        const existing = await this.prisma.estudiante.findUnique({ where: { dni } });
        if (existing) {
          await this.prisma.estudiante.update({
            where: { id: existing.id },
            data: {
              apellido,
              nombre,
              comisionId,
              telefono: telefono || existing.telefono,
              email: email || existing.email,
              estado: existing.estado === 'historico' ? 'activo' : existing.estado,
            },
          });
          updated++;
        } else {
          await this.prisma.estudiante.create({
            data: {
              apellido,
              nombre,
              dni,
              comisionId,
              telefono: telefono || null,
              email: email || null,
              estado: 'activo',
            },
          });
          created++;
        }
      } catch (e) {
        skipped++;
        errors.push(`Fila ${i + 2} DNI ${dni}: ${(e as Error).message}`);
      }
    }

    await this.audit.log({
      usuarioId: user.sub,
      accion: 'IMPORT_ESTUDIANTES',
      entidad: 'Comision',
      entidadId: comisionId,
      detalle: { created, updated, skipped },
    });

    return { created, updated, skipped, errors: errors.slice(0, 20) };
  }
}
