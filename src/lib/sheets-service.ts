// ═══════════════════════════════════════════════════════════════
// GOOGLE SHEETS SERVICE — Apps Script backend communication
// ═══════════════════════════════════════════════════════════════

function getUrl(): string {
  return localStorage.getItem('GOOGLE_SCRIPT_URL_CUSTOM') ||
    'https://script.google.com/macros/s/AKfycbyAAh-lYB1L72hTH72lpYDD0mcaAyeERLjJp1e0Ar0hhuZK8TszJdu-qmlN_cwi4sEncQ/exec';
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

  // Delta neto: si reemplaza una entry previa, restaurar primero
  const cur = parseCurrencyValue(state.campaign.contratoValor) ?? 0;
  let delta = entry.tipo === 'ingreso' ? entry.cantidad : -entry.cantidad;
  if (prevEntry) {
    delta -= prevEntry.tipo === 'ingreso' ? prevEntry.cantidad : -prevEntry.cantidad;
  }
  const newVal = cur + delta;

  // String formato sin "₡" final para Sheets (sólo número con separador)
  const formatted = formatCzar(newVal).replace(' ₡', '');
  state.setCampaign({ contratoValor: formatted });
  saveConfigBatch({ CONTRATO_VALOR: formatted }).catch(() => {});
}

/** Wrapper delete: revierte delta sobre tesorería. */
export async function deleteLibroEntryAndTreasury(entry: LibroMayorEntry): Promise<void> {
  const { useAppStore } = await import('./store');
  const { parseCurrencyValue, formatCzar } = await import('./currency-utils');
  const state = useAppStore.getState();

  await deleteLibroMayorEntry(entry.id);

  const cur = parseCurrencyValue(state.campaign.contratoValor) ?? 0;
  // Revertir: si era ingreso ahora resta; si era gasto suma
  const delta = entry.tipo === 'ingreso' ? -entry.cantidad : entry.cantidad;
  const newVal = cur + delta;
  const formatted = formatCzar(newVal).replace(' ₡', '');
  state.setCampaign({ contratoValor: formatted });
  saveConfigBatch({ CONTRATO_VALOR: formatted }).catch(() => {});
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
