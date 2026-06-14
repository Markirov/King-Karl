/** Convierte un polígono (array de [x,y]) en un string de path SVG. */
export function polygonToPath(poly: number[][]): string {
  if (poly.length < 3) return '';
  return (
    'M' + poly[0][0].toFixed(2) + ',' + poly[0][1].toFixed(2) +
    poly.slice(1).map(p => 'L' + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join('') +
    'Z'
  );
}

/**
 * Combina múltiples polígonos de la misma facción en un único path SVG.
 * Usa subpaths "M...Z M...Z" — el fill cubre todos los fragmentos de la misma facción.
 */
export function polygonsToPath(polys: number[][][]): string {
  return polys.map(polygonToPath).filter(Boolean).join(' ');
}
