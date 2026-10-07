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
        select: {
          id: true,
          posicion: true,
          apellido: true,
          nombre: true,
          dni: true,
          libroFolio: true,
          observaciones: true,
          createdAt: true,
          updatedAt: true,
        },
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

  async nextPosicion() {
    const agg = await this.prisma.libroMatriz.aggregate({ _max: { posicion: true } });
    return (agg._max.posicion ?? 0) + 1;
  }

  async create(dto: CreateLibroMatrizDto, userId: string) {
    const dniNorm = dto.dni != null ? normalizeDni(String(dto.dni)) : '';
    const dni = dniNorm.length >= 6 ? dniNorm : null;
    const posicion =
      dto.posicion != null && !Number.isNaN(Number(dto.posicion))
        ? dto.posicion
        : await this.nextPosicion();
    try {
      const item = await this.prisma.libroMatriz.create({
        data: {
          apellido: dto.apellido,
          nombre: dto.nombre,
          dni,
          posicion,
          libroFolio: dto.libroFolio,
          observaciones: dto.observaciones,
        },
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
      const data: {
        apellido?: string;
        nombre?: string;
        dni?: string | null;
        posicion?: number;
        libroFolio?: string;
        observaciones?: string;
      } = {
        apellido: dto.apellido,
        nombre: dto.nombre,
        posicion: dto.posicion,
        libroFolio: dto.libroFolio,
        observaciones: dto.observaciones,
      };
      if (dto.dni !== undefined) {
        const n = dto.dni != null ? normalizeDni(String(dto.dni)) : '';
        data.dni = n.length >= 6 ? n : null;
      }
      Object.keys(data).forEach((k) => {
        if (data[k as keyof typeof data] === undefined) delete data[k as keyof typeof data];
      });

      const item = await this.prisma.libroMatriz.update({
        where: { id },
        data,
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

      const apellidoRaw = get('APELLIDO');
      const nombreRaw = get('NOMBRE');
      const dniRaw = get('DNI');
      const dniNorm = normalizeDni(dniRaw);
      const observaciones = get('OBSERVACIONES') || undefined;
      const posicionStr = get('POSICIÓN') || get('POSICION');
      const posicion = posicionStr ? parseInt(posicionStr, 10) : undefined;
      const libroFolio = get('LIBRO/FOLIO') || get('LIBRO FOLIO') || undefined;

      // Fila totalmente vacía
      if (!dniNorm && !apellidoRaw && !nombreRaw && !observaciones && !libroFolio) continue;

      // DNI con basura (tiene caracteres pero < 6 dígitos)
      if (dniRaw.trim() && dniNorm.length > 0 && dniNorm.length < 6) {
        errors.push({
          fila: rowNum,
          dni: dniRaw,
          error: `DNI con formato inválido (${apellidoRaw || '—'}, ${nombreRaw || '—'})`,
        });
        continue;
      }

      const dni = dniNorm.length >= 6 ? dniNorm : null;

      // Sin DNI: alcanza con nombre/apellido u observación
      if (!dni && !apellidoRaw && !nombreRaw && !observaciones) {
        errors.push({
          fila: rowNum,
          error: 'Sin DNI: hace falta al menos nombre/apellido u observación',
        });
        continue;
      }

      const apellido = apellidoRaw || 'S/D';
      const nombre = nombreRaw || 'S/D';

      try {
        if (dni) {
          const existing = await this.prisma.libroMatriz.findUnique({ where: { dni } });
          if (existing) {
            await this.prisma.libroMatriz.update({
              where: { dni },
              data: { apellido, nombre, posicion, libroFolio, observaciones },
            });
            updated++;
          } else {
            await this.prisma.libroMatriz.create({
              data: {
                apellido,
                nombre,
                dni,
                posicion: posicion ?? (await this.nextPosicion()),
                libroFolio,
                observaciones,
              },
            });
            created++;
          }
        } else {
          // Sin DNI: actualizar si ya existe mismo apellido+nombre+folio, si no crear
          const existing = await this.prisma.libroMatriz.findFirst({
            where: {
              dni: null,
              apellido: { equals: apellido, mode: 'insensitive' },
              nombre: { equals: nombre, mode: 'insensitive' },
              libroFolio: libroFolio ?? null,
            },
          });
          if (existing) {
            await this.prisma.libroMatriz.update({
              where: { id: existing.id },
              data: { observaciones, posicion: posicion ?? existing.posicion },
            });
            updated++;
          } else {
            await this.prisma.libroMatriz.create({
              data: {
                apellido,
                nombre,
                dni: null,
                posicion: posicion ?? (await this.nextPosicion()),
                libroFolio,
                observaciones,
              },
            });
            created++;
          }
        }
      } catch {
        errors.push({ fila: rowNum, dni: dni ?? undefined, error: 'Error al guardar registro' });
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
