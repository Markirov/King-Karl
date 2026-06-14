// ══════════════════════════════════════════════════════
//  AYUDAS — Tablas de Referencia BattleTech
//  Datos extraídos del HTML original + Total Warfare
// ══════════════════════════════════════════════════════

// ── MECH: Tabla de Localización de Impacto (2D6) ──────
// [tirada, ataque desde izquierda, ataque frontal/central, ataque desde derecha]
export const MECH_HIT_LOCATIONS: [number, string, string, string][] = [
  [2,  'Torso Izquierdo',  'Torso Central',    'Torso Derecho'],
  [3,  'Pierna Izquierda', 'Brazo Derecho',    'Pierna Derecha'],
  [4,  'Brazo Izquierdo',  'Brazo Derecho',    'Brazo Derecho'],
  [5,  'Brazo Izquierdo',  'Pierna Derecha',   'Brazo Derecho'],
  [6,  'Pierna Izquierda', 'Torso Derecho',    'Pierna Derecha'],
  [7,  'Torso Izquierdo',  'Torso Central',    'Torso Derecho'],
  [8,  'Torso Central',    'Torso Izquierdo',  'Torso Central'],
  [9,  'Torso Derecho',    'Pierna Izquierda', 'Torso Izquierdo'],
  [10, 'Brazo Derecho',    'Brazo Izquierdo',  'Brazo Izquierdo'],
  [11, 'Pierna Derecha',   'Brazo Izquierdo',  'Pierna Izquierda'],
  [12, 'Cabeza',           'Cabeza',           'Cabeza'],
];

// ── MECH: Tabla de Patada (1D6) ───────────────────────
export const MECH_KICK_LOCATIONS: [number, string, string, string][] = [
  [1, 'Pierna Izquierda', 'Pierna Izquierda', 'Pierna Derecha'],
  [2, 'Pierna Izquierda', 'Pierna Izquierda', 'Pierna Derecha'],
  [3, 'Pierna Izquierda', 'Pierna Derecha',   'Pierna Derecha'],
  [4, 'Pierna Izquierda', 'Pierna Izquierda', 'Pierna Derecha'],
  [5, 'Pierna Izquierda', 'Pierna Derecha',   'Pierna Derecha'],
  [6, 'Pierna Izquierda', 'Pierna Izquierda', 'Pierna Derecha'],
];

// ── MECH: Tabla de Puñetazo (1D6) ────────────────────
export const MECH_PUNCH_LOCATIONS: [number, string, string, string][] = [
  [1, 'Brazo Izquierdo',  'Brazo Izquierdo',  'Brazo Derecho'],
  [2, 'Torso Izquierdo',  'Torso Central',    'Torso Derecho'],
  [3, 'Brazo Izquierdo',  'Brazo Derecho',    'Brazo Derecho'],
  [4, 'Torso Izquierdo',  'Torso Central',    'Torso Derecho'],
  [5, 'Brazo Izquierdo',  'Brazo Izquierdo',  'Brazo Derecho'],
  [6, 'Cabeza',           'Cabeza',           'Cabeza'],
];

// ── MECH: Tabla de Caída ──────────────────────────────
export const MECH_FALL_TABLE: [string, string][] = [
  ['Frontal',   'Misma dirección'],
  ['Derecha',   '½ Hex Derecha'],
  ['Trasero',   'Dirección Opuesta'],
  ['Izquierda', '½ Hex Izquierda'],
];

// ── MECH: Tabla de Hits Críticos (2D6) ───────────────
export const MECH_CRITICAL_HITS: [number, string, string, string][] = [
  [2,  'Motor',                    'Act. de Hombro',        'Act. de Cadera'],
  [3,  'Motor',                    'Act. Brazo Superior',   'Act. Pierna Superior'],
  [4,  'Giróscopo',                'Act. Brazo Inferior',   'Act. Pierna Inferior'],
  [5,  'Sensor',                   'Act. de Mano',          'Act. de Pie'],
  [6,  'Disipadores de Calor',     'Arma',                  'Disipadores de Calor'],
  [7,  'Sistema de Soporte Vital', 'Arma',                  'Arma'],
  [8,  'Salto Jets',               'Munición',              'Munición'],
  [9,  'Sensor',                   'Arma',                  'Arma'],
  [10, 'Motor',                    'Munición',              'Disipadores de Calor'],
  [11, 'Giróscopo',                'Arma',                  'Arma'],
  [12, 'Piloto Golpeado',          'Munición',              'Munición'],
];

