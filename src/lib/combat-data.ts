// ═══════════════════════════════════════════════════════════════
// COMBAT DATA — Tables, constants, and pure game logic
// All BattleTech rules from the reference document
// ═══════════════════════════════════════════════════════════════

import type {
  MechState, MechSession, MechWeapon, AmmoBin, CritSlot, MoveMode,
  ArmorSlotDef, VehicleState, VehicleSession,
} from './combat-types';

// ── Internal Structure Table ──
export const MECH_IS_TABLE: Record<number, Record<string, number>> = {
  20: {HD:3,CT:6, LT:5, RT:5, LA:3,RA:3,LL:4, RL:4},
  25: {HD:3,CT:8, LT:6, RT:6, LA:4,RA:4,LL:6, RL:6},
  30: {HD:3,CT:10,LT:7, RT:7, LA:5,RA:5,LL:7, RL:7},
  35: {HD:3,CT:11,LT:8, RT:8, LA:6,RA:6,LL:8, RL:8},
  40: {HD:3,CT:12,LT:10,RT:10,LA:6,RA:6,LL:10,RL:10},
  45: {HD:3,CT:14,LT:11,RT:11,LA:7,RA:7,LL:11,RL:11},
  50: {HD:3,CT:16,LT:12,RT:12,LA:8,RA:8,LL:12,RL:12},
  55: {HD:3,CT:18,LT:13,RT:13,LA:9,RA:9,LL:13,RL:13},
  60: {HD:3,CT:20,LT:14,RT:14,LA:10,RA:10,LL:14,RL:14},
  65: {HD:3,CT:21,LT:15,RT:15,LA:10,RA:10,LL:15,RL:15},
  70: {HD:3,CT:22,LT:15,RT:15,LA:11,RA:11,LL:15,RL:15},
  75: {HD:3,CT:23,LT:16,RT:16,LA:12,RA:12,LL:16,RL:16},
  80: {HD:3,CT:25,LT:17,RT:17,LA:13,RA:13,LL:17,RL:17},
  85: {HD:3,CT:27,LT:18,RT:18,LA:14,RA:14,LL:18,RL:18},
  90: {HD:3,CT:29,LT:19,RT:19,LA:15,RA:15,LL:19,RL:19},
  95: {HD:3,CT:30,LT:20,RT:20,LA:16,RA:16,LL:20,RL:20},
  100:{HD:3,CT:31,LT:21,RT:21,LA:17,RA:17,LL:21,RL:21},
};

// ── Damage Transfer Chain ──
export const DAMAGE_TRANSFER: Record<string, string | null> = {
  LA: 'LT', RA: 'RT',
  LL: 'LT', RL: 'RT',
  LT: 'CT', RT: 'CT',
  CT: null,  // mech destroyed
  HD: null,  // pilot dead
};

// ── Armor Slot Definitions ──
export const ARMOR_SLOTS: ArmorSlotDef[] = [
  { k: 'HD',  l: 'CABEZA',   ik: 'HD', rear: false },
  { k: 'CTf', l: 'CT ▶',     ik: 'CT', rear: false },
  { k: 'CTr', l: 'CT ◀',     ik: 'CT', rear: true },
  { k: 'LTf', l: 'TI ▶',     ik: 'LT', rear: false },
  { k: 'LTr', l: 'TI ◀',     ik: 'LT', rear: true },
  { k: 'RTf', l: 'TD ▶',     ik: 'RT', rear: false },
  { k: 'RTr', l: 'TD ◀',     ik: 'RT', rear: true },
  { k: 'LA',  l: 'B.IZQ',    ik: 'LA', rear: false },
  { k: 'RA',  l: 'B.DER',    ik: 'RA', rear: false },
  { k: 'LL',  l: 'P.IZQ',    ik: 'LL', rear: false },
  { k: 'RL',  l: 'P.DER',    ik: 'RL', rear: false },
];

// ── Wound consciousness checks ──
export const WOUND_CHECKS = [
  { hits: 1, tn: '3+' },
  { hits: 2, tn: '5+' },
  { hits: 3, tn: '7+' },
  { hits: 4, tn: '10+' },
  { hits: 5, tn: '11+' },
  { hits: 6, tn: '💀' },
];

// ── Heat Effects Table ──
export interface HeatEffect {
  threshold: number;
  type: 'mp' | 'tohit' | 'shutdown' | 'ammo';
  label: string;
}

export const HEAT_EFFECTS: HeatEffect[] = [
  { threshold: 5,  type: 'mp',       label: '-1 MP' },
  { threshold: 8,  type: 'tohit',    label: '+1 Disparo' },
  { threshold: 10, type: 'mp',       label: '-2 MP' },
  { threshold: 13, type: 'tohit',    label: '+2 Disparo' },
  { threshold: 14, type: 'shutdown', label: 'Apagado 4+' },
  { threshold: 15, type: 'mp',       label: '-3 MP' },
  { threshold: 17, type: 'tohit',    label: '+3 Disparo' },
  { threshold: 18, type: 'shutdown', label: 'Apagado 6+' },
  { threshold: 19, type: 'ammo',     label: 'Exp. Munición 8+' },
  { threshold: 20, type: 'mp',       label: '-4 MP' },
  { threshold: 22, type: 'shutdown', label: 'Apagado 8+' },
  { threshold: 23, type: 'ammo',     label: 'Exp. Munición 6+' },
  { threshold: 24, type: 'tohit',    label: '+4 Disparo' },
  { threshold: 25, type: 'mp',       label: '-5 MP' },
  { threshold: 26, type: 'shutdown', label: 'Apagado 10+' },
  { threshold: 28, type: 'ammo',     label: 'Exp. Munición 4+' },
  { threshold: 30, type: 'shutdown', label: 'APAGADO AUTO' },
];

// ── Pure Functions ──

/** Get active heat effects for a given heat level */
export function getActiveHeatEffects(heat: number): HeatEffect[] {
  return HEAT_EFFECTS.filter(e => heat >= e.threshold);
}

/** Get heat warnings as strings */
export function getHeatWarnings(heat: number): string[] {
  if (heat < 5) return ['SYSTEM OPTIMAL'];
  // For each type, only show the highest threshold reached
  const active = getActiveHeatEffects(heat);
  const byType: Record<string, string> = {};
  active.forEach(e => { byType[`${e.type}_${e.threshold}`] = e.label; });
  return Object.values(byType);
}

