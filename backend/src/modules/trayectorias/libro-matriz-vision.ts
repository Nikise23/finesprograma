import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODULOS_FINES } from '../../common/constants/materias-fines';
import { PLAN_VIEJO_MODULOS } from '../../common/constants/materias-plan-viejo';
import type { PlanCalificaciones } from '../../common/constants/materias-plan-viejo';
import { normalizeNotaManual } from './plantillas-calificaciones';

export type LibroMatrizVisionNota = {
  materia: string;
  nota: string;
  periodoLabel: string;
};

export type LibroMatrizVisionResult = {
  plan: PlanCalificaciones;
  dni?: string;
  apellido?: string;
  nombre?: string;
  fechaNacimiento?: string;
  libro?: string;
  folio?: string;
  notas: LibroMatrizVisionNota[];
  warnings: string[];
  model: string;
};

function catalogText(plan: PlanCalificaciones): string {
  const src = plan === 'viejo' ? PLAN_VIEJO_MODULOS : MODULOS_FINES;
  return src
    .map((m) => `${m.etiqueta}: ${m.materias.join(' | ')}`)
    .join('\n');
}

function normalizeUpper(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}

type CatalogEntry = { nombre: string; periodoLabel: string; key: string };

function buildCatalog(plan: PlanCalificaciones): CatalogEntry[] {
  const src = plan === 'viejo' ? PLAN_VIEJO_MODULOS : MODULOS_FINES;
  return src.flatMap((m) =>
    m.materias.map((nombre) => ({
      nombre,
      periodoLabel: m.etiqueta,
      key: normalizeUpper(nombre),
    })),
  );
}

function resolveMateria(
  rawMateria: string,
  rawPeriodo: string,
  catalog: CatalogEntry[],
): CatalogEntry | null {
  const key = normalizeUpper(rawMateria);
  if (!key) return null;
  const periodo = (rawPeriodo || '').trim();
  const inPeriodo = periodo
    ? catalog.filter((c) => c.periodoLabel === periodo)
    : catalog;
  const pool = inPeriodo.length ? inPeriodo : catalog;
  const exact = pool.find((c) => c.key === key);
  if (exact) return exact;
  const partial = pool.find((c) => c.key.includes(key) || key.includes(c.key));
  return partial ?? null;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new BadRequestException('Gemini no devolvió JSON válido');
  }
}

