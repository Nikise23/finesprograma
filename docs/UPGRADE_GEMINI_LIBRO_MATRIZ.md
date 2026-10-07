/**
 * Paso a paso para sumar OCR con Gemini encima de la carga manual (opción C).
 *
 * Hoy: la foto solo se ve en el browser; las notas se tipan a mano y se confirman
 * con POST /trayectorias/dni/:dni/calificaciones-libro
 *
 * Meta: Gemini lee la foto → rellena el mismo formulario → el usuario confirma.
 * La foto sigue sin guardarse en disco.
 */

## 1. Cuenta y API key

1. Entrá a https://aistudio.google.com/
2. Creá una API key (free tier alcanza para pruebas / uso moderado).
3. En `backend/.env` agregá:
   ```
   GEMINI_API_KEY=tu_clave
   GEMINI_MODEL=gemini-3.8-flash
   ```
4. En Render (si desplegás): mismas variables en el Web Service de la API.
5. Reiniciá el backend.

**Nota (2026):** `gemini-2.0-flash` / `1.5-flash` ya no están disponibles para cuentas nuevas.
Usá `gemini-3.8-flash` (o el que indique AI Studio).

## 2. Backend — extractor

Crear `backend/src/modules/trayectorias/libro-matriz-vision.ts`:

- Recibe `buffer` + `mimeType` de la imagen (multer `memoryStorage`, sin escribir archivo).
- Llama a Gemini (`@google/generative-ai` o REST `generativelanguage.googleapis.com`).
- Prompt: devolver JSON estricto con:
  - `plan`: `"viejo"` | `"nuevo"`
  - `dni`, `apellido`, `nombre`, `fechaNacimiento`, `libro`, `folio`
  - `notas[]`: `{ materia, nota, periodoLabel }`
- Incluir en el prompt los catálogos de:
  - plan viejo → `materias-plan-viejo.ts`
  - plan nuevo → `materias-fines.ts`
- Si falta `GEMINI_API_KEY`, lanzar 503 claro.

Endpoint nuevo (solo preview, no guarda):

```
POST /trayectorias/dni/:dni/libro-matriz-foto/preview
Content-Type: multipart/form-data
file: imagen
```

Respuesta = mismo shape que usa el formulario de confirmación actual
(`plan`, `libro`, `folio`, `notas[]`, warnings si DNI distinto al de la ficha).

## 3. Confirmar = reutilizar lo que ya existe

**No inventar otro guardado.** El front, tras el preview de Gemini, llama al endpoint actual:

```
POST /trayectorias/dni/:dni/calificaciones-libro
```

con el JSON editable (usuario puede corregir antes de guardar).

## 4. Frontend

En el panel "Cargar desde libro matriz":

1. Mantener la foto local como referencia.
2. Botón **Leer con Gemini** (solo si el backend tiene key; si 503, ocultar o avisar).
3. Subir la misma File al endpoint `/preview`.
4. Rellenar plan + libro/folio + notas del formulario.
5. El usuario revisa y toca **Guardar en ficha** (flujo C actual).

## 5. Costos / límites free

- Free tier: tokens gratis en modelos elegibles; límites diarios variables por modelo/cuenta
  (aprox. ~20 req/día en Flash “full”, ~500 en Flash-Lite — ver AI Studio → Rate limits).
- Pago (orientativo Gemini 3.8 Flash, intro hasta dic-2026): ~USD 0,75 / 1M input y
  ~USD 3,75 / 1M output. Una foto de libro matriz suele costar fracciones de centavo.
- Si se agota el free, la carga manual (C) sigue funcionando.
- Comprimir la imagen en el client (~1600px) baja tokens.

## 6. Checklist de implementación

- [x] `npm i @google/generative-ai` en backend
- [x] `GEMINI_API_KEY` en `.env` (también en Render si desplegás)
- [x] `libro-matriz-vision.ts`
- [x] `POST .../libro-matriz-foto/preview` (multer memory, sin disco)
- [x] Botón UI "Leer con Gemini" → rellena form C
- [x] Imagen no se escribe en `UPLOAD_DIR`
- [x] Carga manual sigue disponible sin key

## 7. Qué no hacer

- No guardar la foto en S3/disco "por las dudas".
- No guardar automático sin preview (riesgo de OCR mal leído).
- No reemplazar la carga manual: Gemini es ayuda, C es el fallback.
