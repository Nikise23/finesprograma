/**
 * Plan Bachiller en Ciencias Sociales — FINES Adultos
 *
 * En este plan, "módulo" = "cuatrimestre" del trayecto (hay 6):
 *   1 = 1°1C, 2 = 1°2C, 3 = 2°1C, 4 = 2°2C, 5 = 3°1C, 6 = 3°2C
 * Cada comisión cursa UN cuatrimestre y hereda las materias de ese bloque.
 */
export const MODULOS_FINES = [
  {
    id: 1,
    etiqueta: '1°1C',
    titulo: 'Ambiente y salud: conflictos en la construcción de un desarrollo sustentable',
    materias: [
      'PRÁCTICAS DEL LENGUAJE 1',
      'EDUCACIÓN ARTÍSTICA 1',
      'BIOLOGÍA, AMBIENTE Y SALUD',
      'CIENCIAS SOCIALES 1',
      'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 1',
    ],
  },
  {
    id: 2,
    etiqueta: '1°2C',
    titulo: 'Dilemas sobre ciudadanía y vulneración de derechos de grupos sociales',
    materias: [
      'SOCIOLOGÍA',
      'MATEMÁTICA 1',
      'EDUCACIÓN FÍSICA 1',
      'PSICOLOGÍA DEL DESARROLLO, SOCIAL E INSTITUCIONAL',
      'LENGUAJE ADICIONAL 1',
    ],
  },
  {
    id: 3,
    etiqueta: '2°1C',
    titulo: 'Diversidad sociocultural e interculturalidad: tensiones, disputas y apropiaciones',
    materias: [
      'PRÁCTICAS DEL LENGUAJE 2',
      'EDUCACIÓN ARTÍSTICA 2',
      'FÍSICA, FENÓMENOS NATURALES Y PROCESO PRODUCTIVOS',
      'CIENCIAS SOCIALES 2',
      'CIUDADANÍA, SOCIEDAD, CULTURA Y RELACIONES LABORALES',
    ],
  },
  {
    id: 4,
    etiqueta: '2°2C',
    titulo: 'Desarrollo territorial, producción y configuraciones del trabajo',
    materias: [
      'METODOLOGÍA DE LA INVESTIGACIÓN',
      'MATEMÁTICA 2',
      'DERECHOS HUMANOS',
      'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 2',
      'EDUCACIÓN FÍSICA 2',
      'LENGUAJE ADICIONAL 2',
    ],
  },
  {
    id: 5,
    etiqueta: '3°1C',
    titulo:
      'Desigualdades en la disponibilidad, el acceso y la apropiación de las tecnologías como herramientas de organización social',
    materias: [
      'PRÁCTICAS DEL LENGUAJE 3',
      'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 3',
      'EDUCACIÓN FÍSICA 3',
      'PROBLEMÁTICA SOCIAL ARGENTINA',
      'QUÍMICA, TECNOLOGÍAS Y SOCIEDAD',
    ],
  },
  {
    id: 6,
    etiqueta: '3°2C',
    titulo: 'Prácticas emancipadoras, demandas y organización popular',
    materias: [
      'EDUCACIÓN ARTÍSTICA 3',
      'LENGUA ADICIONAL 3',
      'MATEMÁTICA 3',
      'COMUNICACIÓN Y CULTURA',
      'FILOSOFÍA',
    ],
  },
] as const;
