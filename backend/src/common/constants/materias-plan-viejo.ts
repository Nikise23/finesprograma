/**
 * Plan viejo FINES Adultos — materias por cuatrimestre (1°1C … 3°2C).
 * Usado para carga manual desde foto de libro matriz (opción C).
 */
export const PLAN_VIEJO_MODULOS = [
  {
    id: 1,
    etiqueta: '1°1C',
    titulo: '1° año · 1° cuatrimestre',
    materias: [
      'LENGUA Y LITERATURA',
      'INGLÉS',
      'HISTORIA - GEOGRAFÍA',
      'BIOLOGÍA',
      'INFORMÁTICA',
      'EDUCACIÓN CÍVICA',
    ],
  },
  {
    id: 2,
    etiqueta: '1°2C',
    titulo: '1° año · 2° cuatrimestre',
    materias: ['MATEMÁTICA', 'SOCIOLOGÍA', 'PSICOLOGÍA', 'ECONOMÍA SOCIAL'],
  },
  {
    id: 3,
    etiqueta: '2°1C',
    titulo: '2° año · 1° cuatrimestre',
    materias: [
      'LENGUA Y LITERATURA',
      'INGLÉS',
      'HISTORIA - GEOGRAFÍA',
      'FÍSICA',
      'CIENCIAS POLÍTICAS',
    ],
  },
  {
    id: 4,
    etiqueta: '2°2C',
    titulo: '2° año · 2° cuatrimestre',
    materias: [
      'MATEMÁTICA',
      'INFORMÁTICA',
      'METODOLOGÍA DE LA INVESTIGACIÓN',
      'POLÍTICAS PÚBLICAS Y D. HUMANOS',
      'ESTADO Y POLÍTICAS PÚBLICAS',
    ],
  },
  {
    id: 5,
    etiqueta: '3°1C',
    titulo: '3° año · 1° cuatrimestre',
    materias: [
      'LENGUA Y LITERATURA',
      'PROBLEMÁTICA SOCIAL CONTEMPORÁNEA',
      'QUÍMICA',
      'INFORMÁTICA',
      'DISEÑO Y DESARROLLO DE PROYECTOS',
    ],
  },
  {
    id: 6,
    etiqueta: '3°2C',
    titulo: '3° año · 2° cuatrimestre',
    materias: [
      'INGLÉS',
      'MATEMÁTICA',
      'COMUNICACIÓN Y MEDIOS',
      'FILOSOFÍA',
      'ESTADO Y NUEVOS MOVIMIENTOS',
    ],
  },
] as const;

export type PlanCalificaciones = 'viejo' | 'nuevo';
