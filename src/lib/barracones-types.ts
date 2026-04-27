// ══════════════════════════════════════════════════════
//  BARRACONES — Tipos de datos
// ══════════════════════════════════════════════════════

export interface PilotSkill {
  nombre: string;
  nivel: number;
  upgrades: number; // veces subida con XP
}

export interface PilotQuirk {
  quirkId: string;
  mechName: string;
}

export interface WeaponSlot {
  nombre: string;
  munActual: number;
}

export interface Pilot {
  id: string;

  // Identidad
  nombre: string;
  callsign: string;
  mech: string;
  sexo: string;
  edad: number;      // calculada: campaignYear - birthYear
  decade: number;    // dígito de década (0–9) del año de nacimiento
  yearBorn: number;  // dígito de año dentro de la década (0–9)
  ageRoll: number;   // tirada de edad adicional
  altura: string;
  peso: string;
  pelo: string;
  ojos: string;
  origen: string;
  notas: string;

  // Atributos (6–12)
  fue: number;
  des: number;
  int: number;
  car: number;
  attrUpgrades: Record<string, number>; // veces subido con XP por atributo

  // HP actual por localización (daño acumulado)
  hpDmg: Record<string, number>; // loc → puntos perdidos

  // Habilidades
  habilidades: PilotSkill[];

  // XP
  xpTotal: number;
  xpDisponible: number;

  // Armas (3 ranged + 2 melee)
  armas: WeaponSlot[];

  // Armadura (2 piezas)
  armadura:  { tipo: string; piezas: number };
  armadura2: { tipo: string; piezas: number };

  // Méritos y defectos
  meritos:  string[];
  defectos: string[];

  // Quirks de mech (cada uno asociado a un mech, coste 1000 XP)
  quirks: PilotQuirk[];
}

export function emptyPilot(): Pilot {
  return {
    id: crypto.randomUUID(),
    nombre: '', callsign: '', mech: '', sexo: '', edad: 25,
    decade: 0, yearBorn: 0, ageRoll: 0,
    altura: '', peso: '', pelo: '', ojos: '', origen: '', notas: '',
    fue: 6, des: 6, int: 6, car: 6,
    attrUpgrades: {},
    hpDmg: {},
    habilidades: [],
    xpTotal: 0, xpDisponible: 0,
    armas: [
      { nombre: '', munActual: 0 },
      { nombre: '', munActual: 0 },
      { nombre: '', munActual: 0 },
      { nombre: '', munActual: 0 },
      { nombre: '', munActual: 0 },
    ],
    armadura:  { tipo: '', piezas: 0 },
    armadura2: { tipo: '', piezas: 0 },
    meritos:  [],
    defectos: [],
    quirks:   [],
  };
}
