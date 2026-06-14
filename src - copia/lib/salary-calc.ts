// ══════════════════════════════════════════════════════════════
//  SALARY CALC — FM Mercs Revised p.148-149 canon multipliers
//  Aplica: sueldoMes = base × quality × officer × (rank / 2)
// ══════════════════════════════════════════════════════════════

export type Quality = 'green' | 'regular' | 'veteran' | 'elite';

/** Multiplicador de calidad (FM Mercs Salary Table p.148). */
export const QUALITY_MULT: Record<Quality, number> = {
  green:    0.5,
  regular:  1.0,
  veteran:  1.6,
  elite:    2.0,
};

/** Multiplicador oficial. NCO/oficial añade +20% sobre subtotal. */
export const OFFICER_MULT = 1.2;

/** Rangos típicos BT (índice = rank value). 0 = no rank, simple soldier. */
export const RANK_LABELS: { rank: number; label: string }[] = [
  { rank: 0, label: 'Sin rango' },
  { rank: 1, label: 'Cabo / Recluta' },
  { rank: 2, label: 'Sargento / Teniente' },
  { rank: 3, label: 'Capitán' },
  { rank: 4, label: 'Comandante / Mayor' },
  { rank: 5, label: 'Teniente Coronel' },
  { rank: 6, label: 'Coronel' },
  { rank: 7, label: 'General' },
];

/** Sueldos base mensuales canon FM Mercs (p.148). */
export const BASE_SALARIES_CANON: Record<string, number> = {
  mechwarrior:           1500,
  aerospace_pilot:       1500,
  doctor:                1500,
  warship_crewman:       1200,
  scout_infantry:        1050,
  dropship_crewman:      1000,
  specialist_infantry:    960,
  vehicle_crewman:        900,
  aircraft_pilot:         900,
  mech_tech:              800,
  battle_armor_tech:      800,
  regular_infantry:       750,
  jumpship_crewman:       750,
  vehicle_mechanic:       640,
  medic:                  640,
  administrator:          320,
};

/** Calcula sueldo mensual aplicando todos los multiplicadores FM Mercs.
 *
 * Ejemplo: Vet MechWarrior + lugarteniente (rank 2):
 *   calcSalary(1500, 'veteran', true, 2)
 *   = 1500 × 1.6 × 1.2 × (2/2) = 1500 × 1.6 × 1.2 × 1 = 2880 ₡/mes
 */
export function calcSalary(
  baseMonthly: number,
  quality: Quality,
  isOfficer: boolean,
  rank: number,
): number {
  const qMult = QUALITY_MULT[quality] ?? 1.0;
  const oMult = isOfficer ? OFFICER_MULT : 1.0;
  const rMult = rank > 0 ? rank / 2 : 1.0;
  return Math.round(baseMonthly * qMult * oMult * rMult);
}

/** Inverso aproximado: dado un sueldo final, infiere base asumiendo defaults. */
export function inferBase(finalMonthly: number, quality: Quality, isOfficer: boolean, rank: number): number {
  const q = QUALITY_MULT[quality] ?? 1.0;
  const o = isOfficer ? OFFICER_MULT : 1.0;
  const r = rank > 0 ? rank / 2 : 1.0;
  const div = q * o * r;
  return div > 0 ? Math.round(finalMonthly / div) : finalMonthly;
}

/** Devuelve label legible del rank. */
export function rankLabel(rank: number): string {
  return RANK_LABELS.find(r => r.rank === rank)?.label ?? `Rango ${rank}`;
}