export async function extractLibroMatrizFromImage(opts: {
  buffer: Buffer;
  mimeType: string;
  fichaDni: string;
}): Promise<LibroMatrizVisionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ServiceUnavailableException(
      'Falta GEMINI_API_KEY. Podés cargar las notas a mano mientras tanto.',
    );
  }

  const mime = (opts.mimeType || 'image/jpeg').toLowerCase();
  if (!mime.startsWith('image/')) {
    throw new BadRequestException('El archivo debe ser una imagen');
  }
  if (!opts.buffer?.length) {
    throw new BadRequestException('Imagen vacía');
  }
  // ~8 MB soft limit for free-tier friendliness
  if (opts.buffer.length > 8 * 1024 * 1024) {
    throw new BadRequestException('Imagen demasiado grande (máx. 8 MB). Reducila e intentá de nuevo.');
  }

  // Preferir Flash-Lite: más cuota free y menos 503 por demanda alta.
  const preferred =
    process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
  const modelCandidates = [
    preferred,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.8-flash',
  ].filter((v, i, a) => a.indexOf(v) === i);

  const genAI = new GoogleGenerativeAI(apiKey);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const isTransient = (msg: string) =>
    /503|high demand|unavailable|try again|overloaded|timeout/i.test(msg);
  const isMissingModel = (msg: string) =>
    /404|not found|no longer available|not supported/i.test(msg);

  const prompt = `Sos un extractor de libros matriz FINES Adultos (Argentina).
Leé la imagen manuscrita/impresa y devolvé SOLO JSON con esta forma:
{
  "plan": "viejo" | "nuevo",
  "dni": "solo digitos",
  "apellido": "MAYUSCULAS",
  "nombre": "MAYUSCULAS",
  "fechaNacimiento": "DD/MM/AAAA o vacio",
  "libro": "numero de libro",
  "folio": "numero de folio",
  "notas": [{ "materia": "...", "nota": "1-10 o AUS", "periodoLabel": "1°1C" }]
}

Reglas:
- plan "viejo" si ves PRIMER/SEGUNDO/TERCER AÑO (materias tipo LENGUA Y LITERATURA, ECONOMÍA SOCIAL, DISEÑO Y DESARROLLO…).
- plan "nuevo" si ves Módulo 1..6 (materias tipo PRÁCTICAS DEL LENGUAJE 1, BIOLOGÍA AMBIENTE Y SALUD…).
- periodoLabel obligatorio: 1°1C, 1°2C, 2°1C, 2°2C, 3°1C, 3°2C
  (módulo 1→1°1C … módulo 6→3°2C; en plan viejo usá el año+cuatri según la materia del catálogo).
- Usá exactamente nombres del catálogo correspondiente.
- Solo incluí materias con nota legible (1-10 o AUS/Ausente/A).
- No inventes notas. Si no se lee, omití esa fila.
- libro y folio van separados (no "241/12" junto).

CATÁLOGO PLAN VIEJO:
${catalogText('viejo')}

CATÁLOGO PLAN NUEVO:
${catalogText('nuevo')}
`;

  let rawText = '';
  let modelName = preferred;
  let lastError = '';

  for (const candidate of modelCandidates) {
    let succeeded = false;
    for (let attempt = 1; attempt <= 3 && !succeeded; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: candidate,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });
        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
              data: opts.buffer.toString('base64'),
            },
          },
        ]);
        rawText = result.response.text();
        modelName = candidate;
        lastError = '';
        succeeded = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        lastError = msg;
        if (isMissingModel(msg)) break; // probar otro modelo
        if (/RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(msg)) {
          // Cuota: probar siguiente modelo lite antes de fallar
          break;
        }
        if (isTransient(msg) && attempt < 3) {
          await sleep(800 * attempt);
          continue;
        }
        if (isTransient(msg)) break; // siguiente modelo
        throw new ServiceUnavailableException(
          `Error Gemini (${candidate}): ${msg.slice(0, 280)}`,
        );
      }
    }
    if (succeeded) break;
  }

  if (!rawText) {
    const hint = /503|high demand/i.test(lastError)
      ? 'Google está saturado ahora. Esperá 1–2 min o cargá a mano.'
      : `Último error: ${lastError.slice(0, 220)}`;
    throw new ServiceUnavailableException(
      `Ningún modelo Gemini respondió. ${hint}`,
    );
  }

  const parsed = extractJson(rawText) as Record<string, unknown>;
  const plan: PlanCalificaciones = parsed.plan === 'viejo' ? 'viejo' : 'nuevo';
  const catalog = buildCatalog(plan);
  const warnings: string[] = [];

  const dniRaw = String(parsed.dni ?? '').replace(/\D/g, '');
  if (dniRaw && dniRaw !== opts.fichaDni) {
    warnings.push(
      `El DNI de la foto (${dniRaw}) no coincide con la ficha (${opts.fichaDni}). Se usará el de la ficha al guardar.`,
    );
  }

  const notasIn = Array.isArray(parsed.notas) ? parsed.notas : [];
  const notas: LibroMatrizVisionNota[] = [];
  let sinMatch = 0;

  for (const row of notasIn) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const nota = normalizeNotaManual(String(r.nota ?? ''));
    if (!nota) continue;
    const periodoRaw = String(r.periodoLabel ?? r.periodo ?? '').trim();
    const matched = resolveMateria(String(r.materia ?? ''), periodoRaw, catalog);
    if (!matched) {
      sinMatch++;
      continue;
    }
    notas.push({
      materia: matched.nombre,
      nota,
      periodoLabel: matched.periodoLabel,
    });
  }

  if (sinMatch) {
    warnings.push(`${sinMatch} materia(s) no matchearon el catálogo y se omitieron.`);
  }
  if (!notas.length) {
    warnings.push('No se extrajeron notas legibles. Completá a mano mirando la foto.');
  }

  return {
    plan,
    dni: dniRaw || undefined,
    apellido: String(parsed.apellido ?? '').trim().toUpperCase() || undefined,
    nombre: String(parsed.nombre ?? '').trim().toUpperCase() || undefined,
    fechaNacimiento: String(parsed.fechaNacimiento ?? '').trim() || undefined,
    libro: String(parsed.libro ?? '').trim() || undefined,
    folio: String(parsed.folio ?? '').trim() || undefined,
    notas,
    warnings,
    model: modelName,
  };
}
