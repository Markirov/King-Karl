// ══════════════════════════════════════════════════════════════
//  CRÓNICAS STORE — Bitácora narrativa de la unidad
//  Persiste en localStorage (cronicas_v1) + sync Sheets (CRONICAS)
// ══════════════════════════════════════════════════════════════

import { saveConfigBatch, loadConfig } from '@/lib/sheets-service';

export type CronicaAutor = 'mando' | 'contratista' | 'narrador';
export type CronicaTag   = 'aar' | 'politica' | 'personal' | 'salto';

export interface CronicaEntry {
  id:             string;
  ts:             number;          // creación, fallback de orden
  campaignYear:   number;
  campaignMonth:  number;          // 1-12
  campaignDay:    number;          // 1-30
  autor:          CronicaAutor;
  autorNombre?:   string;          // override opcional (ej: "Sgto. Dayffid")
  titulo:         string;
  cuerpo:         string;          // markdown ligero
  tag:            CronicaTag;
}

const KEY = 'cronicas_v1';
const MAX_ENTRIES = 200;

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readCronicas(): CronicaEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeCronicas(list: CronicaEntry[]): void {
  try {
    const trimmed = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    syncToSheets(trimmed).catch(() => {});
  } catch { /* silent */ }
}

export function addCronica(entry: Omit<CronicaEntry, 'id' | 'ts'>): CronicaEntry {
  const full: CronicaEntry = { ...entry, id: genId(), ts: Date.now() };
  const list = readCronicas();
  list.unshift(full);
  writeCronicas(list);
  return full;
}

export function updateCronica(id: string, patch: Partial<Omit<CronicaEntry, 'id' | 'ts'>>): void {
  const list = readCronicas();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  writeCronicas(list);
}

export function deleteCronica(id: string): void {
  writeCronicas(readCronicas().filter(e => e.id !== id));
}

async function syncToSheets(list: CronicaEntry[]): Promise<void> {
  await saveConfigBatch({ CRONICAS: JSON.stringify(list) });
}

export async function loadCronicasFromSheets(): Promise<CronicaEntry[] | null> {
  const res = await loadConfig();
  if (!res.success) return null;
  const d = res.data?.config ?? res.data;
  const raw = d?.['CRONICAS'];
  if (!raw) return null;
  try { return JSON.parse(raw) as CronicaEntry[]; }
  catch { return null; }
}

/** Orden: campaña descendente (año→mes→día), desempate por ts desc */
export function sortCronicas(list: CronicaEntry[]): CronicaEntry[] {
  return [...list].sort((a, b) => {
    if (a.campaignYear  !== b.campaignYear)  return b.campaignYear  - a.campaignYear;
    if (a.campaignMonth !== b.campaignMonth) return b.campaignMonth - a.campaignMonth;
    if (a.campaignDay   !== b.campaignDay)   return b.campaignDay   - a.campaignDay;
    return b.ts - a.ts;
  });
}
