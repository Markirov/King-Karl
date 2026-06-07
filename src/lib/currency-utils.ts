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
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const sep = Math.max(lastComma, lastDot);
  if (sep === -1) {
    const n = Number(cleaned.replace(/[^\d-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  const intRaw = cleaned.slice(0, sep);
  const intPart = intRaw.replace(/[.,]/g, '');
  const decPart = cleaned.slice(sep + 1).replace(/[^\d]/g, '');
  const hasGroupSepBefore = /[.,]/.test(intRaw);
  const decSep = lastComma > lastDot ? ',' : '.';
  if (decPart.length === 1 || decPart.length === 2) {
    const n = Number(`${intPart || '0'}.${decPart}`);
    return Number.isFinite(n) ? n : null;
  }
  // Caso típico de coma flotante (p.ej. "2100783.900000024"): un único separador y muchos decimales.
  if (!hasGroupSepBefore && decPart.length > 2) {
    const normalized = decSep === ','
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(cleaned.replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
