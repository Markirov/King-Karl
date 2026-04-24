import { useState, useEffect, useMemo } from 'react';
import type { SystemsDatabase } from '../types';
import { buildSystemGraph } from '../lib/graph';
import type { SystemGraph } from '../lib/graph';

const BASE = import.meta.env.BASE_URL;

interface UseStarSystemsResult {
  db: SystemsDatabase | null;
  graph: SystemGraph | null;
  loading: boolean;
  error: string | null;
}

// Módulo-level cache: sólo cargamos/construimos el grafo una vez
let cachedDb: SystemsDatabase | null = null;
let cachedGraph: SystemGraph | null = null;
let loadPromise: Promise<void> | null = null;

export function useStarSystems(): UseStarSystemsResult {
  const [db, setDb] = useState<SystemsDatabase | null>(cachedDb);
  const [graph, setGraph] = useState<SystemGraph | null>(cachedGraph);
  const [loading, setLoading] = useState(!cachedDb);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedDb) {
      setDb(cachedDb);
      setGraph(cachedGraph);
      setLoading(false);
      return;
    }

    if (!loadPromise) {
      loadPromise = fetch(`${BASE}data/inner-sphere-systems.json`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<SystemsDatabase>;
        })
        .then(data => {
          cachedDb = data;
          cachedGraph = buildSystemGraph(data.systems);
        })
        .catch(err => {
          loadPromise = null;
          throw err;
        });
    }

    loadPromise
      .then(() => {
        setDb(cachedDb);
        setGraph(cachedGraph);
        setLoading(false);
      })
      .catch(err => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  return { db, graph, loading, error };
}

export { type SystemGraph };
