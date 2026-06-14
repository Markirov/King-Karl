// ══════════════════════════════════════════════════════════════
//  ASSET PRICES — Tabla compras Hoja 28 (campaña ELH)
//  Importes en miles ₡ por unidad individual según experiencia.
// ══════════════════════════════════════════════════════════════

export type ExperienceLevel = 'green' | 'regular' | 'veteran' | 'elite';
export type MechWeightClass = 'light' | 'medium' | 'heavy' | 'assault';
export type AcquisitionKind =
  | 'mech_new' | 'mech_salvaged'
  | 'fighter_new' | 'fighter_salvaged'
  | 'infantry' | 'motorized_infantry' | 'jump_infantry'
  | 'light_armor' | 'heavy_armor' | 'artillery'
  | 'scout' | 'support_tech';

interface PriceTable {
  green: number;    // miles ₡
  regular: number;
  veteran: number;
  elite: number;
  label: string;
}

/** Mechs nuevos por categoría peso × experiencia. Valores en miles ₡.
 *  Rangos canónicos BattleTech: Light 20-35 · Medium 40-55 · Heavy 60-75 · Assault 80-100. */
export const MECH_NEW_PRICES: Record<MechWeightClass, PriceTable> = {
  light:   { green: 230,  regular: 460,   veteran: 920,   elite: 1840, label: "Mech Ligero (20-35 t)" },
  medium:  { green: 390,  regular: 780,   veteran: 1560,  elite: 3120, label: "Mech Medio (40-55 t)" },
  heavy:   { green: 570,  regular: 1140,  veteran: 2280,  elite: 4560, label: "Mech Pesado (60-75 t)" },
  assault: { green: 820,  regular: 1640,  veteran: 3280,  elite: 6560, label: "Mech Asalto (80-100 t)" },
};

/** Mechs recuperados ~40% del precio nuevo. */
export const MECH_SALVAGED_PRICES: Record<MechWeightClass, PriceTable> = {
  light:   { green: 92,  regular: 184, veteran: 368,  elite: 736,  label: "Mech Light Salvaged" },
  medium:  { green: 156, regular: 312, veteran: 624,  elite: 1248, label: "Mech Medium Salvaged" },
  heavy:   { green: 228, regular: 456, veteran: 912,  elite: 1824, label: "Mech Heavy Salvaged" },
  assault: { green: 328, regular: 656, veteran: 1312, elite: 2624, label: "Mech Assault Salvaged" },
};

/** Cazas aerospaciales nuevos. */
export const FIGHTER_NEW_PRICES: Record<MechWeightClass, PriceTable> = {
  light:   { green: 200, regular: 400,  veteran: 800,  elite: 1600, label: "Fighter Light" },
  medium:  { green: 350, regular: 700,  veteran: 1400, elite: 2800, label: "Fighter Medium" },
  heavy:   { green: 500, regular: 1000, veteran: 2000, elite: 4000, label: "Fighter Heavy" },
  assault: { green: 700, regular: 1400, veteran: 2800, elite: 5600, label: "Fighter Assault" },
};

export const FIGHTER_SALVAGED_PRICES: Record<MechWeightClass, PriceTable> = {
  light:   { green: 80,  regular: 160, veteran: 320,  elite: 800,  label: "Fighter Light Salvaged" },
  medium:  { green: 140, regular: 280, veteran: 700,  elite: 1400, label: "Fighter Medium Salvaged" },
  heavy:   { green: 200, regular: 400, veteran: 1000, elite: 2000, label: "Fighter Heavy Salvaged" },
  assault: { green: 280, regular: 560, veteran: 1400, elite: 2800, label: "Fighter Assault Salvaged" },
};

/** Vehículos, infantería y soporte. */
export const OTHER_PRICES: Record<AcquisitionKind, PriceTable> = {
  // dummies para evitar TS error en union (mech_*/fighter_* manejados arriba)
  mech_new:           { green: 0, regular: 0, veteran: 0, elite: 0, label: '—' },
  mech_salvaged:      { green: 0, regular: 0, veteran: 0, elite: 0, label: '—' },
  fighter_new:        { green: 0, regular: 0, veteran: 0, elite: 0, label: '—' },
  fighter_salvaged:   { green: 0, regular: 0, veteran: 0, elite: 0, label: '—' },
  infantry:           { green: 25,  regular: 50,  veteran: 125,  elite: 250,  label: 'Infantry (Regular)' },
  motorized_infantry: { green: 40,  regular: 80,  veteran: 200,  elite: 400,  label: 'Motorized Infantry' },
  jump_infantry:      { green: 50,  regular: 100, veteran: 250,  elite: 500,  label: 'Jump Infantry' },
  light_armor:        { green: 100, regular: 200, veteran: 500,  elite: 1000, label: 'Light Armor (<50 t)' },
  heavy_armor:        { green: 300, regular: 600, veteran: 1500, elite: 3000, label: 'Heavy Armor (>50 t)' },
  artillery:          { green: 400, regular: 800, veteran: 2000, elite: 4000, label: 'Artillery' },
  scout:              { green: 40,  regular: 80,  veteran: 200,  elite: 400,  label: 'Scouts' },
  support_tech:       { green: 50,  regular: 100, veteran: 250,  elite: 500,  label: 'Support (Personal Técnico)' },
};

