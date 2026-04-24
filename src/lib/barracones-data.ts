// ══════════════════════════════════════════════════════
//  BARRACONES — Datos estáticos
// ══════════════════════════════════════════════════════

// ── XP: Coste para subir atributo al valor destino ──
// (coste TOTAL acumulado desde 6)
export const ATTR_XP_COST: Record<number, Record<string, number>> = {
  6:  { fue: 0,     des: 0,     int: 0,     car: 0     },
  7:  { fue: 1000,  des: 1500,  int: 2000,  car: 1000  },
  8:  { fue: 3000,  des: 4500,  int: 6000,  car: 3000  },
  9:  { fue: 7000,  des: 9500,  int: 12000, car: 7000  },
  10: { fue: 15000, des: 19500, int: 24500, car: 15000 },
  11: { fue: 30000, des: 39500, int: 49500, car: 30000 },
  12: { fue: 60000, des: 79500, int: 99500, car: 60000 },
};

// Coste marginal de subir 1 punto (de X-1 a X)
export function attrUpgradeCost(attr: string, from: number): number {
  const costFrom = ATTR_XP_COST[from]?.[attr] ?? 0;
  const costTo   = ATTR_XP_COST[from + 1]?.[attr] ?? 0;
  return costTo - costFrom;
}

// ── XP: Coste de subir habilidad al nivel destino ──
// (coste TOTAL acumulado desde 0)
export const SKILL_XP_COST: Record<number, number> = {
  0: 0, 1: 750, 2: 1750, 3: 2500, 4: 3500,
  5: 5000, 6: 7000, 7: 10000, 8: 14000, 9: 19000,
};

// Coste marginal de subir 1 nivel
export function skillUpgradeCost(from: number): number {
  return (SKILL_XP_COST[from + 1] ?? 0) - (SKILL_XP_COST[from] ?? 0);
}

// ── Veteranía ──
export const VETERANCY = [
  { min: 0,      max: 5000,    nombre: 'Novato',   color: 'text-secondary',          upgrades: 0 },
  { min: 5001,   max: 30000,   nombre: 'Regular',  color: 'text-on-surface-variant', upgrades: 1 },
  { min: 30001,  max: 65000,   nombre: 'Veterano', color: 'text-primary-container',upgrades: 2 },
  { min: 65001,  max: 100000,  nombre: 'Elite',    color: 'text-amber-400',        upgrades: 3 },
  { min: 100001, max: Infinity, nombre: 'As',      color: 'text-error',            upgrades: 4 },
] as const;

export function getVeterancy(xpTotal: number) {
  return VETERANCY.find(v => xpTotal >= v.min && xpTotal <= v.max) ?? VETERANCY[0];
}

// ── Lista de habilidades disponibles con atributo vinculado ──
export interface SkillDef { nombre: string; attr: 'fue' | 'des' | 'int' | 'car' }