export const MECH_CRITICAL_EFFECTS: Record<string, string> = {
  'Motor':                    '3 impactos = Mech destruido. Cada impacto reduce velocidad.',
  'Giróscopo':                '+3 a tiradas de Pilotaje. 2 impactos = caída automática cada turno.',
  'Sensor':                   '+2 al modificador de ataque con armas por impacto.',
  'Sistema de Soporte Vital': 'El piloto sufre 1 punto de daño adicional por turno de calor excesivo.',
  'Act. de Hombro':           '+4 al modificador de ataque. No se pueden usar armas de ese brazo.',
  'Act. Brazo Superior':      '+1 al modificador de ataque para armas del brazo.',
  'Act. Brazo Inferior':      '+1 al modificador de ataque para armas del brazo.',
  'Act. de Mano':             'Sin ataques físicos con esa mano.',
  'Act. de Cadera':           '+2 a tiradas de Pilotaje.',
  'Act. Pierna Superior':     '+1 a tiradas de Pilotaje.',
  'Act. Pierna Inferior':     '+1 a tiradas de Pilotaje.',
  'Act. de Pie':              '+1 a tiradas de Pilotaje.',
  'Disipadores de Calor':     '−1 a la capacidad de disipación por impacto.',
  'Salto Jets':               'Reduce la capacidad de salto en 1 por impacto destruido.',
  'Arma':                     'Una arma aleatoria en la localización es destruida.',
  'Munición':                 '¡EXPLOSIÓN! Daño = munición restante × daño/ronda. Aplica IS primero.',
  'Piloto Golpeado':          'El piloto recibe 1 punto de daño directo. Tirada de consciencia (TN 3+).',
};

// ── TABLA DE CLUSTER DE MISILES (2D6 × tamaño lanzador) ──
// CLUSTER_TABLE[tirada2D6][tamaño] = impactos
export const CLUSTER_TABLE: Record<number, Record<number, number>> = {
  2:  { 2:1, 4:1, 5:1, 6:2,  10:3,  12:4,  15:5,  20:6  },
  3:  { 2:1, 4:2, 5:2, 6:2,  10:3,  12:4,  15:5,  20:6  },
  4:  { 2:1, 4:2, 5:2, 6:3,  10:4,  12:5,  15:6,  20:9  },
  5:  { 2:1, 4:2, 5:3, 6:3,  10:6,  12:8,  15:9,  20:12 },
  6:  { 2:1, 4:2, 5:3, 6:4,  10:6,  12:8,  15:9,  20:12 },
  7:  { 2:1, 4:3, 5:3, 6:4,  10:6,  12:8,  15:9,  20:12 },
  8:  { 2:2, 4:3, 5:3, 6:4,  10:6,  12:8,  15:9,  20:12 },
  9:  { 2:2, 4:3, 5:4, 6:5,  10:8,  12:10, 15:11, 20:16 },
  10: { 2:2, 4:3, 5:4, 6:5,  10:9,  12:11, 15:13, 20:18 },
  11: { 2:2, 4:4, 5:5, 6:6,  10:10, 12:12, 15:15, 20:20 },
  12: { 2:2, 4:4, 5:5, 6:6,  10:10, 12:12, 15:15, 20:20 },
};
export const CLUSTER_SIZES = [2, 4, 5, 6, 10, 12, 15, 20];

// ── MODIFICADORES DE ATAQUE ──────────────────────────
export interface ModifierEntry { label: string; mod: string; note?: string }
export interface ModifierGroup { title: string; entries: ModifierEntry[] }

