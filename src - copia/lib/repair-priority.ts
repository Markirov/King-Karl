// ══════════════════════════════════════════════════════════════
//  REPAIR PRIORITY ENGINE
//  Implementa spec_sistema_prioridades_reparacion.md
//  Tabla de tiempos derivada de Tech Manual (p.99-100) + CamOps (p.221).
// ══════════════════════════════════════════════════════════════

import type { MechRepairDamage } from './repair-engine';

// ── Constantes (spec sec 2) ───────────────────────────────────

export const MINUTOS_POR_DIA_NORMAL     = 480;  // 8h efectivas
export const MINUTOS_POR_DIA_EXTENDIDO  = 960;  // 16h turno extendido
export const MINUTOS_EXTRA_POR_TURNO    = MINUTOS_POR_DIA_EXTENDIDO - MINUTOS_POR_DIA_NORMAL; // 480

export const MINUTOS_POR_PUNTO_BLINDAJE = 5;

export type UnidadTiempo = 'horas' | 'dias' | 'semanas' | 'meses';

export const FACTOR_HORAS: Record<UnidadTiempo, number> = {
  horas:   1,
  dias:    24,
  semanas: 24 * 7,
  meses:   24 * 30,
};

// ── Tipos (spec sec 4) ────────────────────────────────────────

export type Categoria =
  | 'Movilidad'    // actuadores pierna, jump jets, motor
  | 'Armas'        // armas y equipo
  | 'Blindaje'     // por localizacion, divisible
  | 'Estructura'   // estructura interna por localizacion
  | 'Sensores'     // sensores, electronica
  | 'SoporteVital'; // gyro, soporte vital, sistemas criticos

export type Localizacion = 'HD' | 'CT' | 'LT' | 'RT' | 'LA' | 'RA' | 'LL' | 'RL';

export interface RepairItem {
  id:            string;
  nombre:        string;
  localizacion:  Localizacion;
  categoria:     Categoria;
  tiempoBase:    number;   // minutos
  divisible:     boolean;  // true solo para Blindaje
  puntosDanados?: number;  // solo si divisible
}

export type EstadoItem = 'reparado' | 'parcial' | 'pendiente';

export interface ResultadoItem {
  item:            RepairItem;
  estado:          EstadoItem;
  minutosUsados:   number;
  puntosReparados?: number;
  riesgoFatiga:    boolean;
}

export interface ResultadoCalculo {
  minutosDisponibles: number;
  minutosBase:        number;
  minutosExtra:       number;
  resultados:         ResultadoItem[];
  minutosUsadosTotal: number;
  minutosSinUsar:     number;
}

// ── Tabla tiempos por componente (Tech Manual p.99-100 + CamOps p.221) ──

/** Tiempo de reemplazo (minutos) por componente nombrado. */
export const TIEMPO_COMPONENTE = {
  // SoporteVital
  REACTOR_REPLACE:       360,
  REACTOR_CRIT:          200,
  GYRO_REPLACE:          240,
  GYRO_CRIT:             150,
  COCKPIT:               480,
  SOPORTE_VIDA:          100,
  // Sensores
  SENSORES_FULL:          75,
  SENSORES_PARCIAL:       30,
  // Movilidad - heat sinks + jump jets
  HEAT_SINK:              90,
  JUMP_JET:               90,
  // Movilidad - actuadores pierna (Hip/Knee/Ankle por punto BT)
  ACTUADOR_CADERA:       240,
  ACTUADOR_RODILLA:      150,
  ACTUADOR_TOBILLO:       50,
  // Brazo
  ACTUADOR_HOMBRO:       150,
  ACTUADOR_CODO:          60,
  ACTUADOR_MANO:          30,
  // Estructura per pt
  ESTRUCTURA_PER_PT:      30,
  // Armas (categoria por tonelaje aprox)
  ARMA_LIGERA:            60,   // <=2t  (MG, Small Laser, AC/2)
  ARMA_MEDIA:             90,   // 3-6t  (ML, LRM5, SRM4, AC/5)
  ARMA_PESADA:           120,   // 7-12t (LL, PPC, LRM15, AC/10)
  ARMA_ASALTO:           200,   // 13+t  (AC/20, Gauss, LRM20)
  ARMA_PARCIAL_RATIO:      0.5, // parcial = mitad del replace
  // Municion bin
  AMMO_BIN:               15,
} as const;

