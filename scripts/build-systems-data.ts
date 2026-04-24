/**
 * build-systems-data.ts
 * Fusiona SUCS + UserDB y genera los 3 ficheros JSON de datos.
 *
 * Uso: npm run build:data
 *      (internamente: npx tsx scripts/build-systems-data.ts)
 */

import { createRequire } from 'module';
import * as fs   from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// xlsx no tiene exports ESM nativos — usar require
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Rutas ──────────────────────────────────────────────────────────────────
// Los Excel viven en la raíz del proyecto; data/sources/ es un alias conceptual
const ROOT       = path.join(__dirname, '..');
const SUCS_PATH  = path.join(ROOT, 'Herramientas', 'Sarna Unified Cartography Kit (Official).xlsx');
const USER_PATH  = path.join(ROOT, 'Herramientas', 'Base de datos de Battletech 2.xlsx');
const MAP_PATH   = path.join(ROOT, 'data', 'system_name_mapping.json');
const OUT_SRC    = path.join(ROOT, 'src',    'data');
const OUT_PUBLIC = path.join(ROOT, 'public', 'data');

// ── Helpers ────────────────────────────────────────────────────────────────

/** "LC|Province|District" → "LC"  |  "D(CJF/LC)" → "D(CJF/LC)"  |  "" → "" */
function extractFactionCode(raw: string): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s || s === 'U' || s === 'I' || s === 'A') return s;
  if (s.startsWith('D(')) return s;
  return s.split('|')[0].trim();
}

/** "255,119,0" → "#ff7700" */
function rgbToHex(rgb: string): string {
  const parts = String(rgb).split(',').map(x => parseInt(x.trim(), 10));
  if (parts.length !== 3 || parts.some(isNaN)) return '#666666';
  return '#' + parts.map(p => p.toString(16).padStart(2, '0')).join('');
}

/** Asegura que un valor es número finito o null */
function num(v: unknown): number | null {
  const n = parseFloat(String(v ?? ''));
  return isFinite(n) ? n : null;
}

/** Asegura que un valor es string no vacío o null */
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

/** bool-ish: 1, "1", "TRUE", "SI" → true */
function bool(v: unknown): boolean {
  const s = String(v ?? '').trim().toUpperCase();
  return s === '1' || s === 'TRUE' || s === 'SI' || s === 'YES';
}

/** Convierte fecha Excel (número o string) a string ISO "YYYY-MM-DD" o año "YYYY" */
function fmtDate(v: unknown): string | null {
  if (!v) return null;
  // XLSX puede devolver Date o número de serie
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const n = Number(v);
  if (!isNaN(n) && n > 1000 && n < 100000) {
    // Número de serie Excel: convertir con XLSX
    const d = XLSX.SSF.parse_date_code(n);
    if (d) {
      const mm = String(d.m).padStart(2, '0');
      const dd = String(d.d).padStart(2, '0');
      return `${d.y}-${mm}-${dd}`;
    }
    // Si es un año entre 2000 y 3200, tratar como año
    if (n >= 2000 && n <= 3300) return String(Math.round(n));
  }
  const s = String(v).trim();
  return s || null;
}

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('❌ ASSERT FAILED:', msg); process.exit(1); }
}

// ── 1. Cargar workbooks ────────────────────────────────────────────────────
console.log('📖 Cargando fuentes...');
const sucsWb = XLSX.readFile(SUCS_PATH, { cellDates: true });
const userWb = XLSX.readFile(USER_PATH, { cellDates: true });
const nameMapping: Array<{
  user: string; sucs_id: number; sucs_name: string; type: string;
}> = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));

// ── 2. Parsear SUCS Systems ────────────────────────────────────────────────
// Fila 0 = metadatos, fila 1 = cabeceras, filas 2+ = datos
const sucsRaw: unknown[][] = XLSX.utils.sheet_to_json(sucsWb.Sheets['Systems'], { header: 1, raw: true }) as unknown[][];
const sucsHeaders = sucsRaw[1] as (string | number | null)[];

