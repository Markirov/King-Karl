// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS SERVICE — Apps Script backend communication
// ═══════════════════════════════════════════════════════════════

// URL deployment activo del Apps Script (fallback bundled).
// Fuente de verdad: public/config.json (fetched al iniciar app).
const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyIDYDFO2UyLJ7I6c0QadLU4O85gQWPoaaYo9HmObQaZloSq8bsy_ET_UevkLvDY61a9w/exec';

const REMOTE_CONFIG_KEY = 'GOOGLE_SCRIPT_URL_REMOTE';

// URLs viejas conocidas que deben migrarse silenciosamente a la nueva.
const STALE_URLS = [
  'https://script.google.com/macros/s/AKfycbyAAh-lYB1L72hTH72lpYDD0mcaAyeERLjJp1e0Ar0hhuZK8TszJdu-qmlN_cwi4sEncQ/exec',
];

// Migración auto: si el usuario tiene una URL custom vieja, la limpiamos.
(() => {
  try {
    const custom = localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM');
    if (custom && STALE_URLS.includes(custom)) {
      console.warn('[sheets] URL custom vieja detectada → migrando a default nueva.');
      localStorage.removeItem('GOOGLE_SCRIPT_URL_CUSTOM');
    }
    const remote = localStorage.getItem(REMOTE_CONFIG_KEY);
    if (remote && STALE_URLS.includes(remote)) {
      localStorage.removeItem(REMOTE_CONFIG_KEY);
    }
  } catch {/* ignore */}
})();

/**
 * Prioridad URL:
 *   1. CUSTOM (SecretMenu, override manual del usuario)
 *   2. REMOTE (public/config.json, sync automático)
 *   3. DEFAULT_SCRIPT_URL (bundled fallback)
 */
function getUrl(): string {
  return localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM')
      || localStorage.getItem(REMOTE_CONFIG_KEY)
      || DEFAULT_SCRIPT_URL;
}

/**
 * Sincroniza URL desde public/config.json (servido por GitHub Pages).
 * Llamar al iniciar la app. Si la remote difiere de la cached, actualiza.
 * No bloquea: silencioso si falla.
 */
