import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Rol } from '@prisma/client';

import { NotasService } from './notas.service';

import { BulkNotasDto, UpsertNotaDto } from './dto/nota.dto';

import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { JwtPayload } from '../../common/types/jwt-payload';



@ApiTags('notas')

@ApiBearerAuth()

@Controller('notas')

export class NotasController {

  constructor(private service: NotasService) {}



  @Get()

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  findByComision(

    @Query('comisionId') comisionId: string,

    @Query('cuatrimestre') cuatrimestre: string | undefined,

    @CurrentUser() user: JwtPayload,

  ) {

    return this.service.findByComision(

      comisionId,

      user,

      cuatrimestre ? parseInt(cuatrimestre, 10) : undefined,

    );

  }



  @Post()

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  upsert(@Body() dto: UpsertNotaDto, @CurrentUser() user: JwtPayload) {

    return this.service.upsert(dto, user);

  }



  @Post('bulk')

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  upsertBulk(@Body() dto: BulkNotasDto, @CurrentUser() user: JwtPayload) {

    return this.service.upsertBulk(dto.notas, user);

  }

}


