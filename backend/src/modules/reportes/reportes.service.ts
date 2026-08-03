import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPdf, pdfTable } from '../../common/utils/pdf.util';
import { TrayectoriasService } from '../trayectorias/trayectorias.service';

@Injectable()
export class ReportesService {
  constructor(
    private prisma: PrismaService,
    private trayectoriasService: TrayectoriasService,
  ) {}

  private async getEstudiantes(filters: {
    comisionId?: string;
    censId?: string;
    sedeId?: string;
  }) {
    const where: Record<string, unknown> = { estado: 'activo' };
    if (filters.comisionId) where.comisionId = filters.comisionId;
    if (filters.sedeId) where.comision = { sedeId: filters.sedeId };
    if (filters.censId) where.comision = { sede: { censId: filters.censId } };

    return this.prisma.estudiante.findMany({
      where,
      include: {
        comision: { include: { sede: { include: { cens: true } } } },
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    });
  }

  async estudiantesCsv(filters: {
    comisionId?: string;
    censId?: string;
    sedeId?: string;
  }) {
    const items = await this.getEstudiantes(filters);
    const header = 'cens,sede,comision,apellido,nombre,dni,telefono,email,estado';
    const rows = items.map((e) =>
      [
        e.comision?.sede?.cens?.nombre ?? '',
        e.comision?.sede?.nombre ?? '',
        e.comision?.numero ?? '',
        e.apellido,
        e.nombre,
        e.dni,
        e.telefono ?? '',
        e.email ?? '',
        e.estado,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  async estudiantesPdf(filters: {
    comisionId?: string;
    censId?: string;
    sedeId?: string;
  }) {
    const items = await this.getEstudiantes(filters);
    return buildPdf((doc) => {
      pdfTable(
        doc,
        ['Apellido', 'Nombre', 'DNI', 'Comisión', 'CENS'],
        items.map((e) => [
          e.apellido,
          e.nombre,
          e.dni,
          e.comision?.numero ?? '—',
          e.comision?.sede?.cens?.nombre ?? '—',
        ]),
        { title: 'Listado de Estudiantes — FINES Adultos' },
      );
    });
  }

  async docentesPdf() {
    const docentes = await this.prisma.docente.findMany({
      where: { activo: true },
      include: { comisiones: { include: { comision: { include: { sede: true } } } } },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    });
    return buildPdf((doc) => {
      pdfTable(
        doc,
        ['Apellido', 'Nombre', 'DNI', 'Email', 'Comisiones'],
        docentes.map((d) => [
          d.apellido,
          d.nombre,
          d.dni,
          d.email,
          d.comisiones.map((c) => c.comision.numero).join(', ') || '—',
        ]),
        { title: 'Listado de Docentes — FINES Adultos' },
      );
    });
  }

  async comisionesPdf(censId?: string, sedeId?: string) {
    const comisiones = await this.prisma.comision.findMany({
      where: {
        activo: true,
        ...(sedeId ? { sedeId } : {}),
        ...(censId ? { sede: { censId } } : {}),
      },
      include: {
        sede: { include: { cens: true } },
        _count: { select: { estudiantes: true } },
        docentes: { include: { docente: true } },
      },
      orderBy: { numero: 'asc' },
    });
    return buildPdf((doc) => {
      pdfTable(
        doc,
        ['Comisión', 'CENS', 'Sede', 'Referente', 'Alumnos', 'Docentes'],
        comisiones.map((c) => [
          c.numero,
          c.sede.cens.nombre,
          c.sede.nombre,
          c.referente,
          String(c._count.estudiantes),
          c.docentes.map((d) => `${d.docente.apellido}`).join(', ') || '—',
        ]),
        { title: 'Listado de Comisiones — FINES Adultos' },
      );
    });
  }

  async notasExcel(comisionId: string) {
    const comision = await this.prisma.comision.findUnique({
      where: { id: comisionId },
      include: { sede: { include: { cens: true } } },
    });
    const notas = await this.prisma.nota.findMany({
      where: { comisionId },
      include: { estudiante: true },
      orderBy: [{ estudiante: { apellido: 'asc' } }, { materia: 'asc' }],
    });

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Notas');
    sheet.addRow([
      'CENS', 'Sede', 'Comisión', 'Apellido', 'Nombre', 'DNI',
      'Materia', 'Cuatrimestre', 'Nota', 'Observaciones',
    ]);
    notas.forEach((n) =>
      sheet.addRow([
        comision?.sede.cens.nombre, comision?.sede.nombre, comision?.numero,
        n.estudiante.apellido, n.estudiante.nombre, n.estudiante.dni,
        n.materia, n.cuatrimestre, Number(n.nota), n.observaciones ?? '',
      ]),
    );
    sheet.getRow(1).font = { bold: true };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async notasPdf(comisionId: string) {
    const comision = await this.prisma.comision.findUnique({
      where: { id: comisionId },
      include: { sede: { include: { cens: true } } },
    });
    const notas = await this.prisma.nota.findMany({
      where: { comisionId },
      include: { estudiante: true },
      orderBy: [{ estudiante: { apellido: 'asc' } }, { materia: 'asc' }],
    });
    return buildPdf((doc) => {
      pdfTable(
        doc,
        ['Alumno', 'DNI', 'Materia', 'Trim.', 'Nota'],
        notas.map((n) => [
          `${n.estudiante.apellido}, ${n.estudiante.nombre}`,
          n.estudiante.dni,
          n.materia,
          String(n.cuatrimestre),
          String(Number(n.nota)),
        ]),
        {
          title: `Notas — Comisión ${comision?.numero ?? ''} (${comision?.sede.cens.nombre ?? ''})`,
        },
      );
    });
  }

  async asistenciaExcel(comisionId: string, desde?: string, hasta?: string) {
    const asistencias = await this.getAsistencias(comisionId, desde, hasta);
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Asistencia');
    sheet.addRow(['Fecha', 'Comisión', 'Apellido', 'Nombre', 'DNI', 'Presente', 'Justificado', 'Observaciones']);
    asistencias.forEach((a) =>
      sheet.addRow([
        a.fecha.toISOString().slice(0, 10), a.comision.numero,
        a.estudiante.apellido, a.estudiante.nombre, a.estudiante.dni,
        a.presente ? 'Sí' : 'No', a.justificado ? 'Sí' : 'No', a.observaciones ?? '',
      ]),
    );
    sheet.getRow(1).font = { bold: true };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private getAsistencias(comisionId: string, desde?: string, hasta?: string) {
    return this.prisma.asistencia.findMany({
      where: {
        comisionId,
        ...(desde || hasta
          ? {
              fecha: {
                ...(desde ? { gte: new Date(desde) } : {}),
                ...(hasta ? { lte: new Date(hasta) } : {}),
              },
            }
          : {}),
      },
      include: { estudiante: true, comision: true },
      orderBy: [{ fecha: 'asc' }, { estudiante: { apellido: 'asc' } }],
    });
  }

  async asistenciaPdf(comisionId: string, desde?: string, hasta?: string) {
    const asistencias = await this.getAsistencias(comisionId, desde, hasta);
    const comision = await this.prisma.comision.findUnique({ where: { id: comisionId } });
    return buildPdf((doc) => {
      pdfTable(
        doc,
        ['Fecha', 'Alumno', 'DNI', 'Presente', 'Justif.'],
        asistencias.map((a) => [
          a.fecha.toISOString().slice(0, 10),
          `${a.estudiante.apellido}, ${a.estudiante.nombre}`,
          a.estudiante.dni,
          a.presente ? 'Sí' : 'No',
          a.justificado ? 'Sí' : 'No',
        ]),
        { title: `Asistencia — Comisión ${comision?.numero ?? ''}` },
      );
    });
  }

  async trayectoriaPdf(dni: string) {
    const data = await this.trayectoriasService.findByDni(dni);
    const fmt = (d?: Date | string | null) =>
      d ? new Date(d).toLocaleDateString('es-AR') : '—';

    return buildPdf((doc) => {
      doc.fontSize(14).text('Trayectoria del estudiante — FINES Adultos', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Apellido y nombre: ${data.apellido}, ${data.nombre}`);
      doc.text(`DNI: ${data.dni}`);
      doc.text(`Sexo: ${data.sexo ?? '—'}`);
      doc.text(`Fecha de nacimiento: ${fmt(data.fechaNacimiento)}`);
      if (data.libroMatriz) {
        doc.text(`Libro matriz / folio: ${data.libroMatriz.libroFolio ?? '—'}`);
      }
      if (data.estudiante) {
        doc.text(
          `Estado en sistema: ${data.estudiante.estado}${data.estudiante.comision ? ` · Comisión ${data.estudiante.comision.numero}` : ''}`,
        );
      }
      doc.moveDown();

      if (data.trayectoria?.length) {
        pdfTable(
          doc,
          ['Período', 'Tipo', 'Distrito', 'Comisión', 'CENS / Sede'],
          data.trayectoria.map((r) => [
            String(r.periodo),
            r.tipo ?? '—',
            r.distrito ?? '—',
            r.comisionNumero,
            r.comision ? `${r.comision.cens} · ${r.comision.sede}` : '—',
          ]),
          { title: 'Trayectoria — inscripciones regulares' },
        );
        doc.moveDown();
      }

      for (const informe of data.informesNotas ?? []) {
        pdfTable(
          doc,
          ['Materia', 'Nota'],
          informe.notas.map((n) => [n.materia, n.nota]),
          {
            title: `Notas históricas — ${informe.periodoLabel} · Comisión ${informe.comisionNumero}`,
          },
        );
        doc.moveDown();
      }

      if (data.estudiante?.notasActuales?.length) {
        pdfTable(
          doc,
          ['Materia', 'Cuatrimestre', 'Nota'],
          data.estudiante.notasActuales.map((n) => [
            n.materia,
            String(n.cuatrimestre),
            String(n.nota),
          ]),
          { title: 'Notas actuales en sistema' },
        );
      }
    });
  }
}
