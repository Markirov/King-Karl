// ══════════════════════════════════════════════════════════════
//  INFANTRY COMBAT — Lógica de combate para infantería y BA
//  Funciones puras: reciben (state, session) → devuelven session nueva
// ══════════════════════════════════════════════════════════════

import type {
  InfantryState, InfantrySession,
  BAState, BASession, BASuitSession,
  DamageFlags,
} from '@/lib/combat-types';

function clone<T>(obj: T): T {
  return structuredClone(obj);
}

// ──────────────────────────────────────────────────────────────
// INFANTERÍA CONVENCIONAL — Disparo
// ──────────────────────────────────────────────────────────────

export function infantryFire(
  state: InfantryState,
  session: InfantrySession,
  rangeBand: 0 | 1 | 2,
): { session: InfantrySession; damage: number } {
  const s = clone(session);

  if (s.destroyed || s.troopers < state.minTroopersToFire) {
    return { session: s, damage: 0 };
  }
  if (s.moveMode === 'prone') {
    s.logs.push(`${state.name}: no puede disparar (prone)`);
    return { session: s, damage: 0 };
  }

  const bands: (keyof typeof state.damageTable)[] = ['short', 'medium', 'long'];
  const damage = state.damageTable[bands[rangeBand]][s.troopers] ?? 0;

  const rangeLabel = ['corto', 'medio', 'largo'][rangeBand];
  s.logs.push(
    `${state.name} [${s.troopers}/${state.platoonSize}] → ${damage} dmg @ ${rangeLabel}`,
  );
  s.activeShotRange = rangeBand;

  return { session: s, damage };
}

// ──────────────────────────────────────────────────────────────
// BATTLE ARMOR — Disparo
// ──────────────────────────────────────────────────────────────

export function baFire(
  state: BAState,
  session: BASession,
  weaponId: number,
  rangeBand: 0 | 1 | 2,
): { session: BASession; damageBySuit: number[]; totalDamage: number } {
  const s = clone(session);
  const weapon = state.weapons.find(w => w.id === weaponId);
  if (!weapon || s.destroyed) {
    return { session: s, damageBySuit: [], totalDamage: 0 };
  }

  const damageBySuit: number[] = Array(state.suitCount).fill(0);

  for (const suit of s.suits) {
    if (!suit.alive) continue;
    if (suit.weaponsFiredThisTurn[weaponId]) continue;
    if (suit.weaponsExpended[weaponId]) continue;

    damageBySuit[suit.index] = weapon.damagePerShot;
    suit.weaponsFiredThisTurn[weaponId] = true;
    if (weapon.oneShot) suit.weaponsExpended[weaponId] = true;
  }

  const totalDamage = damageBySuit.reduce((a, b) => a + b, 0);
  const rangeLabel = ['corto', 'medio', 'largo'][rangeBand];
  const suitsFired = damageBySuit.filter(d => d > 0).length;

  s.logs.push(
    `${state.name} [${s.suits.filter(x => x.alive).length}/${state.suitCount} suits]` +
    ` → ${totalDamage} dmg (${weapon.name} ×${suitsFired} suits) @ ${rangeLabel}`,
  );

  return { session: s, damageBySuit, totalDamage };
}

// ──────────────────────────────────────────────────────────────
// INFANTERÍA CONVENCIONAL — Recibir daño
// ──────────────────────────────────────────────────────────────

