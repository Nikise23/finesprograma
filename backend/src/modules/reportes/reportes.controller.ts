import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private service: ReportesService) {}

  @Get('estudiantes/csv')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async estudiantesCsv(
    @Query('comisionId') comisionId: string | undefined,
    @Query('censId') censId: string | undefined,
    @Query('sedeId') sedeId: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.service.estudiantesCsv({ comisionId, censId, sedeId });
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="estudiantes.csv"' });
    res.send(csv);
  }

  @Get('estudiantes/pdf')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async estudiantesPdf(
    @Query('comisionId') comisionId: string | undefined,
    @Query('censId') censId: string | undefined,
    @Query('sedeId') sedeId: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.service.estudiantesPdf({ comisionId, censId, sedeId });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="estudiantes.pdf"' });
    res.send(buffer);
  }

  @Get('docentes/pdf')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  async docentesPdf(@Res() res: Response) {
    const buffer = await this.service.docentesPdf();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="docentes.pdf"' });
    res.send(buffer);
  }

  @Get('comisiones/pdf')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO)
  async comisionesPdf(
    @Query('censId') censId: string | undefined,
    @Query('sedeId') sedeId: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.service.comisionesPdf(censId, sedeId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="comisiones.pdf"' });
    res.send(buffer);
  }

  @Get('notas/excel')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async notasExcel(@Query('comisionId') comisionId: string, @Res() res: Response) {
    const buffer = await this.service.notasExcel(comisionId);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="notas.xlsx"' });
    res.send(buffer);
  }

  @Get('notas/pdf')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async notasPdf(@Query('comisionId') comisionId: string, @Res() res: Response) {
    const buffer = await this.service.notasPdf(comisionId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="notas.pdf"' });
    res.send(buffer);
  }

  @Get('asistencia/excel')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async asistenciaExcel(
    @Query('comisionId') comisionId: string,
    @Query('desde') desde: string | undefined,
    @Query('hasta') hasta: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.service.asistenciaExcel(comisionId, desde, hasta);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="asistencia.xlsx"' });
    res.send(buffer);
  }

  @Get('asistencia/pdf')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async asistenciaPdf(
    @Query('comisionId') comisionId: string,
    @Query('desde') desde: string | undefined,
    @Query('hasta') hasta: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.service.asistenciaPdf(comisionId, desde, hasta);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="asistencia.pdf"' });
    res.send(buffer);
  }

  @Get('trayectoria/pdf')
  @Roles(Rol.ADMIN, Rol.ADMINISTRATIVO, Rol.DOCENTE)
  async trayectoriaPdf(@Query('dni') dni: string, @Res() res: Response) {
    const buffer = await this.service.trayectoriaPdf(dni);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="trayectoria-${dni}.pdf"`,
    });
    res.send(buffer);
  }
}