/** Movement modifier for gunnery */
export function getMovementModifier(mode: MoveMode): number {
  switch (mode) {
    case 'stand': return -1;
    case 'walk': return 0;
    case 'run': return 1;
    case 'jump': return 3;
    default: return 0;
  }
}

/** Heat penalty to gunnery */
export function getHeatGunneryMod(heat: number): number {
  if (heat >= 24) return 4;
  if (heat >= 17) return 3;
  if (heat >= 13) return 2;
  if (heat >= 8) return 1;
  return 0;
}

/** Heat penalty to movement */
export function getHeatMPPenalty(heat: number): number {
  if (heat >= 25) return 5;
  if (heat >= 20) return 4;
  if (heat >= 15) return 3;
  if (heat >= 10) return 2;
  if (heat >= 5) return 1;
  return 0;
}

/** Movement heat generation */
export function getMoveHeat(mode: MoveMode, jumpUsed: number): number {
  switch (mode) {
    case 'stand': return 0;
    case 'walk': return 1;
    case 'run': return 2;
    case 'jump': return Math.max(3, jumpUsed); // min 3 for jump
    default: return 0;
  }
}

/** Count system critical hits from session crits */
export function countSystemCritHits(crits: Record<string, CritSlot[]>): {
  engine: number; gyro: number; sensors: number; lifeSupport: number; heatsinks: number;
} {
  const result = { engine: 0, gyro: 0, sensors: 0, lifeSupport: 0, heatsinks: 0 };
  const allSlots = Object.values(crits).flat();
  allSlots.forEach(s => {
    if (!s.hit) return;
    const n = s.name.toLowerCase();
    if (n.includes('engine') || n.includes('fusion')) result.engine++;
    else if (n.includes('gyro')) result.gyro++;
    else if (n.includes('sensor')) result.sensors++;
    else if (n.includes('life support') || n.includes('soporte')) result.lifeSupport++;
    else if (n.includes('heat sink') || n.includes('radiador')) result.heatsinks++;
  });
  return result;
}

/** Check if mech is destroyed by system damage */
export function checkSystemDestruction(critHits: ReturnType<typeof countSystemCritHits>): string | null {
  if (critHits.engine >= 3) return 'ENGINE DESTROYED';
  if (critHits.gyro >= 2) return 'GYRO DESTROYED';
  return null;
}

/** Calculate full gunnery modifier */
export function calcGunneryTotal(
  baseGunnery: number, heat: number, wounds: number,
  sensorHits: number, moveMode: MoveMode
): number {
  return baseGunnery + getHeatGunneryMod(heat) + (sensorHits * 2) + getMovementModifier(moveMode);
}

/** Calculate piloting total */
export function calcPilotingTotal(basePiloting: number, gyroHits: number, wounds: number): number {
  return basePiloting + (gyroHits * 3);
}

/** Shooting modifier from arm actuator crits for a given location (LA or RA) */
export function getArmActuatorMod(crits: Record<string, CritSlot[]>, loc: string): number {
  let mod = 0;
  for (const slot of crits[loc] || []) {
    if (!slot.hit) continue;
    if (/\bshoulder\b/i.test(slot.name)) mod += 3;
    else if (/\b(upper arm actuator|lower arm actuator|hand actuator)\b/i.test(slot.name)) mod += 1;
  }
  return mod;
}

export interface LegActuatorEffects {
  pilotingMod: number;  // +2 per hip hit
  mpPenalty: number;    // -1 per upper/lower leg/foot hit
  hipHits: number;      // each halves walkMP
}

/** Movement and piloting modifiers from leg actuator crits */
export function getLegActuatorEffects(crits: Record<string, CritSlot[]>): LegActuatorEffects {
  let pilotingMod = 0, mpPenalty = 0, hipHits = 0;
  for (const loc of ['LL', 'RL']) {
    for (const slot of crits[loc] || []) {
      if (!slot.hit) continue;
      if (/\bhip\b/i.test(slot.name)) { hipHits++; pilotingMod += 2; }
      else if (/\b(upper leg actuator|lower leg actuator|foot actuator)\b/i.test(slot.name)) mpPenalty++;
    }
  }
  return { pilotingMod, mpPenalty, hipHits };
}

/** Can the mech fire? (sensors < 2 && not destroyed) */
export function canFire(sensorHits: number, destroyed: boolean): boolean {
  return sensorHits < 2 && !destroyed;
}

/** Check if a weapon is destroyed (all its crit slots hit) */
export function isWeaponDestroyed(weapon: MechWeapon, crits: Record<string, CritSlot[]>): boolean {
  if (!weapon.slotIndices || weapon.slotIndices.length === 0) return false;
  const locCrits = crits[weapon.loc] || [];
  return weapon.slotIndices.every(idx => locCrits[idx]?.hit === true);
}

// ── Mech Session Initializer ──

export function mechInitSession(state: MechState): MechSession {
  // Initialize armor
  const armor: Record<string, number> = {};
  Object.entries(state.armor).forEach(([k, v]) => { armor[k] = v; });

  // Initialize internal structure
  const is: Record<string, number> = {};
  Object.entries(state.is).forEach(([k, v]) => { is[k] = v; });

  // Initialize crits as CritSlot[]
  const crits: Record<string, CritSlot[]> = {};
  Object.entries(state.crits).forEach(([loc, slots]) => {
    crits[loc] = slots.map(name => ({ name, hit: false }));
  });

  // Clone ammo bins
  const ammoBins = state.ammoBins.map(b => ({ ...b }));

  // Build ammo groups
  const ammoGroups: Record<string, number> = {};
  const ammoGroupMax: Record<string, number> = {};
  ammoBins.forEach(b => {
    const key = `${b.loc}::${b.familyKey}`;
    ammoGroups[key] = (ammoGroups[key] || 0) + b.current;
    ammoGroupMax[key] = (ammoGroupMax[key] || 0) + b.max;
  });

  return {
    armor, is, heat: 0, wounds: 0,
    moveMode: 'walk', jumpUsed: 0,
    crits, activeShots: {}, shotSpend: {},
    ammoBins, ammoGroups, ammoGroupMax,
    pilot: { name: '', gunnery: 4, piloting: 5 },
    destroyed: false, destroyedReason: '',
    logs: [`> MECH_LOADED: ${state.chassis} ${state.model}`, '> SYSTEMS_CHECK: OPTIMAL'],
  };
}

// ── Damage Application ──

