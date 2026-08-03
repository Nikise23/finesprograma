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
import { CensService } from './cens.service';
import { CreateCensDto, UpdateCensDto } from './dto/cens.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('cens')
@ApiBearerAuth()
@Controller('cens')
export class CensController {
  constructor(private censService: CensService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.censService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  findOne(@Param('id') id: string) {
    return this.censService.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  create(@Body() dto: CreateCensDto, @CurrentUser() user: JwtPayload) {
    return this.censService.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCensDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.censService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.censService.remove(id, user.sub);
  }
}
