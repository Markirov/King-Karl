#!/usr/bin/env node
/**
 * Regenera los index.json de mechs y vehículos a partir de los archivos .ssw y .saw
 * Uso: node scripts/rebuild-indexes.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '..', 'public', 'assets');

function extractFromXML(content, tag) {
  const m = content.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
  return m ? m[1].trim() : '';
}

function buildMechIndex() {
  const dir = path.join(PUBLIC, 'mechs');
  if (!fs.existsSync(dir)) { console.log('⚠ No existe public/assets/mechs'); return; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.ssw') || f.endsWith('.mtf'));
  const index = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');

      if (file.endsWith('.ssw')) {
        const nameMatch = content.match(/name="([^"]*)"/);
        const modelMatch = content.match(/model="([^"]*)"/);
        const name = [(nameMatch?.[1] || '').trim(), (modelMatch?.[1] || '').trim()].filter(Boolean).join(' ') || file;
        const bv2 = parseInt(extractFromXML(content, 'battle_value')) || 0;
        const year = parseInt(extractFromXML(content, 'year')) || 0;

        index.push({ name, bv2, file, ...(year ? { year } : {}) });
      } else {
        // .mtf — text format
        const lines = content.split('\n').map(l => l.trim());
        const chassis = (lines.find(l => l.startsWith('chassis:'))?.split(':')[1] || '').trim();
        const model = (lines.find(l => l.startsWith('model:'))?.split(':')[1] || '').trim();
        const name = [chassis, model].filter(Boolean).join(' ') || file;

        index.push({ name, bv2: 0, file });
      }
    } catch (err) {
      console.error(`  ✗ Error en ${file}:`, err.message);
    }
  }

  index.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`✔ Mechs: ${index.length} unidades indexadas`);
}

function buildVehicleIndex() {
  const dir = path.join(PUBLIC, 'vehicles');
  if (!fs.existsSync(dir)) { console.log('⚠ No existe public/assets/vehicles'); return; }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.saw'));
  const index = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const nameMatch = content.match(/name="([^"]*)"/);
      const name = (nameMatch?.[1] || '').trim() || file;
      const bv2 = parseInt(extractFromXML(content, 'battle_value')) || 0;
      const year = parseInt(extractFromXML(content, 'year')) || 0;

      // Motive type
      const motiveMatch = content.match(/<motive[^>]*type="([^"]*)"/);
      const type = (motiveMatch?.[1] || '').trim();

      index.push({
        name, bv2, file,
        ...(type ? { type } : {}),
        ...(year ? { year } : {}),
      });
    } catch (err) {
      console.error(`  ✗ Error en ${file}:`, err.message);
    }
  }

  index.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`✔ Vehículos: ${index.length} unidades indexadas`);
}

console.log('Regenerando índices...\n');
buildMechIndex();
buildVehicleIndex();
console.log('\nHecho.');