export const ATTACK_MODIFIERS: ModifierGroup[] = [
  {
    title: 'Movimiento del atacante',
    entries: [
      { label: 'Estacionario',    mod: '−1' },
      { label: 'Caminando',       mod: '+0' },
      { label: 'Corriendo',       mod: '+2' },
      { label: 'Saltando',        mod: '+3' },
      { label: 'Cuerpo a tierra', mod: '+2', note: 'No aplica a cuadrúpedos' },
      { label: 'Derrape',         mod: '+1' },
    ],
  },
  {
    title: 'Movimiento del objetivo',
    entries: [
      { label: 'Estacionario',     mod: '−4' },
      { label: 'Derrapó',          mod: '+2' },
      { label: '1–6 hexágonos',    mod: '+0' },
      { label: '7–8 hexágonos',    mod: '+1' },
      { label: '9–10 hexágonos',   mod: '+2' },
      { label: '11–12 hexágonos',  mod: '+3' },
      { label: '13–14 hexágonos',  mod: '+4' },
      { label: '15–16 hexágonos',  mod: '+5' },
      { label: '17–18 hexágonos',  mod: '+6' },
      { label: '19–20 hexágonos',  mod: '+7' },
      { label: 'Saltó (por hex)',   mod: '+1' },
      { label: 'Cuerpo a tierra (adyacente)', mod: '−2' },
      { label: 'Cuerpo a tierra (otro)',      mod: '+1' },
      { label: 'Camuflaje (medio)', mod: '+1' },
      { label: 'Camuflaje (largo)', mod: '+2' },
    ],
  },
  {
    title: 'Terreno (entre atacante y objetivo)',
    entries: [
      { label: 'Bosque disperso (por hex)', mod: '+1' },
      { label: 'Bosque denso (por hex)',    mod: '+2' },
      { label: 'Agua prof. 1',             mod: '+1', note: 'Ver cobertura parcial' },
      { label: 'Agua prof. 2+',            mod: 'N/A', note: 'Solo vs. objetivo sumergido' },
    ],
  },
  {
    title: 'Solo ataques con armas',
    entries: [
      { label: 'Sensor dañado',              mod: '+2' },
      { label: 'Actuador de hombro dañado',  mod: '+4', note: 'Para armas del brazo' },
      { label: 'Act. brazo superior dañado', mod: '+1', note: 'Para armas del brazo' },
      { label: 'Act. brazo inferior dañado', mod: '+1', note: 'Para armas del brazo' },
    ],
  },
  {
    title: 'Calor del atacante',
    entries: [
      { label: '0–7',  mod: '+0' },
      { label: '8–12', mod: '+1' },
      { label: '13–16',mod: '+2' },
      { label: '17–23',mod: '+3' },
      { label: '24+',  mod: '+4' },
    ],
  },
  {
    title: 'Fuego indirecto',
    entries: [
      { label: 'Realizando fuego indirecto',              mod: '+1' },
      { label: '+ observador también dispara',            mod: '+1' },
      { label: 'Siendo el observador designado',          mod: '+1' },
    ],
  },
];

export const MOVEMENT_MODIFIERS: ModifierGroup[] = [
  {
    title: 'Daños al Mech',
    entries: [
      { label: 'Recibe ≥20 daños en un turno', mod: '+1' },
      { label: 'Reactor apagado',              mod: '+3' },
      { label: 'Actuador de pie dañado',       mod: '+1', note: 'Por actuador' },
      { label: 'Actuador de pierna dañado',    mod: '+1', note: 'Por actuador' },
      { label: 'Actuador de cadera dañado',    mod: '+4' },
      { label: 'Giróscopo dañado',             mod: '+3' },
      { label: 'Giróscopo destruido',          mod: 'Caída automática' },
      { label: 'Pierna destruida',             mod: 'Caída automática' },
    ],
  },
  {
    title: 'Ataques físicos recibidos',
    entries: [
      { label: 'Recibir patada',              mod: '+0' },
      { label: 'Recibir puñetazo/empujón',    mod: '+0' },
      { label: 'Recibir carga / DFA',         mod: '+2' },
    ],
  },
  {
    title: 'Acciones del atacante',
    entries: [
      { label: 'Fallar una patada',       mod: '+0' },
      { label: 'Carga exitosa',           mod: '+2' },
      { label: 'DFA exitoso',             mod: '+4' },
      { label: 'Entrar en agua prof. 1',  mod: '−1' },
      { label: 'Entrar en agua prof. 2',  mod: '+0' },
      { label: 'Entrar en agua prof. 3+', mod: '+1' },
    ],
  },
  {
    title: 'Especial',
    entries: [
      { label: 'Evitar daño por caída (por nivel)', mod: '+1' },
      { label: 'Cuadrúpedo con 4 piernas intactas', mod: '−2' },
    ],
  },
];

// ── TABLA DE IMPACTO: INFANTERÍA (2D6) ────────────────
// Clave: "dado1dado2" (ej: "11" = dado1=1, dado2=1)
export const INFANTRY_HIT_TABLE: Record<string, string> = {
  '11': 'Brazo Izquierdo', '12': 'Brazo Izquierdo', '13': 'Brazo Izquierdo',
  '14': 'Pierna Izquierda','15': 'Pierna Derecha',  '16': 'Pierna Derecha',
  '21': 'Pierna Derecha',  '22': 'Pierna Derecha',  '23': 'Pierna Derecha',
  '24': 'Cabeza',          '25': 'Cabeza',           '26': 'Cabeza',
  '31': 'Cabeza',          '32': 'Brazo Izquierdo', '33': 'Torso',
  '34': 'Torso',           '35': 'Torso',            '36': 'Torso',
  '41': 'Torso',           '42': 'Torso',            '43': 'Torso',
  '44': 'Torso',           '45': 'Torso',            '46': 'Torso',
  '51': 'Torso',           '52': 'Torso',            '53': 'Brazo Derecho',
  '54': 'Brazo Derecho',  '55': 'Brazo Derecho',    '56': 'Brazo Derecho',
  '61': 'Brazo Derecho',  '62': 'Pierna Izquierda', '63': 'Pierna Izquierda',
  '64': 'Pierna Izquierda','65': 'Pierna Izquierda', '66': 'Pierna Izquierda',
};

