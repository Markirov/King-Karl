import type { StarSystem, Faction } from '../types';

/**
 * Devuelve el código de facción del sistema en el año dado.
 * Busca el yearColumn más reciente ≤ year.
 * Sub-años como "3050a", "3050b" se evalúan como parseFloat → 3050.
 * Devuelve null si no hay datos para ese año.
 */
export function getFactionAt(
  system: StarSystem,
  year: number,
  yearColumns: string[],
): string | null {
  let bestIdx = -1;
  for (let i = 0; i < yearColumns.length; i++) {
    if (parseFloat(yearColumns[i]) <= year) bestIdx = i;
    else break; // yearColumns están ordenados ascendentemente
  }
  if (bestIdx < 0) return null;
  const code = system.factions[bestIdx];
  return code || null;
}

/** Devuelve el string completo "LC|Province|District" para tooltip. */
export function getProvinceAt(
  system: StarSystem,
  year: number,
  yearColumns: string[],
): string | null {
  let bestIdx = -1;
  for (let i = 0; i < yearColumns.length; i++) {
    if (parseFloat(yearColumns[i]) <= year) bestIdx = i;
    else break;
  }
  if (bestIdx < 0) return null;
  return system.provinces[bestIdx] || null;
}

export function getFactionColor(
  factionCode: string | null,
  factions: Record<string, Faction>,
): string {
  if (!factionCode) return '#444444';
  return factions[factionCode]?.color ?? '#444444';
}

export function getFactionName(
  factionCode: string | null,
  factions: Record<string, Faction>,
): string {
  if (!factionCode) return 'Desconocido';
  return factions[factionCode]?.name ?? factionCode;
}
