import { Delaunay } from 'd3-delaunay';
import type { StarSystem } from '@/features/jumpCalculator/types';
import { clipPolygonToCircle } from './geometry';
import { MAP_BOUNDS, DEFAULT_MAX_RADIUS } from '../constants';

export interface ClippedCell {
  systemId: number;
  svgX: number;   // s.x (same in SVG)
  svgY: number;   // -s.y (flipped for SVG)
  polygon: number[][];  // vértices en espacio SVG
}

// Caché a nivel de módulo (persiste entre renders)
let _cache: { systems: StarSystem[]; maxRadius: number; cells: ClippedCell[] } | null = null;

/**
 * Construye celdas Voronoi recortadas por círculo de radio maxRadius.
 * Resultado cacheado: solo se recalcula si cambian systems o maxRadius.
 *
 * NOTA: d3-delaunay opera en el espacio SVG (y = -s.y, y crece hacia abajo).
 */
export function computeClippedCells(
  systems: StarSystem[],
  maxRadius: number = DEFAULT_MAX_RADIUS,
): ClippedCell[] {
  if (
    _cache &&
    _cache.systems === systems &&
    _cache.maxRadius === maxRadius
  ) {
    return _cache.cells;
  }

  // Coordenadas SVG: x igual, y invertido
  const svgCoords = systems.map(s => [s.x, -s.y] as [number, number]);

  // Construir triangulación de Delaunay
  const flat = new Float64Array(systems.length * 2);
  for (let i = 0; i < systems.length; i++) {
    flat[2 * i]     = svgCoords[i][0];
    flat[2 * i + 1] = svgCoords[i][1];
  }
  const delaunay = new Delaunay(flat);
  const voronoi  = delaunay.voronoi(MAP_BOUNDS);

  const cells: ClippedCell[] = [];

  for (let i = 0; i < systems.length; i++) {
    const raw = voronoi.cellPolygon(i);
    // raw is [[x0,y0], [x1,y1], ..., [x0,y0]] — closed polygon (last = first)
    if (!raw || raw.length < 4) continue;

    // Drop the closing duplicate
    const pts: number[][] = (raw as [number, number][])
      .slice(0, raw.length - 1)
      .map(p => [p[0], p[1]]);

    const cx = svgCoords[i][0];
    const cy = svgCoords[i][1];
    const clipped = clipPolygonToCircle(pts, cx, cy, maxRadius);

    if (clipped.length >= 3) {
      cells.push({
        systemId: systems[i].id,
        svgX: cx,
        svgY: cy,
        polygon: clipped,
      });
    }
  }

  _cache = { systems, maxRadius, cells };
  return cells;
}