// Columnas de año: índice ≥ 8 con header numérico o "NNNNx"
const yearCols: Array<{ idx: number; label: string }> = [];
for (let i = 8; i < sucsHeaders.length; i++) {
  const h = sucsHeaders[i];
  if (h === null || h === undefined) continue;
  const s = String(h).trim();
  if (!s) continue;
  const y = parseFloat(s);
  if (!isNaN(y) && y >= 2200 && y <= 3300) {
    yearCols.push({ idx: i, label: s });
  }
}
const yearColumns: string[] = yearCols.map(c => c.label);
console.log(`   SUCS year columns: ${yearColumns.length} (${yearColumns[0]}–${yearColumns[yearColumns.length-1]})`);

// ── 3. Parsear SUCS Factions ───────────────────────────────────────────────
type SucsFaction = { factionID: string; factionName: string; factionColor: string };
const sucsFactions: SucsFaction[] = XLSX.utils.sheet_to_json(sucsWb.Sheets['Factions']);

// ── 4. Parsear SUCS Nebulae ────────────────────────────────────────────────
type SucsNebula = { nebulaID: number; nebulaName: string; x: number; y: number; width: number; height: number };
const sucsNebulae: SucsNebula[] = XLSX.utils.sheet_to_json(sucsWb.Sheets['Nebulae & Cluster Sizes'] ?? sucsWb.Sheets['Nebulae']);

// ── 5. Parsear UserDB ──────────────────────────────────────────────────────
type UserSystem  = Record<string, unknown>;
type UserPlanet  = Record<string, unknown>;
type UserSat     = Record<string, unknown>;
type UserEvent   = Record<string, unknown>;
type UserFaction = Record<string, unknown>;
type UserWar     = Record<string, unknown>;
type UserNews    = Record<string, unknown>;
type UserRat     = Record<string, unknown>;

const userSystems:   UserSystem[]  = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Sistemas']);
const userPlanets:   UserPlanet[]  = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Planetas']);
const userSats:      UserSat[]     = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Satelites']);
const userEvents:    UserEvent[]   = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Eventos']);
const userFactions:  UserFaction[] = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Facciones']);
const userWars:      UserWar[]     = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Guerras']);
const userNews:      UserNews[]    = XLSX.utils.sheet_to_json(userWb.Sheets['BT_Noticias']);
const userRats:      UserRat[]     = XLSX.utils.sheet_to_json(userWb.Sheets['BT_RAT']);

console.log(`   UserDB: ${userSystems.length} sistemas, ${userPlanets.length} planetas, ${userSats.length} satélites`);

// ── 6. Construir índices de nombre ─────────────────────────────────────────
// Mapping: nombre-UserDB → nombre-SUCS
const userToSucs = new Map<string, string>();
for (const m of nameMapping) {
  if (m.sucs_name) userToSucs.set(m.user, m.sucs_name);
}

function canonicalName(userDbName: string): string {
  return userToSucs.get(userDbName) ?? userDbName;
}

// Index UserDB por nombre canónico
interface UserSysData { spectral: string | null; slot: number | null }
const userSysIndex = new Map<string, UserSysData>();
for (const row of userSystems) {
  const id  = str(row['ID']);
  if (!id) continue;
  const canon = canonicalName(id);
  userSysIndex.set(canon, {
    spectral: str(row['ESPECTRAL']),
    slot:     num(row['SLOT_PRIMARIO']),
  });
}

// Index planetas por nombre canónico
const userPlanetIndex = new Map<string, UserPlanet[]>();
for (const row of userPlanets) {
  const sname = str(row['SISTEMA']);
  if (!sname) continue;
  const canon = canonicalName(sname);
  if (!userPlanetIndex.has(canon)) userPlanetIndex.set(canon, []);
  userPlanetIndex.get(canon)!.push(row);
}

// Index satélites por "canonName|planetName|pos"
const userSatIndex = new Map<string, UserSat[]>();
for (const row of userSats) {
  const sname  = str(row['SISTEMA']);
  const pname  = str(row['PLANETA']);
  const ppos   = str(row['POS_PLANETA']);
  if (!sname || !pname) continue;
  const canon = canonicalName(sname);
  const key = `${canon}|${pname}|${ppos ?? ''}`;
  if (!userSatIndex.has(key)) userSatIndex.set(key, []);
  userSatIndex.get(key)!.push(row);
}

// Index eventos por nombre canónico
const userEventIndex = new Map<string, UserEvent[]>();
for (const row of userEvents) {
  const sname = str(row['SISTEMA']);
  if (!sname) continue;
  const canon = canonicalName(sname);
  if (!userEventIndex.has(canon)) userEventIndex.set(canon, []);
  userEventIndex.get(canon)!.push(row);
}