export function infantryApplyDamage(
  state: InfantryState,
  session: InfantrySession,
  incoming: { amount: number; flags: DamageFlags },
): InfantrySession {
  const s = clone(session);
  if (s.destroyed) return s;

  let effective = Math.ceil(incoming.amount / state.damageDivisor);

  if (incoming.flags.cluster) effective = Math.ceil(effective * 2);
  if (incoming.flags.ae)      effective = Math.ceil(effective * 1.5);
  if (incoming.flags.burst)   effective += state.burstBonus;
  if (incoming.flags.flamer)  effective = Math.max(effective + 2, effective);
  if (incoming.flags.inferno) {
    s.infernoTurnsLeft = Math.max(s.infernoTurnsLeft, 3);
    s.moveMode = 'prone';
  }

  const before = s.troopers;
  s.troopers = Math.max(0, s.troopers - effective);

  const flagStr = Object.entries(incoming.flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join('+') || 'normal';

  s.logs.push(
    `Recibe ${incoming.amount} dmg (${flagStr}) → efectivo ${effective}` +
    ` → -${before - s.troopers} tropas → ${s.troopers}/${state.platoonSize}`,
  );

  if (s.troopers === 0) {
    s.destroyed = true;
    s.destroyedReason = 'Eliminado en combate';
    s.logs.push(`${state.name} ELIMINADO`);
  }

  return s;
}

// ──────────────────────────────────────────────────────────────
// INFANTERÍA CONVENCIONAL — Turno inferno
// ──────────────────────────────────────────────────────────────

export function infantryApplyInfernoTick(
  state: InfantryState,
  session: InfantrySession,
): InfantrySession {
  const s = clone(session);
  if (!s.infernoTurnsLeft || s.destroyed) return s;

  const loss = 6;
  s.troopers = Math.max(0, s.troopers - loss);
  s.infernoTurnsLeft -= 1;
  s.moveMode = 'prone';

  s.logs.push(`Inferno: -${loss} tropas → ${s.troopers}/${state.platoonSize} (${s.infernoTurnsLeft} turnos restantes)`);

  if (s.troopers === 0) {
    s.destroyed = true;
    s.destroyedReason = 'Eliminado por Inferno';
    s.logs.push(`${state.name} ELIMINADO`);
  }

  return s;
}

// ──────────────────────────────────────────────────────────────
// BATTLE ARMOR — Recibir daño
// ──────────────────────────────────────────────────────────────

export function baApplyDamage(
  state: BAState,
  session: BASession,
  targetSuitIndex: number | 'cluster',
  incoming: { amount: number; flags: DamageFlags },
): BASession {
  const s = clone(session);
  if (s.destroyed) return s;

  const aliveSuits = s.suits.filter(x => x.alive);
  if (aliveSuits.length === 0) return s;

  if (targetSuitIndex === 'cluster') {
    // Reparto cíclico: 1 punto por suit en orden
    let pts = incoming.amount;
    let i = 0;
    while (pts > 0) {
      const suit = aliveSuits[i % aliveSuits.length];
      suit.armor -= 1;
      if (suit.armor <= 0) {
        suit.armor = 0;
        suit.alive = false;
        s.logs.push(`${state.name} Suit ${suit.index + 1} DESTRUIDA`);
      }
      pts--;
      i++;
    }
    s.logs.push(
      `${state.name} recibe ${incoming.amount} cluster → distribuido entre ${aliveSuits.length} suits`,
    );
  } else {
    const suit = s.suits[targetSuitIndex];
    if (!suit || !suit.alive) return s;
    suit.armor -= incoming.amount;
    if (suit.armor <= 0) {
      suit.armor = 0;
      suit.alive = false;
      s.logs.push(`${state.name} Suit ${suit.index + 1} DESTRUIDA`);
    } else {
      s.logs.push(
        `${state.name} Suit ${suit.index + 1} recibe ${incoming.amount} dmg → ${suit.armor}/${state.armorPerSuit}`,
      );
    }
  }

  if (s.suits.every(x => !x.alive)) {
    s.destroyed = true;
    s.destroyedReason = 'Todas las suits destruidas';
    s.logs.push(`${state.name} ELIMINADO`);
  }

  return s;
}

// ──────────────────────────────────────────────────────────────
// ANTI-MECH — Leg Attack
// ──────────────────────────────────────────────────────────────

export function declareLegAttack(
  session: InfantrySession | BASession,
  mechSlotId: string,
  leg: 'LL' | 'RL',
): InfantrySession | BASession {
  const s = clone(session);
  s.legAttackTargetLeg = leg;
  (s as any).legAttackMechSlotId = mechSlotId;
  return s;
}

export function resolveLegAttack(
  state: InfantryState | BAState,
  session: InfantrySession | BASession,
  hit: boolean,
): { session: InfantrySession | BASession; damage: number } {
  const s = clone(session);

  if (!hit) {
    s.logs.push(`Leg Attack: fallo`);
    s.legAttackTargetLeg = null;
    return { session: s, damage: 0 };
  }

  let damage = 0;
  if ('troopers' in s) {
    damage = Math.floor((s as InfantrySession).troopers / 3);
    (s as InfantrySession).troopers = Math.max(0, (s as InfantrySession).troopers - 1);
  } else {
    const aliveSuits = (s as BASession).suits.filter(x => x.alive).length;
    damage = 2 * aliveSuits;
    const firstAlive = (s as BASession).suits.find(x => x.alive);
    if (firstAlive) firstAlive.alive = false;
  }

  s.logs.push(`Leg Attack ACIERTA → ${damage} dmg a ${s.legAttackTargetLeg}`);
  s.legAttackTargetLeg = null;
  return { session: s, damage };
}

// ──────────────────────────────────────────────────────────────
// ANTI-MECH — Swarm
// ──────────────────────────────────────────────────────────────

export function declareSwarm(
  session: InfantrySession | BASession,
  mechSlotId: string,
): InfantrySession | BASession {
  const s = clone(session);
  s.swarmTargetSlotId = mechSlotId;
  if ('moveMode' in s) s.moveMode = 'swarming' as any;
  return s;
}

export function resolveSwarmTurn(
  state: InfantryState | BAState,
  session: InfantrySession | BASession,
): { session: InfantrySession | BASession; damage: number } {
  const s = clone(session);
  if (!s.swarmTargetSlotId) return { session: s, damage: 0 };

  let damage = 0;
  if ('troopers' in s) {
    damage = Math.floor((s as InfantrySession).troopers / 4);
  } else {
    damage = (s as BASession).suits.filter(x => x.alive).length;
  }

  s.logs.push(`Swarm en ${s.swarmTargetSlotId}: ${damage} dmg automático`);
  return { session: s, damage };
}

export function attemptShakeOff(
  session: InfantrySession | BASession,
  success: boolean,
): { session: InfantrySession | BASession; troopersLost: number } {
  const s = clone(session);
  if (!success) {
    s.logs.push(`Shake off: fallo — swarm continúa`);
    return { session: s, troopersLost: 0 };
  }

  let lost = 0;
  if ('troopers' in s) {
    lost = Math.floor(Math.random() * 6) + 1; // 1d6
    (s as InfantrySession).troopers = Math.max(0, (s as InfantrySession).troopers - lost);
  } else {
    const firstAlive = (s as BASession).suits.find(x => x.alive);
    if (firstAlive) { firstAlive.alive = false; lost = 1; }
  }

  s.swarmTargetSlotId = null;
  (s as any).moveMode = 'stand';
  s.logs.push(`Shake off EXITOSO → swarm cae, -${lost} bajas`);
  return { session: s, troopersLost: lost };
}

// ──────────────────────────────────────────────────────────────
// RESET fin de turno (limpiar shots activos)
// ──────────────────────────────────────────────────────────────

export function infantryNextTurn(session: InfantrySession): InfantrySession {
  const s = clone(session);
  s.activeShotRange = null;
  s.activeShotTarget = null;
  s.legAttackTargetLeg = null;
  return s;
}

export function baNextTurn(session: BASession): BASession {
  const s = clone(session);
  for (const suit of s.suits) {
    suit.weaponsFiredThisTurn = {};
  }
  s.legAttackTargetLeg = null;
  return s;
}