export const INFANTRY_CRIT_TRIGGER: Record<string, string> = {
  '11': 'Brazo', '22': 'Pierna', '33': 'Torso',
  '44': 'Torso', '55': 'Brazo',  '66': 'Pierna',
};

export const INFANTRY_CRIT_TABLES: Record<string, Record<number, string>> = {
  Brazo: {
    1: 'Hombro dislocado',
    2: 'Brazo fracturado',
    3: 'Hemorragia interna I',
    4: 'Muñeca fracturada',
    5: 'Dedo(s) amputado(s)',
    6: 'Codo destrozado',
  },
  Pierna: {
    1: 'Ligamentos rotos',
    2: 'Hemorragia interna I',
    3: 'Pierna fracturada',
    4: 'Tobillo destrozado',
    5: 'Hemorragia interna II',
    6: 'Pie amputado',
  },
  Torso: {
    1: 'Costillas rotas',
    2: 'Hemorragia interna I',
    3: 'Esternón roto',
    4: 'Hemorragia interna II',
    5: 'Pulmón perforado',
    6: 'Bazo perforado',
  },
};

export const INFANTRY_CRIT_RULES: Record<string, { rule: string; effect: string }> = {
  'Hombro dislocado':     { rule: 'HOMBRO DISLOCADO',        effect: 'Un tercero debe recolocar el hueso. Sin tratamiento: −2 FUE en ese brazo permanentemente.' },
  'Brazo fracturado':     { rule: 'HUESOS ROTOS',            effect: 'Inmovilización de la extremidad hasta tratamiento médico. −2 a acciones físicas.' },
  'Hemorragia interna I': { rule: 'HEMORRAGIA INTERNA I',    effect: '1 daño adicional al final de cada escena hasta recibir primeros auxilios (TN 5+).' },
  'Muñeca fracturada':    { rule: 'HUESOS ROTOS',            effect: 'Inmovilización de la extremidad hasta tratamiento médico. −2 a acciones físicas.' },
  'Dedo(s) amputado(s)': { rule: 'DEDO(S) CERCENADO(S)',    effect: '−1 a acciones de precisión con esa mano. Permanente sin cirugía.' },
  'Codo destrozado':      { rule: 'CODO/TOBILLO DESTROZADO', effect: '−2 a acciones físicas con esa extremidad. Cirugía necesaria para recuperación.' },
  'Ligamentos rotos':     { rule: 'LIGAMENTOS DESGARRADOS',  effect: '−2 MOV. Un tercero debe aplicar vendaje. Sin tratamiento: permanente.' },
  'Pierna fracturada':    { rule: 'HUESOS ROTOS',            effect: 'Imposibilidad de caminar sin ayuda. Inmovilización hasta tratamiento.' },
  'Tobillo destrozado':   { rule: 'CODO/TOBILLO DESTROZADO', effect: '−2 a acciones físicas con esa extremidad. Cirugía necesaria.' },
  'Hemorragia interna II':{ rule: 'HEMORRAGIA INTERNA II',   effect: '2 daños adicionales al final de cada escena. Requiere cirugía de emergencia (TN 7+).' },
  'Pie amputado':         { rule: 'PIE ARRANCADO',           effect: 'Incapacitación inmediata. Requiere torneo y cirugía urgente o muerte en 1D6 rondas.' },
  'Costillas rotas':      { rule: 'COSTILLAS ROTAS',         effect: '−1 a todas las acciones físicas. Dolor severo. Curación en 4–6 semanas.' },
  'Esternón roto':        { rule: 'HUESOS ROTOS',            effect: '−2 a acciones físicas. Riesgo de perforación pulmonar si recibe más daño en torso.' },
  'Pulmón perforado':     { rule: 'PULMÓN PERFORADO',        effect: 'Médico hace Tirada de Emergencia (TN +4). Sin éxito: −1 daño adicional por ronda.' },
  'Bazo perforado':       { rule: 'BAZO PERFORADO',          effect: 'Cirugía inmediata o muerte en 1D6 turnos. Pérdida de consciencia en 1D3 rondas.' },
};

