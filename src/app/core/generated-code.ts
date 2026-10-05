export function generatedCode(name: unknown, maxLength = 80): string {
  return String(name ?? '').trim().normalize('NFD').replace(/\p{M}/gu, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    .slice(0, maxLength).replace(/_$/, '');
}
