// ══════════════════════════════════════════════════════════════
//  REPAIR ENGINE — Port EXACTO Sheets `Taller` (campaña ELH)
//
//  Fuentes:
//   - Sheets Taller G5:G19 (fórmulas)
//   - Sheets Ayudas BW2:BX57 (precios componentes)
//   - Sheets Ayudas BW32:BX35 + BW37:BX40 (gyro precios + multipliers)
//   - Sheets Ayudas AA1:AB31 (estado factura % multiplier)
//   - Sheets Ayudas AB67:AC317 (estado mech buckets via ESTADO range)
//
//  NOTA: este motor refleja el sistema propio de la campaña, NO StratOps
//  canónico. Las dos fórmulas divergen. Ver PENDING.md para integración
//  StratOps futura.
// ══════════════════════════════════════════════════════════════

// ── Precios componentes (Ayudas BW:BX) ────────────────────

export const PRECIO_CABINA       = 200_000;
export const PRECIO_SOPORTE_VIDA =  50_000;
export const PRECIO_SENSORES_BASE =  2_000;  // × peso/2 × cantidad

export const PRECIO_REACTOR: Record<string, number> = {
  'Fusion':     5_000,
  'Ligero':     1_500,
  'XL':        20_000,
  'Compacto':  10_000,
  'ICE':        1_250,
  'Celulas':    3_500,
  'Fision':     7_500,
};

/** Gyro: precio base (Ayudas BW32:BX35). */
export const PRECIO_GYRO_BASE: Record<string, number> = {
  'Estandar':  300_000,
  'Compacto':  400_000,
  'Pesado':    500_000,
  'XL':        750_000,
};

/** Gyro: multiplicador (Ayudas BW37:BX40). Aplica encima del precio base. */
export const GYRO_MULTIPLIER: Record<string, number> = {
  'Estandar': 1.0,
  'Compacto': 1.5,
  'Pesado':   2.0,
  'XL':       0.5,
};

export const PRECIO_MIOMERO: Record<string, number> = {
  'Estandar':                 2_000,
  'Triple Fuerza':           16_000,
  'Triple Fuerza Industrial': 12_000,
};

export const PRECIO_ESTRUCTURA: Record<string, number> = {
  'Estandar':     400,
  'EndoAcero':  1_600,
  'Industrial':   330,
  'Enviro':       225,
};

export const PRECIO_ACTUADOR: Record<string, number> = {
  'Hombro':  100,
  'Codo':     50,
  'Mano':     80,
  'Cadera':  150,
  'Rodilla':  80,
  'Tobillo': 120,
};

export const PRECIO_RETROS: Record<string, number> = {
  'Estandar':   200,
  'Mejorados':  500,
  'MASC':     1_000,
};

export const PRECIO_RADIADORES: Record<string, number> = {
  'Internos +10': 2_000,
  'Normales':     2_000,
  'Dobles':       6_000,
};

export const PRECIO_BLINDAJE: Record<string, number> = {
  'Comercial':            3_000,
  'Industrial':           5_000,
  'Estandar':            10_000,
  'Industrial Pesado':   10_000,
  'Ferro Fibroso Ligero': 15_000,
  'Ferro Fibroso':       20_000,
  'Ferro Fibroso Pesado': 25_000,
  'Stealth':             50_000,
};

// ── Modificador estado factura (Ayudas AA1:AB31, 31 niveles) ──
export const ESTADO_FACTURA_PCT = [
  150, 145, 140, 135, 130, 125, 120, 115, 110, 105,
  100, 95, 90, 85, 80, 75, 70, 65, 60, 55,
  50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0,
] as const;

// ── Tabla estado mech (Ayudas ESTADO named range AB67:AC317) ──
// Lookup: ROUNDUP(ESTADODAÑOS / 4, 0) → bucket
// ESTADODAÑOS = pct daño 0-100. /4 = 0-25 lookups.

export type EstadoMech = 'OPERATIVO' | 'LEVES' | 'MEDIOS' | 'MODERADOS' | 'GRAVES' | 'CRITICOS' | 'DESTRUIDO';

/** Devuelve estado mech según porcentaje daño total (0-100).
 *  Replica VLOOKUP(ROUNDUP(ESTADODAÑOS/4,0), ESTADO, 2, 0) en Taller G21. */