// ── VEHÍCULO: Tabla de Localización de Impacto ────────
export const VEHICLE_HIT_LOCATIONS: [number, string, string, string][] = [
  [2,  'Crítico',         'Crítico',        'Crítico'],
  [3,  'Frente',          'Lateral',        'Trasero'],
  [4,  'Frente',          'Lateral',        'Trasero'],
  [5,  'Lateral Der.',    'Frente',         'Lateral Der.'],
  [6,  'Frente',          'Lateral',        'Trasero'],
  [7,  'Frente',          'Lateral',        'Trasero'],
  [8,  'Frente',          'Lateral',        'Trasero'],
  [9,  'Lateral Izq.',    'Trasero',        'Lateral Izq.'],
  [10, 'Arma',            'Arma',           'Arma'],
  [11, 'Trasero',         'Arma',           'Frente'],
  [12, 'Conductor',       'Conductor',      'Conductor'],
];

// Crítico de vehículo (1D6 al obtener "Crítico" en tabla anterior)
export const VEHICLE_CRITICAL_RESULTS: [number, string, string][] = [
  [1, 'Motor golpeado',      '−1 MP. Si Motor llega a 0: destruido.'],
  [2, 'Motor golpeado',      '−1 MP. Si Motor llega a 0: destruido.'],
  [3, 'Munición explota',    'Daño = rondas restantes × daño/ronda. Aplica IS primero.'],
  [4, 'Munición explota',    'Daño = rondas restantes × daño/ronda. Aplica IS primero.'],
  [5, 'Conductor herido',    'El conductor recibe 1 punto de daño. +1 a tiradas de Conducción.'],
  [6, 'Tripulante herido',   'Un tripulante aleatorio recibe 1 punto de daño.'],
];

// ── VEHÍCULO: Daño Motriz (2D6) ───────────────────────
export const VEHICLE_MOTIVE_TABLE: [number, string, string][] = [
  [2,  'Vehículo destruido', 'No puede moverse. Inmovilizado permanentemente.'],
  [3,  '−3 MP',              'Movimiento máximo reducido en 3 hexes.'],
  [4,  '−3 MP',              'Movimiento máximo reducido en 3 hexes.'],
  [5,  '−3 MP',              'Movimiento máximo reducido en 3 hexes.'],
  [6,  '−2 MP',              'Movimiento máximo reducido en 2 hexes.'],
  [7,  '−2 MP',              'Movimiento máximo reducido en 2 hexes.'],
  [8,  '−1 MP',              'Movimiento máximo reducido en 1 hex.'],
  [9,  '−1 MP',              'Movimiento máximo reducido en 1 hex.'],
  [10, 'Sin efecto',         'El sistema motriz resiste el impacto.'],
  [11, 'Sin efecto',         'El sistema motriz resiste el impacto.'],
  [12, 'Sin efecto',         'El sistema motriz resiste el impacto.'],
];

// ── INFANTERÍA: Tabla de Armamento ────────────────────
export interface InfantryWeapon {
  name: string;
  dmg: string;
  s: string;
  m: string;
  l: string;
  car: string;
  rec: string;
  w: string;
  tipo: 'Rifle' | 'Pistola' | 'Arco' | 'Melee' | 'Granada';
  clase: string;
  size: 'A' | 'Pequeño' | 'Medio' | 'Grande' | 'Enorme';
  especial: string;
  habilidad?: string;
}

