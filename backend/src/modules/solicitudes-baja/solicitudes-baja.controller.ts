import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { SolicitudesBajaService } from './solicitudes-baja.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ResolverSolicitudDto {
  @ApiProperty()
  @IsBoolean()
  aprobar: boolean;
}

@ApiTags('solicitudes-baja')
@ApiBearerAuth()
@Controller('solicitudes-baja')
export class SolicitudesBajaController {
  constructor(private service: SolicitudesBajaService) {}

  @Get()
  @Roles(Rol.ADMIN)
  findAll(@Query('estado') estado?: string) {
    return this.service.findAll(estado);
  }

  @Post(':id/resolver')
  @Roles(Rol.ADMIN)
  resolver(
    @Param('id') id: string,
    @Body() dto: ResolverSolicitudDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resolver(id, dto.aprobar, user.sub);
  }
}
