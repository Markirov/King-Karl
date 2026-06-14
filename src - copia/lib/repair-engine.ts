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
  /** Engine rating (= walkMP × tons en mechs). Necesario para canon gyro tons. */
  engineRating?:  number;
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
  /** Armas dañadas/destruidas. `cost` editable por usuario; status informativo. */
  armas?:       { name: string; cost: number; status?: 'parcial' | 'destruida'; loc?: string; slotsHit?: number; slotsTotal?: number }[];
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
  engine?: { rating?: number; type: string };
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
    engineRating:   catalog.engine?.rating ?? catalog.walkMP * catalog.tons,
    reactorType,
    gyroType:       'Estandar',
    miomeroType:    'Estandar',
    estructuraType,
    retroType,
    radType,
    blindajeType,
  };
}

// ── Precios munición canon (Tech Manual ₡/ton) ────────────────
// Lookup por substring del campo family de AmmoBin.
// Si no encuentra match, devuelve 5000 (fallback genérico).

export const PRECIO_MUNICION_PER_TON: { match: RegExp; price: number }[] = [
  // Arrow IV
  { match: /Arrow\s*IV|Arrow\s*4/i,  price: 15_000 },
  // Gauss family
  { match: /Heavy\s*Gauss/i,         price: 20_000 },
  { match: /Light\s*Gauss/i,         price: 20_000 },
  { match: /Gauss/i,                 price: 20_000 },
  // LB-X (solid; cluster en LB5=15k, LB10=20k si usuario edita)
  { match: /LB[- ]?2[- ]?X|LB.*\b2\b/i,  price:  2_000 },
  { match: /LB[- ]?5[- ]?X|LB.*\b5\b/i,  price:  9_000 },
  { match: /LB[- ]?10[- ]?X|LB.*\b10\b/i, price: 12_000 },
  { match: /LB[- ]?20[- ]?X|LB.*\b20\b/i, price: 24_000 },
  // Ultra AC
  { match: /Ultra\s*AC[- ]?2|UAC[- ]?2/i,  price:  1_000 },
  { match: /Ultra\s*AC[- ]?5|UAC[- ]?5/i,  price:  9_000 },
  { match: /Ultra\s*AC[- ]?10|UAC[- ]?10/i, price: 12_000 },
  { match: /Ultra\s*AC[- ]?20|UAC[- ]?20/i, price: 20_000 },
  // AC variants (estandar)
  { match: /AC\s*\/?\s*2\b/i,        price:  1_000 },
  { match: /AC\s*\/?\s*5\b/i,        price:  4_500 },
  { match: /AC\s*\/?\s*10\b/i,       price:  6_000 },
  { match: /AC\s*\/?\s*20\b/i,       price: 10_000 },
  // LRM (todas mismo precio/ton)
  { match: /LRM/i,                   price: 30_000 },
  // Streak SRM (más caro que SRM estándar)
  { match: /Streak\s*SRM/i,          price: 54_000 },
  { match: /SRM/i,                   price: 27_000 },
  // MG family
  { match: /Heavy\s*Machine\s*Gun|HMG/i, price: 1_000 },
  { match: /Light\s*Machine\s*Gun|LMG/i, price: 500 },
  { match: /Machine\s*Gun|MG/i,      price:  1_000 },
  // Misiles long range etc.
  { match: /MRM/i,                   price: 30_000 },
  { match: /ATM/i,                   price: 75_000 },
  // Flamer (vehicle flamer ammo)
  { match: /Flamer/i,                price:  6_000 },
];

/** Precio ₡/ton lookup por nombre familia. Fallback 5000. */
export function ammoPricePerTon(family: string): number {
  for (const { match, price } of PRECIO_MUNICION_PER_TON) {
    if (match.test(family)) return price;
  }
  return 5_000;
}

// ── Derivar daños desde sesión simulador ──────────────────────

import type { MechState, MechSession, CritSlot, AmmoBin } from './combat-types';
import { weaponPriceFromName, lbxKeyFromAmmoFamily, LBX_CLUSTER_AMMO_COST } from './weapon-prices';

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

