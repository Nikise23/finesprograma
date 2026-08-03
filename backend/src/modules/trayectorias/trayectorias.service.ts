import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import * as XLSX from 'xlsx';
import {
  normalizeDni as normalizeDniShared,
  parseCalificacionesTexto,
} from './calificaciones-texto.parser';

function normalizeUpper(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function normalizeDni(v: string): string {
  return v.replace(/\D/g, '');
}

function normalizeComisionNumero(v: string): string {
  const digits = v.replace(/\D/g, '');
  return digits.replace(/^0+/, '') || '0';
}

function parseFecha(v: string): Date | undefined {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function parseMeta(row: string) {
  const text = row
    .replace(/\u00c3\u00a1/g, 'á')
    .replace(/\u00c3\u00b3/g, 'ó')
    .replace(/\u00c3\u00ad/g, 'í');
  const m = text.match(
    /Distrito:\s*(.+?)\s*-\s*Comisi[oó]n:\s*(\S+)\s*-\s*Per[ií]odo informado:\s*(.+?)\s*-\s*Orientaci[oó]n:\s*(.+)/i,
  );
  if (!m) return null;
  return {
    distrito: normalizeUpper(m[1]),
    comisionNumero: m[2].trim(),
    periodoLabel: normalizeUpper(m[3]),
    orientacion: normalizeUpper(m[4]),
  };
}

@Injectable()
export class TrayectoriasService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private buildSearchWhere(q?: string) {
    if (!q) return undefined;
    const dniPart = q.replace(/\D/g, '');
    return {
      OR: [
        ...(dniPart ? [{ dni: { contains: dniPart } }] : []),
        { apellido: { contains: q, mode: 'insensitive' as const } },
        { nombre: { contains: q, mode: 'insensitive' as const } },
      ],
    };
  }

  async search(q?: string, page = 1, limit = 25) {
    const where = this.buildSearchWhere(q);

    const [trayDnis, notaDnis, estDnis] = await Promise.all([
      this.prisma.trayectoriaEstudiante.groupBy({ by: ['dni'], where }),
      this.prisma.notaHistorica.groupBy({ by: ['dni'], where }),
      this.prisma.estudiante.groupBy({ by: ['dni'], where }),
    ]);

    const dniSet = new Set([
      ...trayDnis.map((d) => d.dni),
      ...notaDnis.map((d) => d.dni),
      ...estDnis.map((d) => d.dni),
    ]);
    const allDnis = [...dniSet].sort();

    const total = allDnis.length;
    const pageDnis = allDnis.slice((page - 1) * limit, page * limit);

    const [trayectorias, notas, estudiantes, libros] = await Promise.all([
      this.prisma.trayectoriaEstudiante.findMany({
        where: { dni: { in: pageDnis } },
        orderBy: [{ dni: 'asc' }, { periodo: 'asc' }],
      }),
      this.prisma.notaHistorica.findMany({
        where: { dni: { in: pageDnis } },
        select: { dni: true, periodoLabel: true, comisionNumero: true },
      }),
      this.prisma.estudiante.findMany({
        where: { dni: { in: pageDnis } },
        include: { comision: { select: { numero: true } } },
      }),
      this.prisma.libroMatriz.findMany({
        where: { dni: { in: pageDnis } },
        select: { dni: true, libroFolio: true },
      }),
    ]);

    const items = pageDnis.map((dni) => {
      const tray = trayectorias.filter((t) => t.dni === dni);
      const est = estudiantes.find((e) => e.dni === dni);
      const libro = libros.find((l) => l.dni === dni);
      const ultima = tray[tray.length - 1];
      const informesNotas = new Set(
        notas.filter((n) => n.dni === dni).map((n) => `${n.periodoLabel}|${n.comisionNumero}`),
      );

      return {
        dni,
        apellido: ultima?.apellido ?? est?.apellido ?? '',
        nombre: ultima?.nombre ?? est?.nombre ?? '',
        sexo: ultima?.sexo,
        fechaNacimiento: ultima?.fechaNacimiento ?? est?.fechaNacimiento,
        libroMatriz: libro ? { id: dni, libroFolio: libro.libroFolio ?? undefined } : undefined,
        periodos: tray.map((t) => ({ periodo: t.periodo, comisionNumero: t.comisionNumero })),
        totalPeriodos: tray.length,
        totalInformesNotas: informesNotas.size,
        estado: est?.estado ?? (tray.length ? 'historico' : undefined),
        comisionActual: est?.comision?.numero,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async findByDni(dni: string) {
    const normalized = dni.replace(/\D/g, '');

    const [registros, notasHistoricas, estudiante, libroMatriz] = await Promise.all([
      this.prisma.trayectoriaEstudiante.findMany({
        where: { dni: normalized },
        include: {
          comision: { include: { sede: { include: { cens: true } } } },
          libroMatriz: true,
        },
        orderBy: { periodo: 'asc' },
      }),
      this.prisma.notaHistorica.findMany({
        where: { dni: normalized },
        include: {
          comision: { include: { sede: { include: { cens: true } } } },
        },
        orderBy: [{ periodoLabel: 'asc' }, { materia: 'asc' }],
      }),
      this.prisma.estudiante.findUnique({
        where: { dni: normalized },
        include: {
          comision: { include: { sede: { include: { cens: true } } } },
          notas: { orderBy: [{ cuatrimestre: 'asc' }, { materia: 'asc' }] },
        },
      }),
      this.prisma.libroMatriz.findUnique({ where: { dni: normalized } }),
    ]);

    if (!registros.length && !notasHistoricas.length && !estudiante) {
      throw new NotFoundException('No hay información para ese DNI');
    }

    const ref =
      registros[registros.length - 1] ??
      notasHistoricas[notasHistoricas.length - 1] ??
      estudiante;

    const informesMap = new Map<
      string,
      {
        periodoLabel: string;
        comisionNumero: string;
        distrito?: string;
        orientacion?: string;
        fuenteArchivo?: string;
        comision?: { id: string; numero: string; sede: string; cens: string } | null;
        notas: { materia: string; nota: string }[];
        libro?: string;
        folio?: string;
        estadoFinal?: string;
      }
    >();

    for (const n of notasHistoricas) {
      const key = `${n.periodoLabel}|${n.comisionNumero}`;
      if (!informesMap.has(key)) {
        informesMap.set(key, {
          periodoLabel: n.periodoLabel,
          comisionNumero: n.comisionNumero,
          distrito: n.distrito ?? undefined,
          orientacion: n.orientacion ?? undefined,
          fuenteArchivo: n.fuenteArchivo,
          comision: n.comision
            ? {
                id: n.comision.id,
                numero: n.comision.numero,
                sede: n.comision.sede.nombre,
                cens: n.comision.sede.cens.nombre,
              }
            : null,
          notas: [],
          libro: n.libro ?? undefined,
          folio: n.folio ?? undefined,
          estadoFinal: n.estadoFinal ?? undefined,
        });
      }
      informesMap.get(key)!.notas.push({ materia: n.materia, nota: n.nota ?? '—' });
    }

    return {
      dni: normalized,
      apellido: ref?.apellido ?? '',
      nombre: ref && 'nombre' in ref ? ref.nombre : '',
      sexo: registros[registros.length - 1]?.sexo,
      fechaNacimiento:
        registros[registros.length - 1]?.fechaNacimiento ??
        estudiante?.fechaNacimiento ??
        notasHistoricas[0]?.fechaNacimiento,
      libroMatriz: libroMatriz ?? registros[0]?.libroMatriz ?? undefined,
      estudiante: estudiante
        ? {
            id: estudiante.id,
            estado: estudiante.estado,
            comision: estudiante.comision
              ? {
                  id: estudiante.comision.id,
                  numero: estudiante.comision.numero,
                  sede: estudiante.comision.sede?.nombre,
                  cens: estudiante.comision.sede?.cens?.nombre,
                }
              : null,
            notasActuales: estudiante.notas.map((n) => ({
              materia: n.materia,
              cuatrimestre: n.cuatrimestre,
              nota: Number(n.nota),
            })),
          }
        : null,
      trayectoria: registros.map((r) => ({
        id: r.id,
        periodo: r.periodo,
        tipo: r.tipo,
        distrito: r.distrito,
        comisionNumero: r.comisionNumero,
        comision: r.comision
          ? {
              id: r.comision.id,
              numero: r.comision.numero,
              sede: r.comision.sede.nombre,
              cens: r.comision.sede.cens.nombre,
            }
          : null,
      })),
      informesNotas: [...informesMap.values()],
      // compatibilidad con frontend previo
      registros: registros.map((r) => ({
        id: r.id,
        periodo: r.periodo,
        tipo: r.tipo,
        distrito: r.distrito,
        comisionNumero: r.comisionNumero,
        comision: r.comision
          ? {
              id: r.comision.id,
              numero: r.comision.numero,
              sede: r.comision.sede.nombre,
              cens: r.comision.sede.cens.nombre,
            }
          : null,
        fechaNacimiento: r.fechaNacimiento,
        sexo: r.sexo,
      })),
    };
  }

  async importEgresadas(buffer: Buffer, fileName: string, userId: string) {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer.toString('latin1'), { type: 'string' });
    } catch {
      wb = XLSX.read(buffer, { type: 'buffer' });
    }

    const comisiones = await this.prisma.comision.findMany({ select: { id: true, numero: true } });
    const comisionMap = new Map<string, string>();
    for (const c of comisiones) {
      comisionMap.set(normalizeComisionNumero(c.numero), c.id);
      comisionMap.set(c.numero, c.id);
    }

    let notasCreated = 0;
    let notasUpdated = 0;
    let hojas = 0;
    let filasAlumno = 0;
    const dnisTocados = new Set<string>();
    const fuenteArchivo = fileName || 'upload-egresadas.xls';

    for (const sheetName of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        defval: '',
      });

      const metaRow = rows.find((r) => String(r[0] ?? '').includes('Distrito:'));
      const meta = metaRow ? parseMeta(String(metaRow[0])) : null;
      if (!meta) continue;

      const headerIdx = rows.findIndex(
        (r) => normalizeUpper(String(r[0] ?? '')) === 'APELLIDO',
      );
      if (headerIdx < 0) continue;

      const header = rows[headerIdx].map((c) => String(c ?? '').trim());
      const libroIdx = header.findIndex((h) => normalizeUpper(h) === 'LIBRO');
      const folioIdx = header.findIndex((h) => normalizeUpper(h) === 'FOLIO');
      const estadoIdx = header.findIndex((h) => normalizeUpper(h) === 'ESTADO');
      const materiaStart = header.findIndex((h) =>
        normalizeUpper(h).includes('PRACTICAS DEL LENGUAJE'),
      );
      const startCol = materiaStart >= 0 ? materiaStart : 8;
      const endCol = libroIdx >= 0 ? libroIdx : header.length;

      const comisionId =
        comisionMap.get(normalizeComisionNumero(meta.comisionNumero)) ??
        comisionMap.get(meta.comisionNumero) ??
        null;

      hojas++;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i].map((c) => String(c ?? '').trim());
        const apellido = normalizeUpper(row[0]);
        const nombre = normalizeUpper(row[1]);
        const dni = normalizeDni(row[2] ?? row[6] ?? '');

        if (!dni || dni.length < 6 || !apellido || apellido === 'APELLIDO') continue;

        filasAlumno++;
        dnisTocados.add(dni);
        const fechaNacimiento = parseFecha(row[3]);
        const libro = libroIdx >= 0 ? row[libroIdx] : undefined;
        const folio = folioIdx >= 0 ? row[folioIdx] : undefined;
        const estadoFinal = estadoIdx >= 0 ? normalizeUpper(row[estadoIdx]) : undefined;

        for (let col = startCol; col < endCol; col++) {
          const materia = normalizeUpper(header[col]);
          const nota = row[col]?.trim();
          if (!materia || !nota) continue;

          const data = {
            dni,
            apellido,
            nombre,
            comisionNumero: meta.comisionNumero,
            comisionId,
            distrito: meta.distrito,
            periodoLabel: meta.periodoLabel,
            orientacion: meta.orientacion,
            materia,
            nota,
            libro: libro || undefined,
            folio: folio || undefined,
            estadoFinal: estadoFinal || undefined,
            fuenteArchivo,
            fechaNacimiento,
          };

          const existing = await this.prisma.notaHistorica.findUnique({
            where: {
              dni_comisionNumero_periodoLabel_materia: {
                dni,
                comisionNumero: meta.comisionNumero,
                periodoLabel: meta.periodoLabel,
                materia,
              },
            },
          });

          if (existing) {
            await this.prisma.notaHistorica.update({ where: { id: existing.id }, data });
            notasUpdated++;
          } else {
            await this.prisma.notaHistorica.create({ data });
            notasCreated++;
          }
        }
      }
    }

    let estudiantesCreados = 0;
    let estudiantesActualizados = 0;

    for (const dni of dnisTocados) {
      const ultimaTrayectoria = await this.prisma.trayectoriaEstudiante.findFirst({
        where: { dni },
        orderBy: { periodo: 'desc' },
      });
      const ultimaNota = await this.prisma.notaHistorica.findFirst({
        where: { dni },
        orderBy: { updatedAt: 'desc' },
      });
      const libro = await this.prisma.libroMatriz.findUnique({ where: { dni } });

      const apellido = ultimaTrayectoria?.apellido ?? ultimaNota?.apellido;
      const nombre = ultimaTrayectoria?.nombre ?? ultimaNota?.nombre;
      if (!apellido || !nombre) continue;

      const existing = await this.prisma.estudiante.findUnique({ where: { dni } });
      if (existing) {
        if (existing.estado === 'activo' || existing.estado === 'baja_pendiente') continue;
        await this.prisma.estudiante.update({
          where: { dni },
          data: {
            apellido,
            nombre,
            fechaNacimiento:
              ultimaTrayectoria?.fechaNacimiento ??
              ultimaNota?.fechaNacimiento ??
              existing.fechaNacimiento,
            libroMatrizId: libro?.id ?? existing.libroMatrizId,
            estado: 'historico',
          },
        });
        estudiantesActualizados++;
      } else {
        await this.prisma.estudiante.create({
          data: {
            dni,
            apellido,
            nombre,
            fechaNacimiento: ultimaTrayectoria?.fechaNacimiento ?? ultimaNota?.fechaNacimiento,
            libroMatrizId: libro?.id,
            estado: 'historico',
          },
        });
        estudiantesCreados++;
      }
    }

    const result = {
      archivo: fuenteArchivo,
      hojas,
      alumnos: filasAlumno,
      dnisUnicos: dnisTocados.size,
      notasCreated,
      notasUpdated,
      estudiantesCreados,
      estudiantesActualizados,
    };

    await this.audit.log({
      usuarioId: userId,
      accion: 'IMPORT_EGRESADAS',
      entidad: 'NotaHistorica',
      detalle: result,
    });

    return result;
  }

  /**
   * Carga/actualiza notas históricas desde texto pegado (materia + nota),
   * agrupadas por cuatrimestre del plan (1°1C … 3°2C). Actualiza la ficha.
   */
  async importCalificacionesTexto(
    dniParam: string,
    texto: string,
    userId: string,
    opts?: { apellido?: string; nombre?: string },
  ) {
    const parsed = parseCalificacionesTexto(texto);
    const dni = normalizeDniShared(dniParam || parsed.dni || '');
    if (!dni || dni.length < 6) {
      throw new BadRequestException('DNI inválido o ausente');
    }
    if (!parsed.lineas.length) {
      throw new BadRequestException(
        parsed.sinMatch.length
          ? `No se reconocieron materias. Revisá: ${parsed.sinMatch.slice(0, 5).join('; ')}`
          : 'No se encontraron líneas materia + nota',
      );
    }

    let estudiante = await this.prisma.estudiante.findUnique({ where: { dni } });
    const apellido = (
      opts?.apellido ||
      parsed.apellido ||
      estudiante?.apellido ||
      ''
    )
      .trim()
      .toUpperCase();
    const nombre = (opts?.nombre || parsed.nombre || estudiante?.nombre || '')
      .trim()
      .toUpperCase();
    if (!apellido || !nombre) {
      throw new BadRequestException('Faltan apellido y nombre (en el texto o en la ficha)');
    }

    const fuenteArchivo = 'carga-manual-texto';
    const comisionNumero = 'MANUAL';
    let notasCreated = 0;
    let notasUpdated = 0;

    for (const line of parsed.lineas) {
      const data = {
        dni,
        apellido,
        nombre,
        comisionNumero,
        comisionId: null as string | null,
        distrito: undefined as string | undefined,
        periodoLabel: line.periodoLabel,
        orientacion: 'CIENCIAS SOCIALES',
        materia: line.materia,
        nota: line.nota,
        fuenteArchivo,
        fechaNacimiento: estudiante?.fechaNacimiento ?? undefined,
      };

      const existing = await this.prisma.notaHistorica.findUnique({
        where: {
          dni_comisionNumero_periodoLabel_materia: {
            dni,
            comisionNumero,
            periodoLabel: line.periodoLabel,
            materia: line.materia,
          },
        },
      });

      if (existing) {
        await this.prisma.notaHistorica.update({ where: { id: existing.id }, data });
        notasUpdated++;
      } else {
        await this.prisma.notaHistorica.create({ data });
        notasCreated++;
      }
    }

    if (!estudiante) {
      estudiante = await this.prisma.estudiante.create({
        data: {
          dni,
          apellido,
          nombre,
          estado: 'historico',
        },
      });
    } else if (estudiante.estado !== 'activo' && estudiante.estado !== 'baja_pendiente') {
      await this.prisma.estudiante.update({
        where: { dni },
        data: { apellido, nombre, estado: 'historico' },
      });
    }

    const result = {
      dni,
      apellido,
      nombre,
      notasCreated,
      notasUpdated,
      totalLineas: parsed.lineas.length,
      sinMatch: parsed.sinMatch,
      periodos: [...new Set(parsed.lineas.map((l) => l.periodoLabel))],
    };

    await this.audit.log({
      usuarioId: userId,
      accion: 'IMPORT_CALIFICACIONES_TEXTO',
      entidad: 'NotaHistorica',
      entidadId: dni,
      detalle: result,
    });

    return result;
  }
}
