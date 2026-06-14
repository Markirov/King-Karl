// ═══════════════════════════════════════════════════════════════
// SIMULADOR PERSISTENCE — localStorage snapshot + sync con Fuerzas
// ═══════════════════════════════════════════════════════════════
import type { MechSlot, VehicleSlot, InfantrySlot, BASlot } from './combat-types';

export const SNAPSHOT_SCHEMA = 1 as const;
export const SNAPSHOT_KEY = 'kk_simulador_session_v1';

export interface SimuladorSnapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA;
  updatedAt: string; // ISO
  activeTab: 'mechs' | 'vehicles';
  currentMechIdx: number;
  currentVehicleIdx: number;
  activeInfantryIdx: number;
  activeBAIdx: number;
  mechSlots: MechSlot[];
  vehicleSlots: VehicleSlot[];
  infantrySlots: InfantrySlot[];
  baSlots: BASlot[];
}

/** Lee snapshot local. Devuelve null si no existe o schema cambió. */
export function loadLocalSnapshot(): SimuladorSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== SNAPSHOT_SCHEMA) {
      console.warn(`[simulador] snapshot schema mismatch (${parsed?.schemaVersion} vs ${SNAPSHOT_SCHEMA}), descartado`);
      return null;
    }
    return parsed as SimuladorSnapshot;
  } catch (e) {
    console.error('[simulador] error leyendo snapshot:', e);
    return null;
  }
}

/** Escribe snapshot a localStorage. Sin debounce — cambios discretos. */
export function saveLocalSnapshot(snap: Omit<SimuladorSnapshot, 'schemaVersion' | 'updatedAt'>): void {
  try {
    const full: SimuladorSnapshot = {
      schemaVersion: SNAPSHOT_SCHEMA,
      updatedAt: new Date().toISOString(),
      ...snap,
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(full));
  } catch (e) {
    console.error('[simulador] error guardando snapshot:', e);
  }
}

/** Borra snapshot local (útil al cerrar misión). */
export function clearLocalSnapshot(): void {
  localStorage.removeItem(SNAPSHOT_KEY);
}

/**
 * Restaura totalmente un mech slot del simulador a estado nuevo:
 *  - armor → state.armor (máximo)
 *  - is    → state.is (máximo)
 *  - crits hit=false
 *  - ammoBins[].current = max
 *  - heat=0, wounds=0, destroyed=false
 *
 * Usado tras pagar reparación completa en TallerModal.
 * Si slotIdx fuera de rango o slot sin state/session → no-op.
 * Devuelve true si se aplicó cambio.
 */
export function restoreMechSlotFull(slotIdx: number): boolean {
  const snap = loadLocalSnapshot();
  if (!snap) return false;
  const slot = snap.mechSlots[slotIdx];
  if (!slot?.state || !slot?.session) return false;

  const st = slot.state;
  const se = slot.session;

  // Armor + IS al máximo desde state
  se.armor = { ...(st.armor as Record<string, number>) };
  se.is    = { ...(st.is    as Record<string, number>) };

  // Crits limpios
  for (const loc of Object.keys(se.crits || {})) {
    se.crits[loc] = se.crits[loc].map(c => ({ ...c, hit: false }));
  }

  // Ammo refill (bins + grupos agregados)
  se.ammoBins = (se.ammoBins || []).map(b => ({ ...b, current: b.max }));
  se.ammoGroups = {};
  se.ammoGroupMax = {};
  for (const b of se.ammoBins) {
    const key = `${b.loc}::${b.familyKey}`;
    se.ammoGroups[key]    = (se.ammoGroups[key]    || 0) + b.current;
    se.ammoGroupMax[key]  = (se.ammoGroupMax[key]  || 0) + b.max;
  }
  // Limpia shots pendientes + activeShots
  se.activeShots = {};
  se.shotSpend = {};

  // Reset combat
  se.heat = 0;
  se.wounds = 0;
  se.destroyed = false;
  se.destroyedReason = '';
  se.weaponMods = {};
  se.critMods = {};
  se.logs = ['> RESTAURADO TRAS REPARACIÓN COMPLETA (Taller)', ...(se.logs || [])].slice(0, 50);

  saveLocalSnapshot({
    activeTab:         snap.activeTab,
    currentMechIdx:    snap.currentMechIdx,
    currentVehicleIdx: snap.currentVehicleIdx,
    activeInfantryIdx: snap.activeInfantryIdx,
    activeBAIdx:       snap.activeBAIdx,
    mechSlots:         snap.mechSlots,
    vehicleSlots:      snap.vehicleSlots,
    infantrySlots:     snap.infantrySlots,
    baSlots:           snap.baSlots,
  });
  return true;
}

/** True si el snapshot tiene al menos una unidad cargada (state!=null en algún slot). */
export function snapshotHasUnits(snap: SimuladorSnapshot): boolean {
  return (
    snap.mechSlots.some(s => s?.state) ||
    snap.vehicleSlots.some(s => s?.state) ||
    snap.infantrySlots.some(s => s?.state) ||
    snap.baSlots.some(s => s?.state)
  );
}

// ── Sync status ─────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'dirty' | 'pushing' | 'error' | 'offline';

/** Etiqueta humana para tooltip del indicador. */
export function syncStatusLabel(status: SyncStatus, lastSync?: string | null, error?: string | null): string {
  switch (status) {
    case 'synced': return lastSync ? `Sincronizado · ${new Date(lastSync).toLocaleTimeString('es-ES')}` : 'Sincronizado';
    case 'dirty':  return 'Cambios locales sin guardar';
    case 'pushing': return 'Guardando…';
    case 'error':  return `Error: ${error ?? 'desconocido'}`;
    case 'offline': return 'Sin sesión activa';
  }
}
