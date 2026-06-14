import type { SystemGraph } from './graph';

// Min-heap priority queue
class PriorityQueue<T> {
  private heap: T[] = [];
  constructor(private compare: (a: T, b: T) => number) {}

  enqueue(item: T) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  isEmpty() { return this.heap.length === 0; }

  private _bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[i], this.heap[parent]) < 0) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  private _sinkDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.compare(this.heap[l], this.heap[smallest]) < 0) smallest = l;
      if (r < n && this.compare(this.heap[r], this.heap[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

/**
 * Dijkstra: ruta más corta entre dos sistemas.
 * minimize='jumps'    → minimiza número de saltos (coste = 1 por salto)
 * minimize='distance' → minimiza distancia total en LY
 */
export function findShortestRoute(
  graph: SystemGraph,
  fromId: string,
  toId: string,
  minimize: 'jumps' | 'distance' = 'jumps',
): string[] | null {
  if (!graph.nodes.has(fromId) || !graph.nodes.has(toId)) return null;
  if (fromId === toId) return [fromId];

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  const pq = new PriorityQueue<{ id: string; cost: number }>((a, b) => a.cost - b.cost);

  graph.nodes.forEach((_, id) => dist.set(id, Infinity));
  dist.set(fromId, 0);
  pq.enqueue({ id: fromId, cost: 0 });

  while (!pq.isEmpty()) {
    const { id: current } = pq.dequeue()!;
    if (current === toId) break;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const { id: neighbor, distance: edgeDist } of graph.adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      const edgeCost = minimize === 'jumps' ? 1 : edgeDist;
      const newDist = dist.get(current)! + edgeCost;
      if (newDist < dist.get(neighbor)!) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, current);
        pq.enqueue({ id: neighbor, cost: newDist });
      }
    }
  }

  if (!prev.has(toId) && fromId !== toId) return null;

  const path: string[] = [];
  let cur: string | undefined = toId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur);
  }

  return path[0] === fromId ? path : null;
}
