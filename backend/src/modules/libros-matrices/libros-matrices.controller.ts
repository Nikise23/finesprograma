import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import type { Response } from 'express';
import { LibrosMatricesService } from './libros-matrices.service';
import {
  CreateLibroMatrizDto,
  UpdateLibroMatrizDto,
} from './dto/libro-matriz.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload';

@ApiTags('libros-matrices')
@ApiBearerAuth()
@Controller('libros-matrices')
export class LibrosMatricesController {
  constructor(private service: LibrosMatricesService) {}

  @Get()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  findAll(
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(q, page, limit);
  }

  @Get('next-posicion')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  nextPosicion() {
    return this.service.nextPosicion().then((posicion) => ({ posicion }));
  }

  @Get('export')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  async export(@Query('q') q: string | undefined, @Res() res: Response) {
    const buffer = await this.service.exportExcel(q);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="libros-matriz.xlsx"',
    });
    res.send(buffer);
  }

  @Get(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  create(@Body() dto: CreateLibroMatrizDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Post('import')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.importExcel(file.buffer, user.sub);
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLibroMatrizDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.sub);
  }
}