// ── 7. Construir inner-sphere-systems.json ─────────────────────────────────
console.log('\n🔨 Construyendo inner-sphere-systems.json...');

interface SystemRecord {
  id: number;
  name: string;
  altNames: string[];
  x: number;
  y: number;
  sarnaUrl: string | null;
  spectralType: string | null;
  primarySlot: number | null;
  factions: string[];
  provinces: string[];
}

interface NebulaRecord {
  id: number; name: string; x: number; y: number; width: number; height: number;
}

const systems: SystemRecord[] = [];
const noMatch = nameMapping.filter(m => m.type === 'no_match');

// 7a. Sistemas SUCS
for (let r = 2; r < sucsRaw.length; r++) {
  const row = sucsRaw[r] as unknown[];
  if (!row || !row[1]) continue;

  const name = String(row[1]).trim();
  if (!name) continue;

  const xVal = num(row[3]);
  const yVal = num(row[4]);
  if (xVal === null || yVal === null) continue;

  // Nombres alternativos
  const altSet = new Set<string>();
  const altRaw = str(row[2]);
  if (altRaw) {
    for (const a of altRaw.split(',')) {
      const t = a.trim();
      if (t && t !== name) altSet.add(t);
    }
  }
  // Nombres de UserDB que mapean a este sistema SUCS
  for (const [userN, sucsN] of userToSucs) {
    if (sucsN === name && userN !== name) altSet.add(userN);
  }

  // Arrays paralelos de facción/provincia
  const factions: string[] = [];
  const provinces: string[] = [];
  for (const col of yearCols) {
    const raw = str(row[col.idx]) ?? '';
    factions.push(extractFactionCode(raw));
    provinces.push(raw);
  }

  const userData = userSysIndex.get(name);

  systems.push({
    id:          Number(row[0]),
    name,
    altNames:    [...altSet],
    x:           xVal,
    y:           yVal,
    sarnaUrl:    str(row[6]),
    spectralType: userData?.spectral ?? null,
    primarySlot:  userData?.slot ?? null,
    factions,
    provinces,
  });
}

// 7b. 4 sistemas solo-UserDB
for (const m of noMatch) {
  const userData = userSysIndex.get(m.user);
  const userRow = userSystems.find(r => str(r['ID']) === m.user);
  if (!userRow) continue;
  const xVal = num(userRow['X']);
  const yVal = num(userRow['Y']);
  if (xVal === null || yVal === null) continue;

  systems.push({
    id:           90000 + systems.length,
    name:         m.user,
    altNames:     [],
    x:            xVal,
    y:            yVal,
    sarnaUrl:     null,
    spectralType: userData?.spectral ?? null,
    primarySlot:  userData?.slot ?? null,
    factions:     yearColumns.map(() => 'U'),
    provinces:    yearColumns.map(() => ''),
  });
}

// 7c. Nebulae
const nebulae: NebulaRecord[] = (sucsNebulae ?? []).map(n => ({
  id:     Number(n.nebulaID),
  name:   String(n.nebulaName ?? '').trim(),
  x:      Number(n.x ?? 0),
  y:      Number(n.y ?? 0),
  width:  Number(n.width ?? 0),
  height: Number(n.height ?? 0),
}));

// 7d. Facciones (para el mapa — colores)
const factionsMap: Record<string, { name: string; color: string }> = {};
for (const f of sucsFactions) {
  const id = str(f.factionID);
  if (!id) continue;
  factionsMap[id] = {
    name:  str(f.factionName) ?? id,
    color: str(f.factionColor) ?? '#666666',
  };
}
// Añadir/enriquecer con UserDB factions que falten (o que solo estén ahí)
for (const f of userFactions) {
  const id = str(f['CODIGO']);
  if (!id) continue;
  if (!factionsMap[id]) {
    const rgb = str(f['COLOR_RGB']);
    factionsMap[id] = {
      name:  str(f['NOMBRE']) ?? id,
      color: rgb ? rgbToHex(rgb) : '#666666',
    };
  }
}

const innerSphereData = {
  meta: {
    version:     '2.0.0',
    generated:   new Date().toISOString().slice(0, 10),
    sucsVersion: 'official',
    systemCount: systems.length,
    yearColumns,
  },
  availableYears: yearColumns,
  systems,
  nebulae,
  factions: factionsMap,
};

