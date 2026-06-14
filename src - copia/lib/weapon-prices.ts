// ═══════════════════════════════════════════════════════════════
// WEAPON PRICES — Tabla armamento Inner Sphere (campaña ELH)
// Precios ₡ por unidad de arma + ₡/tonelada de munición.
// Usado por Taller para autocompletar coste de armas dañadas.
// ═══════════════════════════════════════════════════════════════

interface WeaponPrice {
  /** Coste por unidad (₡). */
  cost:     number;
  /** Coste por tonelada de munición (₡). 0 si no usa. */
  ammoCost: number;
}

/** Tabla maestra: código corto → precios. */
export const WEAPON_PRICE_TABLE: Record<string, WeaponPrice> = {
  // Energía estandar
  PPC:       { cost: 200_000, ammoCost: 0 },
  SLAS:      { cost:  11_250, ammoCost: 0 },   // Small Laser
  MLAS:      { cost:  40_000, ammoCost: 0 },   // Medium Laser
  LLAS:      { cost: 100_000, ammoCost: 0 },   // Large Laser
  FLAMER:    { cost:   7_500, ammoCost: 0 },
  // Energía ER
  ER_SLAS:   { cost:  11_250, ammoCost: 0 },
  ER_MLAS:   { cost:  80_000, ammoCost: 0 },
  ER_LLAS:   { cost: 200_000, ammoCost: 0 },
  ER_PPC:    { cost: 300_000, ammoCost: 0 },
  // Pulse
  PULSE_SLAS:{ cost:  16_000, ammoCost: 0 },
  PULSE_MLAS:{ cost:  60_000, ammoCost: 0 },
  PULSE_LLAS:{ cost: 175_000, ammoCost: 0 },
  // LRM
  LRM5:      { cost:  30_000, ammoCost: 30_000 },
  LRM10:     { cost: 100_000, ammoCost: 30_000 },
  LRM15:     { cost: 175_000, ammoCost: 30_000 },
  LRM20:     { cost: 250_000, ammoCost: 30_000 },
  // SRM
  SRM2:      { cost:  10_000, ammoCost: 27_000 },
  SRM4:      { cost:  60_000, ammoCost: 27_000 },
  SRM6:      { cost:  80_000, ammoCost: 27_000 },
  // Streak SRM
  STREAK2:   { cost:  15_000, ammoCost: 54_000 },
  STREAK4:   { cost:  90_000, ammoCost: 54_000 },
  STREAK6:   { cost: 120_000, ammoCost: 54_000 },
  // Machine Gun
  MG:        { cost:   5_000, ammoCost:  1_000 },
  // Autocannon estandar
  AC2:       { cost:  75_000, ammoCost:  1_000 },
  AC5:       { cost: 125_000, ammoCost:  4_500 },
  AC10:      { cost: 200_000, ammoCost:  6_000 },
  AC20:      { cost: 300_000, ammoCost: 10_000 },
  // LB-X (precios ammo = solido; cluster = 15k/20k para LB5/LB10)
  LBX2:      { cost: 150_000, ammoCost:  2_000 },
  LBX5:      { cost: 250_000, ammoCost:  9_000 },
  LBX10:     { cost: 400_000, ammoCost: 12_000 },
  LBX20:     { cost: 600_000, ammoCost: 24_000 },
  // Ultra AC
  UAC2:      { cost: 120_000, ammoCost:  1_000 },
  UAC5:      { cost: 200_000, ammoCost:  9_000 },
  UAC10:     { cost: 320_000, ammoCost: 12_000 },
  UAC20:     { cost: 480_000, ammoCost: 20_000 },
  // Gauss
  GAUSS:     { cost: 300_000, ammoCost: 20_000 },
  // Arrow IV
  ARROW4:    { cost: 450_000, ammoCost: 15_000 },
  // Armas fisicas
  HATCHET:   { cost:  35_000, ammoCost: 0 },
  SWORD:     { cost:  50_000, ammoCost: 0 },
};

// ── Normalizacion + alias ───────────────────────────────────

