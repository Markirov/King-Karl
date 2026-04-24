// ══════════════════════════════════════════════════════════════
//  INFANTRY CATALOG — Catálogo de unidades de infantería y BA
// ══════════════════════════════════════════════════════════════

import type {
  InfantryState, InfantryWeaponClass, InfantryDamageTable,
  InfantrySession, BAState, BASession, BASuitSession,
} from '@/lib/combat-types';

// ── Daño por trooper por clase de arma [short, medium, long] ──

const DAMAGE_PER_TROOPER: Record<InfantryWeaponClass, [number, number, number]> = {
  rifle:       [0.14, 0.14, 0],
  laser:       [0.22, 0.22, 0.22],
  srm:         [0.23, 0.23, 0.23],
  lrm:         [0,    0.20, 0.20],
  mg:          [0.21, 0,    0],
  flamer:      [0.20, 0,    0],
  'field-gun': [0,    0,    0],   // TODO v2
};

export function buildDamageTable(
  platoonSize: number,
  weaponClass: InfantryWeaponClass,
): InfantryDamageTable {
  const [s, m, l] = DAMAGE_PER_TROOPER[weaponClass];
  const row = (factor: number) =>
    Array.from({ length: platoonSize + 1 }, (_, t) => Math.floor(t * factor));
  return { short: row(s), medium: row(m), long: row(l) };
}

export function buildInfantrySession(state: InfantryState): InfantrySession {
  return {
    troopers:           state.platoonSize,
    moveMode:           'stand',
    infernoTurnsLeft:   0,
    swarmTargetSlotId:  null,
    swarmTargetType:    null,
    legAttackTargetLeg: null,
    activeShotRange:    null,
    activeShotTarget:   null,
    destroyed:          false,
    destroyedReason:    '',
    logs:               [],
  };
}

export function buildBASession(state: BAState): BASession {
  const suits: BASuitSession[] = Array.from({ length: state.suitCount }, (_, i) => ({
    index:                i,
    armor:                state.armorPerSuit,
    alive:                true,
    weaponsFiredThisTurn: {},
    weaponsExpended:      {},
  }));
  return {
    suits,
    moveMode:           'stand',
    swarmTargetSlotId:  null,
    legAttackTargetLeg: null,
    destroyed:          false,
    destroyedReason:    '',
    logs:               [],
  };
}

// ══════════════════════════════════════════════════════════════
// INFANTRY CATALOG — 9 entries v1
// ══════════════════════════════════════════════════════════════

function inf(
  id: string, name: string,
  faction: 'IS' | 'Clan',
  movement: InfantryState['movement'],
  weaponClass: InfantryWeaponClass,
  platoonSize: number, squadCount: number,
  walkMP: number, jumpMP: number,
  rangeS: number, rangeM: number, rangeL: number,
  antiMech: boolean, damageDivisor: number, burstBonus: number, bv: number,
): InfantryState {
  return {
    id, name, faction, movement, weaponClass,
    platoonSize,
    squadCount,
    troopersPerSquad: Math.floor(platoonSize / squadCount),
    walkMP, jumpMP,
    range: { short: rangeS, medium: rangeM, long: rangeL },
    damageTable: buildDamageTable(platoonSize, weaponClass),
    minTroopersToFire: 1,
    damageDivisor, burstBonus, antiMech, bv,
  };
}

