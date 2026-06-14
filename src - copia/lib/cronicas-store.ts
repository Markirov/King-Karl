// ══════════════════════════════════════════════════════════════
//  CRÓNICAS STORE — Bitácora narrativa de la unidad
//  v2: localStorage cache + sync per-action a hoja `Cronicas` dedicada
//  (sustituye al blob CRONICAS JSON en Configuracion)
// ══════════════════════════════════════════════════════════════

import {
  loadCronicas as loadCronicasEndpoint,
  saveCronicaRemote,
  deleteCronicaRemote,
} from '@/lib/sheets-service';

export type CronicaAutor = 'mando' | 'contratista' | 'narrador';
export type CronicaTag   = 'aar' | 'politica' | 'personal' | 'salto';

export interface CronicaEntry {
  id:             string;
  ts:             number;
  campaignYear:   number;
  campaignMonth:  number;
  campaignDay:    number;
  autor:          CronicaAutor;
  autorNombre?:   string;
  titulo:         string;
  cuerpo:         string;
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

function writeCronicasLocal(list: CronicaEntry[]): void {
  try {
    const trimmed = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch { /* silent */ }
}

/** Coerciones para tolerar valores remotos algo sucios. */
function normalize(remote: any): CronicaEntry {
  const autor: CronicaAutor =
    ['mando', 'contratista', 'narrador'].includes(remote.autor) ? remote.autor : 'mando';
  const tag: CronicaTag =
    ['aar', 'politica', 'personal', 'salto'].includes(remote.tag) ? remote.tag : 'aar';
  return {
    id:            String(remote.id || genId()),
    ts:            Number(remote.ts) || Date.now(),
    campaignYear:  Number(remote.campaignYear)  || 0,
    campaignMonth: Number(remote.campaignMonth) || 1,
    campaignDay:   Number(remote.campaignDay)   || 1,
    autor,
    autorNombre:   remote.autorNombre ? String(remote.autorNombre) : undefined,
    titulo:        String(remote.titulo || ''),
    cuerpo:        String(remote.cuerpo || ''),
    tag,
  };
}

export function addCronica(entry: Omit<CronicaEntry, 'id' | 'ts'>): CronicaEntry {
  const full: CronicaEntry = { ...entry, id: genId(), ts: Date.now() };
  const list = readCronicas();
  list.unshift(full);
  writeCronicasLocal(list);
  // Sync remoto (fire & forget; en error queda solo en cache local)
  saveCronicaRemote({
    id: full.id, ts: full.ts,
    campaignYear: full.campaignYear,
    campaignMonth: full.campaignMonth,
    campaignDay: full.campaignDay,
    autor: full.autor,
    autorNombre: full.autorNombre ?? '',
    tag: full.tag,
    titulo: full.titulo,
    cuerpo: full.cuerpo,
  }).catch(() => { /* TODO: queue offline */ });
  return full;
}

export function updateCronica(id: string, patch: Partial<Omit<CronicaEntry, 'id' | 'ts'>>): void {
  const list = readCronicas();
  const i = list.findIndex(e => e.id === id);
  if (i < 0) return;
  const updated = { ...list[i], ...patch };
  list[i] = updated;
  writeCronicasLocal(list);
  saveCronicaRemote({
    id: updated.id, ts: updated.ts,
    campaignYear: updated.campaignYear,
    campaignMonth: updated.campaignMonth,
    campaignDay: updated.campaignDay,
    autor: updated.autor,
    autorNombre: updated.autorNombre ?? '',
    tag: updated.tag,
    titulo: updated.titulo,
    cuerpo: updated.cuerpo,
  }).catch(() => {});
}

export function deleteCronica(id: string): void {
  writeCronicasLocal(readCronicas().filter(e => e.id !== id));
  deleteCronicaRemote(id).catch(() => {});
}

export async function loadCronicasFromSheets(): Promise<CronicaEntry[] | null> {
  const res = await loadCronicasEndpoint();
  if (!res.success) return null;
  const arr = (res.data as any)?.cronicas;
  if (!Array.isArray(arr)) return null;
  const list = arr.map(normalize);
  // Refresca cache local con remoto
  writeCronicasLocal(list);
  return list;
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