// ── Categorizacion ────────────────────────────────────────────

function categoriaDeActuador(): Categoria {
  return 'Movilidad';
}

/** Estimacion tonelaje del arma para asignar tiempo. */
function tiempoArmaByName(weaponName: string, mechTons?: number): number {
  const n = (weaponName || '').toLowerCase();
  // Hatchet/Sword/Mace son tonelaje variable
  if (n.includes('hatchet') || n.includes('hacha')) {
    const tons = mechTons ? Math.ceil(mechTons / 15) : 5;
    return tons >= 7 ? TIEMPO_COMPONENTE.ARMA_ASALTO : tons >= 3 ? TIEMPO_COMPONENTE.ARMA_PESADA : TIEMPO_COMPONENTE.ARMA_MEDIA;
  }
  if (n.includes('sword') || n.includes('espada')) {
    const tons = mechTons ? Math.ceil(mechTons / 20) : 4;
    return tons >= 6 ? TIEMPO_COMPONENTE.ARMA_PESADA : TIEMPO_COMPONENTE.ARMA_MEDIA;
  }
  if (n.includes('gauss'))                 return TIEMPO_COMPONENTE.ARMA_ASALTO;
  if (n.includes('ac/20') || n.includes('autocannon/20')) return TIEMPO_COMPONENTE.ARMA_ASALTO;
  if (n.includes('ac/10') || n.includes('autocannon/10')) return TIEMPO_COMPONENTE.ARMA_PESADA;
  if (n.includes('ac/5')  || n.includes('autocannon/5'))  return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('ac/2')  || n.includes('autocannon/2'))  return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('ultra ac/20') || n.includes('uac/20'))  return TIEMPO_COMPONENTE.ARMA_ASALTO;
  if (n.includes('ultra ac/10') || n.includes('uac/10'))  return TIEMPO_COMPONENTE.ARMA_PESADA;
  if (n.includes('ultra ac/5')  || n.includes('uac/5'))   return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('ultra ac/2')  || n.includes('uac/2'))   return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('lb 20') || n.includes('lb-20'))         return TIEMPO_COMPONENTE.ARMA_ASALTO;
  if (n.includes('lb 10') || n.includes('lb-10'))         return TIEMPO_COMPONENTE.ARMA_PESADA;
  if (n.includes('lb 5')  || n.includes('lb-5'))          return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('lb 2')  || n.includes('lb-2'))          return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('lrm 20') || n.includes('lrm20'))        return TIEMPO_COMPONENTE.ARMA_ASALTO;
  if (n.includes('lrm 15') || n.includes('lrm15'))        return TIEMPO_COMPONENTE.ARMA_PESADA;
  if (n.includes('lrm 10') || n.includes('lrm10'))        return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('lrm 5')  || n.includes('lrm5'))         return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('srm 6'))                                 return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('srm 4'))                                 return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('srm 2'))                                 return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('streak'))                                return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('ppc'))                                   return TIEMPO_COMPONENTE.ARMA_PESADA;
  if (n.includes('large') && n.includes('laser'))          return TIEMPO_COMPONENTE.ARMA_PESADA;
  if (n.includes('medium') && n.includes('laser'))         return TIEMPO_COMPONENTE.ARMA_MEDIA;
  if (n.includes('small') && n.includes('laser'))          return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('flamer'))                                return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('mg') || n.includes('machine gun'))       return TIEMPO_COMPONENTE.ARMA_LIGERA;
  if (n.includes('arrow'))                                 return TIEMPO_COMPONENTE.ARMA_ASALTO;
  return TIEMPO_COMPONENTE.ARMA_MEDIA;
}

// ── Conversion tiempo → minutos disponibles (spec sec 3) ──────

export interface ConfiguracionTiempo {
  valor:            number;
  unidad:           UnidadTiempo;
  turnosExtendidos: number; // 0..turnosMax
}

export interface CalculoTiempo {
  horasTotales:        number;
  minutosBase:         number;
  minutosExtra:        number;
  minutosDisponibles:  number;
  turnosMax:           number;
  turnosExtendidos:    number;
}

