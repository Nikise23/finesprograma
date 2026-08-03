import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { memoryStorage } from 'multer';
import { TrayectoriasService } from './trayectorias.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

class ImportCalificacionesTextoDto {
  @ApiProperty({
    description: 'Texto pegado: líneas "Materia\\tNota". Opcional cabecera "APELLIDO, Nombre - DNI …"',
  })
  @IsString()
  @MinLength(3)
  texto: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apellido?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;
}

@ApiTags('trayectorias')
@ApiBearerAuth()
@Controller('trayectorias')
export class TrayectoriasController {
  constructor(private service: TrayectoriasService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  search(
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number,
  ) {
    return this.service.search(q, page, limit);
  }

  @Post('import-egresadas')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  importEgresadas(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo requerido (.xls / .xlsx)');
    }
    return this.service.importEgresadas(file.buffer, file.originalname, user.sub);
  }

  @Post('dni/:dni/calificaciones-texto')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  importCalificacionesTexto(
    @Param('dni') dni: string,
    @Body() dto: ImportCalificacionesTextoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.importCalificacionesTexto(dni, dto.texto, user.sub, {
      apellido: dto.apellido,
      nombre: dto.nombre,
    });
  }

  @Get('dni/:dni')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findByDni(@Param('dni') dni: string) {
    return this.service.findByDni(dni);
  }
}