export interface DamageResult {
  session: MechSession;
  logs: string[];
}

/** Damage per round for ammo explosion. Gauss ammo returns 0 (it doesn't explode). */
function ammoExplosionDmgPerRound(family: string | null): number {
  if (!family) return 1;
  if (/Gauss/i.test(family)) return 0; // Gauss ammo: no explosion
  const acM = family.match(/(?:Ultra\s*|LBX\s*|Light\s*)?AC\s*\/\s*(\d+)/i);
  if (acM) return parseInt(acM[1]);
  const lrmM = family.match(/LRM[-\s]?(\d+)/i);
  if (lrmM) return parseInt(lrmM[1]); // N missiles × 1 dmg
  const srmM = family.match(/Streak\s*SRM[-\s]?(\d+)|SRM[-\s]?(\d+)/i);
  if (srmM) return parseInt(srmM[1] || srmM[2]) * 2; // N missiles × 2 dmg
  if (/Heavy\s*Machine\s*Gun|HMG/i.test(family)) return 3;
  if (/Light\s*Machine\s*Gun|LMG/i.test(family)) return 1;
  if (/Machine\s*Gun/i.test(family)) return 2;
  return 1;
}

/** Gauss WEAPON slot → explodes on crit hit (not the ammo bin) */
function isGaussCrit(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('gauss') && !n.includes('ammo') && !n.includes('@');
}

function gaussExplosionDmg(name: string): number {
  return /heavy/i.test(name) ? 25 : 15;
}

/**
 * Destroy all crits in a location.
 * Zeroes ammo bins; explosive ammo returns total damage for IS-first transfer chain.
 * Gauss ammo: zeroed without explosion (dmg = 0).
 */
function destroyLocation(state: MechState, session: MechSession, isKey: string, logs: string[]): number {
  let explosionDmg = 0;
  const crits = session.crits[isKey];
  if (crits) {
    crits.forEach((c, slotIdx) => {
      if (c.name !== '-' && !c.hit) {
        c.hit = true;
        if (isAmmoCrit(c.name)) {
          const bin = session.ammoBins.find(b => b.loc === isKey && b.slotIdx === slotIdx && !isAmmoEmpty(b))
            ?? session.ammoBins.find(b => b.loc === isKey && !isAmmoEmpty(b));
          if (bin && bin.current > 0) {
            const dmg = bin.current * ammoExplosionDmgPerRound(bin.family);
            if (dmg > 0) logs.push(`> AMMO EXPLOSION: ${bin.family} — ${bin.current} rondas → ${dmg} daño`);
            else logs.push(`> AMMO DESTRUIDA: ${bin.family} — sin explosión`);
            bin.current = 0;
            explosionDmg += dmg;
          }
        }
      }
    });
  }
  rebuildAmmoGroups(session);
  if (isKey === 'CT') session.armor['CTr'] = 0;
  if (isKey === 'LT') session.armor['LTr'] = 0;
  if (isKey === 'RT') session.armor['RTr'] = 0;
  return explosionDmg;
}

function isAmmoCrit(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('ammo') || n.includes('@') || n.includes('munición');
}

function isAmmoEmpty(bin: AmmoBin): boolean {
  return bin.current <= 0;
}

/**
 * Front armor key for a given IS key (for explosion outward path).
 * LA/RA/LL/RL/HD use the same key for both armor and IS.
 */
function frontArmorKey(isKey: string): string {
  if (isKey === 'CT') return 'CTf';
  if (isKey === 'LT') return 'LTf';
  if (isKey === 'RT') return 'RTf';
  return isKey;
}

/**
 * Apply explosion damage: IS first → front armor → IS-first transfer chain.
 * Used for ammo explosions and Gauss weapon crits.
 * Exported for use in mechToggleCrit and anywhere else an internal explosion occurs.
 */
export function mechApplyExplosionDamage(
  state: MechState, session: MechSession, isKey: string, damage: number
): DamageResult {
  let s = structuredClone(session);
  const logs: string[] = [];
  let remaining = damage;

  // 1. IS of current location (explosion from within)
  if (s.is[isKey] !== undefined && s.is[isKey] > 0) {
    const absorbed = Math.min(remaining, s.is[isKey]);
    s.is[isKey] -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) logs.push(`> EXPLOSION IS ${isKey}: -${absorbed} (${s.is[isKey]} left)`);

    if (s.is[isKey] <= 0) {
      logs.push(`> LOCATION ${isKey}: DESTROYED`);
      const cascade = destroyLocation(state, s, isKey, logs);
      remaining += cascade;

      if (isKey === 'CT') {
        s.destroyed = true; s.destroyedReason = 'CENTER TORSO DESTROYED';
        logs.push('> MECH DESTROYED: Center Torso');
        return { session: s, logs };
      }
      if (isKey === 'HD') {
        s.destroyed = true; s.destroyedReason = 'HEAD DESTROYED - PILOT KILLED';
        logs.push('> PILOT KILLED: Head destroyed');
        return { session: s, logs };
      }
    }
  }

  if (remaining <= 0 || s.destroyed) return { session: s, logs };

  // 2. Front armor of current location (explosion vents outward)
  const aKey = frontArmorKey(isKey);
  if (s.armor[aKey] !== undefined && s.armor[aKey] > 0) {
    const absorbed = Math.min(remaining, s.armor[aKey]);
    s.armor[aKey] -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) logs.push(`> EXPLOSION ARMOR ${aKey}: -${absorbed} (${s.armor[aKey]} left)`);
  }

  if (remaining <= 0 || s.destroyed) return { session: s, logs };

  // 3. Transfer IS-first to next location
  const transferTo = DAMAGE_TRANSFER[isKey];
  if (transferTo) {
    logs.push(`> EXPLOSION TRANSFER: ${remaining} → ${transferTo}`);
    const sub = mechApplyExplosionDamage(state, s, transferTo, remaining);
    return { session: sub.session, logs: [...logs, ...sub.logs] };
  }

  return { session: s, logs };
}

