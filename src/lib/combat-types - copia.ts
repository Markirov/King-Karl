// ═══════════════════════════════════════════════════════════════
// COMBAT TYPES — Full domain types from reference document
// ═══════════════════════════════════════════════════════════════

// ── Mech State (static, from parsed file) ──
export interface MechState {
  source: 'SSW' | 'MTF';
  chassis: string;
  model: string;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  hsCount: number;
  hsDouble: boolean;
  diss: number;              // effective dissipation
  engineRating: number;
  armorType: string;
  techBase: string;
  era: string;
  bv: number;

  armor: {
    HD: number; CTf: number; CTr: number;
    LTf: number; LTr: number; RTf: number; RTr: number;
    LA: number; RA: number; LL: number; RL: number;
  };

  is: {
    HD: number; CT: number; LT: number; RT: number;
    LA: number; RA: number; LL: number; RL: number;
  };

  isQuad: boolean;
  weapons: MechWeapon[];
  crits: Record<string, string[]>;  // location → 6 or 12 slot names
  ammoBins: AmmoBin[];
}

export interface MechWeapon {
  id: number;
  name: string;
  rawName: string;
  loc: string;
  heat: number;
  dmg: string;
  r: string;                 // 'short/med/long'
  ammo: number | null;
  ammoMax: number | null;
  ammoFamily: string;
  ammoFamilyKey: string;
  ammoPerTon: number;
  ammoUse: number;
  usesAmmo: boolean;
  slotsUsed: number;
  slotIndices: number[];
}

export interface AmmoBin {
  id: number;
  loc: string;
  slotIdx: number;
  familyKey: string;
  family: string;
  perTon: number;
  current: number;
  max: number;
}

// ── Mech Session (mutable combat state) ──
export interface MechSession {
  armor: Record<string, number>;     // HD, CTf, CTr, LTf, LTr, RTf, RTr, LA, RA, LL, RL
  is: Record<string, number>;        // HD, CT, LT, RT, LA, RA, LL, RL
  heat: number;
  wounds: number;
  moveMode: MoveMode;
  jumpUsed: number;

  crits: Record<string, CritSlot[]>;
  activeShots: Record<number, boolean>;
  shotSpend: Record<number, { binId: number; amount: number } | null>;

  ammoBins: AmmoBin[];
  ammoGroups: Record<string, number>;
  ammoGroupMax: Record<string, number>;

  pilot: { name: string; gunnery: number; piloting: number };
  destroyed: boolean;
  destroyedReason: string;
  logs: string[];
}

export interface CritSlot {
  name: string;     // '-' = empty
  hit: boolean;
}

export type MoveMode = 'stand' | 'walk' | 'run' | 'jump';

// ── Vehicle types ──
export interface VehicleState {
  name: string;
  model: string;
  tons: number;
  motiveType: string;
  cruise: number;
  turretType: string;
  source: string;
  locations: VehicleLocation[];
  weapons: VehicleWeapon[];
  ammoPools: Record<string, number>;
  crits: Record<string, string[]>;
}

export interface VehicleLocation {
  key: string;
  label: string;
  maxArmor: number;
  maxIS: number;
}

export interface VehicleWeapon {
  id: number;
  name: string;
  loc: string;
  heat: number;
  dmg: string;
  r: string;
  ammoKey?: string;
}

export interface VehicleEffects {
  stabilizer?: number;       // +1 attack per hit (cumulative)
  sensors?: number;          // +2 attack per hit (cumulative)
  crewStunned?: number;      // turns remaining (temporary, decays 1/turn)
  driverHit?: number;        // piloting check each turn (cumulative)
  commanderHit?: number;     // +2 to all (first hit only)
  cargoHit?: number;         // info only
  turretJammedCount?: number;// turns remaining (temporary, decays 1/turn)
  turretLocked?: boolean;    // permanent
  turretDestroyed?: boolean; // permanent — all turret weapons gone
  pilotingMod?: number;      // from motive crits (cumulative)
  crewKilled?: boolean;      // instant destruction
  fuelEngineDestroyed?: boolean; // instant immobilization + explosion check
  ammoExplosion?: boolean;   // instant destruction
}

export interface VehicleSession {
  armor: Record<string, number>;
  is: Record<string, number>;
  ammoPools: Record<string, number>;
  crits: Record<string, CritSlot[]>;
  activeShots: Record<number, boolean>;
  moveMode: 'immobile' | 'cruise' | 'flank';
  motiveMP: number;          // accumulated -1 MP penalties (engine hits)
  motiveHalfCount: number;   // accumulated /2 MP penalties
  immobilized: boolean;
  destroyed: boolean;
  destroyedReason: string;
  pilot: { name: string; gunnery: number; piloting: number };
  logs: string[];
  effects: VehicleEffects;
  weaponDestroyedIds: number[];
  weaponMalfunctionIds: number[];
  pendingCrits: Record<string, { damage: number; motive: number }>; // locKey → counts
}

