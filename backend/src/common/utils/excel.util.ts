export function cellText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.result != null) return String(obj.result).trim();
    if (obj.text != null) return String(obj.text).trim();
    if (obj.richText && Array.isArray(obj.richText)) {
      return obj.richText.map((p: { text?: string }) => p.text ?? '').join('').trim();
    }
  }
  return String(value).trim();
}

export function normalizeDni(dni: string): string {
  return dni.replace(/\D/g, '');
}
