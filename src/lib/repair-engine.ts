// ══════════════════════════════════════════════════════════════
//  REPAIR ENGINE — Port TS de Sheets `Taller` + tablas `Ayudas`
//  Calcula factura reparación mech con desglose componente.
//
//  Fuentes:
//   - Sheets Ayudas BW2:BX60 (precios componentes)
//   - Sheets Ayudas AA1:AA31 (modificador estado % factura)
//   - Sheets Taller (fórmulas referencia)
//   - INFORME_COSTES.md sección 3
// ══════════════════════════════════════════════════════════════

// ── Precios componentes (Ayudas BW:BX) ────────────────────

export const PRECIO_CABINA       = 200_000;
export const PRECIO_SOPORTE_VIDA =  50_000;
export const PRECIO_SENSORES_BASE =  2_000; // × peso/2

export const PRECIO_REACTOR: Record<string, number> = {
  'Fusion':            5_000,
  'Ligero':            1_500,
  'XL':               20_000,
  'Compacto':         10_000,
  'ICE':               1_250,
  'Celulas':           3_500,
  'Fision':            7_500,
};

export const PRECIO_GYRO: Record<string, number> = {
  'Estandar':            300,
  'Compacto':            450,
  'Pesado':              500,
  'XL':                  750,
};

export const PRECIO_MIOMERO: Record<string, number> = {
  'Estandar':           2_000,
  'Triple Fuerza':     16_000,
  'Triple Fuerza Industrial': 12_000,
};

export const PRECIO_ESTRUCTURA: Record<string, number> = {
  'Estandar':              400,
  'EndoAcero':           1_600,
  'Industrial':            330,
  'Enviro':                225,
};

export const PRECIO_ACTUADOR: Record<string, number> = {
  'Hombro':              100,
  'Codo':                 50,
  'Mano':                 80,
  'Cadera':              150,
  'Rodilla':              80,
  'Pie':                 120,
};

export const PRECIO_RETROS: Record<string, number> = {
  'Estandar':            200,
  'Mejorados':           500,
  'MASC':              1_000,
};

export const PRECIO_RADIADORES: Record<string, number> = {
  'Internos +10':      2_000,
  'Normales':          2_000,
  'Dobles':            6_000,
};

export const PRECIO_BLINDAJE: Record<string, number> = {
  'Comercial':         3_000,
  'Industrial':        5_000,
  'Estandar':         10_000,
  'Industrial Pesado': 10_000,
  'Ferro Fibroso Ligero': 15_000,
  'Ferro Fibroso':    20_000,
  'Ferro Fibroso Pesado': 25_000,
  'Stealth':          50_000,
};

// ── Modificadores estado (Ayudas AA1:AA31) ────────────────
// Multiplicador sobre factura total según estado mantenimiento.
export const ESTADO_FACTURA = [
  150, 145, 140, 135, 130, 125, 120, 115, 110, 105,
  100, 95, 90, 85, 80, 75, 70, 65, 60, 55,
  50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0,
] as const;

// ── Tipos ─────────────────────────────────────────────────

export type EstadoComponente = 'ok' | 'damaged' | 'destroyed';

export interface MechRepairConfig {
  /** Peso en toneladas. Afecta cálculo sensores + heatsinks. */
  tons:        number;
  /** Caminar MP (afecta cálculo reactor). */
  walkMP:      number;
  reactorType:    keyof typeof PRECIO_REACTOR  | string;
  gyroType:       keyof typeof PRECIO_GYRO     | string;
  miomeroType:    keyof typeof PRECIO_MIOMERO  | string;
  estructuraType: keyof typeof PRECIO_ESTRUCTURA | string;
  retroType:      keyof typeof PRECIO_RETROS   | string;
  radType:        keyof typeof PRECIO_RADIADORES | string;
  blindajeType:   keyof typeof PRECIO_BLINDAJE | string;
  /** Toneladas blindaje totales (afecta cálculo). */
  blindajeTons:   number;
}

