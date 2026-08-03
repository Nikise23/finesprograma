import {

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { Rol } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { UpsertNotaDto } from './dto/nota.dto';

import { AuditService } from '../../common/services/audit.service';

import type { JwtPayload } from '../../common/types/jwt-payload';

import { ComisionesService } from '../comisiones/comisiones.service';



@Injectable()

export class NotasService {

  constructor(

    private prisma: PrismaService,

    private audit: AuditService,

    private comisionesService: ComisionesService,

  ) {}



  private async assertComisionAccess(comisionId: string, user: JwtPayload) {

    if (user.rol === Rol.DOCENTE) {

      await this.comisionesService.findOne(comisionId, user);

    }

  }



  async findByComision(comisionId: string, user: JwtPayload, cuatrimestre?: number) {

    await this.assertComisionAccess(comisionId, user);

    return this.prisma.nota.findMany({

      where: {

        comisionId,

        ...(cuatrimestre ? { cuatrimestre } : {}),

      },

      include: {

        estudiante: { select: { id: true, apellido: true, nombre: true, dni: true } },

        docente: { select: { apellido: true, nombre: true } },

      },

      orderBy: [{ estudiante: { apellido: 'asc' } }, { materia: 'asc' }],

    });

  }



  async upsert(dto: UpsertNotaDto, user: JwtPayload) {

    await this.assertComisionAccess(dto.comisionId, user);

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



    if (!docenteId) {

      throw new NotFoundException('No hay docente asignado a la comisión');

    }



    const nota = await this.prisma.nota.upsert({

      where: {

        estudianteId_comisionId_materia_cuatrimestre: {

          estudianteId: dto.estudianteId,

          comisionId: dto.comisionId,

          materia: dto.materia,

          cuatrimestre: dto.cuatrimestre,

        },

      },

      create: {

        ...dto,

        docenteId,

      },

      update: {

        nota: dto.nota,

        observaciones: dto.observaciones,

        docenteId,

      },

    });



    await this.audit.log({

      usuarioId: user.sub,

      accion: 'UPSERT_NOTA',

      entidad: 'Nota',

      entidadId: nota.id,

      detalle: { nota: dto.nota, materia: dto.materia },

    });



    return nota;

  }



  async upsertBulk(notas: UpsertNotaDto[], user: JwtPayload) {

    const results = [];

    for (const dto of notas) {

      results.push(await this.upsert(dto, user));

    }

    return results;

  }

}


