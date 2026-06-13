// ══════════════════════════════════════════════════════════════
//  Currency helpers — formato y parsing del valor tesorería (₡)
//  Soporta separadores es-ES (1.234.567,89), también es-US y plano.
//  Replicado verbatim de ComisionPage.tsx para reuso (FinanzasPage,
//  commitLibroEntryAndTreasury, etc.).
// ══════════════════════════════════════════════════════════════

export function formatCzar(n: number): string {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  const hasDecimals = Math.abs(rounded % 1) > 0.001;
  return `${rounded.toLocaleString('es-ES', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })} ₡`;
}

export function parseCurrencyValue(raw: string | undefined): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;

  // Heuristica: la coma SIEMPRE es decimal en es-ES. El punto es siempre
  // separador de miles (solo grupos de 3). Para evitar interpretar
  // "413.085" como 413,085 (float), si solo hay puntos y forman grupos
  // de 3 -> tratar como miles.

  const hasComma = cleaned.includes(',');
  const hasDot   = cleaned.includes('.');

  // Solo coma -> decimal
  if (hasComma && !hasDot) {
    const n = Number(cleaned.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  // Solo puntos -> miles si formato \d{1,3}(\.\d{3})+ ; sino decimal
  if (hasDot && !hasComma) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      const n = Number(cleaned.replace(/\./g, ''));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  // Ambos -> dot=miles, comma=decimal (es-ES standard)
  if (hasDot && hasComma) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  // Sin separadores
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
