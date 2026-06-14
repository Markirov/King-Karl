// ══════════════════════════════════════════════════════════════
//  ROSTER — Lista de pilotos desde Personajes (Apps Script)
//  Fuente única de verdad para nombres, apodos, mechs, estado.
// ══════════════════════════════════════════════════════════════

import { sheetsGet } from './sheets-service';

export type PilotEstado = 'activo' | 'herido' | 'hospitalizado' | 'kia' | 'mia' | 'retirado';

export interface RosterEntry {
  order:         number;       // orden en sheet (1, 2, 3...)
  fila:          number;       // fila real sheet (debug)
  nombre:        string;       // nombre del personaje (ej. "Dayffid Guffrudd") col A
  nombreDisplay: string;       // nombre para portada Barracones col T (override visual)
  jugador:       string;       // handle jugador (ej. "Marcos") — slug foto
  apodo:         string;       // callsign (ej. "Castigador")
  origen:        string;
  afiliacion:    string;
  mech:          string;       // viene de Personajes col Q (BUSCARV Unidad)
  xpTotal:       number;
  xpDisponible:  number;
  sueldo:        string | number;
  dinero:        string | number;
  estado:        PilotEstado;
  lanza:         string;       // Personajes col V (ej. "Primus", "Secundus")
  /** Personajes col O — habilidad Disparo Mech ya calculada (TN BT). */
  disparoMech:   number | null;
  /** Personajes col P — habilidad Pilotaje Mech ya calculada (TN BT). */
  pilotajeMech:  number | null;
}

const ESTADOS_VALIDOS: PilotEstado[] = ['activo', 'herido', 'hospitalizado', 'kia', 'mia', 'retirado'];

/** Lee skill TN (entero >=0). null si vacio/no numerico. */
function parseSkill(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function normEstado(s: any): PilotEstado {
  const v = (s ?? '').toString().trim().toLowerCase();
  return (ESTADOS_VALIDOS as string[]).includes(v) ? (v as PilotEstado) : 'activo';
}

export async function loadRoster(): Promise<RosterEntry[]> {
  const res = await sheetsGet({ action: 'getRoster' });
  console.log('[ROSTER] response:', res);
  if (!res.success) {
    console.warn('[ROSTER] sheetsGet failed', res);
    return [];
  }
  const list = res.data?.roster;
  if (!Array.isArray(list)) {
    console.warn('[ROSTER] no roster array in response. data=', res.data);
    return [];
  }
  console.log('[ROSTER] loaded', list.length, 'pilots');
  return list.map((r: any): RosterEntry => ({
    order:         Number(r.order) || 0,
    fila:          Number(r.fila) || 0,
    nombre:        (r.nombre || '').toString(),
    nombreDisplay: (r.nombreDisplay || '').toString(),
    jugador:       (r.jugador || '').toString(),
    apodo:         (r.apodo || '').toString(),
    origen:        (r.origen || '').toString(),
    afiliacion:    (r.afiliacion || '').toString(),
    mech:          (r.mech || '').toString(),
    xpTotal:       Number(r.xpTotal) || 0,
    xpDisponible:  Number(r.xpDisponible) || 0,
    sueldo:        r.sueldo ?? '',
    dinero:        r.dinero ?? '',
    estado:        normEstado(r.estado),
    lanza:         (r.lanza || '').toString().trim(),
    disparoMech:   parseSkill(r.disparoMech ?? r.disparo ?? r.gunnery ?? r.colO),
    pilotajeMech:  parseSkill(r.pilotajeMech ?? r.pilotaje ?? r.piloting ?? r.colP),
  }));
}

/** Slug consistente para fotos: `pilot-{slug}.png` */
export function pilotSlug(jugador: string): string {
  return (jugador || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Filtra solo pilotos contables para XP/pago/lance (excluye baja permanente) */
export function isActivo(p: RosterEntry): boolean {
  return p.estado === 'activo' || p.estado === 'herido';
}

/** Busca por handle jugador (case-insensitive) */
export function findByJugador(roster: RosterEntry[], jugador: string): RosterEntry | undefined {
  const target = (jugador || '').trim().toLowerCase();
  return roster.find(r => r.jugador.toLowerCase() === target);
}
