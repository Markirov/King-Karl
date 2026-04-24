// bump-version.cjs
// Incrementa el tercer dígito (patch) de src/version.ts y escribe la nueva versión en stdout.
// El bat captura esa salida con:  for /f "delims=" %%v in ('node bump-version.cjs') do set NEW_VERSION=%%v
//
// Formato esperado dentro de src/version.ts:
//   export const VERSION = '2.1.5';
//
// El resto del archivo se respeta (display, comentarios, etc).

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join('src', 'version.ts');

if (!fs.existsSync(VERSION_FILE)) {
  console.error(`[bump-version] No existe ${VERSION_FILE}`);
  console.error('Crea el archivo con este contenido y vuelve a intentarlo:');
  console.error('');
  console.error("  export const VERSION = '2.1.0';");
  console.error("  export const VERSION_DISPLAY = `Ver. ${VERSION}`;");
  process.exit(1);
}

const original = fs.readFileSync(VERSION_FILE, 'utf8');

// Busca: VERSION = 'x.y.z'  (acepta ' o ")
const regex = /VERSION\s*=\s*['"](\d+)\.(\d+)\.(\d+)['"]/;
const match = original.match(regex);

if (!match) {
  console.error(`[bump-version] No se encontro el patron VERSION = 'x.y.z' en ${VERSION_FILE}`);
  process.exit(1);
}

const major = match[1];
const minor = match[2];
const patch = parseInt(match[3], 10) + 1;
const newVersion = `${major}.${minor}.${patch}`;

const updated = original.replace(regex, `VERSION = '${newVersion}'`);
fs.writeFileSync(VERSION_FILE, updated, 'utf8');

// SOLO la versión nueva a stdout — el bat la captura
process.stdout.write(newVersion);