export function clasificarEstadoMech(pctDañoTotal: number): Exclude<EstadoMech, 'DESTRUIDO'> {
  const lookup = Math.ceil(pctDañoTotal / 4);
  if (lookup <= 0)  return 'OPERATIVO';
  if (lookup <= 5)  return 'LEVES';      // ~1-20%
  if (lookup <= 10) return 'MEDIOS';     // ~21-40%
  if (lookup <= 15) return 'MODERADOS';  // ~41-60%
  if (lookup <= 20) return 'GRAVES';     // ~61-80%
  return 'CRITICOS';                     // ~81+%
}

// ── Tipos ─────────────────────────────────────────────────

export interface MechRepairConfig {
  tons:           number;
  walkMP:         number;
  reactorType:    string;
  gyroType:       string;
  miomeroType:    string;
  estructuraType: string;
  retroType:      string;
  radType:        string;
  blindajeType:   string;
}

export interface MechRepairDamage {
  /** 0=OK, 1-2=parcial, 3=DESTRUIDO total. */
  reactor:      number;
  /** 0=OK, 1=parcial, 2=destruido. */
  gyro:         number;
  /** Booleano: true si cabina dañada. */
  cabinaDañada: boolean;
  /** Cantidad de uds. soporte vital dañadas. */
  soporteVida:  number;
  /** Cantidad sensores dañados. */
  sensores:     number;
  /** Puntos estructura interna perdidos (0-N). */
  estructura:   number;
  /** Puntos blindaje perdidos (0-N). Se convierten a toneladas internamente. */
  blindaje:     number;
  /** Cantidad miomeros dañados. */
  miomero:      number;
  /** Cantidad retros dañados. */
  retros:       number;
  /** Cantidad radiadores dañados. */
  radiadores:   number;
  /** Actuadores dañados por tipo y cantidad. */
  actuadores:   { [k in keyof typeof PRECIO_ACTUADOR]?: number };
  /** Armas con coste libre (no se lookup de catálogo aquí). */
  armas?:       { name: string; cost: number }[];
  /** Munición consumida en ₡. */
  municion?:    number;
}

export interface RepairBreakdown {
  reactor:     number;
  gyro:        number;
  cabina:      number;
  soporteVida: number;
  sensores:    number;
  estructura:  number;
  blindaje:    number;
  miomero:     number;
  actuadores:  number;
  retros:      number;
  radiadores:  number;
  armas:       number;
  municion:    number;
  subtotal:    number;
  /** Multiplier 0-150% del estado mantenimiento (no del daño). */
  estadoFacturaPct: number;
  total:       number;
  /** Estado mech inferido (OPERATIVO/LEVES/etc.). */
  estadoMech:  EstadoMech;
  /** Boolean: reactor=3 fuerza destrucción total. */
  destruido:   boolean;
}

// ── Calculadora ───────────────────────────────────────────

/** Calcula factura completa siguiendo fórmulas exactas Taller G5:G19.
 *
 *  Parámetros:
 *   @param config        Datos chasis (peso, tipos componentes)
 *   @param damage        Daños declarados
 *   @param estadoFactPct Modificador estado factura (0-150%, default 100%)
 *   @param pctDañoTotal  % daño total para estado mech (default 0)
 *
 *  Si reactor=3 → destruido=true. Factura sigue calculándose con costes
 *  máximos (reactor entero asumido).
 */