export const SKILLS_CATALOG: SkillDef[] = [
  { nombre: 'Admin. de Feudo',    attr: 'car' },
  { nombre: 'Arco',               attr: 'des' },
  { nombre: 'Armas Arrojadizas',  attr: 'des' },
  { nombre: 'Armas de Apoyo',     attr: 'des' },
  { nombre: 'Armas Pequeñas',     attr: 'des' },
  { nombre: 'Artillería',         attr: 'des' },
  { nombre: 'Astronavegación',    attr: 'int' },
  { nombre: 'Comercio',           attr: 'car' },
  { nombre: 'Demoliciones',       attr: 'int' },
  { nombre: 'Diplomacia',         attr: 'car' },
  { nombre: 'Disparo Mech',       attr: 'des' },
  { nombre: 'Equitación',         attr: 'des' },
  { nombre: 'Espada',             attr: 'des' },
  { nombre: 'Etiqueta',           attr: 'car' },
  { nombre: 'Falsificación',      attr: 'int' },
  { nombre: 'Física',             attr: 'int' },
  { nombre: 'Furtividad',         attr: 'des' },
  { nombre: 'Historia',           attr: 'int' },
  { nombre: 'Hurto',              attr: 'des' },
  { nombre: 'Idioma',             attr: 'int' },
  { nombre: 'Informática',        attr: 'int' },
  { nombre: 'Ingeniería',         attr: 'int' },
  { nombre: 'Interrogatorio',     attr: 'car' },
  { nombre: 'Intimidación',       attr: 'car' },
  { nombre: 'Investigación',      attr: 'int' },
  { nombre: 'Liderazgo',          attr: 'car' },
  { nombre: 'Matemáticas',        attr: 'int' },
  { nombre: 'Mecánica',           attr: 'int' },
  { nombre: 'Medicina',           attr: 'int' },
  { nombre: 'Navegación',         attr: 'int' },
  { nombre: 'Negociación',        attr: 'car' },
  { nombre: 'Pelea',              attr: 'fue' },
  { nombre: 'Orientación',        attr: 'int' },
  { nombre: 'Percepción',         attr: 'int' },
  { nombre: 'Persuasión',         attr: 'car' },
  { nombre: 'Pilotar Aeronave',   attr: 'des' },
  { nombre: 'Pilotar Mech',       attr: 'des' },
  { nombre: 'Pilotar Vehículo',   attr: 'des' },
  { nombre: 'Pistola',            attr: 'des' },
  { nombre: 'Primeros Auxilios',  attr: 'int' },
  { nombre: 'Rastreo',            attr: 'int' },
  { nombre: 'Rifle',              attr: 'des' },
  { nombre: 'Supervivencia',      attr: 'fue' },
  { nombre: 'Tácticas',           attr: 'int' },
  { nombre: 'Técnica Mech',       attr: 'int' },
];

// ── HP por atributo FUE ──
export interface HpByLoc { loc: string; label: string; max: number }

export function calcHp(fue: number): HpByLoc[] {
  return [
    { loc: 'cabeza',    label: 'Cabeza',        max: fue },
    { loc: 'torso',     label: 'Torso',         max: fue * 3 },
    { loc: 'brazoIzq',  label: 'Brazo Izq.',    max: Math.floor(fue * 2) },
    { loc: 'brazoDer',  label: 'Brazo Der.',    max: Math.floor(fue * 2) },
    { loc: 'piernaIzq', label: 'Pierna Izq.',   max: Math.ceil(fue * 2) },
    { loc: 'piernaDer', label: 'Pierna Der.',   max: Math.ceil(fue * 2) },
  ];
}

// ── TIR (Tirada objetivo de habilidad) ──
// TIR = round((FUE + DES + INT + CAR) / 4) - nivel  ← usa promedio de los 4 atributos
export function calcAttrAvg(fue: number, des: number, int: number, car: number): number {
  return Math.round((fue + des + int + car) / 4);
}

export function calcTIR(attrAvg: number, skillLevel: number): number {
  return attrAvg - skillLevel;
}

export const ATTR_LABELS: Record<string, string> = {
  fue: 'FUE', des: 'DES', int: 'INT', car: 'CAR',
};

// ── Armaduras de infantería (del HTML original) ──
// value = "Nombre|Zonas cubiertas|Bonus"
export interface ArmorDef { nombre: string; zonas: string; bonus: number }

export const ARMOR_TABLE: ArmorDef[] = [
  { nombre: 'Casco',            zonas: 'Cabeza',                       bonus: 10 },
  { nombre: 'Chaleco',          zonas: 'Torso',                        bonus: 20 },
  { nombre: 'Armadura',         zonas: 'Torso, Brazos, Piernas',       bonus: 20 },
  { nombre: 'Traje de combate', zonas: 'Torso, Brazos, Piernas, Cabeza', bonus: 25 },
];

// ── Méritos ── (nombres exactos del sistema antiguo / Google Sheets)
export const MERITOS_TABLE = [
  'Ambidiestro Indiferente',
  'Ambidiestro Ambas',
  'Atractivo',
  'Valiente',
  'Sexto sentido',
  'Contactos leves',
  'Contactos medios',
  'Contactos poderosos',
  'Aptitud natural',
  'Sentidos agudos',
  'Reputacion leve',
  'Reputacion media',
  'Reputacion elevada',
  'Resistencia al dolor',
  'Resistencia a las drogas',
  'Riqueza leve',
  'Riqueza media',
  'Riqueza elevada',
  'Nobleza baja',
  'Nobleza media',
  'Nobleza alta',
  'Fuerte',
] as const;

