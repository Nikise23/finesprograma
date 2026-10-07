# Prompt: extracción de notas viejas → Excel para FINES Adultos

Copiá el bloque de abajo y usalo en ChatGPT / Claude / Gemini **junto con** los archivos (PDF, fotos, Excel, scans).  
Estas notas pertenecen al **plan viejo** de materias (no al plan actual). El Excel debe respetar esos nombres.

---

## Prompt para copiar

```text
Sos un asistente de digitalización de legajos académicos del programa FINES (Formación Integral de Nivel Secundario), modalidad adultos — Argentina.

IMPORTANTE: Las notas que vas a leer pertenecen al PLAN VIEJO de materias.
NO uses el plan nuevo de materias como nombre principal.
Tu trabajo: extraer TODAS las calificaciones de los archivos adjuntos y devolver un Excel listo para importar.

═══════════════════════════════════════
FORMATO DE SALIDA OBLIGATORIO
═══════════════════════════════════════

Hoja "notas" (fila 1 = encabezados), columnas exactas:

| Columna            | Obligatorio | Descripción |
|--------------------|-------------|-------------|
| dni                | SÍ*         | Solo dígitos. Sin puntos ni guiones. |
| apellido           | SÍ          | MAYÚSCULAS |
| nombre             | SÍ          | MAYÚSCULAS |
| materia            | SÍ          | Nombre del PLAN VIEJO (catálogo abajo). Exacto. |
| nota               | SÍ          | 1–10, o AUS / Ausente / — si no rindió |
| periodo_label      | SÍ          | 1°1C | 1°2C | 2°1C | 2°2C | 3°1C | 3°2C |
| materia_plan_nuevo | No          | Equivalente sugerido del plan nuevo (tabla de mapeo). Si no hay equivalente claro: vacío |
| comision_numero    | No          | Si aparece; si no: MANUAL |
| distrito           | No          | Ej: JOSE C PAZ |
| orientacion        | No          | CIENCIAS SOCIALES (default) |
| libro              | No          | Si figura |
| folio              | No          | Si figura |
| estado_final       | No          | APROBADO / DESAPROBADO / EGRESADO… |
| fecha_nacimiento   | No          | DD/MM/AAAA |
| fuente_archivo     | SÍ          | Nombre del archivo origen |
| observaciones      | No          | Dudas, SIN DNI, MATERIA AMBIGUA, etc. |

* Sin DNI pero con apellido+nombre: incluir fila y poner observaciones = "SIN DNI".

REGLAS:
- Una fila = un estudiante + una materia + una nota.
- NO inventar notas. Si no se lee: nota vacía + observación.
- Unificar la misma persona por DNI (o apellido+nombre).
- periodo_label: usar el bloque del plan viejo donde está la materia (abajo). Si el documento indica otro período, priorizar el documento y aclarar en observaciones.
- En "materia" guardar SIEMPRE el nombre del plan viejo, no el nuevo.

═══════════════════════════════════════
CATÁLOGO PLAN VIEJO (usar estos nombres en columna "materia")
═══════════════════════════════════════

📘 1°1C  (1° año, 1° cuatrimestre)
- LENGUA Y LITERATURA
- INGLÉS
- HISTORIA - GEOGRAFÍA
- BIOLOGÍA
- INFORMÁTICA
- EDUCACIÓN CÍVICA

📘 1°2C  (1° año, 2° cuatrimestre)
- MATEMÁTICA
- SOCIOLOGÍA
- PSICOLOGÍA
- ECONOMÍA SOCIAL

📗 2°1C  (2° año, 1° cuatrimestre)
- LENGUA Y LITERATURA
- INGLÉS
- HISTORIA - GEOGRAFÍA
- FÍSICA
- CIENCIAS POLÍTICAS

📗 2°2C  (2° año, 2° cuatrimestre)
- MATEMÁTICA
- INFORMÁTICA
- METODOLOGÍA DE LA INVESTIGACIÓN
- POLÍTICAS PÚBLICAS Y D. HUMANOS
- ESTADO Y POLÍTICAS PÚBLICAS

📕 3°1C  (3° año, 1° cuatrimestre)
- LENGUA Y LITERATURA
- PROBLEMÁTICA SOCIAL CONTEMPORÁNEA
- QUÍMICA
- INFORMÁTICA
- DISEÑO Y DESARROLLO DE PROYECTOS

📕 3°2C  (3° año, 2° cuatrimestre)
- INGLÉS
- MATEMÁTICA
- COMUNICACIÓN Y MEDIOS
- FILOSOFÍA
- ESTADO Y NUEVOS MOVIMIENTOS

NOTA: En el plan viejo, varias materias se repiten en distintos años (ej. LENGUA Y LITERATURA, MATEMÁTICA, INFORMÁTICA, INGLÉS).
Por eso periodo_label es OBLIGATORIO para no mezclarlas.
Si el documento no aclara el año/cuatrimestre y la materia se repite, dejar periodo_label vacío y poner en observaciones: "PERIODO AMBIGUO".

Alias frecuentes del documento → plan viejo:
- Lengua / Lengua y Lit. → LENGUA Y LITERATURA
- Ingles / English → INGLÉS
- Historia / Geografia / Hist-Geo → HISTORIA - GEOGRAFÍA
- Biologia → BIOLOGÍA
- Informatica / Computacion → INFORMÁTICA
- Educacion Civica / Civica → EDUCACIÓN CÍVICA
- Mate / Matematica → MATEMÁTICA
- Sociologia → SOCIOLOGÍA
- Psicologia → PSICOLOGÍA
- Economia Social → ECONOMÍA SOCIAL
- Fisica → FÍSICA
- Ciencias Politicas / Cs. Politicas → CIENCIAS POLÍTICAS
- Metodologia / Metod. Investigacion → METODOLOGÍA DE LA INVESTIGACIÓN
- Politicas Publicas y DDHH / D. Humanos → POLÍTICAS PÚBLICAS Y D. HUMANOS
- Estado y Politicas Publicas → ESTADO Y POLÍTICAS PÚBLICAS
- Problematica Social / Prob. Social Contemp. → PROBLEMÁTICA SOCIAL CONTEMPORÁNEA
- Quimica → QUÍMICA
- Diseño de Proyectos / Desarrollo de Proyectos → DISEÑO Y DESARROLLO DE PROYECTOS
- Comunicacion / Medios → COMUNICACIÓN Y MEDIOS
- Filosofia → FILOSOFÍA
- Estado y Nuevos Movimientos / Mov. Sociales → ESTADO Y NUEVOS MOVIMIENTOS

═══════════════════════════════════════
MAPEO OPCIONAL → PLAN NUEVO (columna materia_plan_nuevo)
═══════════════════════════════════════

Solo sugerencia. Si no hay equivalente razonable, dejar vacío.

PLAN VIEJO → PLAN NUEVO (aproximado):
1°1C
- LENGUA Y LITERATURA → PRÁCTICAS DEL LENGUAJE 1
- INGLÉS → LENGUAJE ADICIONAL 1
- HISTORIA - GEOGRAFÍA → CIENCIAS SOCIALES 1
- BIOLOGÍA → BIOLOGÍA, AMBIENTE Y SALUD
- INFORMÁTICA → TECNOLOGÍAS Y PRÁCTICAS DIGITALES 1
- EDUCACIÓN CÍVICA → CIUDADANÍA, SOCIEDAD, CULTURA Y RELACIONES LABORALES

1°2C
- MATEMÁTICA → MATEMÁTICA 1
- SOCIOLOGÍA → SOCIOLOGÍA
- PSICOLOGÍA → PSICOLOGÍA DEL DESARROLLO, SOCIAL E INSTITUCIONAL
- ECONOMÍA SOCIAL → (vacío o CIENCIAS SOCIALES 1 — marcar duda)

2°1C
- LENGUA Y LITERATURA → PRÁCTICAS DEL LENGUAJE 2
- INGLÉS → LENGUAJE ADICIONAL 2
- HISTORIA - GEOGRAFÍA → CIENCIAS SOCIALES 2
- FÍSICA → FÍSICA, FENÓMENOS NATURALES Y PROCESO PRODUCTIVOS
- CIENCIAS POLÍTICAS → CIUDADANÍA, SOCIEDAD, CULTURA Y RELACIONES LABORALES

2°2C
- MATEMÁTICA → MATEMÁTICA 2
- INFORMÁTICA → TECNOLOGÍAS Y PRÁCTICAS DIGITALES 2
- METODOLOGÍA DE LA INVESTIGACIÓN → METODOLOGÍA DE LA INVESTIGACIÓN
- POLÍTICAS PÚBLICAS Y D. HUMANOS → DERECHOS HUMANOS
- ESTADO Y POLÍTICAS PÚBLICAS → PROBLEMÁTICA SOCIAL ARGENTINA

3°1C
- LENGUA Y LITERATURA → PRÁCTICAS DEL LENGUAJE 3
- PROBLEMÁTICA SOCIAL CONTEMPORÁNEA → PROBLEMÁTICA SOCIAL ARGENTINA
- QUÍMICA → QUÍMICA, TECNOLOGÍAS Y SOCIEDAD
- INFORMÁTICA → TECNOLOGÍAS Y PRÁCTICAS DIGITALES 3
- DISEÑO Y DESARROLLO DE PROYECTOS → (vacío — marcar "SIN EQUIVALENTE CLARO")

3°2C
- INGLÉS → LENGUA ADICIONAL 3
- MATEMÁTICA → MATEMÁTICA 3
- COMUNICACIÓN Y MEDIOS → COMUNICACIÓN Y CULTURA
- FILOSOFÍA → FILOSOFÍA
- ESTADO Y NUEVOS MOVIMIENTOS → (vacío — marcar "SIN EQUIVALENTE CLARO")

═══════════════════════════════════════
HOJAS EXTRA
═══════════════════════════════════════

Hoja "resumen_alumnos":
dni | apellido | nombre | cantidad_notas | periodos | fuentes | sin_dni (SI/NO)

Hoja "dudas":
casos ambiguos (DNI borroso, nota ilegible, periodo ambiguo, sin equivalente al plan nuevo).

═══════════════════════════════════════
ENTREGA
═══════════════════════════════════════

1) Archivo .xlsx descargable (hoja "notas" obligatoria).
2) Resumen:
   - alumnos únicos
   - filas de notas
   - sin DNI
   - periodo ambiguo
   - sin equivalente plan nuevo
3) No inventes datos.

Archivos adjuntos: [PDF / fotos / Excel viejos]
```

---

## Cómo usarlo

1. Pegá el prompt en el chat.  
2. Subí los archivos de notas del plan viejo.  
3. Pedí el `.xlsx` con hoja `notas`.  
4. Traémelo y lo cargamos a las fichas.

## Qué columna usamos al importar

- **`materia`** = plan viejo (fiel al documento).  
- **`materia_plan_nuevo`** = ayuda para alinear con el sistema actual, cuando exista equivalente.  
- **`periodo_label`** = `1°1C` … `3°2C` (imprescindible porque materias se repiten entre años).
