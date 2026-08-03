import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { ModulosService } from './modulos.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('modulos')
@ApiBearerAuth()
@Controller('modulos')
export class ModulosController {
  constructor(private modulosService: ModulosService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findAll() {
    return this.modulosService.findAll();
  }

  @Get('materias')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findMaterias(@Query('moduloId') moduloId?: string) {
    const id = moduloId ? parseInt(moduloId, 10) : undefined;
    return this.modulosService.findMaterias(id);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.modulosService.findOne(id);
  }
}