export interface MechRepairDamage {
  reactor:      number; // 0 OK, 1-2 dañado, 3 destruido
  gyro:         number; // 0 OK, 1 dañado, 2 destruido
  cabina:       number; // 0 / 1
  soporteVida:  number; // 0 / 1
  sensores:     number; // 0 / 1 / 2
  estructura:   number; // puntos perdidos (0-N)
  blindaje:     number; // puntos perdidos (0-N)
  miomero:      number; // 0 / 1 / 2
  retros:       number; // % retros dañados
  radiadores:   number; // num radiadores dañados
  /** Actuadores afectados por nombre. */
  actuadores:   { [k in keyof typeof PRECIO_ACTUADOR]?: number };
  /** Armas con id+precio reparación (usuario rellena vs catálogo). */
  armas?:       { name: string; cost: number }[];
  /** Munición consumida (cost). */
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
  /** Multiplicador estado (0-150%). */
  estadoPct:   number;
  total:       number;
}

// ── Calculadora ───────────────────────────────────────────

/** Calcula factura completa reparación.
 *
 *  Fórmulas portadas del Taller Sheets (Ayudas BW:BX × estado AA1:AA31).
 *  Estado 100% (AA11) = factura completa. Estado 0% (AA31) = no cobra.
 */
export function calcRepairCost(
  config: MechRepairConfig,
  damage: MechRepairDamage,
  estadoPct = 100,
): RepairBreakdown {
  // Reactor: precio × (peso/100) × dañoMultiplier
  const reactorBase  = PRECIO_REACTOR[config.reactorType] ?? PRECIO_REACTOR['Fusion'];
  const reactor = damage.reactor > 0
    ? Math.round(reactorBase * (config.tons / 100) * (damage.reactor === 3 ? 1.0 : damage.reactor * 0.4))
    : 0;

  // Gyro: precio × ROUNDUP(peso/100) × dañoMultiplier
  const gyroBase = PRECIO_GYRO[config.gyroType] ?? PRECIO_GYRO['Estandar'];
  const gyro = damage.gyro > 0
    ? Math.round(gyroBase * Math.ceil(config.tons / 100) * (damage.gyro === 2 ? 1.0 : 0.5))
    : 0;

  // Cabina: precio fijo si dañada
  const cabina = damage.cabina > 0 ? PRECIO_CABINA : 0;

  // Soporte Vida: precio fijo
  const soporteVida = damage.soporteVida > 0 ? PRECIO_SOPORTE_VIDA : 0;

  // Sensores: precio × peso/2 si dañado
  const sensores = damage.sensores > 0
    ? Math.round(PRECIO_SENSORES_BASE * (config.tons / 2) * (damage.sensores === 2 ? 1.0 : 0.5))
    : 0;

  // Estructura: precio × puntos perdidos
  const estructuraBase = PRECIO_ESTRUCTURA[config.estructuraType] ?? PRECIO_ESTRUCTURA['Estandar'];
  const estructura = estructuraBase * damage.estructura;

  // Blindaje: precio × puntos perdidos
  const blindajeBase = PRECIO_BLINDAJE[config.blindajeType] ?? PRECIO_BLINDAJE['Estandar'];
  const blindaje = blindajeBase * damage.blindaje;

  // Miomero: precio × peso × dañoMultiplier
  const miomeroBase = PRECIO_MIOMERO[config.miomeroType] ?? PRECIO_MIOMERO['Estandar'];
  const miomero = damage.miomero > 0
    ? Math.round(miomeroBase * config.tons * (damage.miomero === 2 ? 1.0 : 0.5))
    : 0;

  // Actuadores: suma precios componentes afectados × cantidad
  const actuadores = Object.entries(damage.actuadores ?? {}).reduce((sum, [name, qty]) => {
    const price = PRECIO_ACTUADOR[name as keyof typeof PRECIO_ACTUADOR] ?? 0;
    return sum + price * (qty ?? 0);
  }, 0);

  // Retros: precio × peso × % dañados (0-100)
  const retroBase = PRECIO_RETROS[config.retroType] ?? PRECIO_RETROS['Estandar'];
  const retros = damage.retros > 0
    ? Math.round(retroBase * config.tons * (damage.retros / 100))
    : 0;

  // Radiadores: precio × cantidad dañada
  const radBase = PRECIO_RADIADORES[config.radType] ?? PRECIO_RADIADORES['Normales'];
  const radiadores = radBase * damage.radiadores;

  // Armas: suma cost del array
  const armas = (damage.armas ?? []).reduce((s, w) => s + (w.cost || 0), 0);

  // Munición: directo
  const municion = damage.municion ?? 0;

  const subtotal =
    reactor + gyro + cabina + soporteVida + sensores +
    estructura + blindaje + miomero +
    actuadores + retros + radiadores +
    armas + municion;

  const total = Math.round(subtotal * (estadoPct / 100));

  return {
    reactor, gyro, cabina, soporteVida, sensores,
    estructura, blindaje, miomero,
    actuadores, retros, radiadores,
    armas, municion,
    subtotal, estadoPct, total,
  };
}

