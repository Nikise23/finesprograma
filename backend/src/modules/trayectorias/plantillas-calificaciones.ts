import { MODULOS_FINES } from '../../common/constants/materias-fines';
import { PLAN_VIEJO_MODULOS } from '../../common/constants/materias-plan-viejo';
import type { PlanCalificaciones } from '../../common/constants/materias-plan-viejo';

export type PlantillaPeriodo = {
  periodoLabel: string;
  titulo: string;
  materias: string[];
};

export function getPlantillaCalificaciones(plan: PlanCalificaciones): PlantillaPeriodo[] {
  const src = plan === 'viejo' ? PLAN_VIEJO_MODULOS : MODULOS_FINES;
  return src.map((m) => ({
    periodoLabel: m.etiqueta,
    titulo: m.titulo,
    materias: [...m.materias],
  }));
}

export function plantillasCalificacionesResponse() {
  return {
    viejo: getPlantillaCalificaciones('viejo'),
    nuevo: getPlantillaCalificaciones('nuevo'),
  };
}

const PERIODOS = new Set(
  [...PLAN_VIEJO_MODULOS, ...MODULOS_FINES].map((m) => m.etiqueta),
);

export function isPeriodoLabelValido(v: string): boolean {
  return PERIODOS.has(v as (typeof PLAN_VIEJO_MODULOS)[number]['etiqueta']);
}

export function normalizeNotaManual(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^aus/i.test(t) || t === '—' || t === '-' || /^a$/i.test(t)) return 'AUS';
  const n = t.replace(',', '.');
  const num = Number(n);
  if (!Number.isFinite(num) || num < 1 || num > 10) return null;
  return Number.isInteger(num) ? String(num) : String(num);
}
