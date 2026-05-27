#!/usr/bin/env node
/**
 * Importa .ssw / .saw desde carpeta fuente (recursivo) a public/assets/.
 *
 * Uso:
 *   node scripts/import-units.cjs                       — both, source default
 *   node scripts/import-units.cjs ssw                   — solo .ssw, source default
 *   node scripts/import-units.cjs saw                   — solo .saw, source default
 *   node scripts/import-units.cjs both                  — both, source default
 *   node scripts/import-units.cjs both "C:\path\src"    — both, source custom
 *   node scripts/import-units.cjs ssw  "..." --overwrite — sobreescribe duplicados
 *
 * Default source: E:\Drive\CBT\SSW_0.7.4\SSW-Master
 * Skip duplicados: si el archivo ya existe en destino (mismo nombre), NO copia.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SOURCE = 'E:\\Drive\\CBT\\SSW_0.7.4\\SSW-Master';
const PUBLIC_MECHS    = path.resolve(__dirname, '..', 'public', 'assets', 'mechs');
const PUBLIC_VEHICLES = path.resolve(__dirname, '..', 'public', 'assets', 'vehicles');

// ── Parse args ───────────────────────────────────────────
const args = process.argv.slice(2);
const overwrite = args.includes('--overwrite');
const positional = args.filter(a => !a.startsWith('--'));
const mode   = (positional[0] || 'both').toLowerCase();
const source = positional[1] || DEFAULT_SOURCE;

if (!['ssw', 'saw', 'both'].includes(mode)) {
  console.error(`[ERROR] Modo inválido: "${mode}". Usa: ssw | saw | both`);
  process.exit(1);
}

if (!fs.existsSync(source)) {
  console.error(`[ERROR] Carpeta fuente no existe: ${source}`);
  process.exit(1);
}

// Asegura destinos
for (const dir of [PUBLIC_MECHS, PUBLIC_VEHICLES]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Cache nombres existentes (para skip rápido) ──────────
const existingMechs    = new Set(fs.readdirSync(PUBLIC_MECHS));
const existingVehicles = new Set(fs.readdirSync(PUBLIC_VEHICLES));

// ── Walk recursivo ───────────────────────────────────────
const stats = { ssw: { found: 0, copied: 0, skipped: 0, errors: 0 },
                saw: { found: 0, copied: 0, skipped: 0, errors: 0 } };

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.warn(`[WARN] No se puede leer ${dir}: ${e.message}`);
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
      continue;
    }
    if (!ent.isFile()) continue;

    const lower = ent.name.toLowerCase();
    const isSsw = lower.endsWith('.ssw');
    const isSaw = lower.endsWith('.saw');
    if (!isSsw && !isSaw) continue;
    if (mode === 'ssw' && !isSsw) continue;
    if (mode === 'saw' && !isSaw) continue;

    const type = isSsw ? 'ssw' : 'saw';
    stats[type].found++;

    const destDir = isSsw ? PUBLIC_MECHS : PUBLIC_VEHICLES;
    const existing = isSsw ? existingMechs : existingVehicles;
    const destPath = path.join(destDir, ent.name);

    if (existing.has(ent.name) && !overwrite) {
      stats[type].skipped++;
      continue;
    }

    try {
      fs.copyFileSync(full, destPath);
      stats[type].copied++;
      existing.add(ent.name);
    } catch (e) {
      stats[type].errors++;
      console.warn(`[WARN] Fallo copiando ${ent.name}: ${e.message}`);
    }
  }
}

// ── Run ──────────────────────────────────────────────────
console.log('============================================');
console.log(' Importar Units desde carpeta');
console.log('============================================');
console.log(`Fuente:   ${source}`);
console.log(`Modo:     ${mode}`);
console.log(`Overwrite: ${overwrite ? 'SÍ' : 'NO (skip duplicados)'}`);
console.log('');

const startTime = Date.now();
walk(source);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('');
console.log('--- RESUMEN ---');
if (mode === 'ssw' || mode === 'both') {
  console.log(`SSW: ${stats.ssw.found} encontrados, ${stats.ssw.copied} copiados, ${stats.ssw.skipped} duplicados, ${stats.ssw.errors} errores`);
}
if (mode === 'saw' || mode === 'both') {
  console.log(`SAW: ${stats.saw.found} encontrados, ${stats.saw.copied} copiados, ${stats.saw.skipped} duplicados, ${stats.saw.errors} errores`);
}
console.log(`Tiempo: ${elapsed}s`);
console.log('');

if (stats.ssw.copied > 0 || stats.saw.copied > 0) {
  console.log('💡 Ejecuta `node scripts/rebuild-indexes.cjs` para regenerar índices.');
}

process.exit(0);
