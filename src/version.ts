// Fuente de verdad para la version del proyecto Warthogs Fleet / King Karl.
//
// - El tercer digito (patch) lo incrementa automaticamente deploy.bat
//   vía bump-version.cjs cada vez que lanzas un deploy.
// - Los dos primeros (major.minor) los cambias tu a mano cuando toque.
// - VERSION_DISPLAY es lo que importas en PortadaPage.tsx y Sidebar.tsx.
//
// Importante: no cambies el formato de la linea `export const VERSION = 'x.y.z';`
// porque el script lo detecta con regex.

export const VERSION = '2.1.2';
export const VERSION_DISPLAY = `Ver. ${VERSION}`;