export function calcularMinutosDisponibles(cfg: ConfiguracionTiempo): CalculoTiempo {
  const horasTotales = Math.max(0, cfg.valor) * FACTOR_HORAS[cfg.unidad];
  const minutosBase  = Math.round(horasTotales * (MINUTOS_POR_DIA_NORMAL / 24)); // = horas * 20
  const turnosMax    = Math.max(1, Math.floor(horasTotales / 24));
  const turnosExtendidos = Math.min(turnosMax, Math.max(0, Math.floor(cfg.turnosExtendidos)));
  const minutosExtra = turnosExtendidos * MINUTOS_EXTRA_POR_TURNO;
  return {
    horasTotales,
    minutosBase,
    minutosExtra,
    minutosDisponibles: minutosBase + minutosExtra,
    turnosMax,
    turnosExtendidos,
  };
}

// ── Presets (spec sec 5) ──────────────────────────────────────

export type OrdenSecundario = 'asc' | 'desc' | 'manual';

export interface Preset {
  id:              string;
  nombre:          string;
  ordenCategorias: Categoria[];
}

export const PRESETS: Preset[] = [
  {
    id: 'persecucion',
    nombre: 'Persecución',
    ordenCategorias: ['Movilidad', 'SoporteVital', 'Sensores', 'Armas', 'Estructura', 'Blindaje'],
  },
  {
    id: 'defensa',
    nombre: 'Defensa de base',
    ordenCategorias: ['Blindaje', 'Armas', 'Estructura', 'SoporteVital', 'Sensores', 'Movilidad'],
  },
  { id: 'manual', nombre: 'Manual', ordenCategorias: [] },
];

export function aplicarPreset(
  items: RepairItem[],
  preset: Preset,
  orden: OrdenSecundario,
): RepairItem[] {
  if (preset.id === 'manual') return items;

  const grupos = new Map<Categoria, RepairItem[]>();
  for (const it of items) {
    const arr = grupos.get(it.categoria) ?? [];
    arr.push(it);
    grupos.set(it.categoria, arr);
  }
  const sortFn = (a: RepairItem, b: RepairItem) =>
    orden === 'asc' ? a.tiempoBase - b.tiempoBase
    : orden === 'desc' ? b.tiempoBase - a.tiempoBase
    : 0;

  const out: RepairItem[] = [];
  for (const cat of preset.ordenCategorias) {
    const grupo = grupos.get(cat) ?? [];
    if (orden !== 'manual') grupo.sort(sortFn);
    out.push(...grupo);
    grupos.delete(cat);
  }
  // Categorias no listadas al final, en orden de aparicion original
  for (const grupo of grupos.values()) out.push(...grupo);
  return out;
}

// ── Algoritmo asignacion (spec sec 6) ─────────────────────────

export function calcularReparaciones(
  items: RepairItem[],
  minutosDisponibles: number,
  minutosBase: number,
): ResultadoCalculo & { pendientesBlindaje: RepairItem[] } {
  let minutosRestantes = minutosDisponibles;
  const resultados: ResultadoItem[] = [];
  const pendientesBlindaje: RepairItem[] = [];

  const esTurnoExt = (usadosAntes: number, usadosEnEste: number) =>
    (usadosAntes + usadosEnEste) > minutosBase;

  for (const item of items) {
    if (item.tiempoBase === 0) {
      resultados.push({ item, estado: 'reparado', minutosUsados: 0, riesgoFatiga: false });
      continue;
    }
    if (!item.divisible) {
      if (item.tiempoBase <= minutosRestantes) {
        const usados = item.tiempoBase;
        const usadosAntes = minutosDisponibles - minutosRestantes;
        resultados.push({
          item, estado: 'reparado', minutosUsados: usados,
          riesgoFatiga: esTurnoExt(usadosAntes, usados),
        });
        minutosRestantes -= usados;
      } else {
        resultados.push({ item, estado: 'pendiente', minutosUsados: 0, riesgoFatiga: false });
      }
    } else {
      // Blindaje
      if (item.tiempoBase <= minutosRestantes) {
        const usados = item.tiempoBase;
        const usadosAntes = minutosDisponibles - minutosRestantes;
        resultados.push({
          item, estado: 'reparado', minutosUsados: usados,
          puntosReparados: item.puntosDanados,
          riesgoFatiga: esTurnoExt(usadosAntes, usados),
        });
        minutosRestantes -= usados;
      } else if (minutosRestantes > 0) {
        pendientesBlindaje.push(item);
        resultados.push({ item, estado: 'pendiente', minutosUsados: 0, riesgoFatiga: false });
      } else {
        resultados.push({ item, estado: 'pendiente', minutosUsados: 0, riesgoFatiga: false });
      }
    }
  }

  return {
    minutosDisponibles,
    minutosBase,
    minutosExtra: minutosDisponibles - minutosBase,
    resultados,
    minutosUsadosTotal: minutosDisponibles - minutosRestantes,
    minutosSinUsar:     minutosRestantes,
    pendientesBlindaje,
  };
}