export const INFANTRY_CATALOG: InfantryState[] = [
  //              id                    name                      fac   mov          wpn     sz  sq  wk jmp  S  M  L   am  div  bst  bv
  inf('is-foot-rifle',        'IS Foot (Rifle)',           'IS', 'foot',        'rifle',  28, 4, 1, 0, 1, 2, 3, true,  1, 0, 176),
  inf('is-foot-laser',        'IS Foot (Laser)',           'IS', 'foot',        'laser',  28, 4, 1, 0, 2, 4, 6, true,  1, 0, 224),
  inf('is-foot-srm',          'IS Foot (SRM)',             'IS', 'foot',        'srm',    24, 4, 1, 0, 3, 6, 9, true,  1, 0, 218),
  inf('is-foot-mg',           'IS Foot (MG)',              'IS', 'foot',        'mg',     28, 4, 1, 0, 1, 2, 3, true,  1, 2, 210),
  inf('is-motorized-rifle',   'IS Motorized (Rifle)',      'IS', 'motorized',   'rifle',  28, 4, 3, 0, 1, 2, 3, false, 2, 0, 264),
  inf('is-mechanized-srm',    'IS Mechanized (SRM Hover)', 'IS', 'mechanized',  'srm',    24, 4, 4, 0, 3, 6, 9, false, 2, 0, 393),
  inf('is-jump-rifle',        'IS Jump (Rifle)',           'IS', 'jump',        'rifle',  21, 3, 1, 3, 1, 2, 3, true,  1, 0, 196),
  inf('is-jump-srm',          'IS Jump (SRM)',             'IS', 'jump',        'srm',    18, 3, 1, 3, 3, 6, 9, true,  1, 0, 246),
  inf('clan-foot-laser',      'Clan Foot (ER Laser)',      'Clan','foot',       'laser',  25, 5, 1, 0, 3, 6, 9, true,  1, 0, 350),
];

// ══════════════════════════════════════════════════════════════
// BA CATALOG — 12 entries v1
// ══════════════════════════════════════════════════════════════

