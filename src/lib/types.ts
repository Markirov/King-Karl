// ═══════════════════════════════════════════════════════════════
// TYPES — Domain types for Warthogs Fleet
// ═══════════════════════════════════════════════════════════════

export type Palette = 'amber' | 'blue' | 'green';

// ── Navigation ──
export interface NavSection {
  label: string;
  items: NavItem[];
}
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  palette: Palette;
  /** Sub-tabs within this section (e.g., Simulador → Mechs / Vehículos / Infantería) */
  tabs?: { id: string; label: string }[];
}

// ── Combat Units ──
export type SquareStatus = 'optimal' | 'damaged' | 'destroyed' | 'empty';

export interface CritComponent {
  name: string;
  damaged: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  location: string;
  damage: number;
  heat: number;
  minRange: number;
  shortRange: number;
  medRange: number;
  longRange: number;
  ammo: number;
  maxAmmo: number;
  selected: boolean;
  type: 'energy' | 'ballistic' | 'missile' | 'melee' | 'equipment';
}

export interface PilotData {
  name: string;
  gunnery: number;
  piloting: number;
  hits: number;
}

export interface MovementData {
  mode: 'stationary' | 'walk' | 'run' | 'jump' | 'cruise' | 'flank';
  distance: number;
}

export interface MechUnit {
  type: 'mech';
  name: string;
  model: string;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  armor: Record<string, SquareStatus[]>;
  structure: Record<string, SquareStatus[]>;
  components: Record<string, CritComponent[]>;
  weapons: Weapon[];
  currentHeat: number;
  turnHeat: number;
  heatSinks: number;
  heatSinkType: 'single' | 'double';
  pilot: PilotData;
  movement: MovementData;
  logs: string[];
  source: string;
}

export interface VehicleUnit {
  type: 'vehicle';
  name: string;
  model: string;
  tonnage: number;
  cruiseMP: number;
  flankMP: number;
  motiveType: string;
  turretType: string;
  armor: Record<string, SquareStatus[]>;
  structure: Record<string, SquareStatus[]>;
  components: Record<string, CritComponent[]>;
  weapons: Weapon[];
  logs: string[];
  source: string;
}

export type CombatUnit = MechUnit | VehicleUnit;

// ── MechWarrior Character (Barracones) ──
export interface MechWarrior {
  nombre: string;
  apellido: string;
  apodo: string;
  afiliacion: string;
  edad: number;
  genero: string;
  estudios: string;
  atributos: Record<string, number>;
  habilidades: { nombre: string; nivel: number; mejoras: number; vinculado: string }[];
  xpTotal: number;
  xpGastado: number;
  veterania: string;
  mechAsignado: string;
  estado: 'activo' | 'herido' | 'hospitalizado' | 'kia' | 'mia' | 'retirado';
}

// ── TRO Entry ──
export interface TROEntry {
  name: string;
  model: string;
  mass: number;
  bv: number;
  role: string;
  era: string;
  techBase: string;
  source: string;
  file?: string;
}

// ── Campaign ──
export interface CampaignConfig {
  playerName: string;
  campaignYear: number;
  campaignMonth: number;
  unitName: string;
  scriptUrl: string;
  pilotMechs: string[]; // PILOTO_1_MECH … PILOTO_4_MECH from config
  contratoValor: string; // CONTRATO_VALOR from config (e.g. "5.000.000 ₡")
  valorUnidad:   string; // VALOR_UNIDAD from config (e.g. "7.480")
  totalMechs:    string; // TOTAL_MECHS from config
}