/** Apply damage to a location with transfer chain (armor-first, standard BT rule) */
export function mechApplyDamage(
  state: MechState, session: MechSession, armorKey: string, damage: number
): DamageResult {
  let s = structuredClone(session);
  const logs: string[] = [];
  let remaining = damage;

  const slotDef = ARMOR_SLOTS.find(a => a.k === armorKey);
  if (!slotDef) return { session: s, logs: [`> ERROR: Unknown location ${armorKey}`] };

  logs.push(`> DAMAGE: ${damage} → ${slotDef.l}`);

  // 1. Armor
  if (s.armor[armorKey] !== undefined && s.armor[armorKey] > 0) {
    const absorbed = Math.min(remaining, s.armor[armorKey]);
    s.armor[armorKey] -= absorbed;
    remaining -= absorbed;
    if (absorbed > 0) logs.push(`> ARMOR ${slotDef.l}: -${absorbed} (${s.armor[armorKey]} left)`);
  }

  if (remaining <= 0) return { session: s, logs };

  // 2. IS
  const isKey = slotDef.ik;
  if (s.is[isKey] !== undefined && s.is[isKey] > 0) {
    const absorbed = Math.min(remaining, s.is[isKey]);
    s.is[isKey] -= absorbed;
    remaining -= absorbed;
    logs.push(`> IS ${isKey}: -${absorbed} (${s.is[isKey]} left)`);

    // 3. Location destroyed?
    if (s.is[isKey] <= 0) {
      logs.push(`> LOCATION ${isKey}: DESTROYED`);
      const explosionDmg = destroyLocation(state, s, isKey, logs);

      if (isKey === 'CT') {
        s.destroyed = true; s.destroyedReason = 'CENTER TORSO DESTROYED';
        logs.push('> MECH DESTROYED: Center Torso');
        return { session: s, logs };
      }
      if (isKey === 'HD') {
        s.destroyed = true; s.destroyedReason = 'HEAD DESTROYED - PILOT KILLED';
        logs.push('> PILOT KILLED: Head destroyed');
        return { session: s, logs };
      }

      const transferTo = DAMAGE_TRANSFER[isKey];
      if (transferTo) {
        const tArmorKey = transferTo === 'CT' ? 'CTf' : transferTo === 'LT' ? 'LTf' : transferTo === 'RT' ? 'RTf' : transferTo;

        // 4a. Overflow damage → armor-first to transfer target (standard BT)
        if (remaining > 0) {
          logs.push(`> TRANSFER: ${remaining} → ${transferTo}`);
          const sub = mechApplyDamage(state, s, tArmorKey, remaining);
          s = sub.session;
          logs.push(...sub.logs);
        }

        // 4b. Explosion damage → IS-first to transfer target (ammo explodes from within)
        if (explosionDmg > 0 && !s.destroyed) {
          logs.push(`> EXPLOSION TRANSFER: ${explosionDmg} → IS ${transferTo}`);
          const sub = mechApplyExplosionDamage(state, s, transferTo, explosionDmg);
          s = sub.session;
          logs.push(...sub.logs);
        }
      }
    }
  }

  return { session: s, logs };
}

/** Apply healing to a location */
export function mechApplyHeal(
  state: MechState, session: MechSession, armorKey: string, amount: number
): DamageResult {
  const s = structuredClone(session);
  const logs: string[] = [];
  let remaining = amount;

  const slotDef = ARMOR_SLOTS.find(a => a.k === armorKey);
  if (!slotDef) return { session: s, logs };

  const isKey = slotDef.ik;

  // 1. Restore IS
  const maxIS = state.is[isKey as keyof typeof state.is] || 0;
  if (s.is[isKey] < maxIS) {
    const heal = Math.min(remaining, maxIS - s.is[isKey]);
    s.is[isKey] += heal;
    remaining -= heal;
    if (heal > 0) logs.push(`> IS ${isKey}: +${heal} (${s.is[isKey]}/${maxIS})`);
  }

  // 2. Restore armor
  const maxArmor = state.armor[armorKey as keyof typeof state.armor] || 0;
  if (s.armor[armorKey] < maxArmor) {
    const heal = Math.min(remaining, maxArmor - s.armor[armorKey]);
    s.armor[armorKey] += heal;
    remaining -= heal;
    if (heal > 0) logs.push(`> ARMOR ${slotDef.l}: +${heal} (${s.armor[armorKey]}/${maxArmor})`);
  }

  return { session: s, logs };
}

// ── Heat Calculation ──

export interface HeatDelta {
  move: number;
  weapons: number;
  engineHeat: number;
  generated: number;
  dissipated: number;
  delta: number;
}

export function mechCalcHeatDelta(state: MechState, session: MechSession): HeatDelta {
  const sysHits = countSystemCritHits(session.crits);

  const move = getMoveHeat(session.moveMode, session.jumpUsed);
  const weapons = state.weapons
    .filter(w => session.activeShots[w.id])
    .reduce((sum, w) => sum + w.heat, 0);
  const engineHeat = sysHits.engine * 5;

  const generated = move + weapons + engineHeat;
  const dissipated = Math.max(0, state.diss - sysHits.heatsinks);
  const delta = generated - dissipated;

  return { move, weapons, engineHeat, generated, dissipated, delta };
}

// ── Turn Processing ──

export function mechNextTurn(state: MechState, session: MechSession): MechSession {
  const s = structuredClone(session);
  const hd = mechCalcHeatDelta(state, s);

  s.heat = Math.max(0, s.heat + hd.delta);
  s.activeShots = {};
  s.shotSpend = {};
  s.moveMode = 'walk';
  s.jumpUsed = 0;

  s.logs = [
    `> TURN_END: Gen ${hd.generated} (Mov:${hd.move} Wpn:${hd.weapons}${hd.engineHeat > 0 ? ` Eng:${hd.engineHeat}` : ''}) - Diss ${hd.dissipated} = ${hd.delta > 0 ? '+' : ''}${hd.delta}`,
    `> HEAT: ${s.heat}`,
    ...s.logs,
  ].slice(0, 30);

  return s;
}

// ── Weapon Toggle ──

