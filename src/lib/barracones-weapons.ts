// ═══════════════════════════════════════════════════════════
//  BARRACONES — Tabla de armas de infantería
//  Misma estructura e índices que INFANTRY_WEAPON_TABLE del HTML original
// ═══════════════════════════════════════════════════════════

export interface InfWeapon {
  name:      string;
  dmg:       string;
  s:         string;
  m:         string;
  l:         string;
  car:       string;
  w:         string;
  rec:       string;
  tipo:      string;       // Pistola | Rifle | Arco | Melee | Espada | Granada
  habilidad?: string;      // habilidad directa para melee/granadas
  especial:  string;
  clase:     string;
  size:      string;
}

export const INFANTRY_WEAPON_TABLE: InfWeapon[] = [
  // idx 0
  { name: "Arco Corto",              dmg: "1D6+1",   s: "2",  m: "5",  l: "8",  car: "8",  rec: "1", w: "2",  tipo: "Arco",    especial: "Insonoro",       clase: "Arco",           size: "Pequeño" },
  { name: "Arco Largo",              dmg: "2D6+3",   s: "4",  m: "9",  l: "14", car: "8",  rec: "1", w: "3",  tipo: "Arco",    especial: "Insonoro",       clase: "Arco",           size: "Medio"   },
  { name: "Ballesta Ligera",         dmg: "2D6",     s: "2",  m: "5",  l: "10", car: "1",  rec: "1", w: "4",  tipo: "Rifle",   especial: "Insonoro",       clase: "Ballesta",       size: "Medio"   },
  { name: "Ballesta Pesada",         dmg: "2D6+3",   s: "3",  m: "7",  l: "13", car: "1",  rec: "1", w: "6",  tipo: "Rifle",   especial: "Insonoro",       clase: "Ballesta",       size: "Grande"  },
  { name: "Blazer",                  dmg: "4D6+2 X2",s: "9",  m: "21", l: "30", car: "2",  rec: "1", w: "10", tipo: "Rifle",   especial: "",               clase: "Laser",          size: "Grande"  },
  { name: "Carabina GyroSlug",       dmg: "2D6+5",   s: "6",  m: "15", l: "30", car: "20", rec: "1", w: "3",  tipo: "Rifle",   especial: "",               clase: "Gyro",           size: "Medio"   },
  { name: "Escopeta",                dmg: "3D6+2",   s: "3",  m: "5",  l: "8",  car: "6",  rec: "1", w: "4",  tipo: "Rifle",   especial: "",               clase: "Balistica",      size: "Pequeño" },
  { name: "Escopeta 2 cañones",      dmg: "3D6+2",   s: "3",  m: "4",  l: "5",  car: "2",  rec: "1", w: "3",  tipo: "Rifle",   especial: "",               clase: "Balistica",      size: "Medio"   },
  { name: "Lanzador AMCA",           dmg: "5D6+6",   s: "10", m: "36", l: "54", car: "2",  rec: "1", w: "18", tipo: "Rifle",   especial: "",               clase: "Misil",          size: "Enorme"  },
  { name: "Lanzador AMCA Pesado",    dmg: "10D6+6",  s: "15", m: "40", l: "48", car: "4",  rec: "4", w: "20", tipo: "Rifle",   especial: "",               clase: "Misil",          size: "Enorme"  },
  // idx 10
  { name: "Lanzallamas",             dmg: "2D6",     s: "2",  m: "4",  l: "6",  car: "12", rec: "1", w: "15", tipo: "Rifle",   especial: "Inflamable",     clase: "Inflamable",     size: "Enorme"  },
  { name: "Mauser 960 Lanzagranadas",dmg: "2D6+3",   s: "6",  m: "15", l: "25", car: "6",  rec: "-", w: "10", tipo: "Rifle",   especial: "Explosivo",      clase: "Explosivo",      size: "Grande"  },
  { name: "Mauser 960 Laser Pulso",  dmg: "3D6+3",   s: "7",  m: "15", l: "30", car: "10", rec: "-", w: "10", tipo: "Rifle",   especial: "-2 Impactar",    clase: "Pulso",          size: "Grande"  },
  { name: "MG",                      dmg: "4D6+3",   s: "10", m: "20", l: "42", car: "15", rec: "1", w: "10", tipo: "Rifle",   especial: "",               clase: "Balistica",      size: "Medio"   },
  { name: "Pistola Agujas",          dmg: "1D6+2",   s: "3",  m: "-",  l: "-",  car: "10", rec: "1", w: "1",  tipo: "Pistola", especial: "Ignora Blindaje",clase: "Agujas",         size: "Pequeño" },
  { name: "Pistola Automatica",      dmg: "2D6",     s: "2",  m: "4",  l: "8",  car: "10", rec: "1", w: "1.5",tipo: "Pistola", especial: "",               clase: "Balistica",      size: "Pequeño" },
  { name: "Pistola Automatica Mydron",dmg:"1D6+3",   s: "2",  m: "4",  l: "12", car: "20", rec: "1", w: "1.5",tipo: "Pistola", especial: "",               clase: "Balistica",      size: "Pequeño" },
  { name: "Pistola de Pulsos",       dmg: "3D6",     s: "2",  m: "4",  l: "8",  car: "10", rec: "1", w: "1",  tipo: "Pistola", especial: "-2 Impactar",    clase: "Pulso",          size: "Medio"   },
  { name: "Pistola GyroJet",         dmg: "3D6+3",   s: "1",  m: "2",  l: "-",  car: "2",  rec: "1", w: "2",  tipo: "Pistola", especial: "",               clase: "Gyro",           size: "Medio"   },
  { name: "Pistola Laser",           dmg: "4D6",     s: "3",  m: "6",  l: "12", car: "20", rec: "1", w: "1",  tipo: "Pistola", especial: "",               clase: "Laser",          size: "Medio"   },
  // idx 20
  { name: "Pistola Laser Nakjama",   dmg: "3D6",     s: "4",  m: "9",  l: "14", car: "20", rec: "1", w: "1",  tipo: "Pistola", especial: "",               clase: "Laser",          size: "Medio"   },
  { name: "Pistola Laser Sunbeam",   dmg: "5D6",     s: "3",  m: "6",  l: "11", car: "5",  rec: "1", w: "1",  tipo: "Pistola", especial: "",               clase: "Laser",          size: "Medio"   },
  { name: "Pistola LaserM",          dmg: "2D6",     s: "2",  m: "4",  l: "6",  car: "3",  rec: "1", w: "0.5",tipo: "Pistola", especial: "",               clase: "Laser",          size: "A"       },
  { name: "Pistola Semi",            dmg: "2D6+3",   s: "2",  m: "4",  l: "8",  car: "6",  rec: "1", w: "1",  tipo: "Pistola", especial: "",               clase: "Balistica",      size: "Pequeño" },
  { name: "Pistola Sonica",          dmg: "S",       s: "2",  m: "5",  l: "8",  car: "25", rec: "1", w: "1.5",tipo: "Pistola", especial: "Especial",       clase: "Sonica",         size: "Medio"   },
  { name: "Pistola Sternsnacht",     dmg: "4D6+2",   s: "2",  m: "4",  l: "12", car: "3",  rec: "1", w: "2.5",tipo: "Pistola", especial: "",               clase: "Balistica",      size: "Pequeño" },
  { name: "Pistola Tranquilizante",  dmg: "S",       s: "2",  m: "4",  l: "6",  car: "10", rec: "1", w: "1",  tipo: "Pistola", especial: "Especial",       clase: "Tranquilizante", size: "Medio"   },
  { name: "PistolaM",                dmg: "1D6+3",   s: "2",  m: "-",  l: "-",  car: "5",  rec: "1", w: "0.5",tipo: "Pistola", especial: "",               clase: "Balistica",      size: "A"       },
  { name: "PistolaM Agujas",         dmg: "1D6",     s: "1",  m: "-",  l: "-",  car: "5",  rec: "1", w: "0.3",tipo: "Pistola", especial: "",               clase: "Agujas",         size: "A"       },
  { name: "Rifle",                   dmg: "3D6",     s: "6",  m: "15", l: "30", car: "10", rec: "1", w: "4",  tipo: "Rifle",   especial: "",               clase: "Balistica",      size: "Grande"  },
  // idx 30
  { name: "Rifle Agujas",            dmg: "2D6+2",   s: "6",  m: "7",  l: "8",  car: "20", rec: "1", w: "2",  tipo: "Rifle",   especial: "Ignora Blindaje",clase: "Agujas",         size: "Medio"   },
  { name: "Rifle de Pulsos",         dmg: "3D6+2",   s: "6",  m: "14", l: "28", car: "5",  rec: "1", w: "5",  tipo: "Rifle",   especial: "-2 Impactar",    clase: "Pulso",          size: "Medio"   },
  { name: "Rifle Federated",         dmg: "2D6+2",   s: "8",  m: "18", l: "33", car: "10", rec: "1", w: "4.5",tipo: "Rifle",   especial: "",               clase: "Balistica",      size: "Grande"  },
  { name: "Rifle GyroJet",           dmg: "3D6+6",   s: "12", m: "36", l: "72", car: "10", rec: "1", w: "6",  tipo: "Rifle",   especial: "",               clase: "Gyro",           size: "Grande"  },
  { name: "Rifle GyroJet Pesado",    dmg: "6D6+6",   s: "12", m: "36", l: "72", car: "5",  rec: "1", w: "18", tipo: "Rifle",   especial: "",               clase: "Gyro",           size: "Grande"  },
  { name: "Rifle GyroSlug",          dmg: "3D6+3",   s: "8",  m: "35", l: "42", car: "50", rec: "1", w: "12", tipo: "Rifle",   especial: "",               clase: "Gyro",           size: "Grande"  },
  { name: "Rifle Laser",             dmg: "4D6+2",   s: "9",  m: "21", l: "42", car: "10", rec: "1", w: "5",  tipo: "Rifle",   especial: "",               clase: "Laser",          size: "Medio"   },
  { name: "Rifle Laser Intek",       dmg: "2D6+2",   s: "12", m: "30", l: "51", car: "10", rec: "1", w: "8",  tipo: "Rifle",   especial: "",               clase: "Laser",          size: "Medio"   },
  { name: "Rifle Laser MagnaStar",   dmg: "4D6+2",   s: "9",  m: "21", l: "30", car: "4",  rec: "1", w: "5",  tipo: "Rifle",   especial: "",               clase: "Laser",          size: "Medio"   },
  { name: "Rifle Pesado Zeus",       dmg: "6D6",     s: "7",  m: "18", l: "28", car: "5",  rec: "1", w: "12", tipo: "Rifle",   especial: "",               clase: "Balistica",      size: "Grande"  },
  // idx 40
  { name: "SMG",                     dmg: "3D6",     s: "3",  m: "7",  l: "10", car: "50", rec: "1", w: "3",  tipo: "Rifle",   especial: "Rafaga",         clase: "Balistica",      size: "Medio"   },
  { name: "SMG Imperator",           dmg: "2D6",     s: "4",  m: "8",  l: "11", car: "50", rec: "1", w: "4",  tipo: "Rifle",   especial: "Rafaga",         clase: "Balistica",      size: "Medio"   },
  { name: "SMG Rorynex",             dmg: "3D6+3",   s: "3",  m: "6",  l: "9",  car: "100",rec: "1", w: "3",  tipo: "Rifle",   especial: "Rafaga",         clase: "Balistica",      size: "Medio"   },
  // Cuerpo a Cuerpo (idx 43+)
  { name: "Vara",                    dmg: "1D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "2",  tipo: "Melee",   habilidad: "Pelea",  especial: "",           clase: "Cuerpo a Cuerpo", size: "Medio"   },
  { name: "Arma de asta",            dmg: "2D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "4",  tipo: "Melee",   habilidad: "Pelea",  especial: "",           clase: "Cuerpo a Cuerpo", size: "Grande"  },
  { name: "Vibrohacha",              dmg: "4D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "5",  tipo: "Melee",   habilidad: "Pelea",  especial: "",           clase: "Cuerpo a Cuerpo", size: "Grande"  },
  { name: "Vibrokatana",             dmg: "3D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "3",  tipo: "Espada",  habilidad: "Espada", especial: "",           clase: "Cuerpo a Cuerpo", size: "Medio"   },
  { name: "Porra",                   dmg: "1D6+1",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "2",  tipo: "Melee",   habilidad: "Pelea",  especial: "",           clase: "Cuerpo a Cuerpo", size: "Pequeño" },
  { name: "Garrote",                 dmg: "1D6+2",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "3",  tipo: "Melee",   habilidad: "Pelea",  especial: "",           clase: "Cuerpo a Cuerpo", size: "Medio"   },
  { name: "Daga",                    dmg: "1D6-1",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "1",  tipo: "Melee",   habilidad: "Espada", especial: "",           clase: "Cuerpo a Cuerpo", size: "Pequeño" },
  // idx 50
  { name: "Espada",                  dmg: "2D6+2",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "3",  tipo: "Melee",   habilidad: "Espada", especial: "",           clase: "Cuerpo a Cuerpo", size: "Medio"   },
  { name: "Bayoneta",                dmg: "1D6+3",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "2",  tipo: "Melee",   habilidad: "Espada", especial: "",           clase: "Cuerpo a Cuerpo", size: "Pequeño" },
  { name: "Vidrodaga",               dmg: "2D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "1",  tipo: "Melee",   habilidad: "Espada", especial: "",           clase: "Cuerpo a Cuerpo", size: "Pequeño" },
  { name: "Porra aturdidora",        dmg: "1D6-2",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "2",  tipo: "Melee",   habilidad: "Pelea",  especial: "Aturdidor",  clase: "Cuerpo a Cuerpo", size: "Pequeño" },
  { name: "Mini aturdidor",          dmg: "1D6-4",   s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "1",  tipo: "Melee",   habilidad: "Pelea",  especial: "Aturdidor",  clase: "Cuerpo a Cuerpo", size: "Pequeño" },
  { name: "Latigo neural",           dmg: "1D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "2",  tipo: "Melee",   habilidad: "Pelea",  especial: "",           clase: "Cuerpo a Cuerpo", size: "Medio"   },
  // Granadas (idx 56+)
  { name: "Micro Granada",           dmg: "2D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "1",  tipo: "Granada", habilidad: "Armas Arrojadizas", especial: "Explosivo", clase: "Granada", size: "Pequeño" },
  { name: "Mini Granada",            dmg: "3D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "1",  tipo: "Granada", habilidad: "Armas Arrojadizas", especial: "Explosivo", clase: "Granada", size: "Pequeño" },
  { name: "Maxi Granada",            dmg: "5D6",     s: "-",  m: "-",  l: "-",  car: "",   rec: "1", w: "2",  tipo: "Granada", habilidad: "Armas Arrojadizas", especial: "Explosivo", clase: "Granada", size: "Medio"   },
];

/**
 * Devuelve el nombre del arma dado su índice.
 * Si el índice no existe, devuelve el valor original (por si ya es un nombre).
 */
export function resolveWeaponName(selectValue: string | number): string {
  const idx = parseInt(String(selectValue));
  if (!isNaN(idx) && idx >= 0 && idx < INFANTRY_WEAPON_TABLE.length) {
    return INFANTRY_WEAPON_TABLE[idx].name;
  }
  // If it's already a name (not a number), return as-is
  return String(selectValue);
}

/**
 * Devuelve la habilidad recomendada para un arma dado su nombre.
 */
export function getWeaponSkill(weaponName: string): string | null {
  const candidates = getWeaponSkillCandidates(weaponName);
  return candidates[0] ?? null;
}

/**
 * Devuelve la lista de habilidades aplicables para un arma, en orden de preferencia.
 * Permite buscar en las habilidades reales del piloto con fallbacks.
 */
export function getWeaponSkillCandidates(weaponName: string): string[] {
  const w = INFANTRY_WEAPON_TABLE.find(x => x.name === weaponName);
  if (!w) return [];
  if (w.habilidad) return [w.habilidad]; // melee/granadas: habilidad directa
  const tipo = w.tipo.toLowerCase();
  if (tipo === 'pistola') return ['Pistola', 'Armas Pequeñas'];
  if (tipo === 'rifle')   return ['Rifle', 'Armas Pequeñas', 'Armas de Apoyo'];
  if (tipo === 'arco')    return ['Arco'];
  return [];
}

/**
 * Extrae modificador especial de "especial" (ej: "-2 Impactar" → -2)
 */
export function getWeaponMod(weaponName: string): number {
  const w = INFANTRY_WEAPON_TABLE.find(x => x.name === weaponName);
  if (!w?.especial) return 0;
  const match = w.especial.match(/([+-]?\d+)\s*(?:impactar|a impactar)?/i);
  return match ? parseInt(match[1]) : 0;
}