/** Devuelve precio ₡ (no en miles) para un activo. */
export function getAcquisitionPrice(
  kind: AcquisitionKind,
  level: ExperienceLevel,
  weightClass?: MechWeightClass,
): number {
  let table: PriceTable | undefined;
  if (kind === 'mech_new'      && weightClass) table = MECH_NEW_PRICES[weightClass];
  else if (kind === 'mech_salvaged' && weightClass) table = MECH_SALVAGED_PRICES[weightClass];
  else if (kind === 'fighter_new'   && weightClass) table = FIGHTER_NEW_PRICES[weightClass];
  else if (kind === 'fighter_salvaged' && weightClass) table = FIGHTER_SALVAGED_PRICES[weightClass];
  else table = OTHER_PRICES[kind];
  if (!table) return 0;
  return (table[level] ?? 0) * 1000; // tabla en miles
}

export function getPriceLabel(kind: AcquisitionKind, weightClass?: MechWeightClass): string {
  if (kind === 'mech_new' && weightClass)         return MECH_NEW_PRICES[weightClass].label;
  if (kind === 'mech_salvaged' && weightClass)    return MECH_SALVAGED_PRICES[weightClass].label;
  if (kind === 'fighter_new' && weightClass)      return FIGHTER_NEW_PRICES[weightClass].label;
  if (kind === 'fighter_salvaged' && weightClass) return FIGHTER_SALVAGED_PRICES[weightClass].label;
  return OTHER_PRICES[kind]?.label ?? kind;
}

/** Lista de adquisiciones para selector UI. */
export const ACQUISITION_KINDS: { kind: AcquisitionKind; label: string; needsWeight: boolean }[] = [
  { kind: 'mech_new',           label: 'Mech (nuevo)',          needsWeight: true  },
  { kind: 'mech_salvaged',      label: 'Mech (recuperado)',     needsWeight: true  },
  { kind: 'fighter_new',        label: 'Caza Aero (nuevo)',     needsWeight: true  },
  { kind: 'fighter_salvaged',   label: 'Caza Aero (recuperado)',needsWeight: true  },
  { kind: 'infantry',           label: 'Infantería',            needsWeight: false },
  { kind: 'motorized_infantry', label: 'Infantería motorizada', needsWeight: false },
  { kind: 'jump_infantry',      label: 'Infantería de salto',   needsWeight: false },
  { kind: 'light_armor',        label: 'Blindado ligero',       needsWeight: false },
  { kind: 'heavy_armor',        label: 'Blindado pesado',       needsWeight: false },
  { kind: 'artillery',          label: 'Artillería',            needsWeight: false },
  { kind: 'scout',              label: 'Exploradores',          needsWeight: false },
  { kind: 'support_tech',       label: 'Personal técnico',      needsWeight: false },
];

/** Rangos canónicos BattleTech (TR3025 onwards):
 *  Light 20-35 · Medium 40-55 · Heavy 60-75 · Assault 80-100. */
export const WEIGHT_CLASSES: { key: MechWeightClass; label: string; range: string; min: number; max: number }[] = [
  { key: 'light',   label: 'Ligero', range: '20-35 t',  min: 20, max: 35  },
  { key: 'medium',  label: 'Medio',  range: '40-55 t',  min: 40, max: 55  },
  { key: 'heavy',   label: 'Pesado', range: '60-75 t',  min: 60, max: 75  },
  { key: 'assault', label: 'Asalto', range: '80-100 t', min: 80, max: 100 },
];

/** Canónica weight class lookup por tons. */
export function classifyMechWeight(tons: number): MechWeightClass {
  if (tons <= 35) return 'light';
  if (tons <= 55) return 'medium';
  if (tons <= 75) return 'heavy';
  return 'assault';
}

/** Etiqueta en español (Hoja 28 / Personajes nomenclature). */
export function categoriaES(tons: number): string {
  if (tons <= 35) return 'Ligero';
  if (tons <= 55) return 'Medio';
  if (tons <= 75) return 'Pesado';
  return 'Asalto';
}

export const LEVELS: ExperienceLevel[] = ['green', 'regular', 'veteran', 'elite'];
