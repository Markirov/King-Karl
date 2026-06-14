import { useMemo } from 'react';
import type { StarSystem, SystemsDatabase } from '@/features/jumpCalculator/types';
import { computeClippedCells } from '../lib/voronoi';
import { polygonsToPath } from '../lib/svgPath';
import { getFactionAt } from '@/features/jumpCalculator/lib/factions';
import { FACTION_COLORS, DEFAULT_MAX_RADIUS } from '../constants';

const UNINHABITED_SET = new Set(['A', 'U', 'I', '']);

/**
 * Si el sistema está Abandonado ('A'), devuelve el propietario más reciente
 * antes del año actual usando el array paralelo de facciones.
 */
function getPreviousOwner(
  system: StarSystem,
  year: number,
  yearColumns: string[],
): string | null {
  // Encontrar el índice del año actual
  let curIdx = -1;
  for (let i = 0; i < yearColumns.length; i++) {
    if (parseFloat(yearColumns[i]) <= year) curIdx = i;
    else break;
  }
  if (curIdx < 0) return null;

  // Buscar hacia atrás el último propietario real (no A/U/I)
  for (let i = curIdx - 1; i >= 0; i--) {
    const f = system.factions[i];
    if (f && !UNINHABITED_SET.has(f)) return f;
  }
  return null;
}

export interface TerritoryBlob {
  faction: string;
  path: string;
  color: string;
  systemCount: number;
}

export function useTerritories(
  systems: StarSystem[],
  db: SystemsDatabase,
  year: number,
  maxRadius: number = DEFAULT_MAX_RADIUS,
): TerritoryBlob[] {
  const yearColumns = db.meta?.yearColumns ?? [];

  // Paso 1: celdas recortadas (solo recalcula si cambia systems o maxRadius)
  const cells = useMemo(
    () => computeClippedCells(systems, maxRadius),
    [systems, maxRadius],
  );

  // Paso 2: asignar facciones y agrupar en paths (recalcula al cambiar año)
  return useMemo(() => {
    // Construir lookup system id → faction
    // Sistemas Abandonados ('A') conservan el color del último propietario real
    const factionBySystem = new Map<number, string>();
    for (const s of systems) {
      let f = getFactionAt(s, year, yearColumns) ?? 'U';
      if (f === 'A') {
        f = getPreviousOwner(s, year, yearColumns) ?? 'A';
      }
      factionBySystem.set(s.id, f);
    }

    // Agrupar polígonos por facción
    const byFaction = new Map<string, number[][][]>();
    for (const cell of cells) {
      const faction = factionBySystem.get(cell.systemId) ?? 'U';
      if (!byFaction.has(faction)) byFaction.set(faction, []);
      byFaction.get(faction)!.push(cell.polygon);
    }

    // Construir blobs
    const blobs: TerritoryBlob[] = [];
    for (const [faction, polys] of byFaction) {
      const color =
        db.factions[faction]?.color ??
        FACTION_COLORS[faction] ??
        '#666666';

      blobs.push({
        faction,
        path: polygonsToPath(polys),
        color,
        systemCount: polys.length,
      });
    }

    // Ordenar: facciones menores primero (para que las grandes queden encima)
    return blobs.sort((a, b) => a.systemCount - b.systemCount);
  }, [cells, systems, year, db, yearColumns]);
}
