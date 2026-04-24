// ══════════════════════════════════════════════════════════════
//  FACTION DOSSIER — Datos dinámicos por facción de origen
//  Mapeados desde el campo pilot.origen (nombre completo en español)
// ══════════════════════════════════════════════════════════════

export interface FactionDossier {
  code:            string;
  militaryAcronym: string;
  militaryName:    string;
  dossierTitle:    string;
  filePrefix:      string;
  crestAsset:      string | null; // null = sin crest, usa monograma
  crestScale?:     number;        // multiplicador sobre el tamaño base (56px)
  crestOffsetY?:   number;        // desplazamiento vertical en px (positivo = abajo)
}

const DOSSIERS: FactionDossier[] = [
  {
    code: 'LC',
    militaryAcronym: 'FAML',
    militaryName:    'FUERZAS ARMADAS DE LA MANCOMUNIDAD DE LA LIRA',
    dossierTitle:    'Expediente de Caballero',
    filePrefix:      'ML',
    crestAsset:      'house_steiner_logo.png',
    crestScale:      1.3,
    crestOffsetY:    7,
  },
  {
    code: 'FS',
    militaryAcronym: 'FAFS',
    militaryName:    'FUERZAS ARMADAS DE LA FEDERACION DE SOLES',
    dossierTitle:    'Hoja de Servicio',
    filePrefix:      'FS',
    crestAsset:      'house_davion_logo.png',
  },
  {
    code: 'DC',
    militaryAcronym: 'FACD',
    militaryName:    'FUERZAS ALISTADAS DEL CONDOMINIO DRACONIS',
    dossierTitle:    '武士記録 · Bushi Kiroku',
    filePrefix:      'CD',
    crestAsset:      'house_kurita_logo.png',
  },
  {
    code: 'FWL',
    militaryAcronym: 'ELML',
    militaryName:    'EJERCITO DE LA LIGA DE MUNDOS LIBRES',
    dossierTitle:    'Expediente Militar',
    filePrefix:      'LML',
    crestAsset:      'house_marik_logo.png',
  },
  {
    code: 'CC',
    militaryAcronym: 'FACC',
    militaryName:    'FUERZAS ARMADAS DE LA CONFEDERACION DE CAPELLA',
    dossierTitle:    '軍事檔案 · Jūnshì Dǎng\'àn',
    filePrefix:      'CC',
    crestAsset:      'house_liao_logo.png',
  },
  {
    code: 'OA',
    militaryAcronym: 'CMAE',
    militaryName:    'CUERPO MILITAR DE LA ALIANZA DE MUNDOS EXTERIORES',
    dossierTitle:    'Ficha de la Milicia',
    filePrefix:      'AME',
    crestAsset:      'house_outworlds_alliance_logo.png',
  },
  {
    code: 'MERC',
    militaryAcronym: 'MRB',
    militaryName:    'MERCENARY REVIEW BOARD — REGISTERED UNIT',
    dossierTitle:    'Contractor Dossier',
    filePrefix:      'MR',
    crestAsset:      null,
  },
];

// Nombres completos en español → código de facción
const ORIGIN_MAP: Record<string, string> = {
  'mancomunidad lirana':     'LC',
  'lyran commonwealth':      'LC',
  'federación de soles':     'FS',
  'federacion de soles':     'FS',
  'federated suns':          'FS',
  'combine draconis':        'DC',
  'draconis combine':        'DC',
  'liga mundos libres':      'FWL',
  'alianza mundos libres':   'FWL',
  'free worlds league':      'FWL',
  'confederación capellana': 'CC',
  'confederacion capellana': 'CC',
  'capellan confederation':  'CC',
  'alianza mundos exteriores': 'OA',
  'outworlds alliance':      'OA',
};

const DEFAULT_DOSSIER = DOSSIERS.find(d => d.code === 'MERC')!;

export function getDossierForOrigin(origen: string): FactionDossier {
  const key = (origen ?? '').toLowerCase().trim();
  const code = ORIGIN_MAP[key] ?? key.toUpperCase();
  return DOSSIERS.find(d => d.code === code) ?? DEFAULT_DOSSIER;
}
