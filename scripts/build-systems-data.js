/**
 * build-systems-data.js
 * Extrae sistemas estelares de "Base de datos de Battletech 2.xlsx"
 * y genera src/data/inner-sphere-systems.json
 *
 * Uso: node scripts/build-systems-data.js
 */

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const EXCEL_PATH  = path.join(__dirname, '..', 'Base de datos de Battletech 2.xlsx');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'inner-sphere-systems.json');

// ── Leer Excel ─────────────────────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_PATH);

function readSheet(name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name]);
}

const rawSistemas  = readSheet('BT_Sistemas');
const rawEventos   = readSheet('BT_Eventos');
const rawFacciones = readSheet('BT_Facciones');

// ── Facciones ───────────────────────────────────────────────────────────────
function rgbToHex(rgb) {
  if (!rgb) return '#888888';
  const [r, g, b] = String(rgb).split(',').map(n => parseInt(n.trim(), 10));
  return '#' + [r, g, b].map(v => (v ?? 0).toString(16).padStart(2, '0')).join('');
}

const factions = {};
for (const f of rawFacciones) {
  if (!f.CODIGO) continue;
  factions[f.CODIGO] = {
    name:    f.NOMBRE  ?? f.CODIGO,
    color:   rgbToHex(f.COLOR_RGB),
    tags:    f.TAGS    ?? '',
    capital: f.CAPITAL ?? null,
  };
}

// ── Agrupar eventos de facción por sistema ──────────────────────────────────
// Solo nos interesan los eventos que tienen FACCION (cambio político)
const eventosPorSistema = {};
for (const ev of rawEventos) {
  const sistema = ev.SISTEMA;
  const faccion = ev.FACCION;
  if (!sistema || faccion == null || faccion === '') continue;

  if (!eventosPorSistema[sistema]) eventosPorSistema[sistema] = [];

  // FECHA viene como "2852-01-01" → extraemos el año
  const year = parseInt(String(ev.FECHA).slice(0, 4), 10);
  if (!isNaN(year)) {
    eventosPorSistema[sistema].push({ year, faction: String(faccion).trim() });
  }
}

// Ordenar eventos por año ascendente
for (const s of Object.keys(eventosPorSistema)) {
  eventosPorSistema[s].sort((a, b) => a.year - b.year);
}

// ── Construir lista de sistemas ─────────────────────────────────────────────
const systems = [];
for (const s of rawSistemas) {
  const id   = s.ID;
  const x    = parseFloat(s.X);
  const y    = parseFloat(s.Y);
  if (!id || isNaN(x) || isNaN(y)) continue;

  // Normalizar ID para uso como clave: "A Place" → "a-place"
  const normalId = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const events = eventosPorSistema[id] ?? [];

  // Convertir eventos a eras: [{from, to, faction}]
  // to = año del siguiente evento (o null si es el último)
  const eras = events.map((ev, i) => ({
    from:    ev.year,
    to:      events[i + 1]?.year ?? null,
    faction: ev.faction,
  }));

  systems.push({
    id:              normalId,
    name:            id,
    x,
    y,
    spectral:        s.ESPECTRAL ?? null,
    rechargeStation: false,    // sin datos → false por defecto
    eras,
  });
}

// ── Output ──────────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

const output = {
  version:   'battletech-excel-v2',
  generated: new Date().toISOString().slice(0, 10),
  systemCount: systems.length,
  systems,
  factions,
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf8');

const sizeKB = Math.round(fs.statFileSync?.(OUTPUT_PATH)?.size / 1024) ||
               Math.round(Buffer.byteLength(JSON.stringify(output)) / 1024);

console.log(`✅ Generado: ${OUTPUT_PATH}`);
console.log(`   Sistemas: ${systems.length}`);
console.log(`   Facciones: ${Object.keys(factions).length}`);
console.log(`   Sistemas con eventos de facción: ${Object.keys(eventosPorSistema).length}`);
console.log(`   Tamaño estimado: ~${Math.round(Buffer.byteLength(JSON.stringify(output)) / 1024)} KB`);