export function calcRepairCost(
  config: MechRepairConfig,
  damage: MechRepairDamage,
  estadoFactPct = 100,
  pctDañoTotal = 0,
): RepairBreakdown {
  const peso = config.tons;
  const mov  = config.walkMP;
  const potencia = mov * peso;        // B6 = B3*B4

  // === Reactor (Taller G5) ===
  // =(VLOOKUP(B5,Ayudas!BW22:BX28,2,0) * B6 * B4) / 75 * B15 / 2
  // Reactor=3 (destruido) → asume reactor nuevo entero, no usa /2
  const reactorBase = PRECIO_REACTOR[config.reactorType] ?? PRECIO_REACTOR['Fusion'];
  const destruido = damage.reactor >= 3;
  const reactor = damage.reactor > 0
    ? Math.round(
        destruido
          ? (reactorBase * potencia * peso) / 75            // entero
          : (reactorBase * potencia * peso) / 75 * damage.reactor / 2
      )
    : 0;

  // === Gyro (Taller G6) ===
  // =ROUNDUP(B4/100,0) * precioBase(B11) * multiplier(B11) * B16/2
  const gyroBase = PRECIO_GYRO_BASE[config.gyroType] ?? PRECIO_GYRO_BASE['Estandar'];
  const gyroMult = GYRO_MULTIPLIER[config.gyroType] ?? GYRO_MULTIPLIER['Estandar'];
  const gyro = damage.gyro > 0
    ? Math.round(Math.ceil(peso / 100) * gyroBase * gyroMult * damage.gyro / 2)
    : 0;

  // === Cabina (Taller G7) ===
  // =IF(B17="SI", Ayudas!BX2, 0) → 200k binario
  const cabina = damage.cabinaDañada ? PRECIO_CABINA : 0;

  // === Soporte Vital (Taller G8) ===
  // =B18 * Ayudas!BX3 → cantidad × 50k
  const soporteVida = damage.soporteVida * PRECIO_SOPORTE_VIDA;

  // === Sensores (Taller G9) ===
  // =B19 * Ayudas!BX4 * B4/2 → cantidad × 2k × peso/2
  const sensores = damage.sensores * PRECIO_SENSORES_BASE * (peso / 2);

  // === Estructura (Taller G10) ===
  // =VLOOKUP(B8,Ayudas!BW10:BX12,2,0) * B4 * B20/2
  // ESTRUCTURA: precio × peso × pts_perdidos / 2
  const estructuraBase = PRECIO_ESTRUCTURA[config.estructuraType] ?? PRECIO_ESTRUCTURA['Estandar'];
  const estructura = Math.round(estructuraBase * peso * damage.estructura / 2);

  // === Blindaje (Taller G11) ===
  // =VLOOKUP(B10,Ayudas!BW50:BX57,2,0) * ROUNDUP(B21/16,0)
  // BLINDAJE: precio × ceil(pts/16) → compra por toneladas (16 pts=1 ton)
  const blindajeBase = PRECIO_BLINDAJE[config.blindajeType] ?? PRECIO_BLINDAJE['Estandar'];
  const blindaje = blindajeBase * Math.ceil(damage.blindaje / 16);

  // === Miomero (Taller G12) ===
  // =VLOOKUP(B9,Ayudas!BW6:BX8,2,0) * B22 → precio × cantidad uds dañadas
  const miomeroBase = PRECIO_MIOMERO[config.miomeroType] ?? PRECIO_MIOMERO['Estandar'];
  const miomero = miomeroBase * damage.miomero;

  // === Actuadores (Taller G13) ===
  // Suma de cada actuador: precio × peso × cantidad
  const actuadores = Object.entries(damage.actuadores ?? {}).reduce((sum, [name, qty]) => {
    const price = PRECIO_ACTUADOR[name as keyof typeof PRECIO_ACTUADOR] ?? 0;
    return sum + price * peso * (qty ?? 0);
  }, 0);

  // === Retros (Taller G14) ===
  // =VLOOKUP(B12,Ayudas!BW42:BX43,2,0) * B23 → precio × cantidad
  const retroBase = PRECIO_RETROS[config.retroType] ?? PRECIO_RETROS['Estandar'];
  const retros = retroBase * damage.retros;

  // === Radiadores (Taller G15) ===
  // =VLOOKUP(B13,Ayudas!BW47:BX48,2,0) * B24 → precio × cantidad
  const radBase = PRECIO_RADIADORES[config.radType] ?? PRECIO_RADIADORES['Normales'];
  const radiadores = radBase * damage.radiadores;

  // === Armas + Munición ===
  const armas    = (damage.armas ?? []).reduce((s, w) => s + (w.cost || 0), 0);
  const municion = damage.municion ?? 0;

  const subtotal =
    reactor + gyro + cabina + soporteVida + sensores +
    estructura + blindaje + miomero +
    actuadores + retros + radiadores +
    armas + municion;

  // === Total (Taller G19) ===
  // =SUM(G5:G17) * VLOOKUP(F2,Ayudas!AA1:AB31,2,0) / 100
  const total = Math.round(subtotal * (estadoFactPct / 100));

  // === Estado mech (Taller G21) ===
  // Reactor=3 → DESTRUIDO. Si no, lookup en tabla ESTADO.
  const estadoMech: EstadoMech = destruido ? 'DESTRUIDO' : clasificarEstadoMech(pctDañoTotal);

  return {
    reactor, gyro, cabina, soporteVida, sensores,
    estructura, blindaje, miomero,
    actuadores, retros, radiadores,
    armas, municion,
    subtotal, estadoFacturaPct: estadoFactPct, total,
    estadoMech, destruido,
  };
}

