import { MODULOS_FINES } from '../../common/constants/materias-fines';

export function normalizeUpper(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}

export function normalizeDni(v: string): string {
  return v.replace(/\D/g, '');
}

/** Alias cortos → nombre oficial del plan (keys ya normalizados sin acentos) */
const MATERIA_ALIASES: Record<string, string> = {
  'MATEMATICA 1': 'MATEMÁTICA 1',
  'MATEMATICA 2': 'MATEMÁTICA 2',
  'MATEMATICA 3': 'MATEMÁTICA 3',
  'EDUCACION FISICA 1': 'EDUCACIÓN FÍSICA 1',
  'EDUCACION FISICA 2': 'EDUCACIÓN FÍSICA 2',
  'EDUCACION FISICA 3': 'EDUCACIÓN FÍSICA 3',
  'EDUCAC FISICA 1': 'EDUCACIÓN FÍSICA 1',
  'EDUCAC FISICA 2': 'EDUCACIÓN FÍSICA 2',
  'EDUCAC FISICA 3': 'EDUCACIÓN FÍSICA 3',
  'EDUCACION ARTISTICA': 'EDUCACIÓN ARTÍSTICA 1',
  'EDUCACION ARTISTICA 1': 'EDUCACIÓN ARTÍSTICA 1',
  'EDUCACION ARTISTICA 2': 'EDUCACIÓN ARTÍSTICA 2',
  'EDUCACION ARTISTICA 3': 'EDUCACIÓN ARTÍSTICA 3',
  'TEC Y PRACT DIGITALES 1': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 1',
  'TEC Y PRACT DIGITALES 2': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 2',
  'TEC Y PRACT DIGITALES 3': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 3',
  'TEC Y PRACT DIGIT 1': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 1',
  'TEC Y PRACT DIGIT 2': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 2',
  'TEC Y PRACT DIGIT 3': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 3',
  'PRACTICAS DEL LENGUAJE 1': 'PRÁCTICAS DEL LENGUAJE 1',
  'PRACTICAS DEL LENGUAJE 2': 'PRÁCTICAS DEL LENGUAJE 2',
  'PRACTICAS DEL LENGUAJE 3': 'PRÁCTICAS DEL LENGUAJE 3',
  'PRACT DEL LENGUAJE 1': 'PRÁCTICAS DEL LENGUAJE 1',
  'PRACT DEL LENGUAJE 2': 'PRÁCTICAS DEL LENGUAJE 2',
  'PRACT DEL LENGUAJE 3': 'PRÁCTICAS DEL LENGUAJE 3',
  'PRACT DEL LENG 1': 'PRÁCTICAS DEL LENGUAJE 1',
  'PRACT DEL LENG 2': 'PRÁCTICAS DEL LENGUAJE 2',
  'PRACT DEL LENG 3': 'PRÁCTICAS DEL LENGUAJE 3',
  'CIENCIAS SOCIALES 1': 'CIENCIAS SOCIALES 1',
  'CIENCIAS SOCIALES 2': 'CIENCIAS SOCIALES 2',
  'BIOLOGIA AMBIENTE Y SALUD': 'BIOLOGÍA, AMBIENTE Y SALUD',
  SOCIOLOGIA: 'SOCIOLOGÍA',
  'PSICOLOGIA DEL DES SOCIAL E INST': 'PSICOLOGÍA DEL DESARROLLO, SOCIAL E INSTITUCIONAL',
  'PSICOLOGIA DEL DESARROLLO SOCIAL E INSTITUCIONAL':
    'PSICOLOGÍA DEL DESARROLLO, SOCIAL E INSTITUCIONAL',
  'LENGUA ADICIONAL 1': 'LENGUAJE ADICIONAL 1',
  'LENGUA ADICIONAL 2': 'LENGUAJE ADICIONAL 2',
  'LENGUA ADICIONAL 3': 'LENGUA ADICIONAL 3',
  'LENGUAJE ADICIONAL 1': 'LENGUAJE ADICIONAL 1',
  'LENGUAJE ADICIONAL 2': 'LENGUAJE ADICIONAL 2',
  'FISICA Y FEN NAT Y PROC PRODUC': 'FÍSICA, FENÓMENOS NATURALES Y PROCESO PRODUCTIVOS',
  'FISICA FENOMENOS NATURALES Y PROCESO PRODUCTIVOS':
    'FÍSICA, FENÓMENOS NATURALES Y PROCESO PRODUCTIVOS',
  'CIUDADANIA SOC Y CULT Y REL LAB': 'CIUDADANÍA, SOCIEDAD, CULTURA Y RELACIONES LABORALES',
  'CIUDADANIA SOCIEDAD CULTURA Y RELACIONES LABORALES':
    'CIUDADANÍA, SOCIEDAD, CULTURA Y RELACIONES LABORALES',
  'METOD DE LA INVESTIGACION': 'METODOLOGÍA DE LA INVESTIGACIÓN',
  'METODOLOGIA DE LA INVESTIGACION': 'METODOLOGÍA DE LA INVESTIGACIÓN',
  'DERECHOS HUMANOS': 'DERECHOS HUMANOS',
  'QUIM TEC Y SOCIEDAD': 'QUÍMICA, TECNOLOGÍAS Y SOCIEDAD',
  'QUIMICA TECNOLOGIAS Y SOCIEDAD': 'QUÍMICA, TECNOLOGÍAS Y SOCIEDAD',
  'PROBL SOC ARGENTINA': 'PROBLEMÁTICA SOCIAL ARGENTINA',
  'PROBLEMATICA SOCIAL ARGENTINA': 'PROBLEMÁTICA SOCIAL ARGENTINA',
};