export const BA_CATALOG: BAState[] = [
  // ── Inner Sphere ──
  {
    id: 'is-standard', name: 'IS Standard', faction: 'IS', weightClass: 'Medium',
    suitCount: 4, armorPerSuit: 9, walkMP: 1, jumpMP: 3, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Small Laser',  damagePerShot: 3, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 1, oneShot: false },
      { id: 1, name: 'SRM-2 (OS)',   damagePerShot: 4, rangeShort: 3, rangeMedium: 6, rangeLong: 9, heat: 0, oneShot: true  },
    ],
    magneticClamps: false, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 516,
  },
  {
    id: 'longinus', name: 'Longinus', faction: 'IS', weightClass: 'Heavy',
    suitCount: 4, armorPerSuit: 7, walkMP: 1, jumpMP: 2, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Medium Recoilless Rifle', damagePerShot: 3, rangeShort: 2, rangeMedium: 4, rangeLong: 6, heat: 0, oneShot: false },
      { id: 1, name: 'SRM-2 (OS)',              damagePerShot: 4, rangeShort: 3, rangeMedium: 6, rangeLong: 9, heat: 0, oneShot: true  },
    ],
    magneticClamps: false, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 438,
  },
  {
    id: 'infiltrator-mk1', name: 'Infiltrator Mk.I', faction: 'IS', weightClass: 'Light',
    suitCount: 4, armorPerSuit: 3, walkMP: 1, jumpMP: 2, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Needler', damagePerShot: 1, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 0, oneShot: false, antiInfantry: true },
    ],
    magneticClamps: false, stealthArmor: false, ecm: true, tag: false, apMount: false,
    antiMech: true, bv: 168,
  },
  {
    id: 'infiltrator-mk2', name: 'Infiltrator Mk.II', faction: 'IS', weightClass: 'Medium',
    suitCount: 4, armorPerSuit: 6, walkMP: 2, jumpMP: 3, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Small Laser', damagePerShot: 3, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 1, oneShot: false },
    ],
    magneticClamps: false, stealthArmor: true, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 400,
  },
  {
    id: 'cavalier', name: 'Cavalier', faction: 'IS', weightClass: 'Medium',
    suitCount: 4, armorPerSuit: 9, walkMP: 3, jumpMP: 0, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Small Laser', damagePerShot: 3, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 1, oneShot: false },
      { id: 1, name: 'LRM-1',       damagePerShot: 1, rangeShort: 0, rangeMedium: 7, rangeLong: 14, heat: 0, oneShot: false },
    ],
    magneticClamps: false, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 482,
  },
  {
    id: 'purifier', name: 'Purifier', faction: 'IS', weightClass: 'Medium',
    suitCount: 4, armorPerSuit: 5, walkMP: 1, jumpMP: 3, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Machine Gun', damagePerShot: 2, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 0, oneShot: false, antiInfantry: true },
    ],
    magneticClamps: false, stealthArmor: true, ecm: false, tag: true, apMount: false,
    antiMech: true, bv: 316,
  },
  {
    id: 'kanazuchi', name: 'Kanazuchi', faction: 'IS', weightClass: 'Assault',
    suitCount: 4, armorPerSuit: 18, walkMP: 2, jumpMP: 0, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Small Laser', damagePerShot: 3, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 1, oneShot: false },
      { id: 1, name: 'Small Laser', damagePerShot: 3, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 1, oneShot: false },
    ],
    magneticClamps: false, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 638,
  },
  // ── Clan ──
  {
    id: 'elemental', name: 'Elemental', faction: 'Clan', weightClass: 'Medium',
    suitCount: 5, armorPerSuit: 10, walkMP: 1, jumpMP: 3, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'SRM-2',      damagePerShot: 4, rangeShort: 3, rangeMedium: 6, rangeLong: 9, heat: 0, oneShot: false },
      { id: 1, name: 'Small Laser',damagePerShot: 3, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 1, oneShot: false },
    ],
    magneticClamps: true, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 1217,
  },
  {
    id: 'gnome', name: 'Gnome', faction: 'Clan', weightClass: 'Heavy',
    suitCount: 5, armorPerSuit: 14, walkMP: 1, jumpMP: 2, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'ER Small Laser', damagePerShot: 5, rangeShort: 2, rangeMedium: 4, rangeLong: 5, heat: 2, oneShot: false },
      { id: 1, name: 'Adv SRM-2',      damagePerShot: 4, rangeShort: 3, rangeMedium: 6, rangeLong: 9, heat: 0, oneShot: false },
    ],
    magneticClamps: true, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 1470,
  },
  {
    id: 'salamander', name: 'Salamander', faction: 'Clan', weightClass: 'Medium',
    suitCount: 5, armorPerSuit: 10, walkMP: 1, jumpMP: 3, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Flamer', damagePerShot: 2, rangeShort: 1, rangeMedium: 2, rangeLong: 3, heat: 3, oneShot: false, antiInfantry: true },
    ],
    magneticClamps: true, stealthArmor: false, ecm: false, tag: false, apMount: true,
    antiMech: true, bv: 760,
  },
  {
    id: 'corona', name: 'Corona', faction: 'Clan', weightClass: 'Heavy',
    suitCount: 5, armorPerSuit: 14, walkMP: 1, jumpMP: 2, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'Medium Pulse Laser', damagePerShot: 7, rangeShort: 2, rangeMedium: 4, rangeLong: 6, heat: 4, oneShot: false },
    ],
    magneticClamps: true, stealthArmor: false, ecm: false, tag: false, apMount: false,
    antiMech: true, bv: 1400,
  },
  {
    id: 'rabid', name: 'Rabid', faction: 'Clan', weightClass: 'Medium',
    suitCount: 5, armorPerSuit: 9, walkMP: 1, jumpMP: 4, umuMP: 0, vtolMP: 0,
    weapons: [
      { id: 0, name: 'SRM-2 (OS)', damagePerShot: 4, rangeShort: 3, rangeMedium: 6, rangeLong: 9, heat: 0, oneShot: true },
      { id: 1, name: 'SRM-2 (OS)', damagePerShot: 4, rangeShort: 3, rangeMedium: 6, rangeLong: 9, heat: 0, oneShot: true },
    ],
    magneticClamps: false, stealthArmor: false, ecm: false, tag: false, apMount: true,
    antiMech: true, bv: 880,
  },
];