/** Helper: infiere config desde entrada catálogo SSW (mapea tipos SSW → keys Ayudas). */
export function configFromCatalog(catalog: {
  tons: number;
  walkMP: number;
  structure?: string;
  armor?: { type: string };
  engine?: { type: string };
  heatSinks?: { type: 'Single' | 'Double' };
  jumpMP?: number;
}): MechRepairConfig {
  const struct = (catalog.structure || 'Standard').toLowerCase();
  let estructuraType = 'Estandar';
  if (struct.includes('endo'))       estructuraType = 'EndoAcero';
  else if (struct.includes('industrial')) estructuraType = 'Industrial';
  else if (struct.includes('enviro'))     estructuraType = 'Enviro';

  const armorType = (catalog.armor?.type || 'Standard').toLowerCase();
  let blindajeType = 'Estandar';
  if      (armorType.includes('stealth'))                                    blindajeType = 'Stealth';
  else if (armorType.includes('ferro') && armorType.includes('lig'))         blindajeType = 'Ferro Fibroso Ligero';
  else if (armorType.includes('ferro') && armorType.includes('pesado'))      blindajeType = 'Ferro Fibroso Pesado';
  else if (armorType.includes('ferro'))                                       blindajeType = 'Ferro Fibroso';
  else if (armorType.includes('industrial') && armorType.includes('pesado')) blindajeType = 'Industrial Pesado';
  else if (armorType.includes('industrial'))                                  blindajeType = 'Industrial';
  else if (armorType.includes('comercial') || armorType.includes('commerc')) blindajeType = 'Comercial';

  const engineType = (catalog.engine?.type || 'Fusion').toLowerCase();
  let reactorType = 'Fusion';
  if      (engineType.includes('xl'))       reactorType = 'XL';
  else if (engineType.includes('lig') || engineType.includes('light'))  reactorType = 'Ligero';
  else if (engineType.includes('compact'))  reactorType = 'Compacto';
  else if (engineType.includes('ice') || engineType.includes('combust')) reactorType = 'ICE';
  else if (engineType.includes('celul') || engineType.includes('cell')) reactorType = 'Celulas';
  else if (engineType.includes('fision') || engineType.includes('fission')) reactorType = 'Fision';

  const radType = catalog.heatSinks?.type === 'Double' ? 'Dobles' : 'Normales';
  const retroType = (catalog.jumpMP ?? 0) > 0 ? 'Estandar' : 'Estandar';

  return {
    tons:           catalog.tons,
    walkMP:         catalog.walkMP,
    reactorType,
    gyroType:       'Estandar',
    miomeroType:    'Estandar',
    estructuraType,
    retroType,
    radType,
    blindajeType,
  };
}

// ── Derivar daños desde sesión simulador ──────────────────────

import type { MechState, MechSession, CritSlot } from './combat-types';

/** Mapea slot.name del simulador → componente de reparación.
 *  Nombres literales de parsers.ts (SSW/MTF output). */
