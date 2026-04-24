import type { StarSystem } from '../types';

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSystems(a: StarSystem, b: StarSystem): number {
  return distance(a, b);
}