// ── 8. Construir planetary-details.json ────────────────────────────────────
console.log('🔨 Construyendo planetary-details.json...');

interface SatRecord    { name: string; size: string | null; icon: string | null }
interface PlanetRecord {
  name: string; primary: boolean; type: string | null; position: number | null;
  gravity: number | null; atmosphere: string | null; temperature: number | null;
  water: number | null; lifeForm: string | null; pressure: string | null;
  dayLength: number | null; year: number | null; diameter: number | null;
  moons: { small: number; normal: number; large: number; giant: number };
  hasRing: boolean; continents: string | null; description: string | null;
  satellites: SatRecord[];
}
interface EventRecord  {
  planetPosition: number | null; date: string | null;
  faction: string | null; sicsCode: string | null; population: number | null;
}
interface SystemDetail { planets: PlanetRecord[]; events: EventRecord[] }

const planetaryDetailsBySys: Record<string, SystemDetail> = {};
let planetCount = 0, satCount = 0;

for (const [canonName, planets] of userPlanetIndex) {
  const built: PlanetRecord[] = [];

  for (const p of planets) {
    const pname = str(p['NOMBRE']) ?? '?';
    const pos   = num(p['POS']);
    const posStr= pos !== null ? String(pos) : '';

    // Satélites de este planeta
    const satKey  = `${canonName}|${pname}|${posStr}`;
    const satRows = userSatIndex.get(satKey) ?? [];
    const sats: SatRecord[] = satRows.map(s => ({
      name: str(s['SATELITE']) ?? '?',
      size: str(s['TAMAÑO']),
      icon: str(s['ICONO']),
    }));
    satCount += sats.length;

    built.push({
      name:        pname,
      primary:     bool(p['PRIMARIO']),
      type:        str(p['TIPO']),
      position:    pos,
      gravity:     num(p['GRAVEDAD']),
      atmosphere:  str(p['ATMOSFERA']),
      temperature: num(p['TEMP']),
      water:       num(p['AGUA']),
      lifeForm:    str(p['VIDA']),
      pressure:    str(p['PRESION']),
      dayLength:   num(p['DIA_H']),
      year:        num(p['AÑO']),
      diameter:    num(p['DIAMETRO']),
      moons: {
        small:  Math.round(num(p['LUNAS_PEQ']) ?? 0),
        normal: Math.round(num(p['LUNAS_NOM']) ?? 0),
        large:  Math.round(num(p['LUNAS_GRA']) ?? 0),
        giant:  Math.round(num(p['LUNAS_GIG']) ?? 0),
      },
      hasRing:     bool(p['ANILLO']),
      continents:  str(p['CONTINENTES']),
      description: str(p['DESCRIPCION']),
      satellites:  sats,
    });
    planetCount++;
  }

  // Eventos del sistema
  const evtRows = userEventIndex.get(canonName) ?? [];
  const events: EventRecord[] = evtRows.map(e => ({
    planetPosition: num(e['POS']),
    date:           fmtDate(e['FECHA']),
    faction:        str(e['FACCION']),
    sicsCode:       str(e['SOCIO_IND']),
    population:     num(e['POBLACION']),
  }));

  planetaryDetailsBySys[canonName] = { planets: built, events };
}

const planetaryDetails = {
  meta: {
    generated:      new Date().toISOString().slice(0, 10),
    systemCount:    Object.keys(planetaryDetailsBySys).length,
    planetCount,
    satelliteCount: satCount,
  },
  systems: planetaryDetailsBySys,
};

// ── 9. Construir campaign-reference.json ───────────────────────────────────
console.log('🔨 Construyendo campaign-reference.json...');

// Facciones enriquecidas con datos de UserDB
const factionRecords = Object.entries(factionsMap).map(([id, base]) => {
  const uRow = userFactions.find(f => str(f['CODIGO']) === id);
  return {
    id,
    name:      base.name,
    color:     base.color,
    tags:      str(uRow?.['TAGS'])?.split(',').map(t => t.trim()).filter(Boolean) ?? [],
    startYear: num(uRow?.['INICIO']),
    endYear:   num(uRow?.['FIN']),
    successor: str(uRow?.['SUCESOR']),
    capital:   str(uRow?.['CAPITAL']),
    sarnaUrl:  null as string | null,
  };
});