// ── Defectos ── (nombres exactos del sistema antiguo / Google Sheets)
export const DEFECTOS_TABLE = [
  'Adiccion leve',
  'Adiccion fuerte',
  'Mala reputacion leve',
  'Mala reputacion media',
  'Mala reputacion alta',
  'Terror de combate leve',
  'Terror de combate alto',
  'Enemigo debil',
  'Enemigo medio',
  'Enemigo poderoso',
  'SDT',
  'Deudas leves',
  'Deudas medias',
  'Deudas elevadas',
  'Ineptitud natural',
  'Repulsivo',
  'Gafe',
  'Debil',
] as const;

// ── Quirks de Mech ──────────────────────────────────────────────────────────
export interface QuirkDef { id: string; nombre: string; efecto: string }

export const QUIRKS_DATABASE: { positivos: QuirkDef[]; negativos: QuirkDef[] } = {
  positivos: [
    { id: 'anti_air',        nombre: 'Anti-Aircraft Targeting',    efecto: '+1 precisión contra unidades aéreas' },
    { id: 'barrel_fist',     nombre: 'Barrel Fist',                efecto: 'Sin penalización cuerpo a cuerpo sin actuador de mano' },
    { id: 'battle_computer', nombre: 'Battle Computer',            efecto: '+1 iniciativa para toda la lanza (equipo fijo)' },
    { id: 'battlefists',     nombre: 'Battlefists',                efecto: '+1 probabilidad de impacto cuerpo a cuerpo por brazo' },
    { id: 'combat_computer', nombre: 'Combat Computer',            efecto: '-3 calor al esprintar / -3 calor al caminar' },
    { id: 'command_mech',    nombre: 'Command Mech',               efecto: '+1 iniciativa para la lanza hasta recibir impacto' },
    { id: 'cowl',            nombre: 'Cowl',                       efecto: '-3 daño en la cabeza desde los lados' },
    { id: 'distracting',     nombre: 'Distracting',                efecto: 'Tiradas de pánico enemigas 5% más difíciles' },
    { id: 'directional_torso', nombre: 'Directional Torso Mount',  efecto: 'Las armas pueden apuntar 360 grados' },
    { id: 'easy_maintain',   nombre: 'Easy to Maintain',           efecto: 'Reparaciones 25% más rápidas' },
    { id: 'easy_pilot',      nombre: 'Easy to Pilot',              efecto: '+1 cap de evasión' },
    { id: 'ext_torso',       nombre: 'Extended Torso Twist',       efecto: 'Arco de disparo extendido 120 grados' },
    { id: 'full_head_eject', nombre: 'Full-Head Ejection',         efecto: 'La cabeza no se destruye al eyectar' },
    { id: 'good_rep',        nombre: 'Good Reputation',            efecto: '+10% valor compra/venta' },
    { id: 'hyper_act',       nombre: 'Hyper-Extending Actuators',  efecto: 'Arco 120°; puede voltear brazos al arco trasero' },
    { id: 'imp_comms',       nombre: 'Improved Comms',             efecto: 'Puede ver a través de un ECM' },
    { id: 'imp_life',        nombre: 'Improved Life Support',      efecto: 'Previene una herida al piloto' },
    { id: 'imp_sensors',     nombre: 'Improved Sensors',           efecto: 'Sensor Lock mejorado; mayor rango de sensores' },
    { id: 'imp_target_s',    nombre: 'Improved Targeting (Corto)', efecto: '+1 precisión a ≤240m' },
    { id: 'imp_target_m',    nombre: 'Improved Targeting (Medio)', efecto: '+1 precisión entre 240m-460m' },
    { id: 'imp_target_l',    nombre: 'Improved Targeting (Largo)', efecto: '+1 precisión a >460m' },
    { id: 'modular_wpn',     nombre: 'Modular Weapons',            efecto: 'Reemplazar armas 50% más rápido' },
    { id: 'multi_trac',      nombre: 'Multi-Trac',                 efecto: '+1 precisión con habilidad Multi-Objetivo' },
    { id: 'narrow_profile_s', nombre: 'Narrow/Low Profile (Corto)', efecto: '+1 defensa a ≤240m' },
    { id: 'narrow_profile_m', nombre: 'Narrow/Low Profile (Medio)', efecto: '+1 defensa entre 240m-460m' },
    { id: 'narrow_profile_l', nombre: 'Narrow/Low Profile (Largo)', efecto: '+1 defensa a >460m' },
    { id: 'nimble_jumper',   nombre: 'Nimble Jumper',              efecto: 'Estabilidad se resetea como si se moviera al saltar' },
    { id: 'overhead_arms',   nombre: 'Overhead Arms',              efecto: 'Penalización de obstrucción reducida en 1' },
    { id: 'protected_act',   nombre: 'Protected Actuators',        efecto: 'Críticos en actuadores de pata ignorados 50%' },
    { id: 'reinf_legs',      nombre: 'Reinforced Legs',            efecto: 'Daño propio por DFA reducido a la mitad' },
    { id: 'rugged',          nombre: 'Rugged',                     efecto: '25-50% reducción coste mantenimiento' },
    { id: 'searchlight',     nombre: 'Searchlight',                efecto: '+25m visión; ignora penalizaciones de poca luz' },
    { id: 'stable',          nombre: 'Stable',                     efecto: '+25% estabilidad' },
    { id: 'stabilized_wpn',  nombre: 'Stabilized Weapon',          efecto: '+1 precisión al arma/localización especificada' },
    { id: 'variable_target', nombre: 'Variable Range Targeting',   efecto: '+1 precisión a todos los rangos' },
    { id: 'vestigial_hands', nombre: 'Vestigial Hands',            efecto: 'Puede levantar objetos sin actuadores de mano' },
  ],
  negativos: [
    { id: 'bad_rep',         nombre: 'Bad Reputation',             efecto: '-10% valor compra/venta' },
    { id: 'cramped_cockpit', nombre: 'Cramped Cockpit',            efecto: '-1 generación de temple' },
    { id: 'diff_ejection',   nombre: 'Difficult Ejection',         efecto: 'El piloto sufre una herida al eyectar' },
    { id: 'diff_maintain',   nombre: 'Difficult to Maintain',      efecto: 'Reparaciones 25% más lentas' },
    { id: 'exposed_act',     nombre: 'Exposed Actuators',          efecto: 'Actuadores de pata critables a través de armadura' },
    { id: 'exposed_wpn',     nombre: 'Exposed Weapon Linkage',     efecto: 'Armas de apoyo en brazos critables a través de armadura' },
    { id: 'hard_pilot',      nombre: 'Hard to Pilot',              efecto: '-10 umbral de inestabilidad' },
    { id: 'no_ejection',     nombre: 'No Ejection Mechanism',      efecto: 'El piloto no puede eyectar' },
    { id: 'no_arms',         nombre: 'No/Minimal Arms',            efecto: '-2 penalización levantarse; sin sprint ese turno' },
    { id: 'non_std_parts',   nombre: 'Non-Standard Parts',         efecto: '+25% coste de reparación' },
    { id: 'oversized',       nombre: 'Oversized',                  efecto: '-1 defensa contra impactos' },
    { id: 'poor_life',       nombre: 'Poor Life Support',          efecto: 'El piloto sufre herida al sobrecalentar' },
    { id: 'poor_perf',       nombre: 'Poor Performance',           efecto: 'Solo puede esprintar si se movió el turno anterior' },
    { id: 'prototype',       nombre: 'Prototype',                  efecto: '+25% coste mantenimiento, +10% reparación' },
    { id: 'unbalanced',      nombre: 'Unbalanced',                 efecto: '-25% estabilidad' },
    { id: 'weak_head',       nombre: 'Weak Head Armor',            efecto: '-3 armadura en la cabeza' },
    { id: 'weak_legs',       nombre: 'Weak Legs',                  efecto: 'Daño propio por DFA duplicado' },
  ],
};
