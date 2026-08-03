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
import { SedesService } from './sedes.service';
import { CreateSedeDto, UpdateSedeDto } from './dto/sede.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('sedes')
@ApiBearerAuth()
@Controller('sedes')
export class SedesController {
  constructor(private sedesService: SedesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findAll(
    @Query('censId') censId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.sedesService.findAll(censId, includeInactive === 'true');
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  findOne(@Param('id') id: string) {
    return this.sedesService.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  create(@Body() dto: CreateSedeDto, @CurrentUser() user: JwtPayload) {
    return this.sedesService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSedeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sedesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sedesService.remove(id, user.sub);
  }
}
