import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { DocentesService } from './docentes.service';
import { CreateDocenteDto, UpdateDocenteDto } from './dto/docente.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('docentes')
@ApiBearerAuth()
@Controller('docentes')
export class DocentesController {
  constructor(private docentesService: DocentesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  findAll(
    @Query('q') q?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('comisionId') comisionId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number,
  ) {
    return this.docentesService.findAll({
      q,
      includeInactive: includeInactive === 'true',
      comisionId,
      page,
      limit,
    });
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  findOne(@Param('id') id: string) {
    return this.docentesService.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  create(@Body() dto: CreateDocenteDto, @CurrentUser() user: JwtPayload) {
    return this.docentesService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocenteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.docentesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.docentesService.remove(id, user.sub);
  }
}
