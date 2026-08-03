import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async stats(@CurrentUser() user: JwtPayload) {
    if (user.rol === Rol.DOCENTE) {
      const comisionIds = (
        await this.prisma.docenteComision.findMany({
          where: { docenteId: user.docenteId! },
          select: { comisionId: true },
        })
      ).map((c) => c.comisionId);

      const [comisiones, estudiantes] = await Promise.all([
        this.prisma.comision.count({ where: { id: { in: comisionIds }, activo: true } }),
        this.prisma.estudiante.count({
          where: { comisionId: { in: comisionIds }, estado: 'activo' },
        }),
      ]);

      return { comisiones, estudiantes };
    }

    const [cens, sedes, comisiones, estudiantes, docentes, solicitudesPendientes] =
      await Promise.all([
        this.prisma.cens.count({ where: { activo: true } }),
        this.prisma.sede.count({ where: { activo: true } }),
        this.prisma.comision.count({ where: { activo: true } }),
        this.prisma.estudiante.count({ where: { estado: 'activo' } }),
        this.prisma.docente.count({ where: { activo: true } }),
        user.rol === Rol.ADMIN
          ? this.prisma.solicitudBajaEstudiante.count({ where: { estado: 'pendiente' } })
          : Promise.resolve(0),
      ]);

    return { cens, sedes, comisiones, estudiantes, docentes, solicitudesPendientes };
  }
}