export function mechToggleWeapon(
  state: MechState, session: MechSession, weaponId: number
): MechSession {
  const s = structuredClone(session);
  const weapon = state.weapons.find(w => w.id === weaponId);
  if (!weapon) return s;

  // Check if weapon is destroyed
  if (isWeaponDestroyed(weapon, s.crits)) {
    s.logs = [`> ${weapon.name}: DESTROYED — cannot fire`, ...s.logs].slice(0, 30);
    return s;
  }

  // If already active, deactivate and refund ammo
  if (s.activeShots[weaponId]) {
    delete s.activeShots[weaponId];
    const spend = s.shotSpend[weaponId];
    if (spend) {
      const bin = s.ammoBins.find(b => b.id === spend.binId);
      if (bin) bin.current += spend.amount;
      delete s.shotSpend[weaponId];
      rebuildAmmoGroups(s);
    }
    return s;
  }

  // Activate: check ammo
  if (weapon.usesAmmo) {
    // Match by family name only (ignore tech:er prefix) for robustness
    const weaponFam = ammoFamilyOnly(weapon.ammoFamilyKey);
    const totalAmmo = s.ammoBins
      .filter(b => ammoFamilyOnly(b.familyKey) === weaponFam)
      .reduce((sum, b) => sum + b.current, 0);
    if (totalAmmo < weapon.ammoUse) {
      s.logs = [`> ${weapon.name}: SIN MUNICIÓN`, ...s.logs].slice(0, 30);
      return s;
    }
    // Spend from the farthest bin first (highest slotIdx = farthest from the weapon)
    const bin = s.ammoBins
      .filter(b => ammoFamilyOnly(b.familyKey) === weaponFam && b.current >= weapon.ammoUse)
      .sort((a, b) => b.slotIdx - a.slotIdx)[0];
    if (bin) {
      bin.current -= weapon.ammoUse;
      s.shotSpend[weaponId] = { binId: bin.id, amount: weapon.ammoUse };
      rebuildAmmoGroups(s);
    }
  }

  s.activeShots[weaponId] = true;
  return s;
}

function rebuildAmmoGroups(session: MechSession) {
  session.ammoGroups = {};
  session.ammoBins.forEach(b => {
    const key = `${b.loc}::${b.familyKey}`;
    session.ammoGroups[key] = (session.ammoGroups[key] || 0) + b.current;
  });
}

/** Extract the family part of a familyKey ('tech:er:family' → 'family') */
function ammoFamilyOnly(familyKey: string): string {
  const parts = familyKey.split(':');
  return parts.length >= 3 ? parts.slice(2).join(':') : familyKey;
}

// ── System Destruction Check (shared helper) ──

function applySystemDestructionCheck(s: MechSession): MechSession {
  const sysHits = countSystemCritHits(s.crits);
  const destruction = checkSystemDestruction(sysHits);
  if (destruction && !s.destroyed) {
    s.destroyed = true;
    s.destroyedReason = destruction;
    s.logs = [`> MECH DESTROYED: ${destruction}`, ...s.logs].slice(0, 30);
  }
  return s;
}

function mergeExplosionResult(base: MechSession, result: DamageResult): MechSession {
  return applySystemDestructionCheck({
    ...result.session,
    logs: [...result.logs, ...result.session.logs].slice(0, 30),
  });
}

// ── Crit Toggle ──

export function mechToggleCrit(
  state: MechState, session: MechSession, loc: string, slotIdx: number
): MechSession {
  const s = structuredClone(session);
  const slot = s.crits[loc]?.[slotIdx];
  if (!slot || slot.name === '-') return s;

  slot.hit = !slot.hit;
  const status = slot.hit ? 'CRITICAL HIT' : 'REPAIRED';
  s.logs = [`> ${loc}/${slot.name}: ${status}`, ...s.logs].slice(0, 30);

  if (slot.hit) {
    // ── Ammo explosion ──
    if (isAmmoCrit(slot.name)) {
      const bin = s.ammoBins.find(b => b.loc === loc && b.slotIdx === slotIdx);
      if (bin && bin.current > 0) {
        const explodeDmg = bin.current * ammoExplosionDmgPerRound(bin.family);
        bin.current = 0;
        rebuildAmmoGroups(s);
        if (explodeDmg > 0) {
          // Explosion damages from IS outward (rounds × dmg/round, IS-first)
          s.logs = [`> AMMO EXPLOSION: ${bin.family} — ${explodeDmg} daño (IS-first desde ${loc})`, ...s.logs].slice(0, 30);
          return mergeExplosionResult(s, mechApplyExplosionDamage(state, s, loc, explodeDmg));
        } else {
          // Gauss ammo: destroyed silently, no explosion
          s.logs = [`> AMMO DESTRUIDA: ${bin.family} — sin explosión`, ...s.logs].slice(0, 30);
        }
      }
    }

    // ── Gauss weapon explosion ──
    // Gauss weapon crits explode the weapon for 15 (standard/light) or 25 (heavy) damage per slot hit
    else if (isGaussCrit(slot.name)) {
      const dmg = gaussExplosionDmg(slot.name);
      s.logs = [`> GAUSS EXPLOSION: ${slot.name} — ${dmg} daño (IS-first desde ${loc})`, ...s.logs].slice(0, 30);
      return mergeExplosionResult(s, mechApplyExplosionDamage(state, s, loc, dmg));
    }
  }

  return applySystemDestructionCheck(s);
}

// ══════════════════════════════════════════════════════════════
//  VEHICLE FUNCTIONS
// ══════════════════════════════════════════════════════════════

export interface VehicleDamageResult {
  session: VehicleSession;
  logs: string[];
}

/** Apply damage to a vehicle location. Armor absorbs first, remainder to IS. */
export function vehicleApplyDamage(
  state: VehicleState,
  session: VehicleSession,
  locKey: string,
  amount: number,
): VehicleDamageResult {
  const logs: string[] = [];
  const s: VehicleSession = {
    ...session,
    armor: { ...session.armor },
    is: { ...session.is },
    logs: [...session.logs],
  };

  const loc = state.locations.find(l => l.key === locKey);
  if (!loc) return { session, logs: [`> ERR: ${locKey} no encontrada`] };

  let rem = amount;

  const armorCur = s.armor[locKey] ?? 0;
  if (armorCur > 0) {
    const armorDmg = Math.min(rem, armorCur);
    s.armor[locKey] = armorCur - armorDmg;
    rem -= armorDmg;
    logs.push(`> DMG [${locKey}] AR -${armorDmg} → ${s.armor[locKey]}/${loc.maxArmor}`);
  }

  if (rem > 0) {
    const isCur = s.is[locKey] ?? 0;
    const isDmg = Math.min(rem, isCur);
    s.is[locKey] = isCur - isDmg;
    logs.push(`> DMG [${locKey}] IS -${isDmg} → ${s.is[locKey]}/${loc.maxIS}`);

    if (s.is[locKey] <= 0 && !s.destroyed) {
      // Destroy all crits in this location
      if (s.crits[locKey]) {
        s.crits = { ...s.crits, [locKey]: s.crits[locKey].map(sl => ({ ...sl, hit: true })) };
      }
      if (locKey === 'T2') {
        logs.push(`> [${locKey}] Torreta secundaria destruida`);
      } else {
        s.destroyed = true;
        s.destroyedReason = locKey === 'RO'
          ? 'Rotor destruido'
          : `${loc.label || locKey} destruido`;
        logs.push(`> VEHÍCULO DESTRUIDO: ${s.destroyedReason}`);
      }
    }
  }

  s.logs = [...logs, ...s.logs].slice(0, 30);
  return { session: s, logs };
}

