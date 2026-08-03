import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { AsistenciaService } from './asistencia.service';
import { RegistrarAsistenciaDto } from './dto/asistencia.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('asistencia')
@ApiBearerAuth()
@Controller('asistencia')
export class AsistenciaController {
  constructor(private service: AsistenciaService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findByComision(
    @Query('comisionId') comisionId: string,
    @Query('desde') desde: string | undefined,
    @Query('hasta') hasta: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByComision(comisionId, user, desde, hasta);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  registrar(@Body() dto: RegistrarAsistenciaDto, @CurrentUser() user: JwtPayload) {
    return this.service.registrar(dto, user);
  }
}
