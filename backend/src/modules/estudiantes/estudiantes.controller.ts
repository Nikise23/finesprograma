import {

  Controller,

  Get,

  Post,

  Patch,

  Delete,

  Body,

  Param,

  Query,

  Header,

  UploadedFile,

  UseInterceptors,

  BadRequestException,

} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { Rol } from '@prisma/client';

import { memoryStorage } from 'multer';

import { EstudiantesService } from './estudiantes.service';

import {

  CreateEstudianteDto,

  SolicitarBajaDto,

  UpdateEstudianteDto,

} from './dto/estudiante.dto';

import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import type { JwtPayload } from '../../common/types/jwt-payload';



@ApiTags('estudiantes')

@ApiBearerAuth()

@Controller('estudiantes')

export class EstudiantesController {

  constructor(private estudiantesService: EstudiantesService) {}



  @Get()

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  findAll(

    @CurrentUser() user: JwtPayload,

    @Query('comisionId') comisionId?: string,

    @Query('q') q?: string,

    @Query('estado') estado?: string,

  ) {

    return this.estudiantesService.findAll(user, { comisionId, q, estado });

  }



  @Get('export/csv')

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  @Header('Content-Type', 'text/csv')

  @Header('Content-Disposition', 'attachment; filename="estudiantes.csv"')

  exportCsv(

    @CurrentUser() user: JwtPayload,

    @Query('comisionId') comisionId?: string,

  ) {

    return this.estudiantesService.exportCsv(user, comisionId);

  }



  @Post('import')

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))

  @ApiConsumes('multipart/form-data')

  @ApiBody({

    schema: {

      type: 'object',

      properties: { file: { type: 'string', format: 'binary' } },

    },

  })

  importFile(

    @Query('comisionId') comisionId: string,

    @UploadedFile() file: Express.Multer.File,

    @CurrentUser() user: JwtPayload,

  ) {

    if (!comisionId) throw new BadRequestException('comisionId requerido');

    if (!file?.buffer) throw new BadRequestException('Archivo requerido (.csv o .xlsx)');

    return this.estudiantesService.importSpreadsheet(comisionId, file.buffer, user);

  }



  @Get(':id')

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {

    return this.estudiantesService.findOne(id, user);

  }



  @Post()

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  create(@Body() dto: CreateEstudianteDto, @CurrentUser() user: JwtPayload) {

    return this.estudiantesService.create(dto, user);

  }



  @Patch(':id')

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)

  update(

    @Param('id') id: string,

    @Body() dto: UpdateEstudianteDto,

    @CurrentUser() user: JwtPayload,

  ) {

    return this.estudiantesService.update(id, dto, user);

  }



  @Delete(':id')

  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)

  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {

    return this.estudiantesService.remove(id, user.sub);

  }



  @Post(':id/solicitar-baja')

  @Roles(Rol.DOCENTE)

  solicitarBaja(

    @Param('id') id: string,

    @Body() dto: SolicitarBajaDto,

    @CurrentUser() user: JwtPayload,

  ) {

    return this.estudiantesService.solicitarBaja(id, dto, user);

  }

}