/** Repair a vehicle location. Restores IS first, then armor. */
export function vehicleApplyHeal(
  state: VehicleState,
  session: VehicleSession,
  locKey: string,
  amount: number,
): VehicleDamageResult {
  const logs: string[] = [];
  const s: VehicleSession = {
    ...session,
    armor: { ...session.armor },
    is: { ...session.is },
    logs: [...session.logs],
  };

  const loc = state.locations.find(l => l.key === locKey);
  if (!loc) return { session, logs };

  const isCur = s.is[locKey] ?? 0;
  const isHeal = Math.min(amount, loc.maxIS - isCur);
  s.is[locKey] = isCur + isHeal;
  let rem = amount - isHeal;

  const armorCur = s.armor[locKey] ?? 0;
  const armorHeal = Math.min(rem, loc.maxArmor - armorCur);
  s.armor[locKey] = armorCur + armorHeal;

  logs.push(`> REP [${locKey}] IS+${isHeal} AR+${armorHeal}`);
  s.logs = [...logs, ...s.logs].slice(0, 30);
  return { session: s, logs };
}

/** Toggle a weapon as active/inactive for this turn. Checks ammo availability. */
export function vehicleToggleWeapon(
  state: VehicleState,
  session: VehicleSession,
  weaponId: number,
): VehicleSession {
  const w = state.weapons.find(w => w.id === weaponId);
  if (!w) return session;

  const isActive = session.activeShots[weaponId] ?? false;

  if (!isActive && w.ammoKey) {
    if ((session.ammoPools[w.ammoKey] ?? 0) <= 0) return session;
  }

  return { ...session, activeShots: { ...session.activeShots, [weaponId]: !isActive } };
}

/** End of turn: spend ammo for active weapons, reset active shots, decay effects. */
export function vehicleNextTurn(
  state: VehicleState,
  session: VehicleSession,
): VehicleSession {
  const newPools = { ...session.ammoPools };
  const fired: string[] = [];

  for (const [wIdStr, active] of Object.entries(session.activeShots)) {
    if (!active) continue;
    const w = state.weapons.find(w => w.id === parseInt(wIdStr));
    if (!w) continue;
    if (w.ammoKey && w.ammoKey in newPools) {
      newPools[w.ammoKey] = Math.max(0, (newPools[w.ammoKey] ?? 0) - 1);
    }
    fired.push(w.name);
  }

  const logEntry = fired.length > 0
    ? `> TURNO: disparadas [${fired.join(', ')}]`
    : `> TURNO: sin disparos`;

  const afterEffects = vehicleEndTurnEffects(session);

  // Reset moveMode: immobilized → forced immobile, otherwise default cruise
  const nextMoveMode = afterEffects.immobilized ? 'immobile' : 'cruise';

  return {
    ...afterEffects,
    activeShots: {},
    ammoPools: newPools,
    moveMode: nextMoveMode,
    logs: [logEntry, ...afterEffects.logs].slice(0, 40),
  };
}

/** Toggle a crit slot hit/unhit. Checks for fatal crits (crew/ammo/engine). */
export function vehicleToggleCrit(
  session: VehicleSession,
  locKey: string,
  slotIdx: number,
): VehicleSession {
  const locCrits = session.crits[locKey];
  if (!locCrits) return session;

  const newCrits = [...locCrits];
  const slot = newCrits[slotIdx];
  if (!slot || slot.name === '-') return session;

  newCrits[slotIdx] = { ...slot, hit: !slot.hit };
  const status = !slot.hit ? 'CRÍTICO' : 'REPARADO';

  let s: VehicleSession = {
    ...session,
    crits: { ...session.crits, [locKey]: newCrits },
    logs: [`> ${locKey}/${slot.name}: ${status}`, ...session.logs].slice(0, 30),
  };

  // Check fatal crits on activation
  if (!slot.hit) {
    const name = (slot.name || '').toUpperCase();
    if (name.includes('CREW') || name.includes('TRIPULACION') || name.includes('PILOTO')) {
      s = { ...s, destroyed: true, destroyedReason: 'TRIPULACIÓN MUERTA' };
    } else if (name.includes('AMMO') || name.includes('MUNICION')) {
      s = { ...s, destroyed: true, destroyedReason: 'EXPLOSIÓN DE MUNICIÓN' };
    } else if (name.includes('ENGINE') || name.includes('MOTOR') || name.includes('REACTOR')) {
      s = { ...s, destroyed: true, destroyedReason: 'MOTOR DESTRUIDO' };
    }
  } else {
    // Un-toggling: recheck destruction
    s = vehicleCheckDestroyed(s);
  }

  return s;
}

// ─── Vehicle Critical Hit Tables ─────────────────────────────────────────────

interface CritEntry { id: string; label: string }