/** Helper para inferir config desde entrada catálogo SSW. */
export function configFromCatalog(catalog: {
  tons: number;
  walkMP: number;
  structure?: string;
  armor?: { type: string };
  engine?: { type: string };
  heatSinks?: { type: 'Single' | 'Double' };
  jumpMP?: number;
  blindajeTons?: number;
}): MechRepairConfig {
  // Map structure SSW → keys precio
  const struct = (catalog.structure || 'Standard').toLowerCase();
  let estructuraType: string = 'Estandar';
  if (struct.includes('endo')) estructuraType = 'EndoAcero';
  else if (struct.includes('industrial')) estructuraType = 'Industrial';
  else if (struct.includes('enviro')) estructuraType = 'Enviro';

  const armorType = (catalog.armor?.type || 'Standard').toLowerCase();
  let blindajeType: string = 'Estandar';
  if (armorType.includes('stealth')) blindajeType = 'Stealth';
  else if (armorType.includes('ferro') && armorType.includes('ligero')) blindajeType = 'Ferro Fibroso Ligero';
  else if (armorType.includes('ferro') && armorType.includes('pesado')) blindajeType = 'Ferro Fibroso Pesado';
  else if (armorType.includes('ferro')) blindajeType = 'Ferro Fibroso';
  else if (armorType.includes('industrial') && armorType.includes('pesado')) blindajeType = 'Industrial Pesado';
  else if (armorType.includes('industrial')) blindajeType = 'Industrial';
  else if (armorType.includes('comercial') || armorType.includes('commercial')) blindajeType = 'Comercial';

  const engineType = (catalog.engine?.type || 'Fusion').toLowerCase();
  let reactorType: string = 'Fusion';
  if (engineType.includes('xl')) reactorType = 'XL';
  else if (engineType.includes('ligero') || engineType.includes('light')) reactorType = 'Ligero';
  else if (engineType.includes('compacto') || engineType.includes('compact')) reactorType = 'Compacto';
  else if (engineType.includes('ice') || engineType.includes('combust')) reactorType = 'ICE';
  else if (engineType.includes('celulas') || engineType.includes('fuel cell')) reactorType = 'Celulas';
  else if (engineType.includes('fision') || engineType.includes('fission')) reactorType = 'Fision';

  const radType = catalog.heatSinks?.type === 'Double' ? 'Dobles' : 'Normales';

  return {
    tons:           catalog.tons,
    walkMP:         catalog.walkMP,
    reactorType,
    gyroType:       'Estandar',
    miomeroType:    'Estandar',
    estructuraType,
    retroType:      catalog.jumpMP && catalog.jumpMP > 0 ? 'Estandar' : 'Estandar',
    radType,
    blindajeType,
    blindajeTons:   catalog.blindajeTons ?? 0,
  };
}

/** Construye damage vacío (todo OK). */
export function emptyDamage(): MechRepairDamage {
  return {
    reactor: 0, gyro: 0, cabina: 0, soporteVida: 0, sensores: 0,
    estructura: 0, blindaje: 0, miomero: 0,
    retros: 0, radiadores: 0,
    actuadores: {},
    armas: [],
    municion: 0,
  };
}
