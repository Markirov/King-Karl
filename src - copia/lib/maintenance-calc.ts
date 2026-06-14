// ══════════════════════════════════════════════════════════════
//  MAINTENANCE CALC — FM Mercs Revised p.149 Maintenance Table
//  Coste SEMANAL (×4 mensual) por tipo unidad + horas-hombre
//  requeridas por técnicos.
// ══════════════════════════════════════════════════════════════

export type UnitClass =
  | 'battlemech' | 'omnimech' | 'aerospace_fighter' | 'omnifighter'
  | 'ground_vehicle' | 'infantry_squad' | 'personnel_squad'
  | 'artillery_weapon' | 'battle_armor' | 'vtol'
  | 'conventional_fighter' | 'naval_vessel'
  | 'dropship_small' | 'dropship_medium' | 'dropship_large';

interface MaintenanceRule {
  weeklyCost:        number;
  manHoursFn:        (tons: number) => number;
  supportType:       'T' | 'M';     // Técnico / Médico
  label:             string;
}

export const MAINTENANCE_RULES: Record<UnitClass, MaintenanceRule> = {
  battlemech:           { weeklyCost: 75,  manHoursFn: t => 40 + (t / 5),    supportType: 'T', label: 'BattleMech' },
  omnimech:             { weeklyCost: 100, manHoursFn: t => 40 + (t / 5),    supportType: 'T', label: 'OmniMech' },
  aerospace_fighter:    { weeklyCost: 65,  manHoursFn: t => 40 + (t / 2.5),  supportType: 'T', label: 'Aerospace Fighter' },
  omnifighter:          { weeklyCost: 125, manHoursFn: t => 40 + (t / 2.5),  supportType: 'T', label: 'OmniFighter' },
  ground_vehicle:       { weeklyCost: 25,  manHoursFn: t => 20 + (t / 5),    supportType: 'T', label: 'Ground Vehicle' },
  infantry_squad:       { weeklyCost: 10,  manHoursFn: _ => 3 + (7 / 5),     supportType: 'M', label: 'Infantry Squad (7)' },
  personnel_squad:      { weeklyCost: 10,  manHoursFn: _ => 3 + (7 / 5),     supportType: 'M', label: 'Personnel Squad (7)' },
  artillery_weapon:     { weeklyCost: 25,  manHoursFn: t => 15 + (t / 2.5),  supportType: 'T', label: 'Artillery Weapon' },
  battle_armor:         { weeklyCost: 50,  manHoursFn: t => 5 + (t * 2),     supportType: 'T', label: 'Battle Armor Suit' },
  vtol:                 { weeklyCost: 65,  manHoursFn: t => 30 + (t / 5),    supportType: 'T', label: 'VTOL' },
  conventional_fighter: { weeklyCost: 50,  manHoursFn: t => 20 + (t / 2.5),  supportType: 'T', label: 'Conventional Fighter' },
  naval_vessel:         { weeklyCost: 65,  manHoursFn: t => 10 + (t / 2.5),  supportType: 'T', label: 'Naval Vessel (water)' },
  dropship_small:       { weeklyCost: 500, manHoursFn: t => 80 + (t / 10),   supportType: 'T', label: 'DropShip < 16k t' },
  dropship_medium:      { weeklyCost: 500, manHoursFn: t => 40 + (t / 25),   supportType: 'T', label: 'DropShip 16k-49.999 t' },
  dropship_large:       { weeklyCost: 500, manHoursFn: t => 20 + (t / 50),   supportType: 'T', label: 'DropShip 50k+ t' },
};

/** Coste mensual canon (semanal × 4) por unidad individual. */
export function monthlyCostCanon(cls: UnitClass, tons: number): number {
  const rule = MAINTENANCE_RULES[cls];
  if (!rule) return 0;
  return rule.weeklyCost * 4;
}

/** Horas-hombre mensuales requeridas para mantener una unidad. */
export function monthlyManHours(cls: UnitClass, tons: number): number {
  const rule = MAINTENANCE_RULES[cls];
  if (!rule) return 0;
  return Math.ceil(rule.manHoursFn(tons) * 4);
}

/** Clasifica DropShip por tonelaje. */
export function classifyDropShip(tons: number): UnitClass {
  if (tons < 16000) return 'dropship_small';
  if (tons < 50000) return 'dropship_medium';
  return 'dropship_large';
}

/** Devuelve weight class para mech. */
export type WeightClass = 'light' | 'medium' | 'heavy' | 'assault';
export function mechWeightClass(tons: number): WeightClass {
  if (tons <= 35) return 'light';
  if (tons <= 55) return 'medium';
  if (tons <= 75) return 'heavy';
  return 'assault';
}

/** Suma mantenimiento mensual de una hangar list. */
export interface HangarUnit {
  cls:  UnitClass;
  tons: number;
  qty?: number;  // 1 por defecto
}

export function calcHangarMonthlyMaintenance(units: HangarUnit[]): {
  total:        number;
  breakdown:    { label: string; cost: number; qty: number }[];
  totalManHours: number;
} {
  const breakdown: { label: string; cost: number; qty: number }[] = [];
  let total = 0;
  let totalManHours = 0;
  for (const u of units) {
    const qty = u.qty ?? 1;
    const cost = monthlyCostCanon(u.cls, u.tons) * qty;
    const mh   = monthlyManHours(u.cls, u.tons) * qty;
    const rule = MAINTENANCE_RULES[u.cls];
    breakdown.push({ label: rule?.label ?? u.cls, cost, qty });
    total += cost;
    totalManHours += mh;
  }
  return { total, breakdown, totalManHours };
}