function mapCritToRepair(
  slotName: string,
  out: {
    reactor: number; gyro: number; cabinaDañada: boolean;
    soporteVida: number; sensores: number; radiadores: number;
    retros: number; actuadores: MechRepairDamage['actuadores'];
  },
) {
  const n = slotName;
  if (!n || n === '-') return;
  if (n === 'Fusion Engine')                                       { out.reactor = Math.min(3, out.reactor + 1); }
  else if (n === 'Gyro')                                           { out.gyro    = Math.min(2, out.gyro + 1); }
  else if (n === 'Cockpit')                                        { out.cabinaDañada = true; }
  else if (n === 'Life Support')                                   { out.soporteVida++; }
  else if (n === 'Sensors')                                        { out.sensores++; }
  else if (n === 'Heat Sink' || n === 'Double Heat Sink')         { out.radiadores++; }
  else if (n === 'Jump Jet')                                       { out.retros++; }
  else if (n === 'Shoulder')                                       { out.actuadores['Hombro'] = (out.actuadores['Hombro'] ?? 0) + 1; }
  else if (n === 'Upper Arm Actuator' || n === 'Lower Arm Actuator') { out.actuadores['Codo'] = (out.actuadores['Codo'] ?? 0) + 1; }
  else if (n === 'Hand Actuator')                                  { out.actuadores['Mano']   = (out.actuadores['Mano']   ?? 0) + 1; }
  else if (n === 'Hip')                                            { out.actuadores['Cadera'] = (out.actuadores['Cadera'] ?? 0) + 1; }
  else if (n === 'Upper Leg Actuator' || n === 'Lower Leg Actuator') { out.actuadores['Rodilla'] = (out.actuadores['Rodilla'] ?? 0) + 1; }
  else if (n === 'Foot Actuator')                                  { out.actuadores['Tobillo'] = (out.actuadores['Tobillo'] ?? 0) + 1; }
}

/**
 * Extrae MechRepairDamage desde el delta estado/sesión del simulador.
 *
 * - Blindaje perdido = Σ(state.armor[loc] − session.armor[loc])
 * - Estructura perdida = Σ(state.is[loc] − session.is[loc])
 * - Crits: recorre session.crits, mapea slots hit=true → componentes
 * - pctDañoTotal = (pts perdidos) / (pts máximos) × 100
 */
export function deriveDamageFromSession(
  state: MechState,
  session: MechSession,
): { damage: MechRepairDamage; pctDañoTotal: number } {
  // Armor delta
  const armorLocs = ['HD','CTf','CTr','LTf','LTr','RTf','RTr','LA','RA','LL','RL'] as const;
  let armorMax = 0, armorCur = 0;
  for (const k of armorLocs) {
    armorMax += (state.armor  as Record<string,number>)[k] ?? 0;
    armorCur += (session.armor as Record<string,number>)[k] ?? 0;
  }
  const armorLost = Math.max(0, armorMax - armorCur);

  // IS delta
  const isLocs = ['HD','CT','LT','RT','LA','RA','LL','RL'] as const;
  let isMax = 0, isCur = 0;
  for (const k of isLocs) {
    isMax += (state.is   as Record<string,number>)[k] ?? 0;
    isCur += (session.is as Record<string,number>)[k] ?? 0;
  }
  const isLost = Math.max(0, isMax - isCur);

  const totalMax  = armorMax + isMax;
  const totalLost = armorLost + isLost;
  const pctDañoTotal = totalMax > 0 ? Math.round((totalLost / totalMax) * 100) : 0;

  // Crit scan
  const critOut = {
    reactor: 0, gyro: 0, cabinaDañada: false,
    soporteVida: 0, sensores: 0, radiadores: 0,
    retros: 0, actuadores: {} as MechRepairDamage['actuadores'],
  };
  for (const slots of Object.values(session.crits ?? {})) {
    for (const slot of slots as CritSlot[]) {
      if (slot?.hit) mapCritToRepair(slot.name, critOut);
    }
  }

  return {
    damage: {
      ...critOut,
      estructura: isLost,
      blindaje:   armorLost,
      miomero:    0,   // no hay slot nombrado en crits para miomero
      armas:      [],
      municion:   0,
    },
    pctDañoTotal,
  };
}

export function emptyDamage(): MechRepairDamage {
  return {
    reactor: 0, gyro: 0, cabinaDañada: false, soporteVida: 0, sensores: 0,
    estructura: 0, blindaje: 0, miomero: 0,
    retros: 0, radiadores: 0,
    actuadores: {},
    armas: [],
    municion: 0,
  };
}

/** Color etiqueta visual estado mech. */
export const ESTADO_COLOR: Record<EstadoMech, string> = {
  'OPERATIVO': '#4ade80', // verde
  'LEVES':     '#bdf4ff', // azul claro
  'MEDIOS':    '#ffd79b', // ámbar
  'MODERADOS': '#fbbf24', // amarillo
  'GRAVES':    '#ef4444', // rojo
  'CRITICOS':  '#dc2626', // rojo oscuro
  'DESTRUIDO': '#7a1620', // sangre
};
