import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrarAsistenciaDto } from './dto/asistencia.dto';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types/jwt-payload';
import { ComisionesService } from '../comisiones/comisiones.service';

@Injectable()
export class AsistenciaService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private comisionesService: ComisionesService,
  ) {}

  async findByComision(comisionId: string, user: JwtPayload, desde?: string, hasta?: string) {
    if (user.rol === Rol.DOCENTE) {
      await this.comisionesService.findOne(comisionId, user);
    }

    return this.prisma.asistencia.findMany({
      where: {
        comisionId,
        ...(desde || hasta
          ? {
              fecha: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      include: {
        estudiante: { select: { id: true, apellido: true, nombre: true, dni: true } },
      },
      orderBy: [{ fecha: 'desc' }, { estudiante: { apellido: 'asc' } }],
    });
  }

  async registrar(dto: RegistrarAsistenciaDto, user: JwtPayload) {
    if (user.rol === Rol.DOCENTE) {
      await this.comisionesService.findOne(dto.comisionId, user);
    }
    if (!user.docenteId && user.rol === Rol.DOCENTE) {
      throw new ForbiddenException('Docente no identificado');
    }

    const docenteId =
      user.rol === Rol.DOCENTE
        ? user.docenteId!
        : (
            await this.prisma.docenteComision.findFirst({
              where: { comisionId: dto.comisionId },
            })
          )?.docenteId;

    if (!docenteId) throw new ForbiddenException('No hay docente asignado');

    const fecha = new Date(dto.fecha);
    const results = [];

    for (const reg of dto.registros) {
      const item = await this.prisma.asistencia.upsert({
        where: {
          estudianteId_comisionId_fecha: {
            estudianteId: reg.estudianteId,
            comisionId: dto.comisionId,
            fecha,
          },
        },
        create: {
          estudianteId: reg.estudianteId,
          comisionId: dto.comisionId,
          fecha,
          presente: reg.presente,
          justificado: reg.justificado ?? false,
          observaciones: reg.observaciones,
          docenteId,
        },
        update: {
          presente: reg.presente,
          justificado: reg.justificado ?? false,
          observaciones: reg.observaciones,
          docenteId,
        },
      });
      results.push(item);
    }

    await this.audit.log({
      usuarioId: user.sub,
      accion: 'REGISTRAR_ASISTENCIA',
      entidad: 'Asistencia',
      entidadId: dto.comisionId,
      detalle: { fecha: dto.fecha, cantidad: results.length },
    });

    return results;
  }
}
