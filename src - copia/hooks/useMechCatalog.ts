// ══════════════════════════════════════════════════════════════
//  useMechCatalog — Carga + cache global del index enriquecido
//  Mechs + vehículos. Singleton via promise cached.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

export interface CatalogMech {
  name:         string;          // = fullName (chassis + model + variant)
  chassis:      string;
  model:        string;
  fullName:     string;
  file:         string;
  kind:         'mech';
  tons:         number;
  weightClass:  'light' | 'medium' | 'heavy' | 'assault';
  categoria:    'Ligero' | 'Medio' | 'Pesado' | 'Asalto';
  isOmni:       boolean;
  isClan:       boolean;
  techBase:     string;
  unitType:     string;
  rulesLevel:   number;
  era:          number;
  year:         number;
  bv2:          number;
  cost:         number;
  motive:       'Biped' | 'Quad';
  numLegs:      number;
  engine:       { rating: number; type: string };
  walkMP:       number;
  runMP:        number;
  jumpMP:       number;
  structure:    string;
  armor:        { type: string; total: number; byLocation: Record<string, number> };
  heatSinks:    { count: number; type: 'Single' | 'Double'; dissipation: number };
  weapons:      Record<string, number>;
  weaponsTotal: number;
  totalHeat:    number;
  totalDamage:  number;
  ammo:         { name: string; count: number }[];
  source:       string;
}

export interface CatalogVehicle {
  name:         string;
  chassis:      string;
  model:        string;
  fullName:     string;
  file:         string;
  kind:         'vehicle';
  type:         string;           // motiveType (backward compat TROPage)
  unitType:     string;           // 'Combat Vehicle'
  motiveType:   string;
  tons:         number;
  weightClass:  string;
  categoria:    string;
  isOmni:       boolean;
  isClan:       boolean;
  techBase:     string;
  rulesLevel:   number;
  era:          number;
  year:         number;
  bv2:          number;
  cost:         number;
  cruise:       number;
  flank:        number;
  turret:       string;
  engine:       { rating: number; type: string };
  armor:        { type: string; total: number; byLocation: Record<string, number> };
  heatSinks:    { count: number; type: 'Single' | 'Double'; dissipation: number };
  weapons:      Record<string, number>;
  weaponsTotal: number;
  totalHeat:    number;
  totalDamage:  number;
  ammo:         { name: string; count: number }[];
}

interface Catalog {
  mechs:    CatalogMech[];
  vehicles: CatalogVehicle[];
}

let cachedPromise: Promise<Catalog> | null = null;

async function loadCatalog(): Promise<Catalog> {
  const base = import.meta.env.BASE_URL;
  // Usa minified en prod, legible en dev
  const suffix = import.meta.env.DEV ? 'index.json' : 'index.min.json';
  const [mechs, vehicles] = await Promise.all([
    fetch(`${base}assets/mechs/${suffix}`).then(r => r.ok ? r.json() : []),
    fetch(`${base}assets/vehicles/${suffix}`).then(r => r.ok ? r.json() : []),
  ]);
  return { mechs, vehicles };
}

export function useMechCatalog(): {
  catalog: Catalog | null;
  loading: boolean;
} {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cachedPromise) cachedPromise = loadCatalog();
    cachedPromise.then(c => {
      setCatalog(c);
      setLoading(false);
    }).catch(() => {
      setCatalog({ mechs: [], vehicles: [] });
      setLoading(false);
    });
  }, []);

  return { catalog, loading };
}

/** Match mech in catalog por nombre (fuzzy: chassis + model). */
export function findMechByName(mechs: CatalogMech[], name: string): CatalogMech | null {
  if (!name) return null;
  const q = name.trim().toLowerCase();
  // Match exacto primero
  const exact = mechs.find(m => m.fullName.toLowerCase() === q);
  if (exact) return exact;
  // Substring: chassis + model
  return mechs.find(m =>
    q.includes(m.chassis.toLowerCase()) &&
    (!m.model || q.includes(m.model.toLowerCase()))
  ) ?? null;
}
