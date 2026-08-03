import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import type { Response } from 'express';
import { PlanificacionesService } from './planificaciones.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('planificaciones')
@ApiBearerAuth()
@Controller('planificaciones')
export class PlanificacionesController {
  constructor(private service: PlanificacionesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  findByComision(
    @Query('comisionId') comisionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findByComision(comisionId, user);
  }

  @Post('upload')
  @Roles(Rol.DOCENTE, Rol.ADMIN, Rol.ADMINISTRATIVO)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        comisionId: { type: 'string' },
      },
    },
  })
  upload(
    @Query('comisionId') comisionId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upload(comisionId, file, user);
  }

  @Get(':id/download')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async download(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { stream, plan } = await this.service.getFileStream(id, user);
    res.set({
      'Content-Type': plan.tipo,
      'Content-Disposition': `attachment; filename="${plan.nombre}"`,
    });
    stream.pipe(res);
  }

  @Delete(':id')
  @Roles(Rol.DOCENTE, Rol.ADMIN, Rol.ADMINISTRATIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
