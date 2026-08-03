import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { ComisionesService } from './comisiones.service';
import {
  AssignDocenteDto,
  CreateComisionDto,
  UpdateComisionDto,
} from './dto/comision.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('comisiones')
@ApiBearerAuth()
@Controller('comisiones')
export class ComisionesController {
  constructor(private comisionesService: ComisionesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('sedeId') sedeId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.comisionesService.findAll(user, sedeId, includeInactive === 'true');
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.comisionesService.findOne(id, user);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  create(@Body() dto: CreateComisionDto, @CurrentUser() user: JwtPayload) {
    return this.comisionesService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.comisionesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.comisionesService.remove(id, user.sub);
  }

  @Post(':id/docentes')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  assignDocente(
    @Param('id') id: string,
    @Body() dto: AssignDocenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.comisionesService.assignDocente(id, dto, user.sub);
  }

  @Delete(':id/docentes/:docenteId')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  unassignDocente(
    @Param('id') id: string,
    @Param('docenteId') docenteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.comisionesService.unassignDocente(id, docenteId, user.sub);
  }
}