export const VEHICLE_DAMAGE_CRIT_TABLE: Record<string, Record<number, CritEntry>> = {
  FR: {
    2:{id:'no_effect',label:'Sin Críticos'}, 3:{id:'no_effect',label:'Sin Críticos'},
    4:{id:'no_effect',label:'Sin Críticos'}, 5:{id:'no_effect',label:'Sin Críticos'},
    6:{id:'driver_hit',label:'Conductor'}, 7:{id:'weapon_malfunction',label:'Fallo de arma'},
    8:{id:'stabilizer',label:'Estabilizador'}, 9:{id:'sensors',label:'Sensores'},
    10:{id:'commander_hit',label:'Comandante'}, 11:{id:'weapon_destroyed',label:'Arma destruida'},
    12:{id:'crew_killed',label:'Tripulación muerta'},
  },
  RR: {
    2:{id:'no_effect',label:'Sin Críticos'}, 3:{id:'no_effect',label:'Sin Críticos'},
    4:{id:'no_effect',label:'Sin Críticos'}, 5:{id:'no_effect',label:'Sin Críticos'},
    6:{id:'cargo_hit',label:'Carga'}, 7:{id:'weapon_malfunction',label:'Fallo de arma'},
    8:{id:'crew_stunned',label:'Tripulación aturdida'}, 9:{id:'stabilizer',label:'Estabilizador'},
    10:{id:'weapon_destroyed',label:'Arma destruida'}, 11:{id:'engine_hit',label:'Impacto motor'},
    12:{id:'fuel_engine',label:'Combustible/Motor'},
  },
  LT: {
    2:{id:'no_effect',label:'Sin Críticos'}, 3:{id:'no_effect',label:'Sin Críticos'},
    4:{id:'no_effect',label:'Sin Críticos'}, 5:{id:'no_effect',label:'Sin Críticos'},
    6:{id:'weapon_malfunction',label:'Fallo de arma'}, 7:{id:'cargo_hit',label:'Carga'},
    8:{id:'stabilizer',label:'Estabilizador'}, 9:{id:'weapon_destroyed',label:'Arma destruida'},
    10:{id:'engine_hit',label:'Impacto motor'}, 11:{id:'ammo_weapon',label:'Munición/Arma destruida'},
    12:{id:'fuel_engine',label:'Combustible/Motor'},
  },
  TU: {
    2:{id:'no_effect',label:'Sin Críticos'}, 3:{id:'no_effect',label:'Sin Críticos'},
    4:{id:'no_effect',label:'Sin Críticos'}, 5:{id:'no_effect',label:'Sin Críticos'},
    6:{id:'stabilizer',label:'Estabilizador'}, 7:{id:'turret_jammed',label:'Torreta atascada'},
    8:{id:'weapon_malfunction',label:'Fallo de arma'}, 9:{id:'turret_locked',label:'Torreta bloqueada'},
    10:{id:'weapon_destroyed',label:'Arma destruida'}, 11:{id:'ammo_weapon',label:'Munición/Arma destruida'},
    12:{id:'turret_destroyed',label:'Torreta destruida'},
  },
};

// RT uses same table as LT; T2 uses same as TU
export function vehicleGetCritTable(locKey: string): Record<number, CritEntry> {
  if (locKey === 'RT') return VEHICLE_DAMAGE_CRIT_TABLE.LT;
  if (locKey === 'T2') return VEHICLE_DAMAGE_CRIT_TABLE.TU;
  return VEHICLE_DAMAGE_CRIT_TABLE[locKey] ?? VEHICLE_DAMAGE_CRIT_TABLE.LT;
}

export const VEHICLE_MOTIVE_CRIT_TABLE: Record<number, CritEntry> = {
  2:{id:'no_effect',label:'Sin Críticos'}, 3:{id:'no_effect',label:'Sin Críticos'},
  4:{id:'no_effect',label:'Sin Críticos'}, 5:{id:'no_effect',label:'Sin Críticos'},
  6:{id:'piloting_plus1',label:'+1 Pilotaje'}, 7:{id:'piloting_plus1',label:'+1 Pilotaje'},
  8:{id:'mp_minus1_pilot2',label:'-1 PM, +2 Pilotaje'}, 9:{id:'mp_minus1_pilot2',label:'-1 PM, +2 Pilotaje'},
  10:{id:'mp_half_pilot3',label:'/2 PM, +3 Pilotaje'}, 11:{id:'mp_half_pilot3',label:'/2 PM, +3 Pilotaje'},
  12:{id:'immobilized',label:'Inmovilizado'},
};

// ─── Apply a critical effect to the vehicle session ──────────────────────────

export function vehicleApplyCritEffect(
  session: VehicleSession,
  state: VehicleState,
  effectId: string,
  locKey?: string,
): VehicleSession {
  const s: VehicleSession = {
    ...session,
    effects: { ...session.effects },
    logs: [...session.logs],
    weaponDestroyedIds: [...session.weaponDestroyedIds],
    weaponMalfunctionIds: [...session.weaponMalfunctionIds],
  };
  const fx = s.effects;

  switch (effectId) {
    case 'no_effect': break;

    case 'stabilizer':
      fx.stabilizer = (fx.stabilizer ?? 0) + 1;
      s.logs.unshift(`> CRIT: Estabilizador dañado (+${fx.stabilizer} ataque)`);
      break;

    case 'sensors':
      fx.sensors = (fx.sensors ?? 0) + 1;
      s.logs.unshift(`> CRIT: Sensores dañados (+${(fx.sensors ?? 0) * 2} ataque)`);
      break;

    case 'crew_stunned':
      fx.crewStunned = (fx.crewStunned ?? 0) + 1;
      s.logs.unshift('> CRIT: Tripulación aturdida (1 turno)');
      break;

    case 'driver_hit':
      fx.driverHit = (fx.driverHit ?? 0) + 1;
      s.logs.unshift('> CRIT: Conductor herido — chequeo pilotaje');
      break;

    case 'commander_hit':
      fx.commanderHit = (fx.commanderHit ?? 0) + 1;
      s.logs.unshift('> CRIT: Comandante herido (+2 a todo)');
      break;

    case 'cargo_hit':
      fx.cargoHit = (fx.cargoHit ?? 0) + 1;
      s.logs.unshift('> CRIT: Carga impactada');
      break;

    case 'turret_jammed':
      fx.turretJammedCount = (fx.turretJammedCount ?? 0) + 1;
      s.logs.unshift('> CRIT: Torreta atascada (1 turno)');
      break;

    case 'turret_locked':
      fx.turretLocked = true;
      s.logs.unshift('> CRIT: Torreta bloqueada (permanente)');
      break;

    case 'turret_destroyed':
      fx.turretDestroyed = true;
      // Destroy all turret weapons, armor, IS
      for (const tLoc of ['TU', 'T2']) {
        if (s.crits[tLoc]) {
          s.crits = { ...s.crits, [tLoc]: s.crits[tLoc].map(sl => ({ ...sl, hit: true })) };
        }
        s.armor = { ...s.armor, [tLoc]: 0 };
        s.is = { ...s.is, [tLoc]: 0 };
      }
      state.weapons.forEach(w => {
        if (w.loc === 'TU' || w.loc === 'T2') {
          if (!s.weaponDestroyedIds.includes(w.id)) s.weaponDestroyedIds.push(w.id);
        }
      });
      s.logs.unshift('> CRIT: TORRETA DESTRUIDA — todas las armas de torreta perdidas');
      break;

    case 'engine_hit':
      s.motiveMP = (s.motiveMP ?? 0) + 1;
      s.logs.unshift(`> CRIT: Impacto motor — MP -1 (total: -${s.motiveMP}). Tirar motriz.`);
      break;

    case 'fuel_engine':
      s.immobilized = true;
      s.moveMode = 'immobile';
      fx.fuelEngineDestroyed = true;
      s.logs.unshift('> CRIT: Combustible/Motor destruido — INMOVILIZADO. Tirar 2D6: 8+ = EXPLOSIÓN');
      break;

    case 'crew_killed':
      fx.crewKilled = true;
      s.destroyed = true;
      s.destroyedReason = 'TRIPULACIÓN MUERTA';
      s.logs.unshift('> CRIT: TRIPULACIÓN MUERTA — VEHÍCULO DESTRUIDO');
      break;

    case 'weapon_malfunction':
      s.logs.unshift(`> CRIT: Fallo de arma en ${locKey ?? '?'} (temporal, 1 turno)`);
      break;

    case 'weapon_destroyed':
      s.logs.unshift(`> CRIT: Arma destruida en ${locKey ?? '?'} (permanente)`);
      break;

    case 'ammo_weapon':
      fx.ammoExplosion = true;
      s.destroyed = true;
      s.destroyedReason = 'EXPLOSIÓN DE MUNICIÓN';
      s.logs.unshift('> CRIT: Munición detonada — VEHÍCULO DESTRUIDO');
      break;

    // Motive crits
    case 'piloting_plus1':
      fx.pilotingMod = (fx.pilotingMod ?? 0) + 1;
      s.logs.unshift(`> MOTRIZ: +1 Pilotaje (total: +${fx.pilotingMod})`);
      break;

    case 'mp_minus1_pilot2':
      s.motiveMP = (s.motiveMP ?? 0) + 1;
      fx.pilotingMod = (fx.pilotingMod ?? 0) + 2;
      s.logs.unshift(`> MOTRIZ: -1 PM, +2 Pilotaje`);
      break;

    case 'mp_half_pilot3':
      s.motiveHalfCount = (s.motiveHalfCount ?? 0) + 1;
      fx.pilotingMod = (fx.pilotingMod ?? 0) + 3;
      s.logs.unshift(`> MOTRIZ: PM/2, +3 Pilotaje`);
      break;

    case 'immobilized':
      s.immobilized = true;
      s.moveMode = 'immobile';
      s.logs.unshift('> MOTRIZ: INMOVILIZADO');
      break;
  }

  s.logs = s.logs.slice(0, 40);
  return s;
}