// ── Armor Slot definition ──
export interface ArmorSlotDef {
  k: string;      // key in session.armor (HD, CTf, CTr...)
  l: string;      // display label
  ik: string;     // key in session.is (HD, CT, LT...)
  rear: boolean;
}

// ── Slot state (for UI) ──
export type SlotState = 'loaded' | 'empty';

export interface MechSlot {
  state: MechState | null;
  session: MechSession | null;
}

export interface VehicleSlot {
  state: VehicleState | null;
  session: VehicleSession | null;
}

// =====================================================================
// DAMAGE FLAGS — modificadores de tipo de daño
// =====================================================================

export interface DamageFlags {
  cluster?:    boolean;  // SRM/LRM → x2 vs infantería
  inferno?:    boolean;  // inferno SRM
  flamer?:     boolean;  // lanzallamas
  ae?:         boolean;  // area effect (AC/20, Gauss) → x1.5 vs infantería
  burst?:      boolean;  // ráfaga (MG, pulse) → +burstBonus vs infantería
  energy?:     boolean;
  ballistic?:  boolean;
  missile?:    boolean;
}

// =====================================================================
// INFANTRY — CONVENCIONAL
// =====================================================================

export type InfantryMovementType = 'foot' | 'motorized' | 'mechanized' | 'jump';

export type InfantryWeaponClass =
  | 'rifle' | 'laser' | 'srm' | 'lrm' | 'mg' | 'flamer' | 'field-gun';

export interface InfantryDamageTable {
  short:  number[];  // index = troopers alive → damage
  medium: number[];
  long:   number[];
}

export interface InfantryState {
  id:                string;
  name:              string;
  faction:           'IS' | 'Clan';
  movement:          InfantryMovementType;
  weaponClass:       InfantryWeaponClass;
  platoonSize:       number;
  squadCount:        number;
  troopersPerSquad:  number;
  walkMP:            number;
  jumpMP:            number;
  range:             { short: number; medium: number; long: number };
  damageTable:       InfantryDamageTable;
  minTroopersToFire: number;
  damageDivisor:     number;
  burstBonus:        number;
  antiMech:          boolean;
  bv:                number;
}

export interface InfantrySession {
  troopers:              number;
  moveMode:              'stand' | 'walk' | 'jump' | 'prone' | 'dug-in';
  infernoTurnsLeft:      number;       // turnos restantes de inferno
  swarmTargetSlotId:     string | null;
  swarmTargetType:       'mech' | null;
  legAttackTargetLeg:    'LL' | 'RL' | null;
  activeShotRange:       0 | 1 | 2 | null;
  activeShotTarget:      string | null;
  destroyed:             boolean;
  destroyedReason:       string;
  logs:                  string[];
}

// =====================================================================
// BATTLE ARMOR
// =====================================================================

export type BAWeightClass = 'PAL' | 'Light' | 'Medium' | 'Heavy' | 'Assault';

export interface BAWeaponMount {
  id:             number;
  name:           string;
  damagePerShot:  number;
  rangeShort:     number;
  rangeMedium:    number;
  rangeLong:      number;
  heat:           number;
  oneShot:        boolean;
  ammo?:          number;
  antiInfantry?:  boolean;
}

export interface BAState {
  id:              string;
  name:            string;
  faction:         'IS' | 'Clan';
  weightClass:     BAWeightClass;
  suitCount:       4 | 5 | 6;
  armorPerSuit:    number;
  walkMP:          number;
  jumpMP:          number;
  umuMP:           number;  // TODO v2
  vtolMP:          number;  // TODO v2
  weapons:         BAWeaponMount[];
  magneticClamps:  boolean;
  stealthArmor:    boolean;
  ecm:             boolean; // TODO v2
  tag:             boolean; // TODO v2
  apMount:         boolean;
  antiMech:        boolean;
  bv:              number;
}

export interface BASuitSession {
  index:               number;
  armor:               number;
  alive:               boolean;
  weaponsFiredThisTurn: Record<number, boolean>;
  weaponsExpended:     Record<number, boolean>;
}

export interface BASession {
  suits:              BASuitSession[];
  moveMode:           'stand' | 'walk' | 'jump' | 'prone' | 'swarming';
  swarmTargetSlotId:  string | null;
  legAttackTargetLeg: 'LL' | 'RL' | null;
  destroyed:          boolean;
  destroyedReason:    string;
  logs:               string[];
}

// =====================================================================
// INFANTRY SLOTS
// =====================================================================

export interface InfantrySlot {
  state:   InfantryState | null;
  session: InfantrySession | null;
}

export interface BASlot {
  state:   BAState | null;
  session: BASession | null;
}

export interface FireTarget {
  type:     'mech' | 'vehicle' | 'inf' | 'ba';
  slotIdx:  number;
  label:    string;
}