export async function syncScriptUrlFromRemote(): Promise<void> {
  try {
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    const res = await fetch(`${base}config.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    const remoteUrl = String(cfg?.scriptUrl || '').trim();
    if (!remoteUrl || !remoteUrl.startsWith('https://script.google.com/')) return;

    const cached = localStorage.getItem(REMOTE_CONFIG_KEY);
    if (cached !== remoteUrl) {
      localStorage.setItem(REMOTE_CONFIG_KEY, remoteUrl);
      console.log('[sheets] Script URL sincronizada desde config.json:', remoteUrl);
      // Limpia STALE_URLS por si remote ya migró
      if (STALE_URLS.includes(localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM') || '')) {
        localStorage.removeItem('GOOGLE_SCRIPT_URL_CUSTOM');
      }
    }
  } catch (e) {
    console.warn('[sheets] No se pudo sincronizar URL remota:', e);
  }
}

export async function sheetsGet(params: Record<string, string>) {
  const url = new URL(getUrl());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    return { success: true, data: await res.json() };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function sheetsPost(body: Record<string, any>) {
  try {
    // text/plain avoids CORS preflight — Apps Script reads e.postData.contents the same way
    const res = await fetch(getUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(body),
    });
    return { success: true, data: await res.json() };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export const loadConfig      = ()              => sheetsGet({ action: 'getConfiguracion' });
export const loadPlayer      = (name: string)  => sheetsGet({ jugador: name });
export const savePlayer      = (data: any)     => sheetsPost({ action: 'guardarJugador', ...data });
export const loadUnitSheet   = (name: string)  => sheetsGet({ action: 'getHojaUnidad', jugador: name });
export const searchPilots    = (name: string)  => sheetsGet({ jugador: name });
export const savePilot       = (data: any)     => sheetsPost(data);
export const registerImprovement = (jugador: string, xpGastado: number, mejora: string) =>
  sheetsGet({
    action: 'registrarMejora',
    jugador,
    fechaHora: new Date().toLocaleString('es-ES'),
    xpGastado: String(-Math.abs(xpGastado)),
    mejora,
    tipo: 'Subidas',
  });

export const registerMission = (xp: Record<string, number>, dinero: number, gastos: number) =>
  sheetsGet({
    action: 'registrarMision',
    xpMap: JSON.stringify(xp),    // dinámico — Apps Script mapea por header
    dineroGanado: String(dinero),
    gastos:       String(gastos),
  });

// ── Mission registration GRANULAR (Hoja de Servicio P3) ──────
// Cliente envía TODOS los campos. Apps Script `appendRegistroRow`
// hace match case-insensitive contra row 1 de "Respuestas de
// formulario 1". Para guardar un campo nuevo basta con añadir su
// header a la hoja — no toca código backend.
export interface MissionFullPayload {
  // Meta
  missionId:     string;
  fecha:         string;
  codUnidad:     string;
  oficial:       string;
  missionType:   string;
  duration:      string;
  // Pilot breakdown (handles → XP / chequeos / rerolls)
  xpMap:         Record<string, number>;
  chequeosMap:   Record<string, number>;
  rerollsMap:    Record<string, number>;
  // Tesorería · HABER
  pago:          number;
  salvamento:    number;
  extrasHaber:   number;
  // Tesorería · DEBE
  reparacion:    number;
  municion:      number;
  blindaje:      number;
  extrasDebe:    number;
  // Computed
  totalHaber:    number;
  totalDebe:     number;
  balance:       number;
  // Note
  bitacoraNote:  string;
}

export const registerMissionFull = (p: MissionFullPayload) =>
  sheetsPost({
    action: 'registrarMision',
    // Meta
    missionId:    p.missionId,
    fechaPropia:  p.fecha,
    codUnidad:    p.codUnidad,
    oficial:      p.oficial,
    missionType:  p.missionType,
    duration:     p.duration,
    // Pilot maps (JSON, header-matched)
    xpMap:        JSON.stringify(p.xpMap),
    chequeosMap:  JSON.stringify(p.chequeosMap),
    rerollsMap:   JSON.stringify(p.rerollsMap),
    // Tesorería granular
    pago:         p.pago,
    salvamento:   p.salvamento,
    extrasHaber:  p.extrasHaber,
    reparacion:   p.reparacion,
    municion:     p.municion,
    blindaje:     p.blindaje,
    extrasDebe:   p.extrasDebe,
    // Totales (compat con `Dinero` / `Gastos` existentes)
    dineroGanado: p.totalHaber,
    gastos:       p.totalDebe,
    totalHaber:   p.totalHaber,
    totalDebe:    p.totalDebe,
    balance:      p.balance,
    // Note
    bitacoraNote: p.bitacoraNote,
  });

export const loadLogros = () => sheetsGet({ action: 'getLogros' });
export const loadHistorial = () => sheetsGet({ action: 'getHistorial' });

export const registerXPExpense = (jugador: string, cantidad: number, descripcion: string) =>
  sheetsGet({
    action: 'registrarGastoXP',
    jugador,
    cantidad: String(cantidad),
    descripcion,
  });

export const saveConfigBatch = (config: Record<string, string>) =>
  sheetsGet({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify(config),
  });

/** Borra el mech asignado a un jugador en Personajes (col Q). Apps Script:
 *  action='removeMechFromUnit' busca row por jugador y limpia col Q. */
export const removeMechFromUnit = (jugador: string) =>
  sheetsPost({ action: 'removeMechFromUnit', jugador });

// ── Fuerzas (simulador snapshots) ───────────────────────────────
// Schema sheet Fuerzas: ID | Nombre | Fecha | BV | JSON
import type { SimuladorSnapshot } from './simulador-persistence';

export interface FuerzaEntry {
  id: string;
  nombre: string;
  fecha: string;
  bv: number;
  snapshot: SimuladorSnapshot;
}

export const loadFuerzas = () => sheetsGet({ action: 'getFuerzas' });

// ── Fuerzas — slots fijos en Configuracion (FUERZA1..FUERZA5) ────

export type FuerzaSlot = 1 | 2 | 3 | 4 | 5;

export interface FuerzaConfigEntry {
  nombre:    string;
  bv:        number;
  updatedAt: string;
  snapshot:  SimuladorSnapshot;
}

const fuerzaKey = (slot: FuerzaSlot) => `FUERZA${slot}` as const;

/** Guarda fuerza en slot fijo FUERZA1-5 de Configuracion.
 *  USA POST porque el snapshot es grande y reventaría el límite de URL en GET. */
export async function saveFuerzaConfigSlot(
  slot: FuerzaSlot,
  payload: { nombre: string; bv: number; snapshot: SimuladorSnapshot },
) {
  const entry: FuerzaConfigEntry = {
    nombre:    payload.nombre,
    bv:        payload.bv,
    updatedAt: new Date().toISOString(),
    snapshot:  payload.snapshot,
  };
  return sheetsPost({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify({ [fuerzaKey(slot)]: JSON.stringify(entry) }),
  });
}

// ── FUERZACAMPAÑA — celda dedicada modo campaña ────────────────
// Misma estructura FuerzaConfigEntry. Vive en celda 'FUERZACAMPAÑA' de Configuracion.

const FUERZA_CAMPANA_KEY = 'FUERZACAMPAÑA';

export async function saveFuerzaCampana(
  payload: { nombre: string; bv: number; snapshot: SimuladorSnapshot },
) {
  const entry: FuerzaConfigEntry = {
    nombre:    payload.nombre,
    bv:        payload.bv,
    updatedAt: new Date().toISOString(),
    snapshot:  payload.snapshot,
  };
  return sheetsPost({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify({ [FUERZA_CAMPANA_KEY]: JSON.stringify(entry) }),
  });
}

export async function loadFuerzaCampana(): Promise<FuerzaConfigEntry | null> {
  const res = await loadConfig();
  if (!res?.success) return null;
  const cfg = (res.data as any)?.config ?? res.data;
  const raw = cfg?.[FUERZA_CAMPANA_KEY];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FuerzaConfigEntry;
  } catch {
    return null;
  }
}

/** Lee un slot. null si vacío o malformado. */
export async function loadFuerzaConfigSlot(slot: FuerzaSlot): Promise<FuerzaConfigEntry | null> {
  const res = await loadConfig();
  if (!res?.success) return null;
  const cfg = (res.data as any)?.config ?? res.data;
  const raw = cfg?.[fuerzaKey(slot)];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FuerzaConfigEntry;
  } catch {
    return null;
  }
}

/** Lee los 5 slots a la vez con 1 sola request. */
export async function loadAllFuerzaConfigSlots(): Promise<Record<FuerzaSlot, FuerzaConfigEntry | null>> {
  const res = await loadConfig();
  const out: Record<FuerzaSlot, FuerzaConfigEntry | null> = { 1: null, 2: null, 3: null, 4: null, 5: null };
  if (!res?.success) return out;
  const cfg = (res.data as any)?.config ?? res.data;
  ([1, 2, 3, 4, 5] as FuerzaSlot[]).forEach(s => {
    const raw = cfg?.[fuerzaKey(s)];
    if (!raw) return;
    try { out[s] = JSON.parse(raw) as FuerzaConfigEntry; } catch {}
  });
  return out;
}

/** Borra un slot (escribe '' en la celda). */
export async function clearFuerzaConfigSlot(slot: FuerzaSlot) {
  return sheetsPost({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify({ [fuerzaKey(slot)]: '' }),
  });
}

// ── Enemigos HUD — slots fijos en Configuracion (ENEMIGO1..ENEMIGO5) ──

export type EnemigoSlot = 1 | 2 | 3 | 4 | 5;

export interface EnemigoUnitMinimal {
  name:  string;
  xp:    number;
  color: string;
}

export interface EnemigoConfigEntry {
  nombre:    string;
  count:     number;
  totalBV:   number;
  updatedAt: string;
  enemies:   EnemigoUnitMinimal[];
}

const enemigoKey = (slot: EnemigoSlot) => `ENEMIGO${slot}` as const;

/** Guarda fuerza enemiga en slot ENEMIGO1..5 de Configuracion. */
export async function saveEnemigoConfigSlot(
  slot: EnemigoSlot,
  payload: { nombre: string; enemies: EnemigoUnitMinimal[] },
) {
  const totalBV = payload.enemies.reduce((s, e) => s + (e.xp || 0), 0);
  const entry: EnemigoConfigEntry = {
    nombre:    payload.nombre,
    count:     payload.enemies.length,
    totalBV,
    updatedAt: new Date().toISOString(),
    enemies:   payload.enemies,
  };
  return sheetsPost({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify({ [enemigoKey(slot)]: JSON.stringify(entry) }),
  });
}

/** Lee los 5 slots ENEMIGO en una sola request. */
export async function loadAllEnemigoConfigSlots(): Promise<Record<EnemigoSlot, EnemigoConfigEntry | null>> {
  const res = await loadConfig();
  const out: Record<EnemigoSlot, EnemigoConfigEntry | null> = { 1: null, 2: null, 3: null, 4: null, 5: null };
  if (!res?.success) return out;
  const cfg = (res.data as any)?.config ?? res.data;
  ([1, 2, 3, 4, 5] as EnemigoSlot[]).forEach(s => {
    const raw = cfg?.[enemigoKey(s)];
    if (!raw) return;
    try { out[s] = JSON.parse(raw) as EnemigoConfigEntry; } catch {}
  });
  return out;
}

/** Borra slot ENEMIGO (escribe '' en celda). */
export async function clearEnemigoConfigSlot(slot: EnemigoSlot) {
  return sheetsPost({
    action: 'saveConfiguracionBatch',
    config: JSON.stringify({ [enemigoKey(slot)]: '' }),
  });
}

export const saveFuerza = (data: {
  id?: string;
  nombre: string;
  bv: number;
  snapshot: SimuladorSnapshot;
}) =>
  sheetsPost({
    action: 'saveFuerzas',
    id: data.id ?? '',
    nombre: data.nombre,
    fecha: new Date().toISOString(),
    bv: data.bv,
    json: JSON.stringify(data.snapshot),
  });

// ── Cronicas (sheet dedicado v2.4) ─────────────────────────────
export interface CronicaRemote {
  id:            string;
  ts:            number;
  campaignYear:  number;
  campaignMonth: number;
  campaignDay:   number;
  autor:         string;
  autorNombre:   string;
  tag:           string;
  titulo:        string;
  cuerpo:        string;
}

export const loadCronicas = () => sheetsGet({ action: 'getCronicas' });

export const saveCronicaRemote = (c: CronicaRemote) =>
  sheetsPost({
    action: 'saveCronica',
    id:            c.id,
    ts:            c.ts,
    campaignYear:  c.campaignYear,
    campaignMonth: c.campaignMonth,
    campaignDay:   c.campaignDay,
    autor:         c.autor,
    autorNombre:   c.autorNombre,
    tag:           c.tag,
    titulo:        c.titulo,
    cuerpo:        c.cuerpo,
  });

export const deleteCronicaRemote = (id: string) =>
  sheetsPost({ action: 'deleteCronica', id });

// ── Orden del Día (sheet dedicado v2.5) ────────────────────────
export interface OrdenDiaRemote {
  id:    string;
  ts:    number;
  pilot: string;
  tipo:  string;
  desc:  string;
}

export const loadOrdenDia = () => sheetsGet({ action: 'getOrdenDia' });

export const saveOrdenDiaRemote = (o: OrdenDiaRemote) =>
  sheetsPost({ action: 'saveOrdenDia', ...o });

export const deleteOrdenDiaRemote = (id: string) =>
  sheetsPost({ action: 'deleteOrdenDia', id });

// ── Parte Diario (sheet dedicado v2.5) ─────────────────────────
export interface ParteDiarioRemote {
  id:   string;
  ts:   number;
  text: string;
  tone: string;
}

export const loadParteDiario = () => sheetsGet({ action: 'getParteDiario' });

export const saveParteDiarioRemote = (p: ParteDiarioRemote) =>
  sheetsPost({ action: 'saveParteDiario', ...p });

export const deleteParteDiarioRemote = (id: string) =>
  sheetsPost({ action: 'deleteParteDiario', id });

// ── Movimientos (últimas N filas Respuestas formulario 1) ──────
export interface MovimientoEntry {
  fecha:       string;
  dinero:      number;
  gastos:      number;
  tipo:        string;
  descripcion: string;
}

export const loadMovimientos = (limit = 5) =>
  sheetsGet({ action: 'getMovimientos', limit: String(limit) });

// ── Libro Mayor (sheet dedicado v2.7) ──────────────────────────
export type LibroMayorTipo = 'ingreso' | 'gasto';
export type LibroMayorCategoria =
  | 'contrato_secundario'
  | 'compra_mech'
  | 'venta_mech'
  | 'repuestos'
  | 'sueldo_extra'
  | 'soborno'
  | 'mantenimiento_mensual'
  | 'gasto_misc'
  | 'ingreso_misc';

export interface LibroMayorEntry {
  id:        string;
  fecha:     string;
  concepto:  string;
  cantidad:  number;
  tipo:      LibroMayorTipo;
  categoria: LibroMayorCategoria;
  nota:      string;
  jugador:   string;
}

export const loadLibroMayor = () => sheetsGet({ action: 'getLibroMayor' });

export const saveLibroMayorEntry = (e: LibroMayorEntry) =>
  sheetsPost({ action: 'saveLibroMayor', ...e });

export const deleteLibroMayorEntry = (id: string) =>
  sheetsPost({ action: 'deleteLibroMayor', id });

/**
 * Wrapper: guarda entry + actualiza CONTRATO_VALOR (tesorería) en Configuracion.
 * delta = +cantidad si ingreso, -cantidad si gasto.
 *
 * Lee valor actual del store, aplica delta, persiste vía saveConfigBatch,
 * actualiza store.campaign.contratoValor.
 *
 * Usar SIEMPRE para entradas que afecten al balance real.
 */
export async function commitLibroEntryAndTreasury(
  entry: LibroMayorEntry,
  prevEntry?: LibroMayorEntry | null,
): Promise<void> {
  // Import dinámico para evitar ciclo
  const { useAppStore } = await import('./store');
  const { parseCurrencyValue, formatCzar } = await import('./currency-utils');
  const state = useAppStore.getState();

  await saveLibroMayorEntry(entry);

  // Actualizacion optimista del store para feedback UI inmediato.
  // El sheet NO se sobreescribe — CONTRATO_VALOR es formula que suma
  // LibroMayor / Unidad. Al recargar loadConfig se sincroniza con el real.
  const cur = parseCurrencyValue(state.campaign.contratoValor) ?? 0;
  let delta = entry.tipo === 'ingreso' ? entry.cantidad : -entry.cantidad;
  if (prevEntry) {
    delta -= prevEntry.tipo === 'ingreso' ? prevEntry.cantidad : -prevEntry.cantidad;
  }
  const newVal = cur + delta;
  const formatted = formatCzar(newVal).replace(' ₡', '');
  state.setCampaign({ contratoValor: formatted });
}

/** Wrapper delete: solo borra entry. Tesoreria recalcula via formula. */
export async function deleteLibroEntryAndTreasury(entry: LibroMayorEntry): Promise<void> {
  const { useAppStore } = await import('./store');
  const { parseCurrencyValue, formatCzar } = await import('./currency-utils');
  const state = useAppStore.getState();

  await deleteLibroMayorEntry(entry.id);

  // Update optimista del store. No sobreescribimos CONTRATO_VALOR (formula).
  const cur = parseCurrencyValue(state.campaign.contratoValor) ?? 0;
  const delta = entry.tipo === 'ingreso' ? -entry.cantidad : entry.cantidad;
  const newVal = cur + delta;
  const formatted = formatCzar(newVal).replace(' ₡', '');
  state.setCampaign({ contratoValor: formatted });
}

// ── Personal (sheet dedicado v2.7) ─────────────────────────────
export type PersonalRol =
  | 'mech_tech' | 'astech' | 'medico' | 'representante' | 'seguridad'
  | 'administrativo' | 'infanteria' | 'tripulacion_vehiculo'
  | 'tripulacion_nave' | 'piloto_aerospace' | 'battle_armor'
  | 'quartermaster' | 'oficial_radio' | 'comstar_liaison'
  | 'ingeniero_combate' | 'intel_officer' | 'chaplain' | 'otros';

export type PersonalNivel = 'green' | 'regular' | 'veteran' | 'elite';
export type PersonalEstado = 'activo' | 'baja' | 'kia' | 'retirado';

export interface PersonalEntry {
  id:         string;
  rol:        PersonalRol;
  nombre:     string;
  nivel:      PersonalNivel;
  sueldoMes:  number;
  fechaAlta:  string;
  estado:     PersonalEstado;
  nota:       string;
  cantidad:   number; // p.ej. 6 astechs como 1 entrada de cantidad=6
}

export const loadPersonal = () => sheetsGet({ action: 'getPersonal' });

export const savePersonalEntry = (e: PersonalEntry) =>
  sheetsPost({ action: 'savePersonal', ...e });

export const deletePersonalEntry = (id: string) =>
  sheetsPost({ action: 'deletePersonal', id });
