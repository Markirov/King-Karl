// ══════════════════════════════════════════════════════════════
//  PARTE DEL DÍA — Frases rápidas mostradas en ComisionPage
//  v2: localStorage cache + sync per-action a hoja `ParteDiario` dedicada
//      (sustituye al blob PARTE_DIARIO JSON en Configuracion)
// ══════════════════════════════════════════════════════════════

import {
  loadParteDiario as loadParteDiarioEndpoint,
  saveParteDiarioRemote,
  deleteParteDiarioRemote,
} from '@/lib/sheets-service';

export type ParteTone = 'info' | 'victoria' | 'warning' | 'status';

export interface ParteEntry {
  id:   string;
  text: string;
  tone: ParteTone;
  ts:   number;
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

function writePartesLocal(list: ParteEntry[]): void {
  try {
    const trimmed = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch { /* silent */ }
}

export function addParte(text: string, tone: ParteTone): ParteEntry {
  const entry: ParteEntry = { id: genId(), text, tone, ts: Date.now() };
  const list = readPartes();
  list.unshift(entry);
  writePartesLocal(list);
  saveParteDiarioRemote({
    id: entry.id, ts: entry.ts, text: entry.text, tone: entry.tone,
  }).catch(() => {});
  return entry;
}

export function updateParte(id: string, patch: Partial<Pick<ParteEntry, 'text' | 'tone'>>): void {
  const list = readPartes();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  const updated = { ...list[i], ...patch };
  list[i] = updated;
  writePartesLocal(list);
  saveParteDiarioRemote({
    id: updated.id, ts: updated.ts, text: updated.text, tone: updated.tone,
  }).catch(() => {});
}

export function deleteParte(id: string): void {
  writePartesLocal(readPartes().filter(e => e.id !== id));
  deleteParteDiarioRemote(id).catch(() => {});
}

export async function loadPartesFromSheets(): Promise<ParteEntry[] | null> {
  const res = await loadParteDiarioEndpoint();
  if (!res.success) return null;
  const arr = (res.data as any)?.entries;
  if (!Array.isArray(arr)) return null;
  const list: ParteEntry[] = arr.map((e: any) => ({
    id:   String(e.id || genId()),
    ts:   Number(e.ts) || 0,
    text: String(e.text || ''),
    tone: (['info', 'victoria', 'warning', 'status'].includes(e.tone) ? e.tone : 'info') as ParteTone,
  }));
  list.sort((a, b) => b.ts - a.ts);
  const trimmed = list.slice(0, MAX_ENTRIES);
  writePartesLocal(trimmed);
  return trimmed;
}