const wars = userWars.map(w => ({
  name:       str(w['NOMBRE']) ?? '',
  startDate:  fmtDate(w['INICIO']) ?? '',
  endDate:    fmtDate(w['FIN']) ?? '',
  factions:   str(w['FACCIONES'])?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
}));

const news = userNews.map(n => ({
  date:        fmtDate(n['FECHA']) ?? '',
  headline:    str(n['TITULAR']) ?? '',
  service:     str(n['SERVICIO']) ?? '',
  location:    str(n['UBICACION']),
  description: str(n['DESCRIPCION']) ?? '',
}));

const rats = userRats.map(r => ({
  source:   str(r['FUENTE']) ?? '',
  year:     num(r['AÑO']) ?? 0,
  name:     str(r['NOMBRE']) ?? '',
  factions: str(r['FACCIONES']) ?? '',
  types:    str(r['TIPOS']) ?? '',
  weight:   str(r['PESO']) ?? '',
  ratings:  str(r['RATINGS']) ?? '',
}));

const campaignReference = {
  meta:      { generated: new Date().toISOString().slice(0, 10) },
  factions:  factionRecords,
  wars,
  news,
  rats,
};

// ── 10. Validaciones ───────────────────────────────────────────────────────
console.log('\n✅ Validando...');
assert(systems.length >= 3170, `Expected 3170+ systems, got ${systems.length}`);
assert(yearColumns.length >= 44, `Expected 44+ year columns, got ${yearColumns.length}`);

const tharkad = systems.find(s => s.name === 'Tharkad')!;
assert(!!tharkad, 'Tharkad not found');
const idx3025 = yearColumns.indexOf('3025');
assert(idx3025 >= 0, '3025 not in yearColumns');
assert(
  tharkad.factions[idx3025] === 'LC',
  `Tharkad@3025 should be LC, got ${tharkad.factions[idx3025]}`
);

const noCoords = systems.filter(s => s.x == null || s.y == null);
assert(noCoords.length === 0, `${noCoords.length} sistemas sin coordenadas`);

const withPlanets = systems.filter(s => (planetaryDetailsBySys[s.name]?.planets.length ?? 0) > 0);
console.log(`   📊 ${withPlanets.length}/${systems.length} sistemas con datos planetarios`);
console.log(`   📊 ${planetCount} planetas, ${satCount} satélites`);
console.log(`   📊 ${wars.length} guerras, ${news.length} noticias, ${rats.length} RATs`);

// ── 11. Escribir ficheros ──────────────────────────────────────────────────
console.log('\n💾 Escribiendo ficheros...');
fs.mkdirSync(OUT_SRC,    { recursive: true });
fs.mkdirSync(OUT_PUBLIC, { recursive: true });

// inner-sphere-systems.json → src/data/ y public/data/
const sysjson = JSON.stringify(innerSphereData);
fs.writeFileSync(path.join(OUT_SRC,    'inner-sphere-systems.json'), sysjson, 'utf-8');
fs.writeFileSync(path.join(OUT_PUBLIC, 'inner-sphere-systems.json'), sysjson, 'utf-8');

// planetary-details.json → src/data/ únicamente (lazy-loaded en runtime)
const pjson = JSON.stringify(planetaryDetails);
fs.writeFileSync(path.join(OUT_SRC, 'planetary-details.json'), pjson, 'utf-8');

// campaign-reference.json → src/data/
const crjson = JSON.stringify(campaignReference);
fs.writeFileSync(path.join(OUT_SRC, 'campaign-reference.json'), crjson, 'utf-8');

// ── 12. Resumen ────────────────────────────────────────────────────────────
console.log('\n📦 Tamaños:');
for (const [label, json] of [
  ['inner-sphere-systems.json', sysjson],
  ['planetary-details.json',   pjson],
  ['campaign-reference.json',  crjson],
] as [string, string][]) {
  const kb = Math.round(Buffer.byteLength(json, 'utf-8') / 1024);
  console.log(`   ${label}: ${kb >= 1024 ? (kb/1024).toFixed(1)+'MB' : kb+'KB'}`);
}

console.log(`\n✅ Done. ${systems.length} sistemas, ${yearColumns.length} eras, ${factionRecords.length} facciones.`);
