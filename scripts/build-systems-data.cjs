/**
 * build-systems-data.cjs
 * Extrae sistemas estelares del "Sarna Unified Cartography Kit (Official).xlsx"
 * y genera src/data/inner-sphere-systems.json
 *
 * Uso: node scripts/build-systems-data.cjs
 *
 * Fuente: Sarna.net Unified Cartography Kit
 *   - 3175 sistemas con coordenadas XY
 *   - Propietario político en ~45 años de snapshot (2271–3152)
 *   - 154 facciones con nombre y color hex
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const SARNA_PATH  = path.join(__dirname, '..', 'Sarna Unified Cartography Kit (Official).xlsx');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'inner-sphere-systems.json');

// ── Leer workbook ───────────────────────────────────────────────────────────
const wb = XLSX.readFile(SARNA_PATH);

// ── Facciones ───────────────────────────────────────────────────────────────
// Fila 0 = headers: factionID, factionName, factionColor, startYear, endYear, ...
const factionsRows = XLSX.utils.sheet_to_json(wb.Sheets['Factions']);

const factions = {};
for (const row of factionsRows) {
  const id = row['factionID'];
  if (!id) continue;
  factions[id] = {
    name:  row['factionName']  ?? id,
    color: row['factionColor'] ?? '#888888',
  };
}

// ── Systems ─────────────────────────────────────────────────────────────────
// Fila 0 = metadatos, fila 1 = headers, filas 2+ = datos
const systemsRaw = XLSX.utils.sheet_to_json(wb.Sheets['Systems'], { header: 1 });
const headers    = systemsRaw[1]; // ['systemID','systemName','alternateName','x','y','size','sarnaSystemLink','distance (LY)', 2271, 2317, ...]

// Identificar columnas de año (índice ≥ 8, header es número o string como '3050a')
const yearCols = []; // { index, year }
for (let i = 8; i < headers.length; i++) {
  const h = headers[i];
  if (h === undefined || h === null) continue;
  const year = parseInt(String(h), 10);
  if (!isNaN(year) && year >= 2200 && year <= 3200) {
    yearCols.push({ index: i, year, label: String(h) });
  }
}

// ── Construir sistemas ──────────────────────────────────────────────────────
const systems = [];

for (let r = 2; r < systemsRaw.length; r++) {
  const row = systemsRaw[r];
  if (!row || !row[1]) continue;

  const name = String(row[1]).trim();
  const x    = parseFloat(row[3]);
  const y    = parseFloat(row[4]);
  if (!name || isNaN(x) || isNaN(y)) continue;

  // Recopilar snapshots: año numérico → código de facción (primero antes de '|')
  // Para años con variantes (3050a, 3050b…) se queda con el PRIMERO no vacío.
  const snapshotMap = new Map(); // year (number) → factionCode (string)

  for (const { index, year } of yearCols) {
    const val = row[index];
    if (val === undefined || val === null || val === '') continue;
    const str = String(val).trim();
    if (!str) continue;
    const code = str.split('|')[0].trim();
    if (!code) continue;
    if (!snapshotMap.has(year)) snapshotMap.set(year, code); // primera variante
  }

  // Ordenar snapshots por año
  const snapshots = [...snapshotMap.entries()].sort((a, b) => a[0] - b[0]);

  // Convertir a eras [{from, to, faction}] fusionando facciones consecutivas iguales
  const eras = [];
  for (let i = 0; i < snapshots.length; i++) {
    const [fromYear, faction] = snapshots[i];
    const nextYear = i < snapshots.length - 1 ? snapshots[i + 1][0] : null;

    if (eras.length > 0 && eras[eras.length - 1].faction === faction) {
      // Extender la era actual hasta el próximo cambio
      eras[eras.length - 1].to = nextYear;
    } else {
      eras.push({ from: fromYear, to: nextYear, faction });
    }
  }

  // Use the SUCS numeric systemID as the unique key.
  // Normalized names are NOT unique (36 pairs of systems share a name).
  const numericId = String(row[0]);

  systems.push({
    id:              numericId,
    name,
    x,
    y,
    rechargeStation: false,
    eras,
  });
}

// ── Verificación rápida ─────────────────────────────────────────────────────
const tharkad = systems.find(s => s.name === 'Tharkad');
if (tharkad) {
  const era3028 = tharkad.eras.find(e => e.from <= 3028 && (e.to === null || e.to > 3028));
  console.log(`   Verificación Tharkad@3028: ${era3028?.faction ?? 'null'} (esperado: LC)`);
}

// ── Output ──────────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

const output = {
  version:     'sarna-cartography-kit-official',
  generated:   new Date().toISOString().slice(0, 10),
  systemCount: systems.length,
  systems,
  factions,
};

const json = JSON.stringify(output);
fs.writeFileSync(OUTPUT_PATH, json, 'utf8');

// También copiar a public/data/ para que Vite lo sirva en runtime
const PUBLIC_PATH = path.join(__dirname, '..', 'public', 'data', 'inner-sphere-systems.json');
fs.mkdirSync(path.dirname(PUBLIC_PATH), { recursive: true });
fs.writeFileSync(PUBLIC_PATH, json, 'utf8');

console.log(`✅ Generado: ${OUTPUT_PATH}`);
console.log(`✅ Copiado:  ${PUBLIC_PATH}`);
console.log(`   Sistemas:  ${systems.length}`);
console.log(`   Facciones: ${Object.keys(factions).length}`);
console.log(`   Tamaño:    ~${Math.round(Buffer.byteLength(json) / 1024)} KB`);