export const INFANTRY_WEAPONS: InfantryWeapon[] = [
  // ── Arcos ──
  { name: 'Arco Corto',               dmg: '1D6+1',    s: '2',  m: '5',  l: '8',  car: '8',   rec: '1', w: '2',   tipo: 'Arco',    clase: 'Arco',          size: 'Pequeño', especial: 'Insonoro' },
  { name: 'Arco Largo',               dmg: '2D6+3',    s: '4',  m: '9',  l: '14', car: '8',   rec: '1', w: '3',   tipo: 'Arco',    clase: 'Arco',          size: 'Medio',   especial: 'Insonoro' },
  // ── Ballestas ──
  { name: 'Ballesta Ligera',          dmg: '2D6',      s: '2',  m: '5',  l: '10', car: '1',   rec: '1', w: '4',   tipo: 'Rifle',   clase: 'Ballesta',      size: 'Medio',   especial: 'Insonoro' },
  { name: 'Ballesta Pesada',          dmg: '2D6+3',    s: '3',  m: '7',  l: '13', car: '1',   rec: '1', w: '6',   tipo: 'Rifle',   clase: 'Ballesta',      size: 'Grande',  especial: 'Insonoro' },
  // ── Láser ──
  { name: 'Blazer',                   dmg: '4D6+2 ×2', s: '9',  m: '21', l: '30', car: '2',   rec: '1', w: '10',  tipo: 'Rifle',   clase: 'Láser',         size: 'Grande',  especial: '' },
  { name: 'Rifle Láser',              dmg: '4D6+2',    s: '9',  m: '21', l: '42', car: '10',  rec: '1', w: '5',   tipo: 'Rifle',   clase: 'Láser',         size: 'Medio',   especial: '' },
  { name: 'Rifle Láser Intek',        dmg: '2D6+2',    s: '12', m: '30', l: '51', car: '10',  rec: '1', w: '8',   tipo: 'Rifle',   clase: 'Láser',         size: 'Medio',   especial: '' },
  { name: 'Rifle Láser MagnaStar',    dmg: '4D6+2',    s: '9',  m: '21', l: '30', car: '4',   rec: '1', w: '5',   tipo: 'Rifle',   clase: 'Láser',         size: 'Medio',   especial: '' },
  // ── Gyro ──
  { name: 'Carabina GyroSlug',        dmg: '2D6+5',    s: '6',  m: '15', l: '30', car: '20',  rec: '1', w: '3',   tipo: 'Rifle',   clase: 'Gyro',          size: 'Medio',   especial: '' },
  { name: 'Rifle GyroJet',            dmg: '3D6+6',    s: '12', m: '36', l: '72', car: '10',  rec: '1', w: '6',   tipo: 'Rifle',   clase: 'Gyro',          size: 'Grande',  especial: '' },
  { name: 'Rifle GyroJet Pesado',     dmg: '6D6+6',    s: '12', m: '36', l: '72', car: '5',   rec: '1', w: '18',  tipo: 'Rifle',   clase: 'Gyro',          size: 'Grande',  especial: '' },
  { name: 'Rifle GyroSlug',           dmg: '3D6+3',    s: '8',  m: '35', l: '42', car: '50',  rec: '1', w: '12',  tipo: 'Rifle',   clase: 'Gyro',          size: 'Grande',  especial: '' },
  // ── Balística ──
  { name: 'Escopeta',                 dmg: '3D6+2',    s: '3',  m: '5',  l: '8',  car: '6',   rec: '1', w: '4',   tipo: 'Rifle',   clase: 'Balística',     size: 'Pequeño', especial: '' },
  { name: 'Escopeta 2 Cañones',       dmg: '3D6+2',    s: '3',  m: '4',  l: '5',  car: '2',   rec: '1', w: '3',   tipo: 'Rifle',   clase: 'Balística',     size: 'Medio',   especial: '' },
  { name: 'MG',                       dmg: '4D6+3',    s: '10', m: '20', l: '42', car: '15',  rec: '1', w: '10',  tipo: 'Rifle',   clase: 'Balística',     size: 'Medio',   especial: '' },
  { name: 'Rifle',                    dmg: '3D6',      s: '6',  m: '15', l: '30', car: '10',  rec: '1', w: '4',   tipo: 'Rifle',   clase: 'Balística',     size: 'Grande',  especial: '' },
  { name: 'Rifle Federated',          dmg: '2D6+2',    s: '8',  m: '18', l: '33', car: '10',  rec: '1', w: '4.5', tipo: 'Rifle',   clase: 'Balística',     size: 'Grande',  especial: '' },
  { name: 'Rifle Pesado Zeus',        dmg: '6D6',      s: '7',  m: '18', l: '28', car: '5',   rec: '1', w: '12',  tipo: 'Rifle',   clase: 'Balística',     size: 'Grande',  especial: '' },
  // ── Agujas ──
  { name: 'Rifle Agujas',             dmg: '2D6+2',    s: '6',  m: '7',  l: '8',  car: '20',  rec: '1', w: '2',   tipo: 'Rifle',   clase: 'Agujas',        size: 'Medio',   especial: 'Ignora Blindaje' },
  // ── Pulso ──
  { name: 'Rifle de Pulsos',          dmg: '3D6+2',    s: '6',  m: '14', l: '28', car: '5',   rec: '1', w: '5',   tipo: 'Rifle',   clase: 'Pulso',         size: 'Medio',   especial: '−2 Impactar' },
  // ── Misil ──
  { name: 'Lanzador AMCA',            dmg: '5D6+6',    s: '10', m: '36', l: '54', car: '2',   rec: '1', w: '18',  tipo: 'Rifle',   clase: 'Misil',         size: 'Enorme',  especial: '' },
  { name: 'Lanzador AMCA Pesado',     dmg: '10D6+6',   s: '15', m: '40', l: '48', car: '4',   rec: '4', w: '20',  tipo: 'Rifle',   clase: 'Misil',         size: 'Enorme',  especial: '' },
  // ── Especiales ──
  { name: 'Lanzallamas',              dmg: '2D6',      s: '2',  m: '4',  l: '6',  car: '12',  rec: '1', w: '15',  tipo: 'Rifle',   clase: 'Inflamable',    size: 'Enorme',  especial: 'Inflamable' },
  { name: 'Mauser 960 Lanzagranadas', dmg: '2D6+3',    s: '6',  m: '15', l: '25', car: '6',   rec: '—', w: '10',  tipo: 'Rifle',   clase: 'Explosivo',     size: 'Grande',  especial: 'Explosivo' },
  { name: 'Mauser 960 Láser Pulso',   dmg: '3D6+3',    s: '7',  m: '15', l: '30', car: '10',  rec: '—', w: '10',  tipo: 'Rifle',   clase: 'Pulso',         size: 'Grande',  especial: '−2 Impactar' },
  // ── SMG ──
  { name: 'SMG',                      dmg: '3D6',      s: '3',  m: '7',  l: '10', car: '50',  rec: '1', w: '3',   tipo: 'Rifle',   clase: 'Balística',     size: 'Medio',   especial: 'Ráfaga' },
  { name: 'SMG Imperator',            dmg: '2D6',      s: '4',  m: '8',  l: '11', car: '50',  rec: '1', w: '4',   tipo: 'Rifle',   clase: 'Balística',     size: 'Medio',   especial: 'Ráfaga' },
  { name: 'SMG Rorynex',              dmg: '3D6+3',    s: '3',  m: '6',  l: '9',  car: '100', rec: '1', w: '3',   tipo: 'Rifle',   clase: 'Balística',     size: 'Medio',   especial: 'Ráfaga' },
  // ── Pistolas balísticas ──
  { name: 'Pistola Automática',       dmg: '2D6',      s: '2',  m: '4',  l: '8',  car: '10',  rec: '1', w: '1.5', tipo: 'Pistola', clase: 'Balística',     size: 'Pequeño', especial: '' },
  { name: 'Pistola Automática Mydron',dmg: '1D6+3',    s: '2',  m: '4',  l: '12', car: '20',  rec: '1', w: '1.5', tipo: 'Pistola', clase: 'Balística',     size: 'Pequeño', especial: '' },
  { name: 'Pistola Semi',             dmg: '2D6+3',    s: '2',  m: '4',  l: '8',  car: '6',   rec: '1', w: '1',   tipo: 'Pistola', clase: 'Balística',     size: 'Pequeño', especial: '' },
  { name: 'Pistola Sternsnacht',      dmg: '4D6+2',    s: '2',  m: '4',  l: '12', car: '3',   rec: '1', w: '2.5', tipo: 'Pistola', clase: 'Balística',     size: 'Pequeño', especial: '' },
  { name: 'PistolaM',                 dmg: '1D6+3',    s: '2',  m: '—',  l: '—',  car: '5',   rec: '1', w: '0.5', tipo: 'Pistola', clase: 'Balística',     size: 'A',       especial: '' },
  // ── Pistolas agujas ──
  { name: 'Pistola Agujas',           dmg: '1D6+2',    s: '3',  m: '—',  l: '—',  car: '10',  rec: '1', w: '1',   tipo: 'Pistola', clase: 'Agujas',        size: 'Pequeño', especial: 'Ignora Blindaje' },
  { name: 'PistolaM Agujas',          dmg: '1D6',      s: '1',  m: '—',  l: '—',  car: '5',   rec: '1', w: '0.3', tipo: 'Pistola', clase: 'Agujas',        size: 'A',       especial: '' },
  // ── Pistola de pulsos ──
  { name: 'Pistola de Pulsos',        dmg: '3D6',      s: '2',  m: '4',  l: '8',  car: '10',  rec: '1', w: '1',   tipo: 'Pistola', clase: 'Pulso',         size: 'Medio',   especial: '−2 Impactar' },
  // ── Pistola gyro ──
  { name: 'Pistola GyroJet',          dmg: '3D6+3',    s: '1',  m: '2',  l: '—',  car: '2',   rec: '1', w: '2',   tipo: 'Pistola', clase: 'Gyro',          size: 'Medio',   especial: '' },
  // ── Pistolas láser ──
  { name: 'Pistola Láser',            dmg: '4D6',      s: '3',  m: '6',  l: '12', car: '20',  rec: '1', w: '1',   tipo: 'Pistola', clase: 'Láser',         size: 'Medio',   especial: '' },
  { name: 'Pistola Láser Nakjama',    dmg: '3D6',      s: '4',  m: '9',  l: '14', car: '20',  rec: '1', w: '1',   tipo: 'Pistola', clase: 'Láser',         size: 'Medio',   especial: '' },
  { name: 'Pistola Láser Sunbeam',    dmg: '5D6',      s: '3',  m: '6',  l: '11', car: '5',   rec: '1', w: '1',   tipo: 'Pistola', clase: 'Láser',         size: 'Medio',   especial: '' },
  { name: 'PistolaM Láser',           dmg: '2D6',      s: '2',  m: '4',  l: '6',  car: '3',   rec: '1', w: '0.5', tipo: 'Pistola', clase: 'Láser',         size: 'A',       especial: '' },
  // ── Pistolas especiales ──
  { name: 'Pistola Sónica',           dmg: 'Especial', s: '2',  m: '5',  l: '8',  car: '25',  rec: '1', w: '1.5', tipo: 'Pistola', clase: 'Sónica',        size: 'Medio',   especial: 'No letal' },
  { name: 'Pistola Tranquilizante',   dmg: 'Especial', s: '2',  m: '4',  l: '6',  car: '10',  rec: '1', w: '1',   tipo: 'Pistola', clase: 'Tranquilizante', size: 'Medio',  especial: 'No letal' },
  // ── Cuerpo a cuerpo ──
  { name: 'Vara',                     dmg: '1D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '2',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Medio',  especial: '', habilidad: 'Pelea' },
  { name: 'Arma de Asta',             dmg: '2D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '4',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Grande', especial: '', habilidad: 'Pelea' },
  { name: 'Vibrohacha',               dmg: '4D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '5',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Grande', especial: '', habilidad: 'Pelea' },
  { name: 'Vibrokatana',              dmg: '3D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '3',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Medio',  especial: '', habilidad: 'Espada' },
  { name: 'Porra',                    dmg: '1D6+1',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '2',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Pequeño',especial: '', habilidad: 'Pelea' },
  { name: 'Garrote',                  dmg: '1D6+2',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '3',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Medio',  especial: '', habilidad: 'Pelea' },
  { name: 'Daga',                     dmg: '1D6−1',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '1',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Pequeño',especial: '', habilidad: 'Espada' },
  { name: 'Espada',                   dmg: '2D6+2',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '3',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Medio',  especial: '', habilidad: 'Espada' },
  { name: 'Bayoneta',                 dmg: '1D6+3',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '2',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Pequeño',especial: '', habilidad: 'Espada' },
  { name: 'Vidrodaga',                dmg: '2D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '1',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Pequeño',especial: '', habilidad: 'Espada' },
  { name: 'Porra Aturdidora',         dmg: '1D6−2',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '2',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Pequeño',especial: 'Aturdidor', habilidad: 'Pelea' },
  { name: 'Mini Aturdidor',           dmg: '1D6−4',    s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '1',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Pequeño',especial: 'Aturdidor', habilidad: 'Pelea' },
  { name: 'Látigo Neural',            dmg: '1D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '2',   tipo: 'Melee',   clase: 'Cuerpo a Cuerpo', size: 'Medio',  especial: '', habilidad: 'Pelea' },
  // ── Granadas ──
  { name: 'Micro Granada',            dmg: '2D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '1',   tipo: 'Granada', clase: 'Granada',       size: 'Pequeño', especial: 'Explosivo', habilidad: 'Armas Arrojadizas' },
  { name: 'Mini Granada',             dmg: '3D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '1',   tipo: 'Granada', clase: 'Granada',       size: 'Pequeño', especial: 'Explosivo', habilidad: 'Armas Arrojadizas' },
  { name: 'Maxi Granada',             dmg: '5D6',      s: '—',  m: '—',  l: '—',  car: '—',   rec: '—', w: '2',   tipo: 'Granada', clase: 'Granada',       size: 'Medio',   especial: 'Explosivo', habilidad: 'Armas Arrojadizas' },
];
