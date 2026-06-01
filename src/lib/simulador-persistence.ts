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
