/** Quita tildes/acentos y pasa el texto a mayúsculas. */
export function normalizeUpper(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}
