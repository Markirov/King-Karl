// ══════════════════════════════════════════════════════════════
//  PARTE DEL DÍA — Frases rápidas mostradas en ComisionPage
//  Persiste localStorage (parte_diario_v1) + sync Sheets (PARTE_DIARIO)
// ══════════════════════════════════════════════════════════════

import { saveConfigBatch, loadConfig } from '@/lib/sheets-service';

export type ParteTone = 'info' | 'victoria' | 'warning' | 'status';

export interface ParteEntry {
  id:    string;
  text:  string;
  tone:  ParteTone;
  ts:    number;       // solo para orden interno
}

const KEY = 'parte_diario_v1';
const MAX_ENTRIES = 50;

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readPartes(): ParteEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writePartes(list: ParteEntry[]): void {
  try {
    const trimmed = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    syncToSheets(trimmed).catch(() => {});
  } catch { /* silent */ }
}

export function addParte(text: string, tone: ParteTone): ParteEntry {
  const entry: ParteEntry = { id: genId(), text, tone, ts: Date.now() };
  const list = readPartes();
  list.unshift(entry);
  writePartes(list);
  return entry;
}

export function updateParte(id: string, patch: Partial<Pick<ParteEntry, 'text' | 'tone'>>): void {
  const list = readPartes();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  writePartes(list);
}

export function deleteParte(id: string): void {
  writePartes(readPartes().filter(e => e.id !== id));
}

async function syncToSheets(list: ParteEntry[]): Promise<void> {
  await saveConfigBatch({ PARTE_DIARIO: JSON.stringify(list) });
}

export async function loadPartesFromSheets(): Promise<ParteEntry[] | null> {
  const res = await loadConfig();
  if (!res.success) return null;
  const d = res.data?.config ?? res.data;
  const raw = d?.['PARTE_DIARIO'];
  if (!raw) return null;
  try { return JSON.parse(raw) as ParteEntry[]; }
  catch { return null; }
}