const CATALOGO = MODULOS_FINES.flatMap((m) =>
  m.materias.map((nombre) => ({
    nombre,
    moduloId: m.id,
    etiqueta: m.etiqueta,
    key: normalizeUpper(nombre),
  })),
);

export type ParsedCalifLine = {
  materia: string;
  nota: string;
  moduloId: number;
  periodoLabel: string;
};

export type ParsedCalificacionesTexto = {
  apellido?: string;
  nombre?: string;
  dni?: string;
  lineas: ParsedCalifLine[];
  sinMatch: string[];
};

function resolveMateria(raw: string): (typeof CATALOGO)[number] | null {
  const key = normalizeUpper(raw);
  if (!key) return null;

  const alias = MATERIA_ALIASES[key];
  if (alias) {
    const found = CATALOGO.find((c) => c.nombre === alias);
    if (found) return found;
  }

  const exact = CATALOGO.find((c) => c.key === key);
  if (exact) return exact;

  const tokens = key.split(' ').filter((w) => w.length >= 3);
  const candidates = CATALOGO.filter((c) => tokens.length > 0 && tokens.every((w) => c.key.includes(w)));
  if (candidates.length === 1) return candidates[0];

  return null;
}

function parseHeader(line: string): { apellido?: string; nombre?: string; dni?: string } | null {
  const dniMatch = line.match(/DNI\s*[:\-]?\s*(\d[\d.\-\s]*)/i);
  if (!dniMatch) return null;
  const dni = normalizeDni(dniMatch[1]);
  const before = line.slice(0, dniMatch.index).replace(/[-–—]\s*$/, '').trim();
  const comma = before.indexOf(',');
  if (comma >= 0) {
    return {
      apellido: before.slice(0, comma).trim(),
      nombre: before.slice(comma + 1).trim(),
      dni,
    };
  }
  const parts = before.split(/\s+/);
  if (parts.length >= 2) {
    return { apellido: parts[0], nombre: parts.slice(1).join(' '), dni };
  }
  return { dni };
}

function parseNotaLine(line: string): { materiaRaw: string; nota: string } | null {
  const cleaned = line.replace(/\t+/g, '\t').trim();
  if (!cleaned) return null;

  // Nota = último número/AUS de la línea (no el "1" de "Matemática 1")
  const m = cleaned.match(
    /^(.*)[\t ]+(\d{1,2}(?:[.,]\d+)?|AUS(?:ENTE)?)\s*(?:[\t ].*)?$/i,
  );
  if (!m) return null;

  const materiaRaw = m[1].replace(/\s+/g, ' ').trim();
  const nota = m[2].replace(',', '.').toUpperCase().replace(/^AUSENTE$/, 'AUS');

  if (!materiaRaw || /^dni\b/i.test(materiaRaw)) return null;

  return { materiaRaw, nota };
}

export function parseCalificacionesTexto(texto: string): ParsedCalificacionesTexto {
  const lines = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let apellido: string | undefined;
  let nombre: string | undefined;
  let dni: string | undefined;
  const lineas: ParsedCalifLine[] = [];
  const sinMatch: string[] = [];

  for (const line of lines) {
    const header = parseHeader(line);
    if (header?.dni) {
      dni = header.dni;
      apellido = header.apellido ?? apellido;
      nombre = header.nombre ?? nombre;
      continue;
    }

    const parsed = parseNotaLine(line);
    if (!parsed) continue;

    const mat = resolveMateria(parsed.materiaRaw);
    if (!mat) {
      sinMatch.push(parsed.materiaRaw);
      continue;
    }

    lineas.push({
      materia: mat.nombre,
      nota: parsed.nota,
      moduloId: mat.moduloId,
      periodoLabel: mat.etiqueta,
    });
  }

  return { apellido, nombre, dni, lineas, sinMatch };
}