// ─── Destruction check ───────────────────────────────────────────────────────

export function vehicleCheckDestroyed(session: VehicleSession): VehicleSession {
  const fx = session.effects;
  let destroyed = false;
  let reason = '';

  // Fatal effects
  if (fx.crewKilled) { destroyed = true; reason = 'TRIPULACIÓN MUERTA'; }
  else if (fx.fuelEngineDestroyed) { destroyed = true; reason = 'COMBUSTIBLE/MOTOR DESTRUIDO'; }
  else if (fx.ammoExplosion) { destroyed = true; reason = 'EXPLOSIÓN DE MUNICIÓN'; }

  // Check IS=0 on any non-T2 location (handled by damage function, but recheck)
  if (!destroyed) {
    for (const [loc, is] of Object.entries(session.is)) {
      if (loc !== 'T2' && is <= 0 && (session.armor[loc] !== undefined)) {
        // Only count if the location actually exists with maxIS > 0
        destroyed = true;
        reason = `${loc} DESTRUIDO`;
        break;
      }
    }
  }

  // Check fatal crit slots
  if (!destroyed) {
    for (const slots of Object.values(session.crits)) {
      for (const slot of slots) {
        if (!slot.hit) continue;
        const n = (slot.name || '').toUpperCase();
        if (n.includes('CREW') || n.includes('TRIPULACION') || n.includes('PILOTO')) {
          destroyed = true; reason = 'TRIPULACIÓN MUERTA'; break;
        }
        if (n.includes('AMMO') || n.includes('MUNICION')) {
          destroyed = true; reason = 'EXPLOSIÓN DE MUNICIÓN'; break;
        }
        if (n.includes('ENGINE') || n.includes('MOTOR') || n.includes('REACTOR')) {
          destroyed = true; reason = 'MOTOR DESTRUIDO'; break;
        }
      }
      if (destroyed) break;
    }
  }

  return { ...session, destroyed, destroyedReason: destroyed ? reason : '' };
}

// ─── Effective MP calculation ────────────────────────────────────────────────

export function vehicleGetEffectiveMP(state: VehicleState, session: VehicleSession): { cruise: number; flank: number } {
  if (session.immobilized) return { cruise: 0, flank: 0 };
  let eff = Math.max(0, state.cruise - (session.motiveMP ?? 0));
  for (let i = 0; i < (session.motiveHalfCount ?? 0); i++) eff = Math.floor(eff / 2);
  eff = Math.max(0, eff);
  return { cruise: eff, flank: Math.ceil(eff * 1.5) };
}

// ─── Gunnery modifier from effects ──────────────────────────────────────────

export function vehicleGunneryMod(session: VehicleSession): number {
  const fx = session.effects;
  let mod = 0;
  // Movement modifier
  if (session.moveMode === 'immobile') mod -= 1;  // -1 for stationary
  if (session.moveMode === 'flank')    mod += 1;  // +1 for flanking
  // Crit effects
  mod += (fx.stabilizer ?? 0);        // +1 per stabilizer hit
  mod += (fx.sensors ?? 0) * 2;       // +2 per sensor hit
  if (fx.commanderHit) mod += 2;      // +2 for commander hit (once)
  if (fx.crewStunned && fx.crewStunned > 0) mod += 99; // can't fire
  if (session.motiveHalfCount >= 2) mod += 1; // motive penalty to gunnery
  return mod;
}

// ─── End of turn: decay temporary effects ────────────────────────────────────

export function vehicleEndTurnEffects(session: VehicleSession): VehicleSession {
  const fx = { ...session.effects };
  // Decay temporary effects
  if ((fx.crewStunned ?? 0) > 0) fx.crewStunned = Math.max(0, (fx.crewStunned ?? 0) - 1);
  if ((fx.turretJammedCount ?? 0) > 0) fx.turretJammedCount = Math.max(0, (fx.turretJammedCount ?? 0) - 1);
  return {
    ...session,
    effects: fx,
    weaponMalfunctionIds: [], // clear temporary malfunctions
  };
}