/** Limpia string para match: minusculas, sin acentos, sin (IS)/(CL)/(Clan), trim. */
function norm(s: string): string {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^\(is\)|^\(cl\)|^\(clan\)/g, '')
    .replace(/^is(?=[a-z])|^cl(?=[a-z])/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Patrones regex → codigo tabla. Orden importa (mas especifico primero). */
const ALIASES: { rx: RegExp; key: string }[] = [
  // ER variants (antes que estandar para que matcheen primero)
  { rx: /\b(er|extended range)\s*small\s*laser\b/, key: 'ER_SLAS' },
  { rx: /\b(er|extended range)\s*medium\s*laser\b/, key: 'ER_MLAS' },
  { rx: /\b(er|extended range)\s*large\s*laser\b/, key: 'ER_LLAS' },
  { rx: /\b(er|extended range)\s*ppc\b/, key: 'ER_PPC' },
  // Pulse
  { rx: /\bsmall\s*pulse\s*laser\b|\bpulse\s*small\s*laser\b/, key: 'PULSE_SLAS' },
  { rx: /\bmedium\s*pulse\s*laser\b|\bpulse\s*medium\s*laser\b/, key: 'PULSE_MLAS' },
  { rx: /\blarge\s*pulse\s*laser\b|\bpulse\s*large\s*laser\b/, key: 'PULSE_LLAS' },
  // Standard energy
  { rx: /\bsmall\s*laser\b/, key: 'SLAS' },
  { rx: /\bmedium\s*laser\b/, key: 'MLAS' },
  { rx: /\blarge\s*laser\b/, key: 'LLAS' },
  { rx: /\bppc\b|particle\s*projector|particle\s*cannon/, key: 'PPC' },
  { rx: /\bflamer\b/, key: 'FLAMER' },
  // LRM
  { rx: /\blrm[- ]?5\b/, key: 'LRM5' },
  { rx: /\blrm[- ]?10\b/, key: 'LRM10' },
  { rx: /\blrm[- ]?15\b/, key: 'LRM15' },
  { rx: /\blrm[- ]?20\b/, key: 'LRM20' },
  // Streak SRM (antes que SRM estandar)
  { rx: /\bstreak\s*srm[- ]?2\b|\bssrm[- ]?2\b/, key: 'STREAK2' },
  { rx: /\bstreak\s*srm[- ]?4\b|\bssrm[- ]?4\b/, key: 'STREAK4' },
  { rx: /\bstreak\s*srm[- ]?6\b|\bssrm[- ]?6\b/, key: 'STREAK6' },
  // SRM
  { rx: /\bsrm[- ]?2\b/, key: 'SRM2' },
  { rx: /\bsrm[- ]?4\b/, key: 'SRM4' },
  { rx: /\bsrm[- ]?6\b/, key: 'SRM6' },
  // Machine Gun
  { rx: /\bmachine\s*gun\b|\bmg\b/, key: 'MG' },
  // LB-X (antes que AC)
  { rx: /\blb[- ]?2[- ]?x\b|\blb\s*x?\s*2\b/, key: 'LBX2' },
  { rx: /\blb[- ]?5[- ]?x\b|\blb\s*x?\s*5\b/, key: 'LBX5' },
  { rx: /\blb[- ]?10[- ]?x\b|\blb\s*x?\s*10\b/, key: 'LBX10' },
  { rx: /\blb[- ]?20[- ]?x\b|\blb\s*x?\s*20\b/, key: 'LBX20' },
  // Ultra AC (antes que AC)
  { rx: /\bultra\s*ac[- ]?2\b|\buac[- ]?2\b/, key: 'UAC2' },
  { rx: /\bultra\s*ac[- ]?5\b|\buac[- ]?5\b/, key: 'UAC5' },
  { rx: /\bultra\s*ac[- ]?10\b|\buac[- ]?10\b/, key: 'UAC10' },
  { rx: /\bultra\s*ac[- ]?20\b|\buac[- ]?20\b/, key: 'UAC20' },
  // Standard Autocannon
  { rx: /\bautocannon[\/\s-]*2\b|\bac[\/\s-]*2\b/, key: 'AC2' },
  { rx: /\bautocannon[\/\s-]*5\b|\bac[\/\s-]*5\b/, key: 'AC5' },
  { rx: /\bautocannon[\/\s-]*10\b|\bac[\/\s-]*10\b/, key: 'AC10' },
  { rx: /\bautocannon[\/\s-]*20\b|\bac[\/\s-]*20\b/, key: 'AC20' },
  // Gauss
  { rx: /\bgauss\b/, key: 'GAUSS' },
  // Arrow IV
  { rx: /\barrow\s*iv\b|\barrow\s*4\b/, key: 'ARROW4' },
  // Armas fisicas
  { rx: /\bhatchet\b|\bhacha\b/, key: 'HATCHET' },
  { rx: /\bsword\b|\bespada\b/, key: 'SWORD' },
];

/** Devuelve codigo tabla (ej. 'PPC') o null. */
export function weaponKeyFromName(name: string): string | null {
  const n = norm(name);
  if (!n) return null;
  for (const { rx, key } of ALIASES) {
    if (rx.test(n)) return key;
  }
  return null;
}

/** Devuelve precio arma (cost por unidad) o 0 si desconocido.
 *  Hatchet TM: 5.000 x ceil(mechTons/15). Sword TM: 10.000 x ceil(mechTons/20). */
export function weaponPriceFromName(name: string, mechTons?: number): number {
  const key = weaponKeyFromName(name);
  if (!key) return 0;
  if (key === 'HATCHET' && mechTons) return 5_000 * Math.ceil(mechTons / 15);
  if (key === 'SWORD'   && mechTons) return 10_000 * Math.ceil(mechTons / 20);
  return WEAPON_PRICE_TABLE[key]?.cost ?? 0;
}

/** Devuelve precio municion ₡/ton o 0 si desconocido. */
export function weaponAmmoPriceFromName(name: string): number {
  const key = weaponKeyFromName(name);
  return key ? (WEAPON_PRICE_TABLE[key]?.ammoCost ?? 0) : 0;
}

// ── LB-X ammo dual price (slug solido vs cluster postas) ──────
// ammoCost en WEAPON_PRICE_TABLE = slug (default). Cluster mas caro.

export const LBX_CLUSTER_AMMO_COST: Record<string, number> = {
  LBX2:   3_000,
  LBX5:  15_000,
  LBX10: 20_000,
  LBX20: 34_000,
};

/** True si el codigo arma es LB-X. */
export function isLBXCode(key: string): boolean {
  return /^LBX\d+$/.test(key);
}

/** Detecta codigo LB-X desde el campo family del AmmoBin. null si no es LB-X. */
export function lbxKeyFromAmmoFamily(family: string): string | null {
  const n = (family || '').toLowerCase();
  if (!/lb[- ]?\d+[- ]?x|lbx\d+/i.test(family || '') && !n.includes('lb-x')) return null;
  if (/lb[- ]?2|lbx2/i.test(family)) return 'LBX2';
  if (/lb[- ]?5|lbx5/i.test(family)) return 'LBX5';
  if (/lb[- ]?10|lbx10/i.test(family)) return 'LBX10';
  if (/lb[- ]?20|lbx20/i.test(family)) return 'LBX20';
  return null;
}
