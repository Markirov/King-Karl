import type { StarSystem } from '../types';
import { JUMP_RANGE_LY } from '../constants';
import { distance } from './distance';

// IDs son números en el nuevo formato — usamos string-keys en el Map para el Dijkstra
export interface SystemGraph {
  nodes:     Map<string, StarSystem>;
  adjacency: Map<string, Array<{ id: string; distance: number }>>;
}

function sysKey(id: number): string { return String(id); }

/**
 * Construye el grafo de saltos conectando sistemas a ≤30 LY.
 * O(n²) — 3179 sistemas ≈ 5M pares, ~1-2s en construcción única.
 * Cacheado a nivel de módulo en useStarSystems.
 */
export function buildSystemGraph(systems: StarSystem[]): SystemGraph {
  const nodes     = new Map<string, StarSystem>();
  const adjacency = new Map<string, Array<{ id: string; distance: number }>>();

  for (const s of systems) {
    const k = sysKey(s.id);
    nodes.set(k, s);
    adjacency.set(k, []);
  }

  for (let i = 0; i < systems.length; i++) {
    for (let j = i + 1; j < systems.length; j++) {
      const a    = systems[i];
      const b    = systems[j];
      const dist = distance(a, b);

      if (dist <= JUMP_RANGE_LY) {
        const ka = sysKey(a.id), kb = sysKey(b.id);
        adjacency.get(ka)!.push({ id: kb, distance: dist });
        adjacency.get(kb)!.push({ id: ka, distance: dist });
      }
    }
  }

  return { nodes, adjacency };
}
