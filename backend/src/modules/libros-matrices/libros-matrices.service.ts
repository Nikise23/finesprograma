import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLibroMatrizDto,
  UpdateLibroMatrizDto,
} from './dto/libro-matriz.dto';
import { AuditService } from '../../common/services/audit.service';
import { cellText, normalizeDni } from '../../common/utils/excel.util';

export interface ImportRowError {
  fila: number;
  dni?: string;
  error: string;
}

@Injectable()
export class LibrosMatricesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(q?: string, page = 1, limit = 50) {
    const where = q
      ? {
          OR: [
            { apellido: { contains: q, mode: 'insensitive' as const } },
            { nombre: { contains: q, mode: 'insensitive' as const } },
            { dni: { contains: q } },
            { libroFolio: { contains: q, mode: 'insensitive' as const } },
            { observaciones: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.libroMatriz.findMany({
        where,
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.libroMatriz.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const item = await this.prisma.libroMatriz.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Registro no encontrado');
    return item;
  }

  async create(dto: CreateLibroMatrizDto, userId: string) {
    const dni = normalizeDni(dto.dni);
    try {
      const item = await this.prisma.libroMatriz.create({
        data: { ...dto, dni },
      });
      await this.audit.log({
        usuarioId: userId,
        accion: 'CREATE',
        entidad: 'LibroMatriz',
        entidadId: item.id,
      });
      return item;
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe un registro con ese DNI');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateLibroMatrizDto, userId: string) {
    await this.findOne(id);
    try {
      const item = await this.prisma.libroMatriz.update({
        where: { id },
        data: {
          ...dto,
          dni: dto.dni ? normalizeDni(dto.dni) : undefined,
        },
      });
      await this.audit.log({
        usuarioId: userId,
        accion: 'UPDATE',
        entidad: 'LibroMatriz',
        entidadId: id,
      });
      return item;
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe otro registro con ese DNI');
      }
      throw e;
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.libroMatriz.delete({ where: { id } });
    await this.audit.log({
      usuarioId: userId,
      accion: 'DELETE',
      entidad: 'LibroMatriz',
      entidadId: id,
    });
    return { ok: true };
  }

  async importExcel(buffer: Buffer, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets.find((ws) => ws.rowCount > 1) ?? workbook.worksheets[0];

    const headerMap: Record<string, number> = {};
    sheet.getRow(1).eachCell((cell, col) => {
      const key = cellText(cell.value).toUpperCase();
      if (key) headerMap[key] = col;
    });

    let created = 0;
    let updated = 0;
    const errors: ImportRowError[] = [];

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const get = (name: string) => {
        const col = headerMap[name];
        return col ? cellText(row.getCell(col).value) : '';
      };

      const apellido = get('APELLIDO');
      const nombre = get('NOMBRE');
      const dniRaw = get('DNI');
      const dni = normalizeDni(dniRaw);

      if (!dni && !apellido && !nombre) continue;

      if (!dni || dni.length < 6) {
        errors.push({ fila: rowNum, dni: dniRaw, error: 'DNI inválido o vacío' });
        continue;
      }
      if (!apellido || !nombre) {
        errors.push({ fila: rowNum, dni, error: 'Apellido y nombre son obligatorios' });
        continue;
      }

      const posicionStr = get('POSICIÓN') || get('POSICION');
      const posicion = posicionStr ? parseInt(posicionStr, 10) : undefined;
      const libroFolio = get('LIBRO/FOLIO') || get('LIBRO FOLIO');
      const observaciones = get('OBSERVACIONES') || undefined;

      try {
        const existing = await this.prisma.libroMatriz.findUnique({ where: { dni } });
        if (existing) {
          await this.prisma.libroMatriz.update({
            where: { dni },
            data: { apellido, nombre, posicion, libroFolio, observaciones },
          });
          updated++;
        } else {
          await this.prisma.libroMatriz.create({
            data: { apellido, nombre, dni, posicion, libroFolio, observaciones },
          });
          created++;
        }
      } catch {
        errors.push({ fila: rowNum, dni, error: 'Error al guardar registro' });
      }
    }

    await this.audit.log({
      usuarioId: userId,
      accion: 'IMPORT_EXCEL',
      entidad: 'LibroMatriz',
      detalle: { created, updated, errores: errors.length },
    });

    return { created, updated, errors, total: created + updated };
  }

  async exportExcel(q?: string): Promise<Buffer> {
    const { items } = await this.findAll(q, 1, 100000);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Libros Matriz');

    sheet.columns = [
      { header: 'POSICIÓN', key: 'posicion', width: 10 },
      { header: 'APELLIDO', key: 'apellido', width: 25 },
      { header: 'NOMBRE', key: 'nombre', width: 25 },
      { header: 'DNI', key: 'dni', width: 15 },
      { header: 'LIBRO/FOLIO', key: 'libroFolio', width: 15 },
      { header: 'OBSERVACIONES', key: 'observaciones', width: 40 },
    ];

    items.forEach((item) => sheet.addRow(item));
    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