/** Aplica asignacion manual de blindaje sobre un resultado previo.
 *  asignaciones: { itemId: puntosAsignados }. Mutates safe-copy. */
export function aplicarAsignacionBlindaje(
  base: ReturnType<typeof calcularReparaciones>,
  asignaciones: Record<string, number>,
): ResultadoCalculo {
  const minutosBase = base.minutosBase;
  const resultados = base.resultados.map(r => ({ ...r }));
  let minutosRestantes = base.minutosSinUsar;

  for (const r of resultados) {
    if (!r.item.divisible) continue;
    const asig = asignaciones[r.item.id] ?? 0;
    if (asig <= 0) continue;
    const minutosUsar = Math.min(asig, r.item.puntosDanados ?? 0) * MINUTOS_POR_PUNTO_BLINDAJE;
    if (minutosUsar <= 0 || minutosUsar > minutosRestantes) continue;
    const usadosAntes = base.minutosDisponibles - minutosRestantes;
    const allReparado = asig >= (r.item.puntosDanados ?? 0);
    r.estado = allReparado ? 'reparado' : 'parcial';
    r.minutosUsados = minutosUsar;
    r.puntosReparados = Math.min(asig, r.item.puntosDanados ?? 0);
    r.riesgoFatiga = (usadosAntes + minutosUsar) > minutosBase;
    minutosRestantes -= minutosUsar;
  }

  return {
    minutosDisponibles: base.minutosDisponibles,
    minutosBase,
    minutosExtra: base.minutosExtra,
    resultados,
    minutosUsadosTotal: base.minutosDisponibles - minutosRestantes,
    minutosSinUsar:     minutosRestantes,
  };
}

// ── Mapeo MechRepairDamage → RepairItem[] (spec sec 9) ────────

let _idCounter = 0;
const nextId = (prefix: string) => `${prefix}_${++_idCounter}`;

/** Construye lista de RepairItem desde damage declarado + tonelaje mech.
 *  Cada componente dañado se traduce a uno o varios items. */
