import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class SolicitudesBajaService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll(estado?: string) {
    return this.prisma.solicitudBajaEstudiante.findMany({
      where: estado ? { estado: estado as 'pendiente' | 'aprobada' | 'rechazada' } : undefined,
      include: {
        estudiante: { include: { comision: true } },
        docente: true,
        admin: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolver(id: string, aprobar: boolean, adminId: string) {
    const solicitud = await this.prisma.solicitudBajaEstudiante.findUnique({
      where: { id },
      include: { estudiante: true },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') {
      throw new NotFoundException('La solicitud ya fue resuelta');
    }

    const estado = aprobar ? 'aprobada' : 'rechazada';
    const estadoEstudiante = aprobar ? 'inactivo' : 'activo';

    await this.prisma.$transaction([
      this.prisma.solicitudBajaEstudiante.update({
        where: { id },
        data: { estado, adminId, resueltoAt: new Date() },
      }),
      this.prisma.estudiante.update({
        where: { id: solicitud.estudianteId },
        data: { estado: estadoEstudiante },
      }),
    ]);

    await this.audit.log({
      usuarioId: adminId,
      accion: aprobar ? 'APROBAR_BAJA' : 'RECHAZAR_BAJA',
      entidad: 'SolicitudBajaEstudiante',
      entidadId: id,
    });

    return { ok: true, estado };
  }
}