export interface MunicionDetalleEntry {
  family:        string;
  spent:         number;
  tons:          number;
  cost:          number;
  /** Codigo LB-X (LBX5/LBX10/...) si es LB-X y tiene precio cluster disponible. */
  lbxKey?:       string;
  /** 'slug' (solido, default) | 'cluster' (postas, mas caro). Solo aplica a LB-X. */
  ammoType?:     'slug' | 'cluster';
  /** Precio/ton solido — para recalcular al togglear. */
  slugPrice?:    number;
  /** Precio/ton cluster — solo si LBX_CLUSTER_AMMO_COST tiene entrada. */
  clusterPrice?: number;
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
): {
  damage: MechRepairDamage;
  pctDañoTotal: number;
  municionDetalle: MunicionDetalleEntry[];
} {
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

  // Weapons hit scan — recorre state.weapons, cuenta slots con hit en cada arma
  const armasOut: NonNullable<MechRepairDamage['armas']> = [];
  for (const w of (state.weapons ?? [])) {
    const slotsLoc = (session.crits ?? {})[w.loc] as CritSlot[] | undefined;
    if (!slotsLoc) continue;
    let hits = 0;
    for (const idx of (w.slotIndices ?? [])) {
      if (slotsLoc[idx]?.hit) hits++;
    }
    if (hits <= 0) continue;
    const total = (w.slotIndices?.length ?? w.slotsUsed ?? 1);
    const status: 'parcial' | 'destruida' = hits >= total ? 'destruida' : 'parcial';
    const base = weaponPriceFromName(w.name || w.rawName || '', state.tonnage);
    // Parcial = repair ~50% del precio. Destruida = reemplazo completo.
    const cost = status === 'destruida' ? base : Math.round(base * 0.5);
    armasOut.push({
      name:       w.name || w.rawName || 'Arma',
      cost,
      status,
      loc:        w.loc,
      slotsHit:   hits,
      slotsTotal: total,
    });
  }

  // Munición consumida: por cada bin, spent = max - current,
  // coste = ceil(spent / perTon) × precio/ton (compras por tonelada)
  let municionCost = 0;
  const municionDetalle: MunicionDetalleEntry[] = [];
  for (const bin of (session.ammoBins ?? []) as AmmoBin[]) {
    const spent = Math.max(0, (bin.max ?? 0) - (bin.current ?? 0));
    if (spent <= 0 || !bin.perTon) continue;
    const tons      = Math.ceil(spent / bin.perTon);
    const slugPrice = ammoPricePerTon(bin.family || '');
    const lbxKey    = lbxKeyFromAmmoFamily(bin.family || '');
    const clusterPrice = lbxKey ? LBX_CLUSTER_AMMO_COST[lbxKey] : undefined;
    // Default = slug (mas barato). Usuario togglea a cluster en UI si gasto postas.
    const price    = slugPrice;
    const cost     = tons * price;
    municionCost += cost;
    municionDetalle.push({
      family: bin.family, spent, tons, cost,
      lbxKey:       lbxKey ?? undefined,
      ammoType:     lbxKey && clusterPrice ? 'slug' : undefined,
      slugPrice:    lbxKey && clusterPrice ? slugPrice : undefined,
      clusterPrice: clusterPrice,
    });
  }

  return {
    damage: {
      ...critOut,
      estructura: isLost,
      blindaje:   armorLost,
      miomero:    0,   // no hay slot nombrado en crits para miomero
      armas:      armasOut,
      municion:   municionCost,
    },
    pctDañoTotal,
    municionDetalle,
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

// ══════════════════════════════════════════════════════════════
//  CANON CAMOPS — Reglas canónicas Campaign Operations p.205-210
//  Sólo reemplazo de pieza cuesta ₡; daño parcial = 0 ₡ (sólo labor)
//  Precios componente desde TechManual (TM)
// ══════════════════════════════════════════════════════════════

export type RepairSystem = 'propio' | 'canon';

/** Calcula gyro tons canon: ceil(engineRating/100), modificado por tipo gyro. */
function canonGyroTons(engineRating: number, gyroType: string): number {
  const base = Math.ceil(engineRating / 100);
  switch (gyroType) {
    case 'XL':       return Math.ceil(base / 2);  // XL gyro pesa la mitad
    case 'Compacto': return Math.ceil(base * 1.5);
    case 'Pesado':   return base * 2;
    default:         return base; // Estandar
  }
}


/**
 * Factura canon (CamOps): sólo se carga el precio total de la pieza
 * cuando está destruida. Daño parcial (1-2 crits sin destrucción)
 * cuesta 0 ₡ — sólo labor time (no se modela aquí).
 */
export function calcRepairCostCanon(
  config: MechRepairConfig,
  damage: MechRepairDamage,
  estadoFactPct = 100,
  pctDañoTotal = 0,
): RepairBreakdown {
  const peso   = config.tons;
  const rating = config.engineRating ?? (config.walkMP * peso);

  // === Reactor (TM) ===
  // Precio = base × rating × tons / 75. Sólo si destruido (3 crits).
  const reactorBase = PRECIO_REACTOR[config.reactorType] ?? PRECIO_REACTOR['Fusion'];
  const destruido = damage.reactor >= 3;
  const reactor = destruido ? Math.round((reactorBase * rating * peso) / 75) : 0;

  // === Gyro (TM) === gyro_tons × precio_base. Sólo si gyro=2 (destruido)
  const gyroBase  = PRECIO_GYRO_BASE[config.gyroType] ?? PRECIO_GYRO_BASE['Estandar'];
  const gyroTons  = canonGyroTons(rating, config.gyroType);
  const gyro = damage.gyro >= 2 ? gyroTons * gyroBase : 0;

  // === Cabina === flat 200k binario
  const cabina = damage.cabinaDañada ? PRECIO_CABINA : 0;

  // === Soporte Vital === flat 50k (sólo hay 1 ud por mech en canon)
  const soporteVida = damage.soporteVida > 0 ? PRECIO_SOPORTE_VIDA : 0;

  // === Sensores === 2000 × tons (sólo 1 conjunto por mech)
  const sensores = damage.sensores > 0 ? PRECIO_SENSORES_BASE * peso : 0;

  // === Estructura === TM p.557: PRECIO_ESTRUCTURA × Unit Tonnage para
  // reemplazo total. Pts perdidos / IS_total × cost para parcial.
  const estructuraBase = PRECIO_ESTRUCTURA[config.estructuraType] ?? PRECIO_ESTRUCTURA['Estandar'];
  const isTotalPts = peso * 2.5; // aprox IS total ~ 2.5 pts/ton
  const estructura = damage.estructura > 0
    ? Math.round((estructuraBase * peso * damage.estructura) / isTotalPts)
    : 0;

  // === Blindaje === ceil(pts/16) × precio_ton (idéntico a propio)
  const blindajeBase = PRECIO_BLINDAJE[config.blindajeType] ?? PRECIO_BLINDAJE['Estandar'];
  const blindaje = blindajeBase * Math.ceil(damage.blindaje / 16);

  // === Miomero === En canon no se reemplaza por uds; sólo si triple-strength
  // se considera componente premium. Tratamos como flat 0 si Estandar.
  const miomero = config.miomeroType !== 'Estandar' && damage.miomero > 0
    ? (PRECIO_MIOMERO[config.miomeroType] ?? 0) * peso
    : 0;

  // === Actuadores === TM p.557: precio_base × Unit Tonnage × qty.
  // Hombro 100 / Codo 50 / Mano 80 / Cadera 150 / Rodilla 80 / Tobillo 120 (per ton).
  const actuadores = Object.entries(damage.actuadores ?? {}).reduce((sum, [name, qty]) => {
    const pricePerTon = PRECIO_ACTUADOR[name as keyof typeof PRECIO_ACTUADOR] ?? 0;
    return sum + pricePerTon * peso * (qty ?? 0);
  }, 0);

  // === Retros === Canon: precio × uds (sin peso)
  const retroBase = PRECIO_RETROS[config.retroType] ?? PRECIO_RETROS['Estandar'];
  const retros = retroBase * damage.retros;

  // === Radiadores === Canon TM: 2000 single / 6000 double cada uno
  const radBase = PRECIO_RADIADORES[config.radType] ?? PRECIO_RADIADORES['Normales'];
  const radiadores = radBase * damage.radiadores;

  const armas    = (damage.armas ?? []).reduce((s, w) => s + (w.cost || 0), 0);
  const municion = damage.municion ?? 0;

  const subtotal =
    reactor + gyro + cabina + soporteVida + sensores +
    estructura + blindaje + miomero +
    actuadores + retros + radiadores +
    armas + municion;

  // Estado factura: % modificador (default 100). Permite cargos/descuentos.
  const total = Math.round(subtotal * (estadoFactPct / 100));

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

/** Dispatch: elige fórmula propia o canon según `system`. */
export function calcRepairCostBySystem(
  system: RepairSystem,
  config: MechRepairConfig,
  damage: MechRepairDamage,
  estadoFactPct = 100,
  pctDañoTotal = 0,
): RepairBreakdown {
  return system === 'canon'
    ? calcRepairCostCanon(config, damage, estadoFactPct, pctDañoTotal)
    : calcRepairCost(config, damage, estadoFactPct, pctDañoTotal);
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