export function mapearDamageARepairItems(
  damage: MechRepairDamage,
  mechTons?: number,
): RepairItem[] {
  const items: RepairItem[] = [];

  // Reactor (1-2 crits parciales; 3 = destruido total)
  if (damage.reactor > 0) {
    const tiempo = damage.reactor >= 3
      ? TIEMPO_COMPONENTE.REACTOR_REPLACE
      : TIEMPO_COMPONENTE.REACTOR_CRIT * damage.reactor;
    items.push({
      id: nextId('reactor'), nombre: `Reactor (${damage.reactor}/3)`,
      localizacion: 'CT', categoria: 'SoporteVital',
      tiempoBase: tiempo, divisible: false,
    });
  }

  // Gyro
  if (damage.gyro > 0) {
    const tiempo = damage.gyro >= 2
      ? TIEMPO_COMPONENTE.GYRO_REPLACE
      : TIEMPO_COMPONENTE.GYRO_CRIT;
    items.push({
      id: nextId('gyro'), nombre: `Giroscopio (${damage.gyro}/2)`,
      localizacion: 'CT', categoria: 'SoporteVital',
      tiempoBase: tiempo, divisible: false,
    });
  }

  // Cabina
  if (damage.cabinaDañada) {
    items.push({
      id: nextId('cabina'), nombre: 'Cabina',
      localizacion: 'HD', categoria: 'SoporteVital',
      tiempoBase: TIEMPO_COMPONENTE.COCKPIT, divisible: false,
    });
  }

  // Soporte vida
  if (damage.soporteVida > 0) {
    items.push({
      id: nextId('soporte'), nombre: 'Soporte vital',
      localizacion: 'HD', categoria: 'SoporteVital',
      tiempoBase: TIEMPO_COMPONENTE.SOPORTE_VIDA, divisible: false,
    });
  }

  // Sensores
  if (damage.sensores > 0) {
    const tiempo = damage.sensores >= 2 ? TIEMPO_COMPONENTE.SENSORES_FULL : TIEMPO_COMPONENTE.SENSORES_PARCIAL;
    items.push({
      id: nextId('sensores'), nombre: `Sensores x${damage.sensores}`,
      localizacion: 'HD', categoria: 'Sensores',
      tiempoBase: tiempo, divisible: false,
    });
  }

  // Radiadores (heat sinks)
  if (damage.radiadores > 0) {
    items.push({
      id: nextId('rads'), nombre: `Radiadores x${damage.radiadores}`,
      localizacion: 'CT', categoria: 'Movilidad',
      tiempoBase: TIEMPO_COMPONENTE.HEAT_SINK * damage.radiadores, divisible: false,
    });
  }

  // Retros (jump jets)
  if (damage.retros > 0) {
    items.push({
      id: nextId('jumps'), nombre: `Jump jets x${damage.retros}`,
      localizacion: 'CT', categoria: 'Movilidad',
      tiempoBase: TIEMPO_COMPONENTE.JUMP_JET * damage.retros, divisible: false,
    });
  }

  // Actuadores
  const actuadoresMap: Record<string, number> = {
    'Hombro':  TIEMPO_COMPONENTE.ACTUADOR_HOMBRO,
    'Codo':    TIEMPO_COMPONENTE.ACTUADOR_CODO,
    'Mano':    TIEMPO_COMPONENTE.ACTUADOR_MANO,
    'Cadera':  TIEMPO_COMPONENTE.ACTUADOR_CADERA,
    'Rodilla': TIEMPO_COMPONENTE.ACTUADOR_RODILLA,
    'Tobillo': TIEMPO_COMPONENTE.ACTUADOR_TOBILLO,
  };
  for (const [act, qty] of Object.entries(damage.actuadores ?? {})) {
    if (!qty || qty <= 0) continue;
    const tiempoUnit = actuadoresMap[act] ?? 60;
    items.push({
      id: nextId('act'), nombre: `Actuador ${act} x${qty}`,
      localizacion: 'LL', categoria: categoriaDeActuador(),
      tiempoBase: tiempoUnit * qty, divisible: false,
    });
  }

  // Estructura interna (per pt)
  if (damage.estructura > 0) {
    items.push({
      id: nextId('is'), nombre: `Estructura interna (${damage.estructura} pts)`,
      localizacion: 'CT', categoria: 'Estructura',
      tiempoBase: TIEMPO_COMPONENTE.ESTRUCTURA_PER_PT * damage.estructura, divisible: false,
    });
  }

  // Armas
  for (const arma of (damage.armas ?? [])) {
    const tBase = tiempoArmaByName(arma.name, mechTons);
    const tFinal = arma.status === 'parcial'
      ? Math.round(tBase * TIEMPO_COMPONENTE.ARMA_PARCIAL_RATIO)
      : tBase;
    items.push({
      id: nextId('arma'), nombre: `${arma.name}${arma.status === 'parcial' ? ' (parcial)' : ''}`,
      localizacion: (arma.loc as Localizacion) || 'CT',
      categoria: 'Armas',
      tiempoBase: tFinal, divisible: false,
    });
  }

  // Blindaje (divisible)
  if (damage.blindaje > 0) {
    items.push({
      id: nextId('armor'), nombre: `Blindaje (${damage.blindaje} pts)`,
      localizacion: 'CT', categoria: 'Blindaje',
      tiempoBase: damage.blindaje * MINUTOS_POR_PUNTO_BLINDAJE, divisible: true,
      puntosDanados: damage.blindaje,
    });
  }

  return items;
}
