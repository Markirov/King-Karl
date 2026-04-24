// Años discretos disponibles en el SUCS (columnas de snapshot político)
export const SUCS_YEARS = [
  2271, 2317, 2319, 2341, 2366,
  2571, 2596, 2750, 2765, 2767, 2783, 2786,
  2821, 2822, 2830, 2864,
  3025, 3030, 3040, 3049, 3050, 3051, 3052,
  3057, 3058, 3059, 3063, 3067, 3068,
  3075, 3079, 3081, 3085, 3095,
  3130, 3135, 3145, 3151, 3152,
] as const;

// Años de sucesion wars (los más relevantes para la campaña)
export const SUCCESSION_WARS_YEARS = [3025, 3030, 3040, 3049, 3052, 3057, 3067, 3075, 3081, 3085];

// Radio máximo de territorio por sistema (en LY)
export const DEFAULT_MAX_RADIUS = 30;

// Bounding box de la Esfera Interior en coordenadas BT
export const MAP_BOUNDS = [-750, -750, 750, 750] as [number, number, number, number];

// Segmentos para aproximar el círculo de clip (más = más suave, más lento)
export const CIRCLE_SEGMENTS = 24;

// Colores por facción — fallback para lo que no está en el JSON de Sarna
export const FACTION_COLORS: Record<string, string> = {
  // Grandes Casas
  LC:    '#4488cc',  // Lyran Commonwealth
  FS:    '#ffaa00',  // Federated Suns
  DC:    '#cc2200',  // Draconis Combine
  FWL:   '#9933cc',  // Free Worlds League
  CC:    '#00aa55',  // Capellan Confederation
  // Post-invasión
  FCL:   '#6699dd',  // FC Lyran side
  FCS:   '#ffcc44',  // FC Suns side
  LA:    '#3399ff',  // Lyran Alliance
  FC:    '#ff8800',  // Federated Commonwealth
  // Clanes
  CSJ:   '#006644',  CW:  '#336633',  CJF: '#228844',
  CGB:   '#445566',  CSV: '#557755',  CHH: '#884422',
  CSR:   '#446688',  CNC: '#884466',  CBS: '#556644',
  // Periferia
  TC:    '#996633',  MoC: '#669966',  OA:  '#cc9933',
  FRR:   '#4488aa',  RWR: '#cc6633',
  // Especiales
  CS:    '#dddddd',  WB:  '#aaaaaa',  ComStar: '#dddddd',
  // "Propietad histórica" / pre-casas
  PD:    '#3366bb',  // Protectorate of Donegal
  TH:    '#bb3333',  // Terran Hegemony
  // Libre / desconocido
  U:     '#333333',  A:   '#222222',  I: '#444444',
};
