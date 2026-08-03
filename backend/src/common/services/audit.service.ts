import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: {
    usuarioId?: string;
    accion: string;
    entidad: string;
    entidadId?: string;
    detalle?: Record<string, unknown>;
    ip?: string;
  }) {
    await this.prisma.auditoria.create({
      data: {
        usuarioId: params.usuarioId,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId,
        detalle: (params.detalle as Prisma.InputJsonValue) ?? undefined,
        ip: params.ip,
      },
    });
    this.logger.log(`${params.accion} on ${params.entidad}:${params.entidadId ?? '-'}`);
  }
}
