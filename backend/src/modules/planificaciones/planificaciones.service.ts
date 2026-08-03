import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Rol } from '@prisma/client';
import { createReadStream, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import type { JwtPayload } from '../../common/types/jwt-payload';
import { ComisionesService } from '../comisiones/comisiones.service';

@Injectable()
export class PlanificacionesService {
  private uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private comisionesService: ComisionesService,
    private config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
  }

  async findByComision(comisionId: string, user: JwtPayload) {
    if (user.rol === Rol.DOCENTE) {
      await this.comisionesService.findOne(comisionId, user);
    }
    return this.prisma.planificacion.findMany({
      where: { comisionId },
      include: { docente: { select: { apellido: true, nombre: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async upload(
    comisionId: string,
    file: Express.Multer.File,
    user: JwtPayload,
  ) {
    await this.comisionesService.findOne(comisionId, user);

    let docenteId: string | undefined = user.docenteId;
    if (!docenteId) {
      const link = await this.prisma.docenteComision.findFirst({
        where: { comisionId },
      });
      docenteId = link?.docenteId;
    }
    if (!docenteId) throw new NotFoundException('No hay docente asignado a la comisión');

    const ext = extname(file.originalname);
    const filename = `${Date.now()}-${comisionId.slice(0, 8)}${ext}`;
    const filepath = join(this.uploadDir, filename);
    const { writeFileSync } = await import('fs');
    writeFileSync(filepath, file.buffer);

    const plan = await this.prisma.planificacion.create({
      data: {
        comisionId,
        docenteId,
        nombre: file.originalname,
        archivoUrl: filename,
        tipo: file.mimetype,
      },
    });

    await this.audit.log({
      usuarioId: user.sub,
      accion: 'UPLOAD_PLANIFICACION',
      entidad: 'Planificacion',
      entidadId: plan.id,
    });

    return plan;
  }

  async getFileStream(id: string, user: JwtPayload) {
    const plan = await this.prisma.planificacion.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Archivo no encontrado');
    await this.comisionesService.findOne(plan.comisionId, user);

    const filepath = join(this.uploadDir, plan.archivoUrl);
    if (!existsSync(filepath)) throw new NotFoundException('Archivo no encontrado en disco');
    return { stream: createReadStream(filepath), plan };
  }

  async remove(id: string, user: JwtPayload) {
    const plan = await this.prisma.planificacion.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('No encontrado');
    await this.comisionesService.findOne(plan.comisionId, user);
    await this.prisma.planificacion.delete({ where: { id } });
    await this.audit.log({
      usuarioId: user.sub,
      accion: 'DELETE_PLANIFICACION',
      entidad: 'Planificacion',
      entidadId: id,
    });
    return { ok: true };
  }
}
