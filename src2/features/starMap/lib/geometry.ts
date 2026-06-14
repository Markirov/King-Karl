/**
 * Geometría 2D para recorte de polígonos Voronoi.
 * Todos los cálculos en espacio SVG (y invertido respecto a BT: cy = -s.y)
 */

import { CIRCLE_SEGMENTS } from '../constants';

/** Genera un polígono regular de N lados que aproxima un círculo. CCW en screen space. */
export function circlePolygon(
  cx: number,
  cy: number,
  r: number,
  n: number = CIRCLE_SEGMENTS,
): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/** True si p está al interior (a la izquierda) de la semirrecta a→b. */
function isInside(p: number[], a: number[], b: number[]): boolean {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
}

/** Intersección de segmentos p1→p2 con a→b. */
function intersect(p1: number[], p2: number[], a: number[], b: number[]): number[] {
  const dx1 = p2[0] - p1[0], dy1 = p2[1] - p1[1];
  const dx2 = b[0] - a[0],   dy2 = b[1] - a[1];
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return p1; // paralelas
  const t = ((a[0] - p1[0]) * dy2 - (a[1] - p1[1]) * dx2) / denom;
  return [p1[0] + t * dx1, p1[1] + t * dy1];
}

/**
 * Sutherland-Hodgman: recorta `subject` contra cada arista de `clip`.
 * El polígono clip debe ser convexo y CCW (en screen space, y-down).
 */
export function sutherlandHodgman(
  subject: number[][],
  clip: number[][],
): number[][] {
  let output = subject.slice();
  for (let c = 0; c < clip.length; c++) {
    if (output.length === 0) return [];
    const input = output.slice();
    output = [];
    const a = clip[c];
    const b = clip[(c + 1) % clip.length];
    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const currIn = isInside(curr, a, b);
      const prevIn = isInside(prev, a, b);
      if (currIn) {
        if (!prevIn) output.push(intersect(prev, curr, a, b));
        output.push(curr);
      } else if (prevIn) {
        output.push(intersect(prev, curr, a, b));
      }
    }
  }
  return output;
}

/**
 * Intersecta un polígono Voronoi con un círculo centrado en (cx,cy) de radio r.
 * Devuelve el polígono recortado, o [] si no hay intersección.
 */
export function clipPolygonToCircle(
  polygon: number[][],
  cx: number,
  cy: number,
  r: number,
): number[][] {
  if (polygon.length < 3) return [];
  const clip = circlePolygon(cx, cy, r);
  return sutherlandHodgman(polygon, clip);
}
