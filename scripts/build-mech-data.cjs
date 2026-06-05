#!/usr/bin/env node
/**
 * build-mech-data.cjs — Index enriquecido SSW/SAW
 *
 * Reemplazo de `rebuild-indexes.cjs` con datos completos para:
 *   - TRO (búsqueda + filtros)
 *   - Compras (precio canon SSW directo del chasis)
 *   - Mantenimiento (tons reales per mech, no 60t medio asumido)
 *   - Combat sim (parser fields disponibles sin volver a abrir fichero)
 *
 * Fuente: public/assets/mechs/*.ssw + *.mtf
 *         public/assets/vehicles/*.saw
 *
 * Output:
 *   public/assets/mechs/index.json     (array enriquecido)
 *   public/assets/vehicles/index.json  (array enriquecido)
 *
 * Schema mech (campos opcionales con `?`):
 *   {
 *     name, model, fullName, file,
 *     tons, weightClass, categoria, isOmni,
 *     techBase, isClan, rulesLevel, era, year, type,
 *     bv2, cost,
 *     motive, numLegs,
 *     engine: { rating, type, techbase },
 *     walkMP, runMP, jumpMP,
 *     structure, armor: { type, total, byLocation },
 *     heatSinks: { count, type, dissipation },
 *     weapons: { name: count, ... },
 *     weaponsTotal, totalHeat, totalDamage,
 *     ammo: [{ name, count }],
 *     source
 *   }
 *
 * Rangos peso canónicos BattleTech (TR3025 onwards):
 *   Light    20-35 t
 *   Medium   40-55 t
 *   Heavy    60-75 t
 *   Assault  80-100 t
 */

const fs   = require('fs');
const path = require('path');

const PUBLIC        = path.resolve(__dirname, '..', 'public', 'assets');
const MECHS_DIR     = path.join(PUBLIC, 'mechs');
const VEHICLES_DIR  = path.join(PUBLIC, 'vehicles');

// ─────────────────────────────────────────────────────────────
//  WEAPON DICTIONARY — copia tal cual del extractor_ssw.py
//  (key normalizada, etiqueta, calor, daño)
// ─────────────────────────────────────────────────────────────
const WEAPONS = [
  // [normKey, displayName, heat, damage]
  ['flamer',              'Flamer',                  3,  2],
  ['machinegun',          'MG',                       0,  2],
  ['smalllaser',          'Small Laser',              1,  3],
  ['mediumlaser',         'Medium Laser',             3,  5],
  ['largelaser',          'Large Laser',              8,  8],
  ['ersmalllaser',        'ER Small Laser',           2,  3],
  ['ermediumlaser',       'ER Medium Laser',          5,  5],
  ['erlargelaser',        'ER Large Laser',          12,  8],
  ['smallpulselaser',     'Small Pulse Laser',        2,  3],
  ['mediumpulselaser',    'Medium Pulse Laser',       4,  6],
  ['largepulselaser',     'Large Pulse Laser',       10,  9],
  ['heavysmalllaser',     'Heavy Small Laser',        3,  6],
  ['heavymediumlaser',    'Heavy Medium Laser',       7, 10],
  ['heavylargelaser',     'Heavy Large Laser',       18, 16],
  ['ppc',                 'PPC',                     10, 10],
  ['erppc',               'ER PPC',                  15, 10],
  ['snubnoseppc',         'Snub-Nose PPC',           10, 10],
  ['heavyppc',            'Heavy PPC',               15, 15],
  ['lrm5',                'LRM 5',                    2,  5],
  ['lrm10',               'LRM 10',                   4, 10],
  ['lrm15',               'LRM 15',                   5, 15],
  ['lrm20',               'LRM 20',                   6, 20],
  ['srm2',                'SRM 2',                    2,  4],
  ['srm4',                'SRM 4',                    3,  8],
  ['srm6',                'SRM 6',                    4, 12],
  ['streaksrm2',          'Streak SRM 2',             2,  4],
  ['streaksrm4',          'Streak SRM 4',             3,  8],
  ['streaksrm6',          'Streak SRM 6',             4, 12],
  ['mrm10',               'MRM 10',                   4, 10],
  ['mrm20',               'MRM 20',                   6, 20],
  ['mrm30',               'MRM 30',                  10, 30],
  ['mrm40',               'MRM 40',                  12, 40],
  ['atm3',                'ATM 3',                    2,  6],
  ['atm6',                'ATM 6',                    4, 12],
  ['atm9',                'ATM 9',                    6, 18],
  ['atm12',               'ATM 12',                   8, 24],
  ['autocannon2',         'AC 2',                     1,  2],
  ['autocannon5',         'AC 5',                     1,  5],
  ['autocannon10',        'AC 10',                    3, 10],
  ['autocannon20',        'AC 20',                    7, 20],
  ['ultraac2',            'Ultra AC 2',               2,  2],
  ['ultraac5',            'Ultra AC 5',               2,  5],
  ['ultraac10',           'Ultra AC 10',              4, 10],
  ['ultraac20',           'Ultra AC 20',              8, 20],
  ['lb2x',                'LB 2-X',                   1,  2],
  ['lb5x',                'LB 5-X',                   1,  5],
  ['lb10x',               'LB 10-X',                  2, 10],
  ['lb20x',               'LB 20-X',                  6, 20],
  ['rotaryac2',           'RAC 2',                    1,  2],
  ['rotaryac5',           'RAC 5',                    1,  5],
  ['heavygaussrifle',     'Heavy Gauss Rifle',        2, 25],
  ['heavygauss',          'Heavy Gauss',              2, 25],
  ['gaussrifle',          'Gauss Rifle',              1, 15],
  ['plasmarifle',         'Plasma Rifle',            10, 10],
  ['plasmacannon',        'Plasma Cannon',            7,  0],
  ['arrowiv',             'Arrow IV',                10, 20],
  ['hatchet',             'Hatchet',                  0, 10],
  ['sword',               'Sword',                    0,  6],
];
// Orden por longitud descendente: greedy match
WEAPONS.sort((a, b) => b[0].length - a[0].length);

