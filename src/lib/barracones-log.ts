// ══════════════════════════════════════════════════════════════
//  BARRACONES LOG — Registro de cambios de piloto
//  Persiste en localStorage (barracones_log_v1), máx 40 entradas
//  y sincroniza con Sheets Configuracion → celda ORDEN_DIA
// ══════════════════════════════════════════════════════════════

import { saveConfigBatch, loadConfig } from '@/lib/sheets-service';

export type LogTipo = 'skill' | 'attr' | 'quirk' | 'xp' | 'mech';

export interface LogEntry {
  ts:    number;   // Date.now()
  pilot: string;   // callsign o nombre
  tipo:  LogTipo;
  desc:  string;   // descripción legible
}

const LOG_KEY    = 'barracones_log_v1';
const MAX_ENTRIES = 40;

export function appendLog(entry: Omit<LogEntry, 'ts'>): void {
  try {
    const raw  = localStorage.getItem(LOG_KEY);
    const log: LogEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift({ ...entry, ts: Date.now() });
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
    syncLogToSheets(log).catch(() => {});
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

export async function syncLogToSheets(log?: LogEntry[]): Promise<void> {
  const entries = log ?? readLog();
  await saveConfigBatch({ ORDEN_DIA: JSON.stringify(entries) });
}

export async function loadLogFromSheets(): Promise<LogEntry[] | null> {
  const res = await loadConfig();
  if (!res.success) return null;
  const d = res.data?.config ?? res.data;
  const raw = d?.['ORDEN_DIA'];
  if (!raw) return null;
  try { return JSON.parse(raw) as LogEntry[]; }
  catch { return null; }
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
