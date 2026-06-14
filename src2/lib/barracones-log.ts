// ══════════════════════════════════════════════════════════════
//  BARRACONES LOG — Registro de cambios de piloto (Orden del Día)
//  v2: localStorage cache + sync per-entry a hoja `OrdenDia` dedicada
//      (sustituye al blob ORDEN_DIA JSON en Configuracion)
//  Append-only desde la UI. Update/delete previstos pero no usados hoy.
// ══════════════════════════════════════════════════════════════

import {
  loadOrdenDia as loadOrdenDiaEndpoint,
  saveOrdenDiaRemote,
  deleteOrdenDiaRemote,
} from '@/lib/sheets-service';

export type LogTipo = 'skill' | 'attr' | 'quirk' | 'xp' | 'mech';

export interface LogEntry {
  id?:   string;        // nuevo: id estable para CRUD remoto
  ts:    number;
  pilot: string;
  tipo:  LogTipo;
  desc:  string;
}

const LOG_KEY     = 'barracones_log_v1';
const MAX_ENTRIES = 40;

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendLog(entry: Omit<LogEntry, 'ts' | 'id'>): void {
  try {
    const raw  = localStorage.getItem(LOG_KEY);
    const log: LogEntry[] = raw ? JSON.parse(raw) : [];
    const full: LogEntry = { ...entry, id: genId(), ts: Date.now() };
    log.unshift(full);
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
    // Sync remoto append único (no wholesale)
    saveOrdenDiaRemote({
      id:    full.id!,
      ts:    full.ts,
      pilot: full.pilot,
      tipo:  full.tipo,
      desc:  full.desc,
    }).catch(() => { /* offline: keep in cache */ });
  } catch { /* silent */ }
}

export function readLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Lee el log completo desde Sheets. Refresca cache local. */
export async function loadLogFromSheets(): Promise<LogEntry[] | null> {
  const res = await loadOrdenDiaEndpoint();
  if (!res.success) return null;
  const arr = (res.data as any)?.entries;
  if (!Array.isArray(arr)) return null;
  const list: LogEntry[] = arr.map((e: any) => ({
    id:    String(e.id || genId()),
    ts:    Number(e.ts) || 0,
    pilot: String(e.pilot || '?'),
    tipo:  (['skill', 'attr', 'quirk', 'xp', 'mech'].includes(e.tipo) ? e.tipo : 'xp') as LogTipo,
    desc:  String(e.desc || ''),
  }));
  // Orden: descendente por ts (más reciente primero)
  list.sort((a, b) => b.ts - a.ts);
  const trimmed = list.slice(0, MAX_ENTRIES);
  try { localStorage.setItem(LOG_KEY, JSON.stringify(trimmed)); } catch { /* silent */ }
  return trimmed;
}

/** Borra una entrada (no usada hoy, prevista para UI futura) */
export function deleteLogEntry(id: string): void {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const log: LogEntry[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(LOG_KEY, JSON.stringify(log.filter(e => e.id !== id)));
    deleteOrdenDiaRemote(id).catch(() => {});
  } catch { /* silent */ }
}

/** Formatea el timestamp como tiempo relativo corto */
export function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