// ─────────────────────────────────────────────────────────────
//  HELPERS — peso canónicos + clean
// ─────────────────────────────────────────────────────────────

/** Canon BattleTech weight class lookup. */
function classifyWeight(tons) {
  if (tons <= 35) return 'light';
  if (tons <= 55) return 'medium';
  if (tons <= 75) return 'heavy';
  return 'assault';
}

function categoriaES(tons) {
  if (tons <= 35) return 'Ligero';
  if (tons <= 55) return 'Medio';
  if (tons <= 75) return 'Pesado';
  return 'Asalto';
}

/** Normaliza nombre arma para lookup en dict. */
function normName(s) {
  return s
    .replace(/\(IS\)|\(CL\)|\(R\)/gi, '')      // tech base + rear markers
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function tagText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function tagAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function intOr(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function floatOr(v, def = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

// ─────────────────────────────────────────────────────────────
//  MECH PARSER (SSW)
// ─────────────────────────────────────────────────────────────

function parseMechSSW(xml, file) {
  // header del <mech>
  const mechTag = xml.match(/<mech\b([^>]+)>/i);
  if (!mechTag) return null;
  const attrs = mechTag[1];

  const name = (attrs.match(/\bname="([^"]+)"/i) || [, ''])[1].trim();
  const model = (attrs.match(/\bmodel="([^"]*)"/i) || [, ''])[1].trim();
  let tons = intOr((attrs.match(/\btons="(\d+)"/i) || [])[1], 0);
  if (tons === 0) tons = intOr(tagText(xml, 'tonnage'), 0);

  if (!name || tons === 0) return null;

  const isOmni = /\bomnimech="TRUE"/i.test(attrs);
  const techBase = tagText(xml, 'techbase') || 'Inner Sphere';
  const isClan = /clan/i.test(techBase) || /(CL)/.test(xml.slice(0, 500));

  const motiveRaw = (tagText(xml, 'motive_type') || 'Biped').toLowerCase();
  const isQuad = motiveRaw.includes('quad');
  const motive = isQuad ? 'Quad' : 'Biped';

  const engineRating = intOr(tagAttr(xml, 'engine', 'rating'));
  const engineType = (tagText(xml, 'engine') || '').replace(/<[^>]+>/g, '').trim() || 'Fusion';

  const walkMP = tons > 0 ? Math.floor(engineRating / tons) : 0;
  const runMP = Math.ceil(walkMP * 1.5);

  // Armor
  const armorBlock = (xml.match(/<armor\b[^>]*>([\s\S]*?)<\/armor>/i) || [, ''])[1];
  const armorType = (tagText(armorBlock, 'type') || 'Standard').trim();
  const armorByLoc = {};
  for (const loc of ['hd','ct','ctr','lt','ltr','rt','rtr','la','ra','ll','rl']) {
    const v = intOr((armorBlock.match(new RegExp(`<${loc}>(\\d+)</${loc}>`, 'i')) || [])[1]);
    if (v > 0) armorByLoc[loc] = v;
  }
  const armorTotal = Object.values(armorByLoc).reduce((s, n) => s + n, 0);

  const structure = (xml.match(/<structure\b[^>]*>[\s\S]*?<type>([^<]+)<\/type>/i) || [, 'Standard'])[1].trim();

  const year = intOr(tagText(xml, 'year'));
  const rulesLevel = intOr(tagText(xml, 'rules_level'));
  const era = intOr(tagText(xml, 'era'));
  const mechType = tagText(xml, 'mech_type') || 'BattleMech';

  // Para OmniMechs: extraer un row por loadout
  const baseLoadoutMatch = xml.match(/<baseloadout\b[^>]*>([\s\S]*?)<\/baseloadout>/i);
  const baseLoadoutXml = baseLoadoutMatch ? baseLoadoutMatch[1] : '';
  let loadouts;
  if (isOmni) {
    const loadoutMatches = [...xml.matchAll(/<loadout\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/loadout>/gi)];
    if (loadoutMatches.length > 0) {
      loadouts = loadoutMatches.map(m => ({ variantName: m[1], xml: m[2] }));
    } else {
      loadouts = [{ variantName: '', xml: baseLoadoutXml }];
    }
  } else {
    loadouts = [{ variantName: '', xml }];
  }

  const filas = [];
  for (const lo of loadouts) {
    const fullName = [name, model, lo.variantName].filter(s => s && s.trim()).join(' ').trim();
    const loXml = lo.xml;
    const equipScopeXml = isOmni ? (baseLoadoutXml + loXml) : xml;

    const bv2 = intOr(floatOr(tagText(loXml, 'battle_value') || tagText(xml, 'battle_value')));
    const cost = Math.round(floatOr(tagText(loXml, 'cost') || tagText(xml, 'cost')));

    // Heatsinks
    const hsBlockMatch = equipScopeXml.match(/<heatsinks\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/heatsinks>/i);
    let hsCount = 0;
    let hsType = 'Single';
    if (hsBlockMatch) {
      hsCount = intOr(hsBlockMatch[1]);
      if (/double/i.test(hsBlockMatch[2]) || /double/i.test(hsBlockMatch[0])) hsType = 'Double';
    }
    const dissipation = hsType === 'Double' ? hsCount * 2 : hsCount;

    // Jump jets
    const jumpMatch = equipScopeXml.match(/<jumpjets\b[^>]*number="(\d+)"/i);
    const jumpMP = intOr(jumpMatch ? jumpMatch[1] : 0);

    // Equipment → weapons + ammo
    const equipMatches = [...equipScopeXml.matchAll(/<equipment>([\s\S]*?)<\/equipment>/gi)];
    const weapons = {};
    const ammo = {};
    let totalHeat = 0, totalDamage = 0;

    for (const em of equipMatches) {
      const eqXml = em[1];
      const typeRaw = (tagText(eqXml, 'type') || '').toLowerCase();
      const rawNameMatch = eqXml.match(/<name\b[^>]*>([\s\S]*?)<\/name>/i);
      if (!rawNameMatch) continue;
      const rawName = rawNameMatch[1].trim();

      const isAmmo = typeRaw === 'ammunition' || /^@/.test(rawName) || /\b@\s/.test(rawName);
      if (isAmmo) {
        // Limpia nombre munición
        const ammoName = rawName.replace(/\(IS\)|\(CL\)|@/gi, '').trim();
        ammo[ammoName] = (ammo[ammoName] || 0) + 1;
        continue;
      }

      const norm = normName(rawName);
      let matched = false;
      for (const [key, label, heat, dmg] of WEAPONS) {
        if (norm.includes(key)) {
          weapons[label] = (weapons[label] || 0) + 1;
          totalHeat   += heat;
          totalDamage += dmg;
          matched = true;
          break;
        }
      }
      // si no matchea es equipo no arma (ECM, sensores, etc.) — se descarta del map weapons
    }

    const weaponsTotal = Object.values(weapons).reduce((s, n) => s + n, 0);

    const source = tagText(loXml, 'source') || tagText(baseLoadoutXml, 'source') || '';

    filas.push({
      name: fullName,                 // backward compat: TROPage lee `name`
      chassis: name,
      model,
      fullName,
      file,
      kind: 'mech',
      tons,
      weightClass: classifyWeight(tons),
      categoria: categoriaES(tons),
      isOmni,
      isClan,
      techBase,
      unitType: mechType,
      rulesLevel,
      era,
      year,
      bv2,
      cost,
      motive,
      numLegs: isQuad ? 4 : 2,
      engine: { rating: engineRating, type: engineType },
      walkMP,
      runMP,
      jumpMP,
      structure,
      armor: {
        type: armorType,
        total: armorTotal,
        byLocation: armorByLoc,
      },
      heatSinks: {
        count: hsCount,
        type: hsType,
        dissipation,
      },
      weapons,
      weaponsTotal,
      totalHeat,
      totalDamage,
      ammo: Object.entries(ammo).map(([n, c]) => ({ name: n, count: c })),
      source,
    });
  }

  return filas;
}

// ─────────────────────────────────────────────────────────────
//  MECH PARSER (MTF)
// ─────────────────────────────────────────────────────────────

function parseMechMTF(text, file) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const lookupAfter = (token) => {
    const i = lines.findIndex(l => l.toLowerCase().startsWith(token.toLowerCase()));
    return i >= 0 ? (lines[i].split(':')[1] || '').trim() : '';
  };
  const chassis = lookupAfter('chassis:');
  const model = lookupAfter('model:');
  if (!chassis) return null;

  const tons = intOr(lookupAfter('mass:'));
  if (tons === 0) return null;

  const techBase = lookupAfter('techbase:') || 'Inner Sphere';
  const era = intOr(lookupAfter('era:'));
  const rulesLevel = intOr(lookupAfter('rules level:'));
  const engineLine = lookupAfter('engine:');
  const engineMatch = engineLine.match(/(\d+)/);
  const engineRating = engineMatch ? intOr(engineMatch[1]) : 0;
  const engineType = engineLine.replace(/\d+/g, '').trim() || 'Fusion';

  const walkLine = lookupAfter('walk mp:');
  const walkMP = intOr(walkLine);
  const runMP = Math.ceil(walkMP * 1.5);
  const jumpMP = intOr(lookupAfter('jump mp:'));

  const fullName = [chassis, model].filter(Boolean).join(' ').trim();

  return [{
    name: fullName,                   // backward compat
    chassis,
    model,
    fullName,
    file,
    kind: 'mech',
    tons,
    weightClass: classifyWeight(tons),
    categoria: categoriaES(tons),
    isOmni: false,
    isClan: /clan/i.test(techBase),
    techBase,
    unitType: 'BattleMech',
    rulesLevel,
    era,
    year: 0,
    bv2: 0,   // MTF no embebido — requiere calc
    cost: 0,
    motive: 'Biped',
    numLegs: 2,
    engine: { rating: engineRating, type: engineType },
    walkMP,
    runMP,
    jumpMP,
    structure: 'Standard',
    armor: { type: 'Standard', total: 0, byLocation: {} },
    heatSinks: { count: 0, type: 'Single', dissipation: 0 },
    weapons: {},
    weaponsTotal: 0,
    totalHeat: 0,
    totalDamage: 0,
    ammo: [],
    source: 'MTF',
  }];
}

// ─────────────────────────────────────────────────────────────
//  VEHICLE PARSER (SAW)
// ─────────────────────────────────────────────────────────────

function parseVehicleSAW(xml, file) {
  const cvTag = xml.match(/<combatvehicle\b([^>]+)>/i);
  if (!cvTag) return null;
  const attrs = cvTag[1];

  const name = (attrs.match(/\bname="([^"]+)"/i) || [, ''])[1].trim();
  const model = (attrs.match(/\bmodel="([^"]*)"/i) || [, ''])[1].trim();
  const tons = intOr((attrs.match(/\btons="(\d+)"/i) || [])[1]);
  if (!name || tons === 0) return null;

  const motiveType = (attrs.match(/\bmotive="([^"]+)"/i) || [, ''])[1].trim();
  const isOmni = /\bomni="TRUE"/i.test(attrs);

  const techBase = tagText(xml, 'techbase') || 'Inner Sphere';
  const year = intOr(tagText(xml, 'year'));
  const era = intOr(tagText(xml, 'era'));
  const rulesLevel = intOr(tagText(xml, 'rules_level'));
  const bv2 = intOr(floatOr(tagText(xml, 'battle_value')));
  const cost = Math.round(floatOr(tagText(xml, 'cost')));

  // Motive details
  const motiveDetail = xml.match(/<motive\s+([^>]+)\/?>/i);
  let cruise = 0, turret = 'No Turret';
  if (motiveDetail) {
    cruise = intOr((motiveDetail[1].match(/cruise="(\d+)"/i) || [])[1]);
    turret = (motiveDetail[1].match(/turret="([^"]+)"/i) || [, 'No Turret'])[1];
  }

  const engineRating = intOr(tagAttr(xml, 'engine', 'rating'));
  const engineType = (tagText(xml, 'engine') || '').replace(/<[^>]+>/g, '').trim() || 'Fusion';

  const armorBlockMatch = xml.match(/<armor\b[^>]*>([\s\S]*?)<\/armor>/i);
  const armorBlock = armorBlockMatch ? armorBlockMatch[1] : '';
  const armorType = tagText(armorBlock, 'type') || 'Standard';
  const armorByLoc = {};
  for (const loc of ['front','left','right','rear','primaryturret','secondaryturret','rotor']) {
    const v = intOr((armorBlock.match(new RegExp(`<${loc}>(\\d+)</${loc}>`, 'i')) || [])[1]);
    if (v > 0) armorByLoc[loc] = v;
  }
  const armorTotal = Object.values(armorByLoc).reduce((s, n) => s + n, 0);

  // Heatsinks (vehículos pueden tenerlos si fusion engine)
  const hsBlockMatch = xml.match(/<heatsinks\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/heatsinks>/i);
  let hsCount = 0, hsType = 'Single';
  if (hsBlockMatch) {
    hsCount = intOr(hsBlockMatch[1]);
    if (/double/i.test(hsBlockMatch[0])) hsType = 'Double';
  }

  // Equipment
  const equipMatches = [...xml.matchAll(/<equipment>([\s\S]*?)<\/equipment>/gi)];
  const weapons = {};
  const ammo = {};
  let totalHeat = 0, totalDamage = 0;
  for (const em of equipMatches) {
    const eqXml = em[1];
    const typeRaw = (tagText(eqXml, 'type') || '').toLowerCase();
    const rawNameMatch = eqXml.match(/<name\b[^>]*>([\s\S]*?)<\/name>/i);
    if (!rawNameMatch) continue;
    const rawName = rawNameMatch[1].trim();
    const isAmmo = typeRaw === 'ammunition' || /^@/.test(rawName);
    if (isAmmo) {
      const ammoName = rawName.replace(/\(IS\)|\(CL\)|@/gi, '').trim();
      ammo[ammoName] = (ammo[ammoName] || 0) + 1;
      continue;
    }
    const norm = normName(rawName);
    for (const [key, label, heat, dmg] of WEAPONS) {
      if (norm.includes(key)) {
        weapons[label] = (weapons[label] || 0) + 1;
        totalHeat += heat;
        totalDamage += dmg;
        break;
      }
    }
  }
  const weaponsTotal = Object.values(weapons).reduce((s, n) => s + n, 0);

  const fullName = [name, model].filter(Boolean).join(' ').trim();
  // Vehículos weight class — usa misma escala canónica peso
  const weightClass = classifyWeight(tons);

  return [{
    name: fullName,                   // backward compat (TROPage)
    chassis: name,
    model,
    fullName,
    file,
    kind: 'vehicle',
    type: motiveType,                 // backward compat (TROPage lee `type` como motiveType)
    unitType: 'Combat Vehicle',
    tons,
    weightClass,
    categoria: categoriaES(tons),
    isOmni,
    isClan: /clan/i.test(techBase),
    techBase,
    rulesLevel,
    era,
    year,
    bv2,
    cost,
    motiveType,
    cruise,
    flank: Math.ceil(cruise * 1.5),
    turret,
    engine: { rating: engineRating, type: engineType },
    armor: { type: armorType, total: armorTotal, byLocation: armorByLoc },
    heatSinks: { count: hsCount, type: hsType, dissipation: hsType === 'Double' ? hsCount * 2 : hsCount },
    weapons,
    weaponsTotal,
    totalHeat,
    totalDamage,
    ammo: Object.entries(ammo).map(([n, c]) => ({ name: n, count: c })),
  }];
}

// ─────────────────────────────────────────────────────────────
//  BUILD INDEXES
// ─────────────────────────────────────────────────────────────

function buildIndex(dir, kind) {
  if (!fs.existsSync(dir)) {
    console.log(`⚠ Sin directorio: ${dir}`);
    return;
  }
  const exts = kind === 'mech' ? ['.ssw', '.mtf'] : ['.saw'];
  const files = fs.readdirSync(dir).filter(f => exts.includes(path.extname(f).toLowerCase()));
  console.log(`\n[${kind}] ${files.length} archivos en ${dir}`);

  const entries = [];
  const errors = [];
  let parsed = 0, skipped = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      let rows = null;
      if (kind === 'mech' && file.toLowerCase().endsWith('.ssw'))      rows = parseMechSSW(content, file);
      else if (kind === 'mech' && file.toLowerCase().endsWith('.mtf')) rows = parseMechMTF(content, file);
      else if (kind === 'vehicle')                                      rows = parseVehicleSAW(content, file);

      if (rows && rows.length > 0) {
        entries.push(...rows);
        parsed++;
      } else {
        skipped++;
      }
    } catch (e) {
      errors.push({ file, err: e.message });
    }
    if ((parsed + skipped) % 200 === 0 && (parsed + skipped) > 0) {
      console.log(`  · procesados ${parsed + skipped} / ${files.length}`);
    }
  }

  entries.sort((a, b) => a.fullName.localeCompare(b.fullName));
  // Versión legible (dev/debug)
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(entries, null, 2));
  // Versión minified para web (gzip eficiente)
  fs.writeFileSync(path.join(dir, 'index.min.json'), JSON.stringify(entries));

  const sizeReadable = (fs.statSync(path.join(dir, 'index.json')).size / 1024 / 1024).toFixed(2);
  const sizeMin      = (fs.statSync(path.join(dir, 'index.min.json')).size / 1024 / 1024).toFixed(2);
  console.log(`✔ ${kind}: ${entries.length} entradas (${parsed} OK · ${skipped} skip · ${errors.length} errores) · ${sizeReadable}MB / ${sizeMin}MB min`);
  if (errors.length > 0 && errors.length <= 10) {
    errors.forEach(e => console.warn(`  ✗ ${e.file}: ${e.err}`));
  } else if (errors.length > 0) {
    console.warn(`  ✗ Primeros 10 errores:`);
    errors.slice(0, 10).forEach(e => console.warn(`    ${e.file}: ${e.err}`));
  }
}

console.log('Regenerando índices enriquecidos…');
buildIndex(MECHS_DIR, 'mech');
buildIndex(VEHICLES_DIR, 'vehicle');
console.log('\nHecho.');
