// src/features/jumpCalculator/types.ts

export interface StarSystem {
  id: number;
  name: string;
  altNames: string[];
  x: number;
  y: number;
  sarnaUrl: string | null;
  spectralType: string | null;
  primarySlot: number | null;
  /** Código de facción por era, paralelo a SystemsDatabase.meta.yearColumns */
  factions: string[];
  /** String completo "LC|Province|District" por era (para tooltip) */
  provinces: string[];
}

export interface NebulaRecord {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Faction {
  name: string;
  color: string;
}

export interface SystemsMeta {
  version: string;
  generated: string;
  sucsVersion: string;
  systemCount: number;
  yearColumns: string[];   // ["2271", "2317", ..., "3050a", "3050b", ..., "3152"]
}

export interface SystemsDatabase {
  meta: SystemsMeta;
  availableYears: string[];
  systems: StarSystem[];
  nebulae: NebulaRecord[];
  factions: Record<string, Faction>;
}

// ── Calculador de saltos ──────────────────────────────────────────────────

/** Waypoint con metadata de visita */
export interface RouteWaypoint {
  system: StarSystem;
  planetVisit: boolean;
  visitReason?: string;
}

export interface JumpStep {
  fromSystem: StarSystem;
  toSystem: StarSystem;
  distance: number;
  rechargeDays: number;
  factionAtArrival: string | null;
  factionColor: string;
  planetVisit: boolean;
  visitReason?: string;
  planetVisitDays: number;
  cumulativeDays: number;
}

export interface JumpRoute {
  waypoints: StarSystem[];
  steps: JumpStep[];
  totalDistance: number;
  totalJumps: number;
  totalDays: number;
  rechargeDays: number;
  planetVisitDays: number;
  destinationDays: number;
  estimatedCost: number;
  warnings: string[];
}

export interface CalculatorOptions {
  year: number;
  minimize: 'jumps' | 'distance';
  inSystemDaysAtDestination: number;
}
